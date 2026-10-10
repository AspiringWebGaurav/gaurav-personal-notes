# Agent Behavioral Guidelines & Security Rules

## Strict Secret Hygiene (CRITICAL)
- **NEVER hardcode API keys, tokens, high-entropy secrets, or credentials** directly into source code files (`.ts`, `.tsx`, `.js`, `.jsx`, `.rs`, etc.).
- Always read secrets and API credentials from environment variables (`process.env.VARIABLE_NAME`, `process.env.NEXT_PUBLIC_VARIABLE_NAME`, or `import.meta.env`).
- Never provide real secret literals as fallbacks (e.g., `process.env.API_KEY || "real_secret_token"` is STRICTLY PROHIBITED). Use `process.env.API_KEY || ""` instead.
- Store local development secrets exclusively in `.env.local` (which must remain in `.gitignore`).
- For production/preview environments, configure secrets via Vercel CLI (`vercel env add ...`) or provider secret managers.

## Desktop App Isolation
- Keep `pc-app` completely local. Never stage, commit, or push `pc-app` to Git repositories unless explicitly instructed.
