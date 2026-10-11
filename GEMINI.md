# Project Rules & Guidelines

## 1. Zero Hardcoded Secrets (STRICT)
- **NEVER hardcode API keys, tokens, high-entropy secrets, or credentials** into source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.rs`, etc.).
- Always read secrets from environment variables (`process.env.GPHOST_API_KEY`, `process.env.NEXT_PUBLIC_GPHOST_API_KEY`, etc.).
- Never use real secret strings as fallbacks (e.g. `process.env.KEY || "real_key"`). Use `process.env.KEY || ""` instead.
- All secrets must reside exclusively in `.env.local` (kept in `.gitignore`) and pushed to Vercel via Vercel CLI (`vercel env add`).

## 2. Desktop App Isolation & Local-Only Workflow (STRICT)
- **Keep `pc-app` completely local**: Never push `pc-app` to GitHub. Enforced strictly in `.gitignore`.
- **No Unsolicited Git Pushes**: All development, testing, and debugging must remain strictly local. Never push to GitHub without direct, explicit instructions from the user.
- **Git History Hygiene**: If `pc-app` or any local-only file is ever detected in Git staging, untracked index, or commits, immediately unstage, untrack, and purge it from Git history.

## 3. No Nested Card-Type Layouts (UI/UX Design Rule)
- **Do not create nested card/box-in-card layouts**: Avoid wrapping statistics, items, or info blocks inside separate rounded bordered cards.
- Use clean, spacious, open layouts with crisp typography, subtle hairline dividers, and generous width and height so content breathes naturally without unnecessary scrollbars.

## 4. Simple Words Only (STRICT - Zero Buzzwords / Jargon)
- **Use simple, plain, everyday words**: Never use tech buzzwords, internal architecture jargon, or complex marketing fluff in the UI, modals, toasts, tooltips, or copy.
- **Prohibited buzzwords / jargon examples**: Avoid terms like "Live Cloud Mirror", "bi-directionally", "local SQLite", "deltas", "real time engine", "(0ms)", "architecture", "cryptographic", etc.
- **Use plain language**: Use straightforward, clean words like "Sync", "Synced", "Account", "Up to date", "Saved", "Notes are synced to your account", "0 pending", etc.