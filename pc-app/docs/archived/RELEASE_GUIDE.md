---
description: Mandatory rules and protocol for GPN desktop releases and OTA update pipeline (Zero GitHub Reliance)
---

# GPN Desktop Release & OTA Pipeline Protocol (Zero GitHub Reliance)

## 1. Zero GitHub Reliance (STRICT)
- **NEVER create or rely on `.github/workflows/gpn-release.yml` or GitHub Actions** for releasing or updating desktop binaries.
- All desktop releases, binaries, Minisign signatures, and OTA manifests are driven directly from `pc-app` to **GPHost** (`https://gphost.eu.cc`).
- Do not upload release binaries to third-party file hosts or GitHub Releases.

## 2. Mandatory Release Script (`npm run ship`)
- All desktop builds, signing, Cloudflare R2 streaming, manifest activation, and cleanup are executed exclusively via:
  ```bash
  cd pc-app
  npm run ship
  ```
- **Interactive Developer Mode**: When executed in a terminal without CLI arguments, the script automatically asks:
  1. **Release Mode**:
     - `[1] Patch update`: Auto-increments version (e.g. `v0.0.0` -> `v0.0.1`).
     - `[2] Same-version refresh`: Replaces the binary in-place without bumping version.
     - `[3] Custom version`: Allows typing an explicit semver (e.g. `0.2.0`).
     - `[4] Seed Base Installer`: Pins `v0.0.0` permanent installer for `gpn.eu.cc/download`.
  2. **Release Notes / Changelog**: Prompts for description (with sensible defaults).
  3. **Skip Build**: Prompts whether to recompile or reuse existing NSIS binary (`--skip-build`).
  4. **Confirmation**: Final confirmation before streaming payload to GPHost.

- **Non-Interactive CLI Flags**:
  - `-m "changelog message"`: Release description.
  - `--refresh`: Same-version binary refresh in-place.
  - `--skip-build`: Skips compilation, immediately signs/verifies existing `.exe`.
  - `--seed`: Pins base `v0.0.0` installer for the website download page.
  - `<version>`: Explicit semver string (e.g. `npm run ship 0.1.0`).

## 3. Cryptography & Storage Rules
- **Signing**: All installers must be cryptographically signed with Minisign (`.tauri/gpn.key`) and verified against the public key in `tauri.conf.json`.
- **Direct Cloudflare R2 Stream**: Payloads must be streamed directly to Cloudflare R2 via GPHost presigned negotiation (`POST /api/v1/upload` -> `PUT presignedPutUrl` -> `POST /api/v1/complete-upload`). Direct multipart to Vercel is prohibited to avoid the 4.5MB serverless body limit.
- **Permanent Retention**: Release binaries must always be set with `isPermanent: true` (`expires_at: null`, overriding the 30-day default TTL).
- **Auto-Cleanup**: When publishing a newer release, superseded binary files must be automatically purged via `DELETE /api/v1/files/:oldId?force=true` to reclaim R2 storage quota.
- **Vanity URL Protection**: The vanity alias `/raw/gpn-app` is permanent and must never be deleted or orphaned.

## 4. In-Place Binary OTA Updates
- Installed desktop clients check for updates via `@tauri-apps/plugin-updater` hitting `https://gphost.eu.cc/api/v1/releases/gpn/latest`.
- OTA updates are silent, in-place binary swaps without setup wizards.
- **Preserve User Data**: Local SQLite database (`gpn_notes.db`) and active session tokens MUST NEVER be deleted, overwritten, or reset during updates.

## 5. Website Download Page Contract
- `src/app/download/page.tsx` must permanently reference:
  - **Direct Download**: `https://gphost.eu.cc/raw/gpn-app`
  - **Mirror Link**: `https://gphost.eu.cc/f/gpn-app`
  - **Embed Preview**: `https://gphost.eu.cc/f/gpn-app/preview`
