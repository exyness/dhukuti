use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::ContributionMadeEvent;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

/// Records a member's contribution for the current round.
///
/// Transfers contribution_amount from member to vault, then routes the
/// insurance fee slice (insurance_fee_bps of contribution_amount) from vault
/// to the InsurancePool, so the pool grows with every on-time payment.
pub fn handler(ctx: Context<Contribute>) -> Result<()> {
    let circle = &ctx.accounts.circle;
    let membership = &mut ctx.accounts.membership;
    let round = &mut ctx.accounts.round;

    // ── Preconditions ────────────────────────────────────────────────────────
    require!(
        circle.status == CircleStatus::Active,
        DhukutiError::CircleNotActive
    );
    require!(membership.active, DhukutiError::MemberInactive);
    require!(
        membership.circle == circle.key(),
        DhukutiError::MembershipCircleMismatch
    );
    require!(!round.resolved, DhukutiError::RoundAlreadyResolved);
    require!(
        round.index == circle.current_round,
        DhukutiError::RoundIndexMismatch
    );

    let bit: u64 = 1u64
        .checked_shl(membership.join_order as u32)
        .ok_or(DhukutiError::Overflow)?;
    require!(
        round.contributions_bitmap & bit == 0,
        DhukutiError::AlreadyContributed
    );

    // ── Transfer full contribution → vault ────────────────────────────────────
    system_program::transfer(
        CpiContext::new(
            system_program::ID,
            system_program::Transfer {
                from: ctx.accounts.member.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        circle.contribution_amount,
    )?;

    // ── Route insurance fee: vault → insurance pool ───────────────────────────
    let insurance_fee = (circle.contribution_amount as u128)
        .checked_mul(circle.insurance_fee_bps as u128)
        .and_then(|v| v.checked_div(BPS_DENOMINATOR as u128))
        .ok_or(DhukutiError::Overflow)? as u64;

    if insurance_fee > 0 {
        **ctx
            .accounts
            .vault
            .to_account_info()
            .try_borrow_mut_lamports()? = ctx
            .accounts
            .vault
            .lamports()
            .checked_sub(insurance_fee)
            .ok_or(DhukutiError::Underflow)?;
        **ctx
            .accounts
            .insurance_pool
            .to_account_info()
            .try_borrow_mut_lamports()? = ctx
            .accounts
            .insurance_pool
            .to_account_info()
            .lamports()
            .checked_add(insurance_fee)
            .ok_or(DhukutiError::Overflow)?;
        ctx.accounts.insurance_pool.balance = ctx
            .accounts
            .insurance_pool
            .balance
            .checked_add(insurance_fee)
            .ok_or(DhukutiError::Overflow)?;
    }

    // ── Update round and membership state ─────────────────────────────────────
    let net_to_pot = circle
        .contribution_amount
        .checked_sub(insurance_fee)
        .ok_or(DhukutiError::Underflow)?;

    round.contributions_bitmap |= bit;
    round.pot_total = round
        .pot_total
        .checked_add(net_to_pot)
        .ok_or(DhukutiError::Overflow)?;
    membership.contributions_bitmap |= 1u64
        .checked_shl(circle.current_round as u32)
        .ok_or(DhukutiError::Overflow)?;

    msg!(
        "Member {} contributed {} lamports (fee: {}) to round {} of circle {}",
        ctx.accounts.member.key(),
        circle.contribution_amount,
        insurance_fee,
        round.index,
        circle.circle_id,
    );

    emit!(ContributionMadeEvent {
        circle: circle.key(),
        round: round.key(),
        member: ctx.accounts.member.key(),
        round_index: round.index,
        contribution_amount: circle.contribution_amount,
        insurance_fee,
        net_to_pot,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub member: Signer<'info>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    /// CHECK: Vault PDA owned by this program; holds lamports only.
    #[account(
        mut,
        seeds = [SEED_VAULT, circle.key().as_ref()],
        bump = circle.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SEED_INSURANCE, circle.key().as_ref()],
        bump = circle.insurance_bump
    )]
    pub insurance_pool: Account<'info, InsurancePool>,

    #[account(
        mut,
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), member.key().as_ref()],
        bump = membership.bump,
        constraint = membership.member == member.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub membership: Account<'info, Membership>,

    #[account(
        mut,
        seeds = [SEED_ROUND, circle.key().as_ref(), &circle.current_round.to_le_bytes()],
        bump = round.bump
    )]
    pub round: Account<'info, Round>,

    pub system_program: Program<'info, System>,
}
