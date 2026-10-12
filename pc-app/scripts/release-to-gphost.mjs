#!/usr/bin/env node

/**
 * GPHost Atomic Release Pipeline for Gaurav Personal Notes (GPN)
 * 
 * Flow:
 * 1. Validates local release credentials (GPHOST_API_KEY, TAURI signing keys)
 * 2. Compiles production Tauri bundle with createUpdaterArtifacts & Minisign signing
 * 3. Verifies updater package (.nsis.zip) and signature (.nsis.zip.sig)
 * 4. Computes SHA-256 checksum and exact byte size
 * 5. Uploads updater package to GPHost via POST /api/v1/upload
 * 6. Atomically publishes the release via POST /api/v1/releases/gpn/publish
 * 7. Verifies published manifest at GET /api/v1/releases/gpn/latest
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pcAppDir = path.resolve(__dirname, '..');
const repoRootDir = path.resolve(pcAppDir, '..');

// 1. Load environment variables from .env.local
function loadEnv() {
  const envCandidates = [
    path.join(repoRootDir, '.env.local'),
    path.join(pcAppDir, '.env.local'),
    path.join(repoRootDir, '.env'),
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
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
}

loadEnv();

// 0. Validate version consistency across package.json, tauri.conf.json, Cargo.toml, and Git tag
try {
  execSync('node scripts/check-versions.mjs', {
    cwd: pcAppDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch (verErr) {
  console.error('\n[GPHost Release] Version verification failed.');
  process.exit(1);
}

const GPHOST_API_KEY = process.env.GPHOST_API_KEY || process.env.NEXT_PUBLIC_GPHOST_API_KEY;
if (!GPHOST_API_KEY) {
  console.error('[GPHost Release] Error: GPHOST_API_KEY is not defined in environment or .env.local');
  process.exit(1);
}

const pkgJsonPath = path.join(pcAppDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
const version = pkg.version;

console.log(`=======================================================`);
console.log(`  GPHost Atomic Release: Gaurav Personal Notes v${version}`);
console.log(`=======================================================`);

// 2. Set up Tauri signing keys for build
let tempKeyCreated = false;
const keyDirPath = path.join(pcAppDir, '.tauri');
const keyFilePath = path.join(keyDirPath, 'gpn.key');

if (!fs.existsSync(keyFilePath) && process.env.TAURI_SIGNING_PRIVATE_KEY) {
  if (!fs.existsSync(keyDirPath)) {
    fs.mkdirSync(keyDirPath, { recursive: true });
  }
  fs.writeFileSync(keyFilePath, process.env.TAURI_SIGNING_PRIVATE_KEY.trim(), 'utf8');
  tempKeyCreated = true;
  process.env.TAURI_SIGNING_PRIVATE_KEY_PATH = keyFilePath;
  console.log('[Security] Initialized private signing key from environment secret.');
} else if (fs.existsSync(keyFilePath) && !process.env.TAURI_SIGNING_PRIVATE_KEY_PATH) {
  process.env.TAURI_SIGNING_PRIVATE_KEY_PATH = keyFilePath;
}

if (!process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
  console.error('[GPHost Release] Error: TAURI_SIGNING_PRIVATE_KEY_PASSWORD is not defined in environment or .env.local');
  process.exit(1);
} else {
  console.log('[Security] Verified TAURI_SIGNING_PRIVATE_KEY_PASSWORD is present in memory (value hidden).');
}

// 3. Build application & updater artifacts
console.log('\n[1/5] Building Tauri v2 desktop application & updater bundle...');
try {
  execSync('npm run build', {
    cwd: pcAppDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch (buildErr) {
  console.error('\n[GPHost Release] Build failed:', buildErr.message);
  if (tempKeyCreated && fs.existsSync(keyFilePath)) {
    fs.unlinkSync(keyFilePath);
  }
  process.exit(1);
}

// 4. Locate generated artifacts
console.log('\n[2/5] Inspecting generated updater artifacts...');
const bundleDir = path.join(pcAppDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis');

// Strictly pair the updater package (NSIS installer .exe or .zip) and its matching .sig signature file
let updaterFile = null;
let sigFile = null;

if (fs.existsSync(bundleDir)) {
  const candidates = [
    `Gaurav Personal Notes_${version}_x64-setup.exe`,
    `Gaurav Personal Notes_${version}_x64-setup.nsis.zip`,
    `Gaurav Personal Notes_${version}_x64-setup.zip`,
  ];

  for (const name of candidates) {
    const candidatePath = path.join(bundleDir, name);
    const candidateSig = `${candidatePath}.sig`;
    if (fs.existsSync(candidatePath) && fs.existsSync(candidateSig)) {
      updaterFile = candidatePath;
      sigFile = candidateSig;
      break;
    }
  }

  if (!updaterFile) {
    const files = fs.readdirSync(bundleDir);
    for (const f of files) {
      if (f.includes(version) && (f.endsWith('.exe') || f.endsWith('.zip'))) {
        const potentialPath = path.join(bundleDir, f);
        const potentialSig = `${potentialPath}.sig`;
        if (fs.existsSync(potentialSig)) {
          updaterFile = potentialPath;
          sigFile = potentialSig;
          break;
        }
      }
    }
  }
}

if (!updaterFile || !fs.existsSync(updaterFile)) {
  console.error(`[GPHost Release] Error: Matching updater binary for v${version} not found in ${bundleDir}`);
  process.exit(1);
}

if (!sigFile || !fs.existsSync(sigFile)) {
  console.error(`[GPHost Release] Error: Matching signature file (${path.basename(updaterFile)}.sig) not found in ${bundleDir}`);
  process.exit(1);
}

const fileStats = fs.statSync(updaterFile);
const fileBuffer = fs.readFileSync(updaterFile);
const sigContent = fs.readFileSync(sigFile, 'utf8').trim();

// 5. Compute SHA-256 Checksum for server-side integrity check
const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
console.log(`- Artifact:     ${path.basename(updaterFile)}`);
console.log(`- Size:         ${fileStats.size} bytes (${(fileStats.size / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`- SHA-256:      ${sha256Hash}`);
console.log(`- Signature:    ${sigContent.slice(0, 45)}...`);

// 6. Upload package to GPHost via POST /api/v1/upload
console.log('\n[3/5] Uploading updater package to GPHost...');
async function uploadToGPHost() {
  const filename = path.basename(updaterFile);
  const boundary = `----WebKitFormBoundary${crypto.randomBytes(16).toString('hex')}`;
  const mimeType = filename.endsWith('.exe') ? 'application/octet-stream' : 'application/zip';
  
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const payload = Buffer.concat([header, fileBuffer, footer]);

  const response = await fetch('https://gphost.eu.cc/api/v1/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GPHOST_API_KEY}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(payload.length),
    },
    body: payload,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GPHost upload failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data;
}

// 7. Atomically publish release
async function publishRelease(uploadResult) {
  console.log('\n[4/5] Calling GPHost atomic release publishing API...');
  
  const publishPayload = {
    version: version,
    binaryFileId: uploadResult.fileId || uploadResult.id,
    fileId: uploadResult.fileId || uploadResult.id,
    file_id: uploadResult.fileId || uploadResult.id,
    target: 'windows-x86_64',
    sha256: sha256Hash,
    byteSize: fileStats.size,
    byte_size: fileStats.size,
    signature: sigContent,
    rawUrl: uploadResult.rawUrl || uploadResult.downloadUrl,
    raw_url: uploadResult.rawUrl || uploadResult.downloadUrl,
    downloadUrl: `https://gphost.eu.cc/api/v1/releases/gpn/download/${version}`,
    download_url: `https://gphost.eu.cc/api/v1/releases/gpn/download/${version}`,
    notes: `Gaurav Personal Notes Windows v${version} release.`,
    authoritative_owner: 'gauravpatil5737@gmail.com',
  };

  const response = await fetch('https://gphost.eu.cc/api/v1/releases/gpn/publish', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GPHOST_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(publishPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GPHost publish failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data;
}

// 8. Verify manifest
async function verifyLiveManifest() {
  console.log('\n[5/5] Verifying live GPHost release manifest...');
  const manifestUrl = 'https://gphost.eu.cc/api/v1/releases/gpn/latest';
  const response = await fetch(manifestUrl);

  if (!response.ok) {
    console.warn(`[GPHost Release] Warning: Could not fetch manifest at ${manifestUrl} (${response.status})`);
    return;
  }

  const manifest = await response.json();
  console.log('Live Manifest Response:');
  console.log(JSON.stringify(manifest, null, 2));

  if (manifest.version === version) {
    console.log(`\n Manifest verified: Live version is v${version}`);
  } else {
    console.warn(`\n Manifest returned version ${manifest.version} (expected ${version})`);
  }
}

async function run() {
  try {
    // Cryptographically verify the artifact signature before uploading or publishing
    console.log('\n[2.5/5] Cryptographically verifying generated signature against public key...');
    try {
      execSync('cargo test --test verify_signature -- --nocapture', {
        cwd: path.join(pcAppDir, 'src-tauri'),
        stdio: 'inherit',
        env: { ...process.env },
      });
      console.log(' Cryptographic signature verification PASSED.');
    } catch (sigErr) {
      console.error('\n[GPHost Release] CRITICAL: Signature verification failed! Release rejected.');
      process.exit(1);
    }

    const uploadResult = await uploadToGPHost();
    console.log(` Uploaded to GPHost. File ID: ${uploadResult.fileId || 'assigned'}`);

    const publishResult = await publishRelease(uploadResult);
    console.log(` Published successfully:`, publishResult);

    await verifyLiveManifest();

    console.log('\n=======================================================');
    console.log(`  GPHost Atomic Release v${version} Completed Successfully!`);
    console.log('=======================================================');
  } catch (err) {
    console.error('\n[GPHost Release] Error:', err.message);
    process.exit(1);
  } finally {
    if (tempKeyCreated && fs.existsSync(keyFilePath)) {
      try {
        fs.unlinkSync(keyFilePath);
        console.log('[Security] Removed temporary CI signing key file.');
      } catch (_) {}
    }
  }
}

run();
