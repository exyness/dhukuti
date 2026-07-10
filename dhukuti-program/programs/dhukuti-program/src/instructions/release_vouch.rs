use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::{ReputationUpdatedEvent, VouchReleasedEvent};
use crate::state::*;
use anchor_lang::prelude::*;

/// Returns social collateral after the circle completes and the vouched member
/// stayed active through completion.
pub fn handler(ctx: Context<ReleaseVouch>) -> Result<()> {
    let circle = &ctx.accounts.circle;
    let vouch = &mut ctx.accounts.vouch;
    let candidate_membership = &ctx.accounts.candidate_membership;

    require!(
        circle.status == CircleStatus::Complete,
        DhukutiError::InvalidCircleStatus
    );
    require!(vouch.active, DhukutiError::VouchInactive);
    require!(
        !vouch.slashed && !vouch.released,
        DhukutiError::VouchAlreadyResolved
    );
    require!(candidate_membership.active, DhukutiError::MemberInactive);
    require!(
        candidate_membership.rounds_missed == 0,
        DhukutiError::MemberInactive
    );

    move_stake(
        &vouch.to_account_info(),
        &ctx.accounts.voucher.to_account_info(),
        vouch.stake_lamports,
    )?;

    vouch.active = false;
    vouch.released = true;

    let rep = &mut ctx.accounts.reputation;
    if rep.wallet == Pubkey::default() {
        rep.wallet = ctx.accounts.voucher.key();
        rep.bump = ctx.bumps.reputation;
    }
    rep.score = rep.score.saturating_add(Reputation::SCORE_VOUCH_HONORED);
    rep.vouches_honored = rep.vouches_honored.saturating_add(1);
    rep.recompute_tier();

    emit!(VouchReleasedEvent {
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
pub struct ReleaseVouch<'info> {
    #[account(mut)]
    pub voucher: Signer<'info>,

    /// CHECK: Candidate wallet is verified against vouch and membership.
    pub candidate: UncheckedAccount<'info>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), candidate.key().as_ref()],
        bump = candidate_membership.bump,
        constraint = candidate_membership.member == candidate.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub candidate_membership: Account<'info, Membership>,

    #[account(
        mut,
        seeds = [SEED_VOUCH, circle.key().as_ref(), voucher.key().as_ref(), candidate.key().as_ref()],
        bump = vouch.bump,
        constraint = vouch.circle == circle.key() @ DhukutiError::MembershipCircleMismatch,
        constraint = vouch.voucher == voucher.key() @ DhukutiError::MembershipCircleMismatch,
        constraint = vouch.candidate == candidate.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub vouch: Account<'info, Vouch>,

    #[account(
        init_if_needed,
        payer = voucher,
        space = Reputation::LEN,
        seeds = [SEED_REPUTATION, voucher.key().as_ref()],
        bump,
        constraint = reputation.wallet == Pubkey::default() || reputation.wallet == voucher.key()
    )]
    pub reputation: Account<'info, Reputation>,

    pub system_program: Program<'info, System>,
}
