// Frozen RPC-complete anonymous fixture replay. This is a controlled replay
// experiment, not a claim about hosted PostgREST/preflight or physical devices.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
import isolation from '../ci-isolation/policy.cjs';
const {requireIsolation,frozenSnapshot,requestPolicy,browserArgs,assertClean,installTransportBoundary}=isolation;
requireIsolation();
import { MEASUREMENT_PROFILE, calibrateRequestClock, documentTime, snapshotReads } from './measurement-profile.mjs';
import { primaryContentState, sessionWindowCls, installBrowserMetrics } from './browser-metrics.mjs';
import { observeNetworkQuiet } from './network-quiet.mjs';
const run = promisify(execFile);
const require = createRequire(`${process.env.PLAYWRIGHT_DIR || '/workspace/perf-execution-scratch/tools'}/node_modules/`);
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).filter((_, i) => i % 2 === 0).map((key, i) => [key.slice(2), process.argv[3 + i * 2]]));
if (args.mode && args.mode !== 'replay') throw new Error('Live capture disabled: provide a complete frozen snapshot; no production fallback');
const mode = args.mode || 'replay', runs = Number(args.runs || (mode === 'record' ? 1 : 7));
const routes = (args.routes || '/,/world,/post/seventh-to-tenth-sefirot-2027').split(',');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fixturePath = args.fixtures;
if (!args.dist || !args.out || !fixturePath) throw new Error('--dist, --out and --fixtures required');
const fixtures = frozenSnapshot(fixturePath);
const ALLOW = new Set(['convergence_meter', 'fn_method_value', 'fn_zero_scale', 'gematria_api', 'gematria_method_trace', 'get_category_videos', 'number_neighbors', 'posts_by_number_strict', 'world_group_source_arrivals_v2']);
const normalize = u => decodeURIComponent(u).replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g, 'TS');
function keyOf(req) {
  let body = req.postData() || '';
  try { body = JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a], [b]) => a.localeCompare(b)))); } catch {}
  const signature = args.headers === '1' ? ` ${JSON.stringify(Object.fromEntries(['prefer', 'range', 'accept-profile'].map(name => [name, req.headers()[name] || ''])))}` : '';
  return `${req.method()} ${normalize(req.url())} ${body}${signature}`;
}
function primary(pathname, req) {
  const u = new URL(req.url());
  if (pathname.startsWith('/post/')) return u.pathname === '/rest/v1/posts' && (u.searchParams.get('slug') || '').includes(decodeURIComponent(pathname.slice(6)));
  return u.pathname === '/rest/v1/posts' && (pathname !== '/world' || (u.searchParams.get('slug') || '').includes('flydubai-fz1073-363-14000-remzei-geula'));
}
const { srv, port } = await serve(args.dist);
const origin = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || '/home/agent/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', args: browserArgs });
const desktop = args.profile === 'desktop';
const output = { measurementProfile: MEASUREMENT_PROFILE, label: args.label, mode, runs, browser: browser.version(), playwright: require('playwright/package.json').version,
  networkIsolation: 'local-fixture-only-v1', dataMode: 'anonymous-rpc-complete-replay', profile: desktop ? 'desktop' : 'mobile',
  cpu: desktop ? 1 : 4, rtt: desktop ? 40 : 150, download: (desktop ? 10 : 1.6) * 1024 * 1024 / 8, upload: (desktop ? 5000 : 750) * 1024 / 8,
  viewport: desktop ? { width: 1366, height: 768 } : { width: 390, height: 844 }, dpr: desktop ? 1 : 2, routes: {} };
if (args.theme && !['light', 'parchment', 'dark'].includes(args.theme)) throw new Error('Unknown theme');
output.theme = args.theme || 'dark';
if (args.navfrom) output.navigation = { from: args.navfrom, note: 'Soft navigation; FCP/LCP are not navigation performance metrics' };
output.extensionInjection = { delay: Number(args.extensiondelay || 0), failure: args.extensionfail === '1' };
try {
  for (const pathname of routes) {
    const samples = [];
    for (let i = 0; i < runs; i++) {
      const context = await browser.newContext({ viewport: output.viewport, deviceScaleFactor: output.dpr, isMobile: !desktop, serviceWorkers: 'block', locale: 'he-IL', timezoneId: 'Asia/Jerusalem',
        ...(!desktop ? { userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141 Mobile Safari/537.36' } : {}) });
      await context.addInitScript(theme => localStorage.setItem('sod-theme', theme), output.theme);
      await installTransportBoundary(context);
      const page = await context.newPage(), cdp = await context.newCDPSession(page);
      const network = observeNetworkQuiet(page);
      const errors = [], misses = [], reads = [], blocked = [], pendingResponses = new Set();
      const requestClock = await calibrateRequestClock(page);
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript({ content: `window.__primaryContentState = ${primaryContentState};
        window.__sessionWindowCls = ${sessionWindowCls};
        (${installBrowserMetrics})(${JSON.stringify({ pathname })});` });
      await context.route('**/*', async route => {
        const req = route.request(), url = req.url(), method = req.method();
        let kind;
        try { kind = requestPolicy(req, origin, fixtures, keyOf(req)); }
        catch (error) { errors.push(error.message); return route.abort('blockedbyclient'); }
        if (kind === 'local') return route.continue();
        if (kind === 'effect-fixture') {
          blocked.push(`${method} ${new URL(url).pathname}:isolated-effect`);
          return route.fulfill({ status: 204, body: '', headers: { 'access-control-allow-origin': '*' } });
        }
        const u = new URL(url), rpc = u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
        const supabase = u.hostname === 'linswmnnkjxvweumprav.supabase.co';
        // No renderer/DevTools round trip is allowed on the fixture response path.
        const key = keyOf(req), started = requestClock.epochNow();
        pendingResponses.add(req);
        let row;
        try {
          row = fixtures[key];
          if (!row) { misses.push(key); return route.abort(); }
          const delay = supabase ? 150 : 400;
          if (mode === 'replay') await new Promise(resolve => setTimeout(resolve, delay));
          if (args.extensiondelay && rpc && ALLOW.has(rpc)) await new Promise(resolve => setTimeout(resolve, Number(args.extensiondelay)));
          const body = Buffer.from(row.body, 'base64');
          if (args.extensionfail === '1' && rpc === 'gematria_method_trace') {
            const failure = JSON.stringify({ code: 'PERF_EXTENSION_TEST', message: 'Intentional read-extension failure' });
            reads.push({ method, path: u.pathname + u.search, args: req.postData(), status: 400, start: started, primary: false, bytes: failure.length, bodyHash: hash(failure), intentionalFailure: true });
            return await route.fulfill({ status: 400, contentType: 'application/json', body: failure, headers: { 'access-control-allow-origin': '*' } });
          }
          if (supabase && u.pathname.startsWith('/rest/v1/')) reads.push({ method, path: u.pathname + u.search, args: req.postData(), status: row.status,
            start: started, primary: primary(pathname, req), bytes: body.length, bodyHash: hash(body) });
          return await route.fulfill({ status: row.status, body: method === 'HEAD' ? '' : body, headers: { 'content-type': row.type || 'application/json', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range', ...(row.range ? { 'content-range': row.range } : {}) } });
        } catch (e) { errors.push(`Capture ${u.pathname}: ${e.message}`); return route.abort(); }
        finally { pendingResponses.delete(req); }
      });
      if (mode === 'replay') {
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: output.rtt, downloadThroughput: output.download, uploadThroughput: output.upload });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: output.cpu });
      }
      await cdp.send('Performance.enable');
      let navStart = 0, beforePerformance = null;
      await page.goto(origin + (args.navfrom || pathname), { waitUntil: 'load', timeout: 60000 });
      if (args.navfrom) {
        await page.waitForFunction(from => window.__primaryContentState(from).primary, args.navfrom, { timeout: 30000 });
        await network.wait();
        beforePerformance = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
        reads.length = 0;
        navStart = await page.evaluate(pathname => {
          const start = performance.now();
          window.__resetPerf(start);
          history.pushState({ ...history.state, idx: (history.state?.idx || 0) + 1, key: 'perf-navigation', usr: null }, '', pathname);
          dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
          window.__checkPrimaryReady();
          return start;
        }, pathname);
      }
      await page.waitForFunction(() => window.__perf.ready != null, null, { timeout: 30000 }).catch(() => errors.push('Primary content did not become ready'));
      let backgroundSettled = null;
      await network.wait()
        .then(async () => { backgroundSettled = await page.evaluate(() => performance.now()); })
        .catch(() => errors.push('Network did not settle'));
      await page.waitForTimeout(1000);
      // Freeze controller observations before any final renderer/DevTools read
      // can allow more asynchronous handlers to append to the live arrays.
      const rawReadSnapshot = reads.map(read => ({ ...read }));
      const observedErrors = [...errors], observedMisses = [...misses];
      const pendingFixtureResponses = pendingResponses.size;
      const readsObservationEndEpoch = requestClock.epochNow();
      const metrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource'), rest = resources.filter(r => r.name.includes('/rest/v1/'));
        const stage = document.querySelector('[data-experience-capability="post-master-reading-stage"]');
        const main = stage || document.querySelector('main') || document.body;
        return { ...window.__perf, timeOrigin: performance.timeOrigin, observationEnd: performance.now(),
          primaryState: window.__primaryContentState(location.pathname), layoutShifts: window.__shifts, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
          lastRestEnd: rest.length ? Math.max(...rest.map(r => r.responseEnd)) : null, reqs: resources.length,
          text: main.innerText.replace(/\s+/g, ' ').trim(), links: [...main.querySelectorAll('a[href]')].map(a => a.getAttribute('href')),
          scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth };
      });
      const pm = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
      const sampleReads = snapshotReads(rawReadSnapshot, metrics.timeOrigin);
      const primaryReads = sampleReads.filter(r => r.primary);
      const textHash = hash(metrics.text), textLength = metrics.text.length; delete metrics.text;
      // Store read.start on the browser document clock, as before. Only the
      // controller observation source changed; navStart is on this same axis.
      metrics.backgroundSettled = backgroundSettled;
      metrics.readsObservationEnd = documentTime(readsObservationEndEpoch, metrics.timeOrigin);
      if (args.navfrom) {
        for (const key of ['shell', 'ready', 'lastRestEnd', 'backgroundSettled', 'observationEnd', 'readsObservationEnd'])
          if (metrics[key] != null) metrics[key] -= navStart;
        metrics.fcp = null; metrics.lcp = null; // hard-navigation paints do not describe SPA navigation
      }
      samples.push({ ...metrics, navStart, clockUncertaintyMs: requestClock.uncertaintyMs, textHash, textLength, script: (pm.ScriptDuration - (beforePerformance?.ScriptDuration || 0)) * 1000, task: (pm.TaskDuration - (beforePerformance?.TaskDuration || 0)) * 1000,
        firstPrimaryReq: primaryReads.length ? Math.min(...primaryReads.map(r => r.start)) - navStart : null, restCount: sampleReads.length,
        pendingFixtureResponses,
        errors: observedErrors, misses: observedMisses, blocked: [...new Set(blocked)], reads: sampleReads });
      await context.close();
      assertClean();
    }
    const median = key => { const values = samples.map(s => s[key]).filter(Number.isFinite).sort((a, b) => a - b); return values.length ? values[Math.floor(values.length / 2)] : null; };
    const keys = ['fcp', 'lcp', 'shell', 'ready', 'backgroundSettled', 'layoutShiftSum', 'cls', 'firstPrimaryReq', 'lastRestEnd', 'restCount', 'reqs', 'script', 'task'];
    output.routes[pathname] = { median: Object.fromEntries(keys.map(k => [k, median(k)])), ranges: Object.fromEntries(keys.map(k => [k, samples.some(s => Number.isFinite(s[k]))
      ? [Math.min(...samples.map(s => s[k]).filter(Number.isFinite)), Math.max(...samples.map(s => s[k]).filter(Number.isFinite))] : [null, null]])), samples };
    console.error(pathname, JSON.stringify(output.routes[pathname].median));
  }
} finally {
  output.fixturesSha256 = hash(fs.readFileSync(fixturePath));
  fs.writeFileSync(args.out, JSON.stringify(output, null, 2) + '\n');
  await browser.close(); srv.close();
  assertClean();
}

// The existing CI workflow owns this entrypoint. Run source-fidelity guards only
// after the head's seven-sample timing capture has finished, using that same
// private snapshot. Baseline capture/replay and failure-injection probes stay separate.
const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));
if (process.env.GITHUB_ACTIONS === 'true' && mode === 'replay' && runs === 7
  && process.env.GITHUB_WORKSPACE && path.resolve(args.dist) === path.resolve(process.env.GITHUB_WORKSPACE, 'dist')) {
  const { stdout } = await run(process.execPath, [path.join(workspaceRoot, 'scripts/perf-execution-2029/mobile-image-gate.mjs'),
    args.dist, path.join(path.dirname(args.out), 'mobile-image-functional.json'), fixturePath],
    { cwd: workspaceRoot, maxBuffer: 1024 * 1024 });
  process.stdout.write(stdout);
  const tests = ['src/lib/research/goldenPostContextPacks.test.js', 'src/lib/research/nasrallahPost92Golden.test.js',
    'src/components/experience2029/mobileReadingImage2029.test.js',
    'scripts/perf-execution-2029/measurement.test.mjs', 'scripts/perf-execution-2029/measurement.browser.test.mjs'];
  const checked = await run(process.execPath, ['--test', ...tests], { cwd: workspaceRoot, maxBuffer: 1024 * 1024 });
  process.stdout.write(checked.stdout);
}
