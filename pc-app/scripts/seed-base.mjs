#!/usr/bin/env node

/**
 * GPN Base Installer v0.0.0 Builder & Seeder
 * 
 * Rebuilds the permanent Base v0.0.0 installer with:
 * 1. The new In-Process OTA Self-Updater engine baked in.
 * 2. Launch at startup enabled by default.
 * 3. Chrome-style zero-wizard auto-launch on installation.
 * 4. In-process atomic shadow swapper for all ascending versions (v0.0.1+).
 * 
 * Uploads directly to Cloudflare R2 on GPHost with slug 'gpn-desktop'
 * at 'gpn-dynamic-update/base' permanently anchored for website downloads.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pcAppDir = path.resolve(__dirname, '..');

// 1. Load Local Environment
function loadEnv() {
  const envPath = path.join(pcAppDir, '.env.local');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const GPHOST_API_KEY = process.env.VITE_GPHOST_API_KEY || process.env.GPHOST_API_KEY;
if (!GPHOST_API_KEY) {
  console.error('[Error] VITE_GPHOST_API_KEY not found in pc-app/.env.local');
  process.exit(1);
}

console.log('\n===============================================================');
console.log('   Gaurav Personal Notes — One-Time Base v0.0.0 Seeder');
console.log('===============================================================\n');

// 2. Synchronize Version to 0.0.0
console.log('[1/5] Synchronizing codebase to Base v0.0.0...');
const pkgJsonPath = path.join(pcAppDir, 'package.json');
const tauriConfPath = path.join(pcAppDir, 'src-tauri', 'tauri.conf.json');
const cargoTomlPath = path.join(pcAppDir, 'src-tauri', 'Cargo.toml');

const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
pkg.version = '0.0.0';
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = '0.0.0';
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');

let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
cargoToml = cargoToml.replace(
  /(\[package\][\s\S]*?version\s*=\s*")[^"]+(")/,
  `$10.0.0$2`
);
fs.writeFileSync(cargoTomlPath, cargoToml, 'utf8');
console.log('  ✓ Codebase synchronized to v0.0.0.');

// 3. Compile Base Installer
console.log('\n[2/5] Compiling production frontend bundle (tsc && vite build)...');
execSync('npm run build:frontend', { cwd: pcAppDir, stdio: 'inherit' });

console.log('\n[3/5] Packaging Base v0.0.0 NSIS installer (tauri build)...');
// Purge stale nsis bundle to ensure fresh packaging
const targetRelDir = path.join(pcAppDir, 'src-tauri', 'target', 'release');

const nsisDir = path.join(targetRelDir, 'bundle', 'nsis');
if (fs.existsSync(nsisDir)) {
  for (const f of fs.readdirSync(nsisDir)) {
    if (f.endsWith('.exe')) fs.unlinkSync(path.join(nsisDir, f));
  }
}

execSync('npm run build', { cwd: pcAppDir, stdio: 'inherit' });

// 4. Locate Compiled Installer
let installerPath = null;
if (fs.existsSync(nsisDir)) {
  const files = fs.readdirSync(nsisDir);
  for (const f of files) {
    if (f.endsWith('.exe')) {
      installerPath = path.join(nsisDir, f);
      break;
    }
  }
}

if (!installerPath || !fs.existsSync(installerPath)) {
  console.error('\n[Error] Compiled NSIS installer not found in ' + nsisDir);
  process.exit(1);
}

const installerBytes = fs.readFileSync(installerPath);
console.log(`  ✓ Base installer built: ${(installerBytes.length / (1024 * 1024)).toFixed(2)} MB`);

// 5. Upload Base Installer to GPHost as 'gpn-desktop'
console.log('\n[4/5] Uploading Base v0.0.0 installer to GPHost (slug: gpn-desktop)...');

let uploaded = false;
let uploadedFileId = null;
// Method A: Direct presigned R2 upload (bypasses 4.5MB limit)
try {
  const initRes = await fetch('https://gphost.eu.cc/api/v1/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GPHOST_API_KEY}`,
      'User-Agent': 'curl/8.4.0',
    },
    body: JSON.stringify({
      filename: 'Gaurav_Personal_Notes_v0.0.0_x64-setup.exe',
      byteSize: installerBytes.length,
      mimeType: 'application/vnd.microsoft.portable-executable',
      slug: 'gpn-desktop',
      folder: 'gpn-dynamic-update/0.0.0',
      isPermanent: true,
      overwrite: true,
    }),
  });

  if (initRes.ok) {
    const initData = await initRes.json();
    if (initData.uploadUrl) {
      console.log('  Using presigned R2 upload stream...');
      const r2Res = await fetch(initData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/vnd.microsoft.portable-executable' },
        body: installerBytes,
      });

      if (r2Res.ok) {
        const compRes = await fetch(initData.completeUrl || 'https://gphost.eu.cc/api/v1/complete-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GPHOST_API_KEY}`,
            'User-Agent': 'curl/8.4.0',
          },
          body: JSON.stringify({
            fileId: initData.fileId,
            slug: 'gpn-desktop',
            isPermanent: true,
          }),
        });

        if (compRes.ok) {
          uploaded = true;
          uploadedFileId = initData.fileId;
          console.log(`  ✓ Base installer streamed via presigned R2! (File ID: ${initData.fileId})`);
        }
      }
    }
  }
} catch (e) {
  console.warn('  Note: Presigned flow notice:', e.message);
}

// Method B: Multipart FormData fallback
if (!uploaded) {
  console.log('  Using direct multipart upload...');
  const formData = new FormData();
  const fileBlob = new Blob([installerBytes], { type: 'application/vnd.microsoft.portable-executable' });
  formData.append('file', fileBlob, 'Gaurav_Personal_Notes_v0.0.0_x64-setup.exe');
  formData.append('slug', 'gpn-desktop');
  formData.append('folder', 'gpn-dynamic-update/0.0.0');
  formData.append('isPermanent', 'true');
  formData.append('overwrite', 'true');

  const uploadRes = await fetch('https://gphost.eu.cc/api/v1/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GPHOST_API_KEY}`,
      'User-Agent': 'curl/8.4.0',
    },
    body: formData,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error(`\n[Error] Failed to seed Base installer: HTTP ${uploadRes.status}: ${errText}`);
    process.exit(1);
  }
  try {
    const uploadData = await uploadRes.json();
    uploadedFileId = uploadData.file?.id || uploadData.fileId;
  } catch {}
  console.log('  ✓ Base installer uploaded via multipart successfully! (File ID: ' + (uploadedFileId || 'active') + ')');
}

console.log('\n[5/5] Verifying Base installer anchor...');
try {
  const filesCheck = await fetch('https://gphost.eu.cc/api/v1/files', {
    headers: { Authorization: `Bearer ${GPHOST_API_KEY}`, 'User-Agent': 'curl/8.4.0' },
  });
  if (filesCheck.ok) {
    const fd = await filesCheck.json();
    const bf = fd.files?.find((f) => f.slug === 'gpn-desktop' || f.id === uploadedFileId);
    if (bf) {
      console.log(`  ✓ Confirmed in GPHost database: ID ${bf.id}, Slug: '${bf.slug}', Size: ${((bf.byte_size || bf.size || installerBytes.length) / (1024 * 1024)).toFixed(2)} MB`);
    }
  }
} catch (e) {
  console.warn('  Verification check note:', e.message);
}

const rawCheck = await fetch('https://gphost.eu.cc/raw/gpn-desktop', {
  method: 'HEAD',
  headers: { 'User-Agent': 'curl/8.4.0' },
});
if (rawCheck.ok) {
  console.log('  ✓ Base installer verified live at https://gphost.eu.cc/raw/gpn-desktop');
} else {
  console.log(`  Notice: Raw endpoint returned HTTP ${rawCheck.status}. CDN cache may take ~1 minute to propagate.`);
}

// 6. Automatically update website download page with fresh cache-buster
const downloadPagePath = path.resolve(pcAppDir, '..', 'src', 'app', 'download', 'page.tsx');
if (fs.existsSync(downloadPagePath)) {
  const ts = Date.now();
  let content = fs.readFileSync(downloadPagePath, 'utf8');
  content = content.replace(
    /export const DESKTOP_DOWNLOAD_URL = `\${baseDownloadUrl}\?v=[^`]+`;/,
    `export const DESKTOP_DOWNLOAD_URL = \`\${baseDownloadUrl}?v=0.0.0-fresh-${ts}\`;`
  );
  content = content.replace(
    /export const DESKTOP_SHARE_URL = "https:\/\/gphost\.eu\.cc\/f\/gpn-desktop(\?v=[^"]+)?";/,
    `export const DESKTOP_SHARE_URL = "https://gphost.eu.cc/f/gpn-desktop?v=0.0.0-fresh-${ts}";`
  );
  fs.writeFileSync(downloadPagePath, content, 'utf8');
  console.log(`  ✓ Synchronized website download page with cache-buster: ?v=0.0.0-fresh-${ts}`);
}

console.log('\n===============================================================');
console.log(' [SUCCESS] Base v0.0.0 Installer Seeded & Permanently Locked!');
console.log('   - Anchored at: https://gphost.eu.cc/raw/gpn-desktop');
console.log('   - Folder: gpn-dynamic-update/0.0.0/');
console.log('   - New In-Process Self-Updater engine baked in.');
console.log('   - Active OTA releases are ready to start clean at v0.0.1!');
console.log('===============================================================\n');
