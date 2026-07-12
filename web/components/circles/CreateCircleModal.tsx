"use client";

import { ArrowRight, CheckCircle2, ChevronDown, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { explorerTransactionUrl } from "@/lib/constants";
import { lamportsToSol, type PayoutCurveValue, payoutCurveLabel } from "@/lib/program";
import { truncateAddress } from "@/lib/wallet";

export type CreateStatus = "confirmed" | "confirming" | "idle" | "ready" | "signing" | "simulating";

export type IndexStatus = "failed" | "idle" | "syncing" | "synced";

export type CreateCircleReview = {
  blockhash: string;
  circleId: bigint;
  circlePda: string;
  collateralBps: number;
  confirmationSignature?: string;
  contributionLamports: bigint;
  creator: string;
  cycleDurationSeconds: bigint;
  estimatedFeeLamports: number;
  estimatedRentLamports: number;
  insurancePoolPda: string;
  maxMembers: number;
  minReputation: bigint;
  name: string;
  lastValidBlockHeight: number;
  payoutCurve: PayoutCurveValue;
  reviewedAt: number;
  reserveRatioBps: number;
  simulationUnits?: number;
  vaultPda: string;
};

const BPS_DENOMINATOR = 10_000n;

type CreateCircleModalProps = {
  error?: string;
  indexError: string;
  indexStatus: IndexStatus;
  onClose: () => void;
  onCreateAnother: () => void;
  onRetryIndex: () => void;
  onSign: () => void;
  review: CreateCircleReview | null;
  status: CreateStatus;
};

export function CreateCircleModal({
  error,
  indexError,
  indexStatus,
  onClose,
  onCreateAnother,
  onRetryIndex,
  onSign,
  review,
  status,
}: CreateCircleModalProps) {
  const open = review !== null;
  const isWorking = status === "simulating" || status === "signing" || status === "confirming";
  const confirmed = status === "confirmed" && Boolean(review?.confirmationSignature);

  if (!review) return null;

  const cycleSeconds = Number(review.cycleDurationSeconds);
  const cycleLabel =
    cycleSeconds === 7 * 86_400
      ? "Weekly"
      : cycleSeconds === 30 * 86_400
        ? "Monthly"
        : cycleSeconds === 90 * 86_400
          ? "Quarterly"
          : `${Math.round(cycleSeconds / 86_400)} days`;
  const securityBondLamports =
    (review.contributionLamports * BigInt(review.collateralBps)) / BPS_DENOMINATOR;
  const networkCostLamports = BigInt(review.estimatedRentLamports + review.estimatedFeeLamports);

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeOnBackdrop={!isWorking}
      size="md"
      title="Review circle creation"
      description="Confirm the on-chain terms before signing with your wallet."
      footer={
        confirmed ? null : (
          <>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isWorking}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={onSign} disabled={isWorking}>
              {isWorking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              {status === "signing"
                ? "Awaiting signature"
                : status === "confirming"
                  ? "Confirming"
                  : "Sign and create circle"}
            </Button>
          </>
        )
      }
    >
      {confirmed ? (
        <CircleCreatedSuccess
          indexError={indexError}
          indexStatus={indexStatus}
          review={review}
          onCreateAnother={onCreateAnother}
          onRetryIndex={onRetryIndex}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <Badge tone={status === "confirming" ? "warning" : "accent"} shape="square" size="xs">
              {status === "confirming" ? "Confirming" : "Devnet"}
            </Badge>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">
              {reviewStatusCopy(status)}
            </span>
          </div>

          <div>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">
              Circle name
            </span>
            <p className="mt-1 break-words text-lg font-medium leading-tight text-foreground">
              {review.name}
            </p>
          </div>

          <Section label="Circle terms">
            <ReceiptRow
              label="Contribution"
              value={`${lamportsToSol(review.contributionLamports)} SOL`}
            />
            <ReceiptRow label="Members" value={String(review.maxMembers)} />
            <ReceiptRow label="Cycle" value={cycleLabel} />
            <ReceiptRow label="Payout model" value={payoutCurveLabel(review.payoutCurve)} />
            <ReceiptRow
              label="Security bond"
              value={`${lamportsToSol(securityBondLamports)} SOL`}
            />
            <ReceiptRow label="Min reputation" value={String(review.minReputation)} />
          </Section>

          <CollapsibleSection label="Network & addresses">
            <ReceiptRow
              label="Est. network cost"
              value={`${lamportsToSol(networkCostLamports)} SOL`}
            />
            <ReceiptRow label="Circle address" value={truncateAddress(review.circlePda, 5)} />
            <ReceiptRow
              label="Shared balance address"
              value={truncateAddress(review.vaultPda, 5)}
            />
          </CollapsibleSection>

          {error ? (
            <div role="alert">
              <div className="rounded-md border border-accent/25 bg-accent/8 p-4">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-accent">
                  Create circle error
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">{error}</p>
              </div>
            </div>
          ) : null}

          <p className="text-xs leading-5 text-muted">
            Nothing is sent until you explicitly sign this reviewed transaction in your wallet.
          </p>
        </div>
      )}
    </Modal>
  );
}

function Section({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="overflow-hidden rounded-md border border-[rgba(245,245,245,0.1)] bg-white/[0.02] font-mono text-xs">
        <div className="divide-y divide-dashed divide-[rgba(245,245,245,0.08)] px-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({
  children,
  defaultOpen = false,
  label,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  label: string;
}) {
  return (
    <details
      open={defaultOpen}
      className="group flex flex-col gap-2 [&::-webkit-details-marker]:hidden [&::marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-md py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span>{label}</span>
        <ChevronDown
          className="h-3.5 w-3.5 text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="overflow-hidden rounded-md border border-[rgba(245,245,245,0.1)] bg-white/[0.02] font-mono text-xs">
        <div className="divide-y divide-dashed divide-[rgba(245,245,245,0.08)] px-4">
          {children}
        </div>
      </div>
    </details>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className="shrink-0 text-[0.62rem] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-[0.72rem] tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function CircleCreatedSuccess({
  indexError,
  indexStatus,
  onCreateAnother,
  onRetryIndex,
  review,
}: {
  indexError: string;
  indexStatus: IndexStatus;
  onCreateAnother: () => void;
  onRetryIndex: () => void;
  review: CreateCircleReview;
}) {
  if (!review.confirmationSignature) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-success/25 bg-success/12 text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">Circle created</h3>
            <IndexStatusIndicator status={indexStatus} />
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">
            Confirmed on devnet. Indexing only controls when it appears in server-backed lists.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/circles/${review.circlePda}`}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-success/25 bg-success/12 px-3.5 font-mono text-[0.64rem] font-medium uppercase tracking-[0.08em] text-success transition-colors hover:bg-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open circle
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
        {indexStatus === "failed" ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 px-3.5 font-mono text-[0.64rem] uppercase tracking-[0.08em]"
            onClick={onRetryIndex}
          >
            Retry index
          </Button>
        ) : null}
        <a
          href={explorerTransactionUrl(review.confirmationSignature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3.5 font-mono text-[0.64rem] font-medium uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View tx
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      <p className="text-xs leading-5 text-muted">{indexStatusCopy(indexStatus)}</p>
      {indexError && indexStatus === "failed" ? (
        <p className="text-xs leading-5 text-warning">{indexError}</p>
      ) : null}

      <Button
        type="button"
        variant="primary"
        className="h-9 w-full font-mono text-[0.64rem] uppercase tracking-[0.08em]"
        onClick={onCreateAnother}
      >
        Create another
      </Button>
    </div>
  );
}

function IndexStatusIndicator({ status }: { status: IndexStatus }) {
  if (status === "syncing") {
    return (
      <Badge tone="accent" shape="square" size="xs">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
        Syncing
      </Badge>
    );
  }

  if (status === "synced") {
    return (
      <Badge tone="success" shape="square" size="xs">
        Indexed
      </Badge>
    );
  }

  if (status === "failed") {
    return (
      <Badge tone="warning" shape="square" size="xs">
        Index delayed
      </Badge>
    );
  }

  return (
    <Badge tone="success" shape="square" size="xs">
      Confirmed
    </Badge>
  );
}

function reviewStatusCopy(status: CreateStatus) {
  if (status === "confirmed") return "Circle created";
  if (status === "confirming") return "Waiting for confirmation";
  if (status === "signing") return "Wallet signature requested";
  return "Ready for your wallet";
}

function indexStatusCopy(status: IndexStatus) {
  if (status === "synced")
    return "This circle has been indexed and the circles list was refreshed.";
  if (status === "syncing") return "Syncing the confirmed event into the indexed read model.";
  if (status === "failed") {
    return "The transaction is confirmed. The indexer sync failed, so this browser keeps the circle visible while you retry or run a backfill.";
  }
  return "The circles list was updated locally while the indexer catches up.";
}
