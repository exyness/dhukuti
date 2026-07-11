# Dhukuti Supabase Event Store

The on-chain program emits Anchor events for every user-visible state transition. A server-side indexer should parse program logs and write:

1. Every decoded event into `dhukuti_event_log`.
2. Upserted read models into the projection tables in `migrations/20260710000000_dhukuti_events.sql`.

Use the Supabase secret key only in the trusted indexer environment. Client apps should read these tables through the public `SELECT` policies and must not write directly.

## Required Event Metadata

Each indexed event should include:

- `signature`: transaction signature.
- `event_index`: zero-based event order within the transaction.
- `slot`: Solana slot.
- `block_time`: block timestamp when available.
- `program_id`: deployed Dhukuti program id.
- `event_name`: Anchor event struct name.
- `circle`: circle pubkey when present.
- `wallet`: primary wallet when present.
- `payload`: full decoded event JSON.

The normalized tables intentionally keep pubkeys as text and lamport amounts as `numeric(20,0)` so the schema stays language-agnostic and safe for JavaScript clients.

## Local Validation

From the repository root:

```bash
NO_DNA=1 supabase start --workdir .
NO_DNA=1 supabase db lint --local --workdir . --fail-on error
NO_DNA=1 supabase stop --workdir .
```
