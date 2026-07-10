use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::ListingCancelledEvent;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::ID as TOKEN_PROGRAM_ID;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

/// Cancels an active listing and returns the escrowed Position NFT to the seller.
pub fn handler(ctx: Context<CancelListing>) -> Result<()> {
    require!(ctx.accounts.listing.active, DhukutiError::ListingInactive);

    let circle_key = ctx.accounts.circle.key();
    let membership_key = ctx.accounts.membership.key();
    let listing_seeds: &[&[&[u8]]] = &[&[
        SEED_LISTING,
        circle_key.as_ref(),
        membership_key.as_ref(),
        &[ctx.accounts.listing.bump],
    ]];

    token::transfer(
        CpiContext::new_with_signer(
            TOKEN_PROGRAM_ID,
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.seller_position_token_account.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            listing_seeds,
        ),
        1,
    )?;

    token::close_account(CpiContext::new_with_signer(
        TOKEN_PROGRAM_ID,
        CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.seller.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        },
        listing_seeds,
    ))?;

    ctx.accounts.listing.active = false;

    emit!(ListingCancelledEvent {
        circle: ctx.accounts.circle.key(),
        listing: ctx.accounts.listing.key(),
        seller: ctx.accounts.seller.key(),
        position_nft_mint: ctx.accounts.position_nft_mint.key(),
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Box<Account<'info, Circle>>,

    #[account(
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), seller.key().as_ref()],
        bump = membership.bump,
        constraint = membership.member == seller.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub membership: Box<Account<'info, Membership>>,

    #[account(
        mut,
        close = seller,
        seeds = [SEED_LISTING, circle.key().as_ref(), membership.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
        has_one = circle,
        has_one = membership
    )]
    pub listing: Box<Account<'info, Listing>>,

    #[account(
        constraint = position_nft_mint.key() == listing.position_nft_mint @ DhukutiError::InvalidPositionMint
    )]
    pub position_nft_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [SEED_LISTING_ESCROW, listing.key().as_ref()],
        bump = listing.escrow_bump,
        token::mint = position_nft_mint,
        token::authority = listing,
    )]
    pub escrow_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        token::mint = position_nft_mint,
        token::authority = seller,
    )]
    pub seller_position_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}
