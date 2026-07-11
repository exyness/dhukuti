export type CircleMode = "Dutch bid" | "Fixed order" | "VRF lottery";
export type CircleStatus = "Active" | "Completed" | "Default vote" | "Forming";

export type CircleSummary = {
  address: string;
  circleId: string;
  collateral: string;
  collateralBps: number;
  contribution: string;
  contributionLamports: string;
  creator: string;
  currentRoundIndex: number;
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
  active: boolean;
  collateral: string;
  defaulted: boolean;
  handle: string;
  joinOrder: number;
  member: string;
  nextPayout: string;
  positionNftMint: string;
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
  defaultProposal: DefaultProposal | null;
  members: CircleMember[];
  payoutSchedule: PayoutScheduleRow[];
  vouches: CircleVouch[];
};

export type DefaultProposal = {
  approvals: number;
  candidate: string;
  candidateHandle: string;
  graceDeadline: string | null;
  proposal: string;
  rejections: number;
  roundIndex: number;
};

export type CircleVouch = {
  active: boolean;
  candidate: string;
  released: boolean;
  slashed: boolean;
  stake: string;
  vouch: string;
  voucher: string;
};

export type MarketListing = {
  active: boolean;
  ask: string;
  askLamports: string;
  cancelled: boolean;
  circle: string;
  circleAddress: string;
  discount: string;
  id: string;
  listing: string;
  round: string;
  seller: string;
  sellerRep: number;
  sold: boolean;
  positionNftMint: string;
  value: string;
};

export type ProfileStats = {
  activeCircles: string;
  collateralLocked: string;
  completedCircles: string;
  contributionVolume: string;
  discountTier: string;
  defaultedCircles: string;
  hostCompletions: string;
  memberReputation: string;
  vouchesMade: string;
  vouchedStake: string;
};

export type ProfileData = {
  activeCircles: CircleSummary[];
  circleHistory: CircleSummary[];
  listings: MarketListing[];
  positions: ProfilePosition[];
  stats: ProfileStats;
  wallet: string | null;
};

export type ProfilePosition = {
  active: boolean;
  circle: string;
  defaulted: boolean;
  joinOrder: number;
  positionNftMint: string;
};

export type ActivityLogEntry = {
  action: string;
  circle: string | null;
  circleLabel: string | null;
  detail: string;
  eventName: string;
  id: string;
  occurredAt: string | null;
  signature: string;
  slot: string;
};
