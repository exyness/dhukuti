# Dhukuti Web Agent Notes

Follow `AGENTS.md` first for Next.js 16 caveats.

## Scope

- This frontend currently ships the landing page slice only.
- Wallet integration is read-only: connect, display address, copy address, open explorer, disconnect.
- Do not add transaction signing until the flow includes simulation, explicit confirmation, and decoded error handling.

## Design Rules

- Use custom project components and Tailwind CSS 4 tokens from `app/globals.css`.
- Do not add Radix, Base UI, or shadcn components unless explicitly requested.
- Use `motion/react` imports for motion work.
- Keep the reference HTML untouched; port or match it inside the Next app instead.
