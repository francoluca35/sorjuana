import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error(
    'Missing env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
  );
  process.exit(1);
}

const projectRoot = process.cwd();
const assetsRoot = path.join(projectRoot, 'public', 'Assets');
const manifestPath = path.join(projectRoot, 'src', 'app', 'config', 'cloudinaryAssets.ts');

const imageExt = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const videoExt = new Set(['.mp4', '.mov', '.webm']);

function resourceTypeForExt(ext) {
  if (imageExt.has(ext)) return 'image';
  if (videoExt.has(ext)) return 'video';
  return null;
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(fullPath)));
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

function sign(params) {
  const serialized = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return createHash('sha1').update(serialized + API_SECRET).digest('hex');
}

async function uploadFile(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  const resourceType = resourceTypeForExt(ext);
  if (!resourceType) return null;

  const relFromAssets = path.relative(assetsRoot, absPath).replaceAll('\\', '/');
  const publicId = `modern-fashion-store/${relFromAssets.replace(/\.[^/.]+$/, '')}`;
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign = {
    folder: undefined,
    public_id: publicId,
    timestamp,
    overwrite: true,
    invalidate: true,
    resource_type: undefined,
  };
  const signature = sign(paramsToSign);

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
  const form = new FormData();
  form.set('file', new Blob([await fs.readFile(absPath)]), path.basename(absPath));
  form.set('api_key', API_KEY);
  form.set('timestamp', String(timestamp));
  form.set('signature', signature);
  form.set('public_id', publicId);
  form.set('overwrite', 'true');
  form.set('invalidate', 'true');

  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed for ${relFromAssets}: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return {
    key: `/Assets/${relFromAssets}`,
    secureUrl: json.secure_url,
    publicId: json.public_id,
    resourceType,
  };
}

function manifestSource(entries) {
  const lines = [];
  lines.push('export const cloudinaryAssets = {');
  for (const e of entries.sort((a, b) => a.key.localeCompare(b.key))) {
    lines.push(`  '${e.key}': '${e.secureUrl}',`);
  }
  lines.push("} as const;");
  lines.push('');
  lines.push('export function getCloudinaryAsset(path: string): string {');
  lines.push('  return cloudinaryAssets[path as keyof typeof cloudinaryAssets] ?? path;');
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

async function run() {
  const files = await walk(assetsRoot);
  const uploaded = [];
  for (const file of files) {
    const up = await uploadFile(file);
    if (up) {
      uploaded.push(up);
      console.log(`Uploaded: ${up.key}`);
    }
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, manifestSource(uploaded), 'utf8');
  console.log(`\nWrote manifest: ${manifestPath}`);
  console.log(`Total uploaded: ${uploaded.length}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
