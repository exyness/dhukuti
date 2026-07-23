# Dhukuti

Dhukuti is an on-chain rotating savings circle (ROSCA) protocol built on Solana. Members create or join a circle, contribute in scheduled rounds, receive payouts, manage defaults through circle governance, and build portable reputation across circles.

This repository contains three cooperating parts:

- An Anchor/Rust program that owns circle funds, membership, payouts, defaults, vouches, reputation, and position transfers.
- A Next.js web application for wallet connection, transaction review/signing, indexed read surfaces, circle actions, market activity, and activity history.
- A Supabase event store and read model populated by a trusted server-side indexer.

The current deployment is a **devnet prototype**. It is not approved for mainnet or production value.

## Repository layout

| Path | Purpose |
| --- | --- |
| [`web/`](web/README.md) | Next.js application, wallet integration, transaction builders, indexed read surfaces, and indexer endpoints. |
| [`dhukuti-program/`](dhukuti-program/README.md) | Anchor/Rust Solana program, PDA/account model, events, and Rust tests. |
| [`supabase/`](supabase/README.md) | Local Supabase configuration, ordered migrations, event-log schema, and read-model permissions. |
| [`LICENSE`](LICENSE) | Apache License 2.0. |

`Architecture.md` is intentionally not part of the active documentation workflow. The READMEs above are the operational references for running this repository.

## Current capabilities

- Create, browse, join, start, and complete savings circles.
- Fixed-order payout rounds and Dutch-bid early payout settlement.
- Native SOL contributions, collateral, insurance fees, and payout vaults.
- Default proposals, member voting, grace-period handling, collateral slashing, and insurance backstops.
- Social vouches with release or slash outcomes.
- Wallet-scoped reputation and reputation-gated circle admission.
- Escrowed position listings, cancellation, and secondary-market purchases.
- Global indexed activity and circle-scoped activity with transaction links and pagination.
- Devnet transaction review before wallet signing.

## Quick start: web application

Prerequisites:

- [Bun](https://bun.sh/)
- A Solana wallet that can connect to devnet
- Supabase credentials if you want indexed circle, profile, market, and activity data

```bash
cd web
bun install
cp .env.example .env.local
# Edit .env.local with the public Supabase and Solana RPC values.
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Supabase configuration, the app can still start, but indexed read surfaces will be empty and indexer writes will be unavailable.

Useful web checks:

```bash
cd web
bun run lint
bun run typecheck
bun run build
```

See [`web/README.md`](web/README.md) for routes, environment variables, data flow, and indexer operations.

## Optional local Supabase

From the repository root, with the Supabase CLI installed:

```bash
supabase start --workdir .
supabase status --workdir .
```

Copy the local URL, publishable key, and secret key from `supabase status` into `web/.env.local`. Apply or reset the ordered migrations with:

```bash
supabase db reset --workdir .
supabase db lint --local --workdir . --fail-on error
```

Stop the local services when finished:

```bash
supabase stop --workdir .
```

See [`supabase/README.md`](supabase/README.md) for schema, RLS, indexer credentials, and migration details.

## System flow

```text
Solana program
    │ Anchor events
    ▼
Trusted web indexer
    │ raw events + projections
    ▼
Supabase: dhukuti_event_log and read models
    │ server-side read model/API
    ▼
Next.js pages and TanStack Query hooks
```

The web application reads indexed data through server API routes. The browser must not receive the Supabase secret key and must not write directly to the projection tables. Circle activity is filtered from the same `dhukuti_event_log` by circle address; it does not require a second activity database table.

## Devnet deployment

- Cluster: Solana devnet
- Program ID: `FrVMUmF1maCCiCZaVAkGn9mT69kQ5Hbgd9sUvzfmsgvs`
- Settlement asset: native SOL
- Recorded deployment slot: `475643502`
- Recorded deployment transaction: [`4NnrJ5ZCseUM3ZaEPmWaTfeAb3Go8yjUJEFTsyhQrbs9EYpxfwMuyRZVToWGorZcoEn7N94gyhCZNhKePUi5rnBg`](https://explorer.solana.com/tx/4NnrJ5ZCseUM3ZaEPmWaTfeAb3Go8yjUJEFTsyhQrbs9EYpxfwMuyRZVToWGorZcoEn7N94gyhCZNhKePUi5rnBg?cluster=devnet)

See [`dhukuti-program/README.md`](dhukuti-program/README.md) for program development and deployment commands.

## Important limitations

- Devnet only; do not use this deployment for production funds.
- Native SOL settlement is implemented. SPL-token settlement is not implemented.
- Fixed-order and Dutch-bid payout modes are supported. VRF lottery remains reserved for a future oracle integration.
- The indexed read model depends on a correctly configured trusted indexer and Supabase project.
- Activity reads currently cap the fetched event set at 100 records per request; UI pagination operates over that fetched set.
- A security review, fuzzing/soak testing, and a controlled deployment process are required before any mainnet use.

## License

Copyright 2026 Exyness.

Licensed under the [Apache License, Version 2.0](LICENSE).
