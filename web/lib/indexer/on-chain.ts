import "server-only";

import { BorshAccountsCoder, type Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "@/lib/program/dhukuti_program.idl.json";
import { deriveRoundPda } from "@/lib/program/pdas";
import { fetchSolanaAccountInfo } from "./helius";

const accountCoder = new BorshAccountsCoder(idl as Idl);

export type RoundAccountSnapshot = {
  circle: string;
  deadlineTs: number;
  index: number;
  recipient: string | null;
  resolved: boolean;
  round: string;
};

export async function fetchRoundAccountSnapshot(
  circleAddress: string,
  roundIndex: number,
): Promise<RoundAccountSnapshot | null> {
  const circle = new PublicKey(circleAddress);
  const round = deriveRoundPda(circle, roundIndex);
  const account = await fetchSolanaAccountInfo(round.toBase58());
  if (!account) return null;

  const [encodedData] = account.data;
  if (!encodedData) return null;

  const decoded = (await accountCoder.decode("Round", Buffer.from(encodedData, "base64"))) as {
    circle: PublicKey;
    deadline_ts: AnchorInteger;
    index: AnchorInteger;
    recipient: PublicKey | null;
    resolved: boolean;
  };
  const decodedCircle = decoded.circle.toBase58();
  const decodedIndex = toNumber(decoded.index);

  if (decodedCircle !== circleAddress || decodedIndex !== roundIndex) {
    return null;
  }

  return {
    circle: decodedCircle,
    deadlineTs: toNumber(decoded.deadline_ts),
    index: decodedIndex,
    recipient: decoded.recipient?.toBase58() ?? null,
    resolved: decoded.resolved,
    round: round.toBase58(),
  };
}

type AnchorInteger = bigint | number | string | { toString(): string };

function toNumber(value: AnchorInteger) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return Number(value.toString());
}
