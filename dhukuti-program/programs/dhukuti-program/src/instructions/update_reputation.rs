use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::ReputationUpdatedEvent;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum ReputationEvent {
    /// Wallet completed a circle as a non-defaulting member.
    CircleCompleted,
    /// Wallet was ejected from a circle for defaulting.
    CircleDefaulted,
}

/// Updates (or initialises) a wallet's Reputation PDA.
///
/// Called permissionlessly after complete_circle (for all member wallets) or
/// after handle_default (for the defaulting wallet).  The caller provides the
/// circle and, for the default path, the membership account so the instruction
/// can verify the event actually occurred on-chain.
pub fn handler(ctx: Context<UpdateReputation>, event: ReputationEvent) -> Result<()> {
    let rep = &mut ctx.accounts.reputation;
    let circle = &ctx.accounts.circle;
    let membership = &mut ctx.accounts.membership;

    match event {
        ReputationEvent::CircleCompleted => {
            // Validate: circle is complete and the wallet was an active member.
            require!(
                circle.status == CircleStatus::Complete,
                DhukutiError::InvalidCircleStatus
            );
            require!(
                membership.circle == circle.key(),
                DhukutiError::MembershipCircleMismatch
            );
            require!(
                membership.member == ctx.accounts.wallet.key(),
                DhukutiError::MembershipCircleMismatch
            );
            // Only the current active holder of the obligation can claim completion.
            require!(membership.active, DhukutiError::MemberInactive);
            require!(membership.rounds_missed == 0, DhukutiError::MemberInactive);
            require!(
                !membership.completion_reputation_claimed,
                DhukutiError::ReputationAlreadyClaimed
            );

            rep.score = rep.score.saturating_add(Reputation::SCORE_COMPLETION);
            rep.circles_completed = rep.circles_completed.saturating_add(1);
            membership.completion_reputation_claimed = true;
        }

        ReputationEvent::CircleDefaulted => {
            // Validate: membership is inactive (ejected) for this wallet.
            require!(
                membership.circle == circle.key(),
                DhukutiError::MembershipCircleMismatch
            );
            require!(
                membership.member == ctx.accounts.wallet.key(),
                DhukutiError::MembershipCircleMismatch
            );
            require!(!membership.active, DhukutiError::MemberInactive);
            require!(membership.rounds_missed > 0, DhukutiError::MemberInactive);
            require!(
                !membership.default_reputation_claimed,
                DhukutiError::ReputationAlreadyClaimed
            );

            rep.score = rep.score.saturating_sub(Reputation::SCORE_DEFAULT_PENALTY);
            rep.circles_defaulted = rep.circles_defaulted.saturating_add(1);
            membership.default_reputation_claimed = true;
        }
    }

    // Initialise wallet field on first write.
    if rep.wallet == Pubkey::default() {
        rep.wallet = ctx.accounts.wallet.key();
        rep.bump = ctx.bumps.reputation;
    }

    rep.recompute_tier();

    msg!(
        "Reputation updated for {} | score: {} | tier: {}",
        rep.wallet,
        rep.score,
        rep.discount_tier,
    );

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
pub struct UpdateReputation<'info> {
    #[account(mut)]
    pub cranker: Signer<'info>,

    /// CHECK: Wallet whose reputation is being updated; verified against membership.member.
    pub wallet: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = cranker,
        space = Reputation::LEN,
        seeds = [SEED_REPUTATION, wallet.key().as_ref()],
        bump,
        constraint = reputation.wallet == Pubkey::default() || reputation.wallet == wallet.key()
    )]
    pub reputation: Account<'info, Reputation>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    #[account(
        mut,
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), wallet.key().as_ref()],
        bump = membership.bump
    )]
    pub membership: Account<'info, Membership>,

    pub system_program: Program<'info, System>,
}
