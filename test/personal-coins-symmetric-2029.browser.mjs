// Regression (ZURIEL 27.11.2026): the four coins of the personal area ("האזור האישי שלי", .pa29-coins, the shared Royal .r29-coin) sit symmetrically:
// a balanced 2x2 on a phone (320 / 390 / Pixel 7), one row where the panel has room (1440), equal widths, RTL order, nothing beyond the screen,
// (768: the panel is a 460px side sheet, so it is still 2x2 there: the rule follows the PANEL width, not the screen)
// no layout shift once they have rendered, and the same coin in all three presets (יום | קלף | לילה).
// A real Chromium runs the BUILT artifact (node scripts/build-public-reading-production.mjs first) with the real frame, service worker and Supabase client;
// only the remote data and the session are fixtures.   node --test test/personal-coins-symmetric-2029.browser.mjs
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
const skip = !canRun && "playwright or the built artifact is unavailable";
const PROFILES = [["320", { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }, 2], ["390", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 2],
  ["Pixel 7", "Pixel 7", 2], ["768", { viewport: { width: 768, height: 900 } }, 2], ["1440", { viewport: { width: 1440, height: 900 } }, 1]];
const THEMES = ["light", "parchment", "dark"];   // יום | קלף | לילה
const ORDER = ["follows", "unread", "level", "credits"];

// fourCoins=false: the notification count is unavailable (a non-zero count would turn the opener into a link to the notifications page), so the area shows three coins (the odd one must still be balanced).
async function run(profile, theme, fourCoins, check, big = false) {
  const fixture = await startFixture({ supabase: async ({ url }) => {
    const p = url.pathname;
    if (p === "/rest/v1/profiles") return { body: big ? { credits: 1234567, xp: 98765, level: 128, streak: 2 } : { credits: 12, xp: 340, level: 4, streak: 2 } };
    if (p === "/rest/v1/notification_prefs") return { body: { topics: big ? Array.from({ length: 1234 }, (_, i) => "number:" + (i + 1)) : ["number:26", "number:18"], channels: [], email: false, intensity: "normal", muted_until: null } };
    if (p === "/rest/v1/user_notifications") return fourCoins ? { body: [], headers: { "content-range": "*/0" } } : { status: 500, body: { message: "fixture" } };
    return null;
  } });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const options = profile[1] === "Pixel 7" ? { ...pw.devices["Pixel 7"] } : profile[1];
    const context = await browser.newContext({ ...options, ignoreHTTPSErrors: true, locale: "he-IL", reducedMotion: "reduce" });
    const user = fixture.auth.newUser("coins.person@example.invalid", true, "fixture-password");
    const response = await fixture.auth.handle(new Request("https://linswmnnkjxvweumprav.supabase.co/auth/v1/token?grant_type=password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: user.email, password: "fixture-password" }) }));
    assert.equal(response.status, 200);
    await context.addInitScript(([session, mode]) => {
      localStorage.setItem("sb-linswmnnkjxvweumprav-auth-token", JSON.stringify(session)); localStorage.setItem("sod-theme", mode);
      window.__shifts = []; try { new PerformanceObserver(list => { for (const e of list.getEntries()) window.__shifts.push({ value: e.value, inCoins: (e.sources || []).some(s => s.node?.closest?.(".pa29-coins")) }); }).observe({ type: "layout-shift", buffered: true }); } catch { /* not supported */ }
    }, [await response.json(), theme]);
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(fixture.origin + "/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => navigator.serviceWorker.controller && !window.__bootstrapFailure && document.querySelector(".sod29-root"), null, { timeout: 40000 });
    await page.locator(".sod29-header-workspace:visible").first().click();
    await page.locator('[data-panel-kind="workspace"] .pa29-coins .pa29-coin').first().waitFor({ timeout: 30000 });
    await page.waitForFunction(n => document.querySelectorAll(".pa29-coins .pa29-coin").length === n, fourCoins ? 4 : 3, { timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.evaluate(() => { window.__shifts.length = 0; });   // CLS is judged from here: the panel's own opening (inside the 500 ms input window) is not the coins' business
    await page.waitForTimeout(1500);
    assert.equal(await page.locator(".sod29-root").getAttribute("data-frame-theme-preset"), theme, "the preset under test is the one applied");
    await check(page);
    assert.deepEqual(errors, [], "no page errors");
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
}

// Everything a symmetric, family-true set of coins must satisfy; returns the measured geometry for the log.
const measure = page => page.evaluate(() => {
  const vw = document.documentElement.clientWidth, hall = document.querySelector(".pa29-hall").getBoundingClientRect(), box = document.querySelector(".pa29-coins");
  const coins = [...box.querySelectorAll(".pa29-coin")], r = coins.map(c => c.getBoundingClientRect()), cs = coins.map(c => getComputedStyle(c));
  const pa = getComputedStyle(document.querySelector(".pa29"));
  const rows = [...new Set(r.map(x => Math.round(x.top)))].sort((a, b) => a - b);
  return { vw, dir: getComputedStyle(document.documentElement).direction, keys: coins.map(c => c.dataset.pa29Coin), classes: coins.map(c => c.className),
    rects: r.map(x => ({ x: x.x, y: x.y, w: x.width, h: x.height, right: x.right })), rows: rows.map(top => r.filter(x => Math.round(x.top) === top).length),
    hall: { x: hall.x, right: hall.right }, docOverflow: document.documentElement.scrollWidth - vw,
    texts: coins.map(c => c.querySelector("b").textContent),
    labelPx: coins.map(c => parseFloat(getComputedStyle(c.querySelector("small")).fontSize)),
    clipped: coins.map(c => c.scrollWidth - c.clientWidth), looks: cs.map(s => [s.borderTopColor, s.backgroundImage, s.color, s.borderTopLeftRadius].join("|")),
    hue: [pa.getPropertyValue("--r29-hue").trim(), pa.getPropertyValue("--r29-sapphire").trim()],
    shifts: window.__shifts.filter(s => s.inCoins).reduce((n, s) => n + s.value, 0) };
});

for (const [name, , wantRows] of PROFILES) for (const theme of THEMES) {
  test(`[${name}] [${theme}] four coins: ${wantRows === 2 ? "2 rows of 2" : "one row"}, equal, symmetric, RTL, inside the screen, no shift`, { skip, timeout: 180000 }, async () => {
    const profile = PROFILES.find(p => p[0] === name);
    await run(profile, theme, true, async page => {
      const m = await measure(page);
      assert.equal(m.dir, "rtl"); assert.deepEqual(m.keys, ORDER, "the four coins, in their reading order");
      assert.ok(m.classes.every(c => /\br29-coin\b/.test(c) && /\bpa29-coin\b/.test(c)), "the shared Royal coin, not a new family");
      assert.equal(new Set(m.looks).size, 1, "all four coins carry one look: " + m.looks[0]);
      assert.equal(m.hue[0], m.hue[1], "the personal hue is sapphire (blue frame, gold numbers)");
      assert.deepEqual(m.rows, wantRows === 2 ? [2, 2] : [4], "rows of coins " + JSON.stringify(m.rows));
      const w = m.rects.map(x => x.w), h = m.rects.map(x => x.h);
      assert.ok(Math.max(...w) - Math.min(...w) <= 0.6, "equal widths " + w.map(v => v.toFixed(1)));
      assert.ok(Math.max(...h) - Math.min(...h) <= 0.6 && Math.max(...h) <= 44, "equal, thin heights (Dense Row Law) " + h.map(v => v.toFixed(1)));
      for (const x of m.rects) assert.ok(x.x >= 0 && x.right <= m.vw + 0.5 && x.x >= m.hall.x - 0.5 && x.right <= m.hall.right + 0.5, "inside the hall and the screen " + JSON.stringify(x));
      assert.ok(m.labelPx.every(v => v >= 14), "Design V2 §5: meaningful text is never below 14px " + m.labelPx);
      assert.ok(m.docOverflow <= 1, "no horizontal page scroll " + m.docOverflow); assert.ok(m.clipped.every(v => v <= 0), "no clipped coin text " + m.clipped);
      // RTL: the first coin is the right-most of its row
      if (wantRows === 2) { assert.ok(m.rects[0].x > m.rects[1].x && m.rects[2].x > m.rects[3].x, "RTL order inside each row"); assert.ok(Math.abs(m.rects[0].x - m.rects[2].x) <= 0.6 && Math.abs(m.rects[1].x - m.rects[3].x) <= 0.6, "the two rows are aligned"); }
      else assert.ok(m.rects.every((x, i, a) => !i || x.x < a[i - 1].x), "RTL order along the row");
      // symmetric about the hall: equal space at both ends of the set
      const left = Math.min(...m.rects.map(x => x.x)) - m.hall.x, right = m.hall.right - Math.max(...m.rects.map(x => x.right));
      assert.ok(Math.abs(left - right) <= 1, `balanced about the hall (${left.toFixed(1)} / ${right.toFixed(1)})`);
      assert.equal(m.shifts, 0, "the coins do not shift once rendered");
      console.log(`${name}/${theme}: vw=${m.vw} rows=${JSON.stringify(m.rows)} w=${w[0].toFixed(1)} h=${h[0].toFixed(1)} balance=${left.toFixed(1)}/${right.toFixed(1)} cls(coins)=${m.shifts}`);
    });
  });
}

for (const name of ["390", "1440"]) test(`[${name}] three coins stay balanced: an odd last coin is centred at the same width (never a lone stretched row)`, { skip, timeout: 180000 }, async () => {
  await run(PROFILES.find(p => p[0] === name), "dark", false, async page => {
    const m = await measure(page);
    assert.deepEqual(m.keys, ["follows", "level", "credits"]);
    const w = m.rects.map(x => x.w); assert.ok(Math.max(...w) - Math.min(...w) <= 0.6, "equal widths " + w.map(v => v.toFixed(1)));
    if (name === "1440") assert.deepEqual(m.rows, [3]);
    else {
      assert.deepEqual(m.rows, [2, 1]);
      const last = m.rects[2], centre = (m.hall.x + m.hall.right) / 2;
      assert.ok(Math.abs(last.x + last.w / 2 - centre) <= 1, "the odd coin is centred under the pair");
    }
    assert.ok(m.docOverflow <= 1); assert.equal(m.shifts, 0);
  });
});

// Long values (a seven-digit balance, a four-digit follow count) must not break a coin, push it out of its cell or unbalance the grid.
for (const name of ["320", "390"]) test(`[${name}] long numbers keep the four coins equal, inside the screen and unclipped`, { skip, timeout: 180000 }, async () => {
  await run(PROFILES.find(p => p[0] === name), "dark", true, async page => {
    const m = await measure(page);
    assert.deepEqual(m.texts, ["1234", "0", "128", "1234567"], "the long values are really on screen");
    assert.deepEqual(m.rows, [2, 2], JSON.stringify(m.rows));
    const w = m.rects.map(x => x.w); assert.ok(Math.max(...w) - Math.min(...w) <= 0.6, "equal widths " + w.map(v => v.toFixed(1)));
    assert.ok(m.clipped.every(v => v <= 0), "no clipped coin text " + m.clipped); assert.ok(m.docOverflow <= 1);
    for (const x of m.rects) assert.ok(x.x >= m.hall.x - 0.5 && x.right <= m.hall.right + 0.5 && x.h <= 44, "inside the hall, one line " + JSON.stringify(x));
  }, true);
});
