#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.MIGRATE_BUCKET || 'site-images';
const CATEGORY = process.env.MIGRATE_CATEGORY || 'services';
const DRY_RUN = process.argv.includes('--dry-run') && !process.argv.includes('--apply');
const APPLY = process.argv.includes('--apply');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json'
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function listObjects(prefix) {
  const url = `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: 'name', order: 'asc' } })
  });
  if (!res.ok) throw new Error(`listObjects failed: ${res.status}`);
  return res.json();
}

async function downloadPublic(objectPath) {
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function upload(objectPath, buffer, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'x-upsert': 'true',
      'cache-control': '31536000',
      'content-type': contentType
    },
    body: buffer
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
}

function tableForCategory(cat) {
  if (cat === 'services') return 'services';
  if (cat === 'barbers') return 'barbers';
  if (cat === 'products') return 'products';
  return 'services';
}

async function updateImageUrl(table, id, url) {
  const endpoint = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ image_url: url })
  });
  if (!res.ok) throw new Error(`update services failed: ${res.status}`);
}

async function main() {
  console.log(`Starting image migration. bucket=${BUCKET} category=${CATEGORY} dry=${DRY_RUN && !APPLY}`);

  // Backup map of service -> image_url
  const table = tableForCategory(CATEGORY);
  const recordsRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id,image_url`, { headers });
  if (!recordsRes.ok) throw new Error(`fetch ${table} failed: ${recordsRes.status}`);
  const records = await recordsRes.json();
  const backupPath = path.join(process.cwd(), `scripts/_backup-${table}-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify(records, null, 2));
  console.log(`Backup saved to ${backupPath}`);

  const prefix = CATEGORY === BUCKET ? '' : `${CATEGORY}/`;
  const objects = await listObjects(prefix);
  const candidates = objects.filter(o => !/-(w400|w800)\.(webp|jpg|jpeg|png)$/i.test(o.name) && /\.(png|jpe?g|webp)$/i.test(o.name));
  console.log(`Found ${candidates.length} original images`);

  let processed = 0;
  for (const obj of candidates) {
    const objectPath = `${prefix}${obj.name}`;
    const basename = obj.name.replace(/\.[^/.]+$/, '');
    const w400 = `${prefix}${basename}-w400.webp`;
    const w800 = `${prefix}${basename}-w800.webp`;

    console.log(`Processing ${objectPath}`);
    if (DRY_RUN) {
      console.log(`  -> would create ${w400} and ${w800}`);
      continue;
    }

    // Download once
    const input = await downloadPublic(objectPath);

    // Generate variants
    const buf400 = await sharp(input).resize({ width: 400 }).webp({ quality: 65 }).toBuffer();
    const buf800 = await sharp(input).resize({ width: 800 }).webp({ quality: 65 }).toBuffer();

    // Upload
    await upload(w400, buf400, 'image/webp');
    await upload(w800, buf800, 'image/webp');

    // Update services.image_url if it points to this object
    const publicBase = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
    const match = records.find(s => (s.image_url || '').includes(obj.name));
    if (match) {
      const newUrl = `${publicBase}${w800}`;
      await updateImageUrl(table, match.id, newUrl);
      console.log(`  -> updated ${table} ${match.id} to ${newUrl}`);
    }

    processed++;
    if (processed % 20 === 0) await sleep(300);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
