import type { PublicKey } from "@solana/web3.js";

export type PayoutCurveValue = "auction" | "fixed" | "lottery";

export type CreateCircleInstructionInput = {
  circleId: bigint;
  collateralBps: number;
  contributionLamports: bigint;
  cycleDurationSeconds: bigint;
  creator: PublicKey;
  insuranceFeeBps: number;
  maxMembers: number;
  minReputation: bigint;
  name: string;
  payoutCurve: PayoutCurveValue;
  reserveRatioBps: number;
};

export type CreateCirclePdas = {
  circle: PublicKey;
  insurancePool: PublicKey;
  vault: PublicKey;
};

export type DecodedDhukutiEvent = {
  data: Record<string, unknown>;
  eventIndex: number;
  name: string;
};
