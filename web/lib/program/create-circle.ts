import { SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { DHUKUTI_PROGRAM_ID, deriveCreateCirclePdas, NATIVE_SOL_DENOM_MINT } from "./pdas";
import type { CreateCircleInstructionInput, PayoutCurveValue } from "./types";

const CREATE_CIRCLE_DISCRIMINATOR = Uint8Array.from([186, 99, 49, 131, 31, 51, 13, 198]);
export const MAX_CIRCLE_NAME_BYTES = 64;

export function buildCreateCircleInstruction(input: CreateCircleInstructionInput) {
  const pdas = deriveCreateCirclePdas(input.creator, input.circleId);

  return {
    instruction: new TransactionInstruction({
      programId: DHUKUTI_PROGRAM_ID,
      keys: [
        { pubkey: input.creator, isSigner: true, isWritable: true },
        { pubkey: pdas.circle, isSigner: false, isWritable: true },
        { pubkey: pdas.vault, isSigner: false, isWritable: true },
        { pubkey: pdas.insurancePool, isSigner: false, isWritable: true },
        { pubkey: NATIVE_SOL_DENOM_MINT, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: encodeCreateCircleData(input),
    }),
    pdas,
  };
}

export function generateCircleId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const view = new DataView(bytes.buffer);
  return view.getBigUint64(0, true);
}

export function payoutCurveLabel(value: PayoutCurveValue) {
  if (value === "auction") return "Dutch auction";
  if (value === "lottery") return "VRF lottery";
  return "Fixed order";
}

function encodeCreateCircleData(input: CreateCircleInstructionInput) {
  const nameBytes = Buffer.from(input.name.trim(), "utf8");
  if (nameBytes.length === 0 || nameBytes.length > MAX_CIRCLE_NAME_BYTES) {
    throw new Error("Circle name must be 1-64 UTF-8 bytes.");
  }

  const data = Buffer.alloc(52 + nameBytes.length);
  let offset = 0;

  data.set(CREATE_CIRCLE_DISCRIMINATOR, offset);
  offset += CREATE_CIRCLE_DISCRIMINATOR.length;
  data.writeBigUInt64LE(input.circleId, offset);
  offset += 8;
  data.writeUInt32LE(nameBytes.length, offset);
  offset += 4;
  nameBytes.copy(data, offset);
  offset += nameBytes.length;
  data.writeBigUInt64LE(input.contributionLamports, offset);
  offset += 8;
  data.writeBigInt64LE(input.cycleDurationSeconds, offset);
  offset += 8;
  data.writeUInt8(input.maxMembers, offset);
  offset += 1;
  data.writeUInt8(encodePayoutCurve(input.payoutCurve), offset);
  offset += 1;
  data.writeBigUInt64LE(input.minReputation, offset);
  offset += 8;
  data.writeUInt16LE(input.collateralBps, offset);
  offset += 2;
  data.writeUInt16LE(input.insuranceFeeBps, offset);
  offset += 2;
  data.writeUInt16LE(input.reserveRatioBps, offset);

  return data;
}

function encodePayoutCurve(value: PayoutCurveValue) {
  if (value === "auction") return 1;
  if (value === "lottery") return 2;
  return 0;
}
