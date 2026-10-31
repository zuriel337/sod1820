// Read-only visual evidence: the real HomeRealityRiver2029 (getRealityHints -> fetchGallerySourceContext)
// rendered in an isolated Vite fixture with the three 2029 presets. Anonymous public reads only; no writes.
// Usage: OUT_DIR=/path node test/reality-river-real-data.browser.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.env.OUT_DIR || '/tmp/reality-river-real';
const widths = (process.env.WIDTHS || '320,390,1440').split(',').map(Number);
const presets = (process.env.PRESETS || 'light,parchment,dark').split(',');
await mkdir(out, { recursive: true });

const fixture = `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
  import HomeRiver from '/src/components/research/RealityRiver2029.jsx';
  createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,null,React.createElement('div',{className:'sod29-root',style:{maxWidth:1240,margin:'0 auto',padding:'0 8px'}},React.createElement(HomeRiver))));`;
const server = await createServer({ configFile: false, root: process.cwd(), logLevel: 'error',
  server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**/preview-deploy/**', '**/dist/**'] } },
  plugins: [react(), {
    name: 'river-real-fixture', configureServer(s) { s.middlewares.use(async (req, res, next) => {
      if (req.url?.split('?')[0] !== '/river-real/') return next();
      res.setHeader('Content-Type', 'text/html');
      res.end(await s.transformIndexHtml(req.url, '<html dir="rtl" lang="he"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@font-face{font-family:\'Noto Sans Hebrew\';src:url(\'/fonts/NotoSansHebrew-Regular.ttf\') format(\'truetype\');font-weight:400}@font-face{font-family:\'Noto Sans Hebrew\';src:url(\'/fonts/NotoSansHebrew-Bold.ttf\') format(\'truetype\');font-weight:700}@font-face{font-family:\'Rubik\';src:url(\'/fonts/Rubik-Hebrew.woff2\') format(\'woff2\');font-weight:400 900;unicode-range:U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}@font-face{font-family:\'Rubik\';src:url(\'/fonts/Rubik-Latin.woff2\') format(\'woff2\');font-weight:400 900;unicode-range:U+0000-00FF,U+0131,U+2000-206F,U+20AC,U+2122,U+2212}body{margin:0}*{box-sizing:border-box}</style><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"><div id="root"></div><script type="module" src="/river-real.jsx"></script></html>'));
    }); },
    resolveId(id) { if (id === '/river-real.jsx') return '\0river-real.jsx'; },
    load(id) { if (id === '\0river-real.jsx') return fixture; },
  }] });
await server.listen();
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined;
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(proxy ? { proxy } : {}) });
// fullPage + clip: an element screenshot of a tall river would temporarily resize the viewport (svh units).
const shoot = async (page, river, path) => {
  const box = await river.boundingBox(), top = await page.evaluate(() => scrollY);
  await page.screenshot({ path, fullPage: true, clip: { x: box.x, y: box.y + top, width: box.width, height: box.height } });
};
const report = { out, widths: [], writes: [], allowedReads: [] };
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'he-IL', reducedMotion: 'reduce' });
    // Evidence only: abort anything that could be a product write.
    await context.route('**/*', route => {
      const req = route.request();
      const url = new URL(req.url());
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method()) && url.hostname !== '127.0.0.1') {
        // Follow-state `_get_` RPCs are POST-shaped reads; they stay blocked here. Anything else is a write.
        if (/\/rpc\/[a-z_]*_get_[a-z0-9_]*$/.test(url.pathname)) { report.allowedReads.push(url.pathname); return route.continue(); }
        report.writes.push(`${req.method()} ${url.pathname}`);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let imageBytes = 0;
    page.on('response', async r => { if (r.request().resourceType() === 'image') imageBytes += Number((await r.allHeaders())['content-length'] || 0); });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/river-real/`, { waitUntil: 'domcontentloaded' });
    const river = page.locator('[data-reality-river]');
    await river.waitFor({ timeout: 45000 });
    await river.locator('[data-river-image]').first().waitFor({ timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2500);
    for (const preset of presets) {
      await page.evaluate(async preset => {
        const { resolve2029Palette } = await import('/src/lib/palette.js'), p = resolve2029Palette(preset);
        const { TYPEFACE } = await import('/src/lib/designTokens.js'), { setThemePreset } = await import('/src/lib/themeMode.js');
        setThemePreset(preset);
        for (const [key, value] of Object.entries(TYPEFACE)) document.body.style.setProperty('--s29-font-' + key, value);
        document.body.style.fontFamily = TYPEFACE.body;
        for (const [key, value] of Object.entries({ page: p.pageBg, panel: p.card, 'panel-soft': p.cardSoft, line: p.border, 'line-strong': p.borderStrong,
          ink: p.ink, muted: p.inkSoft, 'warm-accent': p.warmAccent, 'accent-text': p.accentText, discovery: p.accentDiscovery, 'focus-ring': p.focusRing,
          'brand-gold': p.brandGold, 'brand-sapphire': p.brandSapphire, 'brand-glow': p.brandGlow, hero: p.heroNum, 'accent-secondary': p.accentSecondary, glow: p.glow,
          'on-accent': p.onAccent, 'accent-btn': p.accentBtn, 'panel-grad': p.cardGrad, 'type-micro': '14px', 'type-small': '16px', 'type-ui': '16px', 'type-body': '18px' }))
          document.body.style.setProperty('--s29-' + key, value);
        document.body.style.background = p.pageBg; document.body.dataset.preset = preset;
      }, preset);
      await page.waitForTimeout(150);
      const roles = await page.evaluate(async preset => {
        const { resolve2029Palette, resolveTreatment } = await import('/src/lib/palette.js'), p = resolve2029Palette(preset), want = k => resolveTreatment(p, { purpose: k }).fg;
        const got = sel => document.querySelector(sel)?.style.getPropertyValue('--tr-fg').trim() ?? null;
        return { number: [got('.r29-num'), want('identity')], share: [got('.r29-share'), want('discovery')], action: [got('.r29-river'), want('action')] };
      }, preset);
      for (const [role, [actual, expected]] of Object.entries(roles)) assert.equal(actual, expected, `${preset}/${width}: ${role} role from shared resolver`);
      await shoot(page, river, `${out}/river-${preset}-${width}.png`);
    }
    // Interaction evidence on the real window: keyboard, touch drag, stable geometry.
    const slider = river.getByRole('slider'), win = river.locator('.r29-window');
    const geo = () => river.evaluate(el => ({ river: el.getBoundingClientRect().height, detail: el.querySelector('.r29-detail').getBoundingClientRect().height, width: el.getBoundingClientRect().width }));
    const g0 = await geo();
    await river.scrollIntoViewIfNeeded();
    await slider.focus(); await slider.press('End');
    await page.waitForFunction(() => document.querySelector('.r29-window').scrollTop > 300);
    const atEnd = await win.evaluate(el => el.scrollTop), gEnd = await geo();
    await page.waitForTimeout(900);
    const endState = await page.evaluate(() => ({ knob: document.querySelector('.r29-knob').style.transform, slider: document.querySelector('.r29-rail input').value, scrollTop: document.querySelector('.r29-window').scrollTop, max: document.querySelector('.r29-window').scrollHeight - document.querySelector('.r29-window').clientHeight, pos: document.querySelector('.r29-progress').innerText.replace(/\n/g, ' ') }));
    assert.equal(endState.slider, '100'); assert.equal(Math.round(endState.scrollTop), Math.round(endState.max), 'End reaches the real end of the window');
    await shoot(page, river, `${out}/river-end-${width}.png`);
    await slider.press('Home'); await page.waitForFunction(() => document.querySelector('.r29-window').scrollTop < 20);
    assert.deepEqual(gEnd, g0, 'river/story geometry stable between first and last picture');
    const touch = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: true, isMobile: width < 700, locale: 'he-IL', reducedMotion: 'reduce' });
    const tp = await touch.newPage(); await tp.goto(page.url(), { waitUntil: 'domcontentloaded' });
    await tp.locator('[data-river-image]').first().waitFor({ timeout: 45000 }); await tp.waitForTimeout(1500);
    const rail = tp.locator('.r29-rail'); await rail.scrollIntoViewIfNeeded();
    const box = await rail.boundingBox(), cdp = await touch.newCDPSession(tp), x = box.x + box.width / 2;
    const pt = y => [{ x, y, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(box.y + box.height * .1) });
    for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(box.y + box.height * (.1 + .08 * i)) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await tp.waitForTimeout(400);
    const touchTop = await tp.locator('.r29-window').evaluate(el => el.scrollTop);
    assert.ok(touchTop > 150, 'touch drag on the handle scrolls the window');
    await touch.close();
    report.interaction = report.interaction || []; report.interaction.push({ width, keyboardEndScrollTop: Math.round(atEnd), windowMax: Math.round(await win.evaluate(el => el.scrollHeight - el.clientHeight)), knob: await page.evaluate(() => document.querySelector('.r29-knob').style.transform + ' | slider ' + document.querySelector('.r29-rail input').value + ' | pos ' + document.querySelector('.r29-progress').innerText.replace(/\\n/g, ' ')), touchDragScrollTop: Math.round(touchTop), geometry: g0 });
    const items = await river.locator('[data-river-image]').count();
    report.widths.push({ width, items, imageKB: Math.round(imageBytes / 1024), errors, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
    await context.close();
  }
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  assert.deepEqual(report.writes, []);
} finally { await browser.close(); await server.close(); }
