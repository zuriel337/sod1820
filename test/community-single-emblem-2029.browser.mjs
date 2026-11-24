// The community chat draws its own approved large emblem; the shared symbol-only frame intro must not add a second one.
// Runs against the compiled public-reading artifact through the local fixture; no live reads or writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;

for (const width of [390, 1440]) test(`community chat ${width}: exactly one visible emblem, centered on desktop`, { timeout: 60000 }, async () => {
  const fixture = await startFixture({ deploymentCsp: true, supabase: null });
  const browser = await chromium.launch({ headless: true, executablePath, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width, height: 900 }, locale: 'he-IL', reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(fixture.origin + '/community/chat');
    await page.locator('.sod29-community-intro-emblem').waitFor();
    const m = await page.evaluate(() => {
      const visible = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const emblems = [...document.querySelectorAll('.sod29-hero-symbol, .sod29-community-intro-emblem')].filter(visible);
      const r = emblems[0]?.getBoundingClientRect();
      return { count: emblems.length, own: emblems[0]?.classList.contains('sod29-community-intro-emblem'), dx: r ? (r.left + r.right) / 2 - innerWidth / 2 : null,
        shared: document.querySelectorAll('[data-intro-symbol-only]').length };
    });
    assert.equal(m.count, 1, `one visible emblem, saw ${m.count}`);
    assert.equal(m.own, true, 'the visible emblem is the community page emblem');
    assert.equal(m.shared, 0, 'no shared symbol-only intro on the community chat');
    if (width >= 1024) assert.ok(Math.abs(m.dx) <= 1, `emblem centered on the window (dx ${m.dx})`);
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
});

// ZURIEL 24.11.2026: the home page has no shared medallion, and a page that shows one names itself right under it.
test('home has no shared medallion; the professional calculator names itself centered under its medallion', { timeout: 60000 }, async () => {
  const fixture = await startFixture({ deploymentCsp: true, supabase: null });
  const browser = await chromium.launch({ headless: true, executablePath, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, locale: 'he-IL', reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(fixture.origin + '/');
    await page.locator('.sod29-content').waitFor();
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('[data-intro-symbol-only]').count(), 0, 'no shared medallion on home');
    await page.goto(fixture.origin + '/gematria');
    await page.locator('[data-intro-symbol-only] .r29-medal').waitFor();
    await page.locator('.sod29-content h1').waitFor();
    const m = await page.evaluate(() => {
      const medal = document.querySelector('[data-intro-symbol-only] .r29-medal').getBoundingClientRect();
      const h1 = document.querySelector('.sod29-content h1'), range = document.createRange();
      range.selectNodeContents(h1); const text = range.getBoundingClientRect();
      return { gap: text.top - medal.bottom, dx: (text.left + text.right) / 2 - (medal.left + medal.right) / 2 };
    });
    assert.ok(m.gap >= 0 && m.gap <= 80, `the page name sits right under the medallion (gap ${m.gap})`);
    assert.ok(Math.abs(m.dx) <= 2, `the page name is centered under the medallion (dx ${m.dx})`);
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
});
