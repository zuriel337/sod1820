// Protected, read-only hosted acceptance. No fixtures, auth identity or raw bodies saved.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(`${process.env.PLAYWRIGHT_DIR || '/workspace/perf-execution-scratch/tools'}/node_modules/`);
const { chromium } = require('playwright');
const base = process.env.SOD_PERF_PREVIEW_BASE, share = process.env.SOD_PERF_SHARE;
if (!base || !share) throw new Error('Protected preview URL and temporary share link required');
const args = Object.fromEntries(process.argv.slice(2).filter((_, i) => i % 2 === 0).map((k, i) => [k.slice(2), process.argv[3 + i * 2]]));
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || '/home/agent/.cache/ms-playwright/chromium-1194/chrome-linux/chrome', proxy: { server: process.env.HTTPS_PROXY }, args: ['--no-sandbox'] });
const output = { mode: 'hosted-live-lcp-diagnostic', browser: browser.version(), playwright: require('playwright/package.json').version,
  runs: Number(args.runs || 3), viewport: { width: 390, height: 844 }, dpr: 2, cpu: 4, rtt: 150, download: 209715.2, upload: 96000,
  coldBrowserCache: true, completion: 'REST requests finished and quiet for1s, primary images complete; external streaming/text tracks recorded separately', excludedReviewTooling: 'vercel.live only, both arms', postgresCache: 'uncontrolled', runnerLocation: 'unverified; deployment iad1', routes: {} };
try {
  for (const path of (args.routes || '/,/world,/post/seventh-to-tenth-sefirot-2027').split(',')) {
    const samples = [];
    for (let i = 0; i < output.runs; i++) {
      const context = await browser.newContext({ viewport: output.viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36' });
      const page = await context.newPage();
      // Exclude platform review tooling in BOTH arms; do not change deployment settings.
      await page.route('https://vercel.live/**', route => route.fulfill({ status: 204, body: '' }));
      await page.goto(`${base}/preview-build.json?_vercel_share=${encodeURIComponent(share)}`, { timeout: 45000 });
      const build = JSON.parse(await page.textContent('body'));
      if (!build.readOnly || build.buildTarget !== '2029') throw new Error('Wrong hosted artifact');
      if (output.build && output.build.commit !== build.commit) throw new Error('Hosted artifact changed');
      if (build.commit !== process.env.SOD_PERF_EXPECTED_SHA) throw new Error('Unexpected preview runtime');
      output.build = build; output.preview = base;
      // Install guard without loading the application or any product read. Each sample is a new context.
      await page.evaluate(async () => {
        await navigator.serviceWorker.register('/preview-readonly-sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise(r => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
      });
      await context.clearCookies({ name: 'sod-theme' });
      await page.evaluate(() => localStorage.setItem('sod-theme', 'dark'));
      await page.addInitScript(path => {
        window.__hosted = { ready: null, lcp: 0, cls: 0 };
        new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__hosted.lcp = e.startTime; window.__hosted.lcpElement = { tag: e.element?.tagName, className: e.element?.className, url: e.url, size: e.size, loading: e.element?.loading, fetchPriority: e.element?.fetchPriority, renderedWidth: e.element?.clientWidth, naturalWidth: e.element?.naturalWidth, naturalHeight: e.element?.naturalHeight }; } }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__hosted.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
        const check = () => {
          const el = path === '/' ? document.querySelector('[data-experience-capability="home-composition"] a[href^="/post/"]') : path === '/world' ? document.querySelector('[data-flight-story="world"] .sod29-flight-feature') : document.querySelector('[data-experience-capability="post-master-reading-stage"]');
          if (window.__hosted.ready == null && el && (path !== '/post/seventh-to-tenth-sefirot-2027' || el.innerText.length > 800)) window.__hosted.ready = performance.now();
        };
        new MutationObserver(check).observe(document, { subtree: true, childList: true, characterData: true });
      }, path);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const cdp = await context.newCDPSession(page);
      let startClock = null;
      const reads = new Map(), resources = new Map();
      cdp.on('Network.requestWillBeSent', e => {
        if (e.type === 'Document' && e.request.url === base + path) startClock = e.timestamp;
        resources.set(e.requestId, { url: e.request.url, method: e.request.method, type: e.type, initiator: e.initiator.type, priority: e.request.initialPriority, startClock: e.timestamp });
        if (e.request.url.includes('/rest/v1/')) reads.set(e.requestId, { url: e.request.url, method: e.request.method, startClock: e.timestamp });
      });
      cdp.on('Network.responseReceived', e => { if (resources.has(e.requestId)) Object.assign(resources.get(e.requestId), { status: e.response.status, mime: e.response.mimeType, responseClock: e.timestamp, timing: e.response.timing, serverTiming: e.response.headers['server-timing'] ?? null }); if (reads.has(e.requestId)) reads.get(e.requestId).status = e.response.status; });
      cdp.on('Network.loadingFinished', e => { if (resources.has(e.requestId)) Object.assign(resources.get(e.requestId), { endClock: e.timestamp, encodedBytes: e.encodedDataLength }); if (reads.has(e.requestId)) reads.get(e.requestId).endClock = e.timestamp; });
      cdp.on('Network.loadingFailed', e => {
        if (!reads.has(e.requestId)) return;
        const read = reads.get(e.requestId);
        // Chrome reports body-less successful HEAD as ERR_ABORTED: headers are the complete response.
        if (read.method === 'HEAD' && read.status >= 200 && read.status < 300 && e.errorText === 'net::ERR_ABORTED') {
          read.endClock = e.timestamp; read.headCompletedWithoutBody = true;
        } else read.failure = e.errorText;
      });
      await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: output.download, uploadThroughput: output.upload });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(base + path, { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction(() => window.__hosted.ready != null, null, { timeout: 45000 }).catch(() => errors.push('Primary not ready'));
      const settleDeadline = Date.now() + 30000;
      let quietSince = null, lastReadCount = -1, restSettled = false;
      while (Date.now() < settleDeadline) {
        const all = [...reads.values()];
        if (all.length && all.every(r => r.endClock || r.failure)) {
          if (all.length !== lastReadCount || quietSince == null) quietSince = Date.now();
          if (Date.now() - quietSince >= 1000) { restSettled = true; break; }
        } else quietSince = null;
        lastReadCount = all.length;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!restSettled || [...reads.values()].some(r => r.failure)) errors.push('REST did not finish cleanly');
      await page.waitForFunction(() => [...document.querySelectorAll('img.sod29-canonical-media-image.is-primary')].every(img => img.complete && img.naturalWidth > 0), null, { timeout: 30000 }).catch(() => errors.push('Primary image incomplete'));
      await page.waitForTimeout(1000);
      const row = await page.evaluate(path => {
        const resources = performance.getEntriesByType('resource'), rest = resources.filter(r => r.name.includes('/rest/v1/'));
        const primary = rest.filter(r => {
          const u = new URL(r.name); return u.pathname === '/rest/v1/posts' && (path === '/' || (u.searchParams.get('slug') || '').includes(path === '/world' ? 'flydubai-fz1073-363-14000-remzei-geula' : path.slice(6)));
        });
        return { ...window.__hosted, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
          firstPrimaryReq: primary.length ? Math.min(...primary.map(r => r.startTime)) : null,
          lastRestEnd: rest.length ? Math.max(...rest.map(r => r.responseEnd)) : null, restCount: rest.length,
          requests: resources.length, overflow: document.documentElement.scrollWidth > innerWidth,
          guard: !!navigator.serviceWorker.controller?.scriptURL.endsWith('/preview-readonly-sw.js') };
      }, path);
      const resourceRows = [...resources.values()].map(r => ({ url: r.url, method: r.method, type: r.type, initiator: r.initiator, priority: r.priority, status: r.status, mime: r.mime, response: r.responseClock ? (r.responseClock - startClock) * 1000 : null, timing: r.timing, encodedBytes: r.encodedBytes ?? null, start: (r.startClock - startClock) * 1000, end: r.endClock ? (r.endClock - startClock) * 1000 : null }));
      row.lcpResource = resourceRows.find(r => r.url === row.lcpElement?.url) ?? null;
      const observed = [...reads.values()].map(r => ({ url: r.url, method: r.method, status: r.status ?? null,
        start: (r.startClock - startClock) * 1000, end: r.endClock ? (r.endClock - startClock) * 1000 : null, failure: r.failure ?? null, headCompletedWithoutBody: !!r.headCompletedWithoutBody }));
      const primaryReads = observed.filter(r => {
        const u = new URL(r.url); return r.method === 'GET' && u.pathname === '/rest/v1/posts' && (path === '/' || (u.searchParams.get('slug') || '').includes(path === '/world' ? 'flydubai-fz1073-363-14000-remzei-geula' : path.slice(6)));
      });
      row.firstPrimaryReq = primaryReads.length ? Math.min(...primaryReads.map(r => r.start)) : null;
      row.lastRestEnd = observed.length ? Math.max(...observed.map(r => r.end ?? 0)) : null;
      row.restCount = observed.length;
      row.optionsCount = observed.filter(r => r.method === 'OPTIONS').length;
      samples.push({ ...row, restSettled, errors, reads: observed, resources: resourceRows }); await context.close();
      console.error(path, `sample ${i + 1}/${output.runs}`, 'ready', row.ready, 'errors', errors);
    }
    const keys = ['fcp', 'lcp', 'ready', 'firstPrimaryReq', 'lastRestEnd', 'restCount', 'cls'];
    output.routes[path] = { median: Object.fromEntries(keys.map(k => [k, samples.map(s => s[k]).sort((a, b) => a - b)[Math.floor(samples.length / 2)]])), ranges: Object.fromEntries(keys.map(k => [k, [Math.min(...samples.map(s => s[k])), Math.max(...samples.map(s => s[k]))]])), samples };
    console.error(path, JSON.stringify(output.routes[path].median));
    fs.writeFileSync(args.out, JSON.stringify(output, null, 2) + '\n');
  }
} finally { fs.writeFileSync(args.out, JSON.stringify(output, null, 2) + '\n'); await browser.close(); }
