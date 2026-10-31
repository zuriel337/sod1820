// Read-only evidence on the REAL built 2029 app (all shell tokens, .sod29-root, real Share/Follow controls).
// Serves preview-deploy/dist (node scripts/build-integrated-preview.mjs first; the river is hidden in the public build), reads public data, aborts non-read requests.
// Usage: OUT_DIR=/path [WIDTHS=390,1440] [PRESETS=light,parchment,dark] node test/reality-river-built-app.browser.mjs
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url), { chromium } = require('playwright');
const out = process.env.OUT_DIR || '/tmp/reality-river-built', dist = resolve(process.env.DIST || 'preview-deploy/dist');
const widths = (process.env.WIDTHS || '390,1440').split(',').map(Number), presets = (process.env.PRESETS || 'light,parchment,dark').split(',');
await mkdir(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://l').pathname); let f = resolve(dist, '.' + p);
  if (!f.startsWith(dist + sep) || !existsSync(f) || statSync(f).isDirectory()) f = resolve(dist, '2029.html');
  res.setHeader('Content-Type', mime[extname(f)] || 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store'); createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r)); const origin = `http://127.0.0.1:${server.address().port}`;
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(proxy ? { proxy } : {}) });
const report = { widths: [], writes: [] };
try {
  for (const width of widths) for (const preset of presets) {
    const ctx = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'he-IL', reducedMotion: 'reduce' });
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url());
      if (u.hostname === '127.0.0.1' || ['GET', 'HEAD', 'OPTIONS'].includes(q.method())) return r.continue();
      if (/\/rest\/v1\/rpc\/(gematria|fn_|lang_|number_|posts_by|world_group|rd_is|notification_prefs_guest_get)/.test(u.pathname)) return r.continue();
      report.writes.push(q.method() + ' ' + u.pathname); return r.abort(); });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(p => localStorage.setItem('sod-theme', p), preset);
    await page.goto(origin + '/2029#arrivals', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const river = page.locator('[data-reality-river]'); await river.waitFor({ timeout: 60000 });
    await river.locator('[data-river-image]').first().waitFor({ timeout: 60000 });
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(3500);
    await river.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
    const box = await river.boundingBox(), top = await page.evaluate(() => scrollY);
    await page.screenshot({ path: `${out}/home-river-${preset}-${width}.png`, fullPage: true, clip: { x: box.x, y: box.y + top, width: box.width, height: box.height } });
    report.widths.push({ width, preset, errors, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
    await ctx.close();
  }
  console.log(JSON.stringify(report)); 
} finally { await browser.close(); server.close(); }
