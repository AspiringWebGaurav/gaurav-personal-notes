# GPN Desktop Application — Automated Release Pipeline

This document explains the production release workflow for the Gaurav Personal Notes (GPN) desktop application using GitHub Actions and GPHost atomic release infrastructure.

---

## 1. Overview

Whenever you push a Git tag starting with `v` (e.g. `v1.0.1`), GitHub Actions automatically:
1. Validates that the tag matches the versions in `pc-app/package.json`, `pc-app/src-tauri/tauri.conf.json`, and `pc-app/src-tauri/Cargo.toml`.
2. Builds the Windows NSIS installer on `windows-latest`.
3. Signs the installer using the secure Minisign private key and generates a detached signature (`.sig`).
4. Cryptographically verifies the signature against the public key before uploading.
5. Uploads the verified artifact to GPHost (`POST /api/v1/upload`).
6. Atomically publishes and activates the release on GPHost (`POST /api/v1/releases/gpn/publish`).
7. Installed GPN desktop apps query `https://gphost.eu.cc/api/v1/releases/gpn/latest`, detect the update, download it with progress tracking, verify the signature, and apply the update.

---

## 2. GitHub Secrets Setup (One-Time Setup)

Configure the following repository secrets under:
**GitHub Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Value Description |
| :--- | :--- |
| `GPHOST_API_KEY` | Scoped GPHost machine API key with release publishing rights (`Bearer <key>`). |
| `TAURI_SIGNING_PRIVATE_KEY` | Exact multiline content of `pc-app/.tauri/gpn.key`. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the private key stored securely in `.env.local`. |

> [!SECURITY]
> - Never commit `.tauri/gpn.key` or `.env.local` to Git. Both are strictly ignored by `.gitignore`.
> - Never paste signing keys or passwords into chat or public pull requests.

---

## 3. Step-by-Step Release Workflow (For Future Releases)

### Step 1: Update Application Code
Make your code edits, bug fixes, or new features in `pc-app`.

### Step 2: Bump the Version Number
Update the version number in all three files to the exact same version (e.g. `1.0.1`):
1. `pc-app/package.json` -> `"version": "1.0.1"`
2. `pc-app/src-tauri/tauri.conf.json` -> `"version": "1.0.1"`
3. `pc-app/src-tauri/Cargo.toml` -> `version = "1.0.1"`

You can run the version checker locally to confirm they match:
```powershell
node pc-app/scripts/check-versions.mjs
```

### Step 3: Commit and Push Code
```powershell
git add pc-app/package.json pc-app/src-tauri/tauri.conf.json pc-app/src-tauri/Cargo.toml <other changed files>
git commit -m "Release v1.0.1: [summary of changes]"
git push origin main
```

### Step 4: Create and Push the Version Tag
Create a Git tag matching `v<version>`:
```powershell
git tag v1.0.1
git push origin v1.0.1
```

### Step 5: Monitor the Automated Release
1. Open **GitHub → Actions → GPN Desktop Production Release**.
2. The workflow will run on a Windows runner:
   - Validates tag matches `1.0.1`.
   - Compiles and packages `Gaurav Personal Notes_1.0.1_x64-setup.exe`.
   - Signs with Minisign (`.exe.sig`).
   - Runs `cargo test --test verify_signature` to mathematically verify the signature.
   - Uploads to GPHost and activates the release atomically.
3. Once completed, `https://gphost.eu.cc/api/v1/releases/gpn/latest` serves v1.0.1.

---

## 4. Local Emergency Release (Fallback)

If GitHub Actions is ever unavailable, you can build and publish directly from your local machine:
```powershell
cd pc-app
npm run release:gphost
```
This runs the exact same pipeline using your local `.env.local` credentials and `pc-app/.tauri/gpn.key`.

---

## 5. Troubleshooting & Safety Protections

### 1. Version Mismatch
- **Symptom**: Pipeline fails at `Validate Version Consistency` step.
- **Cause**: The pushed Git tag (e.g. `v1.0.2`) does not match the version defined in `package.json` (`1.0.1`).
- **Fix**: Synchronize all three files (`package.json`, `tauri.conf.json`, `Cargo.toml`) with the intended tag before tagging.

### 2. Signing Verification Failure
- **Symptom**: Step fails with `CRITICAL: Signature verification failed! Release rejected.`
- **Cause**: The public key in `tauri.conf.json` does not match the private key used to sign the build.
- **Protection**: The script halts immediately before upload. No invalid or corrupted binary is ever published to GPHost.

### 3. Missing GPHost Database Table
- **Symptom**: Step fails with `Could not find the table 'public.app_releases' in the schema cache`.
- **Fix**: Apply the database migration `20261012000016_gpn_atomic_releases.sql` in Supabase on GPHost and reload the schema cache.

### 4. Rollback
- If an issue is discovered after release, publishing the previous known-good version (e.g. re-running release for a patched version like `1.0.2`) will immediately switch the active release pointer in GPHost without data loss.
