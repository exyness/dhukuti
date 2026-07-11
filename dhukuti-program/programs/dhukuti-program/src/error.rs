use anchor_lang::prelude::*;

#[error_code]
pub enum DhukutiError {
    // ── Circle creation ──────────────────────────────────────────────────────
    #[msg("Max members must be between 2 and 64")]
    InvalidMaxMembers,
    #[msg("Contribution amount must be greater than zero")]
    ZeroContributionAmount,
    #[msg("Cycle duration out of allowed range (1 hour – 365 days)")]
    InvalidCycleDuration,
    #[msg("Collateral basis points below minimum (500 bps = 5%)")]
    CollateralTooLow,
    #[msg("Insurance fee exceeds maximum (500 bps = 5%)")]
    InsuranceFeeTooHigh,
    #[msg("Reserve ratio cannot exceed 10,000 basis points")]
    InvalidReserveRatio,
    #[msg("Only native SOL contribution circles are supported in this program version")]
    UnsupportedDenomMint,

    // ── Joining ──────────────────────────────────────────────────────────────
    #[msg("Circle is not open for new members")]
    CircleNotOpen,
    #[msg("Circle is already at maximum member capacity")]
    CircleFull,
    #[msg("Member's reputation score is below the circle's minimum requirement")]
    ReputationTooLow,
    #[msg("Insufficient collateral provided")]
    InsufficientCollateral,
    #[msg("Member already has a membership in this circle")]
    BuyerAlreadyMember,

    // ── Start ────────────────────────────────────────────────────────────────
    #[msg("Only the circle creator can start the circle")]
    UnauthorizedStart,
    #[msg("Circle needs at least 2 members before it can start")]
    NotEnoughMembers,
    #[msg("Circle is not in the correct status to perform this action")]
    InvalidCircleStatus,

    // ── Contribution ─────────────────────────────────────────────────────────
    #[msg("Circle is not active")]
    CircleNotActive,
    #[msg("Member has already contributed to this round")]
    AlreadyContributed,
    #[msg("This membership does not belong to the specified circle")]
    MembershipCircleMismatch,
    #[msg("Member is not active in this circle")]
    MemberInactive,

    // ── Round resolution ─────────────────────────────────────────────────────
    #[msg("Not all members have contributed to this round yet")]
    RoundNotFullyFunded,
    #[msg("This round has already been resolved")]
    RoundAlreadyResolved,
    #[msg("Round index does not match the circle's current round")]
    RoundIndexMismatch,
    #[msg("Could not determine a payout recipient for this round")]
    RecipientNotFound,

    #[msg("Round deadline has not been reached yet")]
    DeadlineNotReached,
    #[msg("This payout curve is not supported by the requested instruction")]
    UnsupportedPayoutCurve,
    #[msg("A Dutch auction bid has already been accepted for this round")]
    AuctionAlreadyAccepted,
    #[msg("No Dutch auction bid has been accepted for this round")]
    NoDutchAuctionBid,
    #[msg("Dutch auction discount distribution accounts are invalid")]
    InvalidRemainingAccounts,
    #[msg("Dutch auction remaining-member account is invalid")]
    InvalidRemainingMember,

    // ── Complete ─────────────────────────────────────────────────────────────
    #[msg("Circle still has unresolved rounds; cannot be marked complete")]
    CircleHasActiveRounds,
    #[msg("Reputation has already been claimed for this membership event")]
    ReputationAlreadyClaimed,
    #[msg("Only the circle host can claim host reputation")]
    InvalidCircleHost,
    #[msg("Host reputation has already been claimed for this circle")]
    HostReputationAlreadyClaimed,
    #[msg("Vouch stake must be greater than zero")]
    InvalidVouchStake,
    #[msg("A member cannot vouch for their own wallet")]
    CannotVouchSelf,
    #[msg("Vouch is not active")]
    VouchInactive,
    #[msg("Vouch has already been released or slashed")]
    VouchAlreadyResolved,
    #[msg("Vouched member has not defaulted")]
    CandidateNotDefaulted,
    #[msg("Default proposal has already been resolved")]
    DefaultProposalAlreadyResolved,
    #[msg("Default proposal is not approved and grace period has not expired")]
    DefaultProposalNotReady,
    #[msg("Member cannot vote on their own default proposal")]
    CannotVoteOnOwnDefault,

    // ── Secondary market ─────────────────────────────────────────────────────
    #[msg("Listing ask price must be greater than zero")]
    InvalidAskPrice,
    #[msg("Position NFT token account does not hold the listed position")]
    InvalidPositionOwner,
    #[msg("Listing is not active")]
    ListingInactive,
    #[msg("Buyer cannot buy their own listing")]
    CannotBuyOwnListing,
    #[msg("Position NFT mint does not match this membership")]
    InvalidPositionMint,

    // ── Arithmetic ───────────────────────────────────────────────────────────
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Arithmetic underflow")]
    Underflow,

    // ── Circle metadata ──────────────────────────────────────────────────────
    #[msg("Circle name must be 1-64 UTF-8 bytes after trimming")]
    InvalidCircleName,
}
