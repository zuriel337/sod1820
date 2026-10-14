// RPC-complete, anonymous public-read capture/replay. This is a controlled replay
// experiment, not a claim about hosted PostgREST/preflight or physical devices.
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const run = promisify(execFile);
const require = createRequire(`${process.env.PLAYWRIGHT_DIR || '/workspace/perf-execution-scratch/tools'}/node_modules/`);
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).filter((_, i) => i % 2 === 0).map((key, i) => [key.slice(2), process.argv[3 + i * 2]]));
const mode = args.mode || 'replay', runs = Number(args.runs || (mode === 'record' ? 1 : 7));
const routes = (args.routes || '/,/world,/post/seventh-to-tenth-sefirot-2027').split(',');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fixturePath = args.fixtures;
if (!args.dist || !args.out || !fixturePath) throw new Error('--dist, --out and --fixtures required');
const fixtures = fs.existsSync(fixturePath) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(fixturePath))) : {};
const ALLOW = new Set(['convergence_meter', 'fn_method_value', 'fn_zero_scale', 'gematria_api', 'gematria_method_trace', 'get_category_videos', 'number_neighbors', 'posts_by_number_strict', 'world_group_source_arrivals_v2']);
const telemetry = /link_identity|track_visit|ingest_event|analytics|clarity\.ms|googletagmanager|facebook|doubleclick|openweb|spot\.im/;
const normalize = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g, 'TS');
function keyOf(req) {
  let body = req.postData() || '';
  try { body = JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a], [b]) => a.localeCompare(b)))); } catch {}
  return `${req.method()} ${normalize(req.url())} ${body}`;
}
function primary(pathname, req) {
  const u = new URL(req.url());
  if (pathname.startsWith('/post/')) return u.pathname === '/rest/v1/posts' && (u.searchParams.get('slug') || '').includes(decodeURIComponent(pathname.slice(6)));
  return u.pathname === '/rest/v1/posts' && (pathname !== '/world' || (u.searchParams.get('slug') || '').includes('flydubai-fz1073-363-14000-remzei-geula'));
}
const inflight = new Map();
let capturedRequests = 0;
async function capture(req, key) {
  if (fixtures[key]) return fixtures[key];
  if (inflight.has(key)) return inflight.get(key);
  const promise = (async () => {
    if (++capturedRequests > 200) throw new Error('Capture budget exceeded: 200 upstream reads/assets');
    const headers = req.headers();
    if (headers.authorization && headers.apikey && headers.authorization !== `Bearer ${headers.apikey}`)
      throw new Error('Authenticated capture forbidden');
    const argv = ['--silent', '--show-error', '--compressed', '--max-time', '30', '--request', req.method(), req.url()];
    for (const [name, value] of Object.entries(headers)) if (['apikey', 'authorization', 'accept-profile', 'prefer', 'range', 'accept', 'content-type', 'user-agent'].includes(name)) argv.push('-H', `${name}: ${value}`);
    if (req.postData()) argv.push('--data-binary', req.postData());
    argv.push('--write-out', '\n__PERF_META__%{http_code}|%{content_type}|%header{content-range}');
    const { stdout } = await run('curl', argv, { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024 });
    const split = stdout.lastIndexOf(Buffer.from('\n__PERF_META__'));
    const [status, type, range] = stdout.subarray(split + 14).toString().split('|');
    if (!Number(status)) throw new Error('Missing upstream HTTP status');
    const row = { status: Number(status), type, range, body: stdout.subarray(0, split).toString('base64') };
    fixtures[key] = row;
    return row;
  })();
  inflight.set(key, promise);
  return promise;
}
const { srv, port } = await serve(args.dist);
const origin = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || '/home/agent/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const desktop = args.profile === 'desktop';
const output = { label: args.label, mode, runs, browser: browser.version(), playwright: require('playwright/package.json').version,
  dataMode: 'anonymous-rpc-complete-replay', profile: desktop ? 'desktop' : 'mobile',
  cpu: desktop ? 1 : 4, rtt: desktop ? 40 : 150, download: (desktop ? 10 : 1.6) * 1024 * 1024 / 8, upload: (desktop ? 5000 : 750) * 1024 / 8,
  viewport: desktop ? { width: 1366, height: 768 } : { width: 390, height: 844 }, dpr: desktop ? 1 : 2, routes: {} };
if (args.theme && !['light', 'parchment', 'dark'].includes(args.theme)) throw new Error('Unknown theme');
output.theme = args.theme || 'dark';
output.extensionInjection = { delay: Number(args.extensiondelay || 0), failure: args.extensionfail === '1' };
try {
  for (const pathname of routes) {
    const samples = [];
    for (let i = 0; i < runs; i++) {
      const context = await browser.newContext({ viewport: output.viewport, deviceScaleFactor: output.dpr, isMobile: !desktop, locale: 'he-IL', timezoneId: 'Asia/Jerusalem',
        ...(!desktop ? { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141 Mobile Safari/537.36' } : {}) });
      await context.addInitScript(theme => localStorage.setItem('sod-theme', theme), output.theme);
      const page = await context.newPage(), cdp = await context.newCDPSession(page);
      const errors = [], misses = [], reads = [], blocked = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(({ pathname }) => {
        window.__perf = { ready: null, lcp: 0, cls: 0 };
        new PerformanceObserver(list => { for (const e of list.getEntries()) window.__perf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
        const check = () => {
          const stage = document.querySelector('[data-experience-capability="post-master-reading-stage"]');
          const ready = pathname === '/' ? document.querySelector('[data-experience-capability="home-composition"] a[href^="/post/"]')
            : pathname === '/world' ? document.querySelector('.sod29-flight-feature') : stage && stage.innerText.length > 800;
          if (ready && window.__perf.ready == null) window.__perf.ready = performance.now();
          if (window.__perf.ready == null) requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }, { pathname });
      await page.route('**/*', async route => {
        const req = route.request(), url = req.url(), method = req.method();
        if (url.startsWith(origin)) return new URL(url).pathname.startsWith('/api/') ? route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) : route.continue();
        const u = new URL(url), rpc = u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
        const supabase = u.hostname === 'linswmnnkjxvweumprav.supabase.co';
        if (telemetry.test(url) || (supabase && rpc && !ALLOW.has(rpc) && rpc !== 'world_group_source_arrivals_v3')
          || (supabase && !['GET', 'HEAD'].includes(method) && !(method === 'POST' && (ALLOW.has(rpc) || rpc === 'world_group_source_arrivals_v3')))
          || (supabase && u.pathname.startsWith('/auth/'))) {
          blocked.push(`${method} ${u.pathname}`);
          return route.fulfill({ status: 204, body: '', headers: { 'access-control-allow-origin': '*' } });
        }
        if (!['GET', 'HEAD'].includes(method) && !supabase) return route.abort();
        const key = keyOf(req), started = await page.evaluate(() => performance.now());
        let row;
        try {
          if (rpc === 'world_group_source_arrivals_v3') {
            if (mode === 'record') {
              // GET can only call read-compatible PostgREST functions. A changed
              // live v3 requires explicit catalog/permission review, not a fake 404.
              const probeUrl = new URL(url);
              for (const [name, value] of Object.entries(JSON.parse(req.postData() || '{}'))) probeUrl.searchParams.set(name, String(value));
              const probe = { method: () => 'GET', url: () => probeUrl.href, postData: () => null, headers: () => req.headers() };
              row = await capture(probe, keyOf(probe));
              if (row.status !== 404) throw new Error('Arrivals v3 availability changed; review live read contract before recording');
              fixtures[key] = row;
            } else row = fixtures[key] || { status: 404, type: 'application/json', body: Buffer.from(JSON.stringify({ code: 'PGRST202', message: 'world_group_source_arrivals_v3 not found' })).toString('base64') };
          }
          else if (mode === 'record') row = await capture(req, key);
          else row = fixtures[key];
          if (!row) { misses.push(key); return route.abort(); }
          const delay = supabase ? 150 : 400;
          if (mode === 'replay') await new Promise(resolve => setTimeout(resolve, delay));
          if (args.extensiondelay && rpc && ALLOW.has(rpc)) await new Promise(resolve => setTimeout(resolve, Number(args.extensiondelay)));
          const body = Buffer.from(row.body, 'base64');
          if (args.extensionfail === '1' && rpc === 'gematria_method_trace') {
            const failure = JSON.stringify({ code: 'PERF_EXTENSION_TEST', message: 'Intentional read-extension failure' });
            reads.push({ method, path: u.pathname + u.search, args: req.postData(), status: 400, start: started, primary: false, bytes: failure.length, bodyHash: hash(failure), intentionalFailure: true });
            return route.fulfill({ status: 400, contentType: 'application/json', body: failure, headers: { 'access-control-allow-origin': '*' } });
          }
          if (supabase && u.pathname.startsWith('/rest/v1/')) reads.push({ method, path: u.pathname + u.search, args: req.postData(), status: row.status,
            start: started, primary: primary(pathname, req), bytes: body.length, bodyHash: hash(body) });
          return route.fulfill({ status: row.status, body: method === 'HEAD' ? '' : body, headers: { 'content-type': row.type || 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...(row.range ? { 'content-range': row.range } : {}) } });
        } catch (e) { errors.push(`Capture ${u.pathname}: ${e.message}`); return route.abort(); }
      });
      if (mode === 'replay') {
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: output.rtt, downloadThroughput: output.download, uploadThroughput: output.upload });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: output.cpu });
      }
      await cdp.send('Performance.enable');
      await page.goto(origin + pathname, { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction(() => window.__perf.ready != null, null, { timeout: 30000 }).catch(() => errors.push('Primary content did not become ready'));
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => errors.push('Network did not settle'));
      await page.waitForTimeout(1000);
      const metrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource'), rest = resources.filter(r => r.name.includes('/rest/v1/'));
        const stage = document.querySelector('[data-experience-capability="post-master-reading-stage"]');
        const main = stage || document.querySelector('main') || document.body;
        return { ...window.__perf, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
          lastRestEnd: rest.length ? Math.max(...rest.map(r => r.responseEnd)) : null, reqs: resources.length,
          text: main.innerText.replace(/\s+/g, ' ').trim(), links: [...main.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
          scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth };
      });
      const pm = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
      const primaryReads = reads.filter(r => r.primary);
      const textHash = hash(metrics.text), textLength = metrics.text.length; delete metrics.text;
      samples.push({ ...metrics, textHash, textLength, script: pm.ScriptDuration * 1000, task: pm.TaskDuration * 1000,
        firstPrimaryReq: primaryReads.length ? Math.min(...primaryReads.map(r => r.start)) : null, restCount: reads.length,
        errors, misses, blocked: [...new Set(blocked)], reads });
      await context.close();
    }
    const median = key => { const values = samples.map(s => s[key]).filter(Number.isFinite).sort((a, b) => a - b); return values.length ? values[Math.floor(values.length / 2)] : null; };
    const keys = ['fcp', 'lcp', 'ready', 'cls', 'firstPrimaryReq', 'lastRestEnd', 'restCount', 'reqs', 'script', 'task'];
    output.routes[pathname] = { median: Object.fromEntries(keys.map(k => [k, median(k)])), ranges: Object.fromEntries(keys.map(k => [k, [Math.min(...samples.map(s => s[k])), Math.max(...samples.map(s => s[k]))]])), samples };
    console.error(pathname, JSON.stringify(output.routes[pathname].median));
  }
} finally {
  if (mode === 'record') fs.writeFileSync(fixturePath, zlib.gzipSync(JSON.stringify(fixtures)));
  output.fixturesSha256 = hash(fs.readFileSync(fixturePath));
  fs.writeFileSync(args.out, JSON.stringify(output, null, 2) + '\n');
  await browser.close(); srv.close();
}
