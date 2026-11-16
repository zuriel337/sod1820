// Article-first experiment probe (scratch tool): loads old posts through the lab server on a phone (Slow 4G, 4x CPU) or desktop and reports
// layout-shift sources, the adoption result, article/title counts, and the reader checks (scroll before adoption, anchor link, internal
// navigation and back). Usage: node afprobe.mjs <cfg.json> <check> [postKey]   check = shifts | reader
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const [cfgPath, check = 'shifts', only] = process.argv.slice(2);
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
const { startLabServer } = await import('./labserver2.mjs');
const anon = /SUPABASE_ANON\s*=\s*'([^']+)'/.exec(readFileSync(cfg.fixture.root + '/src/lib/supabase.js', 'utf8'))[1];
const d = cfg.fixture.docDelayMs || {};
const lab = await startLabServer({ root: cfg.fixture.root, cacheDir: cfg.fixture.cacheDir, readRpc: cfg.readRpc || [], anon, supabaseExtraMs: cfg.fixture.supabaseExtraMs ?? 120,
  docDelayFor: p => p === '/' ? (d.home ?? 500) : p.startsWith('/post/') ? (d.new ?? 600) : (d.old ?? 1000), record: cfg.fixture.record !== false,
  injectBody: cfg.fixture.injectBodyFile ? JSON.parse(readFileSync(cfg.fixture.injectBodyFile, 'utf8')) : {} });
const browser = await chromium.launch({ args: lab.chromiumArgs, env: lab.browserEnv });
const MOBILE = { cpu: 4, latency: 150, down: 1.6e6 / 8, up: 750e3 / 8 }, DESKTOP = { cpu: 1, latency: 40, down: 10e6 / 8, up: 5e6 / 8 };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function page() {
  const base = cfg.device === 'mobile' ? devices['Pixel 7'] : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 };
  const context = await browser.newContext({ ...base, locale: 'he-IL', ignoreHTTPSErrors: true, serviceWorkers: 'allow' });
  await context.addInitScript(() => {
    window.__shifts = [];
    const describe = n => !n ? null : n.nodeType === 1 ? n.tagName + (n.id ? '#' + n.id : '') + (typeof n.className === 'string' && n.className ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : '') : '#' + n.nodeName;
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__shifts.push({ t: Math.round(e.startTime), v: Math.round(e.value * 10000) / 10000,
      src: (e.sources || []).map(s => ({ n: describe(s.node), dy: Math.round(s.currentRect.y - s.previousRect.y), h0: Math.round(s.previousRect.height), h1: Math.round(s.currentRect.height) })) }); })).observe({ type: 'layout-shift', buffered: true });
  });
  const p = await context.newPage();
  const cdp = await context.newCDPSession(p); const prof = cfg.device === 'mobile' ? MOBILE : DESKTOP;
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: prof.latency, downloadThroughput: prof.down, uploadThroughput: prof.up });
  if (prof.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu });
  const errors = []; p.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
  return { context, p, errors };
}
const state = p => p.evaluate(() => ({
  adoption: window.__sodSsrAdoption || null,
  documentArticleLeft: !!document.getElementById('sod29-ssr-article'),
  ssrResult: document.getElementById('sod29-ssr-article')?.dataset.ssrResult || null,
  adoptedAttr: document.querySelector('.sod29-reading-source[data-ssr-adopted]') ? 'true' : null,
  articles: document.querySelectorAll('article').length, h1: document.querySelectorAll('h1').length,
  sources: document.querySelectorAll('.sod29-reading-source').length,
  scrollY: Math.round(scrollY), url: location.pathname + location.hash,
  shifts: window.__shifts,
}));
const waitAdopted = p => p.waitForFunction(() => window.__sodSsrAdoption || document.querySelector('.sod29-reading-source[data-public-post-id]')?.childNodes.length, null, { timeout: 60000 });

const posts = cfg.posts.filter(x => !only || x.key === only);
const report = [];
for (const post of posts) {
  if (check === 'shifts') {
    const { context, p, errors } = await page();
    await p.goto(lab.origin + post.path, { waitUntil: 'domcontentloaded' });
    await waitAdopted(p); await sleep(4000);
    report.push({ post: post.key, ...(await state(p)), errors });
    await context.close();
  } else {
    // 1. scroll during the first-document phase, then adoption must keep the paragraph the reader is on where it is
    const { context, p, errors } = await page();
    await p.goto(lab.origin + post.path, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('#sod29-ssr-article .sod29-ssr-source') || document.querySelector('.sod29-reading-source[data-public-post-id]')?.childNodes.length, null, { timeout: 60000 }).catch(() => {});
    const pre = await p.evaluate(() => {
      const source = document.querySelector('#sod29-ssr-article .sod29-ssr-source') || document.querySelector('.sod29-reading-source[data-public-post-id]'); if (!source) return null;
      const target = [...source.querySelectorAll('p,h3,h5,figure')].find(el => el.getBoundingClientRect().height > 10 && el.textContent.trim().length > 20) || source.firstElementChild;
      window.__probeAnchor = target; scrollBy(0, target.getBoundingClientRect().top - 200);
      return { top: Math.round(target.getBoundingClientRect().top), scrollY: Math.round(scrollY) };
    });
    await waitAdopted(p); await sleep(1500);
    const post1 = await p.evaluate(() => { const el = window.__probeAnchor; return el ? { top: Math.round(el.getBoundingClientRect().top), connected: el.isConnected, inPageSource: !!el.closest('.sod29-reading-source[data-public-post-id]') } : null; });
    const s1 = await state(p);
    // 2. internal navigation (an in-app link) and back: the article renders once, from the page, no document article
    const internal = await p.evaluate(() => { const a = [...document.querySelectorAll('a[href^="/"]')].find(x => /^\/(post\/|world|2029\/posts|$)/.test(x.getAttribute('href')) && x.offsetParent); return a ? a.getAttribute('href') : null; });
    let nav = null;
    if (internal) {
      await p.evaluate(h => { const a = [...document.querySelectorAll('a[href^="/"]')].find(x => x.getAttribute('href') === h && x.offsetParent); a.click(); }, internal);
      await sleep(4000);
      const away = await p.evaluate(() => location.pathname);
      await p.goBack(); await sleep(6000);
      nav = { internal, away, back: await state(p) };
    }
    await context.close();
    // 3. direct link with an anchor inside the article (when the article has one)
    let anchor = null;
    const name = (readFileSync(cfg.fixture.injectBodyFile || '/tmp/claude-0/-home-user-sod1820/c9b833e8-a63a-5dad-96a0-96133df72f23/scratchpad/afssr/inject-body.json', 'utf8').match(/<a name=\\?"([^"\\]+)\\?"/) || [])[1];
    if (name && post.key === 'O3') {
      const t = await page();
      await t.p.goto(lab.origin + post.path + '#' + name, { waitUntil: 'domcontentloaded' });
      await t.p.waitForFunction(n => document.getElementsByName(n).length, name, { timeout: 30000 }).catch(() => {});
      await sleep(300);
      const before = await t.p.evaluate(n => { const a = document.getElementsByName(n)[0]; return a ? Math.round(a.getBoundingClientRect().top) : null; }, name);
      await waitAdopted(t.p); await sleep(2500);
      const after = await t.p.evaluate(n => { const a = document.getElementsByName(n); return { count: a.length, top: a[0] ? Math.round(a[0].getBoundingClientRect().top) : null }; }, name);
      anchor = { name, before, after, state: await state(t.p), errors: t.errors };
      await t.context.close();
    }
    report.push({ post: post.key, scrollBeforeAdoption: { pre, post: post1 }, afterAdoption: s1, nav, anchor, errors });
  }
}
console.log(JSON.stringify(report, null, 1));
await browser.close(); await lab.close?.();
process.exit(0);
