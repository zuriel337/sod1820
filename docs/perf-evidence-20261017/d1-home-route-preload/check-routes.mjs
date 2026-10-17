// Route behaviour of the hint in a real browser: Home gets it, other addresses request no Home-only file, no preload warnings on Home.
import path from 'node:path'; import { createRequire } from 'node:module'; import fs from 'node:fs';
const repo = path.resolve(import.meta.dirname, '../../..');
const { serve } = await import(path.join(repo, 'scripts/perf-execution-2029/serve.mjs'));
const { chromium } = createRequire('/opt/node-tools/')('playwright-core');
const dist = path.resolve(process.argv[2]);
const html = fs.readFileSync(path.join(process.argv[3] ? path.resolve(process.argv[3]) : dist, '2029.html'), 'utf8');
const m = html.match(/\}\)\(\{after:\[.*?\],js:(\[.*?\]),css:(\[.*?\])\}\)<\/script>/s);
const homeOnly = new Set([...JSON.parse(m[1]), ...JSON.parse(m[2])]);
const { srv, port } = await serve(dist);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--disable-background-networking'] });
const out = [];
for (const route of ['/', '/?preview=community', '/world', '/posts', '/post/x', '/number/1820', '/gematria']) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  await ctx.route((u) => !['127.0.0.1'].includes(u.hostname), (r) => r.abort());
  const page = await ctx.newPage();
  const warnings = [], requested = [];
  page.on('console', (c) => { if (/preload/i.test(c.text())) warnings.push(c.text().slice(0, 160)); });
  page.on('request', (r) => { const p = new URL(r.url()).pathname; if (homeOnly.has(p)) requested.push(p); });
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(6000);
  const hintLinks = await page.evaluate(() => [...document.querySelectorAll('link[rel=modulepreload],link[rel=preload][as=style]')].length);
  out.push({ route, homeGraphFilesRequested: requested.length, hintLinksInHead: hintLinks, preloadWarnings: warnings });
  await ctx.close();
}
await browser.close(); srv.close();
console.log(JSON.stringify(out, null, 1));
