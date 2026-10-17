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
  console.log('Using API key:', apiKey ? 'FOUND (' + apiKey.slice(0, 8) + '...)' : 'MISSING');
  const res = await fetch('https://gphost.eu.cc/api/v1/files', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'curl/8.4.0',
    },
  });
  console.log('HTTP Status:', res.status);
  const data = await res.json();
  console.log('Files count:', data.files?.length);
  console.log(JSON.stringify(data.files, null, 2));
}
main().catch(console.error);
