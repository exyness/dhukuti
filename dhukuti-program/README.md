# Dhukuti Program

Anchor/Rust Solana program for a Dhukuti savings circle: members join with collateral, contribute each round, receive payouts, and carry protocol reputation across circles.

## Program Scope

- Settlement asset: native SOL only in V1. `denom_mint` must be the system program sentinel.
- Member cap: 2 to 64 members, enforced so contribution and vote bitmaps fit in `u64`.
- Payout curves: fixed order and early payout discount auction. VRF lottery is reserved and intentionally unsupported until an oracle integration is added.
- Position transfers: each membership receives a 1-of-1 SPL position NFT; active obligations can be sold through escrowed listings.
- Default handling: missed contributions require a default proposal after the round deadline, then either majority approval from active non-defaulting members or a 24 hour grace expiry.
- Social trust: active members can stake vouches behind another member; vouches release after clean completion or slash into insurance after the vouched member defaults.
- Reputation: member completion/default, host completion, and vouch outcomes are recorded in wallet-scoped reputation PDAs.

## Instruction Surface

- `create_circle(params)`: creates circle, SOL vault, and insurance pool PDAs.
- `join_circle()`: joins an open circle, locks collateral, and mints the position NFT.
- `start_circle()`: creator starts the circle and opens round 0.
- `contribute()`: transfers the round contribution, routes insurance fee, and marks the member bit.
- `open_default_proposal()`: opens a default proposal after a missed deadline.
- `vote_default(approve)`: active non-defaulting members approve or reject a default proposal.
- `handle_default()`: slashes collateral and covers the missed contribution after approval or grace expiry.
- `resolve_round(next_round_index)`: pays the recipient and opens the next round.
- `complete_circle()`: returns active member collateral and closes the lifecycle.
- `update_reputation(event)`: claims member completion/default reputation.
- `claim_host_reputation()`: claims non-replayable host reputation after completion.
- `vouch_member(stake_lamports)`: locks social stake behind an active member.
- `release_vouch()`: returns social stake after the vouched member completes cleanly.
- `slash_vouch()`: moves social stake to insurance after the vouched member defaults.
- `list_position(ask_price)`, `cancel_listing()`, `buy_position()`: escrowed secondary market for position NFTs.
- `place_dutch_bid()`: accepts the active round's early payout discount.

## PDA Seeds

- `circle`: `[b"circle", creator, circle_id]`
- `vault`: `[b"vault", circle]`
- `insurance`: `[b"insurance", circle]`
- `membership`: `[b"membership", circle, member]`
- `round`: `[b"round", circle, round_index]`
- `reputation`: `[b"reputation", wallet]`
- `position_nft`: `[b"position_nft", circle, member]`
- `listing`: `[b"listing", circle, membership]`
- `listing_escrow`: `[b"listing_escrow", listing]`
- `vouch`: `[b"vouch", circle, voucher, candidate]`
- `default_proposal`: `[b"default_proposal", circle, round, defaulting_member]`

## Verification

Run from `dhukuti-program/`:

```bash
NO_DNA=1 cargo fmt --all
NO_DNA=1 anchor build
NO_DNA=1 cargo test -- --nocapture
NO_DNA=1 cargo clippy --all-targets -- -D warnings
```

Current local coverage includes LiteSVM tests for lifecycle, duplicate contributions, full-circle joins, default insurance, default grace/votes, cured defaults, reputation gates, host reputation, vouch release/slash, secondary market transfers, and early payout discount settlement.

## Devnet Deployment

- Cluster: Solana devnet
- Program ID: `GMhsYxEmeCpKaxqKPzSTmuoEuid6YnbfFJRYBur7ZcmL`
- ProgramData: `vyW7FuSSXARQXAhuLEohpfas8rzVWJAjxwM9tz816hM`
- Upgrade authority: `6rqcaPUEdcyAp8u3bw8xeMKtSRYB7jxXt1xb51YWbYmP`
- Deploy signature: `466kbS1h4ifXXsK4erb7DUzt1xokEyx5msDYgwUxBxoQZsGkw1LKKnqhgm2bQdDSFANw3E53e8hXr68Qrajrvwce`
- Last deployed slot: `475226100`
- Deployed artifact SHA-256: `0d088f09fa2371ca0365a8dbf93bafa066d10dce0ffaef4074979105ad7bc9a3`

## Supabase Indexing

The program emits Anchor events for all user-facing transitions. Apply `../supabase/migrations/20260710000000_dhukuti_events.sql` to create the event log and read-model tables, then run a trusted server-side indexer that decodes program logs and writes with the Supabase service role key.

## Mainnet Gate

This codebase is mainnet-candidate only after these are complete:

- Run a Trident or equivalent fuzz suite against contribution/default/listing/auction/vouch state transitions.
- Perform a devnet deployment and soak test with the frontend/client using wallet simulation before any mainnet transaction.
- Get at least one independent Solana program review before value-bearing mainnet use.
- Keep native SOL-only settlement unless SPL-token support is implemented with mint, token account, decimals, and Token-2022 tests.
