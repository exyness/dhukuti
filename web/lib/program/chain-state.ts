import { BorshAccountsCoder, type Idl } from "@coral-xyz/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";
import idl from "@/lib/program/dhukuti_program.idl.json";
import { deriveRoundPda } from "./pdas";

const accountCoder = new BorshAccountsCoder(idl as Idl);

export type DecodedRoundState = {
  auctionWinner: string | null;
  currentDiscountBps: number;
  deadlineAt: Date;
  index: number;
  resolved: boolean;
};

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
    auctionDiscountBps: number;
    auctionWinner: PublicKey | null;
    deadlineTs: bigint | number;
    index: number;
    resolved: boolean;
  };

  return {
    auctionWinner: decoded.auctionWinner?.toBase58() ?? null,
    currentDiscountBps: Number(decoded.auctionDiscountBps),
    deadlineAt: new Date(Number(decoded.deadlineTs) * 1000),
    index: Number(decoded.index),
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
