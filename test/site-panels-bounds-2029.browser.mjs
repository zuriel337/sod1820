// Regression (ZURIEL 27.11.2026): every panel, menu and disclosure the public site offers opens inside the screen (no horizontal overflow, RTL included),
// scrolls nothing sideways, and closes again. Swept over the main public routes at 320, 390, 1440 and Pixel 7, as a guest, against the built artifact
// through the existing fixture server (no network, nothing written). A panel that leaves the screen, or a page that gains a sideways scroll, fails the test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';

const require = createRequire(import.meta.url);
let pw;
for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'the panel sweep requires the pinned browser; never skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const ROUTES = (process.env.SWEEP_ROUTES || '/,/2029,/community/chat,/els,/gematria,/post,/gallery,/findings,/books,/members,/contact,/login,/code').split(',');
const PROFILES = [['desktop-1440', { viewport: { width: 1440, height: 900 } }], ['width-390', { viewport: { width: 390, height: 844 } }], ['width-320', { viewport: { width: 320, height: 640 } }], ['Pixel 7', 'Pixel 7']];

// What a "panel" is for a trigger: the details body, or the element the trigger controls.
const SWEEP = async (page) => page.evaluate(async () => {
  const vw = document.documentElement.clientWidth, out = [];
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 40);
  const triggers = [...document.querySelectorAll('details:not([open])>summary, button[aria-haspopup]:not([aria-haspopup="false"]), button[aria-expanded="false"][aria-controls]')].filter(visible).slice(0, 40);
  for (const trigger of triggers) {
    const details = trigger.closest('details');
    trigger.scrollIntoView({ block: 'center' });
    trigger.click();
    await new Promise((r) => setTimeout(r, 250));
    let panels = [];
    if (details && details.open) panels = [...details.children].filter((c) => c !== trigger && visible(c));
    else { const id = trigger.getAttribute('aria-controls'); const ctl = id && document.getElementById(id); if (ctl && visible(ctl)) panels = [ctl]; }
    const dialog = document.querySelector('[role="dialog"][aria-modal="true"], [role="menu"]'); if (dialog && visible(dialog)) panels.push(dialog);
    for (const panel of panels) {
      const r = panel.getBoundingClientRect();
      const inside = r.left >= -1 && r.right <= vw + 1;
      // the panel's own corners must be what the user hits there (not clipped by an ancestor's overflow)
      const floating = ['absolute', 'fixed'].includes(getComputedStyle(panel).position); // an in-flow disclosure is only measured against the screen edges
      const hit = !floating || [[r.left + 14, r.top + 14], [r.right - 14, r.top + 14]].filter(([x, y]) => x >= 0 && x <= vw && y >= 0 && y <= innerHeight).every(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (panel.contains(e) || e.contains(panel)); });
      out.push({ trigger: label(trigger), inside, hit, rect: [Math.round(r.left), Math.round(r.right), vw] });
    }
    const sideways = document.documentElement.scrollWidth > vw + 1;
    if (sideways) out.push({ trigger: label(trigger), sideways: true });
    // close again: the disclosure itself, a pressed Escape or the same trigger
    if (details && details.open) details.open = false; else { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise((r) => setTimeout(r, 120)); if (document.contains(trigger) && trigger.getAttribute('aria-expanded') === 'true') trigger.click(); }
    await new Promise((r) => setTimeout(r, 120));
  }
  return { count: triggers.length, out };
});

for (const profile of PROFILES) {
  for (const route of ROUTES) {
    test(`${profile[0]} ${route}: every panel, menu and disclosure opens inside the screen and closes`, { timeout: 180000 }, async () => {
      const fixture = await startFixture({ supabase: async ({ url }) => (url.pathname.startsWith('/rest/v1/rpc/') ? { body: [] } : url.pathname.startsWith('/rest/v1/') ? { body: [] } : null) });
      const options = profile[1] === 'Pixel 7' ? { ...pw.devices['Pixel 7'] } : profile[1];
      const browser = await pw.chromium.launch({ executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
      try {
        const context = await browser.newContext({ ignoreHTTPSErrors: true, ...options, locale: 'he-IL', serviceWorkers: 'allow' });
        const page = await context.newPage();
        const errors = []; page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(fixture.origin + route, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2500);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'no horizontal page scroll on arrival');
        const { count, out } = await SWEEP(page);
        console.log('SWEPT', profile[0], route, count, 'triggers,', out.length, 'panels');
        const bad = out.filter((x) => x.sideways || !x.inside || !x.hit);
        assert.deepEqual(bad, [], `${count} triggers swept; these panels leave the screen, are clipped, or add a sideways scroll`);
        assert.deepEqual(errors, []);
      } finally { await browser.close(); await fixture.close(); }
    });
  }
}
