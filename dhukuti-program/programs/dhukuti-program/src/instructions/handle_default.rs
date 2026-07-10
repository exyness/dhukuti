use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::DefaultHandledEvent;
use crate::state::*;
use anchor_lang::prelude::*;

/// Handles a member default after the round deadline has passed.
///
/// Workflow:
///  1. Slashes the defaulter's collateral from the vault into the InsurancePool.
///  2. The InsurancePool backstops the missing contribution back into the vault
///     so non-defaulting members receive a full payout.
///  3. Marks the defaulter's contribution slot as covered so resolve_round can
///     proceed once all remaining active members have contributed.
///  4. Ejects the defaulter (active = false, clears their bit from the circle's
///     active_members_bitmap so future rounds don't wait for them).
///
/// If the InsurancePool balance is insufficient, a pro-rata haircut is applied:
/// the round pot is funded only up to the available reserve, and the shortfall
/// is logged.  This is the disclosed last-resort behaviour described in the
/// architecture.
pub fn handler(ctx: Context<HandleDefault>) -> Result<()> {
    let clock = Clock::get()?;
    let vault_info = ctx.accounts.vault.to_account_info();
    let insurance_info = ctx.accounts.insurance_pool.to_account_info();
    let circle = &mut ctx.accounts.circle;
    let round = &mut ctx.accounts.round;
    let insurance = &mut ctx.accounts.insurance_pool;
    let membership = &mut ctx.accounts.membership;
    let default_proposal = &mut ctx.accounts.default_proposal;

    // ── Preconditions ────────────────────────────────────────────────────────
    require!(
        circle.status == CircleStatus::Active,
        DhukutiError::CircleNotActive
    );
    require!(!round.resolved, DhukutiError::RoundAlreadyResolved);
    require!(
        round.index == circle.current_round,
        DhukutiError::RoundIndexMismatch
    );
    require!(membership.active, DhukutiError::MemberInactive);
    require!(
        membership.circle == circle.key(),
        DhukutiError::MembershipCircleMismatch
    );
    require!(
        !default_proposal.resolved,
        DhukutiError::DefaultProposalAlreadyResolved
    );
    require!(
        default_proposal.circle == circle.key()
            && default_proposal.round == round.key()
            && default_proposal.member == membership.member
            && default_proposal.round_index == round.index,
        DhukutiError::MembershipCircleMismatch
    );

    // Deadline must have passed.
    require!(
        clock.unix_timestamp >= round.deadline_ts,
        DhukutiError::DeadlineNotReached
    );

    // Member must not have contributed yet.
    let bit: u64 = 1u64
        .checked_shl(membership.join_order as u32)
        .ok_or(DhukutiError::Overflow)?;
    require!(
        round.contributions_bitmap & bit == 0,
        DhukutiError::AlreadyContributed // reusing: already covered → this would be a double-handle
    );

    let eligible_voters = circle.active_members_bitmap & !bit;
    let approval_count = (default_proposal.approvals_bitmap & eligible_voters).count_ones();
    let approval_threshold = (eligible_voters.count_ones() / 2) + 1;
    let approved = approval_count >= approval_threshold;
    let grace_expired = clock.unix_timestamp >= default_proposal.grace_deadline_ts;
    require!(
        approved || grace_expired,
        DhukutiError::DefaultProposalNotReady
    );

    // ── 1. Slash collateral: vault → insurance pool ───────────────────────────
    let collateral = membership.collateral_deposited;
    if collateral > 0 {
        **vault_info.try_borrow_mut_lamports()? = vault_info
            .lamports()
            .checked_sub(collateral)
            .ok_or(DhukutiError::Underflow)?;
        **insurance_info.try_borrow_mut_lamports()? = insurance_info
            .lamports()
            .checked_add(collateral)
            .ok_or(DhukutiError::Overflow)?;
        insurance.balance = insurance
            .balance
            .checked_add(collateral)
            .ok_or(DhukutiError::Overflow)?;
    }

    // ── 2. Backstop shortfall: insurance pool → vault ─────────────────────────
    let shortfall = circle.contribution_amount;
    let backstop = shortfall.min(insurance.balance);
    let haircut = shortfall.saturating_sub(backstop);

    if backstop > 0 {
        **insurance_info.try_borrow_mut_lamports()? = insurance_info
            .lamports()
            .checked_sub(backstop)
            .ok_or(DhukutiError::Underflow)?;
        **vault_info.try_borrow_mut_lamports()? = vault_info
            .lamports()
            .checked_add(backstop)
            .ok_or(DhukutiError::Overflow)?;
        insurance.balance = insurance
            .balance
            .checked_sub(backstop)
            .ok_or(DhukutiError::Underflow)?;
        insurance.total_claims_paid = insurance
            .total_claims_paid
            .checked_add(backstop)
            .ok_or(DhukutiError::Overflow)?;
    }

    // ── 3. Mark slot as covered in round bitmap ────────────────────────────────
    // Use the net backstop as the contributed amount so pot_total reflects reality.
    // If insurance was depleted (backstop < shortfall), pot will be short.
    let net_to_pot = backstop
        .checked_sub(
            // subtract insurance fee that would have been taken from a real contribution
            (backstop as u128)
                .checked_mul(circle.insurance_fee_bps as u128)
                .and_then(|v| v.checked_div(BPS_DENOMINATOR as u128))
                .ok_or(DhukutiError::Overflow)? as u64,
        )
        .ok_or(DhukutiError::Underflow)?;

    round.contributions_bitmap |= bit;
    round.pot_total = round
        .pot_total
        .checked_add(net_to_pot)
        .ok_or(DhukutiError::Overflow)?;

    if haircut > 0 {
        msg!(
            "Insurance pool depleted — pro-rata haircut of {} lamports in round {} of circle {}",
            haircut,
            round.index,
            circle.circle_id,
        );
    }

    // ── 4. Eject defaulter ────────────────────────────────────────────────────
    membership.rounds_missed = membership.rounds_missed.saturating_add(1);
    membership.active = false;

    // Remove from circle's active bitmap so future rounds don't require their bit.
    circle.active_members_bitmap &= !bit;
    circle.defaults_handled = circle
        .defaults_handled
        .checked_add(1)
        .ok_or(DhukutiError::Overflow)?;
    default_proposal.resolved = true;

    msg!(
        "Member {} defaulted in round {} of circle {} | slashed: {} | backstop: {}",
        membership.member,
        round.index,
        circle.circle_id,
        collateral,
        backstop,
    );

    emit!(DefaultHandledEvent {
        circle: circle.key(),
        round: round.key(),
        member: membership.member,
        round_index: round.index,
        collateral_slashed: collateral,
        insurance_backstop: backstop,
        haircut,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct HandleDefault<'info> {
    /// Anyone can crank a default after the deadline passes.
    pub cranker: Signer<'info>,

    #[account(
        mut,
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
        seeds = [SEED_ROUND, circle.key().as_ref(), &circle.current_round.to_le_bytes()],
        bump = round.bump
    )]
    pub round: Account<'info, Round>,

    #[account(
        mut,
        seeds = [
            SEED_MEMBERSHIP,
            circle.key().as_ref(),
            defaulting_member.key().as_ref()
        ],
        bump = membership.bump,
        constraint = membership.member == defaulting_member.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub membership: Account<'info, Membership>,

    /// CHECK: The wallet of the member being defaulted; verified via membership constraint.
    pub defaulting_member: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [SEED_DEFAULT_PROPOSAL, circle.key().as_ref(), round.key().as_ref(), defaulting_member.key().as_ref()],
        bump = default_proposal.bump
    )]
    pub default_proposal: Account<'info, DefaultProposal>,
}
