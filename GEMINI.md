# Project Rules & Guidelines

## 1. Zero Hardcoded Secrets (STRICT)
- **NEVER hardcode API keys, tokens, high-entropy secrets, or credentials** into source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.rs`, etc.).
- Always read secrets from environment variables (`process.env.GPHOST_API_KEY`, `process.env.NEXT_PUBLIC_GPHOST_API_KEY`, etc.).
- Never use real secret strings as fallbacks (e.g. `process.env.KEY || "real_key"`). Use `process.env.KEY || ""` instead.
- All secrets must reside exclusively in `.env.local` (kept in `.gitignore`) and pushed to Vercel via Vercel CLI (`vercel env add`).

## 2. Desktop App Isolation
- Keep `pc-app` completely local. Never push `pc-app` to GitHub. Enforced in `.gitignore`.
