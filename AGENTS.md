# Agent Behavioral Guidelines & Security Rules

## Strict Secret Hygiene (CRITICAL)
- **NEVER hardcode API keys, tokens, high-entropy secrets, or credentials** directly into source code files (`.ts`, `.tsx`, `.js`, `.jsx`, `.rs`, etc.).
- Always read secrets and API credentials from environment variables (`process.env.VARIABLE_NAME`, `process.env.NEXT_PUBLIC_VARIABLE_NAME`, or `import.meta.env`).
- Never provide real secret literals as fallbacks (e.g., `process.env.API_KEY || "real_secret_token"` is STRICTLY PROHIBITED). Use `process.env.API_KEY || ""` instead.
- Store local development secrets exclusively in `.env.local` (which must remain in `.gitignore`).
- For production/preview environments, configure secrets via Vercel CLI (`vercel env add ...`) or provider secret managers.

## Desktop App Isolation
- Keep `pc-app` completely local. Never stage, commit, or push `pc-app` to Git repositories unless explicitly instructed.

## No Nested Card-Type Layouts (UI/UX Design Rule)
- **Do not create nested card/box-in-card layouts**: Avoid wrapping every statistic, list item, or info box inside separate rounded bordered card containers.
- Use clean, spacious, open editorial layouts with subtle dividers, clear typography, and generous width and height. Modals should be spacious, polished, and never cramped with awkward inner scrollbars.

## Simple Words Only (Strict - Zero Buzzwords / Jargon)
- **Use simple, natural, everyday words**: Never use tech buzzwords, internal architecture jargon, or complex marketing fluff in the UI, modals, toasts, tooltips, or copy.
- **Prohibited buzzwords / jargon examples**: Avoid terms like "Live Cloud Mirror", "bi-directionally", "local SQLite", "deltas", "real time engine", "(0ms)", "architecture", "cryptographic", etc.
- **Use plain language**: Use straightforward words like "Sync", "Synced", "Account", "Up to date", "Saved", "Notes are synced to your account", "0 pending", etc.

