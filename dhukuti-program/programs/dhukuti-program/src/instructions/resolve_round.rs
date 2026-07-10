use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::RoundResolvedEvent;
use crate::state::*;
use anchor_lang::prelude::*;

/// Resolves the current round and opens the next one.
///
/// Requires all active members to have contributed or been covered by the
/// default handler. FixedOrder pays the member whose join_order matches the
/// round. DutchAuction pays the accepted bidder less the clearing discount;
/// that discount is split between the insurance pool and the remaining active
/// members.
///
/// `next_round_index` must equal `circle.current_round + 1`.  Passing it as
/// an instruction argument lets Anchor derive the next Round PDA address
/// without arithmetic inside the seeds constraint.
pub fn handler<'info>(
    ctx: Context<'info, ResolveRound<'info>>,
    next_round_index: u16,
) -> Result<()> {
    let circle = &mut ctx.accounts.circle;
    let round = &mut ctx.accounts.round;

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

    // All active members must have contributed (or had their round covered by handle_default).
    // Using active_members_bitmap means ejected members don't block resolution.
    let required_mask = circle.active_members_bitmap;
    require!(
        round.contributions_bitmap & required_mask == required_mask,
        DhukutiError::RoundNotFullyFunded
    );

    // ── Determine recipient and payout by curve ──────────────────────────────
    let recipient_key = ctx.accounts.recipient.key();
    let (payout, insurance_share, member_discount_share) = match circle.payout_curve {
        PayoutCurve::FixedOrder => {
            require!(
                ctx.accounts.recipient_membership.join_order == circle.current_round as u8,
                DhukutiError::RecipientNotFound
            );
            require!(
                ctx.accounts.recipient_membership.member == recipient_key,
                DhukutiError::RecipientNotFound
            );
            require!(
                ctx.accounts.recipient_membership.circle == circle.key(),
                DhukutiError::MembershipCircleMismatch
            );
            (round.pot_total, 0, 0)
        }
        PayoutCurve::DutchAuction => {
            let winner = round
                .auction_winner
                .ok_or(DhukutiError::NoDutchAuctionBid)?;
            require!(winner == recipient_key, DhukutiError::RecipientNotFound);
            require!(
                ctx.accounts.recipient_membership.member == recipient_key,
                DhukutiError::RecipientNotFound
            );
            require!(
                ctx.accounts.recipient_membership.circle == circle.key(),
                DhukutiError::MembershipCircleMismatch
            );
            require!(
                ctx.accounts.recipient_membership.active,
                DhukutiError::MemberInactive
            );
            let winner_bit = 1u64
                .checked_shl(ctx.accounts.recipient_membership.join_order as u32)
                .ok_or(DhukutiError::Overflow)?;
            let expected_remaining_members = circle.active_members_bitmap & !winner_bit;

            let discount = bps_amount(round.pot_total, round.auction_discount_bps)?;
            let insurance_share = bps_amount(discount, DUTCH_AUCTION_INSURANCE_SPLIT_BPS)?;
            let member_discount_share = discount
                .checked_sub(insurance_share)
                .ok_or(DhukutiError::Underflow)?;

            if insurance_share > 0 {
                move_lamports(
                    &ctx.accounts.vault.to_account_info(),
                    &ctx.accounts.insurance_pool.to_account_info(),
                    insurance_share,
                )?;
                ctx.accounts.insurance_pool.balance = ctx
                    .accounts
                    .insurance_pool
                    .balance
                    .checked_add(insurance_share)
                    .ok_or(DhukutiError::Overflow)?;
            }

            distribute_member_discount(
                ctx.remaining_accounts,
                circle.key(),
                recipient_key,
                expected_remaining_members,
                member_discount_share,
                &ctx.accounts.vault.to_account_info(),
            )?;

            (
                round
                    .pot_total
                    .checked_sub(discount)
                    .ok_or(DhukutiError::Underflow)?,
                insurance_share,
                member_discount_share,
            )
        }
        PayoutCurve::VrfLottery => return err!(DhukutiError::UnsupportedPayoutCurve),
    };

    // ── Transfer pot: vault → recipient (direct lamport manipulation) ────────
    move_lamports(
        &ctx.accounts.vault.to_account_info(),
        &ctx.accounts.recipient.to_account_info(),
        payout,
    )?;

    // ── Mark round resolved ───────────────────────────────────────────────────
    round.recipient = Some(recipient_key);
    round.resolved = true;

    msg!(
        "Round {} of circle {} resolved | {} lamports paid to {}",
        round.index,
        circle.circle_id,
        payout,
        recipient_key,
    );

    emit!(RoundResolvedEvent {
        circle: circle.key(),
        round: round.key(),
        round_index: round.index,
        recipient: recipient_key,
        payout,
        insurance_share,
        member_discount_share,
    });

    // ── Advance circle state and open next round ──────────────────────────────
    let computed_next = circle
        .current_round
        .checked_add(1)
        .ok_or(DhukutiError::Overflow)?;
    require!(
        next_round_index == computed_next,
        DhukutiError::RoundIndexMismatch
    );

    circle.current_round = next_round_index;

    if next_round_index < circle.current_members as u16 {
        let clock = Clock::get()?;
        let next_round = &mut ctx.accounts.next_round;
        next_round.circle = circle.key();
        next_round.index = next_round_index;
        next_round.contributions_bitmap = 0;
        next_round.pot_total = 0;
        next_round.recipient = None;
        next_round.deadline_ts = clock
            .unix_timestamp
            .checked_add(circle.cycle_duration)
            .ok_or(DhukutiError::Overflow)?;
        next_round.auction_winner = None;
        next_round.auction_discount_bps = 0;
        next_round.resolved = false;
        next_round.bump = ctx.bumps.next_round;

        msg!(
            "Round {} opened | deadline: {}",
            next_round_index,
            next_round.deadline_ts,
        );
    }

    Ok(())
}

fn bps_amount(amount: u64, bps: u16) -> Result<u64> {
    Ok((amount as u128)
        .checked_mul(bps as u128)
        .and_then(|v| v.checked_div(BPS_DENOMINATOR as u128))
        .ok_or(DhukutiError::Overflow)? as u64)
}

fn move_lamports<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }

    let from_balance = from.lamports();
    let to_balance = to.lamports();

    **from.try_borrow_mut_lamports()? = from_balance
        .checked_sub(amount)
        .ok_or(DhukutiError::Underflow)?;
    **to.try_borrow_mut_lamports()? = to_balance
        .checked_add(amount)
        .ok_or(DhukutiError::Overflow)?;

    Ok(())
}

fn distribute_member_discount<'info>(
    remaining_accounts: &'info [AccountInfo<'info>],
    circle: Pubkey,
    winner: Pubkey,
    expected_remaining_members: u64,
    member_share: u64,
    vault: &AccountInfo<'info>,
) -> Result<()> {
    if member_share == 0 {
        require!(
            remaining_accounts.is_empty(),
            DhukutiError::InvalidRemainingAccounts
        );
        return Ok(());
    }

    require!(
        remaining_accounts.len() % 2 == 0,
        DhukutiError::InvalidRemainingAccounts
    );

    let member_count = remaining_accounts.len() / 2;
    require!(member_count > 0, DhukutiError::InvalidRemainingAccounts);
    require!(
        member_count as u32 == expected_remaining_members.count_ones(),
        DhukutiError::InvalidRemainingAccounts
    );

    let base_share = member_share
        .checked_div(member_count as u64)
        .ok_or(DhukutiError::Underflow)?;
    let mut remainder = member_share
        .checked_rem(member_count as u64)
        .ok_or(DhukutiError::Underflow)?;
    let mut seen_members = 0u64;

    for pair in remaining_accounts.chunks(2) {
        let wallet_info = &pair[0];
        let membership_info = &pair[1];
        let membership: Account<Membership> = Account::try_from(membership_info)?;

        require!(
            wallet_info.is_writable,
            DhukutiError::InvalidRemainingMember
        );
        require!(membership.active, DhukutiError::MemberInactive);
        require!(
            membership.circle == circle,
            DhukutiError::MembershipCircleMismatch
        );
        require!(
            membership.member == wallet_info.key(),
            DhukutiError::MembershipCircleMismatch
        );
        require!(
            membership.member != winner,
            DhukutiError::InvalidRemainingMember
        );

        let bit = 1u64
            .checked_shl(membership.join_order as u32)
            .ok_or(DhukutiError::Overflow)?;
        require!(
            seen_members & bit == 0,
            DhukutiError::InvalidRemainingAccounts
        );
        seen_members |= bit;

        let extra = if remainder > 0 {
            remainder = remainder.checked_sub(1).ok_or(DhukutiError::Underflow)?;
            1
        } else {
            0
        };
        let share = base_share
            .checked_add(extra)
            .ok_or(DhukutiError::Overflow)?;
        move_lamports(vault, wallet_info, share)?;
    }

    require!(
        seen_members == expected_remaining_members,
        DhukutiError::InvalidRemainingAccounts
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(next_round_index: u16)]
pub struct ResolveRound<'info> {
    /// Anyone can crank round resolution once all contributions are in.
    #[account(mut)]
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

    /// The member scheduled to receive the payout this round.
    /// CHECK: Pubkey verified against recipient_membership.member in handler.
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), recipient.key().as_ref()],
        bump = recipient_membership.bump
    )]
    pub recipient_membership: Account<'info, Membership>,

    /// Next round PDA — always initialised so the instruction remains atomic.
    /// On the final round this PDA is created but unused; the cranker's
    /// rent is reclaimed indirectly when the circle is closed.
    #[account(
        init,
        payer = cranker,
        space = Round::LEN,
        seeds = [SEED_ROUND, circle.key().as_ref(), &next_round_index.to_le_bytes()],
        bump
    )]
    pub next_round: Account<'info, Round>,

    pub system_program: Program<'info, System>,
}
