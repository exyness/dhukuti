"use client";

import { Badge } from "@/components/ui/badge";
import { lamportsToSol } from "@/lib/program";
import type {
  ProgramTransactionFailure,
  ProgramTransactionReview,
} from "@/lib/use-program-transaction";

export function TransactionReviewPanel({
  error,
  review,
}: {
  error?: ProgramTransactionFailure | null;
  review: ProgramTransactionReview | null;
}) {
  if (!review) {
    return error ? <TransactionErrorPanel error={error} /> : null;
  }

  const confirmed = review.status === "confirmed";

  return (
    <section aria-live="polite" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Badge tone={confirmed ? "success" : "accent"} shape="square" size="xs">
          {confirmed ? "Confirmed" : "Ready to sign"}
        </Badge>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">
          Devnet · Transaction summary
        </span>
      </div>

      <div className="overflow-hidden rounded-md border border-[rgba(245,245,245,0.1)] bg-white/[0.02] font-mono text-xs">
        <div className="border-b border-dashed border-[rgba(245,245,245,0.1)] px-4 py-3">
          <p className="text-[0.62rem] uppercase tracking-[0.12em] text-muted">{review.title}</p>
        </div>
        <div className="divide-y divide-dashed divide-[rgba(245,245,245,0.08)] px-4">
          {review.details.map((detail) => (
            <ReceiptRow key={detail.label} label={detail.label} value={detail.value} />
          ))}
          <ReceiptRow
            label="Est. network cost"
            value={`${lamportsToSol(BigInt(review.estimatedFeeLamports))} SOL`}
          />
        </div>
      </div>

      {error ? <TransactionErrorPanel className="mt-1" error={error} /> : null}

      <p className="text-xs leading-5 text-muted">
        {confirmed
          ? "The transaction is confirmed. Your activity and balances will update shortly."
          : "Nothing is sent until you explicitly sign this reviewed transaction in your wallet."}
      </p>
    </section>
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
              <span className="font-mono text-base leading-none" aria-hidden="true">
                ×
              </span>
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
