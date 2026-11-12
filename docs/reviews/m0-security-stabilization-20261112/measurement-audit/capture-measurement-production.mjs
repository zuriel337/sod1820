// AUDIT EVIDENCE — the same capture as capture-measurement.mjs, against the LIVE site instead of a local build.
// Read-only towards the site, and NOTHING is delivered to an analytics or advertising service or written to the site's stores:
//   - every request to Google / Meta / AdSense hosts is answered locally and logged (the public scripts gtag.js and fbevents.js
//     are fetched once with GET, as script files only: no event is sent);
//   - every first-party WRITE (any non-GET request to the Supabase project or to the site) is answered locally and logged;
//   - a first-party read that travels as POST (a Supabase RPC) goes through only when its name is on --allow, a list of
//     functions that were checked in the live database to be STABLE or IMMUTABLE (they cannot write). Without --allow no RPC
//     goes through: that first pass discovers the names.
// Requests made by the service worker are covered too (PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS).
// The pages themselves are loaded like any visitor loads them (GET).
//
// Usage:
//   node capture-measurement-production.mjs --out pass1.json                      # discovery: no RPC goes through
//   node capture-measurement-production.mjs --allow allow.json --out results.json  # with the verified read-only RPC names
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const pw = createRequire(import.meta.url)('playwright');
const arg = (name) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const ORIGIN = arg('origin') || 'https://sod1820.co.il';
const out = arg('out');
const allow = new Set(arg('allow') ? JSON.parse(readFileSync(arg('allow'), 'utf8')) : []);
const only = arg('only');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const THIRD = /^https:\/\/([a-z0-9-]+\.)*(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|google\.com|facebook\.com|facebook\.net|googlesyndication\.com|adtrafficquality\.google|vercel-insights\.com|vercel-scripts\.com)\//;

const log = []; let step = null;
const rec = (kind, data) => log.push({ step, kind, t: Date.now(), ...data });
const params = (s) => Object.fromEntries(new URLSearchParams(s));
const scriptCache = new Map();
const browser = await pw.chromium.launch({ headless: true });

async function newContext() {
  const context = await browser.newContext({ locale: 'he-IL', timezoneId: 'Asia/Jerusalem', userAgent: UA, viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    window.__dl = []; const hook = () => { const dl = window.dataLayer; if (dl && !dl.__hooked) { const push = dl.push.bind(dl); dl.push = (...a) => { for (const x of a) try { window.__dl.push(JSON.parse(JSON.stringify(Array.from(x)))); } catch { window.__dl.push(String(x)); } return push(...a); }; dl.__hooked = true; } };
    setInterval(hook, 5);
    window.__fbq = []; let real; Object.defineProperty(window, 'fbq', { configurable: true, get() { return real; }, set(v) {
      real = typeof v === 'function' ? new Proxy(v, { apply(t, self, args) { try { window.__fbq.push(JSON.parse(JSON.stringify(args))); } catch { window.__fbq.push(String(args[0])); } return Reflect.apply(t, self, args); } }) : v; } });
  });
  // third parties: answered locally, logged, never delivered
  await context.route(THIRD, async (route) => {
    const r = route.request(); const u = new URL(r.url());
    const isScript = (u.hostname === 'www.googletagmanager.com' && u.pathname === '/gtag/js') || (u.hostname === 'connect.facebook.net' && (u.pathname.endsWith('/fbevents.js') || u.pathname.startsWith('/signals/config/')));
    if (isScript && r.method() === 'GET') {
      const key = u.origin + u.pathname + (u.searchParams.get('id') ? '?id=' + u.searchParams.get('id') : '');
      if (!scriptCache.has(key)) { const res = await route.fetch(); scriptCache.set(key, { status: res.status(), body: await res.body(), contentType: res.headers()['content-type'] || 'application/javascript' }); }
      rec('script', { url: key }); const c = scriptCache.get(key);
      return route.fulfill({ status: c.status, contentType: c.contentType, body: c.body });
    }
    const body = r.postData() || '';
    if (/\/g\/collect$/.test(u.pathname)) {
      const q = params(u.search.slice(1)); const lines = body ? body.split(/\r?\n/).filter(Boolean) : [''];
      for (const line of lines) { const p = { ...q, ...params(line) }; rec('ga', { en: p.en, dl: p.dl, dt: p.dt, dr: p.dr, tid: p.tid, ep: Object.fromEntries(Object.entries(p).filter(([k]) => /^epn?\./.test(k))),
        // every parameter NAME of the hit, and the values of the ones that can carry a campaign or a click id
        keys: Object.keys(p).sort().join(' '), campaign: Object.fromEntries(Object.entries(p).filter(([k, v]) => /^(cs|cm|cn|cc|ck|ci|gclid|dclid|srsltid|_gclid|gcs|gcd)$/.test(k) || /utm_|gclid|fbclid|AUDIT|whatsapp/i.test(String(v)))) }); }
    } else if (u.hostname.endsWith('facebook.com') && u.pathname.startsWith('/tr')) {
      const p = { ...params(u.search.slice(1)), ...(body && !body.startsWith('{') ? params(body) : {}) };
      rec('pixel', { ev: p.ev, dl: p.dl, rl: p.rl, id: p.id });
    } else rec('other3p', { url: u.origin + u.pathname, method: r.method() });
    return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' });
  });
  // first party: reads go to the live site; writes are answered locally and logged
  await context.route((url) => url.hostname.endsWith('.supabase.co') || url.origin === ORIGIN, async (route) => {
    const r = route.request(); const u = new URL(r.url()); const method = r.method();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return route.continue();
    const rpc = /^\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(u.pathname)?.[1] || null;
    const viaWorker = !!r.serviceWorker();
    if (rpc && allow.has(rpc)) { rec('read_rpc', { name: rpc, viaWorker }); return route.continue(); }
    rec('blocked', { host: u.hostname, path: u.pathname, method, viaWorker, body: (r.postData() || '').slice(0, 1600) });
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (rpc) return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: 'null' });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{}' });
  });
  return context;
}
const settle = async (page, ms) => { await page.mouse.move(200, 300).catch(() => {}); await page.mouse.wheel(0, 300).catch(() => {}); await page.waitForTimeout(ms); };
async function snapshot(page, context) {
  const s = await page.evaluate(() => ({ href: location.href, title: document.title, canonical: document.querySelector('link[rel=canonical]')?.href || null, robots: document.querySelector('meta[name=robots]')?.content || null,
    home_primary: document.querySelector('[data-home-primary]')?.getAttribute('data-home-primary') || null, h1: document.querySelector('h1')?.textContent?.trim().slice(0, 80) || null,
    sw: !!navigator.serviceWorker?.controller, dl: window.__dl.splice(0), fbq: window.__fbq.splice(0) })).catch(() => ({}));
  const vb = (await context.cookies(ORIGIN)).find((c) => c.name === 'vb')?.value || null;
  return { ...s, vb };
}
async function spaNavigate(page, path) { await page.evaluate((p) => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate', { state: {} })); }, path); }

const POST_A = '/post/eikh-yotzim-mehatat-moda-sefirot-yisrael-20261028';
const scenarios = [
  { family: 'post (direct, then another post)', start: POST_A, next: arg('post-b') || '/post' },
  { family: 'number (switch between two numbers)', start: '/number/1820', next: '/number/26' },
  { family: 'number expression (personal-looking phrase)', start: '/number/' + encodeURIComponent('יוסי כהן') },
  { family: 'home -> world (real link click)', start: '/', click: 'a[href="/world"]' },
  { family: 'post list', start: '/posts' },
  { family: 'topic', start: '/topic/358-mashiach' },
  { family: 'video', start: '/video/e8f5c7aa18a6532fe17ff14dc8713626' },
  { family: 'tag', start: '/tag/' + encodeURIComponent('אלון-לוי') },
  { family: 'community researchers', start: '/community/researchers' },
  { family: 'books', start: '/books' },
  { family: 'unknown path (404)', start: '/no-such-page-audit-20261112' },
  { family: 'old root permalink that is in the sitemap', start: '/' + encodeURIComponent('הגל-הראשון-של-הידיעה') },
  { family: 'arrival with campaign and click ids', start: POST_A + '?utm_source=whatsapp&utm_medium=share&utm_campaign=audit&fbclid=AUDITFB&gclid=AUDITG&q=secret-term' },
  { family: 'site search parameter on a page', start: '/world?q=' + encodeURIComponent('סוד אישי') },
].filter((s) => !only || s.family.includes(only));
const results = [];
for (const s of scenarios) {
  const context = await newContext(); const page = await context.newPage(); const steps = [];
  const run = async (name, fn, ms) => { step = s.family + ' :: ' + name; const t0 = Date.now(); let status = null; try { const res = await fn(); status = res?.status?.() ?? null; } catch (e) { status = 'error: ' + String(e).slice(0, 80); } await settle(page, ms); steps.push({ name, status, ms: Date.now() - t0, t0, ...(await snapshot(page, context)) }); };
  await run('direct entry', () => page.goto(ORIGIN + s.start, { waitUntil: 'domcontentloaded', timeout: 45000 }), 12000);
  if (s.next) {
    await run('in-site navigation', () => spaNavigate(page, s.next), 8000);
    await run('back', () => page.goBack({ waitUntil: 'commit' }), 8000);
    await run('refresh', () => page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 }), 12000);
  }
  if (s.click) {
    await run('in-site link click', async () => { const a = page.locator(s.click).first(); if (await a.count()) await a.click({ timeout: 5000 }); else await spaNavigate(page, '/world'); }, 8000);
    await run('back', () => page.goBack({ waitUntil: 'commit' }), 8000);
  }
  results.push({ family: s.family, steps });
  await context.close();
}
await browser.close();
const of = (k, key) => log.filter((x) => x.kind === k && x.step === key);
const summary = results.map((r) => ({ family: r.family, steps: r.steps.map((st) => {
  const key = r.family + ' :: ' + st.name; const ga = of('ga', key); const blocked = of('blocked', key);
  const capi = blocked.filter((b) => b.path === '/functions/v1/meta-capi');
  return { step: st.name, http_status: st.status, href: st.href, document_title: st.title, h1: st.h1, canonical: st.canonical, robots: st.robots, bot_verdict_cookie: st.vb, service_worker_controls_page: st.sw, home_primary: st.home_primary,
    app_gtag_calls: (st.dl || []).filter((x) => Array.isArray(x) && (x[0] === 'event' || x[0] === 'config')).map((x) => [x[0], x[1], x[2] && { page_path: x[2].page_path, page_location: x[2].page_location, page_title: x[2].page_title, send_page_view: x[2].send_page_view }]),
    ga_events: ga.map((g) => ({ en: g.en, dl: g.dl, dt: g.dt, dr: g.dr, ep: g.ep, campaign: g.campaign, keys: g.keys })), ga_page_views: ga.filter((g) => g.en === 'page_view').length,
    first_ga_hit_after_ms: ga.length ? ga[0].t - st.t0 : null,
    app_fbq_calls: (st.fbq || []).filter((x) => Array.isArray(x) && x[0] !== 'init').map((x) => [x[0], x[1]]),
    pixel: of('pixel', key).map((p) => ({ ev: p.ev, dl: p.dl, rl: p.rl })),
    capi: capi.map((f) => { try { const b = JSON.parse(f.body); return { event_name: b.event_name, event_source_url: b.event_source_url, via_worker: f.viaWorker }; } catch { return f.body.slice(0, 200); } }),
    first_party_writes_not_delivered: blocked.filter((b) => b.path !== '/functions/v1/meta-capi').map((b) => ({ path: b.path, method: b.method, via_worker: b.viaWorker, body: b.body.slice(0, 900) })),
    read_rpcs_allowed: [...new Set(of('read_rpc', key).map((x) => x.name))],
    other_third_party: [...new Set(of('other3p', key).map((x) => x.method + ' ' + x.url))] };
}) }));
const names = (k) => [...new Set(log.filter((x) => x.kind === k).map((x) => x.name || (x.path || '').replace(/^\/rest\/v1\/rpc\//, 'rpc:')))].sort();
const report = { captured_at: new Date().toISOString(), origin: ORIGIN, mode: allow.size ? 'reads allowed for ' + allow.size + ' verified read-only RPC names' : 'discovery: no RPC delivered',
  scripts_fetched_once_as_files: [...new Set(log.filter((x) => x.kind === 'script').map((x) => x.url))],
  first_party_non_get_paths_not_delivered: names('blocked'), read_rpcs_delivered: names('read_rpc'), summary };
if (out) writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({ families: summary.length, ga_hits: log.filter((x) => x.kind === 'ga').length, pixel_hits: log.filter((x) => x.kind === 'pixel').length, blocked: log.filter((x) => x.kind === 'blocked').length, read_rpc: log.filter((x) => x.kind === 'read_rpc').length, blocked_paths: names('blocked') }, null, 1));
process.exit(0);
