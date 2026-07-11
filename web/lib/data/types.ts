export type CircleMode = "Dutch bid" | "Fixed order" | "VRF lottery";
export type CircleStatus = "Active" | "Completed" | "Default vote" | "Forming";

export type CircleSummary = {
  address: string;
  collateral: string;
  collateralBps: number;
  contribution: string;
  contributionLamports: string;
  creator: string;
  cycle: string;
  cycleDurationSeconds: number;
  deadline: string;
  deadlineAt: string | null;
  id: string;
  insurance: string;
  insuranceFeeBps: number;
  memberCap: number;
  members: number;
  minReputation: number;
  mode: CircleMode;
  name: string;
  nextAction: string;
  nextPayout: string;
  pot: string;
  progress: number;
  reserveRatioBps: number;
  round: string;
  status: CircleStatus;
  updatedAt: string;
};

export type CircleMember = {
  collateral: string;
  handle: string;
  member: string;
  nextPayout: string;
  reputation: number;
  role: string;
  state: string;
  summary: string;
  vouch: string;
};

export type PayoutScheduleRow = {
  amount: string;
  recipient: string;
  round: string;
  status: string;
};

export type CircleDetail = {
  circle: CircleSummary;
  members: CircleMember[];
  payoutSchedule: PayoutScheduleRow[];
};

export type MarketListing = {
  ask: string;
  askLamports: string;
  circle: string;
  circleAddress: string;
  discount: string;
  id: string;
  listing: string;
  round: string;
  seller: string;
  sellerRep: number;
  value: string;
};

export type ContributionHistoryRow = {
  amount: string;
  circle: string;
  date: string;
  signature: string;
  status: string;
};

export type ProfileStats = {
  activeCircles: string;
  collateralLocked: string;
  completedCircles: string;
  contributionVolume: string;
  hostCompletions: string;
  memberReputation: string;
  vouchedStake: string;
};

export type ProfileData = {
  activeCircles: CircleSummary[];
  contributionHistory: ContributionHistoryRow[];
  listings: MarketListing[];
  stats: ProfileStats;
  wallet: string | null;
};
