#!/usr/bin/env node

/**
 * Version consistency validator for Gaurav Personal Notes (GPN)
 * 
 * Verifies that:
 * 1. pc-app/package.json version matches pc-app/src-tauri/tauri.conf.json
 * 2. pc-app/package.json version matches pc-app/src-tauri/Cargo.toml
 * 3. The Git tag (if running in GitHub Actions or provided as arg) matches v<version>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pcAppDir = path.resolve(__dirname, '..');

// 1. Read pc-app/package.json
const pkgJsonPath = path.join(pcAppDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
const pkgVersion = pkg.version;

// 2. Read pc-app/src-tauri/tauri.conf.json
const tauriConfPath = path.join(pcAppDir, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
const tauriVersion = tauriConf.version;

// 3. Read pc-app/src-tauri/Cargo.toml
const cargoTomlPath = path.join(pcAppDir, 'src-tauri', 'Cargo.toml');
const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
const cargoMatch = cargoToml.match(/\[package\][\s\S]*?version\s*=\s*"([^"]+)"/);
const cargoVersion = cargoMatch ? cargoMatch[1] : null;

console.log('[Version Check] Inspecting GPN application versions:');
console.log(`  - pc-app/package.json:        ${pkgVersion}`);
console.log(`  - pc-app/src-tauri/tauri.conf.json: ${tauriVersion}`);
console.log(`  - pc-app/src-tauri/Cargo.toml:      ${cargoVersion || 'NOT FOUND'}`);

let hasError = false;

if (pkgVersion !== tauriVersion) {
  console.error(`[Version Check] Error: package.json (${pkgVersion}) and tauri.conf.json (${tauriVersion}) mismatch!`);
  hasError = true;
}

if (pkgVersion !== cargoVersion) {
  console.error(`[Version Check] Error: package.json (${pkgVersion}) and Cargo.toml (${cargoVersion}) mismatch!`);
  hasError = true;
}

// 4. Check Git tag if provided via argument or GitHub Actions environment
const rawTag = process.argv[2] || process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME;
if (rawTag && (rawTag.startsWith('v') || rawTag.includes('.'))) {
  const expectedTag = `v${pkgVersion}`;
  console.log(`  - Pushed Git tag / Ref:        ${rawTag}`);
  
  if (rawTag !== expectedTag && rawTag !== pkgVersion) {
    console.error(`[Version Check] Error: Git tag "${rawTag}" does not match application version "${expectedTag}"!`);
    console.error(`  To release version ${pkgVersion}, the Git tag must be "${expectedTag}".`);
    hasError = true;
  }
}

if (hasError) {
  console.error('\n[Version Check] FAILED: Versions must be synchronized before release.');
  process.exit(1);
}

console.log(`\n[Version Check] PASSED: All version sources are synchronized at v${pkgVersion}.\n`);
