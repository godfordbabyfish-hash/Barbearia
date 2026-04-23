import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const BUCKET = process.env.STORAGE_BUCKET || 'appointment-photos';
const ARCHIVE_PREFIX = process.env.ARCHIVE_PREFIX || '';
const RETENTION_DAYS = Number.parseInt(process.env.RETENTION_DAYS || '90', 10);
const APPLY = process.argv.includes('--apply');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE_SIZE = 1000;

const chunk = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const extractBucketPath = (publicUrl, bucket) => {
  if (!publicUrl) return null;
  try {
    const parsed = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
};

const fetchAllReferencedAppointmentPhotoPaths = async () => {
  const paths = new Set();
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('appointments')
      .select('photo_url')
      .not('photo_url', 'is', null)
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      const path = extractBucketPath(row.photo_url, BUCKET);
      if (path) paths.add(path);
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return paths;
};

const fetchAllOldBucketObjects = async (olderThanIso) => {
  const objects = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .schema('storage')
      .from('objects')
      .select('name, created_at, updated_at, metadata')
      .eq('bucket_id', BUCKET)
      .lt('created_at', olderThanIso)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    objects.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return objects;
};

const archiveObjects = async (paths) => {
  if (!ARCHIVE_PREFIX || paths.length === 0) return { archived: 0, failed: 0, failedPaths: [] };

  let archived = 0;
  const failedPaths = [];

  for (const path of paths) {
    const archivePath = `${ARCHIVE_PREFIX}/${path}`;
    const { error } = await supabase.storage.from(BUCKET).copy(path, archivePath);

    if (error) {
      failedPaths.push(path);
      continue;
    }

    archived += 1;
  }

  return { archived, failed: failedPaths.length, failedPaths };
};

const removeObjects = async (paths) => {
  if (paths.length === 0) return { removed: 0, errors: [] };

  let removed = 0;
  const errors = [];

  for (const batch of chunk(paths, 100)) {
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      errors.push({ batch, message: error.message });
      continue;
    }
    removed += batch.length;
  }

  return { removed, errors };
};

const main = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  console.log('--- Appointment Photo Cleanup ---');
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Retention: ${RETENTION_DAYS} days`);
  console.log(`Cutoff: ${cutoffIso}`);
  console.log(`Mode: ${APPLY ? 'APPLY (deletes enabled)' : 'DRY-RUN (no deletion)'}`);
  if (ARCHIVE_PREFIX) {
    console.log(`Archive prefix: ${ARCHIVE_PREFIX}`);
  }

  const [referencedPaths, oldObjects] = await Promise.all([
    fetchAllReferencedAppointmentPhotoPaths(),
    fetchAllOldBucketObjects(cutoffIso),
  ]);

  const candidates = oldObjects.filter((obj) => !referencedPaths.has(obj.name));

  console.log(`Referenced appointment photos: ${referencedPaths.size}`);
  console.log(`Old objects found in bucket: ${oldObjects.length}`);
  console.log(`Cleanup candidates (old + unreferenced): ${candidates.length}`);

  if (candidates.length === 0) {
    console.log('Nothing to clean.');
    return;
  }

  const candidatePaths = candidates.map((obj) => obj.name);

  if (!APPLY) {
    console.log('Dry-run sample (first 20):');
    for (const path of candidatePaths.slice(0, 20)) {
      console.log(` - ${path}`);
    }
    console.log('Run with --apply to execute cleanup.');
    return;
  }

  let finalPathsToDelete = candidatePaths;

  if (ARCHIVE_PREFIX) {
    const archiveResult = await archiveObjects(candidatePaths);
    console.log(`Archived: ${archiveResult.archived}`);
    if (archiveResult.failed > 0) {
      console.warn(`Archive failures: ${archiveResult.failed}`);
      const failedSet = new Set(archiveResult.failedPaths);
      finalPathsToDelete = candidatePaths.filter((path) => !failedSet.has(path));
      console.warn('Skipping deletion for files that failed archive.');
    }
  }

  const removeResult = await removeObjects(finalPathsToDelete);
  console.log(`Deleted: ${removeResult.removed}`);

  if (removeResult.errors.length > 0) {
    console.warn(`Delete batch failures: ${removeResult.errors.length}`);
    for (const item of removeResult.errors.slice(0, 5)) {
      console.warn(` - ${item.message}`);
    }
  }
};

main().catch((err) => {
  console.error('Cleanup failed:', err.message || err);
  process.exit(1);
});
