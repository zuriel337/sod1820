// Actual World component, synthetic anonymous API; no production writes.
// TZVI_TEST_VIDEO=/path/to/public.mp4 TZVI_TEST_POSTER=/path/to/public.jpg node test/tzvi-s6-video.browser.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const videoBytes = await readFile(process.env.TZVI_TEST_VIDEO);
const posterBytes = await readFile(process.env.TZVI_TEST_POSTER);
const port = 5197, base = `http://127.0.0.1:${port}`;
const server = await createServer({ server: { host: '127.0.0.1', port, strictPort: true, hmr: false } });
await server.listen();
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const id = '0c7a4f04-ea80-42ff-af93-db86339ddab2';
const writer = { id: 'c66f0464-0928-490e-be9b-66d8a87e7fc8', slug: 'tzvi-opoc', display_name: 'צבי (OPOC)', active: true, public_visibility: 'public', wa_names: [] };
const mediaBase = 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/fixture/';
const source = { id, contributor_id: writer.id, status: 'live', text: '🎬 עדכון וידאו', image_url: 'storage-object:00000000-0000-4000-8000-000000000001', created_at: '2026-11-15T12:00:00Z' };
const html = '<!doctype html><html lang="he" dir="rtl"><body><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/world-writer-source-focus-2029.jsx"></script></body></html>';
try {
  const page = await browser.newPage(); const errors = [], unexpected = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', async route => {
    const request = route.request(), u = new URL(request.url());
    if (u.origin === base) return u.pathname === '/world'
      ? route.fulfill({ contentType: 'text/html', body: html }) : route.continue();
    const headers = { 'access-control-allow-origin': '*' };
    if (request.url() === mediaBase + 'original.mp4') return route.fulfill({ headers, contentType: 'video/mp4', body: videoBytes });
    if (request.url() === mediaBase + 'poster.jpg') return route.fulfill({ headers, contentType: 'image/jpeg', body: posterBytes });
    if (!u.pathname.includes('/rest/v1/')) return route.fulfill({ status: 204, body: '' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) unexpected.push(u.pathname);
    const name = u.pathname.split('/').at(-1);
    let data = [];
    if (name === 'contributors') data = [writer];
    if (name === 'channel_updates') data = [source];
    if (name === 'world_group_source_arrivals_v2') data = [{ id, created_at: source.created_at, contributor_slug: writer.slug,
      group_proof: true, proof_basis: 'verified_phone_unique', group_channel: 'torat-haremez',
      media_kind: 'video', media_url: mediaBase + 'original.mp4', thumb_url: mediaBase + 'poster.jpg' }];
    return route.fulfill({ headers, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto(`${base}/world?source=tzvi-opoc&sourceRef=channel_updates%3A${id}`);
  const card = page.locator(`article[data-source-ref="channel_updates:${id}"]`);
  const video = card.locator('video'); await video.waitFor({ timeout: 30000 });
  assert.equal(await card.locator('img').count(), 0, 'MP4 must not render as an image');
  assert.equal(await video.getAttribute('poster'), mediaBase + 'poster.jpg');
  assert.equal(await video.getAttribute('preload'), 'none');
  await video.evaluate(async v => { const p = new Image(); p.src = v.poster; await p.decode(); v.muted = true; await v.play(); });
  await page.waitForFunction(() => document.querySelector('article video')?.currentTime > 0.25);
  assert.ok((await page.locator('h2').allTextContents()).some(t => t.includes('צבי')));
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log(JSON.stringify({ video: true, poster: true, playback: true, source: id, credit: true, errors }));
} finally { await browser.close(); await server.close(); }
