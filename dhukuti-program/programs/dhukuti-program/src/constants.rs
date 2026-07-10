pub const SEED_CIRCLE: &[u8] = b"circle";
pub const SEED_VAULT: &[u8] = b"vault";
pub const SEED_MEMBERSHIP: &[u8] = b"membership";
pub const SEED_ROUND: &[u8] = b"round";
pub const SEED_INSURANCE: &[u8] = b"insurance";
pub const SEED_REPUTATION: &[u8] = b"reputation";
pub const SEED_POSITION_NFT: &[u8] = b"position_nft";
pub const SEED_LISTING: &[u8] = b"listing";
pub const SEED_LISTING_ESCROW: &[u8] = b"listing_escrow";
pub const SEED_VOUCH: &[u8] = b"vouch";
pub const SEED_DEFAULT_PROPOSAL: &[u8] = b"default_proposal";

/// Maximum members per circle — capped at 64 so a u64 bitfield covers all contribution slots.
pub const MAX_MEMBERS: u8 = 64;

/// Maximum rounds equals max members (each member receives exactly once).
pub const MAX_ROUNDS: u16 = 64;

/// Minimum collateral a member must deposit, expressed in basis points of contribution_amount.
/// 1000 bps = 10%.
pub const MIN_COLLATERAL_BPS: u16 = 500;

/// Maximum insurance fee the protocol can charge per contribution (500 bps = 5%).
pub const MAX_INSURANCE_FEE_BPS: u16 = 500;

/// Basis-point denominator shared by fee, collateral, and auction math.
pub const BPS_DENOMINATOR: u16 = 10_000;

/// Maximum discount a Dutch auction winner can accept at the start of a round.
pub const DUTCH_AUCTION_MAX_DISCOUNT_BPS: u16 = 2_000;

/// Portion of a Dutch auction discount routed to the insurance pool.
/// The remainder is distributed to other active members.
pub const DUTCH_AUCTION_INSURANCE_SPLIT_BPS: u16 = 5_000;

/// Minimum cycle duration: 1 hour.
pub const MIN_CYCLE_DURATION_SECS: i64 = 3_600;

/// Maximum cycle duration: 365 days.
pub const MAX_CYCLE_DURATION_SECS: i64 = 365 * 24 * 3_600;

/// Default grace period after a missed round deadline before a proposal can be
/// executed without member approval.
pub const DEFAULT_GRACE_PERIOD_SECS: i64 = 24 * 3_600;
