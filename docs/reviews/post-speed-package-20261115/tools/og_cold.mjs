// One og handler call in a fresh process (cold connection pool, as a cold function instance), plus a second call on the warmed pool.
// usage: node og_cold.mjs <og module path> <doc path>
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
const [ogPath, path] = process.argv.slice(2);
const root = join(dirname(ogPath), '..');
const og = (await import(pathToFileURL(ogPath))).default;
const { PUBLIC_READING_PROFILE_ID } = await import(pathToFileURL(join(root, 'src/lib/publicReadingRelease2029.js')));
let calls = 0; const realFetch = globalThis.fetch; globalThis.fetch = (...a) => { calls++; return realFetch(...a); };
async function once() {
  const res = { code: 200, body: '', setHeader() {}, status(c) { this.code = c; return this; }, send(b) { this.body = String(b); return this; } };
  const t0 = performance.now(); calls = 0;
  await og({ method: 'GET', url: '/api/og?path=' + encodeURIComponent(path), headers: { host: 'sod1820.co.il', 'x-forwarded-proto': 'https' }, publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID,
    publicReadingProductionArtifact: true, publicRequestedPath: path, publicReadingSearch: '', query: { path, crawler: 'search' } }, res);
  return { ms: Math.round(performance.now() - t0), status: res.code, calls };
}
const first = await once(); const second = await once();
console.log(JSON.stringify({ first, second }));
