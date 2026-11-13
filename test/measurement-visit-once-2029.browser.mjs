// One first-party visit per real page view (ZURIEL 13.11.2026: "locate the source of the double send ... check direct entry, navigation,
// back and refresh, also on a phone and as a signed-in user"). Real Chromium, the BUILT public-reading artifact, its real service worker
// and the real Supabase client on the production URL mapped to the local fixture (Auth is the in-memory GoTrue model). Nothing leaves
// the machine: every first-party write is answered by the fixture and counted there (what really reaches the Supabase origin), and
// the page-side request is counted separately so a write the worker refuses is visible too.
//   node scripts/build-public-reading-production.mjs && node --test test/measurement-visit-once-2029.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { startFixture, dist } from './helpers/authBrowserFixture.mjs';

const req = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = req(name); break; } catch { /* optional tooling */ } }
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const skip = !(Boolean(pw) && existsSync(join(dist, 'sw.js'))) && 'playwright or the built artifact is unavailable';
const PROFILES = pw ? { desktop: { viewport: { width: 1280, height: 900 } }, phone: { ...pw.devices['Pixel 7'] } } : {};
const MEMBER = 'measured.member@example.invalid';

const ready = page => page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure && document.querySelector('#root')?.children.length, null, { timeout: 40000 });
// The router's own navigation: history.pushState and the popstate notification, exactly what an in-app link does.
const inSite = (page, path) => page.evaluate(p => { history.pushState({}, '', p); dispatchEvent(new PopStateEvent('popstate', { state: {} })); }, path);
async function signInWithCode(page, fixture, email) {
  await page.goto(fixture.origin + '/login', { waitUntil: 'domcontentloaded' }); await ready(page);
  await page.getByRole('textbox', { name: 'כתובת מייל' }).fill(email);
  await page.getByRole('button', { name: 'שלחו לי קוד כניסה' }).click();
  await page.getByRole('textbox', { name: 'קוד כניסה מהמייל' }).waitFor({ timeout: 15000 });
  await page.getByRole('textbox', { name: 'קוד כניסה מהמייל' }).fill(fixture.auth.lastCode(email));
  await page.getByRole('button', { name: /כניסה לחשבון/ }).click();
  await page.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
}

for (const [profile, options] of Object.entries(PROFILES)) for (const identity of ['guest', 'member']) {
  test(`[${profile} · ${identity}] exactly one visit per real page view: direct entry, in-site navigation, back, refresh`, { skip, timeout: 240000 }, async () => {
    const reached = [];   // first-party measurement writes that really reached the Supabase origin (forwarded by the worker)
    const fixture = await startFixture({ supabase: ({ url, method, headers, body }) => {
      if (method !== 'POST' || !['/rest/v1/rpc/track_visit', '/rest/v1/rpc/ingest_event'].includes(url.pathname)) return null;
      let parsed = null; try { parsed = JSON.parse(body.toString('utf8')); } catch { /* counted as unparsed */ }
      reached.push({ rpc: url.pathname.split('/').pop(), body: parsed, authorization: headers.authorization || null });
      return { status: 204, body: '' };
    } });
    const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
    try {
      const member = identity === 'member' ? fixture.auth.newUser(MEMBER, true) : null;
      const context = await browser.newContext({ ...options, ignoreHTTPSErrors: true, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
      // The edge's verdict for a person (vb=browser). Without it a headless browser is classified as a bot by the client heuristic.
      await context.addCookies([{ name: 'vb', value: 'browser', domain: 'sod1820.co.il', path: '/', secure: true }]);
      const page = await context.newPage();
      const asked = [];     // what the page asked for (before the worker's admission)
      page.on('request', request => { const u = new URL(request.url()); if (request.method() === 'POST' && u.pathname === '/rest/v1/rpc/track_visit' && !request.serviceWorker()) asked.push(request.postDataJSON()?.p_path ?? null); });
      if (member) await signInWithCode(page, fixture, MEMBER);
      const visits = () => reached.filter(r => r.rpc === 'track_visit');
      const engagements = () => reached.filter(r => r.rpc === 'ingest_event' && r.body?.p_surface === 'page' && r.body?.p_event_type === 'engagement');
      const steps = [];
      const step = async (name, action, expectedPath) => {
        const before = visits().length, askedBefore = asked.length, engagedBefore = engagements().length;
        await action(); await page.mouse.move(120, 200).catch(() => {}); await page.waitForTimeout(3500);
        const added = visits().slice(before);
        steps.push({ name, expectedPath, asked: asked.slice(askedBefore), reached: added.map(v => v.body?.p_path), engagement: engagements().length - engagedBefore });
      };
      reached.length = 0; asked.length = 0;
      await step('direct entry', async () => { await page.goto(fixture.origin + '/world', { waitUntil: 'domcontentloaded' }); await ready(page); }, '/world');
      await step('in-site navigation to another page family', () => inSite(page, '/post'), '/post');
      await step('in-site navigation to a post', () => inSite(page, '/post/measurement-fixture-a'), '/post/:item');
      await step('in-site navigation to another post', () => inSite(page, '/post/measurement-fixture-b'), '/post/:item');
      await step('back', () => page.goBack({ waitUntil: 'commit' }).catch(() => {}), '/post/:item');
      await step('refresh', async () => { await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page); }, '/post/:item');
      const report = JSON.stringify(steps, null, 1);
      for (const s of steps) {
        assert.deepEqual(s.reached, [s.expectedPath], `${s.name}: exactly one visit reaches the database\n${report}`);
        assert.deepEqual(s.asked, [s.expectedPath], `${s.name}: the page asks exactly once\n${report}`);
      }
      // Page engagement is one flush per finished page view (route change or page hide), never an extra zero-length one.
      assert.ok(steps.every(s => s.engagement <= 1), 'at most one engagement flush per step\n' + report);
      assert.equal(steps[0].engagement, 0, 'a direct entry does not flush an engagement for a page view that never existed\n' + report);
      for (const visit of visits()) {
        assert.equal(visit.body.p_is_bot, false);
        assert.equal(visit.body.p_device, profile === 'phone' ? 'mobile' : 'desktop', 'device class follows the browser profile');
        assert.match(String(visit.body.p_visitor), /^[0-9a-z-]{8,64}$/i, 'the first-party browser id is sent');
      }
      assert.equal(new Set(visits().map(v => v.body.p_visitor)).size, 1, 'one browser id across navigation, back and refresh');
    } finally { await browser.close(); await fixture.close(); }
  });
}
