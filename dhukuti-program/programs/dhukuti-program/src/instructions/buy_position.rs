use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::PositionBoughtEvent;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::ID as TOKEN_PROGRAM_ID;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

/// Buys an escrowed Position NFT and moves future obligations to the buyer.
///
/// The old seller membership is deactivated, while a new buyer membership keeps
/// the same join_order, contribution history, collateral claim, and Position NFT
/// mint. Future contribution and payout checks therefore use the buyer's wallet.
pub fn handler(ctx: Context<BuyPosition>) -> Result<()> {
    require!(ctx.accounts.listing.active, DhukutiError::ListingInactive);
    require!(
        ctx.accounts.seller.key() == ctx.accounts.listing.seller,
        DhukutiError::MembershipCircleMismatch
    );
    require!(
        ctx.accounts.buyer.key() != ctx.accounts.seller.key(),
        DhukutiError::CannotBuyOwnListing
    );
    require!(
        ctx.accounts.seller_membership.active,
        DhukutiError::MemberInactive
    );

    system_program::transfer(
        CpiContext::new(
            system_program::ID,
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.seller.to_account_info(),
            },
        ),
        ctx.accounts.listing.ask_price,
    )?;

    let circle_key = ctx.accounts.circle.key();
    let seller_membership_key = ctx.accounts.seller_membership.key();
    let listing_seeds: &[&[&[u8]]] = &[&[
        SEED_LISTING,
        circle_key.as_ref(),
        seller_membership_key.as_ref(),
        &[ctx.accounts.listing.bump],
    ]];

    token::transfer(
        CpiContext::new_with_signer(
            TOKEN_PROGRAM_ID,
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.buyer_position_token_account.to_account_info(),
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

    let seller_membership = &mut ctx.accounts.seller_membership;
    let buyer_membership = &mut ctx.accounts.buyer_membership;

    buyer_membership.circle = seller_membership.circle;
    buyer_membership.member = ctx.accounts.buyer.key();
    buyer_membership.join_order = seller_membership.join_order;
    buyer_membership.collateral_deposited = seller_membership.collateral_deposited;
    buyer_membership.contributions_bitmap = seller_membership.contributions_bitmap;
    buyer_membership.rounds_missed = seller_membership.rounds_missed;
    buyer_membership.position_nft_mint = seller_membership.position_nft_mint;
    buyer_membership.active = true;
    buyer_membership.completion_reputation_claimed =
        seller_membership.completion_reputation_claimed;
    buyer_membership.default_reputation_claimed = seller_membership.default_reputation_claimed;
    buyer_membership.bump = ctx.bumps.buyer_membership;

    seller_membership.active = false;
    seller_membership.collateral_deposited = 0;

    ctx.accounts.listing.active = false;

    msg!(
        "Position {} bought by {} from {} for {} lamports",
        ctx.accounts.position_nft_mint.key(),
        ctx.accounts.buyer.key(),
        ctx.accounts.seller.key(),
        ctx.accounts.listing.ask_price,
    );

    emit!(PositionBoughtEvent {
        circle: ctx.accounts.circle.key(),
        listing: ctx.accounts.listing.key(),
        seller: ctx.accounts.seller.key(),
        buyer: ctx.accounts.buyer.key(),
        position_nft_mint: ctx.accounts.position_nft_mint.key(),
        ask_price: ctx.accounts.listing.ask_price,
        join_order: buyer_membership.join_order,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct BuyPosition<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Seller receives SOL and rent refunds; identity is fixed by listing.seller.
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,

    #[account(
        seeds = [SEED_CIRCLE, circle.creator.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump
    )]
    pub circle: Box<Account<'info, Circle>>,

    #[account(
        mut,
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), seller.key().as_ref()],
        bump = seller_membership.bump,
        constraint = seller_membership.member == seller.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub seller_membership: Box<Account<'info, Membership>>,

    #[account(
        mut,
        close = seller,
        seeds = [SEED_LISTING, circle.key().as_ref(), seller_membership.key().as_ref()],
        bump = listing.bump,
        has_one = circle,
        constraint = listing.membership == seller_membership.key() @ DhukutiError::MembershipCircleMismatch
    )]
    pub listing: Box<Account<'info, Listing>>,

    #[account(
        init,
        payer = buyer,
        space = Membership::LEN,
        seeds = [SEED_MEMBERSHIP, circle.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub buyer_membership: Box<Account<'info, Membership>>,

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
        init,
        payer = buyer,
        token::mint = position_nft_mint,
        token::authority = buyer,
    )]
    pub buyer_position_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
