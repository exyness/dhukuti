"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ChevronDown, Loader2, LockKeyhole, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AppPageHeader, AppShell, Panel, TokenScopeNotice } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreateCircleModal,
  type CreateCircleReview,
  type CreateStatus,
  type IndexStatus,
} from "@/components/circles/CreateCircleModal";
import { cn } from "@/lib/cn";
import { DHUKUTI_PROGRAM, explorerTransactionUrl } from "@/lib/constants";
import { queryKeys } from "@/lib/data/queries";
import type { CircleDetail, CircleSummary } from "@/lib/data/types";
import {
  buildCreateCircleInstruction,
  CIRCLE_ACCOUNT_SPACE,
  collateralBpsFromAmounts,
  generateCircleId,
  INSURANCE_POOL_ACCOUNT_SPACE,
  lamportsToSol,
  MAX_CIRCLE_NAME_BYTES,
  type PayoutCurveValue,
  payoutCurveLabel,
  solToLamports,
} from "@/lib/program";
import { decodeProgramError } from "@/lib/use-program-transaction";
import { OPEN_WALLET_EVENT } from "@/lib/wallet";

const INSURANCE_FEE_BPS = 50;
const RESERVE_RATIO_BPS = 1000;
const SECURITY_BOND_RATIO_BPS = 5000;
const BPS_DENOMINATOR = BigInt(10_000);
const ZERO_BIGINT = BigInt(0);

export default function NewCirclePage() {
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction } = useWallet();
  const queryClient = useQueryClient();
  const [circleName, setCircleName] = useState("Community Circle");
  const [cycleDays, setCycleDays] = useState("30");
  const [contribution, setContribution] = useState("5.00");
  const [maxMembers, setMaxMembers] = useState("12");
  const [payoutCurve, setPayoutCurve] = useState<PayoutCurveValue>("fixed");
  const [minReputation, setMinReputation] = useState("450");
  const [status, setStatus] = useState<CreateStatus>("idle");
  const [indexStatus, setIndexStatus] = useState<IndexStatus>("idle");
  const [indexError, setIndexError] = useState("");
  const [review, setReview] = useState<CreateCircleReview | null>(null);
  const [error, setError] = useState("");

  const contributionLamports = useMemo(() => safeSolToLamports(contribution), [contribution]);
  const securityBondLamports = contributionLamports
    ? (contributionLamports * BigInt(SECURITY_BOND_RATIO_BPS)) / BPS_DENOMINATOR
    : ZERO_BIGINT;
  const projectedPotLamports = contributionLamports
    ? contributionLamports * BigInt(Number.parseInt(maxMembers, 10) || 0)
    : ZERO_BIGINT;
  const cycleLabel = cycleDays === "7" ? "Weekly" : cycleDays === "90" ? "Quarterly" : "Monthly";
  const lengthLabel =
    cycleDays === "7"
      ? `${maxMembers} Weeks`
      : cycleDays === "90"
        ? `${maxMembers} Quarters`
        : `${maxMembers} Months`;
  const isWorking = status === "simulating" || status === "signing" || status === "confirming";
  const previewRows = buildPreviewRows(Number.parseInt(cycleDays, 10), projectedPotLamports);

  function resetReview() {
    setReview(null);
    setError("");
    setIndexStatus("idle");
    setIndexError("");
    if (status !== "idle") {
      setStatus("idle");
    }
  }

  async function handleReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!publicKey || !connected) {
      setError("Connect a devnet wallet before reviewing this circle creation.");
      window.dispatchEvent(new Event(OPEN_WALLET_EVENT));
      return;
    }

    setStatus("simulating");
    setError("");
    setIndexStatus("idle");
    setIndexError("");
    setReview(null);

    try {
      const params = getCreateParams(publicKey, generateCircleId());
      const nextReview = await simulateCreateCircle(params);
      setReview(nextReview);
      setStatus("ready");
    } catch (nextError) {
      setStatus("idle");
      setError(normalizeCreateError(nextError));
    }
  }

  async function handleSignCreateCircle() {
    if (!publicKey || !connected || !review) {
      setError("Connect the wallet used for the review before creating this circle.");
      return;
    }

    if (review.creator !== publicKey.toBase58()) {
      setStatus("idle");
      setReview(null);
      setError("Your connected wallet changed. Review the circle again before signing.");
      return;
    }

    setStatus("signing");
    setError("");

    try {
      if (Date.now() - review.reviewedAt > 45_000) {
        setStatus("idle");
        setReview(null);
        setError("This review expired. Review the circle again before signing.");
        return;
      }

      const params = getCreateParams(publicKey, review.circleId);
      const { instruction } = buildCreateCircleInstruction(params);
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: review.blockhash,
        lastValidBlockHeight: review.lastValidBlockHeight,
      }).add(instruction);

      // Keep this adapter call synchronous with the click. Some wallet extensions will not
      // open their signing window after an awaited RPC or module-loading step.
      const signature = await sendTransaction(transaction, connection, {
        maxRetries: 3,
        preflightCommitment: "confirmed",
      });

      setStatus("confirming");

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash: review.blockhash,
          lastValidBlockHeight: review.lastValidBlockHeight,
        },
        "confirmed",
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      const confirmedReview = { ...review, confirmationSignature: signature };
      setReview(confirmedReview);
      setStatus("confirmed");
      seedConfirmedCircle(confirmedReview);
      void syncConfirmedCircle(confirmedReview);
    } catch (nextError) {
      setStatus("ready");
      setError(normalizeCreateError(nextError));
    }
  }

  function seedConfirmedCircle(confirmedReview: CreateCircleReview) {
    const circle = toOptimisticCircleSummary(confirmedReview, publicKey?.toBase58() ?? "");
    const detail = toOptimisticCircleDetail(circle);

    queryClient.setQueryData<CircleSummary[]>(queryKeys.circles, (currentCircles = []) => {
      const existingIndex = currentCircles.findIndex((item) => item.address === circle.address);
      if (existingIndex >= 0) {
        return currentCircles.map((item, index) => (index === existingIndex ? circle : item));
      }

      return [circle, ...currentCircles];
    });
    queryClient.setQueryData<CircleDetail>(queryKeys.circle(circle.address), detail);
  }

  async function syncConfirmedCircle(confirmedReview: CreateCircleReview) {
    if (!confirmedReview.confirmationSignature) return;

    setIndexStatus("syncing");
    setIndexError("");

    try {
      const response = await fetch("/api/indexer/signature", {
        body: JSON.stringify({
          signature: confirmedReview.confirmationSignature,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Indexer sync failed.");
      }

      const result = (await response.json().catch(() => null)) as { eventCount?: number } | null;
      if (!result?.eventCount) {
        throw new Error("The indexer did not find a Dhukuti event for this signature.");
      }

      setIndexStatus("synced");
      await queryClient.invalidateQueries({ queryKey: queryKeys.circles });
      await queryClient.invalidateQueries({ queryKey: queryKeys.activity(publicKey?.toBase58()) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(publicKey?.toBase58()) });
    } catch (syncError) {
      setIndexStatus("failed");
      setIndexError(normalizeCreateError(syncError));
    }
  }

  function getCreateParams(creator: typeof publicKey, circleId: bigint) {
    if (!creator) {
      throw new Error("Connect a wallet before creating a circle.");
    }

    const contributionLamportsValue = solToLamports(contribution);
    const normalizedName = circleName.trim();
    const securityBondLamportsValue =
      (contributionLamportsValue * BigInt(SECURITY_BOND_RATIO_BPS)) / BPS_DENOMINATOR;
    const memberCap = Number.parseInt(maxMembers, 10);
    const minRep = BigInt(Number.parseInt(minReputation, 10));
    const cycleDurationSeconds = BigInt(Number.parseInt(cycleDays, 10) * 24 * 60 * 60);

    if (!normalizedName || utf8ByteLength(normalizedName) > MAX_CIRCLE_NAME_BYTES) {
      throw new Error("Circle name must be 1-64 UTF-8 bytes.");
    }

    if (!Number.isInteger(memberCap) || memberCap < 2 || memberCap > 64) {
      throw new Error("Max participants must be between 2 and 64.");
    }

    if (contributionLamportsValue <= ZERO_BIGINT) {
      throw new Error("Contribution amount must be greater than zero.");
    }

    if (minRep < ZERO_BIGINT) {
      throw new Error("Minimum reputation cannot be negative.");
    }

    const collateralBps = collateralBpsFromAmounts(
      securityBondLamportsValue,
      contributionLamportsValue,
    );

    if (collateralBps < 500) {
      throw new Error("Security bond must be at least 5% of the contribution.");
    }

    return {
      circleId,
      collateralBps,
      contributionLamports: contributionLamportsValue,
      creator,
      cycleDurationSeconds,
      insuranceFeeBps: INSURANCE_FEE_BPS,
      maxMembers: memberCap,
      minReputation: minRep,
      name: normalizedName,
      payoutCurve,
      reserveRatioBps: RESERVE_RATIO_BPS,
    };
  }

  async function simulateCreateCircle(params: ReturnType<typeof getCreateParams>) {
    const { instruction, pdas } = buildCreateCircleInstruction(params);
    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const { Transaction } = await import("@solana/web3.js");
    const transaction = new Transaction({
      feePayer: params.creator,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }).add(instruction);

    const existingCircle = await connection.getAccountInfo(pdas.circle, "confirmed");
    if (existingCircle) {
      throw new Error("This circle ID is already in use. Review again to choose a new one.");
    }

    const [circleRent, insuranceRent, vaultRent, feeEstimate, simulation] = await Promise.all([
      connection.getMinimumBalanceForRentExemption(CIRCLE_ACCOUNT_SPACE, "confirmed"),
      connection.getMinimumBalanceForRentExemption(INSURANCE_POOL_ACCOUNT_SPACE, "confirmed"),
      connection.getMinimumBalanceForRentExemption(0, "confirmed"),
      connection.getFeeForMessage(transaction.compileMessage(), "confirmed"),
      connection.simulateTransaction(transaction),
    ]);

    if (simulation.value.err) {
      throw new Error(
        `Transaction check failed: ${JSON.stringify(simulation.value.err)}${formatLogs(simulation.value.logs)}`,
      );
    }

    return {
      circleId: params.circleId,
      blockhash: latestBlockhash.blockhash,
      circlePda: pdas.circle.toBase58(),
      collateralBps: params.collateralBps,
      contributionLamports: params.contributionLamports,
      creator: params.creator.toBase58(),
      cycleDurationSeconds: params.cycleDurationSeconds,
      estimatedFeeLamports: feeEstimate.value ?? 0,
      estimatedRentLamports: circleRent + insuranceRent + vaultRent,
      insurancePoolPda: pdas.insurancePool.toBase58(),
      maxMembers: params.maxMembers,
      minReputation: params.minReputation,
      name: params.name,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      payoutCurve: params.payoutCurve,
      reserveRatioBps: params.reserveRatioBps,
      reviewedAt: Date.now(),
      simulationUnits: simulation.value.unitsConsumed ?? undefined,
      vaultPda: pdas.vault.toBase58(),
    };
  }

  return (
    <AppShell title="Create Circle" contentClassName="!max-w-none px-6 py-10 md:px-12">
      <AppPageHeader
        eyebrow="Circle Builder"
        title="Configure a savings circle."
        copy="Set the economic rules, admission gate, and payout model before publishing. These terms become fixed after the first member joins."
      />

      <div className="grid min-w-0 items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,24rem)]">
        <form className="min-w-0 space-y-[1.125rem]" aria-busy={isWorking} onSubmit={handleReview}>
          <Panel className="p-6">
            <fieldset className="m-0 min-w-0">
              <legend className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                01. Circle Terms
              </legend>
              <p className="mt-1 mb-[1.375rem] max-w-2xl text-sm leading-6 text-muted">
                Define the core parameters members will review before they join.
              </p>
              <div className="grid gap-[1.125rem] md:grid-cols-2">
                <Field label="Circle name" htmlFor="circle-name">
                  <input
                    id="circle-name"
                    name="circle-name"
                    type="text"
                    autoComplete="off"
                    maxLength={MAX_CIRCLE_NAME_BYTES}
                    value={circleName}
                    className="input-control"
                    onChange={(event) => {
                      setCircleName(event.target.value);
                      resetReview();
                    }}
                  />
                </Field>
                <Field label="Cycle duration" htmlFor="cycle-duration">
                  <SelectShell>
                    <select
                      id="cycle-duration"
                      name="cycle-duration"
                      className="input-control appearance-none pr-10 font-mono text-[0.84rem]"
                      value={cycleDays}
                      onChange={(event) => {
                        setCycleDays(event.target.value);
                        resetReview();
                      }}
                    >
                      <option value="7">Weekly - 7 days</option>
                      <option value="30">Monthly - 30 days</option>
                      <option value="90">Quarterly - 90 days</option>
                    </select>
                  </SelectShell>
                </Field>
                <Field label="Contribution amount" htmlFor="contribution">
                  <AmountInput
                    id="contribution"
                    name="contribution"
                    value={contribution}
                    onChange={(value) => {
                      setContribution(value);
                      resetReview();
                    }}
                  />
                </Field>
                <Field label="Max participants" htmlFor="member-cap">
                  <input
                    id="member-cap"
                    name="member-cap"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={maxMembers}
                    className="input-control"
                    onChange={(event) => {
                      setMaxMembers(event.target.value);
                      resetReview();
                    }}
                  />
                </Field>
              </div>
            </fieldset>
          </Panel>

          <Panel className="p-6">
            <fieldset className="m-0 min-w-0">
              <legend className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                02. Payout Strategy
              </legend>
              <p className="mt-1 mb-[1.375rem] max-w-2xl text-sm leading-6 text-muted">
                Choose how each cycle&apos;s recipient is selected.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <StrategyCard
                  checked={payoutCurve === "fixed"}
                  description="Recipient order is locked before the circle opens."
                  kicker="Fixed Order"
                  label="Sequential"
                  name="strategy"
                  value="fixed"
                  onChange={(value) => {
                    setPayoutCurve(value);
                    resetReview();
                  }}
                />
                <StrategyCard
                  checked={payoutCurve === "auction"}
                  description="Members bid a yield discount to receive early."
                  kicker="Bidding"
                  label="Dutch Auction"
                  name="strategy"
                  value="auction"
                  onChange={(value) => {
                    setPayoutCurve(value);
                    resetReview();
                  }}
                />
              </div>
            </fieldset>
          </Panel>

          <Panel className="p-6">
            <fieldset className="m-0 min-w-0">
              <legend className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                03. Admission Rules
              </legend>
              <p className="mt-1 mb-[1.375rem] max-w-2xl text-sm leading-6 text-muted">
                Keep the circle open enough to fill, but gated enough to feel trustworthy.
              </p>
              <div className="grid gap-[1.125rem] md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-muted">
                    Minimum reputation
                  </span>
                  <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-3.5">
                    <input
                      className="h-1.5 w-full cursor-pointer accent-[var(--accent)]"
                      type="range"
                      name="reputation"
                      min="0"
                      max="1000"
                      value={minReputation}
                      aria-label="Minimum reputation"
                      onChange={(event) => {
                        setMinReputation(event.target.value);
                        resetReview();
                      }}
                    />
                    <span className="flex min-h-11 items-center justify-center rounded-md border border-border bg-white/[0.035] font-mono tabular-nums text-[0.84rem] text-foreground">
                      {minReputation}
                    </span>
                  </div>
                  <p className="m-0 text-[0.76rem] leading-5 text-muted">
                    Recommended for public circles with 10 or more participants.
                  </p>
                </div>

                <Field
                  hint="Held in escrow until the circle completes."
                  label="Security bond"
                  htmlFor="security-bond"
                >
                  <AmountInput
                    id="security-bond"
                    name="security-bond"
                    value={lamportsToSol(securityBondLamports)}
                    readOnly
                  />
                </Field>
              </div>
            </fieldset>
          </Panel>

          {error ? (
            <Panel className="border-accent/25 bg-accent/8 p-5">
              <div className="mb-2 flex items-center gap-2 text-accent">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em]">
                  Create circle error
                </span>
              </div>
              <p className="text-sm leading-6 text-muted">{error}</p>
            </Panel>
          ) : null}

          {!review ? (
            <div className="flex flex-wrap justify-end gap-3 pt-1">
              <Button type="submit" variant="primary" disabled={isWorking}>
                {status === "simulating" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                Review circle creation
              </Button>
            </div>
          ) : null}
        </form>

        <CreateCircleModal
          error={error}
          indexError={indexError}
          indexStatus={indexStatus}
          review={review}
          status={status}
          onClose={resetReview}
          onCreateAnother={() => {
            setCircleName("Community Circle");
            setCycleDays("30");
            setContribution("5.00");
            setMaxMembers("12");
            setPayoutCurve("fixed");
            setMinReputation("450");
            resetReview();
          }}
          onRetryIndex={() => review && void syncConfirmedCircle(review)}
          onSign={handleSignCreateCircle}
        />

        <aside className="min-w-0 space-y-6">
          <Panel className="p-6">
            <div className="mb-7 flex items-center justify-between">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Live Preview
              </span>
              <Badge tone="accent">Draft Terms</Badge>
            </div>
            <span className="block font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">
              Projected pot value
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <strong className="font-mono tabular-nums text-[2.45rem] font-semibold tracking-tight">
                {lamportsToSol(projectedPotLamports)}
              </strong>
              <span className="font-mono tabular-nums text-sm text-muted">SOL</span>
            </div>
            <p className="mt-1 mb-7 text-[0.78rem] leading-5 text-muted">
              Based on {contribution || "0"} SOL across {maxMembers || "0"} committed member slots.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <PreviewStat label="Cycle" value={cycleLabel} />
              <PreviewStat label="Length" value={lengthLabel} />
              <PreviewStat label="Model" value={payoutCurveLabel(payoutCurve)} />
              <PreviewStat label="Gate" value={`${minReputation || "0"} Rep`} />
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Projected payout schedule
              </div>
              {previewRows.map((row) => (
                <PreviewRow key={row.label} label={row.label} value={row.value} />
              ))}
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Fee breakdown
              </div>
              <PreviewRow
                label="Insurance fee"
                value={`${lamportsToSol((projectedPotLamports * BigInt(INSURANCE_FEE_BPS)) / BPS_DENOMINATOR)} SOL`}
              />
              <PreviewRow label="Reserve ratio" value={`${RESERVE_RATIO_BPS / 100}%`} />
              <PreviewRow
                label="Security bond"
                value={`${lamportsToSol(securityBondLamports)} SOL`}
              />
            </div>
          </Panel>

          <TokenScopeNotice />

          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                How it works
              </span>
            </div>
            <ul className="space-y-3 text-sm leading-6 text-muted">
              <li>
                <strong className="font-medium text-foreground">Create a circle</strong> sets up the
                shared balance and protection reserve.
              </li>
              <li>
                <strong className="font-medium text-foreground">Join</strong> locks collateral and
                reserves a payout position.
              </li>
              <li>
                <strong className="font-medium text-foreground">Start</strong> opens the first
                contribution round when the host is ready.
              </li>
            </ul>
          </Panel>

          <Panel className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-warning" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-warning">
                Devnet preview
              </span>
            </div>
            <p className="text-sm leading-6 text-muted">
              This version runs on {DHUKUTI_PROGRAM.cluster}. You can review the creation before
              your wallet asks you to sign.
            </p>
          </Panel>
        </aside>
      </div>
    </AppShell>
  );
}

function Field({
  children,
  htmlFor,
  hint,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  hint?: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-muted"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="m-0 text-[0.76rem] leading-5 text-muted">{hint}</p> : null}
    </div>
  );
}

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
    </div>
  );
}

function AmountInput({
  id,
  name,
  onChange,
  readOnly,
  value,
}: {
  id: string;
  name: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  value: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        value={value}
        autoComplete="off"
        readOnly={readOnly}
        className={cn(
          "input-control pr-14 font-mono tabular-nums text-[0.84rem]",
          readOnly && "text-muted",
        )}
        onChange={(event) => onChange?.(event.target.value)}
      />
      <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-mono text-[0.68rem] text-muted">
        SOL
      </span>
    </div>
  );
}

function StrategyCard({
  checked,
  description,
  kicker,
  label,
  name,
  onChange,
  value,
}: {
  checked?: boolean;
  description: string;
  kicker: string;
  label: string;
  name: string;
  onChange: (value: PayoutCurveValue) => void;
  value: PayoutCurveValue;
}) {
  return (
    <label className="group relative flex min-h-[8.5rem] cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-white/[0.024] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.035] has-checked:border-accent/35 has-checked:bg-accent/8 focus-within:ring-2 focus-within:ring-ring">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        className="peer absolute inset-0 cursor-pointer opacity-0"
        onChange={() => onChange(value)}
      />
      <span className="mb-2.5 block font-mono text-[0.58rem] uppercase tracking-[0.12em] text-accent">
        {kicker}
      </span>
      <span className="mb-1.5 block text-[0.92rem] font-medium text-foreground">{label}</span>
      <span className="text-[0.76rem] leading-5 text-muted">{description}</span>
    </label>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-white/[0.025] p-3">
      <span className="block font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="mt-1 block font-mono tabular-nums text-[0.75rem] text-foreground">
        {value}
      </span>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span className="min-w-0 font-mono text-[0.64rem] text-muted">{label}</span>
      <strong className="shrink-0 text-right font-mono tabular-nums text-[0.72rem] font-medium text-foreground">
        {value}
      </strong>
    </div>
  );
}

function safeSolToLamports(value: string) {
  try {
    return solToLamports(value);
  } catch {
    return ZERO_BIGINT;
  }
}

function normalizeCreateError(error: unknown) {
  return decodeProgramError(error).message;
}

function formatLogs(logs: string[] | null | undefined) {
  if (!logs?.length) return "";
  return `\n${logs.slice(-6).join("\n")}`;
}

function toOptimisticCircleSummary(review: CreateCircleReview, creator: string): CircleSummary {
  const contribution = `${lamportsToSol(review.contributionLamports)} SOL`;
  const pot = `${lamportsToSol(review.contributionLamports * BigInt(review.maxMembers))} SOL`;
  const collateralLamports =
    (review.contributionLamports * BigInt(review.collateralBps)) / BPS_DENOMINATOR;

  return {
    address: review.circlePda,
    circleId: review.circleId.toString(),
    collateral: `${lamportsToSol(collateralLamports)} SOL`,
    collateralBps: review.collateralBps,
    contribution,
    contributionLamports: review.contributionLamports.toString(),
    creator,
    currentRoundIndex: 0,
    cycle: cycleLabelFromSeconds(Number(review.cycleDurationSeconds)),
    cycleDurationSeconds: Number(review.cycleDurationSeconds),
    deadline: "Not started",
    deadlineAt: null,
    id: review.circlePda,
    insurance: "0 SOL",
    insuranceFeeBps: INSURANCE_FEE_BPS,
    memberCap: review.maxMembers,
    members: 0,
    minReputation: Number(review.minReputation),
    mode: circleModeFromPayoutCurve(review.payoutCurve),
    name: review.name,
    nextAction: "Join Circle",
    nextPayout: "Start circle",
    pot,
    progress: 0,
    reserveRatioBps: review.reserveRatioBps,
    round: `0 / ${review.maxMembers}`,
    status: "Forming",
    updatedAt: new Date().toISOString(),
  };
}

function toOptimisticCircleDetail(circle: CircleSummary): CircleDetail {
  return {
    circle,
    defaultProposal: null,
    members: [],
    payoutSchedule: Array.from({ length: circle.memberCap }, (_, index) => ({
      amount: circle.pot,
      recipient: "Unassigned",
      round: String(index + 1).padStart(2, "0"),
      status: "Pending",
    })),
    vouches: [],
  };
}

function cycleLabelFromSeconds(seconds: number) {
  const days = Math.round(seconds / (24 * 60 * 60));
  if (days === 7) return "Weekly";
  if (days === 30) return "Monthly";
  if (days === 90) return "Quarterly";
  return `${days} days`;
}

function circleModeFromPayoutCurve(value: PayoutCurveValue): CircleSummary["mode"] {
  if (value === "auction") return "Dutch bid";
  if (value === "lottery") return "VRF lottery";
  return "Fixed order";
}

function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function buildPreviewRows(cycleDays: number, projectedPotLamports: bigint) {
  const now = new Date();
  const days = Number.isFinite(cycleDays) && cycleDays > 0 ? cycleDays : 30;

  return [1, 2, 3].map((cycle) => {
    const date = new Date(now);
    date.setDate(now.getDate() + days * cycle);

    return {
      label: `Cycle ${String(cycle).padStart(2, "0")} - ${new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date)}`,
      value: `${lamportsToSol(projectedPotLamports)} SOL`,
    };
  });
}
