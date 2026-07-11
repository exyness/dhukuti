use anchor_lang::prelude::*;

use crate::constants::MAX_CIRCLE_NAME_BYTES;

// ── Enums ────────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum CircleStatus {
    /// Accepting new members.
    Open,
    /// All members joined; rounds running.
    Active,
    /// All rounds resolved; circle closed.
    Complete,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum PayoutCurve {
    /// Payout order matches join order (round 0 → member 0, etc.).
    FixedOrder,
    /// Descending-price Dutch auction; winner accepts current clearing discount.
    DutchAuction,
    /// Verifiable random selection — account/instruction shape present; logic uses
    /// commit-reveal as interim fallback until Switchboard VRF integration.
    // TODO: integrate Switchboard VRF or ORAO; for now, unimplemented.
    VrfLottery,
}

// ── Circle ───────────────────────────────────────────────────────────────────

/// Central state account for a dhukuti savings circle.
/// PDA seeds: ["circle", creator, circle_id_le_bytes]
#[account]
pub struct Circle {
    /// Wallet that created the circle and has admin rights (start, emergency).
    pub creator: Pubkey,
    /// Monotonically-increasing ID assigned at creation; scopes the PDA per creator.
    pub circle_id: u64,
    /// Human-readable display name chosen by the creator.
    pub name: String,
    /// Lamports each member must contribute every round.
    pub contribution_amount: u64,
    /// Seconds between round opens.
    pub cycle_duration: i64,
    /// Hard cap on members; limited to MAX_MEMBERS (64) for the contribution bitfield.
    pub max_members: u8,
    /// Number of members that have joined so far.
    pub current_members: u8,
    /// SPL mint for contributions. Pubkey::default() signals native SOL.
    pub denom_mint: Pubkey,
    /// Payout ordering strategy.
    pub payout_curve: PayoutCurve,
    /// Round currently in progress (0-indexed).
    pub current_round: u16,
    /// Vault PDA that holds member contributions and collateral.
    pub vault: Pubkey,
    /// Insurance pool PDA receiving contribution fees and covering defaults.
    pub insurance_pool: Pubkey,
    /// Current lifecycle status.
    pub status: CircleStatus,
    /// Minimum reputation score required to join; 0 means no gate.
    pub min_reputation: u64,
    /// Collateral each member locks at join time, in basis points of contribution_amount.
    pub collateral_bps: u16,
    /// Protocol fee routed to the insurance pool per contribution, in basis points.
    pub insurance_fee_bps: u16,
    /// Unix timestamp when the circle was created.
    pub created_at: i64,
    /// Unix timestamp when start_circle was called; None until then.
    pub started_at: Option<i64>,
    /// Bitfield tracking which member slots (by join_order) are still active.
    /// Set when a member joins; cleared by handle_default when a member is ejected.
    /// resolve_round uses this mask instead of current_members to allow rounds to
    /// resolve cleanly after ejections.
    pub active_members_bitmap: u64,
    /// Number of member defaults handled in this circle.
    pub defaults_handled: u16,
    /// Prevents replaying the host reputation claim after completion.
    pub host_reputation_claimed: bool,
    /// Bump for this account's PDA.
    pub bump: u8,
    /// Bump for the vault PDA.
    pub vault_bump: u8,
    /// Bump for the insurance pool PDA.
    pub insurance_bump: u8,
}

impl Circle {
    pub const LEN: usize = 8   // discriminator
        + 32   // creator
        + 8    // circle_id
        + 4 + MAX_CIRCLE_NAME_BYTES // name
        + 8    // contribution_amount
        + 8    // cycle_duration
        + 1    // max_members
        + 1    // current_members
        + 32   // denom_mint
        + 1    // payout_curve
        + 2    // current_round
        + 32   // vault
        + 32   // insurance_pool
        + 1    // status
        + 8    // min_reputation
        + 2    // collateral_bps
        + 2    // insurance_fee_bps
        + 8    // created_at
        + 9    // started_at (Option<i64>)
        + 8    // active_members_bitmap
        + 2    // defaults_handled
        + 1    // host_reputation_claimed
        + 3; // bumps (bump, vault_bump, insurance_bump)
}

// ── Membership ───────────────────────────────────────────────────────────────

/// Per-member state within a circle.
/// PDA seeds: ["membership", circle, member]
#[account]
pub struct Membership {
    /// The circle this membership belongs to.
    pub circle: Pubkey,
    /// The member's wallet.
    pub member: Pubkey,
    /// Zero-indexed join order; determines payout slot in FixedOrder mode.
    pub join_order: u8,
    /// Lamports deposited as collateral and slashable on default.
    pub collateral_deposited: u64,
    /// Bitfield: bit i is set when the member contributed in round i.
    pub contributions_bitmap: u64,
    /// Count of rounds this member missed, incremented by default handling.
    pub rounds_missed: u8,
    /// Mint of the 1-of-1 SPL Position NFT issued to this member at join time.
    /// The NFT represents "right to receive payout in round <join_order> of this circle."
    pub position_nft_mint: Pubkey,
    /// False after the member defaults and is ejected.
    pub active: bool,
    /// Prevents replaying the completion reputation crank for this membership.
    pub completion_reputation_claimed: bool,
    /// Prevents replaying the default reputation crank for this membership.
    pub default_reputation_claimed: bool,
    /// PDA bump.
    pub bump: u8,
}

impl Membership {
    pub const LEN: usize = 8   // discriminator
        + 32   // circle
        + 32   // member
        + 1    // join_order
        + 8    // collateral_deposited
        + 8    // contributions_bitmap
        + 1    // rounds_missed
        + 32   // position_nft_mint
        + 1    // active
        + 1    // completion_reputation_claimed
        + 1    // default_reputation_claimed
        + 1; // bump
}

// ── Round ────────────────────────────────────────────────────────────────────

/// State for a single round within a circle.
/// PDA seeds: ["round", circle, round_index_le_bytes]
#[account]
pub struct Round {
    /// The parent circle.
    pub circle: Pubkey,
    /// Zero-indexed round number.
    pub index: u16,
    /// Bitfield tracking which members (by join_order) have contributed this round.
    pub contributions_bitmap: u64,
    /// Total lamports currently in the pot for this round.
    pub pot_total: u64,
    /// Set when the round is resolved; holds the recipient's wallet pubkey.
    pub recipient: Option<Pubkey>,
    /// Unix timestamp after which missing contributions become default-eligible.
    pub deadline_ts: i64,
    /// Dutch auction winner, if a member accepted the current descending discount.
    pub auction_winner: Option<Pubkey>,
    /// Accepted discount in basis points of pot_total for DutchAuction rounds.
    pub auction_discount_bps: u16,
    /// True once resolve_round has executed successfully.
    pub resolved: bool,
    /// PDA bump.
    pub bump: u8,
}

impl Round {
    pub const LEN: usize = 8   // discriminator
        + 32   // circle
        + 2    // index
        + 8    // contributions_bitmap
        + 8    // pot_total
        + 33   // recipient (Option<Pubkey>)
        + 8    // deadline_ts
        + 33   // auction_winner (Option<Pubkey>)
        + 2    // auction_discount_bps
        + 1    // resolved
        + 1; // bump
}

// ── Reputation ───────────────────────────────────────────────────────────────

/// Protocol-wide credit score for a wallet, accumulated across all circles.
/// Designed to be composable — future protocols can read this PDA via CPI.
/// PDA seeds: ["reputation", wallet]
// TODO: expose via permissionless CPI view function for cross-protocol composability.
#[account]
pub struct Reputation {
    /// The wallet this reputation belongs to.
    pub wallet: Pubkey,
    /// Cumulative reputation score (floor 0; increases on completion, decreases on default).
    pub score: u64,
    /// Total circles successfully completed.
    pub circles_completed: u32,
    /// Total circles where this wallet defaulted.
    pub circles_defaulted: u32,
    /// Total circles this wallet successfully hosted through completion.
    pub circles_hosted: u32,
    /// Total member defaults handled across circles this wallet hosted.
    pub hosted_default_events: u32,
    /// Number of community vouches created by this wallet.
    pub vouches_made: u32,
    /// Number of vouches that completed without the vouched member defaulting.
    pub vouches_honored: u32,
    /// Number of this wallet's vouches that were slashed after member default.
    pub vouches_slashed: u32,
    /// Total vouched stake slashed from this wallet.
    pub vouch_stake_slashed: u64,
    /// Collateral discount tier derived from score (0–3).
    /// tier 0: 0%  (score < 1 000)
    /// tier 1: 5%  (score < 5 000)
    /// tier 2: 10% (score < 10 000)
    /// tier 3: 15% (score >= 10 000)
    pub discount_tier: u8,
    /// PDA bump.
    pub bump: u8,
}

impl Reputation {
    pub const LEN: usize = 8 + 32 + 8 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 8 + 1 + 1;

    pub const SCORE_COMPLETION: u64 = 100;
    pub const SCORE_DEFAULT_PENALTY: u64 = 200;
    pub const SCORE_HOSTED_CIRCLE: u64 = 150;
    pub const SCORE_HOST_NO_DEFAULT_BONUS: u64 = 50;
    pub const SCORE_VOUCH_HONORED: u64 = 25;
    pub const SCORE_VOUCH_SLASH_PENALTY: u64 = 75;

    pub fn recompute_tier(&mut self) {
        self.discount_tier = match self.score {
            s if s >= 10_000 => 3,
            s if s >= 5_000 => 2,
            s if s >= 1_000 => 1,
            _ => 0,
        };
    }
}

/// Community trust stake from an existing member behind another member.
/// PDA seeds: ["vouch", circle, voucher, candidate]
#[account]
pub struct Vouch {
    /// Circle this vouch belongs to.
    pub circle: Pubkey,
    /// Existing member who staked social collateral.
    pub voucher: Pubkey,
    /// Member whose reliability is being vouched for.
    pub candidate: Pubkey,
    /// Lamports locked above this account's rent-exempt reserve.
    pub stake_lamports: u64,
    /// True while the stake can still be released or slashed.
    pub active: bool,
    /// True when the vouch was slashed after candidate default.
    pub slashed: bool,
    /// True when the vouch completed successfully and stake was returned.
    pub released: bool,
    /// Unix timestamp when the vouch was created.
    pub created_at: i64,
    /// PDA bump.
    pub bump: u8,
}

impl Vouch {
    pub const LEN: usize = 8   // discriminator
        + 32   // circle
        + 32   // voucher
        + 32   // candidate
        + 8    // stake_lamports
        + 1    // active
        + 1    // slashed
        + 1    // released
        + 8    // created_at
        + 1; // bump
}

/// Member-governed default proposal opened after a round deadline is missed.
/// PDA seeds: ["default_proposal", circle, round, member]
#[account]
pub struct DefaultProposal {
    /// Circle this proposal belongs to.
    pub circle: Pubkey,
    /// Round where the contribution was missed.
    pub round: Pubkey,
    /// Wallet proposed for default handling.
    pub member: Pubkey,
    /// Zero-indexed round number.
    pub round_index: u16,
    /// Unix timestamp when the proposal was opened.
    pub proposed_at: i64,
    /// Unix timestamp when grace expires and the proposal can execute without votes.
    pub grace_deadline_ts: i64,
    /// Approval votes by member join_order bit.
    pub approvals_bitmap: u64,
    /// Rejection votes by member join_order bit.
    pub rejections_bitmap: u64,
    /// True once handle_default consumes the proposal.
    pub resolved: bool,
    /// PDA bump.
    pub bump: u8,
}

impl DefaultProposal {
    pub const LEN: usize = 8   // discriminator
        + 32   // circle
        + 32   // round
        + 32   // member
        + 2    // round_index
        + 8    // proposed_at
        + 8    // grace_deadline_ts
        + 8    // approvals_bitmap
        + 8    // rejections_bitmap
        + 1    // resolved
        + 1; // bump
}

/// Protocol-level backstop for member defaults.
/// Funded by contribution fees and collateral slashing for each circle.
/// PDA seeds: ["insurance", circle]
#[account]
pub struct InsurancePool {
    /// The circle this pool is attached to.
    pub circle: Pubkey,
    /// Lamports reserved for default coverage (mirrors the account's lamport balance
    /// minus rent-exemption; maintained as a convenience field).
    pub balance: u64,
    /// Cumulative claims paid out (informational).
    pub total_claims_paid: u64,
    /// Minimum reserve ratio in basis points set by the circle creator.
    pub reserve_ratio_bps: u16,
    /// PDA bump.
    pub bump: u8,
}

impl InsurancePool {
    pub const LEN: usize = 8   // discriminator
        + 32   // circle
        + 8    // balance
        + 8    // total_claims_paid
        + 2    // reserve_ratio_bps
        + 1; // bump
}

// ── Listing ──────────────────────────────────────────────────────────────────

/// Escrowed sale offer for a payout Position NFT.
/// PDA seeds: ["listing", circle, membership]
#[account]
pub struct Listing {
    /// Circle whose position is being sold.
    pub circle: Pubkey,
    /// Current owner that listed the position.
    pub seller: Pubkey,
    /// Membership whose payout right and remaining obligations are being sold.
    pub membership: Pubkey,
    /// The 1-of-1 Position NFT mint locked in escrow.
    pub position_nft_mint: Pubkey,
    /// PDA-owned token account holding the listed Position NFT.
    pub escrow_token_account: Pubkey,
    /// SOL price paid by the buyer to the seller.
    pub ask_price: u64,
    /// False only after cancellation or purchase.
    pub active: bool,
    /// PDA bump for this listing.
    pub bump: u8,
    /// PDA bump for the escrow token account.
    pub escrow_bump: u8,
}

impl Listing {
    pub const LEN: usize = 8   // discriminator
        + 32   // circle
        + 32   // seller
        + 32   // membership
        + 32   // position_nft_mint
        + 32   // escrow_token_account
        + 8    // ask_price
        + 1    // active
        + 1    // bump
        + 1; // escrow_bump
}
