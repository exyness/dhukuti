# Dhukuti

Dhukuti is an on-chain rotating savings circle (ROSCA) protocol on Solana.
Members create or join a circle, contribute in scheduled rounds, receive
payouts, and build portable on-chain reputation across circles.

The repository contains a devnet-deployed Anchor program, a Next.js web app,
and a Supabase-backed event read model. It is not ready for mainnet or
production value.

## Repository Layout

| Path                                            | Purpose                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`web/`](web/README.md)                         | Next.js application, wallet connection, program client, and indexed read surfaces. |
| [`dhukuti-program/`](dhukuti-program/README.md) | Anchor/Rust Solana program and LiteSVM test suite.                                 |
| [`supabase/`](supabase/README.md)               | Event-store migration and local Supabase validation instructions.                  |
| [`Architecture.md`](Architecture.md)            | Protocol design, account model, and roadmap.                                       |

## Run the Web App

The quickest way to run Dhukuti locally is the web application.

Prerequisite: [Bun](https://bun.sh/) is installed.

```bash
cd web
bun install
cp .env.example .env.local
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The checked-in example
contains the public devnet read configuration. Leave the server-only indexer
secrets as placeholders unless you are running the indexer endpoints.

Useful web commands:

```bash
cd web
bun run lint
bun run typecheck
bun run build
```

## Program and Data Services

The Solana program currently targets devnet:

- Program ID: `FrVMUmF1maCCiCZaVAkGn9mT69kQ5Hbgd9sUvzfmsgvs`
- Settlement asset: native SOL

For program build, test, deployment, and mainnet-gate details, see
[`dhukuti-program/README.md`](dhukuti-program/README.md). For the event
projection schema and local Supabase commands, see
[`supabase/README.md`](supabase/README.md).

## License

Copyright 2026 Exyness

Licensed under the [Apache License, Version 2.0](LICENSE).
