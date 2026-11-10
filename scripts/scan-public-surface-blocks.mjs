// READ-ONLY surface scan: loads every public route of a deployed 2029 site in a real Chromium and reports what the browser blocks:
// Content-Security-Policy violations, service-worker denials (403 public_reading_*) and failed third-party requests. Sends nothing, signs nobody in.
//   node scripts/scan-public-surface-blocks.mjs [https://sod1820.co.il]      (exit 1 when anything is blocked)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch { /* optional tooling */ } }
if (!pw) { console.error('playwright is not installed'); process.exit(2); }
const ORIGIN = (process.argv[2] || 'https://sod1820.co.il').replace(/\/$/, '');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const ROUTES = ['/', '/2029', '/world', '/code', '/els', '/gematria', '/number/1820', '/2029/number/1820', '/2029/posts', '/posts', '/post', '/community', '/community/chat', '/community/calculator', '/beit-midrash', '/books', '/gallery', '/research', '/members', '/contact', '/login', '/heichal', '/verified', '/codes', '/or-geula', '/melech-hamisparim/718', '/early-access', '/2029/calculator', '/2029/journey', '/2029/kingdom', '/forum', '/topic/x'];
const browser = await pw.chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ userAgent: UA, locale: 'he-IL', viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective.split(' ')[0]} ${e.blockedURI.split('?')[0].slice(0, 90)}`)); });
const page = await ctx.newPage(); const per = {}; const swDenied = {}; const failed = {};
page.on('response', async r => { if (r.status() === 403) { try { const t = await r.text(); if (/public_reading_[a-z_]+_denied|public_reading_operation_denied|public_reading_auth_denied/.test(t)) { const k = `${new URL(r.url()).host}${new URL(r.url()).pathname.slice(0, 50)} ${t.match(/public_reading_[a-z_]+/)?.[0]}`; (swDenied[k] ||= new Set()).add(page.url()); } } catch {} } });
page.on('requestfailed', r => { const u = new URL(r.url()); if (u.host !== new URL(ORIGIN).host) { const k = `${u.host} ${r.failure()?.errorText}`; (failed[k] ||= new Set()).add(page.url()); } });
for (const route of ROUTES) {
  try { await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForTimeout(3500); const csp = await page.evaluate(() => window.__csp.splice(0)); for (const c of csp) (per[c] ||= new Set()).add(route); }
  catch (e) { (per['NAV_ERROR ' + String(e.message).slice(0, 50)] ||= new Set()).add(route); }
}
const fmt = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, `${v.size} routes`]));
console.log(JSON.stringify({ routesScanned: ROUTES.length, cspBlocks: fmt(per), workerDenials: fmt(swDenied), thirdPartyRequestFailures: fmt(failed) }, null, 1));
await browser.close();
process.exitCode = Object.keys(per).length || Object.keys(swDenied).length ? 1 : 0;
