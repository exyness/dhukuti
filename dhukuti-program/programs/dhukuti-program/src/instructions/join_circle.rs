use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::MemberJoinedEvent;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::ID as TOKEN_PROGRAM_ID;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
/// Adds a member to an open circle.
///
/// On success:
///  1. A Membership PDA is initialised for the (circle, member) pair.
///  2. A 1-of-1 SPL Position NFT is minted to the member's token account.
///     The NFT represents "the right to receive payout in round <join_order>
///     of this circle."  The mint authority is the circle PDA; supply is fixed
///     at 1 (0 decimals).
///  3. The member's collateral (collateral_bps % of contribution_amount) is
///     transferred to the vault.
pub fn handler(ctx: Context<JoinCircle>) -> Result<()> {
    let circle_info = ctx.accounts.circle.to_account_info();
    let circle = &mut ctx.accounts.circle;

    // ── Pre-conditions ───────────────────────────────────────────────────────
    require!(
        circle.status == CircleStatus::Open,
        DhukutiError::CircleNotOpen
    );
    require!(
        circle.current_members < circle.max_members,
        DhukutiError::CircleFull
    );

    // ── Reputation gate ───────────────────────────────────────────────────────
    if circle.min_reputation > 0 {
        let rep_score = match &ctx.accounts.reputation {
            Some(rep) => rep.score,
            None => 0,
        };
        require!(
            rep_score >= circle.min_reputation,
            DhukutiError::ReputationTooLow
        );
    }

    // ── Collateral transfer (member → vault) ─────────────────────────────────
    let collateral_amount = (circle.contribution_amount as u128)
        .checked_mul(circle.collateral_bps as u128)
        .and_then(|v| v.checked_div(BPS_DENOMINATOR as u128))
        .ok_or(DhukutiError::Overflow)? as u64;

    require!(
        ctx.accounts.member.lamports() >= collateral_amount,
        DhukutiError::InsufficientCollateral
    );

    system_program::transfer(
        CpiContext::new(
            system_program::ID,
            system_program::Transfer {
                from: ctx.accounts.member.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        collateral_amount,
    )?;

    // ── Mint Position NFT ────────────────────────────────────────────────────
    // The NFT mint is a PDA so the circle account acts as mint authority
    // via signer seeds.
    let circle_key = circle.key();
    let circle_signer_seeds: &[&[&[u8]]] = &[&[
        SEED_CIRCLE,
        circle.creator.as_ref(),
        &circle.circle_id.to_le_bytes(),
        &[circle.bump],
    ]];

    // Initialize the mint (0 decimals, mint authority = circle PDA).
    // The mint account is initialised by Anchor via the `init` constraint.
    // We then mint exactly 1 token to the member's provided token account.
    token::mint_to(
        CpiContext::new_with_signer(
            TOKEN_PROGRAM_ID,
            MintTo {
                mint: ctx.accounts.position_nft_mint.to_account_info(),
                to: ctx.accounts.member_token_account.to_account_info(),
                authority: circle_info,
            },
            circle_signer_seeds,
        ),
        1,
    )?;

    // ── Membership PDA ───────────────────────────────────────────────────────
    let join_order = circle.current_members;

    let membership = &mut ctx.accounts.membership;
    membership.circle = circle_key;
    membership.member = ctx.accounts.member.key();
    membership.join_order = join_order;
    membership.collateral_deposited = collateral_amount;
    membership.contributions_bitmap = 0;
    membership.rounds_missed = 0;
    membership.position_nft_mint = ctx.accounts.position_nft_mint.key();
    membership.active = true;
    membership.completion_reputation_claimed = false;
    membership.default_reputation_claimed = false;
    membership.bump = ctx.bumps.membership;

    circle.current_members = circle
        .current_members
        .checked_add(1)
        .ok_or(DhukutiError::Overflow)?;
    // Set the member's bit in the active bitmap.
    circle.active_members_bitmap |= 1u64
        .checked_shl(join_order as u32)
        .ok_or(DhukutiError::Overflow)?;

    msg!(
        "Member {} joined circle {} as member #{} | collateral: {} lamports",
        ctx.accounts.member.key(),
        circle_key,
        join_order,
        collateral_amount,
    );

    emit!(MemberJoinedEvent {
        circle: circle_key,
        member: membership.member,
        join_order,
        collateral_deposited: collateral_amount,
        position_nft_mint: membership.position_nft_mint,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct JoinCircle<'info> {
    #[account(mut)]
    pub member: Signer<'info>,

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
        init,
        payer = member,
        space = Membership::LEN,
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), member.key().as_ref()],
        bump
    )]
    pub membership: Account<'info, Membership>,

    /// 1-of-1 NFT mint PDA. Deterministically derived per (circle, member);
    /// the circle PDA is the mint authority.
    #[account(
        init,
        payer = member,
        mint::decimals = 0,
        mint::authority = circle,
        seeds = [SEED_POSITION_NFT, circle.key().as_ref(), member.key().as_ref()],
        bump
    )]
    pub position_nft_mint: Account<'info, Mint>,

    /// Member's token account that will hold the 1 Position NFT token.
    #[account(
        init,
        payer = member,
        token::mint = position_nft_mint,
        token::authority = member,
    )]
    pub member_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    /// Optional reputation PDA for the joining member.
    /// Must be provided when circle.min_reputation > 0; can be omitted otherwise.
    #[account(
        seeds = [SEED_REPUTATION, member.key().as_ref()],
        bump
    )]
    pub reputation: Option<Account<'info, Reputation>>,
}
