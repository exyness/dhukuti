use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::{ReputationUpdatedEvent, VouchSlashedEvent};
use crate::state::*;
use anchor_lang::prelude::*;

/// Slashes a vouch into the insurance pool after the vouched member defaults.
pub fn handler(ctx: Context<SlashVouch>) -> Result<()> {
    let circle = &ctx.accounts.circle;
    let vouch = &mut ctx.accounts.vouch;
    let candidate_membership = &ctx.accounts.candidate_membership;
    let insurance = &mut ctx.accounts.insurance_pool;

    require!(vouch.active, DhukutiError::VouchInactive);
    require!(
        !vouch.slashed && !vouch.released,
        DhukutiError::VouchAlreadyResolved
    );
    require!(
        !candidate_membership.active && candidate_membership.rounds_missed > 0,
        DhukutiError::CandidateNotDefaulted
    );

    move_stake(
        &vouch.to_account_info(),
        &insurance.to_account_info(),
        vouch.stake_lamports,
    )?;
    insurance.balance = insurance
        .balance
        .checked_add(vouch.stake_lamports)
        .ok_or(DhukutiError::Overflow)?;

    vouch.active = false;
    vouch.slashed = true;

    let rep = &mut ctx.accounts.reputation;
    if rep.wallet == Pubkey::default() {
        rep.wallet = vouch.voucher;
        rep.bump = ctx.bumps.reputation;
    }
    rep.score = rep
        .score
        .saturating_sub(Reputation::SCORE_VOUCH_SLASH_PENALTY);
    rep.vouches_slashed = rep.vouches_slashed.saturating_add(1);
    rep.vouch_stake_slashed = rep.vouch_stake_slashed.saturating_add(vouch.stake_lamports);
    rep.recompute_tier();

    emit!(VouchSlashedEvent {
        circle: circle.key(),
        vouch: vouch.key(),
        voucher: vouch.voucher,
        candidate: vouch.candidate,
        stake_lamports: vouch.stake_lamports,
    });

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

fn move_stake<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }

    **from.try_borrow_mut_lamports()? = from
        .lamports()
        .checked_sub(amount)
        .ok_or(DhukutiError::Underflow)?;
    **to.try_borrow_mut_lamports()? = to
        .lamports()
        .checked_add(amount)
        .ok_or(DhukutiError::Overflow)?;

    Ok(())
}

#[derive(Accounts)]
pub struct SlashVouch<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    #[account(
        mut,
        seeds = [SEED_INSURANCE, circle.key().as_ref()],
        bump = circle.insurance_bump
    )]
    pub insurance_pool: Account<'info, InsurancePool>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), vouch.candidate.as_ref()],
        bump = candidate_membership.bump,
        constraint = candidate_membership.member == vouch.candidate @ DhukutiError::MembershipCircleMismatch
    )]
    pub candidate_membership: Account<'info, Membership>,

    #[account(
        mut,
        seeds = [SEED_VOUCH, circle.key().as_ref(), vouch.voucher.as_ref(), vouch.candidate.as_ref()],
        bump = vouch.bump,
        constraint = vouch.circle == circle.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub vouch: Account<'info, Vouch>,

    #[account(
        init_if_needed,
        payer = cranker,
        space = Reputation::LEN,
        seeds = [SEED_REPUTATION, vouch.voucher.as_ref()],
        bump,
        constraint = reputation.wallet == Pubkey::default() || reputation.wallet == vouch.voucher
    )]
    pub reputation: Account<'info, Reputation>,

    pub system_program: Program<'info, System>,
}
