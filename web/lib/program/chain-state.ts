import { BorshAccountsCoder, type Idl } from "@coral-xyz/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";
import idl from "@/lib/program/dhukuti_program.idl.json";
import { deriveMembershipPda, deriveRoundPda } from "./pdas";

const accountCoder = new BorshAccountsCoder(idl as Idl);

export type DecodedRoundState = {
  auctionWinner: string | null;
  contributionsBitmap: bigint;
  currentDiscountBps: number;
  deadlineAt: Date;
  index: number;
  potTotalLamports: bigint;
  resolved: boolean;
};

export type DecodedCircleState = {
  activeMembersBitmap: bigint;
  currentMembers: number;
  currentRoundIndex: number;
  hostReputationClaimed: boolean;
};

export type DecodedMembershipState = {
  active: boolean;
  completionReputationClaimed: boolean;
  defaultReputationClaimed: boolean;
  roundsMissed: number;
};

export async function fetchCircleState(
  connection: Connection,
  circle: PublicKey,
): Promise<DecodedCircleState> {
  const account = await connection.getAccountInfo(circle, "confirmed");
  if (!account) {
    throw new Error("This circle account was not found on devnet. Refresh and try again.");
  }

  const decoded = (await accountCoder.decode("Circle", account.data)) as {
    active_members_bitmap: AnchorInteger;
    current_members: AnchorInteger;
    current_round: AnchorInteger;
    host_reputation_claimed: boolean;
  };

  return {
    activeMembersBitmap: toBigInt(decoded.active_members_bitmap),
    currentMembers: toNumber(decoded.current_members),
    currentRoundIndex: toNumber(decoded.current_round),
    hostReputationClaimed: decoded.host_reputation_claimed,
  };
}

export async function fetchMembershipState(
  connection: Connection,
  circle: PublicKey,
  wallet: PublicKey,
): Promise<DecodedMembershipState> {
  const account = await connection.getAccountInfo(deriveMembershipPda(circle, wallet), "confirmed");
  if (!account) {
    throw new Error("This wallet does not have a membership account for the circle.");
  }

  const decoded = (await accountCoder.decode("Membership", account.data)) as {
    active: boolean;
    completion_reputation_claimed: boolean;
    default_reputation_claimed: boolean;
    rounds_missed: AnchorInteger;
  };

  return {
    active: decoded.active,
    completionReputationClaimed: decoded.completion_reputation_claimed,
    defaultReputationClaimed: decoded.default_reputation_claimed,
    roundsMissed: toNumber(decoded.rounds_missed),
  };
}

export async function fetchRoundState(
  connection: Connection,
  circle: PublicKey,
  roundIndex: number,
): Promise<DecodedRoundState> {
  const account = await connection.getAccountInfo(deriveRoundPda(circle, roundIndex), "confirmed");
  if (!account) {
    throw new Error(
      "The active round account was not found on devnet. Wait for the circle to start.",
    );
  }

  const decoded = (await accountCoder.decode("Round", account.data)) as {
    auction_discount_bps: AnchorInteger;
    auction_winner: PublicKey | null;
    contributions_bitmap: AnchorInteger;
    deadline_ts: AnchorInteger;
    index: AnchorInteger;
    pot_total: AnchorInteger;
    resolved: boolean;
  };

  return {
    auctionWinner: decoded.auction_winner?.toBase58() ?? null,
    contributionsBitmap: toBigInt(decoded.contributions_bitmap),
    currentDiscountBps: toNumber(decoded.auction_discount_bps),
    deadlineAt: new Date(toNumber(decoded.deadline_ts) * 1000),
    index: toNumber(decoded.index),
    potTotalLamports: toBigInt(decoded.pot_total),
    resolved: decoded.resolved,
  };
}

export async function findPositionTokenAccount(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
) {
  const accounts = await connection.getTokenAccountsByOwner(owner, { mint }, "confirmed");
  const tokenAccount = accounts.value[0]?.pubkey;
  if (!tokenAccount) {
    throw new Error("No position token account was found for this wallet and payout position.");
  }

  return tokenAccount;
}

type AnchorInteger = bigint | number | string | { toString(): string };

function toBigInt(value: AnchorInteger) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  return BigInt(value.toString());
}

function toNumber(value: AnchorInteger) {
  return Number(toBigInt(value));
}
