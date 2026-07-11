export type Json = boolean | null | number | string | Json[] | { [key: string]: Json };

export type NumericValue = number | string;

export type DhukutiCircleRow = {
  circle: string;
  circle_id: NumericValue;
  collateral_bps: number;
  completed_at: string | null;
  contribution_amount: NumericValue;
  creator: string;
  cycle_duration_seconds: NumericValue;
  insurance_fee_bps: number;
  last_signature: string;
  last_slot: number;
  max_members: number;
  min_reputation: NumericValue;
  payout_curve: string;
  reserve_ratio_bps: number;
  started_at: string | null;
  status: string;
  updated_at: string;
};

export type DhukutiMembershipRow = {
  active: boolean;
  circle: string;
  collateral_deposited: NumericValue;
  defaulted: boolean;
  join_order: number;
  last_signature: string;
  last_slot: number;
  member: string;
  position_nft_mint: string;
  updated_at: string;
};

export type DhukutiRoundRow = {
  circle: string;
  deadline_ts: string | null;
  insurance_share: NumericValue;
  last_signature: string;
  last_slot: number;
  member_discount_share: NumericValue;
  payout: NumericValue | null;
  recipient: string | null;
  resolved: boolean;
  round: string;
  round_index: number;
  updated_at: string;
};

export type DhukutiContributionRow = {
  circle: string;
  contribution_amount: NumericValue;
  created_at: string;
  insurance_fee: NumericValue;
  member: string;
  net_to_pot: NumericValue;
  round: string;
  round_index: number;
  signature: string;
  slot: number;
};

export type DhukutiListingRow = {
  active: boolean;
  ask_price: NumericValue;
  buyer: string | null;
  cancelled: boolean;
  circle: string;
  join_order: number | null;
  last_signature: string;
  last_slot: number;
  listing: string;
  position_nft_mint: string;
  seller: string;
  sold: boolean;
  updated_at: string;
};

export type DhukutiReputationRow = {
  circles_completed: number;
  circles_defaulted: number;
  circles_hosted: number;
  discount_tier: number;
  hosted_default_events: number;
  last_signature: string;
  last_slot: number;
  score: NumericValue;
  updated_at: string;
  vouch_stake_slashed: NumericValue;
  vouches_honored: number;
  vouches_made: number;
  vouches_slashed: number;
  wallet: string;
};

export type DhukutiEventLogInsert = {
  block_time: string | null;
  circle: string | null;
  event_index: number;
  event_name: string;
  payload: Json;
  program_id: string;
  signature: string;
  slot: number;
  wallet: string | null;
};
