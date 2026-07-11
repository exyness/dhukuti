import { formatLamports, lamportsToSol } from "@/lib/program";

const BPS_DENOMINATOR = BigInt(10_000);

export function toInteger(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number.parseInt(value, 10) || 0;
}

export function toBigIntString(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "0";
  return typeof value === "number" ? String(value) : value;
}

export function formatBasisPoints(bps: number) {
  return `${formatPercent(bps / 100)}%`;
}

export function formatCollateral(contributionAmount: string, collateralBps: number) {
  const collateral = (BigInt(contributionAmount) * BigInt(collateralBps)) / BPS_DENOMINATOR;
  return formatLamports(collateral.toString());
}

export function formatPot(contributionAmount: string, members: number) {
  return formatLamports((BigInt(contributionAmount) * BigInt(members)).toString());
}

export function formatCycle(seconds: number) {
  const day = 24 * 60 * 60;
  if (seconds === 7 * day) return "Weekly";
  if (seconds === 30 * day) return "Monthly";
  if (seconds === 90 * day) return "Quarterly";
  if (seconds > 0 && seconds % day === 0) return `${seconds / day} days`;
  return seconds > 0 ? `${seconds}s` : "Not indexed";
}

export function formatDeadline(value: string | null | undefined) {
  if (!value) return "Not started";

  const deadline = new Date(value).getTime();
  const diffMs = deadline - Date.now();
  if (diffMs <= 0) return "Past due";

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function shortAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatSolValue(lamports: number | string) {
  return `${lamportsToSol(lamports)} SOL`;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}
