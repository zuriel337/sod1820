// One first-party visit per real page view (ZURIEL 13.11.2026: "locate the source of the double send ... check direct entry, navigation,
// back and refresh, also on a phone and as a signed-in user"). Real Chromium, the BUILT public-reading artifact, its real service worker
// and the real Supabase client on the production URL mapped to the local fixture (Auth is the in-memory GoTrue model). Nothing leaves
// the machine: every first-party write is answered by the fixture and counted there (what really reaches the Supabase origin), and
// the page-side request is counted separately so a write the worker refuses is visible too.
//   node scripts/build-public-reading-production.mjs && node --test test/measurement-visit-once-2029.browser.mjs
// Steps 7-13 were added by the extraction package (docs/reviews/measurement-20261113): forward, a tab that is hidden and shown again, the
// pagehide/pageshow pair of the back/forward cache, a redirect alias, a route that is not measured, a second tab with the worker already
// active, and a session-wide check that the same route is never written twice within two seconds. The headless fixture cannot exercise a
// real back/forward cache restore (the fixture serves documents with no-store and Playwright disables the cache), so the lifecycle events
// are dispatched; a real restore runs no script, so it cannot write a visit.
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
      reached.push({ rpc: url.pathname.split('/').pop(), body: parsed, authorization: headers.authorization || null, at: Date.now() });
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
      context.on('request', request => { const u = new URL(request.url()); if (request.method() === 'POST' && u.pathname === '/rest/v1/rpc/track_visit' && !request.serviceWorker()) asked.push(request.postDataJSON()?.p_path ?? null); });
      if (member) await signInWithCode(page, fixture, MEMBER);
      const visits = () => reached.filter(r => r.rpc === 'track_visit');
      const engagements = () => reached.filter(r => r.rpc === 'ingest_event' && r.body?.p_surface === 'page' && r.body?.p_event_type === 'engagement');
      const steps = [];
      const step = async (name, action, expectedPath) => {
        const before = visits().length, askedBefore = asked.length, engagedBefore = engagements().length;
        await action(); await page.mouse.move(120, 200).catch(() => {}); await page.waitForTimeout(3500);
        const added = visits().slice(before);
        const expected = Array.isArray(expectedPath) ? expectedPath : expectedPath === null ? [] : [expectedPath];
        steps.push({ name, expectedPath, expected, asked: asked.slice(askedBefore), reached: added.map(v => v.body?.p_path), engagement: engagements().length - engagedBefore });
      };
      reached.length = 0; asked.length = 0;
      await step('direct entry', async () => { await page.goto(fixture.origin + '/world', { waitUntil: 'domcontentloaded' }); await ready(page); }, '/world');
      await step('in-site navigation to another page family', () => inSite(page, '/post'), '/post');
      await step('in-site navigation to a post', () => inSite(page, '/post/measurement-fixture-a'), '/post/:item');
      await step('in-site navigation to another post', () => inSite(page, '/post/measurement-fixture-b'), '/post/:item');
      await step('back', () => page.goBack({ waitUntil: 'commit' }).catch(() => {}), '/post/:item');
      await step('refresh', async () => { await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page); }, '/post/:item');
      // 7. forward: the entry that back left (a full load of that address, the entry belongs to a document that was reloaded since)
      await step('forward', async () => { await page.goForward({ waitUntil: 'commit' }).catch(() => {}); await ready(page); }, '/post/:item');
      // 8. a tab that is hidden and shown again is the same page view: no visit, and the engagement checkpoint stays local
      await step('tab hidden and shown again', () => page.evaluate(() => {
        const set = value => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
        set('hidden'); document.dispatchEvent(new Event('visibilitychange')); set('visible'); document.dispatchEvent(new Event('visibilitychange'));
        delete document.visibilityState;
      }), null);
      // 9. the pagehide/pageshow pair of a back/forward cache restore: the page is frozen and thawed, no script runs again, no visit
      await step('pagehide and pageshow (back/forward cache restore)', () => page.evaluate(() => {
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      }), null);
      // 10. a redirect alias inside the app is entered and replaced at once: only the address that settles is a page view
      // (/books/<slug> is replaced by /book/<slug>. /els -> /code is not used: the fixture serves every unknown path as the app, so the
      // /tzofen.html frame of the code page would load the app again inside itself; production serves that address as a static file.)
      await step('in-app redirect alias (/books/fixture-book -> /book/fixture-book)', () => inSite(page, '/books/fixture-book'), '/book/:item');
      // 11. a route that is not measured writes nothing; leaving it for a measured route writes exactly one visit
      await step('route that is not measured (/login)', () => inSite(page, '/login'), null);
      await step('a measured route after an unmeasured one', () => inSite(page, '/gallery'), '/gallery');
      // 12. the service worker is already active and controls the browser: a second tab is one page view
      // The second tab stays open for the whole observation window of the step: the visit is written ~150 ms plus a lazy chunk after the
      // page is ready, and closing the tab earlier cancels it (a run under load lost the visit that way).
      let secondTab;
      await step('second tab with the worker already active', async () => {
        secondTab = await context.newPage(); await secondTab.goto(fixture.origin + '/map', { waitUntil: 'domcontentloaded' }); await ready(secondTab);
      }, '/map');
      await secondTab.close();
      const report = JSON.stringify(steps, null, 1);
      for (const s of steps) {
        assert.deepEqual(s.reached, s.expected, `${s.name}: exactly the expected visits reach the database\n${report}`);
        // what the page asks is bounded by what the worker admits: never more than expected, so nothing is asked and silently refused
        assert.deepEqual(s.asked, s.expected, `${s.name}: the page asks exactly as often as it is admitted\n${report}`);
      }
      // 13. session-wide: the same route is never written twice within two seconds (the double send was ~100 ms apart)
      const stamped = visits().map(v => ({ path: v.body.p_path, at: v.at }));
      for (let i = 1; i < stamped.length; i++) assert.ok(stamped[i].path !== stamped[i - 1].path || stamped[i].at - stamped[i - 1].at > 2000, `no immediate repeat of ${stamped[i].path}\n${report}`);
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
