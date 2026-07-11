import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Buffer } from "buffer";
import { DHUKUTI_PROGRAM } from "@/lib/constants";
import type { CreateCirclePdas } from "@/lib/program/types";

export const DHUKUTI_PROGRAM_ID = new PublicKey(DHUKUTI_PROGRAM.programId);
export const SPL_TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const CIRCLE_ACCOUNT_SPACE = 277;
export const INSURANCE_POOL_ACCOUNT_SPACE = 59;
export const NATIVE_SOL_DENOM_MINT = SystemProgram.programId;

export const SEED_CIRCLE = encodeSeed("circle");
export const SEED_VAULT = encodeSeed("vault");
export const SEED_INSURANCE = encodeSeed("insurance");
export const SEED_MEMBERSHIP = encodeSeed("membership");
export const SEED_ROUND = encodeSeed("round");
export const SEED_REPUTATION = encodeSeed("reputation");
export const SEED_POSITION_NFT = encodeSeed("position_nft");
export const SEED_LISTING = encodeSeed("listing");
export const SEED_LISTING_ESCROW = encodeSeed("listing_escrow");
export const SEED_VOUCH = encodeSeed("vouch");
export const SEED_DEFAULT_PROPOSAL = encodeSeed("default_proposal");

export function deriveCreateCirclePdas(creator: PublicKey, circleId: bigint): CreateCirclePdas {
  const circleIdSeed = u64Le(circleId);
  const [circle] = PublicKey.findProgramAddressSync(
    [SEED_CIRCLE, creator.toBuffer(), circleIdSeed],
    DHUKUTI_PROGRAM_ID,
  );
  const [vault] = PublicKey.findProgramAddressSync(
    [SEED_VAULT, circle.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  );
  const [insurancePool] = PublicKey.findProgramAddressSync(
    [SEED_INSURANCE, circle.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  );

  return { circle, insurancePool, vault };
}

export function deriveMembershipPda(circle: PublicKey, member: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SEED_MEMBERSHIP, circle.toBuffer(), member.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  )[0];
}

export function derivePositionNftPda(circle: PublicKey, member: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SEED_POSITION_NFT, circle.toBuffer(), member.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  )[0];
}

export function deriveListingPda(circle: PublicKey, membership: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SEED_LISTING, circle.toBuffer(), membership.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  )[0];
}

export function deriveListingEscrowPda(listing: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SEED_LISTING_ESCROW, listing.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  )[0];
}

export function deriveVouchPda(circle: PublicKey, voucher: PublicKey, candidate: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SEED_VOUCH, circle.toBuffer(), voucher.toBuffer(), candidate.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  )[0];
}

export function deriveDefaultProposalPda(
  circle: PublicKey,
  round: PublicKey,
  defaultingMember: PublicKey,
) {
  return PublicKey.findProgramAddressSync(
    [SEED_DEFAULT_PROPOSAL, circle.toBuffer(), round.toBuffer(), defaultingMember.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  )[0];
}

export function deriveCircleAssetPdas(circle: PublicKey) {
  const [vault] = PublicKey.findProgramAddressSync(
    [SEED_VAULT, circle.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  );
  const [insurancePool] = PublicKey.findProgramAddressSync(
    [SEED_INSURANCE, circle.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  );

  return { insurancePool, vault };
}

export function deriveRoundPda(circle: PublicKey, roundIndex: number) {
  return PublicKey.findProgramAddressSync(
    [SEED_ROUND, circle.toBuffer(), u16Le(roundIndex)],
    DHUKUTI_PROGRAM_ID,
  )[0];
}

export function deriveReputationPda(wallet: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [SEED_REPUTATION, wallet.toBuffer()],
    DHUKUTI_PROGRAM_ID,
  )[0];
}

export function u16Le(value: number) {
  const bytes = Buffer.alloc(2);
  bytes.writeUInt16LE(value);
  return bytes;
}

export function u64Le(value: bigint) {
  const bytes = Buffer.alloc(8);
  bytes.writeBigUInt64LE(value);
  return bytes;
}

function encodeSeed(value: string) {
  return new TextEncoder().encode(value);
}
