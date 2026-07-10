use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::ReputationUpdatedEvent;
use crate::state::*;
use anchor_lang::prelude::*;

/// Claims protocol-wide reputation for successfully hosting a completed circle.
///
/// This is intentionally separate from member completion reputation: a creator
/// earns host credit for operating the circle to completion, while member credit
/// remains tied to each payout obligation.
pub fn handler(ctx: Context<ClaimHostReputation>) -> Result<()> {
    let circle = &mut ctx.accounts.circle;
    let rep = &mut ctx.accounts.reputation;
    let host = ctx.accounts.host.key();

    require!(circle.creator == host, DhukutiError::InvalidCircleHost);
    require!(
        circle.status == CircleStatus::Complete,
        DhukutiError::InvalidCircleStatus
    );
    require!(
        !circle.host_reputation_claimed,
        DhukutiError::HostReputationAlreadyClaimed
    );

    if rep.wallet == Pubkey::default() {
        rep.wallet = host;
        rep.bump = ctx.bumps.reputation;
    }

    let no_default_bonus = if circle.defaults_handled == 0 {
        Reputation::SCORE_HOST_NO_DEFAULT_BONUS
    } else {
        0
    };
    let score_delta = Reputation::SCORE_HOSTED_CIRCLE
        .checked_add(no_default_bonus)
        .ok_or(DhukutiError::Overflow)?;

    rep.score = rep.score.saturating_add(score_delta);
    rep.circles_hosted = rep.circles_hosted.saturating_add(1);
    rep.hosted_default_events = rep
        .hosted_default_events
        .saturating_add(circle.defaults_handled as u32);
    rep.recompute_tier();

    circle.host_reputation_claimed = true;

    emit!(ReputationUpdatedEvent {
        wallet: rep.wallet,
        score: rep.score,
        discount_tier: rep.discount_tier,
        circles_completed: rep.circles_completed,
        circles_defaulted: rep.circles_defaulted,
        circles_hosted: rep.circles_hosted,
        hosted_default_events: rep.hosted_default_events,
        vouches_made: rep.vouches_made,
        vouches_honored: rep.vouches_honored,
        vouches_slashed: rep.vouches_slashed,
        vouch_stake_slashed: rep.vouch_stake_slashed,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimHostReputation<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,

    /// CHECK: The wallet that created the circle; verified against circle.creator.
    pub host: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = cranker,
        space = Reputation::LEN,
        seeds = [SEED_REPUTATION, host.key().as_ref()],
        bump,
        constraint = reputation.wallet == Pubkey::default() || reputation.wallet == host.key()
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(
        mut,
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    pub system_program: Program<'info, System>,
}
