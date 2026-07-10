use crate::constants::*;
use crate::error::DhukutiError;
use crate::events::CircleCreatedEvent;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

/// Creates a new savings circle, its vault, and its insurance pool PDA.
///
/// The creator sets all terms: contribution amount, cycle duration, member cap,
/// payout curve, collateral and insurance fee rates, and the minimum reputation
/// score required for members to join.
pub fn handler(ctx: Context<CreateCircle>, params: CreateCircleParams) -> Result<()> {
    // ── Parameter validation ─────────────────────────────────────────────────
    require!(
        params.max_members >= 2 && params.max_members <= MAX_MEMBERS,
        DhukutiError::InvalidMaxMembers
    );
    require!(
        params.contribution_amount > 0,
        DhukutiError::ZeroContributionAmount
    );
    require!(
        params.cycle_duration >= MIN_CYCLE_DURATION_SECS
            && params.cycle_duration <= MAX_CYCLE_DURATION_SECS,
        DhukutiError::InvalidCycleDuration
    );
    require!(
        params.collateral_bps >= MIN_COLLATERAL_BPS,
        DhukutiError::CollateralTooLow
    );
    require!(
        params.insurance_fee_bps <= MAX_INSURANCE_FEE_BPS,
        DhukutiError::InsuranceFeeTooHigh
    );
    require!(
        params.reserve_ratio_bps <= BPS_DENOMINATOR,
        DhukutiError::InvalidReserveRatio
    );
    require!(
        ctx.accounts.denom_mint.key() == system_program::ID,
        DhukutiError::UnsupportedDenomMint
    );

    let clock = Clock::get()?;

    let circle = &mut ctx.accounts.circle;
    circle.creator = ctx.accounts.creator.key();
    circle.circle_id = params.circle_id;
    circle.contribution_amount = params.contribution_amount;
    circle.cycle_duration = params.cycle_duration;
    circle.max_members = params.max_members;
    circle.current_members = 0;
    circle.denom_mint = ctx.accounts.denom_mint.key();
    circle.payout_curve = params.payout_curve;
    circle.current_round = 0;
    circle.vault = ctx.accounts.vault.key();
    circle.insurance_pool = ctx.accounts.insurance_pool.key();
    circle.status = CircleStatus::Open;
    circle.min_reputation = params.min_reputation;
    circle.collateral_bps = params.collateral_bps;
    circle.insurance_fee_bps = params.insurance_fee_bps;
    circle.created_at = clock.unix_timestamp;
    circle.started_at = None;
    circle.active_members_bitmap = 0;
    circle.defaults_handled = 0;
    circle.host_reputation_claimed = false;
    circle.bump = ctx.bumps.circle;
    circle.vault_bump = ctx.bumps.vault;
    circle.insurance_bump = ctx.bumps.insurance_pool;

    let insurance = &mut ctx.accounts.insurance_pool;
    insurance.circle = circle.key();
    insurance.balance = 0;
    insurance.total_claims_paid = 0;
    insurance.reserve_ratio_bps = params.reserve_ratio_bps;
    insurance.bump = ctx.bumps.insurance_pool;

    msg!(
        "Circle {} created by {} | {} members | {} lamports/round",
        params.circle_id,
        ctx.accounts.creator.key(),
        params.max_members,
        params.contribution_amount,
    );

    emit!(CircleCreatedEvent {
        circle: circle.key(),
        creator: circle.creator,
        circle_id: circle.circle_id,
        contribution_amount: circle.contribution_amount,
        max_members: circle.max_members,
        payout_curve: circle.payout_curve.clone(),
        insurance_fee_bps: circle.insurance_fee_bps,
        min_reputation: circle.min_reputation,
    });

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateCircleParams {
    pub circle_id: u64,
    pub contribution_amount: u64,
    pub cycle_duration: i64,
    pub max_members: u8,
    pub payout_curve: PayoutCurve,
    pub min_reputation: u64,
    pub collateral_bps: u16,
    pub insurance_fee_bps: u16,
    pub reserve_ratio_bps: u16,
}

#[derive(Accounts)]
#[instruction(params: CreateCircleParams)]
pub struct CreateCircle<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = Circle::LEN,
        seeds = [SEED_CIRCLE, creator.key().as_ref(), &params.circle_id.to_le_bytes()],
        bump
    )]
    pub circle: Account<'info, Circle>,

    /// CHECK: PDA vault that holds contributions and collateral in lamports only.
    /// Initialised with zero data; lamports flow in via system_program transfer CPI
    /// and out via direct lamport manipulation from program-signed instructions.
    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [SEED_VAULT, circle.key().as_ref()],
        bump
    )]
    pub vault: UncheckedAccount<'info>,

    #[account(
        init,
        payer = creator,
        space = InsurancePool::LEN,
        seeds = [SEED_INSURANCE, circle.key().as_ref()],
        bump
    )]
    pub insurance_pool: Account<'info, InsurancePool>,

    /// SPL mint used for contributions. Native SOL is the only supported V1
    /// settlement asset, represented by system_program as an explicit sentinel.
    /// CHECK: Only the pubkey is compared and stored; no deserialization needed.
    pub denom_mint: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
