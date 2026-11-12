// AUDIT EVIDENCE (read-only, nothing reaches Google, Meta or the live site). Captures what the public 2029 artifact would send to
// GA4, the Meta Pixel, the Conversions API relay and the first-party telemetry, per page family and per navigation kind.
//
// How it stays off the network: the artifact runs in the existing local fixture (test/helpers/authBrowserFixture.mjs) under the
// production origin; Chromium maps every other host to NOTFOUND; every Google/Meta request is answered locally (204) and logged.
// The real public scripts (gtag.js for the live GA4 id and fbevents.js + the Pixel config) are served from a local copy, so the
// browser behaves like production, including the property's Enhanced Measurement settings that live in gtag.js.
//
// Usage (in a worktree of the commit to audit, after building the artifact with the live ids):
//   VITE_GA_ID=G-V3H3E20FLY VITE_META_PIXEL_ID=992562036849823 node scripts/build-public-reading-production.mjs
//   node <this file> --root <worktree> --thirdparty <dir with gtag.js, fbevents.js, fbconfig.js> --out <results.json>
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const arg = (name) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const root = resolve(arg('root') || '.'); const third = resolve(arg('thirdparty') || '.'); const out = arg('out');
const { startFixture } = await import(pathToFileURL(resolve(root, 'test/helpers/authBrowserFixture.mjs')).href);
const pw = createRequire(import.meta.url)('playwright');
const GTAG = readFileSync(resolve(third, 'gtag.js')); const FBEVENTS = readFileSync(resolve(third, 'fbevents.js')); const FBCONFIG = readFileSync(resolve(third, 'fbconfig.js'));

const log = []; let step = null;
const rec = (kind, data) => log.push({ step, kind, t: Date.now(), ...data });
const params = (s) => Object.fromEntries(new URLSearchParams(s));
const firstParty = [];
const fixture = await startFixture({ deploymentCsp: true });
const browser = await pw.chromium.launch({ headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });

async function newContext() {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  await context.addCookies([{ name: 'vb', value: 'browser', domain: 'sod1820.co.il', path: '/', secure: true }]);
  await context.addInitScript(() => {
    window.__dl = []; const hook = () => { const dl = window.dataLayer; if (dl && !dl.__hooked) { const push = dl.push.bind(dl); dl.push = (...a) => { for (const x of a) try { window.__dl.push(JSON.parse(JSON.stringify(Array.from(x)))); } catch { window.__dl.push(String(x)); } return push(...a); }; dl.__hooked = true; } };
    setInterval(hook, 5);
    // The Pixel sends through an image, a beacon or fetch; record every request to facebook.com/tr from inside the page (the
    // route below still answers it locally, so nothing leaves).
    window.__px = []; const px = (url, body) => { try { const u = String(url); if (/facebook\.com\/tr/.test(u)) window.__px.push({ url: u, body: body == null ? '' : String(body) }); } catch {} };
    const sb = navigator.sendBeacon?.bind(navigator); if (sb) navigator.sendBeacon = (u, d) => { px(u, d instanceof FormData ? new URLSearchParams([...d.entries()]).toString() : d); return sb(u, d); };
    const f = window.fetch.bind(window); window.fetch = (u, o) => { px(u?.url || u, o?.body); return f(u, o); };
    const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src'); Object.defineProperty(HTMLImageElement.prototype, 'src', { ...d, set(v) { px(v); return d.set.call(this, v); } });
    const xo = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function (m, u, ...r) { this.__u = u; return xo.call(this, m, u, ...r); };
    // The app's own Pixel calls (fbq('track', ...)), recorded through a transparent proxy whatever the SDK then does with them.
    window.__fbq = []; let real; Object.defineProperty(window, 'fbq', { configurable: true, get() { return real; }, set(v) {
      real = typeof v === 'function' ? new Proxy(v, { apply(t, self, args) { try { window.__fbq.push(JSON.parse(JSON.stringify(args))); } catch { window.__fbq.push(String(args[0])); } return Reflect.apply(t, self, args); } }) : v; } });
    const xs = XMLHttpRequest.prototype.send; XMLHttpRequest.prototype.send = function (b) { px(this.__u, b); return xs.call(this, b); };
  });
  // First-party writes as they leave the browser: the service worker's own network request (not the page request it answered).
  context.on('requestfinished', async (req) => {
    const u = new URL(req.url()); if (!u.hostname.endsWith('.supabase.co') || req.method() === 'GET') return;
    const res = await req.response().catch(() => null); if (res?.fromServiceWorker()) return;
    if (u.pathname.startsWith('/rest/v1/rpc/') || u.pathname.startsWith('/functions/v1/')) firstParty.push({ step, path: u.pathname, status: res?.status() ?? null, body: (req.postData() || '').slice(0, 600) });
  });
  await context.route(/^https:\/\/([a-z0-9-]+\.)*(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|google\.com|facebook\.com|facebook\.net|googlesyndication\.com|adtrafficquality\.google)\//, async (route) => {
    const r = route.request(); const u = new URL(r.url());
    if (u.hostname === 'www.googletagmanager.com' && u.pathname === '/gtag/js') { rec('script', { url: u.origin + u.pathname + '?id=' + u.searchParams.get('id') }); return route.fulfill({ status: 200, contentType: 'application/javascript', body: GTAG }); }
    if (u.hostname === 'connect.facebook.net' && u.pathname.endsWith('/fbevents.js')) { rec('script', { url: u.origin + u.pathname }); return route.fulfill({ status: 200, contentType: 'application/javascript', body: FBEVENTS }); }
    if (u.hostname === 'connect.facebook.net' && u.pathname.startsWith('/signals/config/')) { rec('script', { url: u.origin + u.pathname }); return route.fulfill({ status: 200, contentType: 'application/javascript', body: FBCONFIG }); }
    const body = r.postData() || '';
    if (/\/g\/collect$/.test(u.pathname)) {
      const q = params(u.search.slice(1)); const lines = body ? body.split(/\r?\n/).filter(Boolean) : [''];
      for (const line of lines) { const p = { ...q, ...params(line) }; rec('ga', { en: p.en, dl: p.dl, dt: p.dt, dr: p.dr, dp: p.dp, ep: Object.fromEntries(Object.entries(p).filter(([k]) => /^epn?\./.test(k))), seg: p.seg, _et: p._et }); }
    } else if (u.hostname.endsWith('facebook.com') && u.pathname.startsWith('/tr')) {
      const p = { ...params(u.search.slice(1)), ...(body && !body.startsWith('{') ? params(body) : {}) };
      rec('pixel', { ev: p.ev, dl: p.dl, rl: p.rl, eid: p.eid, cd: Object.fromEntries(Object.entries(p).filter(([k]) => k.startsWith('cd['))) });
    } else rec('other3p', { url: u.origin + u.pathname });
    return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' });
  });
  return context;
}
const settle = async (page, ms = 7000) => { await page.mouse.move(200, 300).catch(() => {}); await page.waitForTimeout(ms); };
async function snapshot(page) { return page.evaluate(() => ({ href: location.href, title: document.title, dl: window.__dl.splice(0), px: window.__px.splice(0), fbq: window.__fbq.splice(0) })).catch(() => ({})); }
async function spaNavigate(page, path) { // the router's own navigation path: history.pushState + popstate, as an in-app link does
  await page.evaluate((p) => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate', { state: {} })); }, path);
}

const scenarios = [
  { family: 'post (switch between two posts)', start: '/post/sod-1820-audit-a', next: '/post/sod-1820-audit-b' },
  { family: 'number (switch between two numbers)', start: '/number/1820', next: '/number/26' },
  { family: 'number expression (personal-looking phrase)', start: '/number/' + encodeURIComponent('יוסי כהן') },
  { family: 'home -> world (real link click)', start: '/', click: 'a[href="/world"]' },
  { family: 'post list', start: '/posts' },
  { family: 'writer', start: '/researcher/audit-writer' },
  { family: 'book', start: '/book/audit-book' },
  { family: 'video', start: '/video/audit-video' },
  { family: 'topic', start: '/topic/audit-topic' },
  { family: 'unknown path (404)', start: '/no-such-page-audit' },
  { family: 'old WordPress root permalink', start: '/old-root-slug-audit' },
  { family: 'arrival with campaign and click ids', start: '/post/sod-1820-audit-a?utm_source=whatsapp&utm_medium=share&utm_campaign=audit&fbclid=AUDITFB&gclid=AUDITG&q=secret-term' },
  { family: 'site search parameter on a page', start: '/world?q=' + encodeURIComponent('סוד אישי') },
];
const results = [];
for (const s of scenarios) {
  const context = await newContext(); const page = await context.newPage(); const steps = [];
  const run = async (name, fn, ms) => { step = s.family + ' :: ' + name; const t0 = Date.now(); await fn(); await settle(page, ms); steps.push({ name, ms: Date.now() - t0, ...(await snapshot(page)) }); };
  await run('direct entry', () => page.goto(fixture.origin + s.start, { waitUntil: 'domcontentloaded' }), 9000);
  if (s.next) {
    await run('in-site navigation', () => spaNavigate(page, s.next));
    await run('back', () => page.goBack({ waitUntil: 'commit' }).catch(() => {}));
    await run('refresh', () => page.reload({ waitUntil: 'domcontentloaded' }), 9000);
  }
  if (s.click) {
    await run('in-site link click', async () => { const a = page.locator(s.click).first(); if (await a.count()) await a.click({ timeout: 5000 }).catch(() => {}); else await spaNavigate(page, '/world'); });
    await run('back', () => page.goBack({ waitUntil: 'commit' }).catch(() => {}));
  }
  results.push({ family: s.family, steps });
  await context.close();
}
await browser.close();
const byStep = (k) => log.filter((x) => x.kind === k);
const summary = results.map((r) => ({ family: r.family, steps: r.steps.map((st) => {
  const key = r.family + ' :: ' + st.name; const ga = byStep('ga').filter((x) => x.step === key); const px = byStep('pixel').filter((x) => x.step === key);
  const capi = fixture.state.functions.filter(() => false); // filled below from firstParty
  return { step: st.name, href: st.href, document_title: st.title,
    app_gtag_calls: (st.dl || []).filter((x) => Array.isArray(x) && (x[0] === 'event' || x[0] === 'config')).map((x) => [x[0], x[1], x[2] && { page_path: x[2].page_path, page_location: x[2].page_location, page_title: x[2].page_title, page_referrer: x[2].page_referrer, send_page_view: x[2].send_page_view }]),
    ga_events: ga.map((g) => ({ en: g.en, dl: g.dl, dt: g.dt, dr: g.dr, ep: g.ep })), ga_page_views: ga.filter((g) => g.en === 'page_view').length,
    app_fbq_calls: (st.fbq || []).filter((x) => Array.isArray(x) && x[0] !== 'init').map((x) => [x[0], x[1]]),
    pixel: [...px.map((p) => ({ ev: p.ev, dl: p.dl, rl: p.rl, via: 'network' })), ...(st.px || []).map((x) => { const q = { ...params(x.url.split('?')[1] || ''), ...(x.body && !String(x.body).startsWith('{') ? params(x.body) : {}) }; return { ev: q.ev, dl: q.dl, rl: q.rl, via: 'page' }; })],
    capi: firstParty.filter((f) => f.step === key && f.path === '/functions/v1/meta-capi').map((f) => { try { const b = JSON.parse(f.body); return { event_name: b.event_name, event_source_url: b.event_source_url }; } catch { return f.body; } }),
    first_party: firstParty.filter((f) => f.step === key && f.path !== '/functions/v1/meta-capi').map((f) => ({ path: f.path, body: f.body.slice(0, 240) })),
    other_third_party: byStep('other3p').filter((x) => x.step === key).map((x) => x.url),
    first_ga_hit_after_ms: ga.length ? ga[0].t - (log.find((x) => x.step === key)?.t ?? ga[0].t) : null };
}) }));
const scripts = [...new Set(byStep('script').map((x) => x.url))]; const other = [...new Set(byStep('other3p').map((x) => x.url))];
const report = { captured_at: new Date().toISOString(), artifact_root: root, scripts_served_locally: scripts, other_third_party_requests_answered_locally: other, summary };
if (out) writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({ families: summary.length, ga_hits: byStep('ga').length, pixel_hits: byStep('pixel').length, capi: firstParty.filter((f) => f.path === '/functions/v1/meta-capi').length, first_party: firstParty.length }, null, 1));
process.exit(0);
