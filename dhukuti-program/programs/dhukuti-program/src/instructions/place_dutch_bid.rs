use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::DutchBidAcceptedEvent;
use crate::state::*;
use anchor_lang::prelude::*;

/// Accepts the current Dutch auction clearing discount for the active round.
///
/// The first active member to accept the descending discount becomes the round
/// payout winner. The actual discount split is applied in resolve_round after
/// all active members have contributed or been covered by default handling.
pub fn handler(ctx: Context<PlaceDutchBid>) -> Result<()> {
    let clock = Clock::get()?;
    let circle = &ctx.accounts.circle;
    let round = &mut ctx.accounts.round;
    let membership = &ctx.accounts.membership;

    require!(
        circle.status == CircleStatus::Active,
        DhukutiError::CircleNotActive
    );
    require!(
        circle.payout_curve == PayoutCurve::DutchAuction,
        DhukutiError::UnsupportedPayoutCurve
    );
    require!(!round.resolved, DhukutiError::RoundAlreadyResolved);
    require!(
        round.index == circle.current_round,
        DhukutiError::RoundIndexMismatch
    );
    require!(
        round.auction_winner.is_none(),
        DhukutiError::AuctionAlreadyAccepted
    );
    require!(membership.active, DhukutiError::MemberInactive);
    require!(
        membership.circle == circle.key(),
        DhukutiError::MembershipCircleMismatch
    );
    require!(
        membership.member == ctx.accounts.bidder.key(),
        DhukutiError::MembershipCircleMismatch
    );

    round.auction_winner = Some(ctx.accounts.bidder.key());
    round.auction_discount_bps = current_discount_bps(circle, round, clock.unix_timestamp)?;

    msg!(
        "Dutch auction accepted by {} for round {} at {} bps discount",
        ctx.accounts.bidder.key(),
        round.index,
        round.auction_discount_bps,
    );

    emit!(DutchBidAcceptedEvent {
        circle: circle.key(),
        round: round.key(),
        bidder: ctx.accounts.bidder.key(),
        round_index: round.index,
        discount_bps: round.auction_discount_bps,
    });

    Ok(())
}

fn current_discount_bps(circle: &Circle, round: &Round, now: i64) -> Result<u16> {
    let round_start = round
        .deadline_ts
        .checked_sub(circle.cycle_duration)
        .ok_or(DhukutiError::Underflow)?;

    if now <= round_start {
        return Ok(DUTCH_AUCTION_MAX_DISCOUNT_BPS);
    }
    if now >= round.deadline_ts {
        return Ok(0);
    }

    let remaining = round
        .deadline_ts
        .checked_sub(now)
        .ok_or(DhukutiError::Underflow)?;
    Ok(((DUTCH_AUCTION_MAX_DISCOUNT_BPS as i128)
        .checked_mul(remaining as i128)
        .and_then(|v| v.checked_div(circle.cycle_duration as i128))
        .ok_or(DhukutiError::Overflow)?) as u16)
}

#[derive(Accounts)]
pub struct PlaceDutchBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), bidder.key().as_ref()],
        bump = membership.bump,
        constraint = membership.member == bidder.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub membership: Account<'info, Membership>,

    #[account(
        mut,
        seeds = [SEED_ROUND, circle.key().as_ref(), &circle.current_round.to_le_bytes()],
        bump = round.bump
    )]
    pub round: Account<'info, Round>,
}
