// Real-click interaction probe: click -> content visible, long tasks, scroll storage cost.
// Anonymous live public reads only; telemetry and every non-read write are blocked.
// Usage: node interaction.mjs --dist dist --scenario scroll|nav-world|nav-post|nav-back --runs 7 --out file.json
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { serve } from './serve.mjs';
const require = createRequire(`${process.env.PLAYWRIGHT_DIR || '/tmp/claude-0/pw'}/node_modules/`);
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).filter((_, i) => i % 2 === 0).map((k, i) => [k.slice(2), process.argv[3 + i * 2]]));
const scenario = args.scenario || 'scroll', runs = Number(args.runs || 7);
const slug = args.slug || 'bennett-melach-631-78';
const telemetry = /link_identity|track_visit|ingest_event|analytics|clarity\.ms|googletagmanager|facebook|doubleclick|openweb|spot\.im/;
const { srv, port } = await serve(args.dist);
const origin = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: process.env.PERF_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const out = { scenario, runs, dist: args.dist, label: args.label, browser: browser.version(), profile: 'mobile 390x844 dpr2 cpu4', samples: [] };
for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  await ctx.addInitScript(() => {
    localStorage.setItem('sod-theme', 'dark');
    window.__p = { longtasks: [], store: { n: 0, ms: 0, bytes: 0 }, stamps: {} };
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__p.longtasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true });
    window.__p.cls = 0; window.__p.clickAt = null;
    addEventListener('pointerdown', () => { window.__p.clickAt = performance.now(); }, true);
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__p.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    for (const S of [Storage.prototype]) {
      const orig = S.setItem;
      S.setItem = function (k, v) { const t = performance.now(); const r = orig.call(this, k, v); window.__p.store.n++; window.__p.store.ms += performance.now() - t; window.__p.store.bytes += String(v).length; return r; };
    }
  });
  if (args.seed === 'heavy') await ctx.addInitScript(() => {
    // Representative heavy research state (large library/cart/history/journeys) for the guest principal.
    if (localStorage.getItem('sod_research_v2:guest')) return;
    const item = (n, t) => ({ id: `${t}${n}`, type: t, label: `פריט מחקר ${n} — כותרת ארוכה לבדיקה`, href: `/${t}/${n}`, note: 'x'.repeat(160), t: Date.now() - n });
    const list = (c, t) => Array.from({ length: c }, (_, n) => item(n, t));
    const state = { cart: list(120, 'post'), saved: list(300, 'number'), pinned: list(30, 'topic'), history: list(50, 'post'),
      collections: Array.from({ length: 12 }, (_, n) => ({ id: `c${n}`, name: `אוסף ${n}`, topic: null, world: null, number: n, year: null })),
      journeys: Array.from({ length: 30 }, (_, n) => ({ id: `j${n}`, root: n + 100, path: Array.from({ length: 12 }, (_, k) => ({ n: k, v: k * 7 })), world: null, msg: null, t: Date.now() })), context: null };
    localStorage.setItem('sod_research_v2:guest', JSON.stringify({ state, mode: 'discovery', revision: null }));
  });
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const reqs = []; const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.url().includes('supabase.co')) reqs.push(r.method() + ' ' + new URL(r.url()).pathname.replace('/rest/v1/', '')); });
  await page.route('**/*', route => {
    const r = route.request(), u = r.url();
    if (u.startsWith(origin)) return new URL(u).pathname.startsWith('/api/') ? route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }) : route.continue();
    if (telemetry.test(u) || (u.includes('supabase.co') && (!['GET', 'HEAD', 'OPTIONS'].includes(r.method()) && !/\/rpc\//.test(u)) ) || u.includes('/auth/')) return route.fulfill({ status: 204, body: '', headers: { 'access-control-allow-origin': '*' } });
    return route.continue();
  });
  const sample = { i };
  try {
    if (scenario === 'scroll') {
      await page.goto(`${origin}/post/${slug}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-experience-capability="post-master-reading-stage"]', { timeout: 60000 });
      await page.waitForFunction(() => document.querySelector('[data-experience-capability="post-master-reading-stage"]').innerText.length > 800, null, { timeout: 60000 });
      await page.waitForTimeout(2500);
      const before = await page.evaluate(() => ({ lt: window.__p.longtasks.length, st: { ...window.__p.store }, y: scrollY, h: document.documentElement.scrollHeight }));
      const regionChanges = await page.evaluate(() => new Promise(res => {
        let n = 0; const seen = [];
        const mo = new MutationObserver(() => {}); mo.disconnect();
        window.__regions = seen;
        res(0);
      }));
      const t0 = Date.now();
      const steps = 40; const frames = [];
      await page.evaluate(() => { window.__frames = []; let last = performance.now(); const tick = t => { window.__frames.push(t - last); last = t; window.__raf = requestAnimationFrame(tick); }; window.__raf = requestAnimationFrame(tick); });
      for (let s = 0; s < steps; s++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(120); }
      await page.waitForTimeout(800);
      const after = await page.evaluate(() => ({ lt: window.__p.longtasks.slice(), st: { ...window.__p.store }, y: scrollY, h: document.documentElement.scrollHeight, frames: window.__frames.slice(), journal: Object.keys(sessionStorage).length }));
      const f = after.frames; const slow = f.filter(x => x > 50);
      Object.assign(sample, { scrolled: after.y, regionsVisited: 0, pageH: after.h, longtasks: after.lt.slice(before.lt).length, longtaskMs: after.lt.slice(before.lt).reduce((a, x) => a + x[1], 0),
        maxLongtask: Math.max(0, ...after.lt.slice(before.lt).map(x => x[1])), storeWrites: after.st.n - before.st.n, storeMs: +(after.st.ms - before.st.ms).toFixed(1), storeKB: +((after.st.bytes - before.st.bytes) / 1024).toFixed(1),
        frames: f.length, slowFrames: slow.length, worstFrame: Math.round(Math.max(0, ...f)), wallMs: Date.now() - t0 });
    }

    if (scenario === 'chain') {
      const READY = {
        home: () => !!document.querySelector('[data-experience-capability="home-composition"] a[href^="/post/"]'),
        world: () => !!document.querySelector('[data-flight-story="world"] .sod29-flight-feature'),
        post: () => (document.querySelector('[data-experience-capability="post-master-reading-stage"]')?.innerText.length || 0) > 800,
        topic: () => location.pathname.startsWith('/topic/') && !document.querySelector('[data-flight-story="world"]') && !!document.querySelector('h1') && (document.body.innerText.length > 1200),
        number: () => { const d = document.querySelector('.sod29-number-drawer2029:not(.sod29-number-drawer-empty)'); return !!d && !/מחבר את ליבת המספר/.test(d.innerText) && d.innerText.length > 250; },
      };
      const waitReady = async name => {
        await page.waitForFunction(({ name, src }) => { const f = new Function('return ' + src)(); return f(); }, { name, src: READY[name].toString() }, { timeout: 60000, polling: 'raf' });
      };
      // Scroll the link to mid-viewport, verify the point is not covered, then send a real mouse click.
      const realClick = async selector => {
        const loc = page.locator(selector).first();
        // Bring the link into the viewport with real wheel input (programmatic scrolling is reset on this page).
        for (let k = 0; k < 40; k++) {
          const box = await loc.boundingBox();
          if (box && box.y > 80 && box.y + box.height < 760) break;
          await page.mouse.wheel(0, box ? (box.y > 400 ? Math.min(box.y - 300, 900) : -600) : 600);
          await page.waitForTimeout(250);
        }
        const box = await loc.boundingBox();
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        const hit = await page.evaluate(([x, y, sel]) => !!document.elementFromPoint(x, y)?.closest(sel), [x, y, selector]);
        if (!hit) { const who = await page.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); return t ? t.tagName + '.' + String(t.className).slice(0, 70) : 'null'; }, [x, y]); throw new Error('link covered at click point: ' + selector + ' y=' + Math.round(y) + ' by ' + who); }
        await page.mouse.click(x, y);
      };
      const window_ = async (label, clickFn, name) => {
        const b = await page.evaluate(() => ({ lt: window.__p.longtasks.length, cls: window.__p.cls, ss: window.__p.store.n }));
        const r0 = reqs.length;
        await page.evaluate(() => { window.__p.clickAt = null; });
        await clickFn();
        await waitReady(name);
        const t = await page.evaluate(() => performance.now() - window.__p.clickAt);
        await page.waitForTimeout(700);
        const a = await page.evaluate(() => ({ lt: window.__p.longtasks.slice(), cls: window.__p.cls, ss: window.__p.store.n }));
        const lts = a.lt.slice(b.lt);
        return { [`${label}_ms`]: Math.round(t), [`${label}_longMs`]: lts.reduce((x, y) => x + y[1], 0), [`${label}_reqs`]: reqs.length - r0, [`${label}_cls`]: +(a.cls - b.cls).toFixed(4), [`${label}_stores`]: a.ss - b.ss, [`${label}_reqlist`]: Object.entries(reqs.slice(r0).reduce((o, r) => (o[r] = (o[r] || 0) + 1, o), {})).map(([k, v]) => v + 'x ' + k.slice(0, 110)) };
      };
      await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' });
      await waitReady('home'); await page.waitForTimeout(2500);
      for (const pass of ['first', 'again']) {
        Object.assign(sample, await window_(`${pass}_home_to_world`, () => realClick('[data-experience-capability="home-composition"] a[href="/world"]'), 'world'));
        await page.waitForTimeout(1500);
        Object.assign(sample, await window_(`${pass}_world_to_post`, () => realClick('.sod29-flight-feature button.sod29-action.primary'), 'post'));
        await page.waitForTimeout(1500);
        const t0 = Date.now(); await page.evaluate(() => { window.__p.clickAt = performance.now(); }); 
        const b = await page.evaluate(() => ({ lt: window.__p.longtasks.length })); const r0 = reqs.length;
        await page.goBack(); await waitReady('world');
        sample[`${pass}_post_back_world_ms`] = await page.evaluate(() => Math.round(performance.now() - window.__p.clickAt));
        sample[`${pass}_post_back_world_reqs`] = reqs.length - r0;
        await page.waitForTimeout(1500);
        Object.assign(sample, await window_(`${pass}_world_to_topic`, () => realClick('a.sod29-world-catalog-card[href^="/topic/"]'), 'topic'));
        await page.waitForTimeout(1200); await page.goBack(); await waitReady('world'); await page.waitForTimeout(1500);
        await page.goBack(); await waitReady('home'); await page.waitForTimeout(1500);
      }
    }

    if (scenario === 'number') {
      const waitDrawer = () => page.waitForFunction(() => { const d = document.querySelector('.sod29-number-drawer2029:not(.sod29-number-drawer-empty)'); return !!d && !/מחבר את ליבת המספר/.test(d.innerText) && d.innerText.length > 250; }, null, { timeout: 60000, polling: 'raf' });
      await page.goto(`${origin}/post/bennett-melach-631-78`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => (document.querySelector('[data-experience-capability="post-master-reading-stage"]')?.innerText.length || 0) > 800, null, { timeout: 60000 });
      await page.waitForTimeout(2500);
      for (const pass of ['first', 'again']) {
        const loc = page.locator('button.sod29-gematria-value.sod29-gematria-hero').first();
        for (let k = 0; k < 40; k++) { const box = await loc.boundingBox(); if (box && box.y > 80 && box.y + box.height < 760) break; await page.mouse.wheel(0, box && box.y < 80 ? -500 : 500); await page.waitForTimeout(250); }
        const box = await loc.boundingBox();
        const b0 = await page.evaluate(() => ({ lt: window.__p.longtasks.length, cls: window.__p.cls })); const r0 = reqs.length;
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await waitDrawer();
        sample[`${pass}_post_to_number_ms`] = await page.evaluate(() => Math.round(performance.now() - window.__p.clickAt));
        await page.waitForTimeout(900);
        const a0 = await page.evaluate(() => ({ lt: window.__p.longtasks.slice(), cls: window.__p.cls }));
        sample[`${pass}_post_to_number_longMs`] = a0.lt.slice(b0.lt).reduce((x, y) => x + y[1], 0);
        sample[`${pass}_post_to_number_reqs`] = reqs.length - r0; sample[`${pass}_post_to_number_reqlist`] = Object.entries(reqs.slice(r0).reduce((o, r) => (o[r] = (o[r] || 0) + 1, o), {})).map(([k, v]) => v + 'x ' + k.slice(0, 90));
        sample[`${pass}_post_to_number_cls`] = +(a0.cls - b0.cls).toFixed(4);
        await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
      }
    }
  } catch (e) { sample.error = String(e).slice(0, 300); }
  sample.errors = errors.slice(0, 3);
  out.samples.push(sample);
  await ctx.close();
}
await browser.close(); srv.close();
const ok = out.samples.filter(s => !s.error);
out.summary = {};
for (const k of Object.keys(ok[0] || {})) if (typeof ok[0][k] === 'number') { const v = ok.map(s => s[k]); out.summary[k] = { median: median(v), min: Math.min(...v), max: Math.max(...v) }; }
fs.writeFileSync(args.out, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary, null, 1)); console.log('errors:', out.samples.filter(s => s.error).map(s => s.error));
