// Built public artifact + its real worker; every host resolves to a local fixture. No request leaves the machine.
// The community calculator ("מחשבון הקהילה", /community/calculator) is a destination of the global menu: a visitor finds it beside the professional
// calculator, on a phone (menu drawer) and on a desktop (side rail), opens it, and gets a calculator that computes. Before 16.11.2026 the page,
// route, sitemap entry and canonical all existed but no menu or page led to it, so it looked gone.
// VITE_GA_ID=G-TEST node scripts/build-public-reading-production.mjs
// CHROMIUM_PATH=/usr/bin/chromium node --test test/community-calculator-menu-entry-20261116.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';

const require = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'Install the pinned browser tooling; this acceptance test must not skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;

const CALCULATOR = 'a[href="/community/calculator"]';

/** The first element of the selector a visitor can actually see (the menu keeps one copy per surface). */
async function firstVisible(page, selector, timeout = 15000) {
  const all = page.locator(selector);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const count = await all.count();
    for (let index = 0; index < count; index++) if (await all.nth(index).isVisible()) return all.nth(index);
    await page.waitForTimeout(150);
  }
  return null;
}

for (const [width, height, surface] of [[390, 844, 'phone menu'], [1280, 900, 'desktop side rail'], [1280, 700, 'short desktop side rail']]) {
  test(`[${width}x${height}] the community calculator is in the ${surface}, opens, and calculates`, { timeout: 90000 }, async () => {
    const fixture = await startFixture();
    const browser = await pw.chromium.launch({ executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
    try {
      const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width, height }, locale: 'he-IL', serviceWorkers: 'allow' });
      await context.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
      const page = await context.newPage();
      await page.goto(fixture.origin + '/', { waitUntil: 'domcontentloaded' });

      // A phone keeps the destinations in the menu drawer; the desktop shows them in the side rail without opening anything.
      let entry = width < 700 ? null : await firstVisible(page, CALCULATOR);
      if (!entry) {
        await page.locator('button[aria-label="פתח ניווט"]').first().click({ timeout: 30000 });
        entry = await firstVisible(page, CALCULATOR);
      }
      assert.ok(entry, `the community calculator is listed in the ${surface}`);

      // Beside the professional calculator, not in place of it: in the same menu group the item before it is the professional calculator.
      const before = entry.locator('xpath=preceding-sibling::*[1]');
      assert.equal(await before.getAttribute('href'), '/gematria', 'the item before it is the professional calculator');

      // Reachable. The desktop rail is a fixed-height capsule whose list scrolls on its own (as it already does for the later items on any
      // window shorter than the list), so the entry must be inside that list's visible area once scrolled to; a phone drawer scrolls the same way.
      await entry.scrollIntoViewIfNeeded();
      const box = await entry.boundingBox();
      assert.ok(box, 'the entry has a position');
      const list = await entry.evaluate(element => { const area = element.closest('.sod29-nav, [role="dialog"], nav')?.getBoundingClientRect(); return area && { top: area.top, bottom: area.bottom }; });
      assert.ok(list, 'the entry sits inside a menu area');
      assert.ok(box.y >= list.top - 1 && box.y + box.height <= list.bottom + 1, `the entry is inside the menu's visible area once scrolled to (entry ${Math.round(box.y)}-${Math.round(box.y + box.height)}, menu ${Math.round(list.top)}-${Math.round(list.bottom)})`);
      assert.ok(box.y >= 0 && box.y + box.height <= height, `and inside the ${height}px window`);

      const label = (await entry.getAttribute('aria-label')) || (await entry.innerText()) || (await entry.getAttribute('title')) || '';
      assert.match(label, /מחשבון הקהילה/, 'its name is announced');

      await entry.click();
      await page.waitForURL('**/community/calculator', { timeout: 30000 });
      await page.getByRole('heading', { name: 'מה מתחבר לשם שלכם?' }).waitFor({ timeout: 30000 });

      // The page behind the entry really calculates: the word אמת is 441 in the standard method.
      await page.locator('input').first().fill('אמת');
      await page.locator('main').getByText('441').first().waitFor({ timeout: 30000 });
    } finally { await browser.close(); await fixture.close(); }
  });
}
