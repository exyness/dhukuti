#![cfg(test)]

use anchor_lang::{
    prelude::{Clock, Pubkey},
    solana_program::instruction::{AccountMeta, Instruction},
    AccountDeserialize, InstructionData,
};
use anchor_spl::token::TokenAccount;
use dhukuti_program::{
    self, instruction as ix_data, Circle, CircleStatus, CreateCircleParams, DefaultProposal,
    InsurancePool, Membership, PayoutCurve, Reputation, ReputationEvent, Round, Vouch,
};
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_transaction::Transaction;

fn sol(n: f64) -> u64 {
    (n * 1_000_000_000.0) as u64
}

fn bps(amount: u64, bps: u16) -> u64 {
    ((amount as u128) * (bps as u128) / 10_000) as u64
}

const SEED_CIRCLE: &[u8] = b"circle";
const SEED_VAULT: &[u8] = b"vault";
const SEED_INSURANCE: &[u8] = b"insurance";
const SEED_MEMBERSHIP: &[u8] = b"membership";
const SEED_ROUND: &[u8] = b"round";
const SEED_REPUTATION: &[u8] = b"reputation";
const SEED_POSITION_NFT: &[u8] = b"position_nft";
const SEED_LISTING: &[u8] = b"listing";
const SEED_LISTING_ESCROW: &[u8] = b"listing_escrow";
const SEED_VOUCH: &[u8] = b"vouch";
const SEED_DEFAULT_PROPOSAL: &[u8] = b"default_proposal";

const TOKEN_PROGRAM_ID: Pubkey = anchor_spl::token::ID;
const SYSTEM_PROGRAM_ID: Pubkey = anchor_lang::solana_program::system_program::ID;
const RENT_SYSVAR_ID: Pubkey = Pubkey::new_from_array([
    6, 167, 213, 23, 25, 44, 92, 81, 33, 140, 201, 76, 61, 74, 241, 127, 88, 218, 238, 8, 155, 161,
    253, 68, 227, 219, 217, 138, 0, 0, 0, 0,
]);

fn circle_pda(creator: &Pubkey, circle_id: u64) -> Pubkey {
    Pubkey::find_program_address(
        &[SEED_CIRCLE, creator.as_ref(), &circle_id.to_le_bytes()],
        &dhukuti_program::ID,
    )
    .0
}

fn vault_pda(circle: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[SEED_VAULT, circle.as_ref()], &dhukuti_program::ID).0
}

fn insurance_pda(circle: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[SEED_INSURANCE, circle.as_ref()], &dhukuti_program::ID).0
}

fn membership_pda(circle: &Pubkey, member: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[SEED_MEMBERSHIP, circle.as_ref(), member.as_ref()],
        &dhukuti_program::ID,
    )
    .0
}

fn round_pda(circle: &Pubkey, index: u16) -> Pubkey {
    Pubkey::find_program_address(
        &[SEED_ROUND, circle.as_ref(), &index.to_le_bytes()],
        &dhukuti_program::ID,
    )
    .0
}

fn reputation_pda(wallet: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[SEED_REPUTATION, wallet.as_ref()], &dhukuti_program::ID).0
}

fn position_nft_pda(circle: &Pubkey, member: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[SEED_POSITION_NFT, circle.as_ref(), member.as_ref()],
        &dhukuti_program::ID,
    )
    .0
}

fn listing_pda(circle: &Pubkey, membership: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[SEED_LISTING, circle.as_ref(), membership.as_ref()],
        &dhukuti_program::ID,
    )
    .0
}

fn listing_escrow_pda(listing: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[SEED_LISTING_ESCROW, listing.as_ref()],
        &dhukuti_program::ID,
    )
    .0
}

fn vouch_pda(circle: &Pubkey, voucher: &Pubkey, candidate: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            SEED_VOUCH,
            circle.as_ref(),
            voucher.as_ref(),
            candidate.as_ref(),
        ],
        &dhukuti_program::ID,
    )
    .0
}

fn default_proposal_pda(circle: &Pubkey, round: &Pubkey, defaulting_member: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            SEED_DEFAULT_PROPOSAL,
            circle.as_ref(),
            round.as_ref(),
            defaulting_member.as_ref(),
        ],
        &dhukuti_program::ID,
    )
    .0
}

struct Env {
    svm: LiteSVM,
}

impl Env {
    fn new() -> Self {
        let mut svm = LiteSVM::new();
        svm.add_program_from_file(
            dhukuti_program::ID,
            "../../target/deploy/dhukuti_program.so",
        )
        .expect("deploy program - run `anchor build` first");
        Self { svm }
    }

    fn funded(&mut self, lamports: u64) -> Keypair {
        let kp = Keypair::new();
        self.svm.airdrop(&kp.pubkey(), lamports).unwrap();
        kp
    }

    fn send(&mut self, ixs: &[Instruction], signers: &[&Keypair]) -> Result<(), String> {
        let blockhash = self.svm.latest_blockhash();
        let payer = signers[0].pubkey();
        let msg = Message::new(ixs, Some(&payer));
        let mut tx = Transaction::new_unsigned(msg);
        tx.sign(signers, blockhash);
        self.svm
            .send_transaction(tx)
            .map(|_| ())
            .map_err(|e| format!("{e:?}"))
    }

    fn get<T: AccountDeserialize>(&self, key: &Pubkey) -> T {
        let account = self.svm.get_account(key).expect("account exists");
        let mut data: &[u8] = &account.data;
        T::try_deserialize(&mut data).expect("deserialize account")
    }

    fn lamports(&self, key: &Pubkey) -> u64 {
        self.svm.get_account(key).map(|a| a.lamports).unwrap_or(0)
    }

    fn warp_past_round_deadline(&mut self) {
        let mut clock = self.svm.get_sysvar::<Clock>();
        clock.unix_timestamp += 7 * 24 * 3600 + 1;
        let next_slot = clock.slot + 1;
        self.svm.set_sysvar(&clock);
        self.svm.warp_to_slot(next_slot);
        self.svm.expire_blockhash();
    }

    fn warp_seconds(&mut self, seconds: i64) {
        let mut clock = self.svm.get_sysvar::<Clock>();
        clock.unix_timestamp += seconds;
        let next_slot = clock.slot + 1;
        self.svm.set_sysvar(&clock);
        self.svm.warp_to_slot(next_slot);
        self.svm.expire_blockhash();
    }
}

fn default_params(circle_id: u64, max_members: u8) -> CreateCircleParams {
    CreateCircleParams {
        circle_id,
        name: format!("Circle {circle_id}"),
        contribution_amount: sol(1.0),
        cycle_duration: 7 * 24 * 3600,
        max_members,
        payout_curve: PayoutCurve::FixedOrder,
        min_reputation: 0,
        collateral_bps: 1000,
        insurance_fee_bps: 50,
        reserve_ratio_bps: 1000,
    }
}

fn ix_create_circle(creator: &Pubkey, params: CreateCircleParams) -> Instruction {
    let circle = circle_pda(creator, params.circle_id);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*creator, true),
            AccountMeta::new(circle, false),
            AccountMeta::new(vault_pda(&circle), false),
            AccountMeta::new(insurance_pda(&circle), false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: ix_data::CreateCircle { params }.data(),
    }
}

fn ix_join_circle(
    member: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    token_account: &Pubkey,
    reputation: Option<Pubkey>,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    let mut accounts = vec![
        AccountMeta::new(*member, true),
        AccountMeta::new(circle, false),
        AccountMeta::new(vault_pda(&circle), false),
        AccountMeta::new(membership_pda(&circle, member), false),
        AccountMeta::new(position_nft_pda(&circle, member), false),
        AccountMeta::new(*token_account, true),
        AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
        AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        AccountMeta::new_readonly(RENT_SYSVAR_ID, false),
    ];
    accounts.push(AccountMeta::new_readonly(
        reputation.unwrap_or(dhukuti_program::ID),
        false,
    ));

    Instruction {
        program_id: dhukuti_program::ID,
        accounts,
        data: ix_data::JoinCircle {}.data(),
    }
}

fn ix_start_circle(creator: &Pubkey, circle_id: u64) -> Instruction {
    ix_start_circle_as(creator, creator, circle_id)
}

fn ix_start_circle_as(starter: &Pubkey, creator: &Pubkey, circle_id: u64) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*starter, true),
            AccountMeta::new(circle, false),
            AccountMeta::new(round_pda(&circle, 0), false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: ix_data::StartCircle {}.data(),
    }
}

fn ix_contribute(
    member: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    round_index: u16,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*member, true),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new(vault_pda(&circle), false),
            AccountMeta::new(insurance_pda(&circle), false),
            AccountMeta::new(membership_pda(&circle, member), false),
            AccountMeta::new(round_pda(&circle, round_index), false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: ix_data::Contribute {}.data(),
    }
}

fn ix_resolve_round(
    cranker: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    round_index: u16,
    recipient: &Pubkey,
    remaining_members: &[&Pubkey],
) -> Instruction {
    let next_round_index = round_index + 1;
    let circle = circle_pda(creator, circle_id);
    let mut accounts = vec![
        AccountMeta::new(*cranker, true),
        AccountMeta::new(circle, false),
        AccountMeta::new(vault_pda(&circle), false),
        AccountMeta::new(insurance_pda(&circle), false),
        AccountMeta::new(round_pda(&circle, round_index), false),
        AccountMeta::new(*recipient, false),
        AccountMeta::new_readonly(membership_pda(&circle, recipient), false),
        AccountMeta::new(round_pda(&circle, next_round_index), false),
        AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
    ];

    for member in remaining_members {
        accounts.push(AccountMeta::new(**member, false));
        accounts.push(AccountMeta::new_readonly(
            membership_pda(&circle, member),
            false,
        ));
    }

    Instruction {
        program_id: dhukuti_program::ID,
        accounts,
        data: ix_data::ResolveRound { next_round_index }.data(),
    }
}

fn ix_complete_circle(creator: &Pubkey, circle_id: u64, active_members: &[&Pubkey]) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    let mut accounts = vec![
        AccountMeta::new(*creator, true),
        AccountMeta::new(circle, false),
        AccountMeta::new(vault_pda(&circle), false),
        AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
    ];

    for member in active_members {
        accounts.push(AccountMeta::new(**member, false));
        accounts.push(AccountMeta::new_readonly(
            membership_pda(&circle, member),
            false,
        ));
    }

    Instruction {
        program_id: dhukuti_program::ID,
        accounts,
        data: ix_data::CompleteCircle {}.data(),
    }
}

fn ix_handle_default(
    cranker: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    round_index: u16,
    defaulting_member: &Pubkey,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    let round = round_pda(&circle, round_index);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new_readonly(*cranker, true),
            AccountMeta::new(circle, false),
            AccountMeta::new(vault_pda(&circle), false),
            AccountMeta::new(insurance_pda(&circle), false),
            AccountMeta::new(round, false),
            AccountMeta::new(membership_pda(&circle, defaulting_member), false),
            AccountMeta::new_readonly(*defaulting_member, false),
            AccountMeta::new(
                default_proposal_pda(&circle, &round, defaulting_member),
                false,
            ),
        ],
        data: ix_data::HandleDefault {}.data(),
    }
}

fn ix_open_default_proposal(
    proposer: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    round_index: u16,
    defaulting_member: &Pubkey,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    let round = round_pda(&circle, round_index);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*proposer, true),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new_readonly(round, false),
            AccountMeta::new_readonly(*defaulting_member, false),
            AccountMeta::new_readonly(membership_pda(&circle, defaulting_member), false),
            AccountMeta::new_readonly(membership_pda(&circle, proposer), false),
            AccountMeta::new(
                default_proposal_pda(&circle, &round, defaulting_member),
                false,
            ),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: ix_data::OpenDefaultProposal {}.data(),
    }
}

fn ix_vote_default(
    voter: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    round_index: u16,
    defaulting_member: &Pubkey,
    approve: bool,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    let round = round_pda(&circle, round_index);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new_readonly(*voter, true),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new_readonly(membership_pda(&circle, voter), false),
            AccountMeta::new(
                default_proposal_pda(&circle, &round, defaulting_member),
                false,
            ),
        ],
        data: ix_data::VoteDefault { approve }.data(),
    }
}

fn ix_update_reputation(
    cranker: &Pubkey,
    wallet: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    event: ReputationEvent,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*cranker, true),
            AccountMeta::new_readonly(*wallet, false),
            AccountMeta::new(reputation_pda(wallet), false),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new(membership_pda(&circle, wallet), false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: ix_data::UpdateReputation { event }.data(),
    }
}

fn ix_claim_host_reputation(cranker: &Pubkey, host: &Pubkey, circle_id: u64) -> Instruction {
    let circle = circle_pda(host, circle_id);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*cranker, true),
            AccountMeta::new_readonly(*host, false),
            AccountMeta::new(reputation_pda(host), false),
            AccountMeta::new(circle, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: ix_data::ClaimHostReputation {}.data(),
    }
}

fn ix_vouch_member(
    voucher: &Pubkey,
    candidate: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    stake_lamports: u64,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*voucher, true),
            AccountMeta::new_readonly(*candidate, false),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new_readonly(membership_pda(&circle, voucher), false),
            AccountMeta::new_readonly(membership_pda(&circle, candidate), false),
            AccountMeta::new(vouch_pda(&circle, voucher, candidate), false),
            AccountMeta::new(reputation_pda(voucher), false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: ix_data::VouchMember { stake_lamports }.data(),
    }
}

fn ix_release_vouch(
    voucher: &Pubkey,
    candidate: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*voucher, true),
            AccountMeta::new_readonly(*candidate, false),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new_readonly(membership_pda(&circle, candidate), false),
            AccountMeta::new(vouch_pda(&circle, voucher, candidate), false),
            AccountMeta::new(reputation_pda(voucher), false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: ix_data::ReleaseVouch {}.data(),
    }
}

fn ix_slash_vouch(
    cranker: &Pubkey,
    voucher: &Pubkey,
    candidate: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*cranker, true),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new(insurance_pda(&circle), false),
            AccountMeta::new_readonly(membership_pda(&circle, candidate), false),
            AccountMeta::new(vouch_pda(&circle, voucher, candidate), false),
            AccountMeta::new(reputation_pda(voucher), false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
        ],
        data: ix_data::SlashVouch {}.data(),
    }
}

fn ix_place_dutch_bid(bidder: &Pubkey, creator: &Pubkey, circle_id: u64) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*bidder, true),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new_readonly(membership_pda(&circle, bidder), false),
            AccountMeta::new(round_pda(&circle, 0), false),
        ],
        data: ix_data::PlaceDutchBid {}.data(),
    }
}

fn ix_list_position(
    seller: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    seller_token_account: &Pubkey,
    ask_price: u64,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    let membership = membership_pda(&circle, seller);
    let listing = listing_pda(&circle, &membership);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*seller, true),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new_readonly(membership, false),
            AccountMeta::new_readonly(position_nft_pda(&circle, seller), false),
            AccountMeta::new(*seller_token_account, false),
            AccountMeta::new(listing, false),
            AccountMeta::new(listing_escrow_pda(&listing), false),
            AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
            AccountMeta::new_readonly(RENT_SYSVAR_ID, false),
        ],
        data: ix_data::ListPosition { ask_price }.data(),
    }
}

fn ix_cancel_listing(
    seller: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    seller_token_account: &Pubkey,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    let membership = membership_pda(&circle, seller);
    let listing = listing_pda(&circle, &membership);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*seller, true),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new_readonly(membership, false),
            AccountMeta::new(listing, false),
            AccountMeta::new_readonly(position_nft_pda(&circle, seller), false),
            AccountMeta::new(listing_escrow_pda(&listing), false),
            AccountMeta::new(*seller_token_account, false),
            AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
        ],
        data: ix_data::CancelListing {}.data(),
    }
}

fn ix_buy_position(
    buyer: &Pubkey,
    seller: &Pubkey,
    creator: &Pubkey,
    circle_id: u64,
    buyer_token_account: &Pubkey,
) -> Instruction {
    let circle = circle_pda(creator, circle_id);
    let seller_membership = membership_pda(&circle, seller);
    let listing = listing_pda(&circle, &seller_membership);
    Instruction {
        program_id: dhukuti_program::ID,
        accounts: vec![
            AccountMeta::new(*buyer, true),
            AccountMeta::new(*seller, false),
            AccountMeta::new_readonly(circle, false),
            AccountMeta::new(seller_membership, false),
            AccountMeta::new(listing, false),
            AccountMeta::new(membership_pda(&circle, buyer), false),
            AccountMeta::new_readonly(position_nft_pda(&circle, seller), false),
            AccountMeta::new(listing_escrow_pda(&listing), false),
            AccountMeta::new(*buyer_token_account, true),
            AccountMeta::new_readonly(TOKEN_PROGRAM_ID, false),
            AccountMeta::new_readonly(SYSTEM_PROGRAM_ID, false),
            AccountMeta::new_readonly(RENT_SYSVAR_ID, false),
        ],
        data: ix_data::BuyPosition {}.data(),
    }
}

fn create_join_start(
    env: &mut Env,
    creator: &Keypair,
    wallets: &[&Keypair],
    params: CreateCircleParams,
) -> Vec<Keypair> {
    let circle_id = params.circle_id;
    env.send(&[ix_create_circle(&creator.pubkey(), params)], &[creator])
        .expect("create_circle");

    let mut token_accounts = Vec::with_capacity(wallets.len());
    for wallet in wallets {
        let token_account = Keypair::new();
        env.send(
            &[ix_join_circle(
                &wallet.pubkey(),
                &creator.pubkey(),
                circle_id,
                &token_account.pubkey(),
                None,
            )],
            &[wallet, &token_account],
        )
        .expect("join_circle");
        token_accounts.push(token_account);
    }

    env.send(&[ix_start_circle(&creator.pubkey(), circle_id)], &[creator])
        .expect("start_circle");
    token_accounts
}

fn complete_fixed_circle(env: &mut Env, creator: &Keypair, wallets: &[&Keypair], circle_id: u64) {
    for round_idx in 0..wallets.len() as u16 {
        for wallet in wallets {
            env.send(
                &[ix_contribute(
                    &wallet.pubkey(),
                    &creator.pubkey(),
                    circle_id,
                    round_idx,
                )],
                &[wallet],
            )
            .expect("contribute");
        }

        let recipient = wallets[round_idx as usize];
        env.send(
            &[ix_resolve_round(
                &creator.pubkey(),
                &creator.pubkey(),
                circle_id,
                round_idx,
                &recipient.pubkey(),
                &[],
            )],
            &[creator],
        )
        .expect("resolve_round");
    }

    let active_members: Vec<Pubkey> = wallets.iter().map(|w| w.pubkey()).collect();
    let active_refs: Vec<&Pubkey> = active_members.iter().collect();
    env.send(
        &[ix_complete_circle(
            &creator.pubkey(),
            circle_id,
            &active_refs,
        )],
        &[creator],
    )
    .expect("complete_circle");
}

fn open_and_approve_default(
    env: &mut Env,
    proposer: &Keypair,
    voters: &[&Keypair],
    creator: &Keypair,
    circle_id: u64,
    round_index: u16,
    defaulting_member: &Pubkey,
) {
    env.send(
        &[ix_open_default_proposal(
            &proposer.pubkey(),
            &creator.pubkey(),
            circle_id,
            round_index,
            defaulting_member,
        )],
        &[proposer],
    )
    .expect("open default proposal");

    for voter in voters {
        env.send(
            &[ix_vote_default(
                &voter.pubkey(),
                &creator.pubkey(),
                circle_id,
                round_index,
                defaulting_member,
                true,
            )],
            &[voter],
        )
        .expect("vote default");
    }
}

#[test]
fn test_happy_path_full_lifecycle() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let member_b = env.funded(sol(50.0));
    let circle_id = 1;
    let wallets = [&creator, &member_a, &member_b];

    create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 3));
    complete_fixed_circle(&mut env, &creator, &wallets, circle_id);

    let circle: Circle = env.get(&circle_pda(&creator.pubkey(), circle_id));
    assert_eq!(circle.status, CircleStatus::Complete);
    assert_eq!(circle.name, "Circle 1");
}

#[test]
fn test_empty_circle_name_rejected() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let mut params = default_params(22, 2);
    params.name = "   ".to_string();

    let result = env.send(&[ix_create_circle(&creator.pubkey(), params)], &[&creator]);
    assert!(result.is_err(), "empty circle name must fail");
}

#[test]
fn test_double_contribution_rejected() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let circle_id = 2;
    let wallets = [&creator, &member_a];

    create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 2));
    env.send(
        &[ix_contribute(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&creator],
    )
    .expect("first contribution");

    let result = env.send(
        &[ix_contribute(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&creator],
    );
    assert!(result.is_err(), "double contribution must fail");
}

#[test]
fn test_join_after_circle_full_rejected() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let extra = env.funded(sol(50.0));
    let circle_id = 3;

    env.send(
        &[ix_create_circle(
            &creator.pubkey(),
            default_params(circle_id, 2),
        )],
        &[&creator],
    )
    .expect("create_circle");

    for wallet in [&creator, &member_a] {
        let token_account = Keypair::new();
        env.send(
            &[ix_join_circle(
                &wallet.pubkey(),
                &creator.pubkey(),
                circle_id,
                &token_account.pubkey(),
                None,
            )],
            &[wallet, &token_account],
        )
        .expect("join_circle");
    }

    let extra_token_account = Keypair::new();
    let result = env.send(
        &[ix_join_circle(
            &extra.pubkey(),
            &creator.pubkey(),
            circle_id,
            &extra_token_account.pubkey(),
            None,
        )],
        &[&extra, &extra_token_account],
    );
    assert!(result.is_err(), "joining a full circle must fail");
}

#[test]
fn test_full_circle_can_be_started_by_member() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let outsider = env.funded(sol(10.0));
    let circle_id = 23;

    env.send(
        &[ix_create_circle(
            &creator.pubkey(),
            default_params(circle_id, 2),
        )],
        &[&creator],
    )
    .expect("create_circle");

    let creator_token_account = Keypair::new();
    env.send(
        &[ix_join_circle(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            &creator_token_account.pubkey(),
            None,
        )],
        &[&creator, &creator_token_account],
    )
    .expect("creator join");

    let early_start = env.send(
        &[ix_start_circle_as(
            &outsider.pubkey(),
            &creator.pubkey(),
            circle_id,
        )],
        &[&outsider],
    );
    assert!(
        early_start.is_err(),
        "non-host must not start before the circle is full",
    );

    let member_token_account = Keypair::new();
    env.send(
        &[ix_join_circle(
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
            &member_token_account.pubkey(),
            None,
        )],
        &[&member_a, &member_token_account],
    )
    .expect("member join");

    env.send(
        &[ix_start_circle_as(
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
        )],
        &[&member_a],
    )
    .expect("full circle member start");

    let circle: Circle = env.get(&circle_pda(&creator.pubkey(), circle_id));
    assert_eq!(circle.status, CircleStatus::Active);
}

#[test]
fn test_resolve_before_all_contributions_rejected() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let circle_id = 4;
    let wallets = [&creator, &member_a];

    create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 2));
    env.send(
        &[ix_contribute(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&creator],
    )
    .expect("creator contribution");

    let result = env.send(
        &[ix_resolve_round(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &creator.pubkey(),
            &[],
        )],
        &[&creator],
    );
    assert!(result.is_err(), "under-funded round must not resolve");
}

#[test]
fn test_single_default_covered_by_insurance_and_reputation_penalty() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let circle_id = 5;
    let mut params = default_params(circle_id, 2);
    params.collateral_bps = 10_000;
    let wallets = [&creator, &member_a];

    create_join_start(&mut env, &creator, &wallets, params);
    env.send(
        &[ix_contribute(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&creator],
    )
    .expect("creator contribution");

    env.warp_past_round_deadline();
    open_and_approve_default(
        &mut env,
        &creator,
        &[&creator],
        &creator,
        circle_id,
        0,
        &member_a.pubkey(),
    );
    env.send(
        &[ix_handle_default(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
        )],
        &[&creator],
    )
    .expect("handle_default");

    let circle = circle_pda(&creator.pubkey(), circle_id);
    let membership: Membership = env.get(&membership_pda(&circle, &member_a.pubkey()));
    assert!(!membership.active);
    assert_eq!(membership.rounds_missed, 1);

    let insurance: InsurancePool = env.get(&insurance_pda(&circle));
    assert_eq!(insurance.total_claims_paid, sol(1.0));

    env.send(
        &[ix_update_reputation(
            &creator.pubkey(),
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
            ReputationEvent::CircleDefaulted,
        )],
        &[&creator],
    )
    .expect("default reputation update");

    let reputation: Reputation = env.get(&reputation_pda(&member_a.pubkey()));
    assert_eq!(reputation.circles_defaulted, 1);
    assert_eq!(reputation.score, 0);
}

#[test]
fn test_default_requires_vote_or_grace_period() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let circle_id = 17;
    let mut params = default_params(circle_id, 2);
    params.collateral_bps = 10_000;
    let wallets = [&creator, &member_a];

    create_join_start(&mut env, &creator, &wallets, params);
    env.send(
        &[ix_contribute(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&creator],
    )
    .expect("creator contribution");

    env.warp_past_round_deadline();
    env.send(
        &[ix_open_default_proposal(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
        )],
        &[&creator],
    )
    .expect("open default proposal");

    let immediate_result = env.send(
        &[ix_handle_default(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
        )],
        &[&creator],
    );
    assert!(
        immediate_result.is_err(),
        "default should wait for vote approval or grace expiry"
    );

    env.warp_seconds(24 * 3600 + 1);
    env.send(
        &[ix_handle_default(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
        )],
        &[&creator],
    )
    .expect("handle default after grace");

    let circle = circle_pda(&creator.pubkey(), circle_id);
    let round = round_pda(&circle, 0);
    let proposal: DefaultProposal =
        env.get(&default_proposal_pda(&circle, &round, &member_a.pubkey()));
    assert!(proposal.resolved);
}

#[test]
fn test_default_proposal_is_cured_by_late_contribution() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let circle_id = 18;
    let wallets = [&creator, &member_a];

    create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 2));
    env.send(
        &[ix_contribute(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&creator],
    )
    .expect("creator contribution");

    env.warp_past_round_deadline();
    env.send(
        &[ix_open_default_proposal(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
        )],
        &[&creator],
    )
    .expect("open default proposal");

    env.send(
        &[ix_contribute(
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&member_a],
    )
    .expect("late contribution during grace");

    env.send(
        &[ix_vote_default(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
            true,
        )],
        &[&creator],
    )
    .expect("vote default");

    let default_result = env.send(
        &[ix_handle_default(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
        )],
        &[&creator],
    );
    assert!(
        default_result.is_err(),
        "a cured contribution must block default execution"
    );

    env.send(
        &[ix_resolve_round(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &creator.pubkey(),
            &[],
        )],
        &[&creator],
    )
    .expect("resolve cured round");
}

#[test]
fn test_default_vote_self_rejected_and_vote_can_change() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let member_b = env.funded(sol(50.0));
    let circle_id = 19;
    let wallets = [&creator, &member_a, &member_b];

    create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 3));
    env.send(
        &[ix_contribute(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&creator],
    )
    .expect("creator contribution");

    env.warp_past_round_deadline();
    env.send(
        &[ix_open_default_proposal(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
        )],
        &[&creator],
    )
    .expect("open default proposal");

    let self_vote = env.send(
        &[ix_vote_default(
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
            true,
        )],
        &[&member_a],
    );
    assert!(self_vote.is_err(), "defaulting member cannot self-vote");

    env.send(
        &[ix_vote_default(
            &member_b.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
            false,
        )],
        &[&member_b],
    )
    .expect("reject vote");

    env.send(
        &[ix_vote_default(
            &member_b.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
            true,
        )],
        &[&member_b],
    )
    .expect("changed approve vote");

    let circle = circle_pda(&creator.pubkey(), circle_id);
    let round = round_pda(&circle, 0);
    let proposal: DefaultProposal =
        env.get(&default_proposal_pda(&circle, &round, &member_a.pubkey()));
    let member_b_bit = 1u64 << 2;
    assert_eq!(proposal.approvals_bitmap & member_b_bit, member_b_bit);
    assert_eq!(proposal.rejections_bitmap & member_b_bit, 0);
}

#[test]
fn test_insurance_pool_depletion_haircut() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let member_b = env.funded(sol(50.0));
    let circle_id = 6;
    let mut params = default_params(circle_id, 3);
    params.insurance_fee_bps = 0;
    let wallets = [&creator, &member_a, &member_b];

    create_join_start(&mut env, &creator, &wallets, params);
    env.send(
        &[ix_contribute(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&creator],
    )
    .expect("creator contribution");

    env.warp_past_round_deadline();
    open_and_approve_default(
        &mut env,
        &creator,
        &[&creator, &member_b],
        &creator,
        circle_id,
        0,
        &member_a.pubkey(),
    );
    env.send(
        &[ix_handle_default(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
        )],
        &[&creator],
    )
    .expect("first default");

    open_and_approve_default(
        &mut env,
        &creator,
        &[&creator],
        &creator,
        circle_id,
        0,
        &member_b.pubkey(),
    );
    let result = env.send(
        &[ix_handle_default(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_b.pubkey(),
        )],
        &[&creator],
    );
    assert!(result.is_ok(), "depleted insurance path must not fail");

    let circle = circle_pda(&creator.pubkey(), circle_id);
    let round: Round = env.get(&round_pda(&circle, 0));
    assert!(
        round.pot_total < sol(3.0),
        "haircut should leave the pot short"
    );
}

#[test]
fn test_reputation_accumulates_across_circles_and_gates_join() {
    let mut env = Env::new();
    let creator = env.funded(sol(200.0));
    let member_a = env.funded(sol(100.0));

    for circle_id in [7_u64, 8_u64] {
        let wallets = [&creator, &member_a];
        create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 2));
        complete_fixed_circle(&mut env, &creator, &wallets, circle_id);
        env.send(
            &[ix_update_reputation(
                &creator.pubkey(),
                &member_a.pubkey(),
                &creator.pubkey(),
                circle_id,
                ReputationEvent::CircleCompleted,
            )],
            &[&creator],
        )
        .expect("completion reputation update");
    }

    let reputation: Reputation = env.get(&reputation_pda(&member_a.pubkey()));
    assert_eq!(reputation.score, 200);
    assert_eq!(reputation.circles_completed, 2);

    let gated_circle_id = 9;
    let mut params = default_params(gated_circle_id, 2);
    params.min_reputation = 300;
    env.send(&[ix_create_circle(&creator.pubkey(), params)], &[&creator])
        .expect("create gated circle");

    let token_account = Keypair::new();
    let result = env.send(
        &[ix_join_circle(
            &member_a.pubkey(),
            &creator.pubkey(),
            gated_circle_id,
            &token_account.pubkey(),
            Some(reputation_pda(&member_a.pubkey())),
        )],
        &[&member_a, &token_account],
    );
    assert!(result.is_err(), "low reputation wallet must be rejected");
}

#[test]
fn test_host_reputation_claim_is_non_replayable() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let circle_id = 14;
    let wallets = [&creator, &member_a];

    create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 2));
    complete_fixed_circle(&mut env, &creator, &wallets, circle_id);

    env.send(
        &[ix_claim_host_reputation(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
        )],
        &[&creator],
    )
    .expect("claim host reputation");

    let reputation: Reputation = env.get(&reputation_pda(&creator.pubkey()));
    assert_eq!(reputation.circles_hosted, 1);
    assert_eq!(reputation.hosted_default_events, 0);
    assert_eq!(
        reputation.score,
        Reputation::SCORE_HOSTED_CIRCLE + Reputation::SCORE_HOST_NO_DEFAULT_BONUS
    );

    let result = env.send(
        &[ix_claim_host_reputation(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
        )],
        &[&creator],
    );
    assert!(result.is_err(), "host reputation claim must not replay");
}

#[test]
fn test_successful_vouch_releases_stake_and_rewards_reputation() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let circle_id = 15;
    let stake_lamports = sol(0.2);
    let wallets = [&creator, &member_a];

    create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 2));
    let circle = circle_pda(&creator.pubkey(), circle_id);
    let vouch = vouch_pda(&circle, &creator.pubkey(), &member_a.pubkey());

    env.send(
        &[ix_vouch_member(
            &creator.pubkey(),
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
            stake_lamports,
        )],
        &[&creator],
    )
    .expect("vouch member");

    let vouch_lamports_before_release = env.lamports(&vouch);
    assert!(
        vouch_lamports_before_release > stake_lamports,
        "vouch account should hold rent plus social stake"
    );

    complete_fixed_circle(&mut env, &creator, &wallets, circle_id);

    env.send(
        &[ix_release_vouch(
            &creator.pubkey(),
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
        )],
        &[&creator],
    )
    .expect("release vouch");

    let released_vouch: Vouch = env.get(&vouch);
    assert!(!released_vouch.active);
    assert!(released_vouch.released);
    assert!(!released_vouch.slashed);
    assert_eq!(
        env.lamports(&vouch),
        vouch_lamports_before_release - stake_lamports
    );

    let reputation: Reputation = env.get(&reputation_pda(&creator.pubkey()));
    assert_eq!(reputation.vouches_made, 1);
    assert_eq!(reputation.vouches_honored, 1);
    assert_eq!(reputation.score, Reputation::SCORE_VOUCH_HONORED);
}

#[test]
fn test_self_vouch_rejected() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let circle_id = 20;
    let wallets = [&creator, &member_a];

    create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 2));

    let result = env.send(
        &[ix_vouch_member(
            &creator.pubkey(),
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            sol(0.2),
        )],
        &[&creator],
    );
    assert!(result.is_err(), "members must not self-vouch");
}

#[test]
fn test_vouch_release_before_circle_completion_rejected() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let circle_id = 21;
    let wallets = [&creator, &member_a];

    create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 2));

    env.send(
        &[ix_vouch_member(
            &creator.pubkey(),
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
            sol(0.2),
        )],
        &[&creator],
    )
    .expect("vouch member");

    let result = env.send(
        &[ix_release_vouch(
            &creator.pubkey(),
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
        )],
        &[&creator],
    );
    assert!(
        result.is_err(),
        "vouch stake must remain locked until the circle completes"
    );
}

#[test]
fn test_vouch_stake_slashes_to_insurance_after_default() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let circle_id = 16;
    let stake_lamports = sol(0.2);
    let mut params = default_params(circle_id, 2);
    params.collateral_bps = 10_000;
    let wallets = [&creator, &member_a];

    create_join_start(&mut env, &creator, &wallets, params);
    let circle = circle_pda(&creator.pubkey(), circle_id);
    let vouch = vouch_pda(&circle, &creator.pubkey(), &member_a.pubkey());

    env.send(
        &[ix_vouch_member(
            &creator.pubkey(),
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
            stake_lamports,
        )],
        &[&creator],
    )
    .expect("vouch member");

    let early_slash = env.send(
        &[ix_slash_vouch(
            &creator.pubkey(),
            &creator.pubkey(),
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
        )],
        &[&creator],
    );
    assert!(
        early_slash.is_err(),
        "vouch stake must not slash before candidate default"
    );

    env.send(
        &[ix_contribute(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&creator],
    )
    .expect("creator contribution");

    env.warp_past_round_deadline();
    open_and_approve_default(
        &mut env,
        &creator,
        &[&creator],
        &creator,
        circle_id,
        0,
        &member_a.pubkey(),
    );
    env.send(
        &[ix_handle_default(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_a.pubkey(),
        )],
        &[&creator],
    )
    .expect("handle default");

    let insurance_before_slash: InsurancePool = env.get(&insurance_pda(&circle));
    env.send(
        &[ix_slash_vouch(
            &creator.pubkey(),
            &creator.pubkey(),
            &member_a.pubkey(),
            &creator.pubkey(),
            circle_id,
        )],
        &[&creator],
    )
    .expect("slash vouch");

    let slashed_vouch: Vouch = env.get(&vouch);
    assert!(!slashed_vouch.active);
    assert!(slashed_vouch.slashed);
    assert!(!slashed_vouch.released);

    let insurance_after_slash: InsurancePool = env.get(&insurance_pda(&circle));
    assert_eq!(
        insurance_after_slash.balance,
        insurance_before_slash.balance + stake_lamports
    );

    let reputation: Reputation = env.get(&reputation_pda(&creator.pubkey()));
    assert_eq!(reputation.vouches_made, 1);
    assert_eq!(reputation.vouches_slashed, 1);
    assert_eq!(reputation.vouch_stake_slashed, stake_lamports);
}

#[test]
fn test_secondary_market_list_buy_and_obligation_transfer() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let seller = env.funded(sol(50.0));
    let buyer = env.funded(sol(50.0));
    let circle_id = 10;
    let wallets = [&creator, &seller];
    let token_accounts =
        create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 3));
    let seller_token_account = token_accounts[1].pubkey();

    env.send(
        &[ix_list_position(
            &seller.pubkey(),
            &creator.pubkey(),
            circle_id,
            &seller_token_account,
            sol(0.8),
        )],
        &[&seller],
    )
    .expect("list_position");

    let buyer_token_account = Keypair::new();
    env.send(
        &[ix_buy_position(
            &buyer.pubkey(),
            &seller.pubkey(),
            &creator.pubkey(),
            circle_id,
            &buyer_token_account.pubkey(),
        )],
        &[&buyer, &buyer_token_account],
    )
    .expect("buy_position");

    let circle = circle_pda(&creator.pubkey(), circle_id);
    let old_membership: Membership = env.get(&membership_pda(&circle, &seller.pubkey()));
    let new_membership: Membership = env.get(&membership_pda(&circle, &buyer.pubkey()));
    assert!(!old_membership.active);
    assert!(new_membership.active);
    assert_eq!(new_membership.join_order, old_membership.join_order);
    assert_eq!(
        new_membership.position_nft_mint,
        old_membership.position_nft_mint
    );

    let buyer_token: TokenAccount = env.get(&buyer_token_account.pubkey());
    assert_eq!(buyer_token.amount, 1);

    let seller_result = env.send(
        &[ix_contribute(
            &seller.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&seller],
    );
    assert!(
        seller_result.is_err(),
        "seller should no longer owe contributions"
    );

    env.send(
        &[ix_contribute(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&creator],
    )
    .expect("creator contribution");
    env.send(
        &[ix_contribute(
            &buyer.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
        )],
        &[&buyer],
    )
    .expect("buyer contribution");
}

#[test]
fn test_cannot_buy_own_listing() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let seller = env.funded(sol(50.0));
    let circle_id = 11;
    let wallets = [&creator, &seller];
    let token_accounts =
        create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 2));

    env.send(
        &[ix_list_position(
            &seller.pubkey(),
            &creator.pubkey(),
            circle_id,
            &token_accounts[1].pubkey(),
            sol(0.8),
        )],
        &[&seller],
    )
    .expect("list_position");

    let seller_new_token = Keypair::new();
    let result = env.send(
        &[ix_buy_position(
            &seller.pubkey(),
            &seller.pubkey(),
            &creator.pubkey(),
            circle_id,
            &seller_new_token.pubkey(),
        )],
        &[&seller, &seller_new_token],
    );
    assert!(
        result.is_err(),
        "seller must not be able to buy own listing"
    );
}

#[test]
fn test_cancel_listing_returns_position() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let seller = env.funded(sol(50.0));
    let circle_id = 12;
    let wallets = [&creator, &seller];
    let token_accounts =
        create_join_start(&mut env, &creator, &wallets, default_params(circle_id, 2));
    let seller_token_account = token_accounts[1].pubkey();

    env.send(
        &[ix_list_position(
            &seller.pubkey(),
            &creator.pubkey(),
            circle_id,
            &seller_token_account,
            sol(0.8),
        )],
        &[&seller],
    )
    .expect("list_position");

    env.send(
        &[ix_cancel_listing(
            &seller.pubkey(),
            &creator.pubkey(),
            circle_id,
            &seller_token_account,
        )],
        &[&seller],
    )
    .expect("cancel_listing");

    let seller_token: TokenAccount = env.get(&seller_token_account);
    assert_eq!(seller_token.amount, 1);
}

#[test]
fn test_dutch_auction_resolves_winner_and_splits_discount() {
    let mut env = Env::new();
    let creator = env.funded(sol(100.0));
    let member_a = env.funded(sol(50.0));
    let member_b = env.funded(sol(50.0));
    let circle_id = 13;
    let mut params = default_params(circle_id, 3);
    params.payout_curve = PayoutCurve::DutchAuction;
    let wallets = [&creator, &member_a, &member_b];

    create_join_start(&mut env, &creator, &wallets, params);
    env.send(
        &[ix_place_dutch_bid(
            &member_b.pubkey(),
            &creator.pubkey(),
            circle_id,
        )],
        &[&member_b],
    )
    .expect("place_dutch_bid");

    for wallet in &wallets {
        env.send(
            &[ix_contribute(
                &wallet.pubkey(),
                &creator.pubkey(),
                circle_id,
                0,
            )],
            &[wallet],
        )
        .expect("contribute");
    }

    let member_a_before = env.lamports(&member_a.pubkey());
    let expected_net = sol(1.0) - bps(sol(1.0), 50);
    let pot_total = expected_net * 3;
    let discount = bps(pot_total, 2000);
    let remaining_member_share = discount - bps(discount, 5000);
    let expected_rebate_per_member = remaining_member_share / 2;

    env.send(
        &[ix_resolve_round(
            &creator.pubkey(),
            &creator.pubkey(),
            circle_id,
            0,
            &member_b.pubkey(),
            &[&creator.pubkey(), &member_a.pubkey()],
        )],
        &[&creator],
    )
    .expect("resolve dutch auction");

    let circle = circle_pda(&creator.pubkey(), circle_id);
    let round: Round = env.get(&round_pda(&circle, 0));
    assert_eq!(round.recipient, Some(member_b.pubkey()));
    assert_eq!(round.auction_winner, Some(member_b.pubkey()));
    assert_eq!(round.auction_discount_bps, 2000);

    let insurance: InsurancePool = env.get(&insurance_pda(&circle));
    assert_eq!(
        insurance.balance,
        bps(sol(1.0), 50) * 3 + bps(discount, 5000)
    );
    assert_eq!(
        env.lamports(&member_a.pubkey()) - member_a_before,
        expected_rebate_per_member
    );
}
