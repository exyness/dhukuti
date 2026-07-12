# Dhukuti Web

Next.js App Router frontend for Dhukuti Protocol. The app includes wallet
adapter support, devnet `create_circle` simulation/signing, TanStack Query read
surfaces, Supabase-backed projections, and Helius webhook/backfill route
handlers for program event ingestion.

## Commands

```bash
bun install
bun run dev
bun run lint
bun run typecheck
bun run build
```

## Structure

- `app/`: Next.js route files and global CSS tokens.
- `app/api/`: read-model endpoints plus Helius webhook/backfill ingestion.
- `components/landing/`: composable landing-page sections and data.
- `components/wallet/`: custom accessible wallet connection UI.
- `components/ui/`: small project-owned UI primitives. Do not add Radix or Base UI here.
- `lib/data/`: API fetchers, TanStack Query hooks, and UI read-model types.
- `lib/indexer/`: Helius RPC helpers, webhook parsing, and Supabase projections.
- `lib/program/`: Dhukuti program PDAs, instruction builders, amount helpers, and IDL decoder.
- `lib/supabase/`: browser/server Supabase clients and projection queries.

## Environment

For Vercel, set the project root to `web/`. Keep `supabase/` at the repository
root and apply migrations through Supabase CLI or CI before deploy.

Required for public reads:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SOLANA_RPC_URL=
```

Required for indexer writes:

```bash
SUPABASE_SECRET_KEY=
HELIUS_API_KEY=
HELIUS_WEBHOOK_SECRET=
INDEXER_ADMIN_SECRET=
```

`SUPABASE_SECRET_KEY`, `HELIUS_API_KEY`, `HELIUS_WEBHOOK_SECRET`, and
`INDEXER_ADMIN_SECRET` must stay server-only. Do not prefix them with
`NEXT_PUBLIC_`. For hosted Supabase, create the secret key from the Dashboard's
Publishable and secret API keys tab. For local Supabase CLI, use the
`PUBLISHABLE_KEY` and `SECRET_KEY` values from `supabase status`.

## Transaction Scope

`/circles/new` simulates `create_circle`, presents the derived PDAs and estimated
fees, then asks the connected wallet to sign. Other circle actions are rendered
from indexed state but still need instruction builders before their buttons
submit transactions.

## Deployed Program

- Cluster: devnet
- Program ID: `GMhsYxEmeCpKaxqKPzSTmuoEuid6YnbfFJRYBur7ZcmL`

The full program deployment details live in `../../dhukuti-program/README.md`.

## Design Rules

- Use `motion/react`, not `framer-motion` imports.
- Use Tailwind tokens from `app/globals.css`; avoid inline hex colors in components.
- Keep controls as project-owned components unless a dependency is explicitly approved.
- Wallet actions must show disconnected, connecting, connected, copy, explorer, and disconnect states.
