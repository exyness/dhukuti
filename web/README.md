# Dhukuti Web

Next.js App Router frontend for Dhukuti Protocol. The first shipped slice is a
polished landing page with custom `motion/react` choreography, Tailwind CSS 4
tokens, and a Solana wallet-adapter provider for Phantom, Backpack, and
Solflare on devnet.

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
- `components/landing/`: composable landing-page sections and data.
- `components/wallet/`: custom accessible wallet connection UI.
- `components/ui/`: small project-owned UI primitives. Do not add Radix or Base UI here.
- `lib/`: constants, class helpers, and wallet-adapter utilities.

## Wallet Scope

This first slice connects to supported wallet adapters only. It shows wallet
identity and address state, but does not sign or send transactions. Transaction
flows should add simulation and explicit confirmation before requesting wallet
signatures.

## Deployed Program

- Cluster: devnet
- Program ID: `GMhsYxEmeCpKaxqKPzSTmuoEuid6YnbfFJRYBur7ZcmL`

The full program deployment details live in `../../dhukuti-program/README.md`.

## Design Rules

- Use `motion/react`, not `framer-motion` imports.
- Use Tailwind tokens from `app/globals.css`; avoid inline hex colors in components.
- Keep controls as project-owned components unless a dependency is explicitly approved.
- Wallet actions must show disconnected, connecting, connected, copy, explorer, and disconnect states.
