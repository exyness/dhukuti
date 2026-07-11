"use client";

import { CheckCircle2, ExternalLink, Loader2, X } from "lucide-react";
import { Panel } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { explorerTransactionUrl } from "@/lib/constants";
import { lamportsToSol } from "@/lib/program";
import type {
  ProgramTransactionFailure,
  ProgramTransactionReview,
} from "@/lib/use-program-transaction";

export function TransactionReviewPanel({
  error,
  onDismiss,
  onSign,
  review,
}: {
  error?: ProgramTransactionFailure | null;
  onDismiss: () => void;
  onSign: () => void;
  review: ProgramTransactionReview | null;
}) {
  if (!review) {
    return error ? <TransactionErrorPanel error={error} onDismiss={onDismiss} /> : null;
  }

  const busy =
    review.status === "confirming" || review.status === "signing" || review.status === "simulating";
  const confirmed = review.status === "confirmed";

  return (
    <Panel
      aria-live="polite"
      className="border-accent/30 bg-accent/[0.055] p-5"
      role="region"
      aria-label={`${review.title} transaction review`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={confirmed ? "success" : "accent"} shape="square" size="xs">
              {confirmed ? "Confirmed" : "Ready to sign"}
            </Badge>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">
              Devnet
            </span>
          </div>
          <h2 className="mt-3 text-lg font-medium text-foreground">{review.title}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{review.description}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss transaction review"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={busy}
          onClick={onDismiss}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {review.details.map((detail) => (
          <ReviewMetric key={detail.label} label={detail.label} value={detail.value} />
        ))}
        <ReviewMetric
          label="Estimated network cost"
          value={`${lamportsToSol(BigInt(review.estimatedFeeLamports))} SOL`}
        />
      </div>

      {error ? <TransactionErrorPanel className="mt-5" error={error} /> : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {review.signature ? (
          <a
            href={explorerTransactionUrl(review.signature)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-success/25 bg-success/10 px-4 font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-success transition-colors hover:bg-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View transaction
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : (
          <Button type="button" variant="primary" disabled={busy} onClick={onSign}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {review.status === "signing"
              ? "Confirm in wallet"
              : review.status === "confirming"
                ? "Confirming"
                : `Sign ${review.title}`}
          </Button>
        )}
        <Button type="button" variant="secondary" disabled={busy} onClick={onDismiss}>
          {confirmed ? "Close review" : "Cancel"}
        </Button>
      </div>
      {!confirmed ? (
        <p className="mt-4 text-xs leading-5 text-muted">
          Nothing is sent until you explicitly sign this reviewed transaction in your wallet.
        </p>
      ) : (
        <p className="mt-4 text-xs leading-5 text-muted">
          The transaction is confirmed. Your activity and balances will update shortly.
        </p>
      )}
    </Panel>
  );
}

export function TransactionErrorPanel({
  className,
  error,
  onDismiss,
}: {
  className?: string;
  error: ProgramTransactionFailure;
  onDismiss?: () => void;
}) {
  return (
    <div className={className} role="alert">
      <div className="rounded-md border border-warning/30 bg-warning/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-warning">
              Transaction needs attention
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">{error.message}</p>
          </div>
          {onDismiss ? (
            <button
              type="button"
              aria-label="Dismiss transaction error"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-warning transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {error.logs.length > 0 ? (
          <details className="mt-3">
            <summary className="cursor-pointer font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Transaction details
            </summary>
            <pre className="dhukuti-scrollbar mt-3 max-h-44 overflow-auto rounded border border-border bg-black/20 p-3 font-mono text-[0.62rem] leading-5 whitespace-pre-wrap text-muted">
              {error.logs.slice(-10).join("\n")}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white/[0.025] p-3">
      <span className="block font-mono text-[0.54rem] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="mt-1 block break-words font-mono text-[0.75rem] tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}
