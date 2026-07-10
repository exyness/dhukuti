use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::{ReputationUpdatedEvent, VouchCreatedEvent};
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

/// Locks social collateral from an existing member behind another active member.
///
/// The vouch itself does not guarantee repayment; it creates accountable social
/// stake that can be slashed into the circle insurance pool if the vouched member
/// later defaults.
pub fn handler(ctx: Context<VouchMember>, stake_lamports: u64) -> Result<()> {
    let circle = &ctx.accounts.circle;
    let voucher = ctx.accounts.voucher.key();
    let candidate = ctx.accounts.candidate.key();
    let voucher_membership = &ctx.accounts.voucher_membership;
    let candidate_membership = &ctx.accounts.candidate_membership;

    require!(stake_lamports > 0, DhukutiError::InvalidVouchStake);
    require!(voucher != candidate, DhukutiError::CannotVouchSelf);
    require!(
        circle.status != CircleStatus::Complete,
        DhukutiError::InvalidCircleStatus
    );
    require!(voucher_membership.active, DhukutiError::MemberInactive);
    require!(candidate_membership.active, DhukutiError::MemberInactive);
    require!(
        voucher_membership.circle == circle.key(),
        DhukutiError::MembershipCircleMismatch
    );
    require!(
        candidate_membership.circle == circle.key(),
        DhukutiError::MembershipCircleMismatch
    );
    require!(
        voucher_membership.member == voucher,
        DhukutiError::MembershipCircleMismatch
    );
    require!(
        candidate_membership.member == candidate,
        DhukutiError::MembershipCircleMismatch
    );

    system_program::transfer(
        CpiContext::new(
            system_program::ID,
            system_program::Transfer {
                from: ctx.accounts.voucher.to_account_info(),
                to: ctx.accounts.vouch.to_account_info(),
            },
        ),
        stake_lamports,
    )?;

    let clock = Clock::get()?;
    let vouch = &mut ctx.accounts.vouch;
    vouch.circle = circle.key();
    vouch.voucher = voucher;
    vouch.candidate = candidate;
    vouch.stake_lamports = stake_lamports;
    vouch.active = true;
    vouch.slashed = false;
    vouch.released = false;
    vouch.created_at = clock.unix_timestamp;
    vouch.bump = ctx.bumps.vouch;

    let rep = &mut ctx.accounts.reputation;
    if rep.wallet == Pubkey::default() {
        rep.wallet = voucher;
        rep.bump = ctx.bumps.reputation;
    }
    rep.vouches_made = rep.vouches_made.saturating_add(1);
    rep.recompute_tier();

    emit!(VouchCreatedEvent {
        circle: circle.key(),
        vouch: vouch.key(),
        voucher,
        candidate,
        stake_lamports,
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

#[derive(Accounts)]
pub struct VouchMember<'info> {
    #[account(mut)]
    pub voucher: Signer<'info>,

    /// CHECK: Candidate wallet is verified against candidate_membership.member.
    pub candidate: UncheckedAccount<'info>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), voucher.key().as_ref()],
        bump = voucher_membership.bump,
        constraint = voucher_membership.member == voucher.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub voucher_membership: Account<'info, Membership>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), candidate.key().as_ref()],
        bump = candidate_membership.bump,
        constraint = candidate_membership.member == candidate.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub candidate_membership: Account<'info, Membership>,

    #[account(
        init,
        payer = voucher,
        space = Vouch::LEN,
        seeds = [SEED_VOUCH, circle.key().as_ref(), voucher.key().as_ref(), candidate.key().as_ref()],
        bump
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
