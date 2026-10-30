// Build-time derivatives of the existing photograph. No runtime, palette or layout owner.
// Run with --check to verify the committed files without writing them.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const sourcePath = 'public/legacy-dark-bg-2026-09-30.png';
const source = await readFile(new URL(sourcePath, root));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = process.argv.includes('--check');
const variants = [];

for (const [width, maxBytes] of [[720, 30_000], [1280, 60_000]]) {
  const bytes = await sharp(source).rotate().resize({ width, withoutEnlargement: true })
    .webp({ quality: 72, effort: 5 }).toBuffer();
  assert.ok(bytes.length <= maxBytes, `${width}px exceeds the background byte budget`);
  const digest = hash(bytes);
  const href = `/legacy-dark-bg-post-${width}-${digest.slice(0, 12)}.webp`;
  const destination = new URL(`public${href}`, root);
  if (check) assert.deepEqual(await readFile(destination), bytes, `${href} is stale`);
  else await writeFile(destination, bytes);
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, width);
  assert.equal(metadata.hasAlpha, false);
  const [reference, decoded] = await Promise.all([
    sharp(source).rotate().resize({ width, withoutEnlargement: true }).removeAlpha().raw().toBuffer(),
    sharp(bytes).removeAlpha().raw().toBuffer(),
  ]);
  assert.equal(reference.length, decoded.length);
  let squareError = 0;
  for (let i = 0; i < reference.length; i++) squareError += (reference[i] - decoded[i]) ** 2;
  const psnrDb = 10 * Math.log10(255 ** 2 / (squareError / reference.length));
  assert.ok(psnrDb >= 32, `${width}px derivative loses too much image detail`);
  variants.push({ href, width: metadata.width, height: metadata.height, bytes: bytes.length,
    maxBytes, sha256: digest, decodedRgbBytes: reference.length,
    reductionPercent: +(100 * (1 - bytes.length / source.length)).toFixed(2),
    psnrDb: +psnrDb.toFixed(2) });
}
const receipt = { source: sourcePath, sourceBytes: source.length, sourceSha256: hash(source),
  owner: 'Existing Post background photograph; build-time assets only',
  reproduction: 'node scripts/prepare-post-background-assets.mjs --check',
  cache: 'Existing vercel.json image headers: max-age=604800; stale-while-revalidate=86400',
  integration: 'Not wired into Post CSS here; visual writer retains the existing background layer',
  variants };
const receiptUrl = new URL('docs/reviews/post-background-assets-20261030.json', root);
const serialized = JSON.stringify(receipt, null, 2) + '\n';
if (check) assert.equal(await readFile(receiptUrl, 'utf8'), serialized, 'Receipt is stale');
else {
  await mkdir(new URL('docs/reviews/', root), { recursive: true });
  await writeFile(receiptUrl, serialized);
}
console.log(JSON.stringify({ status: check ? 'VERIFIED' : 'GENERATED', receipt: fileURLToPath(receiptUrl), ...receipt }));
