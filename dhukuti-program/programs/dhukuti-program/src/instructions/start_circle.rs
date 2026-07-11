use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::CircleStartedEvent;
use crate::state::*;
use anchor_lang::prelude::*;

/// Locks a circle and opens the first round.
///
/// The creator can start once at least 2 members have joined. Once the circle
/// reaches its member cap, any signer may start it so a full circle cannot get
/// stuck waiting on the host.
/// On success the circle transitions from Open → Active and the first
/// Round PDA is initialised.
pub fn handler(ctx: Context<StartCircle>) -> Result<()> {
    let clock = Clock::get()?;
    let circle = &mut ctx.accounts.circle;

    require!(
        circle.status == CircleStatus::Open,
        DhukutiError::InvalidCircleStatus
    );
    require!(circle.current_members >= 2, DhukutiError::NotEnoughMembers);
    require!(
        ctx.accounts.starter.key() == circle.creator || circle.current_members == circle.max_members,
        DhukutiError::UnauthorizedStart
    );

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
    pub starter: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    #[account(
        init,
        payer = starter,
        space = Round::LEN,
        seeds = [SEED_ROUND, circle.key().as_ref(), &0u16.to_le_bytes()],
        bump
    )]
    pub first_round: Account<'info, Round>,

    pub system_program: Program<'info, System>,
}
