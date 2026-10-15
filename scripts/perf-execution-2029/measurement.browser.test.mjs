// Real Chromium, controlled local page and intercepted synthetic public response.
// Set PERF_RUNNER_SOURCE to an unmodified historical measure.mjs for the negative control.
import test from 'node:test';
import isolation from '../ci-isolation/policy.cjs';
const {permitLocalServer,requestPolicy,browserArgs}=isolation;
import { calibrateRequestClock, documentTime } from './measurement-profile.mjs';
import { primaryContentState, sessionWindowCls, installBrowserMetrics } from './browser-metrics.mjs';
import { observeNetworkQuiet } from './network-quiet.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(`${process.env.PLAYWRIGHT_DIR}/node_modules/`);
const { chromium } = require('playwright');

test('fixture response is dispatched while the real renderer is blocked', async () => {
  const source = fs.readFileSync(process.env.PERF_RUNNER_SOURCE || new URL('./measure.mjs', import.meta.url), 'utf8');
  const start = source.indexOf("      await context.route('**/*', async route => {");
  const end = source.indexOf('\n      });', start);
  assert.ok(start >= 0 && end > start, 'Execute the exact production route callback');
  const server = http.createServer((_, res) => res.end('<!doctype html><title>renderer regression</title>'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  permitLocalServer(server);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || chromium.executablePath(), args: browserArgs });
  let cdp, running, pausing, fetching;
  try {
    const page = await browser.newPage({serviceWorkers:'block'});
    await page.goto(origin);
    const clock = await calibrateRequestClock(page);
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    let handler, dispatchAt;
    const errors = [], misses = [], reads = [], url = 'https://linswmnnkjxvweumprav.supabase.co/rest/v1/posts?probe=cold-clock';
    const key = `GET ${url} `;
    await runInNewContext(`(async () => {${source.slice(start, end + '\n      });'.length)}})()`, {
      context: { route: async (_, fn) => { handler = fn; }, evaluate: (...args) => page.evaluate(...args) },
      requestPolicy, origin, pathname: '/', args: {}, mode: 'replay', URL, Buffer, performance, setTimeout,
      telemetry: /analytics/, ALLOW: new Set(), blocked: [], errors, misses, reads,
      keyOf: () => key, requestClock: clock, primary: () => true, pendingResponses: new Set(),
      hash: body => crypto.createHash('sha256').update(body).digest('hex'),
      fixtures: { [key]: { status: 200, type: 'application/json', body: Buffer.from('[{"id":"probe"}]').toString('base64') } },
      capture: () => assert.fail('No upstream reads during replay'),
    });
    cdp = await page.context().newCDPSession(page);
    await cdp.send('Debugger.enable');
    let interceptedAt;
    let resolveDispatch, rejectDispatch;
    const requestDispatched = new Promise((resolve, reject) => { resolveDispatch = resolve; rejectDispatch = reject; });
    await page.route(url, async route => {
        try {
          // Pause inside interception before invoking the exact production
          // callback. The actual route.fulfill must finish while Chromium's
          // renderer stays paused; the network response is not mocked.
          const paused = new Promise(done => cdp.once('Debugger.paused', done));
          pausing = page.evaluate(() => { debugger; });
          await paused;
          interceptedAt = performance.now();
          running = handler({ request: () => route.request(), abort: () => route.abort(),
            fulfill: async response => { await route.fulfill(response); dispatchAt = performance.now(); resolveDispatch(); } });
          await running;
        } catch (error) { rejectDispatch(error); }
    });
    fetching = page.evaluate(url => fetch(url).then(r => r.json()), url);
    let timer;
    try {
      await Promise.race([requestDispatched, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Fixture waited for the blocked renderer')), 1200);
      })]);
    } finally { clearTimeout(timer); }
    const dispatchMs = dispatchAt - interceptedAt;
    const resumed = new Promise(resolve => cdp.once('Debugger.resumed', resolve));
    await cdp.send('Debugger.resume'); await resumed;
    await running;
    assert.deepEqual(await fetching, [{ id: 'probe' }]);
    const browserNow = await page.evaluate(() => performance.now());
    const readStart = documentTime(reads[0].start, timeOrigin);
    console.log(JSON.stringify({ runnerSha256: crypto.createHash('sha256').update(source).digest('hex'),
      renderer: 'Debugger.paused until fixture dispatch', fixtureDelayMs: 150, dispatchMs,
      clockUncertaintyMs: clock.uncertaintyMs, readStart, browserNow, browser: browser.version(), errors, misses }));
    assert.deepEqual(errors, []); assert.deepEqual(misses, []);
    assert.ok(readStart > 0 && readStart <= browserNow + clock.uncertaintyMs);
    assert.ok(dispatchMs < 700, `Fixture waited for renderer: ${dispatchMs.toFixed(1)} ms`);
  } finally {
    if (cdp) await cdp.send('Debugger.resume').catch(() => {});
    if (running) await running;
    if (pausing) await pausing;
    if (fetching) await fetching.catch(() => {});
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
});

test('readiness separates shells, real source content and late background work', async () => {
  const server = http.createServer((_, res) => res.end('<!doctype html><main></main>'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  permitLocalServer(server);
  const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || chromium.executablePath(), args: browserArgs });
  try {
    const page = await browser.newPage({serviceWorkers:'block'});
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const state = async (html, path) => {
      await page.locator('main').evaluate((el, html) => { el.innerHTML = html; }, html);
      return page.evaluate(primaryContentState, path);
    };
    const composition = html => `<div data-experience-capability="home-composition">${html}</div>`;
    assert.equal((await state(composition('<div class="h29-skel"><a href="/post/x">loading</a></div>'), '/')).primary, false);
    assert.equal((await state(composition('<a href="/post/x">unrelated static navigation</a>'), '/')).primary, false);
    const card = '<article class="h29-card"><b class="h29-card-t">Real post title</b><a href="/post/x">Read</a></article>';
    assert.equal((await state(composition(card), '/')).primary, true);
    assert.equal((await state(composition(`<div aria-busy="true">${card}</div>`), '/')).primary, false);
    assert.equal((await state(composition(`<div style="display:none">${card}</div>`), '/')).primary, false);
    const stage = html => `<article data-experience-capability="post-master-reading-stage" data-post-slug="short"><h1>Real title</h1>${html}</article>`;
    const paddedShell = stage(`<aside>${'Navigation and explanatory boilerplate '.repeat(80)}</aside>`);
    assert.equal((await state(paddedShell, '/post/short')).primary, false, '800 shell characters are not source content');
    assert.equal(await page.evaluate(() => document.querySelector('[data-experience-capability=\"post-master-reading-stage\"]').innerText.length > 800), true, 'Legacy post predicate reports this shell ready');
    assert.equal((await state(stage('<section class="sod29-reading-source">Short genuine source.</section>'), '/post/short')).primary, true);
    assert.equal((await state(stage('<section class="sod29-reading-source">Wrong post.</section>'), '/post/other')).primary, false);
    assert.equal((await state(stage('<section class="sod29-reading-source"></section>'), '/post/short')).primary, false);
    assert.equal((await state('<section data-flight-story="world"><div class="sod29-flight-feature"></div></section>', '/world')).primary, false);
    const world = '<section data-flight-story="world"><div class="sod29-flight-feature"><h2>Story</h2><div class="sod29-flight-meta">FZ1073 · source date</div><div class="sod29-actions"><button>Read source</button></div></div></section>';
    assert.equal((await state(world, '/world')).primary, true);
    await page.evaluate(`window.__primaryContentState = ${primaryContentState}; window.__sessionWindowCls = ${sessionWindowCls}; (${installBrowserMetrics})({pathname:'/post/short'});`);
    await state(paddedShell, '/post/short');
    await page.waitForTimeout(50);
    assert.equal(await page.evaluate(() => window.__perf.ready), null);
    await state(stage('<section class="sod29-reading-source">Actual late content.</section><aside aria-busy="true">Background still loading</aside>'), '/post/short');
    await page.waitForFunction(() => window.__perf.ready != null);
    assert.ok(await page.evaluate(() => window.__perf.shell <= window.__perf.ready));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});

test('browser epoch calibration survives a new document and SPA navigation', async () => {
  const server = http.createServer((_, res) => res.end('<!doctype html><main>Clock probe</main>'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  permitLocalServer(server);
  const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || chromium.executablePath(), args: browserArgs });
  try {
    const page = await browser.newPage(), origin = `http://127.0.0.1:${server.address().port}`;
    const clock = await calibrateRequestClock(page);
    for (const route of ['/first', '/second']) {
      await page.goto(origin + route);
      const before = clock.epochNow();
      const observed = await page.evaluate(() => ({ timeOrigin: performance.timeOrigin, now: performance.now() }));
      const after = clock.epochNow();
      assert.ok(observed.now >= documentTime(before, observed.timeOrigin) - clock.uncertaintyMs - 2);
      assert.ok(observed.now <= documentTime(after, observed.timeOrigin) + clock.uncertaintyMs + 2);
    }
    const nav = await page.evaluate(() => { history.pushState({}, '', '/soft'); return performance.now(); });
    const start = clock.epochNow();
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    const delta = documentTime(start, timeOrigin) - nav;
    assert.ok(delta >= -clock.uncertaintyMs - 2 && delta < 100);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});

test('late background requests cannot reuse a previously reached networkidle state', async () => {
  let release;
  const server = http.createServer((req, res) => {
    if (req.url === '/late') release = () => { if (!res.writableEnded) res.end('late response'); };
    else res.end('<!doctype html><main>Primary content is already real</main>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  permitLocalServer(server);
  const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || chromium.executablePath(), args: browserArgs });
  try {
    const page = await browser.newPage(), network = observeNetworkQuiet(page);
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle' });
    const requested = page.waitForRequest('**/late');
    await page.evaluate(() => { window.late = fetch('/late').then(r => r.text()); });
    await requested;
    await page.waitForLoadState('networkidle'); // Legacy collector returns while the new request is active.
    assert.equal(network.pending(), 1);
    let quiet = false;
    const waiting = network.wait().then(() => { quiet = true; });
    await page.waitForTimeout(100);
    assert.equal(quiet, false, 'Current observation must wait for the held response');
    release();
    await waiting;
    assert.equal(network.pending(), 0);
    assert.equal(await page.evaluate(() => window.late), 'late response');
  } finally { release?.(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
