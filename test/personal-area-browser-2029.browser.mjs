// Browser acceptance for "האזור האישי שלי": a real Chromium, the BUILT public-reading artifact, the real service worker and the real Supabase client,
// on the production URL mapped to a local fixture (Auth answered by an in-memory GoTrue model; no request leaves the machine).
// Run `node scripts/build-public-reading-production.mjs` first.   node --test test/personal-area-browser-2029.browser.mjs
// Covers: guest and signed-in panels, no horizontal overflow, card destinations, closed cards with reasons, keyboard open/close/return,
// refresh, sign-out, account switch (the other account's data never shows), and the password screens' save button against the bottom bar.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { startFixture, dist } from "./helpers/authBrowserFixture.mjs";

const req = createRequire(import.meta.url);
let pw; for (const name of ["playwright", "@playwright/test"]) { try { pw = req(name); break; } catch { /* optional tooling */ } }
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const canRun = Boolean(pw) && existsSync(join(dist, "sw.js"));
const PROFILES = { desktop: { viewport: { width: 1280, height: 900 } }, mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };
const A = "first.person@example.invalid", B = "second.person@example.invalid";

const ready = page => page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure && document.querySelector(".sod29-root,[data-auth-state]"), null, { timeout: 40000 });
const opener = page => page.locator(".sod29-header-workspace:visible").first();
async function openPanel(page) { await opener(page).click(); await page.locator('[data-panel-kind="workspace"]').waitFor({ timeout: 30000 }); await page.waitForTimeout(800); }
const panelText = page => page.locator('[data-panel-kind="workspace"]').innerText();
async function signInWithCode(page, fixture, email) {
  await page.goto(fixture.origin + "/login", { waitUntil: "domcontentloaded" }); await ready(page);
  await page.getByRole("textbox", { name: "כתובת מייל" }).fill(email);
  await page.getByRole("button", { name: "שלחו לי קוד כניסה" }).click();
  await page.getByRole("textbox", { name: "קוד כניסה מהמייל" }).waitFor({ timeout: 15000 });
  await page.getByRole("textbox", { name: "קוד כניסה מהמייל" }).fill(fixture.auth.lastCode(email));
  await page.getByRole("button", { name: /כניסה לחשבון/ }).click();
  await page.waitForFunction(() => Object.keys(localStorage).some(k => /auth-token$/.test(k)), null, { timeout: 20000 });
}
const overflow = page => page.evaluate(() => { const p = document.querySelector('[data-panel-kind="workspace"]'); const body = p.querySelector(".pa29") || p; return { panel: p.scrollWidth - p.clientWidth, body: body.scrollWidth - body.clientWidth, docX: document.documentElement.scrollWidth - innerWidth }; });

for (const [name, options] of Object.entries(PROFILES)) {
  test(`[${name}] personal area: guest, sign-in, destinations, keyboard, refresh, sign-out and account switch`, { skip: !canRun && "playwright or the built artifact is unavailable", timeout: 240000 }, async () => {
    const fixture = await startFixture();
    const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
    try {
      fixture.auth.newUser(A, true); fixture.auth.newUser(B, true);
      const context = await browser.newContext({ ...options, ignoreHTTPSErrors: true, locale: "he-IL" });
      const page = await context.newPage(); const errors = [];
      page.on("pageerror", error => errors.push(String(error.message)));
      // 1. guest
      await page.goto(fixture.origin + "/", { waitUntil: "domcontentloaded" }); await ready(page); await page.waitForTimeout(1500);
      await openPanel(page);
      assert.equal(await page.locator('[data-personal-area="2029"]').getAttribute("data-signed-in"), "false");
      assert.ok(await page.locator('[data-panel-kind="workspace"] input[type="email"]').count() > 0, "the guest panel carries the sign-in form on top");
      assert.match(await panelText(page), /אורח/); assert.doesNotMatch(await panelText(page), /example\.invalid/);
      const guestOverflow = await overflow(page); assert.ok(guestOverflow.panel <= 1 && guestOverflow.body <= 1 && guestOverflow.docX <= 1, "guest panel: no horizontal overflow " + JSON.stringify(guestOverflow));
      // the build notice says the area is under construction and the fault link opens the existing issue report; the provider buttons carry their real marks
      assert.match(await page.locator("[data-pa29-build]").innerText(), /האזור האישי בבנייה/);
      for (const provider of ["google", "facebook"]) {
        const button = page.locator(`[data-auth-provider="${provider}"]`);
        if (await button.count()) { assert.equal(await button.locator(`svg[data-provider-mark="${provider}"]`).count(), 1, provider + " mark"); assert.match(await button.getAttribute("aria-label") || await button.innerText() || "", /./); }
      }
      await page.locator("[data-pa29-report]").click();
      await page.getByRole("dialog").getByText(/דווחו על בעיה/).first().waitFor({ timeout: 15000 });
      await page.keyboard.press("Escape");
      await openPanel(page);
      await page.keyboard.press("Escape");
      // 2. sign in, the signed-in panel
      await signInWithCode(page, fixture, A);
      await page.goto(fixture.origin + "/", { waitUntil: "domcontentloaded" }); await ready(page); await page.waitForTimeout(1500);
      await openPanel(page);
      assert.equal(await page.locator('[data-personal-area="2029"]').getAttribute("data-signed-in"), "true");
      assert.match(await panelText(page), new RegExp(A.replace(/\./g, "\\.")));
      for (const id of ["profile", "public-page", "page-editor", "notes", "progress", "research", "codes", "life-journey", "hints", "raziel", "messages", "replies", "follow", "contributions", "credits", "access"])
        assert.equal(await page.locator(`[data-workspace-card="${id}"]`).count(), 1, "card " + id);
      for (const id of ["credits", "access"]) {
        const card = page.locator(`[data-workspace-card="${id}"]`);
        assert.equal(await card.getAttribute("aria-disabled"), "true", id + " is closed");
        assert.ok(((await card.getAttribute("title")) || "").length > 10, id + " carries its real reason");
        assert.equal(await card.evaluate(element => element.tagName), "DIV", id + " is a status, not a button");
      }
      const memberOverflow = await overflow(page); assert.ok(memberOverflow.panel <= 1 && memberOverflow.body <= 1 && memberOverflow.docX <= 1, "signed-in panel: no horizontal overflow " + JSON.stringify(memberOverflow));
      for (const card of await page.locator('[data-panel-kind="workspace"] [data-workspace-card]').all()) { const box = await card.boundingBox(); assert.ok(box && box.height >= 44 && box.width >= 44, "every card is a comfortable target"); }
      // 3. destinations (module cards) and the exact return
      for (const [id, pattern] of [["profile", /\/2029\/me\/profile/], ["messages", /\/2029\/me\/messages(?!.*tab=replies)/], ["replies", /\/2029\/me\/messages.*tab=replies/], ["notes", /\/2029\/me\/notes/]]) {
        await page.goto(fixture.origin + "/", { waitUntil: "domcontentloaded" }); await ready(page); await page.waitForTimeout(1200); await openPanel(page);
        await page.locator(`[data-workspace-card="${id}"]`).click(); await page.waitForURL(url => pattern.test(url.pathname + url.search), { timeout: 20000 });
      }
      // 4. keyboard: Enter opens and focus moves inside; Escape closes and focus returns to the opener
      await page.goto(fixture.origin + "/", { waitUntil: "domcontentloaded" }); await ready(page); await page.waitForTimeout(1200);
      await opener(page).focus(); await page.keyboard.press("Enter"); await page.locator('[data-panel-kind="workspace"]').waitFor();
      assert.equal(await page.evaluate(() => Boolean(document.activeElement?.closest('[data-panel-kind="workspace"]'))), true, "focus moves into the panel");
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      assert.equal(await page.locator('[data-panel-kind="workspace"]').count(), 0);
      assert.equal(await page.evaluate(() => /sod29-(header|sidebar)-workspace/.test(String(document.activeElement?.className))), true, "focus returns to the opener");
      // 5. refresh keeps the account
      await page.reload({ waitUntil: "domcontentloaded" }); await ready(page); await page.waitForTimeout(1500); await openPanel(page);
      assert.match(await panelText(page), new RegExp(A.replace(/\./g, "\\.")), "after a refresh the same account");
      // 6. sign out
      await page.locator('[data-panel-kind="workspace"]').getByRole("button", { name: "התנתקות" }).click(); await page.waitForTimeout(1500);
      assert.equal(await page.evaluate(() => Object.keys(localStorage).some(k => /auth-token$/.test(k))), false, "the session is gone");
      if (!(await page.locator('[data-panel-kind="workspace"]').count())) await openPanel(page);
      assert.doesNotMatch(await panelText(page), /example\.invalid/); assert.equal(await page.locator('[data-personal-area="2029"]').getAttribute("data-signed-in"), "false");
      // 7. account switch: the other account, and none of the first one's data
      await page.keyboard.press("Escape"); await signInWithCode(page, fixture, B);
      await page.goto(fixture.origin + "/", { waitUntil: "domcontentloaded" }); await ready(page); await page.waitForTimeout(1500); await openPanel(page);
      const switched = await panelText(page);
      assert.match(switched, new RegExp(B.replace(/\./g, "\\.")));
      assert.doesNotMatch(switched, new RegExp(A.replace(/\./g, "\\.")), "the first account's address is nowhere in the second account's panel");
      assert.doesNotMatch(await page.locator("body").innerText(), new RegExp(A.replace(/\./g, "\\.")));
      assert.deepEqual(errors, [], "no page errors");
      await context.close();
    } finally { await browser.close(); await fixture.close(); }
  });
}

test("password screens (when present): the save button is never behind the bottom bar, and the bar steps aside for the keyboard", { skip: !canRun && "playwright or the built artifact is unavailable", timeout: 180000 }, async () => {
  const fixture = await startFixture();
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    fixture.auth.newUser(A, true);
    const context = await browser.newContext({ ...PROFILES.mobile, ignoreHTTPSErrors: true, locale: "he-IL" });
    await context.addInitScript(() => { const target = new EventTarget(); Object.defineProperty(target, "height", { get: () => window.__vvh ?? window.innerHeight }); Object.defineProperty(window, "visualViewport", { value: target, configurable: true }); });
    const page = await context.newPage();
    await signInWithCode(page, fixture, A);
    await page.goto(fixture.origin + "/", { waitUntil: "domcontentloaded" }); await ready(page); await page.waitForTimeout(1500); await openPanel(page);
    const toggle = page.locator('[data-auth-action="set-password"]');
    if (!(await toggle.count())) return;   // the password screens ship in another change; this part runs once they are present
    await toggle.click(); await page.getByLabel("סיסמה חדשה", { exact: true }).fill("a-long-enough-password");
    await page.getByLabel("אימות הסיסמה", { exact: true }).fill("a-long-enough-password");
    const covered = await page.evaluate(() => { const button = [...document.querySelectorAll("button[type=submit]")].find(item => /שמירת הסיסמה/.test(item.textContent)); button.focus(); const box = button.getBoundingClientRect(); const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2); return { covered: !(top === button || button.contains(top)), bottom: Math.round(box.bottom), inView: box.top >= 0 && box.bottom <= innerHeight }; });
    assert.deepEqual({ covered: covered.covered, inView: covered.inView }, { covered: false, inView: true });
    const keyboard = await page.evaluate(async () => { document.querySelector('input[autocomplete="new-password"]').focus(); window.__vvh = innerHeight - 320; window.visualViewport.dispatchEvent(new Event("resize")); await new Promise(resolve => setTimeout(resolve, 400)); return { class: document.documentElement.classList.contains("sod29-kbd-open"), dock: getComputedStyle(document.querySelector(".sod29-command-island")).display }; });
    assert.deepEqual(keyboard, { class: true, dock: "none" }, "the bar steps aside while the keyboard is open");
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
});
