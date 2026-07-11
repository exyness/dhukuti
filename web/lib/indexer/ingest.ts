import "server-only";

import { decodeDhukutiEventsFromLogs } from "@/lib/program/events";
import {
  extractHeliusWebhookSignatures,
  fetchSignaturesForAddress,
  fetchSolanaTransaction,
  type SolanaRpcTransaction,
} from "./helius";
import { storeAndProjectEvents } from "./projector";

export async function ingestHeliusWebhookPayload(payload: unknown) {
  const signatures = extractHeliusWebhookSignatures(payload);
  return ingestSignatures(signatures);
}

export async function backfillProgramEvents({
  address,
  before,
  limit,
}: {
  address?: string;
  before?: string;
  limit?: number;
}) {
  const signatures = await fetchSignaturesForAddress({ address, before, limit });
  const successfulSignatures = signatures.filter((item) => !item.err).map((item) => item.signature);
  const result = await ingestSignatures(successfulSignatures);

  return {
    ...result,
    nextBefore: signatures.at(-1)?.signature ?? null,
  };
}

export async function ingestSignatures(signatures: string[]) {
  const uniqueSignatures = [...new Set(signatures)];
  let eventCount = 0;
  let transactionCount = 0;

  for (const signature of uniqueSignatures) {
    const transaction = await fetchSolanaTransaction(signature);
    if (!transaction?.meta || transaction.meta.err) {
      continue;
    }

    const result = await ingestTransaction(transaction);
    eventCount += result.eventCount;
    transactionCount += 1;
  }

  return {
    eventCount,
    signatureCount: uniqueSignatures.length,
    transactionCount,
  };
}

async function ingestTransaction(transaction: SolanaRpcTransaction) {
  const signature = transaction.transaction.signatures[0];
  const events = decodeDhukutiEventsFromLogs(transaction.meta?.logMessages);

  return storeAndProjectEvents({
    blockTime: transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : null,
    events,
    signature,
    slot: transaction.slot,
  });
}
