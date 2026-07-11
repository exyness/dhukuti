use anchor_lang::prelude::*;

use crate::state::PayoutCurve;

/// Indexer contract for off-chain read models.
///
/// Every event below is intentionally append-only data that can be decoded from
/// Anchor program logs and projected into Supabase or another analytics store.
/// Keep field names stable; add new fields through new events when a breaking
/// frontend/indexer migration would be required.

#[event]
pub struct CircleCreatedEvent {
    pub circle: Pubkey,
    pub creator: Pubkey,
    pub circle_id: u64,
    pub contribution_amount: u64,
    pub cycle_duration: i64,
    pub max_members: u8,
    pub payout_curve: PayoutCurve,
    pub collateral_bps: u16,
    pub insurance_fee_bps: u16,
    pub reserve_ratio_bps: u16,
    pub min_reputation: u64,
}

#[event]
pub struct CircleNamedEvent {
    pub circle: Pubkey,
    pub creator: Pubkey,
    pub name: String,
}

#[event]
pub struct MemberJoinedEvent {
    pub circle: Pubkey,
    pub member: Pubkey,
    pub join_order: u8,
    pub collateral_deposited: u64,
    pub position_nft_mint: Pubkey,
}

#[event]
pub struct CircleStartedEvent {
    pub circle: Pubkey,
    pub creator: Pubkey,
    pub member_count: u8,
    pub first_round: Pubkey,
    pub deadline_ts: i64,
}

#[event]
pub struct ContributionMadeEvent {
    pub circle: Pubkey,
    pub round: Pubkey,
    pub member: Pubkey,
    pub round_index: u16,
    pub contribution_amount: u64,
    pub insurance_fee: u64,
    pub net_to_pot: u64,
}

#[event]
pub struct DefaultHandledEvent {
    pub circle: Pubkey,
    pub round: Pubkey,
    pub member: Pubkey,
    pub round_index: u16,
    pub collateral_slashed: u64,
    pub insurance_backstop: u64,
    pub haircut: u64,
}

#[event]
pub struct DefaultProposalOpenedEvent {
    pub circle: Pubkey,
    pub round: Pubkey,
    pub proposal: Pubkey,
    pub proposer: Pubkey,
    pub member: Pubkey,
    pub round_index: u16,
    pub grace_deadline_ts: i64,
}

#[event]
pub struct DefaultVoteCastEvent {
    pub circle: Pubkey,
    pub round: Pubkey,
    pub proposal: Pubkey,
    pub voter: Pubkey,
    pub member: Pubkey,
    pub round_index: u16,
    pub approve: bool,
    pub approvals_bitmap: u64,
    pub rejections_bitmap: u64,
}

#[event]
pub struct RoundResolvedEvent {
    pub circle: Pubkey,
    pub round: Pubkey,
    pub round_index: u16,
    pub recipient: Pubkey,
    pub payout: u64,
    pub insurance_share: u64,
    pub member_discount_share: u64,
}

#[event]
pub struct CircleCompletedEvent {
    pub circle: Pubkey,
    pub creator: Pubkey,
    pub residual_lamports: u64,
}

#[event]
pub struct ReputationUpdatedEvent {
    pub wallet: Pubkey,
    pub score: u64,
    pub discount_tier: u8,
    pub circles_completed: u32,
    pub circles_defaulted: u32,
    pub circles_hosted: u32,
    pub hosted_default_events: u32,
    pub vouches_made: u32,
    pub vouches_honored: u32,
    pub vouches_slashed: u32,
    pub vouch_stake_slashed: u64,
}

#[event]
pub struct VouchCreatedEvent {
    pub circle: Pubkey,
    pub vouch: Pubkey,
    pub voucher: Pubkey,
    pub candidate: Pubkey,
    pub stake_lamports: u64,
}

#[event]
pub struct VouchReleasedEvent {
    pub circle: Pubkey,
    pub vouch: Pubkey,
    pub voucher: Pubkey,
    pub candidate: Pubkey,
    pub stake_lamports: u64,
}

#[event]
pub struct VouchSlashedEvent {
    pub circle: Pubkey,
    pub vouch: Pubkey,
    pub voucher: Pubkey,
    pub candidate: Pubkey,
    pub stake_lamports: u64,
}

#[event]
pub struct PositionListedEvent {
    pub circle: Pubkey,
    pub listing: Pubkey,
    pub seller: Pubkey,
    pub position_nft_mint: Pubkey,
    pub ask_price: u64,
}

#[event]
pub struct ListingCancelledEvent {
    pub circle: Pubkey,
    pub listing: Pubkey,
    pub seller: Pubkey,
    pub position_nft_mint: Pubkey,
}

#[event]
pub struct PositionBoughtEvent {
    pub circle: Pubkey,
    pub listing: Pubkey,
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub position_nft_mint: Pubkey,
    pub ask_price: u64,
    pub join_order: u8,
}

#[event]
pub struct DutchBidAcceptedEvent {
    pub circle: Pubkey,
    pub round: Pubkey,
    pub bidder: Pubkey,
    pub round_index: u16,
    pub discount_bps: u16,
}
