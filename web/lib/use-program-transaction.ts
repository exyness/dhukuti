"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import type { ProgramInstructionBundle } from "@/lib/program";

export type TransactionReviewDetail = {
  label: string;
  value: string;
};

export type ProgramTransactionRequest = {
  bundle: ProgramInstructionBundle;
  description: string;
  details: TransactionReviewDetail[];
  title: string;
};

export type ProgramTransactionReview = ProgramTransactionRequest & {
  estimatedFeeLamports: number;
  logs: string[];
  signature?: string;
  simulationUnits?: number;
  status: "confirmed" | "confirming" | "ready" | "signing" | "simulating";
};

export type ProgramTransactionFailure = {
  logs: string[];
  message: string;
};

export function useProgramTransaction() {
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction } = useWallet();
  const queryClient = useQueryClient();
  const [error, setError] = useState<ProgramTransactionFailure | null>(null);
  const [review, setReview] = useState<ProgramTransactionReview | null>(null);

  const preview = useCallback(
    async (request: ProgramTransactionRequest) => {
      if (!connected || !publicKey) {
        const missingWallet = {
          logs: [],
          message: "Connect a devnet wallet before reviewing this transaction.",
        };
        setError(missingWallet);
        throw new Error(missingWallet.message);
      }

      setError(null);
      setReview({
        ...request,
        estimatedFeeLamports: 0,
        logs: [],
        status: "simulating",
      });

      try {
        const simulation = await prepareAndSimulate({ connection, publicKey, request });
        setReview({
          ...request,
          estimatedFeeLamports: simulation.estimatedFeeLamports,
          logs: simulation.logs,
          simulationUnits: simulation.simulationUnits,
          status: "ready",
        });
      } catch (nextError) {
        const failure = decodeProgramError(nextError);
        setError(failure);
        toast.error(failure.message);
        setReview(null);
        throw new Error(failure.message);
      }
    },
    [connected, connection, publicKey],
  );

  const sign = useCallback(async () => {
    if (!review || !publicKey) return;

    const request = review;
    let submittedSignature: string | undefined;
    setError(null);
    setReview({ ...request, status: "signing" });

    try {
      const prepared = await prepareTransaction({ connection, publicKey, request });
      const simulation = await connection.simulateTransaction(prepared.transaction);
      if (simulation.value.err) {
        throw simulationError(simulation.value.err, simulation.value.logs ?? []);
      }

      const signature = await sendTransaction(prepared.transaction, connection, {
        maxRetries: 3,
        preflightCommitment: "confirmed",
        signers: request.bundle.signers,
      });
      submittedSignature = signature;

      setReview({ ...request, status: "confirming" });
      const confirmation = await connection.confirmTransaction(
        {
          blockhash: prepared.blockhash,
          lastValidBlockHeight: prepared.lastValidBlockHeight,
          signature,
        },
        "confirmed",
      );

      if (confirmation.value.err) {
        throw simulationError(confirmation.value.err, []);
      }

      setReview({ ...request, signature, status: "confirmed" });
      toast.success("Transaction confirmed", {
        description: `${request.title} was submitted to the network.`,
      });
      void syncConfirmedTransaction(signature).finally(() => {
        void queryClient.invalidateQueries();
      });
    } catch (nextError) {
      const failure = decodeProgramError(nextError);
      setError(
        submittedSignature
          ? {
              ...failure,
              message:
                "The transaction was submitted but this client could not confirm it. Check the explorer before submitting another transaction.",
            }
          : failure,
      );
      if (!/cancel/i.test(failure.message)) {
        toast.error(failure.message);
      }
      setReview({ ...request, signature: submittedSignature, status: "ready" });
    }
  }, [connection, publicKey, queryClient, review, sendTransaction]);

  const dismiss = useCallback(() => {
    setError(null);
    setReview(null);
  }, []);

  return {
    dismiss,
    error,
    preview,
    review,
    sign,
  };
}

async function syncConfirmedTransaction(signature: string) {
  const response = await fetch("/api/indexer/signature", {
    body: JSON.stringify({ signature }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Indexer sync failed.");
  }
}

async function prepareAndSimulate({
  connection,
  publicKey,
  request,
}: {
  connection: ReturnType<typeof useConnection>["connection"];
  publicKey: NonNullable<ReturnType<typeof useWallet>["publicKey"]>;
  request: ProgramTransactionRequest;
}) {
  const prepared = await prepareTransaction({ connection, publicKey, request });
  const [fee, simulation] = await Promise.all([
    connection.getFeeForMessage(prepared.transaction.compileMessage(), "confirmed"),
    connection.simulateTransaction(prepared.transaction),
  ]);

  if (simulation.value.err) {
    throw simulationError(simulation.value.err, simulation.value.logs ?? []);
  }

  return {
    estimatedFeeLamports: fee.value ?? 0,
    logs: simulation.value.logs ?? [],
    simulationUnits: simulation.value.unitsConsumed ?? undefined,
  };
}

async function prepareTransaction({
  connection,
  publicKey,
  request,
}: {
  connection: ReturnType<typeof useConnection>["connection"];
  publicKey: NonNullable<ReturnType<typeof useWallet>["publicKey"]>;
  request: ProgramTransactionRequest;
}) {
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    blockhash: latestBlockhash.blockhash,
    feePayer: publicKey,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(request.bundle.instruction);

  if (request.bundle.signers?.length) {
    transaction.partialSign(...request.bundle.signers);
  }

  return { ...latestBlockhash, transaction };
}

function simulationError(error: unknown, logs: string[]) {
  const message = `Transaction check failed: ${JSON.stringify(error)}`;
  const simulationFailure = new Error(message) as Error & { logs?: string[] };
  simulationFailure.logs = logs;
  return simulationFailure;
}

export function decodeProgramError(error: unknown): ProgramTransactionFailure {
  const logs = getLogs(error);
  const rawMessage = error instanceof Error ? error.message : "Unable to submit the transaction.";

  if (/reject|cancel/i.test(rawMessage)) {
    return { logs, message: "Transaction cancelled in your wallet." };
  }

  if (/insufficient funds|insufficient.*lamports/i.test(rawMessage)) {
    return { logs, message: "Insufficient SOL for the transaction, rent, or protocol collateral." };
  }

  const anchorMessage = [...logs, rawMessage]
    .map((line) => line.match(/Error Message: (.+)$/)?.[1])
    .find((message): message is string => Boolean(message));
  if (anchorMessage) {
    if (/Fallback functions are not supported/i.test(anchorMessage)) {
      return {
        logs,
        message:
          "The devnet program is older than this client. Deploy the latest Dhukuti program and try again.",
      };
    }

    return { logs, message: anchorMessage };
  }

  const combinedError = `${rawMessage}\n${logs.join("\n")}`;
  if (/InstructionFallbackNotFound|Fallback functions are not supported/i.test(combinedError)) {
    return {
      logs,
      message:
        "The devnet program is older than this client. Deploy the latest Dhukuti program and try again.",
    };
  }

  if (/AccountDataTooSmall|account data too small/i.test(combinedError)) {
    return {
      logs,
      message:
        "The devnet program account layout does not match this client. Deploy the latest Dhukuti program and try again.",
    };
  }

  const customError = combinedError.match(/custom program error: 0x([\da-f]+)/i);
  if (customError) {
    const code = Number.parseInt(customError[1], 16);
    if (code === 101) {
      return {
        logs,
        message:
          "The devnet program is older than this client. Deploy the latest Dhukuti program and try again.",
      };
    }
    const knownMessage = DHUKUTI_ERROR_MESSAGES[code - 6000];
    if (knownMessage) return { logs, message: knownMessage };
  }

  const numericCustomError = combinedError.match(/"Custom"\s*:\s*(\d+)/);
  if (numericCustomError) {
    const code = Number.parseInt(numericCustomError[1], 10);
    if (code === 101) {
      return {
        logs,
        message:
          "The devnet program is older than this client. Deploy the latest Dhukuti program and try again.",
      };
    }
    const knownMessage = DHUKUTI_ERROR_MESSAGES[code - 6000];
    if (knownMessage) return { logs, message: knownMessage };
  }

  if (
    /Allocate: account .* already in use/i.test(combinedError) ||
    (/custom program error: 0x0\b/i.test(combinedError) && /already in use/i.test(combinedError))
  ) {
    return {
      logs,
      message:
        "This round has already been resolved, so its next-round account already exists. Refresh the circle and continue to the next round.",
    };
  }

  if (/helius|supabase|rpc|network request|fetch failed/i.test(combinedError)) {
    return {
      logs,
      message: "The network could not complete this transaction check. Try again in a moment.",
    };
  }

  if (/^Transaction (?:simulation|check) failed:/.test(rawMessage)) {
    return {
      logs,
      message: "This transaction could not be prepared. Review the details and try again.",
    };
  }

  return {
    logs,
    message:
      rawMessage.replace(/^Transaction (?:simulation|check) failed: /, "") || "Transaction failed.",
  };
}

function getLogs(error: unknown) {
  if (error && typeof error === "object" && "logs" in error) {
    const logs = (error as { logs?: unknown }).logs;
    if (Array.isArray(logs)) return logs.filter((line): line is string => typeof line === "string");
  }
  return [];
}

const DHUKUTI_ERROR_MESSAGES = [
  "Max members must be between 2 and 64.",
  "Contribution amount must be greater than zero.",
  "Cycle duration must be between one hour and one year.",
  "Collateral must be at least 5% of the contribution amount.",
  "The insurance fee is above the protocol maximum.",
  "The reserve ratio cannot exceed 100%.",
  "Only native SOL settlement is supported.",
  "This circle is not open for new members.",
  "This circle is already full.",
  "Your reputation is below this circle's admission requirement.",
  "Your wallet does not have enough SOL for the required collateral.",
  "This wallet already has a membership in this circle.",
  "Only the circle host can start this circle.",
  "At least two members must join before the circle can start.",
  "This action is not available in the circle's current state.",
  "This circle is not active yet.",
  "This member has already contributed to this round.",
  "The supplied membership does not match this circle.",
  "This member is not active in the circle.",
  "All active members must contribute before the payout can resolve.",
  "This round has already been resolved.",
  "The round state changed. Refresh and try again.",
  "A valid payout recipient could not be found.",
  "The round deadline has not been reached yet.",
  "This payout curve does not support that action.",
  "A Dutch auction winner has already been selected.",
  "A Dutch auction winner must be selected before resolving this round.",
  "The required distribution accounts are missing or invalid.",
  "A remaining member account is invalid.",
  "Every round must resolve before the circle can complete.",
  "This reputation event was already claimed.",
  "Only the circle host can claim host reputation.",
  "Host reputation was already claimed for this circle.",
  "Vouch stake must be greater than zero.",
  "You cannot vouch for yourself.",
  "This vouch is no longer active.",
  "This vouch was already released or slashed.",
  "The vouched member has not defaulted.",
  "This default proposal was already resolved.",
  "This default proposal needs a majority approval or grace-period expiry.",
  "A member cannot vote on their own default proposal.",
  "Listing price must be greater than zero.",
  "The supplied position token account does not hold this position.",
  "This listing is no longer active.",
  "You cannot buy your own listing.",
  "The supplied position mint does not match this membership.",
  "The transaction exceeded a protocol arithmetic limit.",
  "The transaction would underflow a protocol balance.",
  "Circle name must be 1-64 UTF-8 bytes.",
] as const;
