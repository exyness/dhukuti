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
  return formatLamports(collateral.toString(), 6);
}

export function formatPot(contributionAmount: string, members: number) {
  return formatLamports((BigInt(contributionAmount) * BigInt(members)).toString(), 6);
}

export function formatCycle(seconds: number) {
  const day = 24 * 60 * 60;
  const hour = 60 * 60;
  const minute = 60;

  if (seconds > 0 && seconds < hour) {
    const minutes = Math.max(1, Math.round(seconds / minute));
    return `${minutes} min`;
  }

  if (seconds > 0 && seconds < day) {
    const hours = seconds / hour;
    if (hours === 1) return "Hourly";
    return Number.isInteger(hours) ? `${hours} hours` : `${Math.round(seconds / minute)} min`;
  }

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
