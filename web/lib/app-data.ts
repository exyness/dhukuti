import { DHUKUTI_PROGRAM, explorerAddressUrl } from "@/lib/constants";

export const appNavItems = [
  { href: "/circles", label: "Explore Marketplace" },
  { href: "/circles/early-payout-auction", label: "My Circles" },
  { href: "/profile#reputation", label: "Reputation Score" },
  { href: "/profile#contributions", label: "Contribution History" },
] as const;

export type CircleMode = "Fixed order" | "Dutch bid";
export type CircleStatus = "Forming" | "Active" | "Default vote" | "Completed";

export type Circle = {
  collateral: string;
  contribution: string;
  cycle: string;
  deadline: string;
  host: string;
  id: string;
  insurance: string;
  memberCap: number;
  members: number;
  minReputation: number;
  mode: CircleMode;
  name: string;
  nextAction: string;
  nextPayout: string;
  pot: string;
  progress: number;
  round: string;
  status: CircleStatus;
};

export const circles: Circle[] = [
  {
    id: "kathmandu-builders",
    name: "Kathmandu Builder Circle",
    host: "superteam_nepal",
    contribution: "2.00 SOL",
    collateral: "1.00 SOL",
    pot: "16.00 SOL",
    cycle: "Monthly",
    deadline: "2d 14h",
    memberCap: 8,
    members: 5,
    minReputation: 240,
    mode: "Fixed order",
    nextPayout: "Round 01",
    round: "0 / 8",
    insurance: "0.32 SOL",
    progress: 63,
    status: "Forming",
    nextAction: "Join Circle",
  },
  {
    id: "early-payout-auction",
    name: "Early Payout Auction",
    host: "circle_operator",
    contribution: "1.50 SOL",
    collateral: "0.75 SOL",
    pot: "15.00 SOL",
    cycle: "Weekly",
    deadline: "18h 04m",
    memberCap: 10,
    members: 6,
    minReputation: 180,
    mode: "Dutch bid",
    nextPayout: "Bid window",
    round: "2 / 10",
    insurance: "0.45 SOL",
    progress: 60,
    status: "Active",
    nextAction: "Place Bid",
  },
  {
    id: "pokhara-savings-coop",
    name: "Pokhara Savings Coop",
    host: "pokhara_coop",
    contribution: "0.80 SOL",
    collateral: "0.40 SOL",
    pot: "9.60 SOL",
    cycle: "Biweekly",
    deadline: "4d 01h",
    memberCap: 12,
    members: 9,
    minReputation: 80,
    mode: "Fixed order",
    nextPayout: "Round 03",
    round: "2 / 12",
    insurance: "0.28 SOL",
    progress: 75,
    status: "Active",
    nextAction: "Contribute",
  },
  {
    id: "validator-ops",
    name: "Validator Ops Dhukuti",
    host: "solana_ops",
    contribution: "5.00 SOL",
    collateral: "2.50 SOL",
    pot: "30.00 SOL",
    cycle: "Monthly",
    deadline: "1d 08h",
    memberCap: 6,
    members: 6,
    minReputation: 520,
    mode: "Dutch bid",
    nextPayout: "Round 04",
    round: "3 / 6",
    insurance: "1.10 SOL",
    progress: 100,
    status: "Default vote",
    nextAction: "Vote Default",
  },
];

export const currentCircle = circles[1];

export const circleMembers = [
  { handle: "8xKX...p2aB", state: "Paid", role: "Host", reputation: 740 },
  { handle: "6dH9...qK2m", state: "Paid", role: "Member", reputation: 622 },
  { handle: "9aV2...Mnt7", state: "Pending", role: "You", reputation: 410 },
  { handle: "Hh3R...92Ls", state: "Paid", role: "Member", reputation: 531 },
  { handle: "4pQn...Yw81", state: "Pending", role: "Member", reputation: 388 },
  { handle: "F3nm...7xVd", state: "Default risk", role: "Member", reputation: 96 },
] as const;

export const payoutSchedule = [
  { round: "01", recipient: "8xKX...p2aB", amount: "15.00 SOL", status: "Completed" },
  { round: "02", recipient: "6dH9...qK2m", amount: "14.55 SOL", status: "Dutch bid settled" },
  { round: "03", recipient: "F3nm...7xVd", amount: "Pending", status: "Default vote" },
  { round: "04", recipient: "9aV2...Mnt7", amount: "15.00 SOL", status: "Upcoming" },
] as const;

export const marketListings = [
  {
    id: "L-2041",
    ask: "3.82 SOL",
    circle: "Early Payout Auction",
    discount: "5.4%",
    round: "Round 06 / 10",
    sellerRep: 740,
    value: "4.04 SOL",
  },
  {
    id: "L-2042",
    ask: "7.45 SOL",
    circle: "Kathmandu Builder Circle",
    discount: "6.8%",
    round: "Round 05 / 8",
    sellerRep: 612,
    value: "8.00 SOL",
  },
  {
    id: "L-2043",
    ask: "27.90 SOL",
    circle: "Validator Ops Dhukuti",
    discount: "7.0%",
    round: "Round 05 / 6",
    sellerRep: 982,
    value: "30.00 SOL",
  },
] as const;

export const profileStats = {
  activeCircles: "3",
  collateralLocked: "4.25 SOL",
  completedCircles: "7",
  contributionVolume: "86.4 SOL",
  hostCompletions: "2",
  memberReputation: "642",
  vouchedStake: "1.20 SOL",
};

export const contributionHistory = [
  { date: "Jul 10, 2026", circle: "Early Payout Auction", amount: "1.50 SOL", status: "Paid" },
  { date: "Jul 03, 2026", circle: "Pokhara Savings Coop", amount: "0.80 SOL", status: "Paid" },
  { date: "Jun 26, 2026", circle: "Early Payout Auction", amount: "1.50 SOL", status: "Paid" },
] as const;

export const programFacts = [
  { label: "Cluster", value: DHUKUTI_PROGRAM.cluster },
  {
    label: "Program",
    value: `${DHUKUTI_PROGRAM.programId.slice(0, 4)}...${DHUKUTI_PROGRAM.programId.slice(-4)}`,
  },
  { label: "Settlement", value: "Native SOL" },
  { label: "SPL / USDC", value: "Planned, not active" },
] as const;

export const programExplorerUrl = explorerAddressUrl(DHUKUTI_PROGRAM.programId);
