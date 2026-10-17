import fs from 'fs';
import path from 'path';

function getApiKey() {
  const candidatePaths = [
    path.resolve('.env.local'),
    path.resolve('pc-app/.env.local'),
    path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([a-zA-Z]:)/, '$1')), '..', '.env.local'),
  ];
  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf8').split('\n');
      for (const l of lines) {
        if (l.startsWith('VITE_GPHOST_API_KEY=') || l.startsWith('GPHOST_API_KEY=')) {
          return l.split('=')[1].trim().replace(/['"]/g, '');
        }
      }
    }
  }
  return '';
}

async function main() {
  const apiKey = getApiKey();
  console.log('[Clear GPHost] Fetching all active files...');
  const res = await fetch('https://gphost.eu.cc/api/v1/files', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'curl/8.4.0',
    },
  });
  const data = await res.json();
  const files = data.files || [];
  console.log(`[Clear GPHost] Found ${files.length} files to delete.`);

  for (const f of files) {
    console.log(`Deleting file ${f.id} (${f.filename || f.sanitized_name})...`);
    const delRes = await fetch(`https://gphost.eu.cc/api/files/${f.id}?force=true`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'curl/8.4.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmReleaseDeletion: true }),
    });
    console.log(`  -> HTTP ${delRes.status}: ${await delRes.text()}`);
  }

  // Verify
  const verifyRes = await fetch('https://gphost.eu.cc/api/v1/files', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'curl/8.4.0',
    },
  });
  const verifyData = await verifyRes.json();
  console.log('[Clear GPHost] Remaining file count:', verifyData.files?.length || 0);
}

main().catch(console.error);
