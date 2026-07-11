import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const ZERO_BIGINT = BigInt(0);
const BPS_DENOMINATOR = BigInt(10_000);

export function solToLamports(value: string) {
  const normalized = value.trim();
  if (!/^\d+(\.\d{0,9})?$/.test(normalized)) {
    throw new Error("Enter a SOL amount with up to 9 decimal places.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * BigInt(LAMPORTS_PER_SOL) + BigInt(fraction.padEnd(9, "0"));
}

export function lamportsToSol(lamports: bigint | number | string) {
  const value = BigInt(lamports);
  const whole = value / BigInt(LAMPORTS_PER_SOL);
  const fraction = value % BigInt(LAMPORTS_PER_SOL);
  const fractionText = fraction.toString().padStart(9, "0").replace(/0+$/, "");
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

export function formatLamports(lamports: bigint | number | string, maxFractionDigits = 2) {
  return `${formatSolNumber(Number(lamportsToSol(lamports)), maxFractionDigits)} SOL`;
}

export function collateralBpsFromAmounts(collateralLamports: bigint, contributionLamports: bigint) {
  if (contributionLamports <= ZERO_BIGINT) {
    throw new Error("Contribution amount must be greater than zero.");
  }

  const bps = Number((collateralLamports * BPS_DENOMINATOR) / contributionLamports);
  if (!Number.isSafeInteger(bps) || bps < 0 || bps > 65_535) {
    throw new Error("Collateral ratio is outside the program range.");
  }

  return bps;
}

function formatSolNumber(value: number, maxFractionDigits: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: value >= 1 ? 2 : 0,
  }).format(value);
}
