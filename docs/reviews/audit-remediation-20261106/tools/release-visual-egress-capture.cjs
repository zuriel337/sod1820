// USAGE (local, offline): VITE_HOME_2029_ENABLED=true npm run build && cp dist/2029.html dist/index.html &&
//   npm run preview -- --host 127.0.0.1 --port 4173 &  then:  node release-visual-egress-capture.cjs out.json
// Needs the `playwright` library (global or local). On Playwright 1.55 loopback is forced through the proxy: export
// PLAYWRIGHT_DISABLE_FORCED_CHROMIUM_PROXIED_LOOPBACK=1 (tested on 1.63, where the `bypass` below is honoured). Sends NOTHING out: Chromium runs behind a local tripwire proxy and every
// non-loopback request is answered by a stub; the tripwire count printed at the end must be 0. Records METHOD/HOST/PATH and body KEY
// NAMES (plus a few non-personal enum values), never request values. Produced the table in RELEASE-VISUAL-EGRESS-GUARD.md §2.
// OFFLINE capture of every non-loopback request the Release Visual pages attempt.
// Safety: Chromium is launched behind a local tripwire proxy (any request that is not answered by the context route
// reaches it and is logged), and the context route answers EVERY non-loopback request locally with a stub.
// Nothing leaves this machine. Only request METHOD / HOST / PATH / body KEY NAMES are recorded (no values).
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');

const OUT = process.argv[2];
const BASE = 'http://127.0.0.1:4173';
const trip = [];
const proxy = http.createServer((req, res) => { trip.push({ kind: 'HTTP', method: req.method, url: req.url.slice(0, 120) }); res.writeHead(502); res.end('tripwire'); });
proxy.on('connect', (req, socket) => { trip.push({ kind: 'CONNECT', target: req.url }); socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); });

const rec = [];
const wsRec = [];
const POST_ROW = { id: 5113001, slug: 'bennett-melach-631-78', title: 'בנט והמלח — 78, 631', author: 'SOD1820', date: '2026-10-01T00:00:00+00:00',
  modified: '2026-10-12T00:00:00+00:00', excerpt: 'פוסט בדיקה סינתטי.', categories: ['גימטריה'], tags: ['בנט', '631', '78'],
  content: '<section><h2>האירוע</h2><p>טקסט בדיקה סינתטי.</p></section>' };
const LAUNCH = ['lock_number', 'lock_world', 'lock_books', 'lock_heichal', 'lock_life_journey', 'lock_convergence_tree', 'lock_raziel_site'];
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

function bodyKeys(req) {
  try { const raw = req.postData(); if (!raw) return null; const j = JSON.parse(raw); return j && typeof j === 'object' ? Object.keys(j).slice(0, 12) : typeof j; } catch { return 'non-json'; }
}

function safeVals(req) {
  try { const raw = req.postData(); if (!raw) return null; const j = JSON.parse(raw); const out = {};
    for (const k of ['p_is_bot', 'p_device', 'p_event_type', 'p_surface', 'p_kind', 'p_method_key']) if (k in j) out[k] = j[k];
    return Object.keys(out).length ? out : null; } catch { return null; }
}
(async () => {
  await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ proxy: { server: `http://127.0.0.1:${proxy.address().port}`, bypass: '127.0.0.1,localhost' } });
  let scenario = 'init';
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('sod_guest_signup_popup_dismissed', '1'); localStorage.setItem('sod_legacy_newsletter_invite_until', String(Date.now() + 86400000)); } catch {}
    window.__beacons = [];
    const orig = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (u, d) => { window.__beacons.push(String(u).slice(0, 120)); return orig ? orig(u, d) : false; };
  });
  await ctx.routeWebSocket(/.*/, (ws) => { wsRec.push({ scenario, url: ws.url().replace(/\?.*$/, '?…') }); ws.close({ code: 1008, reason: 'capture' }); });
  await ctx.route('**/*', async (route) => {
    const req = route.request(); const u = new URL(req.url());
    if (['127.0.0.1', 'localhost'].includes(u.hostname)) return route.fallback();
    const method = req.method();
    rec.push({ scenario, method, host: u.host, path: u.pathname, queryKeys: [...new Set([...u.searchParams.keys()])].slice(0, 8), type: req.resourceType(), bodyKeys: bodyKeys(req), vals: safeVals(req) });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const json = (body, status = 200) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (u.pathname === '/rest/v1/site_flags') return json(LAUNCH.map((key) => ({ key, enabled: false, mode: 'all', message: '' })));
    if (u.pathname === '/rest/v1/posts' && (u.searchParams.get('slug') || '').includes('bennett-melach-631-78')) return json([POST_ROW]);
    if (u.pathname.startsWith('/rest/v1/') || u.pathname.startsWith('/functions/v1/') || u.pathname.startsWith('/auth/v1/')) return json([]);
    return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/plain' }, body: '' });
  });
  const page = await ctx.newPage();
  const settle = async (ms) => { await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(ms); };
  const visit = async (name, url, { width = 390, wait = 1500, until = 'networkidle' } = {}) => {
    scenario = name; await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await page.goto(url, { waitUntil: until, timeout: 45000 }).catch((e) => rec.push({ scenario, error: String(e).slice(0, 100) }));
    await settle(wait);
  };

  for (const w of [320, 390, 1440]) await visit(`home-2029@${w}`, `${BASE}/2029`, { width: w });
  await visit('number-1237@390', `${BASE}/entity-hub-preview/number/1237`);
  await visit('number-1237@1440', `${BASE}/entity-hub-preview/number/1237`, { width: 1440 });
  await visit('number-1237?mode=light', `${BASE}/entity-hub-preview/number/1237?mode=light`);
  await visit('number-1237?mode=lab', `${BASE}/entity-hub-preview/number/1237?mode=lab`);
  await visit('post-bennett@390', `${BASE}/post/bennett-melach-631-78`, { wait: 2500 });
  await visit('post-bennett@1440', `${BASE}/post/bennett-melach-631-78`, { width: 1440, wait: 2500 });
  await visit('post-bennett?gemcard=1', `${BASE}/post/bennett-melach-631-78?gemcard=1`, { until: 'domcontentloaded', wait: 2500 });
  await visit('calculator-viral', `${BASE}/2029/gematria/viral`, { wait: 1000 });
  scenario = 'calculator-viral:typing';
  const input = page.locator('#calculator-2029-input');
  if (await input.count()) { for (const t of ['א', 'אב', 'אבא', 'שלום', 'ברכה']) { await input.fill(t); await page.waitForTimeout(700); } await settle(2500); }
  await visit('video-/', `${BASE}/`, { until: 'domcontentloaded', wait: 4500 });
  await visit('video-/the-location-of-the-location', `${BASE}/the-location-of-the-location`, { until: 'domcontentloaded', wait: 4500 });
  scenario = 'beacons';
  const beacons = await page.evaluate(() => window.__beacons || []);
  await browser.close(); proxy.close();
  fs.writeFileSync(OUT, JSON.stringify({ rec, wsRec, beacons, tripwire: trip }, null, 1));
  console.log('records', rec.length, 'ws', wsRec.length, 'beacons', beacons.length, 'TRIPWIRE (must be 0):', trip.length);
})().catch((e) => { console.error('capture failed', e); process.exit(1); });
