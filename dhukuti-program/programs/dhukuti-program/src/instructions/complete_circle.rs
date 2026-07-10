use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::CircleCompletedEvent;
use crate::state::*;
use anchor_lang::prelude::*;

/// Closes a circle once every round has been resolved.
///
/// The crank must pass wallet/membership pairs for every active obligation so
/// collateral is returned to the current position holders rather than the
/// original joiners. Any dust left after verified refunds is returned to the
/// creator.
pub fn handler(ctx: Context<CompleteCircle>) -> Result<()> {
    let circle = &mut ctx.accounts.circle;

    require!(
        circle.status == CircleStatus::Active,
        DhukutiError::InvalidCircleStatus
    );
    // All rounds must be resolved before the circle can be closed.
    require!(
        circle.current_round >= circle.current_members as u16,
        DhukutiError::CircleHasActiveRounds
    );

    circle.status = CircleStatus::Complete;

    let mut seen_active_members = 0u64;

    require!(
        ctx.remaining_accounts.len() % 2 == 0,
        DhukutiError::InvalidRemainingAccounts
    );

    for pair in ctx.remaining_accounts.chunks(2) {
        let wallet_info = &pair[0];
        let membership_info = &pair[1];
        let membership: Account<Membership> = Account::try_from(membership_info)?;

        require!(membership.active, DhukutiError::MemberInactive);
        require!(
            membership.circle == circle.key(),
            DhukutiError::MembershipCircleMismatch
        );
        require!(
            membership.member == wallet_info.key(),
            DhukutiError::MembershipCircleMismatch
        );
        require!(
            wallet_info.is_writable,
            DhukutiError::InvalidRemainingMember
        );

        let member_bit = 1u64
            .checked_shl(membership.join_order as u32)
            .ok_or(DhukutiError::Overflow)?;
        seen_active_members |= member_bit;

        if membership.collateral_deposited > 0 {
            **ctx
                .accounts
                .vault
                .to_account_info()
                .try_borrow_mut_lamports()? = ctx
                .accounts
                .vault
                .lamports()
                .checked_sub(membership.collateral_deposited)
                .ok_or(DhukutiError::Underflow)?;
            **wallet_info.try_borrow_mut_lamports()? = wallet_info
                .lamports()
                .checked_add(membership.collateral_deposited)
                .ok_or(DhukutiError::Overflow)?;
        }
    }

    require!(
        seen_active_members == circle.active_members_bitmap,
        DhukutiError::InvalidRemainingAccounts
    );

    // Any residual lamports are dust from rounding or undistributed haircuts.
    let residual_lamports = ctx.accounts.vault.lamports();
    if residual_lamports > 0 {
        **ctx
            .accounts
            .vault
            .to_account_info()
            .try_borrow_mut_lamports()? = 0;
        **ctx
            .accounts
            .creator
            .to_account_info()
            .try_borrow_mut_lamports()? = ctx
            .accounts
            .creator
            .lamports()
            .checked_add(residual_lamports)
            .ok_or(DhukutiError::Overflow)?;
    }

    msg!(
        "Circle {} completed | {} residual lamports returned from vault",
        circle.circle_id,
        residual_lamports,
    );

    emit!(CircleCompletedEvent {
        circle: circle.key(),
        creator: circle.creator,
        residual_lamports,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CompleteCircle<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_CIRCLE, creator.key().as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump,
        has_one = creator
    )]
    pub circle: Account<'info, Circle>,

    /// CHECK: Vault PDA owned by this program; holds lamports only.
    #[account(
        mut,
        seeds = [SEED_VAULT, circle.key().as_ref()],
        bump = circle.vault_bump
    )]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
