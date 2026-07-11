import "server-only";

import { DHUKUTI_PROGRAM } from "@/lib/constants";

export type SolanaRpcTransaction = {
  blockTime: number | null;
  meta: {
    err: unknown;
    logMessages: string[] | null;
  } | null;
  slot: number;
  transaction: {
    signatures: string[];
  };
};

export type SignatureInfo = {
  blockTime: number | null;
  err: unknown;
  signature: string;
  slot: number;
};

type RpcResponse<T> = {
  error?: {
    code: number;
    message: string;
  };
  result?: T;
};

export function extractHeliusWebhookSignatures(payload: unknown) {
  const items = Array.isArray(payload) ? payload : [payload];
  const signatures = new Set<string>();

  for (const item of items) {
    collectSignatures(item, signatures);
  }

  return [...signatures];
}

export async function fetchSolanaTransaction(signature: string) {
  return heliusRpc<SolanaRpcTransaction | null>("getTransaction", [
    signature,
    {
      commitment: "confirmed",
      encoding: "json",
      maxSupportedTransactionVersion: 0,
    },
  ]);
}

export async function fetchSignaturesForAddress({
  address = DHUKUTI_PROGRAM.programId,
  before,
  limit = 50,
}: {
  address?: string;
  before?: string;
  limit?: number;
}) {
  return heliusRpc<SignatureInfo[]>("getSignaturesForAddress", [
    address,
    {
      before,
      limit: Math.min(Math.max(limit, 1), 1000),
    },
  ]);
}

async function heliusRpc<T>(method: string, params: unknown[]) {
  const response = await fetch(getHeliusRpcUrl(), {
    body: JSON.stringify({
      id: "dhukuti-indexer",
      jsonrpc: "2.0",
      method,
      params,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Helius RPC ${method} failed with ${response.status}.`);
  }

  const body = (await response.json()) as RpcResponse<T>;
  if (body.error) {
    throw new Error(`Helius RPC ${method} failed: ${body.error.message}`);
  }

  return body.result as T;
}

function getHeliusRpcUrl() {
  if (process.env.HELIUS_RPC_URL) {
    return process.env.HELIUS_RPC_URL;
  }

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing HELIUS_API_KEY or HELIUS_RPC_URL.");
  }

  const cluster = (DHUKUTI_PROGRAM.cluster as string) === "mainnet-beta" ? "mainnet" : "devnet";
  return `https://${cluster}.helius-rpc.com/?api-key=${apiKey}`;
}

function collectSignatures(value: unknown, signatures: Set<string>) {
  if (!value) return;

  if (typeof value === "string") {
    signatures.add(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectSignatures(item, signatures);
    return;
  }

  if (typeof value !== "object") return;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.signature === "string") {
    signatures.add(candidate.signature);
  }

  if (Array.isArray(candidate.signatures)) {
    for (const signature of candidate.signatures) {
      if (typeof signature === "string") signatures.add(signature);
    }
  }

  const transaction = candidate.transaction;
  if (transaction && typeof transaction === "object" && "signatures" in transaction) {
    collectSignatures((transaction as { signatures?: unknown }).signatures, signatures);
  }
}
