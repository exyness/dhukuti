use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::PositionListedEvent;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::ID as TOKEN_PROGRAM_ID;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

/// Lists a payout Position NFT by moving it into program escrow.
///
/// Escrow custody matters because a listing that only points to the seller's
/// wallet can be invalidated by an out-of-band token transfer before purchase.
pub fn handler(ctx: Context<ListPosition>, ask_price: u64) -> Result<()> {
    require!(ask_price > 0, DhukutiError::InvalidAskPrice);
    require!(
        ctx.accounts.circle.status == CircleStatus::Active,
        DhukutiError::CircleNotActive
    );
    require!(ctx.accounts.membership.active, DhukutiError::MemberInactive);
    require!(
        ctx.accounts.seller_position_token_account.amount == 1,
        DhukutiError::InvalidPositionOwner
    );

    let listing = &mut ctx.accounts.listing;
    listing.circle = ctx.accounts.circle.key();
    listing.seller = ctx.accounts.seller.key();
    listing.membership = ctx.accounts.membership.key();
    listing.position_nft_mint = ctx.accounts.position_nft_mint.key();
    listing.escrow_token_account = ctx.accounts.escrow_token_account.key();
    listing.ask_price = ask_price;
    listing.active = true;
    listing.bump = ctx.bumps.listing;
    listing.escrow_bump = ctx.bumps.escrow_token_account;

    token::transfer(
        CpiContext::new(
            TOKEN_PROGRAM_ID,
            Transfer {
                from: ctx.accounts.seller_position_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        ),
        1,
    )?;

    msg!(
        "Position {} listed by {} for {} lamports",
        listing.position_nft_mint,
        listing.seller,
        ask_price,
    );

    emit!(PositionListedEvent {
        circle: listing.circle,
        listing: listing.key(),
        seller: listing.seller,
        position_nft_mint: listing.position_nft_mint,
        ask_price: listing.ask_price,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct ListPosition<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Account<'info, Circle>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), seller.key().as_ref()],
        bump = membership.bump,
        constraint = membership.member == seller.key() @ DhukutiError::MembershipCircleMismatch,
        constraint = membership.circle == circle.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub membership: Account<'info, Membership>,

    #[account(
        constraint = position_nft_mint.key() == membership.position_nft_mint @ DhukutiError::InvalidPositionMint
    )]
    pub position_nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = position_nft_mint,
        token::authority = seller,
    )]
    pub seller_position_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = seller,
        space = Listing::LEN,
        seeds = [SEED_LISTING, circle.key().as_ref(), membership.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,

    #[account(
        init,
        payer = seller,
        token::mint = position_nft_mint,
        token::authority = listing,
        seeds = [SEED_LISTING_ESCROW, listing.key().as_ref()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
