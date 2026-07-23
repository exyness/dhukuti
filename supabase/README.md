# Dhukuti Supabase

The `supabase/` directory contains the local Supabase configuration and ordered migrations for Dhukuti's event store and normalized read models.

Supabase is not the source of truth for circle funds or program state. Solana is the source of truth. Supabase stores decoded program events and projections so the web application can query circles, members, rounds, reputation, market listings, and activity efficiently.

## Data flow

```text
Solana program
    │ Anchor events
    ▼
Trusted indexer using SUPABASE_SECRET_KEY
    ├─ raw events → dhukuti_event_log
    └─ projections → dhukuti_circles, memberships, rounds, etc.
                      │
                      ▼
              Next.js server read model/API
```

The browser must not write to these tables directly and must never receive the Supabase secret key. Browser reads go through the Next.js API routes. Global activity and circle activity both read from `dhukuti_event_log`; circle activity filters by the `circle` public key and does not require a separate activity table.

## Migrations

Supabase applies migrations in timestamp order:

1. `20260710000000_dhukuti_events.sql` — creates the raw event log, circle/member/round/contribution/default/reputation/vouch/listing read models, indexes, public read policies, and service-role grants.
2. `20260711000000_add_circle_name.sql` — adds and validates the human-readable circle name.
3. `20260711180500_grant_indexer_service_role.sql` — grants the trusted indexer service role the required schema/table/sequence permissions.
4. `20260711184000_fix_circle_id_u64.sql` — widens stored circle IDs to `numeric(20,0)` so the full on-chain `u64` range is preserved.

Apply or reset the complete migration set rather than applying only the first event migration.

## Main tables

### `dhukuti_event_log`

Stores every decoded Anchor event with:

- `signature` — Solana transaction signature.
- `event_index` — event order within the transaction.
- `slot` and `block_time` — chain ordering and timestamp metadata.
- `program_id` — emitting program ID.
- `event_name` — Anchor event struct name.
- `circle` — circle public key when the event is circle-scoped.
- `wallet` — primary wallet associated with the event when available.
- `payload` — complete decoded event JSON.

The uniqueness constraint `(signature, event_index)` makes ingestion idempotent. Important indexes cover `(circle, slot desc)`, `(wallet, slot desc)`, and `(event_name, slot desc)`.

### Normalized read models

- `dhukuti_circles` — current circle terms and lifecycle status.
- `dhukuti_memberships` — member positions, collateral, active/defaulted state, and NFT mint.
- `dhukuti_rounds` — payout rounds, deadlines, recipients, and resolution values.
- `dhukuti_contributions` — per-member contribution and insurance amounts by round.
- `dhukuti_default_proposals` and `dhukuti_default_votes` — governance state.
- `dhukuti_defaults` — settled default outcomes, slashing, and insurance backstops.
- `dhukuti_reputations` — wallet-scoped score and reputation counters.
- `dhukuti_vouches` — social collateral lifecycle.
- `dhukuti_listings` — escrowed position listings and settlement state.

The projector in `web/lib/indexer/projector.ts` upserts these tables from decoded program events. It also records the last signature and slot on projected state where applicable.

## Permissions and credentials

All read-model tables use Row Level Security with public `SELECT` access for `anon` and `authenticated`, because the current product exposes public devnet read surfaces.

The trusted indexer uses `SUPABASE_SECRET_KEY` and the `service_role` grants created by the migrations. Keep this credential server-only. It is used by the web indexer routes and must not be placed in a `NEXT_PUBLIC_` variable or shipped to the browser.

For hosted Supabase, configure the project URL, publishable key, and secret key in the web deployment environment. For local Supabase, use the URL, `PUBLISHABLE_KEY`, and `SECRET_KEY` printed by `supabase status`.

## Local development

Run these commands from the repository root:

```bash
supabase start --workdir .
supabase status --workdir .
supabase db reset --workdir .
supabase db lint --local --workdir . --fail-on error
```

Use the local credentials from `supabase status` in `web/.env.local`. The configured local services include:

- API: `http://127.0.0.1:54321`
- Database: port `54322`
- Studio: `http://127.0.0.1:54323`

Stop the local stack when finished:

```bash
supabase stop --workdir .
```

To apply migrations to a linked hosted project, review the target project and credentials first, then use the normal Supabase migration workflow, for example:

```bash
supabase db push --workdir .
```

## Indexer operations

The web application exposes trusted ingestion routes:

- `POST /api/indexer/helius` accepts authorized Helius webhook payloads.
- `POST /api/indexer/backfill` accepts an authorized JSON body with optional `address`, `before`, and `limit` fields.
- `POST /api/indexer/signature` ingests a confirmed transaction by signature.

The indexer decodes only the Dhukuti program events, upserts the raw event log idempotently, and projects normalized state. If ingestion is interrupted, use signature ingestion or a bounded backfill to recover events, then verify the read models against devnet.

## Validation checklist

Before using a Supabase project with the web app:

1. Apply all migrations in timestamp order.
2. Run `supabase db lint --local --workdir . --fail-on error` for local changes.
3. Confirm the public read policies exist on the read-model tables.
4. Confirm the trusted indexer credential can write while browser credentials cannot.
5. Send or ingest a devnet transaction and verify both `dhukuti_event_log` and its projected read model.

## Related documentation

- [`../README.md`](../README.md) — repository setup and system overview.
- [`../web/README.md`](../web/README.md) — web API routes and indexer environment variables.
- [`../dhukuti-program/README.md`](../dhukuti-program/README.md) — program instructions and emitted events.
