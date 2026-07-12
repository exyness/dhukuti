pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("FrVMUmF1maCCiCZaVAkGn9mT69kQ5Hbgd9sUvzfmsgvs");

#[program]
pub mod dhukuti_program {
    use super::*;

    pub fn create_circle(ctx: Context<CreateCircle>, params: CreateCircleParams) -> Result<()> {
        create_circle::handler(ctx, params)
    }

    pub fn join_circle(ctx: Context<JoinCircle>) -> Result<()> {
        join_circle::handler(ctx)
    }

    pub fn start_circle(ctx: Context<StartCircle>) -> Result<()> {
        start_circle::handler(ctx)
    }

    pub fn contribute(ctx: Context<Contribute>) -> Result<()> {
        contribute::handler(ctx)
    }

    pub fn update_reputation(ctx: Context<UpdateReputation>, event: ReputationEvent) -> Result<()> {
        update_reputation::handler(ctx, event)
    }

    pub fn claim_host_reputation(ctx: Context<ClaimHostReputation>) -> Result<()> {
        claim_host_reputation::handler(ctx)
    }

    pub fn vouch_member(ctx: Context<VouchMember>, stake_lamports: u64) -> Result<()> {
        vouch_member::handler(ctx, stake_lamports)
    }

    pub fn release_vouch(ctx: Context<ReleaseVouch>) -> Result<()> {
        release_vouch::handler(ctx)
    }

    pub fn slash_vouch(ctx: Context<SlashVouch>) -> Result<()> {
        slash_vouch::handler(ctx)
    }

    pub fn open_default_proposal(ctx: Context<OpenDefaultProposal>) -> Result<()> {
        open_default_proposal::handler(ctx)
    }

    pub fn vote_default(ctx: Context<VoteDefault>, approve: bool) -> Result<()> {
        vote_default::handler(ctx, approve)
    }

    pub fn list_position(ctx: Context<ListPosition>, ask_price: u64) -> Result<()> {
        list_position::handler(ctx, ask_price)
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        cancel_listing::handler(ctx)
    }

    pub fn buy_position(ctx: Context<BuyPosition>) -> Result<()> {
        buy_position::handler(ctx)
    }

    pub fn place_dutch_bid(ctx: Context<PlaceDutchBid>) -> Result<()> {
        place_dutch_bid::handler(ctx)
    }

    pub fn handle_default(ctx: Context<HandleDefault>) -> Result<()> {
        handle_default::handler(ctx)
    }

    pub fn resolve_round<'info>(
        ctx: Context<'info, ResolveRound<'info>>,
        next_round_index: u16,
    ) -> Result<()> {
        resolve_round::handler(ctx, next_round_index)
    }

    pub fn complete_circle(ctx: Context<CompleteCircle>) -> Result<()> {
        complete_circle::handler(ctx)
    }
}
