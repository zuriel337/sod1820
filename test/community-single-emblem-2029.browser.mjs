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
