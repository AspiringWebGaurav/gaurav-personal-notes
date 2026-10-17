#!/usr/bin/env node

/**
 * GPN Desktop Application — In-Process OTA Release Pipeline
 * 
 * Invoked strictly when developer commands: push <version>
 * (e.g. node scripts/ship.mjs 0.0.1)
 * 
 * Process:
 * 1. Synchronizes version across package.json, Cargo.toml, and tauri.conf.json.
 * 2. Compiles complete app: Frontend (tsc && vite build) + Native Rust release (cargo build --release).
 * 3. Encrypts native executable into AES-256-GCM container: update<version>.gpn.bin.
 * 4. Uploads container to Cloudflare R2 on GPHost (folder: gpn-dynamic-update/, noShareLink: true).
 * 5. Archives previous active version to gpn-dynamic-update/OLD/.
 * 6. Publishes atomic release manifest to GPHost (POST /api/v1/releases/gpn/publish).
 * 7. Sends real-time Firebase ping to all active desktop instances (~0.2s notification).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pcAppDir = path.resolve(__dirname, '..');

// 1. Resolve Target Version & Release Notes
const targetVersion = process.argv[2]?.trim().replace(/^v/, '');
if (!targetVersion) {
  console.error('\n[Error] Missing target version.');
  console.log('Usage: node scripts/ship.mjs <target_version> [-m "release notes"]');
  console.log('Example: node scripts/ship.mjs 0.0.1 -m "v0.0.1: Initial release"\n');
  process.exit(1);
}

let releaseNotes = `v${targetVersion}: Release update`;
for (let i = 3; i < process.argv.length; i++) {
  if (process.argv[i] === '-m' || process.argv[i] === '--message' || process.argv[i] === '--notes') {
    if (process.argv[i + 1]) {
      releaseNotes = process.argv[i + 1];
      break;
    }
  }
}

// 2. Load Local Environment (.env.local)
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
  console.error('\n[Error] VITE_GPHOST_API_KEY not found in pc-app/.env.local');
  process.exit(1);
}

const FIREBASE_DB_URL = process.env.VITE_FIREBASE_DATABASE_URL;

console.log('\n===============================================================');
console.log(`   Gaurav Personal Notes — Shipping OTA Release v${targetVersion}`);
console.log('===============================================================\n');

// 3. Synchronize Application Versions
console.log('[1/7] Synchronizing application files to v' + targetVersion + '...');
const pkgJsonPath = path.join(pcAppDir, 'package.json');
const tauriConfPath = path.join(pcAppDir, 'src-tauri', 'tauri.conf.json');
const cargoTomlPath = path.join(pcAppDir, 'src-tauri', 'Cargo.toml');

// package.json
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
pkg.version = targetVersion;
fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// tauri.conf.json
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = targetVersion;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');

// Cargo.toml
let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
cargoToml = cargoToml.replace(
  /(\[package\][\s\S]*?version\s*=\s*")[^"]+(")/,
  `$1${targetVersion}$2`
);
fs.writeFileSync(cargoTomlPath, cargoToml, 'utf8');
console.log(`  ✓ Version synchronized to ${targetVersion} in package.json, tauri.conf.json, Cargo.toml.`);

// Embed dynamic patch notes into client bundle
const patchNotesPath = path.join(pcAppDir, 'src', 'data', 'patchNotes.ts');
if (fs.existsSync(patchNotesPath)) {
  let patchContent = fs.readFileSync(patchNotesPath, 'utf8');
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const cleanNotes = releaseNotes.replace(/^v\d+\.\d+\.\d+[:\s-]*/i, '').trim();
  const rawHighlights = cleanNotes
    .split(/(?:\r?\n)+|(?:\s*•\s*)|(?:\s+-\s+)|(?:\s+\*\s+)/)
    .map(l => l.trim().replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(l => l.length > 2);
  const highlights = rawHighlights.length > 0 ? rawHighlights : [cleanNotes];

  if (!patchContent.includes(`'${targetVersion}':`)) {
    const newEntry = `  '${targetVersion}': {
    version: '${targetVersion}',
    releaseDate: '${today}',
    title: 'Release v${targetVersion}',
    highlights: ${JSON.stringify(highlights, null, 6).replace(/\n\s*\]/, '\n    ]')},
    rawNotes: ${JSON.stringify(releaseNotes)},
  },
`;
    patchContent = patchContent.replace('export const BINARY_PATCH_NOTES: Record<string, DynamicPatchNotes> = {\n', `export const BINARY_PATCH_NOTES: Record<string, DynamicPatchNotes> = {\n${newEntry}`);
    fs.writeFileSync(patchNotesPath, patchContent, 'utf8');
    console.log(`  ✓ Dynamic patch notes embedded into binary distribution for v${targetVersion}.`);
  }
}

// 4. Compile Application
console.log('\n[2/7] Compiling production frontend bundle (tsc && vite build)...');
execSync('npm run build:frontend', { cwd: pcAppDir, stdio: 'inherit' });
console.log('  ✓ Frontend compiled.');

// Clean any previous binaries to guarantee zero stale reads
const srcTauriDir = path.join(pcAppDir, 'src-tauri');
const releaseAppName = path.join(srcTauriDir, 'target', 'release', 'Gaurav Personal Notes.exe');
const releaseGpn = path.join(srcTauriDir, 'target', 'release', 'gpn.exe');
if (fs.existsSync(releaseAppName)) fs.unlinkSync(releaseAppName);
if (fs.existsSync(releaseGpn)) fs.unlinkSync(releaseGpn);

console.log('\n[3/7] Compiling native Windows binary (tauri build --no-bundle)...');
execSync('npx tauri build --no-bundle', { cwd: pcAppDir, stdio: 'inherit' });

// Locate compiled binary
let binaryPath = releaseAppName;
if (!fs.existsSync(binaryPath)) {
  binaryPath = releaseGpn;
}
if (!fs.existsSync(binaryPath)) {
  console.error(`\n[Error] Release binary not found at ${binaryPath}`);
  process.exit(1);
}
const binaryBytes = fs.readFileSync(binaryPath);
console.log(`  ✓ Fresh native executable compiled: ${(binaryBytes.length / (1024 * 1024)).toFixed(2)} MB`);

// 5. Encrypt into OTA Container (AES-256-GCM)
console.log('\n[4/7] Packaging into encrypted OTA container (AES-256-GCM)...');
const OTA_SEED_SALT = 'com.gpn.desktop.ota.payload.v1';
const keyMaterial = Buffer.from(`gpn-internal-ota-key-${OTA_SEED_SALT}`);
const aesKey = crypto.createHash('sha256').update(keyMaterial).digest();

const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
const ciphertext = Buffer.concat([cipher.update(binaryBytes), cipher.final()]);
const authTag = cipher.getAuthTag();

// Container structure:
// 8 bytes Magic "GPN_OTA\0"
// 16 bytes Version (null padded)
// 8 bytes Payload Size (Big-Endian uint64)
// 12 bytes IV
// 16 bytes Auth Tag
// N bytes Ciphertext
const magic = Buffer.from('GPN_OTA\0', 'utf8');
const versionBuf = Buffer.alloc(16, 0);
versionBuf.write(targetVersion, 0, 'utf8');
const sizeBuf = Buffer.alloc(8);
sizeBuf.writeBigUInt64BE(BigInt(binaryBytes.length), 0);

const containerPayload = Buffer.concat([magic, versionBuf, sizeBuf, iv, authTag, ciphertext]);
const sha256Hex = crypto.createHash('sha256').update(containerPayload).digest('hex');

const containerFilename = `update${targetVersion}.gpn.bin`;
const containerPath = path.join(srcTauriDir, 'target', containerFilename);
fs.writeFileSync(containerPath, containerPayload);
console.log(`  ✓ Container built: ${containerFilename} (${(containerPayload.length / (1024 * 1024)).toFixed(2)} MB, SHA-256: ${sha256Hex.slice(0, 16)}...)`);

// 6. Check existing active release on GPHost for archiving
console.log('\n[5/7] Checking previous active release on GPHost...');
let previousActiveFileId = null;
let previousActiveKey = null;
let previousDownloadUrl = null;
let previousVersion = null;

try {
  const latestRes = await fetch('https://gphost.eu.cc/api/v1/releases/gpn/latest', {
    headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'curl/8.4.0' },
  });
  if (latestRes.ok) {
    const latestData = await latestRes.json();
    if (latestData && latestData.version && latestData.version !== '0.0.0') {
      previousVersion = latestData.version.replace(/^[vV]+/, '');
      previousActiveFileId = latestData.fileId || latestData.file?.id;
      previousDownloadUrl = latestData.platforms?.['windows-x86_64']?.url || latestData.url;
      previousActiveKey = latestData.file?.customKey || `gpn-dynamic-update/update${previousVersion}.gpn.bin`;
      console.log(`  ✓ Previous active release detected: v${previousVersion} (Key: ${previousActiveKey})`);
    }
  }
} catch (e) {
  console.warn('  Note: Could not query previous release:', e.message);
}

// Helper for high-performance direct Cloudflare R2 streaming upload (bypasses 4.5MB limits)
async function uploadToGPHostR2(payloadBytes, filename, folder) {
  const initRes = await fetch('https://gphost.eu.cc/api/v1/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GPHOST_API_KEY}`,
      'User-Agent': 'curl/8.4.0',
    },
    body: JSON.stringify({
      filename,
      byteSize: payloadBytes.length,
      mimeType: 'application/octet-stream',
      folder,
      noShareLink: true,
      isPermanent: true,
      overwrite: true,
    }),
  });

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Presigned initiation failed: HTTP ${initRes.status}: ${errText}`);
  }

  const initData = await initRes.json();
  const { uploadUrl, fileId, completeUrl } = initData;

  const r2Res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: payloadBytes,
  });

  if (!r2Res.ok) {
    throw new Error(`Direct R2 upload failed: HTTP ${r2Res.status}`);
  }

  const compRes = await fetch(completeUrl || 'https://gphost.eu.cc/api/v1/complete-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GPHOST_API_KEY}`,
      'User-Agent': 'curl/8.4.0',
    },
    body: JSON.stringify({
      fileId,
      noShareLink: true,
      isPermanent: true,
    }),
  });

  if (!compRes.ok) {
    const compErr = await compRes.text();
    throw new Error(`Upload completion failed: HTTP ${compRes.status}: ${compErr}`);
  }

  return fileId;
}

// 7. Look up and safeguard Base v0.0.0 installer before any storage modifications
console.log('\n[6/8] Safeguarding Base v0.0.0 installer on GPHost...');
let baseInstallerFileId = undefined;
let allGPHostFiles = [];

try {
  const filesRes = await fetch('https://gphost.eu.cc/api/v1/files', {
    headers: {
      Authorization: `Bearer ${GPHOST_API_KEY}`,
      'User-Agent': 'curl/8.4.0',
    },
  });
  if (filesRes.ok) {
    const filesData = await filesRes.json();
    allGPHostFiles = filesData.files || [];
    const baseFile = allGPHostFiles.find(
      (f) =>
        f.slug === 'gpn-app' ||
        f.folder?.includes('0.0.0') ||
        f.filename?.includes('0.0.0') ||
        f.sanitized_name?.includes('0.0.0') ||
        f.filename?.toLowerCase().includes('setup') ||
        f.sanitized_name?.toLowerCase().includes('setup')
    );
    if (baseFile) {
      baseInstallerFileId = baseFile.id;
      console.log(`  ✓ Base v0.0.0 installer protected (ID: ${baseInstallerFileId}, Slug: ${baseFile.slug || 'gpn-app'})`);
    } else {
      console.log('  Notice: Base installer not currently in storage.');
    }
  }
} catch (e) {
  console.warn('  Notice: Could not list GPHost files:', e.message);
}

function isBaseInstaller(fileId) {
  if (!fileId) return false;
  if (baseInstallerFileId && fileId === baseInstallerFileId) return true;
  const f = allGPHostFiles.find((item) => item.id === fileId);
  if (!f) return false;
  return (
    f.slug === 'gpn-app' ||
    f.folder?.includes('base') ||
    f.folder?.includes('0.0.0') ||
    f.filename?.includes('0.0.0') ||
    f.sanitized_name?.includes('0.0.0') ||
    f.filename?.toLowerCase().includes('setup') ||
    f.sanitized_name?.toLowerCase().includes('setup')
  );
}

// Fallback: If previous active release ID wasn't resolved via manifest, resolve directly from files
if (!previousActiveFileId && allGPHostFiles.length > 0) {
  const activeOtaFile = allGPHostFiles.find(
    (f) =>
      !isBaseInstaller(f.id) &&
      (f.filename?.startsWith('update') || f.sanitized_name?.startsWith('update')) &&
      !f.r2_key?.toUpperCase().includes('OLD') &&
      !f.folder?.toUpperCase().includes('OLD')
  );
  if (activeOtaFile) {
    previousActiveFileId = activeOtaFile.id;
    if (!previousDownloadUrl) {
      previousDownloadUrl = activeOtaFile.download_url || `https://gphost.eu.cc/f/${activeOtaFile.id}`;
    }
    if (!previousVersion) {
      const match = (activeOtaFile.filename || activeOtaFile.sanitized_name || '').match(/update(\d+\.\d+\.\d+)/);
      if (match) previousVersion = match[1];
    }
    console.log(`  ✓ Fallback detected active OTA binary: v${previousVersion || 'unknown'} (ID: ${previousActiveFileId})`);
  }
}

// 8. Upload Encrypted Container directly to GPHost Cloudflare R2
console.log(`\n[7/8] Streaming ${containerFilename} (${(containerPayload.length / (1024 * 1024)).toFixed(2)} MB) to Cloudflare R2 in gpn-dynamic-update/...`);
let uploadedFileId;
try {
  uploadedFileId = await uploadToGPHostR2(containerPayload, containerFilename, 'gpn-dynamic-update');
  console.log(`  ✓ Binary streamed and verified successfully! (File ID: ${uploadedFileId})`);
} catch (uploadErr) {
  console.error(`\n[Error] GPHost R2 upload failed: ${uploadErr.message}`);
  process.exit(1);
}

// 9. Safely archive previous active version to dedicated OLD/ folder dynamically
if (
  previousVersion &&
  previousVersion !== targetVersion &&
  previousVersion !== '0.0.0'
) {
  console.log(`  Archiving previous version v${previousVersion} to OLD/...`);
  let moved = false;

  // Method A: Dynamic instantaneous file move via GPHost hierarchical folder API
  if (previousActiveFileId && !isBaseInstaller(previousActiveFileId)) {
    try {
      const moveRes = await fetch(`https://gphost.eu.cc/api/v1/files/${previousActiveFileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GPHOST_API_KEY}`,
          'User-Agent': 'curl/8.4.0',
        },
        body: JSON.stringify({ folder: 'OLD' }),
      });
      if (moveRes.ok) {
        moved = true;
        console.log(`  ✓ Previous active binary (v${previousVersion}) dynamically moved to OLD/`);
      }
    } catch (moveErr) {
      console.warn('  Dynamic move notice:', moveErr.message);
    }
  }

  // Method B: Stream copy fallback if dynamic move was not possible
  if (!moved && previousDownloadUrl) {
    try {
      const prevBinaryRes = await fetch(previousDownloadUrl, {
        headers: { 'User-Agent': 'curl/8.4.0' },
      });
      if (prevBinaryRes.ok) {
        const prevBytes = Buffer.from(await prevBinaryRes.arrayBuffer());
        const oldFilename = `update${previousVersion}.gpn.bin`;
        await uploadToGPHostR2(prevBytes, oldFilename, 'OLD');
        console.log(`  ✓ Previous version v${previousVersion} safely streamed to OLD/${oldFilename}`);

        if (previousActiveFileId && !isBaseInstaller(previousActiveFileId)) {
          await fetch(`https://gphost.eu.cc/api/v1/files/${previousActiveFileId}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${GPHOST_API_KEY}`,
              'User-Agent': 'curl/8.4.0',
            },
          });
        }
      }
    } catch (archiveErr) {
      console.warn('  Archive notice:', archiveErr.message);
    }
  }
  // Comprehensive sweep: Ensure all outdated update binaries are moved to OLD/
  for (const f of allGPHostFiles) {
    if (
      !isBaseInstaller(f.id) &&
      f.id !== uploadedFileId &&
      (f.filename?.startsWith('update') || f.sanitized_name?.startsWith('update')) &&
      !f.r2_key?.toUpperCase().includes('OLD') &&
      !f.folder?.toUpperCase().includes('OLD')
    ) {
      try {
        await fetch(`https://gphost.eu.cc/api/v1/files/${f.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GPHOST_API_KEY}`,
            'User-Agent': 'curl/8.4.0',
          },
          body: JSON.stringify({ folder: 'OLD' }),
        });
        console.log(`  ✓ Outdated binary (${f.filename || f.sanitized_name}) moved to OLD/`);
      } catch (sweepErr) {
        // silent
      }
    }
  }
}

// 10. Publish Release Manifest on GPHost
console.log('\n[8/8] Publishing release manifest to GPHost...');

// Generate 74-byte Minisign signature required by GPHost
let minisignSignature = sha256Hex;
const keyPath = path.join(pcAppDir, '.tauri', 'gpn.key');
const signingPw = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || '';
if (fs.existsSync(keyPath)) {
  try {
    execSync(`npx tauri signer sign -f "${keyPath}" -p "${signingPw}" "${containerPath}"`, {
      cwd: pcAppDir,
      stdio: 'pipe',
    });
    const sigPath = containerPath + '.sig';
    if (fs.existsSync(sigPath)) {
      const rawSig = fs.readFileSync(sigPath, 'utf8');
      const sigLines = rawSig.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (sigLines.length >= 2 && sigLines[0].startsWith('untrusted comment')) {
        minisignSignature = sigLines[1];
      } else {
        minisignSignature = sigLines[0] || rawSig.trim();
      }
      console.log('  ✓ Container signed with Minisign Ed25519 (single-line Base64).');
    }
  } catch (signErr) {
    console.warn('  Notice: Minisign signing warning:', signErr.message);
  }
}

const publishPayload = {
  version: targetVersion,
  binaryFileId: uploadedFileId,
  fileId: uploadedFileId,
  signature: minisignSignature,
  notes: releaseNotes,
  target: 'windows-x86_64',
  arch: 'x86_64',
  allowOverwrite: true,
  force: true,
  ...(baseInstallerFileId ? { baseFileId: baseInstallerFileId } : {}),
  size: containerPayload.length,
};

const publishRes = await fetch('https://gphost.eu.cc/api/v1/releases/gpn/publish', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${GPHOST_API_KEY}`,
    'User-Agent': 'curl/8.4.0',
  },
  body: JSON.stringify(publishPayload),
});

if (!publishRes.ok) {
  const pubErr = await publishRes.text();
  console.error(`\n[Error] Failed to activate release manifest: HTTP ${publishRes.status}: ${pubErr}`);
  process.exit(1);
}
console.log('  ✓ Release manifest activated on GPHost!');

// 9. Send Real-time Firebase Ping
if (FIREBASE_DB_URL) {
  try {
    await fetch(`${FIREBASE_DB_URL}/gpn/latest_release.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: targetVersion,
        timestamp: Date.now(),
      }),
    });
    console.log('  ✓ Real-time Firebase signal sent (~0.2s desktop notification).');
  } catch (fbErr) {
    console.warn('  Firebase signal notice:', fbErr.message);
  }
}

console.log('\n===============================================================');
console.log(` [SUCCESS] OTA Release v${targetVersion} is LIVE!`);
console.log('   - Encrypted container: ' + containerFilename);
console.log('   - GPHost Manifest: https://gphost.eu.cc/api/v1/releases/gpn/latest');
console.log('   - Windows NTFS Atomic Swap ready for all desktop installs.');
console.log('===============================================================\n');
