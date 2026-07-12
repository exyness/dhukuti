"use client";

import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { explorerTransactionUrl } from "@/lib/constants";
import type {
  ProgramTransactionFailure,
  ProgramTransactionReview,
} from "@/lib/use-program-transaction";
import { TransactionReviewPanel } from "./TransactionReviewPanel";

export function TransactionReviewModal({
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
  const open = Boolean(review || error);
  const title = review?.title ?? "Transaction needs attention";
  const description = review?.description;

  return (
    <Modal
      description={description}
      footer={review ? <ReviewActions onDismiss={onDismiss} onSign={onSign} review={review} /> : null}
      onClose={onDismiss}
      open={open}
      title={title}
    >
      <TransactionReviewPanel error={error} review={review} />
    </Modal>
  );
}

function ReviewActions({
  onDismiss,
  onSign,
  review,
}: {
  onDismiss: () => void;
  onSign: () => void;
  review: ProgramTransactionReview;
}) {
  const busy =
    review.status === "confirming" || review.status === "signing" || review.status === "simulating";
  const confirmed = review.status === "confirmed";

  if (review.signature) {
    return (
      <a
        href={explorerTransactionUrl(review.signature)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-success/25 bg-success/10 px-4 font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-success transition-colors hover:bg-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        View transaction
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    );
  }

  return (
    <>
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
      <Button type="button" variant="secondary" disabled={busy} onClick={onDismiss}>
        {confirmed ? "Close review" : "Cancel"}
      </Button>
    </>
  );
}
