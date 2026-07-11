"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  LockKeyhole,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { AppPageHeader, AppShell, Panel, TokenScopeNotice } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { DHUKUTI_PROGRAM, explorerTransactionUrl } from "@/lib/constants";
import {
  buildCreateCircleInstruction,
  CIRCLE_ACCOUNT_SPACE,
  collateralBpsFromAmounts,
  generateCircleId,
  INSURANCE_POOL_ACCOUNT_SPACE,
  lamportsToSol,
  type PayoutCurveValue,
  payoutCurveLabel,
  solToLamports,
} from "@/lib/program";
import { decodeProgramError } from "@/lib/use-program-transaction";
import { OPEN_WALLET_EVENT, truncateAddress } from "@/lib/wallet";

type CreateStatus = "confirmed" | "confirming" | "idle" | "ready" | "signing" | "simulating";

type CreateCircleReview = {
  circleId: bigint;
  circlePda: string;
  collateralBps: number;
  confirmationSignature?: string;
  contributionLamports: bigint;
  cycleDurationSeconds: bigint;
  estimatedFeeLamports: number;
  estimatedRentLamports: number;
  insurancePoolPda: string;
  maxMembers: number;
  minReputation: bigint;
  payoutCurve: PayoutCurveValue;
  reserveRatioBps: number;
  simulationUnits?: number;
  vaultPda: string;
};

const INSURANCE_FEE_BPS = 50;
const RESERVE_RATIO_BPS = 1000;
const SECURITY_BOND_RATIO_BPS = 5000;
const BPS_DENOMINATOR = BigInt(10_000);
const ZERO_BIGINT = BigInt(0);

export default function NewCirclePage() {
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction } = useWallet();
  const [cycleDays, setCycleDays] = useState("30");
  const [contribution, setContribution] = useState("5.00");
  const [maxMembers, setMaxMembers] = useState("12");
  const [payoutCurve, setPayoutCurve] = useState<PayoutCurveValue>("fixed");
  const [minReputation, setMinReputation] = useState("450");
  const [status, setStatus] = useState<CreateStatus>("idle");
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
  const canSign = Boolean(review) && status === "ready" && connected;
  const previewRows = buildPreviewRows(Number.parseInt(cycleDays, 10), projectedPotLamports);

  function resetReview() {
    setReview(null);
    setError("");
    if (status !== "idle") {
      setStatus("idle");
    }
  }

  async function handleReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!publicKey || !connected) {
      setError("Connect a devnet wallet before simulating create_circle.");
      window.dispatchEvent(new Event(OPEN_WALLET_EVENT));
      return;
    }

    setStatus("simulating");
    setError("");
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
    if (!publicKey || !review) return;

    setStatus("signing");
    setError("");

    try {
      const params = getCreateParams(publicKey, review.circleId);
      await simulateCreateCircle(params);

      const { instruction } = buildCreateCircleInstruction(params);
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      const { Transaction } = await import("@solana/web3.js");
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }).add(instruction);

      const signature = await sendTransaction(transaction, connection, {
        maxRetries: 3,
        preflightCommitment: "confirmed",
      });

      setStatus("confirming");

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      setReview({ ...review, confirmationSignature: signature });
      setStatus("confirmed");
    } catch (nextError) {
      setStatus("ready");
      setError(normalizeCreateError(nextError));
    }
  }

  function getCreateParams(creator: typeof publicKey, circleId: bigint) {
    if (!creator) {
      throw new Error("Connect a wallet before creating a circle.");
    }

    const contributionLamportsValue = solToLamports(contribution);
    const securityBondLamportsValue =
      (contributionLamportsValue * BigInt(SECURITY_BOND_RATIO_BPS)) / BPS_DENOMINATOR;
    const memberCap = Number.parseInt(maxMembers, 10);
    const minRep = BigInt(Number.parseInt(minReputation, 10));
    const cycleDurationSeconds = BigInt(Number.parseInt(cycleDays, 10) * 24 * 60 * 60);

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
      throw new Error("Generated circle PDA already exists. Simulate again to pick a new ID.");
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
        `Simulation failed: ${JSON.stringify(simulation.value.err)}${formatLogs(simulation.value.logs)}`,
      );
    }

    return {
      circleId: params.circleId,
      circlePda: pdas.circle.toBase58(),
      collateralBps: params.collateralBps,
      contributionLamports: params.contributionLamports,
      cycleDurationSeconds: params.cycleDurationSeconds,
      estimatedFeeLamports: feeEstimate.value ?? 0,
      estimatedRentLamports: circleRent + insuranceRent + vaultRent,
      insurancePoolPda: pdas.insurancePool.toBase58(),
      maxMembers: params.maxMembers,
      minReputation: params.minReputation,
      payoutCurve: params.payoutCurve,
      reserveRatioBps: params.reserveRatioBps,
      simulationUnits: simulation.value.unitsConsumed ?? undefined,
      vaultPda: pdas.vault.toBase58(),
    };
  }

  return (
    <AppShell title="Create Circle" contentClassName="!max-w-7xl !px-6 !py-10 md:!px-10">
      <AppPageHeader
        eyebrow="Circle Builder"
        title="Configure a savings circle."
        copy="Set the economic rules, admission gate, and payout model before publishing. These terms become fixed after the first member joins."
      />

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_23.75rem]">
        <form className="space-y-[1.125rem]" onSubmit={handleReview}>
          <Panel className="p-6">
            <fieldset className="m-0 min-w-0">
              <legend className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                01. Circle Terms
              </legend>
              <p className="mt-1 mb-[1.375rem] max-w-2xl text-sm leading-6 text-muted">
                Define the core parameters members will review before they join.
              </p>
              <div className="grid gap-[1.125rem] md:grid-cols-2">
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
                    <span className="flex min-h-11 items-center justify-center rounded-md border border-border bg-white/[0.035] font-mono text-[0.84rem] text-foreground">
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

          {review ? (
            <Panel className="p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                    Simulation Review
                  </span>
                  <h2 className="mt-1 text-lg font-medium">{reviewStatusCopy(status)}</h2>
                </div>
                <Badge tone={status === "confirmed" ? "success" : "accent"}>
                  {status === "confirmed" ? "Confirmed" : "Devnet"}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <ReviewMetric label="Circle PDA" value={truncateAddress(review.circlePda, 5)} />
                <ReviewMetric label="Vault PDA" value={truncateAddress(review.vaultPda, 5)} />
                <ReviewMetric
                  label="Contribution"
                  value={`${lamportsToSol(review.contributionLamports)} SOL`}
                />
                <ReviewMetric
                  label="Estimated rent + fee"
                  value={`${lamportsToSol(BigInt(review.estimatedRentLamports + review.estimatedFeeLamports))} SOL`}
                />
                <ReviewMetric label="Members" value={String(review.maxMembers)} />
                <ReviewMetric
                  label="Compute units"
                  value={review.simulationUnits ? String(review.simulationUnits) : "Not reported"}
                />
              </div>
              {review.confirmationSignature ? (
                <a
                  href={explorerTransactionUrl(review.confirmationSignature)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 font-mono text-[0.65rem] uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  View transaction
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  className="mt-5"
                  disabled={!canSign || isWorking}
                  onClick={handleSignCreateCircle}
                >
                  {status === "signing" || status === "confirming" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  Sign create_circle
                </Button>
              )}
            </Panel>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={resetReview}>
              Reset Review
            </Button>
            <Button type="submit" variant="primary" disabled={isWorking}>
              {status === "simulating" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Simulate create_circle
            </Button>
          </div>
        </form>

        <aside className="space-y-6">
          <Panel className="sticky top-24 p-6">
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
              <strong className="font-mono text-[2.45rem] font-semibold tracking-tight">
                {lamportsToSol(projectedPotLamports)}
              </strong>
              <span className="font-mono text-sm text-muted">SOL</span>
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
                Instruction Map
              </span>
            </div>
            <ul className="space-y-3 text-sm leading-6 text-muted">
              <li>
                <strong className="font-medium text-foreground">create_circle</strong> creates
                circle, vault, and insurance PDAs.
              </li>
              <li>
                <strong className="font-medium text-foreground">join_circle</strong> locks
                collateral and mints the member position NFT.
              </li>
              <li>
                <strong className="font-medium text-foreground">start_circle</strong> opens round
                zero after the host is ready.
              </li>
            </ul>
          </Panel>

          <Panel className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-warning" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-warning">
                Mainnet Gate
              </span>
            </div>
            <p className="text-sm leading-6 text-muted">
              This UI targets {DHUKUTI_PROGRAM.cluster}. Simulation runs before the wallet receives
              the create_circle transaction.
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
        className={cn("input-control pr-14 font-mono text-[0.84rem]", readOnly && "text-muted")}
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
    <div className="rounded-md border border-border bg-white/[0.025] p-3">
      <span className="block font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="mt-1 block font-mono text-[0.75rem] text-foreground">{value}</span>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
      <span className="font-mono text-[0.64rem] text-muted">{label}</span>
      <strong className="font-mono text-[0.72rem] font-medium text-foreground">{value}</strong>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white/[0.025] p-3">
      <span className="block font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="mt-1 block break-all font-mono text-[0.72rem] text-foreground">{value}</span>
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

function reviewStatusCopy(status: CreateStatus) {
  if (status === "confirmed") return "create_circle confirmed";
  if (status === "confirming") return "Waiting for confirmation";
  if (status === "signing") return "Wallet signature requested";
  return "Simulation succeeded";
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
