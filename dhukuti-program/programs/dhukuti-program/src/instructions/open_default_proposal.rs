use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::DefaultProposalOpenedEvent;
use crate::state::*;
use anchor_lang::prelude::*;

/// Opens a member-governed default proposal after a round deadline is missed.
///
/// The proposal can be executed early by member approval, or after the grace
/// deadline without votes. The proposed member can still contribute during the
/// grace period; in that case handle_default will fail because the round slot is
/// already covered.
pub fn handler(ctx: Context<OpenDefaultProposal>) -> Result<()> {
    let clock = Clock::get()?;
    let circle = &ctx.accounts.circle;
    let round = &ctx.accounts.round;
    let membership = &ctx.accounts.membership;
    let proposer_membership = &ctx.accounts.proposer_membership;

    require!(
        circle.status == CircleStatus::Active,
        DhukutiError::CircleNotActive
    );
    require!(!round.resolved, DhukutiError::RoundAlreadyResolved);
    require!(
        round.index == circle.current_round,
        DhukutiError::RoundIndexMismatch
    );
    require!(
        clock.unix_timestamp >= round.deadline_ts,
        DhukutiError::DeadlineNotReached
    );
    require!(membership.active, DhukutiError::MemberInactive);
    require!(proposer_membership.active, DhukutiError::MemberInactive);
    require!(
        membership.circle == circle.key(),
        DhukutiError::MembershipCircleMismatch
    );
    require!(
        proposer_membership.circle == circle.key(),
        DhukutiError::MembershipCircleMismatch
    );

    let default_bit = 1u64
        .checked_shl(membership.join_order as u32)
        .ok_or(DhukutiError::Overflow)?;
    require!(
        round.contributions_bitmap & default_bit == 0,
        DhukutiError::AlreadyContributed
    );

    let proposal = &mut ctx.accounts.default_proposal;
    proposal.circle = circle.key();
    proposal.round = round.key();
    proposal.member = ctx.accounts.defaulting_member.key();
    proposal.round_index = round.index;
    proposal.proposed_at = clock.unix_timestamp;
    proposal.grace_deadline_ts = clock
        .unix_timestamp
        .checked_add(DEFAULT_GRACE_PERIOD_SECS)
        .ok_or(DhukutiError::Overflow)?;
    proposal.approvals_bitmap = 0;
    proposal.rejections_bitmap = 0;
    proposal.resolved = false;
    proposal.bump = ctx.bumps.default_proposal;

    emit!(DefaultProposalOpenedEvent {
        circle: circle.key(),
        round: round.key(),
        proposal: proposal.key(),
        proposer: ctx.accounts.proposer.key(),
        member: proposal.member,
        round_index: proposal.round_index,
        grace_deadline_ts: proposal.grace_deadline_ts,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct OpenDefaultProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    #[account(
        seeds = [SEED_ROUND, circle.key().as_ref(), &circle.current_round.to_le_bytes()],
        bump = round.bump
    )]
    pub round: Account<'info, Round>,

    /// CHECK: The wallet being proposed for default; verified against membership.
    pub defaulting_member: UncheckedAccount<'info>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), defaulting_member.key().as_ref()],
        bump = membership.bump,
        constraint = membership.member == defaulting_member.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub membership: Account<'info, Membership>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), proposer.key().as_ref()],
        bump = proposer_membership.bump,
        constraint = proposer_membership.member == proposer.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub proposer_membership: Account<'info, Membership>,

    #[account(
        init,
        payer = proposer,
        space = DefaultProposal::LEN,
        seeds = [SEED_DEFAULT_PROPOSAL, circle.key().as_ref(), round.key().as_ref(), defaulting_member.key().as_ref()],
        bump
    )]
    pub default_proposal: Account<'info, DefaultProposal>,

    pub system_program: Program<'info, System>,
}
