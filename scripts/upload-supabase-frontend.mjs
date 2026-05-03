import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_FRONTEND_BUCKET ?? 'chainachieve-frontend';
const distDir = process.argv[2] ?? 'frontend/dist';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const files = await walk(distDir);
for (const file of files) {
  const relative = path.relative(distDir, file).split(path.sep).join('/');
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${bucket}/${relative}`;
  const cacheControl = relative === 'index.html' ? 'no-cache' : 'max-age=31536000, immutable';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': contentType(relative),
      'Cache-Control': cacheControl,
      'x-upsert': 'true',
    },
    body: createReadStream(file),
    duplex: 'half',
  });

  if (!response.ok) {
    throw new Error(`Upload failed for ${relative}: ${response.status} ${await response.text()}`);
  }
  console.log(`uploaded ${relative}`);
}

console.log(`Frontend uploaded to ${supabaseUrl}/storage/v1/object/public/${bucket}/index.html`);

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      files.push(...await walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  if (file.endsWith('.webp')) return 'image/webp';
  if (file.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}
