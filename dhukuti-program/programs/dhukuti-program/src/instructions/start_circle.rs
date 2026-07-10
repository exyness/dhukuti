use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::CircleStartedEvent;
use crate::state::*;
use anchor_lang::prelude::*;

/// Locks a circle and opens the first round.
///
/// Only the creator can call this. Requires at least 2 active members.
/// On success the circle transitions from Open → Active and the first
/// Round PDA is initialised.
pub fn handler(ctx: Context<StartCircle>) -> Result<()> {
    let clock = Clock::get()?;
    let circle = &mut ctx.accounts.circle;

    require!(
        ctx.accounts.creator.key() == circle.creator,
        DhukutiError::UnauthorizedStart
    );
    require!(
        circle.status == CircleStatus::Open,
        DhukutiError::InvalidCircleStatus
    );
    require!(circle.current_members >= 2, DhukutiError::NotEnoughMembers);

    circle.status = CircleStatus::Active;
    circle.started_at = Some(clock.unix_timestamp);

    let round = &mut ctx.accounts.first_round;
    round.circle = circle.key();
    round.index = 0;
    round.contributions_bitmap = 0;
    round.pot_total = 0;
    round.recipient = None;
    round.deadline_ts = clock
        .unix_timestamp
        .checked_add(circle.cycle_duration)
        .ok_or(DhukutiError::Overflow)?;
    round.auction_winner = None;
    round.auction_discount_bps = 0;
    round.resolved = false;
    round.bump = ctx.bumps.first_round;

    msg!(
        "Circle {} started with {} members | round 0 deadline: {}",
        circle.circle_id,
        circle.current_members,
        round.deadline_ts,
    );

    emit!(CircleStartedEvent {
        circle: circle.key(),
        creator: circle.creator,
        member_count: circle.current_members,
        first_round: round.key(),
        deadline_ts: round.deadline_ts,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct StartCircle<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_CIRCLE, creator.key().as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump,
        has_one = creator
    )]
    pub circle: Account<'info, Circle>,

    #[account(
        init,
        payer = creator,
        space = Round::LEN,
        seeds = [SEED_ROUND, circle.key().as_ref(), &0u16.to_le_bytes()],
        bump
    )]
    pub first_round: Account<'info, Round>,

    pub system_program: Program<'info, System>,
}
