# Dhukuti Program

The `dhukuti-program/` directory contains the Anchor/Rust Solana program for Dhukuti, an on-chain rotating savings circle. The program owns circle funds, membership, payout rounds, default handling, social collateral, portable reputation, and escrowed position transfers.

The current target is **Solana devnet**. Native SOL is the only settlement asset implemented, and this code must not be used with production funds.

## Protocol scope

- Circle sizes are bounded to 2–64 members so contribution and governance bitmaps fit in `u64`.
- Members lock collateral and receive a 1-of-1 SPL position NFT representing their payout position.
- Payout modes include fixed order and Dutch-bid early settlement.
- VRF lottery is reserved for a future oracle integration and is not supported by the current program.
- Missed contributions can enter member-governed default handling after the round deadline.
- Default handling can use active-member approval or a grace-period expiry, then slashes collateral and uses the insurance pool as configured.
- Social vouches lock SOL behind another member and are either released after clean completion or slashed after default.
- Reputation is wallet-scoped and records completion, default, hosting, and vouch outcomes.
- Position NFTs can be listed, cancelled, and purchased through escrowed secondary-market instructions.

## Instruction surface

The public Anchor instruction entrypoints are:

| Instruction | Purpose |
| --- | --- |
| `create_circle(params)` | Create a circle, SOL vault, and insurance pool. |
| `join_circle()` | Join an open circle, lock collateral, and mint the position NFT. |
| `start_circle()` | Lock admissions and open the first round. |
| `contribute()` | Transfer the round contribution, route insurance, and mark the member as funded. |
| `place_dutch_bid()` | Accept the current early-payout discount. |
| `resolve_round(next_round_index)` | Pay the selected recipient and open the next round. |
| `open_default_proposal()` | Propose a missed contributor for default review. |
| `vote_default(approve)` | Approve or reject a default proposal. |
| `handle_default()` | Apply the approved or expired default outcome. |
| `complete_circle()` | Close the lifecycle and return eligible collateral. |
| `update_reputation(event)` | Claim member completion/default reputation for a completed circle. |
| `claim_host_reputation()` | Claim non-replayable host reputation after completion. |
| `vouch_member(stake_lamports)` | Lock social collateral behind an active member. |
| `release_vouch()` | Return a vouch after clean completion. |
| `slash_vouch()` | Move a vouch stake to insurance after default. |
| `list_position(ask_price)` | Place a payout position into escrowed sale. |
| `cancel_listing()` | Cancel an active position listing. |
| `buy_position()` | Purchase an escrowed payout position. |

## Accounts and PDA seeds

The principal program-derived addresses are:

| Account | Seeds |
| --- | --- |
| Circle | `[b"circle", creator, circle_id]` |
| Vault | `[b"vault", circle]` |
| Insurance pool | `[b"insurance", circle]` |
| Membership | `[b"membership", circle, member]` |
| Round | `[b"round", circle, round_index]` |
| Reputation | `[b"reputation", wallet]` |
| Position NFT mint | `[b"position_nft", circle, member]` |
| Listing | `[b"listing", circle, membership]` |
| Listing escrow | `[b"listing_escrow", listing]` |
| Vouch | `[b"vouch", circle, voucher, candidate]` |
| Default proposal | `[b"default_proposal", circle, round, defaulting_member]` |

Account validation, arithmetic, lifecycle transitions, and custom errors live under `programs/dhukuti-program/src/`.

## Events and indexing

The program emits Anchor events for user-visible transitions, including circle creation/naming/start/completion, membership, contributions, round resolution, Dutch bids, default proposals/votes/handling, reputation updates, vouch creation/release/slash, and position listings/cancellation/purchase.

The web indexer decodes those events, stores every decoded event in `dhukuti_event_log`, and projects current state into normalized Supabase read models. Event payloads retain the circle and wallet metadata used by global activity and circle-scoped activity views.

## Local development

Prerequisites:

- Rust toolchain `1.89.0` with `rustfmt` and `clippy` components; see `rust-toolchain.toml`.
- Anchor CLI.
- Solana CLI and a configured localnet/devnet wallet.
- Node/Bun only if you use the TypeScript deployment helpers.

The checked-in `Anchor.toml` uses localnet as its default provider and keeps the Dhukuti program ID consistent across localnet and devnet:

```text
FrVMUmF1maCCiCZaVAkGn9mT69kQ5Hbgd9sUvzfmsgvs
```

Build and test from `dhukuti-program/`:

```bash
NO_DNA=1 cargo fmt --all
NO_DNA=1 anchor build
NO_DNA=1 cargo test -- --nocapture
NO_DNA=1 cargo clippy --all-targets -- -D warnings
```

The integration suite uses LiteSVM and covers lifecycle transitions, duplicate contributions, full-circle joins, default insurance and grace/voting paths, cured defaults, reputation gates and claims, vouch release/slash, secondary-market transfers, and Dutch-bid settlement.

## Devnet deployment

- Cluster: Solana devnet
- Program ID: `FrVMUmF1maCCiCZaVAkGn9mT69kQ5Hbgd9sUvzfmsgvs`
- Recorded deployment slot: `475643502`
- Recorded deployment transaction: [`4NnrJ5ZCseUM3ZaEPmWaTfeAb3Go8yjUJEFTsyhQrbs9EYpxfwMuyRZVToWGorZcoEn7N94gyhCZNhKePUi5rnBg`](https://explorer.solana.com/tx/4NnrJ5ZCseUM3ZaEPmWaTfeAb3Go8yjUJEFTsyhQrbs9EYpxfwMuyRZVToWGorZcoEn7N94gyhCZNhKePUi5rnBg?cluster=devnet)

To deploy a newly built artifact, review the provider and wallet configuration first, then run the deployment explicitly against devnet:

```bash
cd dhukuti-program
NO_DNA=1 anchor build
NO_DNA=1 anchor deploy --provider.cluster devnet
```

Do not deploy to a value-bearing cluster without an independent review and an explicit release process.

## Mainnet gate

Before any mainnet use, the project still needs:

- Independent Solana program security review.
- Fuzzing and soak testing of contribution, default, auction, vouch, listing, and payout transitions.
- A controlled devnet deployment and frontend/client integration test using real wallet simulation.
- Verified migration/indexer recovery procedures and monitoring.
- SPL-token settlement support and tests if non-SOL assets are required.

## Related documentation

- [`../README.md`](../README.md) — repository setup and system overview.
- [`../web/README.md`](../web/README.md) — frontend, API, wallet, and indexer operations.
- [`../supabase/README.md`](../supabase/README.md) — event-log schema, migrations, RLS, and local database commands.
