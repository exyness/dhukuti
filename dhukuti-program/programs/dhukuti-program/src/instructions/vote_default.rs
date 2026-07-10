use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::DefaultVoteCastEvent;
use crate::state::*;
use anchor_lang::prelude::*;

/// Casts or updates a member vote on an open default proposal.
pub fn handler(ctx: Context<VoteDefault>, approve: bool) -> Result<()> {
    let circle = &ctx.accounts.circle;
    let proposal = &mut ctx.accounts.default_proposal;
    let voter_membership = &ctx.accounts.voter_membership;

    require!(
        circle.status == CircleStatus::Active,
        DhukutiError::CircleNotActive
    );
    require!(
        !proposal.resolved,
        DhukutiError::DefaultProposalAlreadyResolved
    );
    require!(voter_membership.active, DhukutiError::MemberInactive);
    require!(
        voter_membership.circle == circle.key(),
        DhukutiError::MembershipCircleMismatch
    );
    require!(
        voter_membership.member == ctx.accounts.voter.key(),
        DhukutiError::MembershipCircleMismatch
    );
    require!(
        voter_membership.member != proposal.member,
        DhukutiError::CannotVoteOnOwnDefault
    );

    let vote_bit = 1u64
        .checked_shl(voter_membership.join_order as u32)
        .ok_or(DhukutiError::Overflow)?;

    if approve {
        proposal.approvals_bitmap |= vote_bit;
        proposal.rejections_bitmap &= !vote_bit;
    } else {
        proposal.rejections_bitmap |= vote_bit;
        proposal.approvals_bitmap &= !vote_bit;
    }

    emit!(DefaultVoteCastEvent {
        circle: circle.key(),
        round: proposal.round,
        proposal: proposal.key(),
        voter: ctx.accounts.voter.key(),
        member: proposal.member,
        round_index: proposal.round_index,
        approve,
        approvals_bitmap: proposal.approvals_bitmap,
        rejections_bitmap: proposal.rejections_bitmap,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct VoteDefault<'info> {
    pub voter: Signer<'info>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), voter.key().as_ref()],
        bump = voter_membership.bump,
        constraint = voter_membership.member == voter.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub voter_membership: Account<'info, Membership>,

    #[account(
        mut,
        seeds = [SEED_DEFAULT_PROPOSAL, circle.key().as_ref(), default_proposal.round.as_ref(), default_proposal.member.as_ref()],
        bump = default_proposal.bump,
        constraint = default_proposal.circle == circle.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub default_proposal: Account<'info, DefaultProposal>,
}
