// The personal panel ("האזור האישי שלי") loads its own code when it opens (shell budget, 16.11.2026). This proves, in a real Chromium with the
// BUILT public-reading artifact and its real service worker (all hosts mapped to the local fixture, nothing leaves the machine):
//  1. the panel's code is not downloaded with the page; opening downloads it once and shows a live loading state until it arrives;
//  2. a failed download of that code is recovered by the application's existing chunk recovery: one automatic reload, same address,
//     and the panel opens afterwards;
//  3. a second failure in the same build never leaves a blank page: the existing recovery screen offers a reload, and a reload recovers.
// Run `node scripts/build-public-reading-production.mjs` first.   node --test test/personal-panel-lazy-recovery-2029.browser.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { startFixture, dist } from "./helpers/authBrowserFixture.mjs";

const require = createRequire(import.meta.url);
let pw; for (const name of ["playwright", "@playwright/test"]) { try { pw = require(name); break; } catch { /* optional tooling */ } }
assert.ok(pw, "the personal panel acceptance requires the pinned browser; never skip.");
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const manifest = JSON.parse(readFileSync(join(dist, ".vite/manifest.json"), "utf8"));
const PANEL_CHUNK = "/" + manifest["src/components/experience2029/WorkspaceProjection2029.jsx"].file;
const PROFILES = { mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, desktop: { viewport: { width: 1280, height: 900 } } };

const ready = page => page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure && document.querySelector(".sod29-root"), null, { timeout: 40000 });
const opener = page => page.locator(".sod29-header-workspace:visible").first();
const panelRequests = fixture => fixture.state.assets.filter(entry => entry.path === PANEL_CHUNK);
const sleep = ms => new Promise(done => setTimeout(done, ms));

async function withPage(profile, assetAnswer, run) {
  const fixture = await startFixture({ asset: ({ path }) => path === PANEL_CHUNK ? assetAnswer() : null });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ...PROFILES[profile], ignoreHTTPSErrors: true, locale: "he-IL", serviceWorkers: "allow" });
    const page = await context.newPage();
    const errors = []; page.on("pageerror", error => errors.push(String(error.message)));
    await page.goto(fixture.origin + "/", { waitUntil: "domcontentloaded" }); await ready(page); await page.waitForTimeout(1200);
    await run({ page, fixture, errors });
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
}

for (const profile of Object.keys(PROFILES)) {
  test(`[${profile}] the panel's code arrives only when the panel opens, with a live loading state, once`, { timeout: 120000 }, async () => {
    let release; const arrived = new Promise(done => { release = done; });
    await withPage(profile, async () => { await arrived; return null; }, async ({ page, fixture, errors }) => {
      assert.equal(panelRequests(fixture).length, 0, "the page itself does not download the personal panel");
      await opener(page).click();
      const panel = page.locator('[data-panel-kind="workspace"]');
      await panel.waitFor({ timeout: 15000 });
      // While the code is on its way the panel shows the live state (Operation Visibility Law), not an empty box.
      const loading = panel.locator('[role="status"][data-progress-kind]');
      await loading.waitFor({ timeout: 15000 });
      assert.match(await loading.innerText(), /פותח את האזור האישי/);
      assert.equal(panelRequests(fixture).length, 1, "opening asked for the panel's code once");
      release();
      await panel.locator('[data-personal-area="2029"]').waitFor({ timeout: 20000 });
      assert.equal(await panel.locator('[data-personal-area="2029"]').getAttribute("data-signed-in"), "false");
      assert.ok(await panel.locator('input[type="email"]').count() > 0, "the guest panel carries its sign-in form");
      // close and open again: the code is already here
      await page.keyboard.press("Escape"); await panel.waitFor({ state: "detached", timeout: 10000 });
      await opener(page).click(); await panel.locator('[data-personal-area="2029"]').waitFor({ timeout: 15000 });
      assert.equal(panelRequests(fixture).length, 1, "a second opening does not download it again");
      assert.deepEqual(errors, []);
    });
  });
}

test("[mobile] one failed download: one automatic reload of the same address, then the panel opens", { timeout: 150000 }, async () => {
  let failures = 1;
  await withPage("mobile", () => failures-- > 0 ? { status: 503, body: "synthetic chunk outage" } : null, async ({ page, fixture }) => {
    const documentsBefore = fixture.state.documents;
    const reloaded = page.waitForEvent("load", { timeout: 30000 });
    await opener(page).click();
    await reloaded;
    assert.equal(new URL(page.url()).pathname, "/", "the reload keeps the address the person was on");
    assert.equal(fixture.state.documents, documentsBefore + 1, "exactly one automatic reload");
    await ready(page); await page.waitForTimeout(1000);
    assert.equal(await page.locator("[data-sod-boundary]").count(), 0, "after the reload the page is the page, not a recovery screen");
    await opener(page).click();
    await page.locator('[data-panel-kind="workspace"] [data-personal-area="2029"]').waitFor({ timeout: 20000 });
    assert.deepEqual(panelRequests(fixture).map(entry => entry.status), [503, 200], "failed once, loaded after the reload");
    await sleep(1500);
    assert.equal(fixture.state.documents, documentsBefore + 1, "no reload loop");
  });
});

test("[mobile] a second failure in the same build: the recovery screen, never a blank page; the person's reload recovers", { timeout: 180000 }, async () => {
  let failures = 2;
  await withPage("mobile", () => failures-- > 0 ? { status: 503, body: "synthetic chunk outage" } : null, async ({ page, fixture }) => {
    const documentsBefore = fixture.state.documents;
    const reloaded = page.waitForEvent("load", { timeout: 30000 });
    await opener(page).click();
    await reloaded; await ready(page); await page.waitForTimeout(1000);
    // the single automatic reload of this build is spent; the next failure must surface
    await opener(page).click();
    const screen = page.locator('[data-sod-boundary="exhausted"]');
    await screen.waitFor({ timeout: 20000 });
    assert.match(await screen.innerText(), /הדף לא נטען/);
    assert.equal(await screen.getByRole("button", { name: "רענון הדף" }).count(), 1);
    assert.equal(await screen.getByRole("link", { name: "לעמוד הבית" }).count(), 1);
    await sleep(1500);
    assert.equal(fixture.state.documents, documentsBefore + 1, "no second automatic reload in the same build");
    // the network is back; the person presses the reload the screen offers
    const manual = page.waitForEvent("load", { timeout: 30000 });
    await screen.getByRole("button", { name: "רענון הדף" }).click();
    await manual; await ready(page); await page.waitForTimeout(1000);
    await opener(page).click();
    await page.locator('[data-panel-kind="workspace"] [data-personal-area="2029"]').waitFor({ timeout: 20000 });
    assert.deepEqual(panelRequests(fixture).map(entry => entry.status), [503, 503, 200]);
  });
});
