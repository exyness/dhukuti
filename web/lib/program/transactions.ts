import { BorshInstructionCoder, type Idl } from "@coral-xyz/anchor";
import {
  Keypair,
  type PublicKey,
  type Signer,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import idl from "@/lib/program/dhukuti_program.idl.json";
import {
  DHUKUTI_PROGRAM_ID,
  deriveCircleAssetPdas,
  deriveDefaultProposalPda,
  deriveListingEscrowPda,
  deriveListingPda,
  deriveMembershipPda,
  derivePositionNftPda,
  deriveReputationPda,
  deriveRoundPda,
  deriveVouchPda,
  SPL_TOKEN_PROGRAM_ID,
} from "./pdas";

const instructionCoder = new BorshInstructionCoder(idl as Idl);

export type CircleInstructionContext = {
  circle: PublicKey;
  circleId: bigint;
  creator: PublicKey;
  currentRoundIndex: number;
};

export type ProgramInstructionBundle = {
  instruction: TransactionInstruction;
  signers?: Signer[];
};

export type ActiveMembershipAccount = {
  member: PublicKey;
  membership: PublicKey;
};

export function buildJoinCircleInstruction({
  circle,
  member,
  minReputation,
}: {
  circle: PublicKey;
  member: PublicKey;
  minReputation: bigint;
}): ProgramInstructionBundle & { memberTokenAccount: PublicKey; positionNftMint: PublicKey } {
  const { vault } = deriveCircleAssetPdas(circle);
  const membership = deriveMembershipPda(circle, member);
  const positionNftMint = derivePositionNftPda(circle, member);
  const memberTokenAccount = Keypair.generate();
  const reputation = minReputation > 0n ? deriveReputationPda(member) : DHUKUTI_PROGRAM_ID;

  return {
    instruction: buildInstruction("join_circle", {}, [
      writableSigner(member),
      writable(circle),
      writable(vault),
      writable(membership),
      writable(positionNftMint),
      writableSigner(memberTokenAccount.publicKey),
      readonly(SPL_TOKEN_PROGRAM_ID),
      readonly(SystemProgram.programId),
      readonly(SYSVAR_RENT_PUBKEY),
      readonly(reputation),
    ]),
    memberTokenAccount: memberTokenAccount.publicKey,
    positionNftMint,
    signers: [memberTokenAccount],
  };
}

export function buildStartCircleInstruction({
  circle,
  creator,
}: Pick<CircleInstructionContext, "circle" | "creator">): ProgramInstructionBundle {
  return {
    instruction: buildInstruction("start_circle", {}, [
      writableSigner(creator),
      writable(circle),
      writable(deriveRoundPda(circle, 0)),
      readonly(SystemProgram.programId),
    ]),
  };
}

export function buildContributeInstruction({
  circle,
  currentRoundIndex,
  member,
}: Pick<CircleInstructionContext, "circle" | "currentRoundIndex"> & {
  member: PublicKey;
}): ProgramInstructionBundle {
  const { insurancePool, vault } = deriveCircleAssetPdas(circle);

  return {
    instruction: buildInstruction("contribute", {}, [
      writableSigner(member),
      readonly(circle),
      writable(vault),
      writable(insurancePool),
      writable(deriveMembershipPda(circle, member)),
      writable(deriveRoundPda(circle, currentRoundIndex)),
      readonly(SystemProgram.programId),
    ]),
  };
}

export function buildDutchBidInstruction({
  circle,
  currentRoundIndex,
  bidder,
}: Pick<CircleInstructionContext, "circle" | "currentRoundIndex"> & {
  bidder: PublicKey;
}): ProgramInstructionBundle {
  return {
    instruction: buildInstruction("place_dutch_bid", {}, [
      writableSigner(bidder),
      readonly(circle),
      readonly(deriveMembershipPda(circle, bidder)),
      writable(deriveRoundPda(circle, currentRoundIndex)),
    ]),
  };
}

export function buildOpenDefaultProposalInstruction({
  circle,
  currentRoundIndex,
  defaultingMember,
  proposer,
}: Pick<CircleInstructionContext, "circle" | "currentRoundIndex"> & {
  defaultingMember: PublicKey;
  proposer: PublicKey;
}): ProgramInstructionBundle {
  const round = deriveRoundPda(circle, currentRoundIndex);

  return {
    instruction: buildInstruction("open_default_proposal", {}, [
      writableSigner(proposer),
      readonly(circle),
      readonly(round),
      readonly(defaultingMember),
      readonly(deriveMembershipPda(circle, defaultingMember)),
      readonly(deriveMembershipPda(circle, proposer)),
      writable(deriveDefaultProposalPda(circle, round, defaultingMember)),
      readonly(SystemProgram.programId),
    ]),
  };
}

export function buildVoteDefaultInstruction({
  approve,
  circle,
  defaultingMember,
  currentRoundIndex,
  voter,
}: Pick<CircleInstructionContext, "circle" | "currentRoundIndex"> & {
  approve: boolean;
  defaultingMember: PublicKey;
  voter: PublicKey;
}): ProgramInstructionBundle {
  const round = deriveRoundPda(circle, currentRoundIndex);

  return {
    instruction: buildInstruction("vote_default", { approve }, [
      readonlySigner(voter),
      readonly(circle),
      readonly(deriveMembershipPda(circle, voter)),
      writable(deriveDefaultProposalPda(circle, round, defaultingMember)),
    ]),
  };
}

export function buildHandleDefaultInstruction({
  circle,
  currentRoundIndex,
  cranker,
  defaultingMember,
}: Pick<CircleInstructionContext, "circle" | "currentRoundIndex"> & {
  cranker: PublicKey;
  defaultingMember: PublicKey;
}): ProgramInstructionBundle {
  const { insurancePool, vault } = deriveCircleAssetPdas(circle);
  const round = deriveRoundPda(circle, currentRoundIndex);

  return {
    instruction: buildInstruction("handle_default", {}, [
      readonlySigner(cranker),
      writable(circle),
      writable(vault),
      writable(insurancePool),
      writable(round),
      writable(deriveMembershipPda(circle, defaultingMember)),
      readonly(defaultingMember),
      writable(deriveDefaultProposalPda(circle, round, defaultingMember)),
    ]),
  };
}

export function buildResolveRoundInstruction({
  activeMemberships,
  circle,
  currentRoundIndex,
  cranker,
  recipient,
}: Pick<CircleInstructionContext, "circle" | "currentRoundIndex"> & {
  activeMemberships: ActiveMembershipAccount[];
  cranker: PublicKey;
  recipient: PublicKey;
}): ProgramInstructionBundle {
  const { insurancePool, vault } = deriveCircleAssetPdas(circle);
  const nextRoundIndex = currentRoundIndex + 1;
  const remainingAccounts = activeMemberships
    .filter((member) => !member.member.equals(recipient))
    .flatMap((member) => [writable(member.member), readonly(member.membership)]);

  return {
    instruction: buildInstruction("resolve_round", { nextRoundIndex }, [
      writableSigner(cranker),
      writable(circle),
      writable(vault),
      writable(insurancePool),
      writable(deriveRoundPda(circle, currentRoundIndex)),
      writable(recipient),
      readonly(deriveMembershipPda(circle, recipient)),
      writable(deriveRoundPda(circle, nextRoundIndex)),
      readonly(SystemProgram.programId),
      ...remainingAccounts,
    ]),
  };
}

export function buildCompleteCircleInstruction({
  activeMemberships,
  circle,
  creator,
}: Pick<CircleInstructionContext, "circle" | "creator"> & {
  activeMemberships: ActiveMembershipAccount[];
}): ProgramInstructionBundle {
  const { vault } = deriveCircleAssetPdas(circle);
  const memberAccounts = activeMemberships.flatMap((member) => [
    writable(member.member),
    readonly(member.membership),
  ]);

  return {
    instruction: buildInstruction("complete_circle", {}, [
      writableSigner(creator),
      writable(circle),
      writable(vault),
      readonly(SystemProgram.programId),
      ...memberAccounts,
    ]),
  };
}

export function buildVouchMemberInstruction({
  candidate,
  circle,
  stakeLamports,
  voucher,
}: {
  candidate: PublicKey;
  circle: PublicKey;
  stakeLamports: bigint;
  voucher: PublicKey;
}): ProgramInstructionBundle {
  return {
    instruction: buildInstruction("vouch_member", { stakeLamports }, [
      writableSigner(voucher),
      readonly(candidate),
      readonly(circle),
      readonly(deriveMembershipPda(circle, voucher)),
      readonly(deriveMembershipPda(circle, candidate)),
      writable(deriveVouchPda(circle, voucher, candidate)),
      writable(deriveReputationPda(voucher)),
      readonly(SystemProgram.programId),
    ]),
  };
}

export function buildReleaseVouchInstruction({
  candidate,
  circle,
  voucher,
}: {
  candidate: PublicKey;
  circle: PublicKey;
  voucher: PublicKey;
}): ProgramInstructionBundle {
  return {
    instruction: buildInstruction("release_vouch", {}, [
      writableSigner(voucher),
      readonly(candidate),
      readonly(circle),
      readonly(deriveMembershipPda(circle, candidate)),
      writable(deriveVouchPda(circle, voucher, candidate)),
      writable(deriveReputationPda(voucher)),
      readonly(SystemProgram.programId),
    ]),
  };
}

export function buildSlashVouchInstruction({
  candidate,
  circle,
  cranker,
  voucher,
}: {
  candidate: PublicKey;
  circle: PublicKey;
  cranker: PublicKey;
  voucher: PublicKey;
}): ProgramInstructionBundle {
  const { insurancePool } = deriveCircleAssetPdas(circle);

  return {
    instruction: buildInstruction("slash_vouch", {}, [
      writableSigner(cranker),
      readonly(circle),
      writable(insurancePool),
      readonly(deriveMembershipPda(circle, candidate)),
      writable(deriveVouchPda(circle, voucher, candidate)),
      writable(deriveReputationPda(voucher)),
      readonly(SystemProgram.programId),
    ]),
  };
}

export function buildListPositionInstruction({
  askPrice,
  circle,
  positionNftMint,
  seller,
  sellerPositionTokenAccount,
}: {
  askPrice: bigint;
  circle: PublicKey;
  positionNftMint: PublicKey;
  seller: PublicKey;
  sellerPositionTokenAccount: PublicKey;
}): ProgramInstructionBundle {
  const membership = deriveMembershipPda(circle, seller);
  const listing = deriveListingPda(circle, membership);

  return {
    instruction: buildInstruction("list_position", { askPrice }, [
      writableSigner(seller),
      readonly(circle),
      readonly(membership),
      readonly(positionNftMint),
      writable(sellerPositionTokenAccount),
      writable(listing),
      writable(deriveListingEscrowPda(listing)),
      readonly(SPL_TOKEN_PROGRAM_ID),
      readonly(SystemProgram.programId),
      readonly(SYSVAR_RENT_PUBKEY),
    ]),
  };
}

export function buildCancelListingInstruction({
  circle,
  listing,
  positionNftMint,
  seller,
  sellerPositionTokenAccount,
}: {
  circle: PublicKey;
  listing: PublicKey;
  positionNftMint: PublicKey;
  seller: PublicKey;
  sellerPositionTokenAccount: PublicKey;
}): ProgramInstructionBundle {
  const membership = deriveMembershipPda(circle, seller);

  return {
    instruction: buildInstruction("cancel_listing", {}, [
      writableSigner(seller),
      readonly(circle),
      readonly(membership),
      writable(listing),
      readonly(positionNftMint),
      writable(deriveListingEscrowPda(listing)),
      writable(sellerPositionTokenAccount),
      readonly(SPL_TOKEN_PROGRAM_ID),
    ]),
  };
}

export function buildBuyPositionInstruction({
  buyer,
  circle,
  listing,
  positionNftMint,
  seller,
}: {
  buyer: PublicKey;
  circle: PublicKey;
  listing: PublicKey;
  positionNftMint: PublicKey;
  seller: PublicKey;
}): ProgramInstructionBundle & { buyerPositionTokenAccount: PublicKey } {
  const sellerMembership = deriveMembershipPda(circle, seller);
  const buyerMembership = deriveMembershipPda(circle, buyer);
  const buyerPositionTokenAccount = Keypair.generate();

  return {
    buyerPositionTokenAccount: buyerPositionTokenAccount.publicKey,
    instruction: buildInstruction("buy_position", {}, [
      writableSigner(buyer),
      writable(seller),
      readonly(circle),
      writable(sellerMembership),
      writable(listing),
      writable(buyerMembership),
      readonly(positionNftMint),
      writable(deriveListingEscrowPda(listing)),
      writableSigner(buyerPositionTokenAccount.publicKey),
      readonly(SPL_TOKEN_PROGRAM_ID),
      readonly(SystemProgram.programId),
      readonly(SYSVAR_RENT_PUBKEY),
    ]),
    signers: [buyerPositionTokenAccount],
  };
}

export function buildUpdateReputationInstruction({
  circle,
  cranker,
  event,
  wallet,
}: {
  circle: PublicKey;
  cranker: PublicKey;
  event: "CircleCompleted" | "CircleDefaulted";
  wallet: PublicKey;
}): ProgramInstructionBundle {
  return {
    instruction: buildInstruction("update_reputation", { event: { [event]: {} } }, [
      writableSigner(cranker),
      readonly(wallet),
      writable(deriveReputationPda(wallet)),
      readonly(circle),
      writable(deriveMembershipPda(circle, wallet)),
      readonly(SystemProgram.programId),
    ]),
  };
}

export function buildClaimHostReputationInstruction({
  circle,
  cranker,
  host,
}: {
  circle: PublicKey;
  cranker: PublicKey;
  host: PublicKey;
}): ProgramInstructionBundle {
  return {
    instruction: buildInstruction("claim_host_reputation", {}, [
      writableSigner(cranker),
      readonly(host),
      writable(deriveReputationPda(host)),
      writable(circle),
      readonly(SystemProgram.programId),
    ]),
  };
}

function buildInstruction(
  name: string,
  args: Record<string, unknown>,
  keys: TransactionInstruction["keys"],
) {
  const data = instructionCoder.encode(name, args);
  if (!data) {
    throw new Error(`Unable to encode ${name}.`);
  }

  return new TransactionInstruction({ data, keys, programId: DHUKUTI_PROGRAM_ID });
}

function readonly(pubkey: PublicKey) {
  return { isSigner: false, isWritable: false, pubkey };
}

function readonlySigner(pubkey: PublicKey) {
  return { isSigner: true, isWritable: false, pubkey };
}

function writable(pubkey: PublicKey) {
  return { isSigner: false, isWritable: true, pubkey };
}

function writableSigner(pubkey: PublicKey) {
  return { isSigner: true, isWritable: true, pubkey };
}
