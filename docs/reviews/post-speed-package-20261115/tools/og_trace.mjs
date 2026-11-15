// Trace the Supabase reads api/og.js performs for a document path (read-only GETs with the public anon key, same as production).
// usage: node og_trace.mjs <worktree> <path> [<path> ...]
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const [root, ...paths] = process.argv.slice(2);
const og = (await import(pathToFileURL(join(root, 'api/og.js')))).default;
const { PUBLIC_READING_PROFILE_ID } = await import(pathToFileURL(join(root, 'src/lib/publicReadingRelease2029.js')));
const realFetch = globalThis.fetch;
for (const path of paths) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    const t0 = performance.now();
    const res = await realFetch(url, init);
    const clone = res.clone(); const buf = await clone.arrayBuffer();
    calls.push({ at: Math.round(t0 - T0), ms: Math.round(performance.now() - t0), status: res.status, bytes: buf.byteLength, url: String(url).replace(/^https:\/\/[^/]+\/rest\/v1\//, '').slice(0, 150) });
    return res;
  };
  const res = { h: new Map(), code: 200, body: '', setHeader(k, v) { this.h.set(String(k).toLowerCase(), v); }, status(c) { this.code = c; return this; }, send(b) { this.body = String(b); return this; } };
  const T0 = performance.now();
  await og({ method: 'GET', url: '/api/og?path=' + encodeURIComponent(path), headers: { host: 'sod1820.co.il', 'x-forwarded-proto': 'https' },
    publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true, publicRequestedPath: path,
    publicReadingSearch: '', query: { path, crawler: 'search' } }, res);
  const total = Math.round(performance.now() - T0);
  console.log(JSON.stringify({ path: decodeURIComponent(path).slice(0, 40), status: res.code, total, canonical: (res.body.match(/rel="canonical" href="([^"]*)/) || [])[1]?.slice(-30), calls }));
}
