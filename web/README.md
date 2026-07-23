# Dhukuti Web

The `web/` directory contains the Dhukuti Protocol frontend. It is a Next.js App Router application that connects Solana wallets, prepares and reviews program transactions, reads the Supabase projections through server API routes, and exposes trusted indexer endpoints for confirmed program events.

The application targets **Solana devnet** and is not a production or mainnet client.

## Prerequisites

- [Bun](https://bun.sh/)
- A browser wallet that supports Solana devnet
- A Supabase project, either local or hosted, for indexed read surfaces
- A Solana RPC endpoint; the public devnet endpoint works for development

## Local development

```bash
cd web
bun install
cp .env.example .env.local
# Edit .env.local with your public Supabase and RPC settings.
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase configuration, the application can boot, but circle, profile, market, and activity read surfaces return empty data. Server-only indexer routes also require their credentials before they can write projections.

## Commands

Run these commands from `web/`:

```bash
bun run dev        # Start Next.js development server
bun run build      # Create a production build
bun run start      # Serve the production build
bun run lint       # Biome and ESLint checks
bun run typecheck  # TypeScript validation
bun run format     # Format source files with Biome
```

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page and protocol overview. |
| `/circles` | Browse circles with payout-mode, contribution, and sort filters. |
| `/circles/new` | Create a circle with transaction review before wallet signing. |
| `/circles/[circleId]` | Circle members, lifecycle state, payout schedule, governance, social collateral, actions, economics, and circle-scoped activity. |
| `/activity` | Wallet-attributed and position-circle activity with transaction links and pagination. |
| `/market` | Browse active escrowed payout-position listings. |
| `/profile` | Wallet reputation, circles, positions, and listings. |
| `/whitepaper` | Protocol explanation and product context. |

## API routes

The browser calls these Next.js routes instead of connecting directly to Supabase:

| Route | Purpose |
| --- | --- |
| `GET /api/circles` | Circle summaries, optionally viewer-aware through `wallet`. |
| `GET /api/circles/[circleId]` | Circle detail, optionally viewer-aware through `wallet`. |
| `GET /api/activity?wallet=...` | Global activity for a wallet and its circle positions. |
| `GET /api/activity?circle=...` | Activity filtered to one circle address. |
| `GET /api/market` | Active position listings. |
| `GET /api/profile?wallet=...` | Wallet profile and reputation read model. |
| `POST /api/indexer/helius` | Authenticated Helius webhook ingestion. |
| `POST /api/indexer/backfill` | Authenticated program-event backfill. |
| `POST /api/indexer/signature` | Ingest a confirmed transaction by signature. |

The API routes use the server-only Supabase secret for trusted reads/writes where required. The browser receives only read-model responses and must never receive `SUPABASE_SECRET_KEY`.

## Wallet and program actions

The client uses `@solana/web3.js`, Anchor instruction encoding, and project-owned transaction builders. Actions show a review modal before the connected wallet is asked to sign.

Current circle actions include:

- Create, join, and start a circle.
- Contribute to the current round.
- Accept a Dutch-bid payout and resolve or settle rounds.
- Open, vote on, and handle default proposals.
- Vouch for members, release vouches, and slash vouches.
- Complete a circle and claim member or host reputation where eligible.
- List, cancel, and buy escrowed payout positions.

Admission can be gated by the wallet's indexed reputation. The client displays a reputation requirement and does not offer an invalid join transaction when the requirement is not met.

## Indexed data flow

```text
Solana devnet program
    │ Anchor events
    ▼
Indexer endpoints and Helius ingestion
    │ decode, deduplicate, store, project
    ▼
Supabase: dhukuti_event_log + normalized read models
    │ server API routes
    ▼
TanStack Query hooks and Next.js pages
```

`dhukuti_event_log` is the source for both global and circle-scoped activity. Circle activity filters the same event log by the circle public key; it does not use a separate activity table. The current activity reads fetch at most 100 events, while the UI paginates that fetched set.

Important implementation areas:

- `app/`: pages, layouts, and API route handlers.
- `components/app/`: shell, navigation, member summaries, and shared application layout.
- `components/circles/`: circle transaction review and circle activity UI.
- `components/program/`: program action panels and transaction controls.
- `components/ui/`: project-owned buttons, panels, dropdowns, badges, tooltips, and pagination.
- `lib/data/`: API fetchers, TanStack Query hooks, and read-model types.
- `lib/indexer/`: Helius/RPC ingestion, authorization, decoding, and Supabase projection logic.
- `lib/program/`: PDAs, IDL decoding, instruction builders, and on-chain account readers.
- `lib/supabase/`: browser/server clients and read-model helpers.

## Environment variables

Copy `.env.example` to `.env.local`. Values beginning with `NEXT_PUBLIC_` are exposed to the browser. All other values are server-only.

### Browser-safe values

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase browser publishable key. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Optional Solana RPC endpoint; defaults to Solana devnet when omitted. |

### Server-only values

| Variable | Purpose |
| --- | --- |
| `SUPABASE_SECRET_KEY` | Trusted server/indexer Supabase credential. |
| `HELIUS_RPC_URL` | Preferred Helius RPC endpoint for ingestion and backfill. |
| `HELIUS_API_KEY` | Optional fallback used to construct a Helius devnet RPC endpoint when `HELIUS_RPC_URL` is absent. |
| `HELIUS_WEBHOOK_SECRET` | Authorizes Helius webhook requests. |
| `INDEXER_ADMIN_SECRET` | Authorizes administrative backfill requests; falls back to the webhook secret when unset. |

Do not prefix server-only secrets with `NEXT_PUBLIC_`, commit `.env.local`, or expose Supabase secret credentials to wallet clients.

## Local Supabase

From the repository root, with the Supabase CLI installed:

```bash
supabase start --workdir .
supabase status --workdir .
supabase db reset --workdir .
supabase db lint --local --workdir . --fail-on error
```

Use the URL, publishable key, and secret key printed by `supabase status` in `web/.env.local`. Stop local services with:

```bash
supabase stop --workdir .
```

See [`../supabase/README.md`](../supabase/README.md) for migration order, schema, RLS, and indexer permissions.

## Deployment

For Vercel, set the project root to `web/` and configure the public Supabase/RPC values plus the server-only indexer values in the deployment environment. Apply the Supabase migrations before enabling indexed reads or indexer writes.

The deployed program is:

- Cluster: devnet
- Program ID: `FrVMUmF1maCCiCZaVAkGn9mT69kQ5Hbgd9sUvzfmsgvs`

See [`../dhukuti-program/README.md`](../dhukuti-program/README.md) for program build and deployment instructions.

## Design rules

- Use `motion/react`, not `framer-motion` imports.
- Use the shared tokens from `app/globals.css`; do not introduce arbitrary inline colors in components.
- Keep controls project-owned unless a dependency is explicitly approved.
- Preserve accessible wallet states: disconnected, connecting, connected, copy, explorer, and disconnect.
- Keep transaction review between a UI action and wallet signing.
- Keep indexed reads behind server API routes and keep Supabase secret credentials server-only.
