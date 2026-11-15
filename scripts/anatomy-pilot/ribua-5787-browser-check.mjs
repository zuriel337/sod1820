// Browser check for the ריבוע 5787 illustration inside the EXISTING Number-page station (no new route).
// Read-only: only the canonical read RPCs are allowed through; every other non-GET request is blocked.
// Usage: BASE=http://localhost:4173 OUT=<dir> node scripts/anatomy-pilot/ribua-5787-browser-check.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.BASE || "http://localhost:4173";
const out = process.env.OUT || "/tmp/ribua-5787";
const EXPR = "תפרצי בתשפז";
fs.mkdirSync(out, { recursive: true });
const receipt = { source: null, cases: [], errors: [], blocked: [] };
const allowed = new Set(["fn_method_profile", "gematria_method_trace", "fn_method_value", "gematria_api", "fn_zero_scale", "fn_verses_by_gematria", "fn_get_value_phrases", "get_all_value_phrases"]);
const fixture = JSON.parse(fs.readFileSync(new URL("../../test/fixtures/spatial/ribua-5787-trace.json", import.meta.url), "utf8")).trace;
let engineTraceCalls = 0;

const browser = await chromium.launch({ args: ["--no-sandbox"], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined });

async function session({ width, height, reducedMotion = "no-preference", throttle = 1, name }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion, ignoreHTTPSErrors: !!process.env.HTTPS_PROXY });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => receipt.errors.push(`${name}: ${e.message}`));
  await page.route("**/*", async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) {
      const response = req.isNavigationRequest() && url.pathname.startsWith("/2029/") ? await page.request.get(`${base}/2029.html`) : await page.request.fetch(req);
      return route.fulfill({ response });
    }
    const rpc = url.pathname.includes("/rest/v1/rpc/") ? url.pathname.split("/").pop() : null;
    if (req.method() === "POST" && rpc && allowed.has(rpc)) {
      if (rpc === "gematria_method_trace") {
        engineTraceCalls += 1;
        if (process.env.OFFLINE_ENGINE_WITNESS === "1") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixture) });
      }
      return route.continue();
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) { receipt.blocked.push(`${req.method()} ${url.pathname}`); return route.fulfill({ status: 403, contentType: "application/json", body: '{"message":"Read-only verification"}' }); }
    if (/\.(woff2?|ttf)$/.test(url.pathname) || url.hostname.includes("googletagmanager") || url.hostname.includes("google-analytics")) return route.abort();
    return route.continue();
  });
  if (throttle > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle }); }
  return { ctx, page };
}

// Evidence screenshots only: hide sticky/fixed app chrome (header, bottom dock) that would overlap the element capture.
async function hideFixedChrome(page) {
  await page.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const p = getComputedStyle(el).position; if ((p === 'fixed' || p === 'sticky') && !el.querySelector('.sod29-spatial-method-stage.is-ribua')) el.style.visibility = 'hidden'; } });
}

async function openStation(page, method = "ריבוע") {
  await page.addInitScript(() => {
    window.__cls = 0; window.__clsStage = 0; window.__longTasks = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts = window.__shifts || []; window.__shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), n: (e.sources || []).map((s) => (s.node?.className?.toString?.() || s.node?.nodeName || '?').slice(0, 60)) }); if ((e.sources || []).some((s) => s.node && s.node.closest?.('.sod29-spatial-method-stage.is-ribua') && !s.node.matches?.('.sod29-spatial-method-stage.is-ribua'))) window.__clsStage += e.value; } }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__longTasks.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: true });
  });
  await page.goto(`${base}/2029/number/5787?focus=${encodeURIComponent(EXPR)}&method=${encodeURIComponent(method)}`, { waitUntil: "domcontentloaded" });
  await page.locator(".sod29-number-v10-calculation-card").click({ timeout: 60000 });
  await page.locator(".sod29-number-method-inspector").waitFor();
  await page.waitForFunction(() => { const el = document.querySelector(".sod29-number-method-inspector .sod29-spatial-method-stage"); return el && el.getAttribute("data-state") !== "loading" && el.getAttribute("data-method-key"); }, null, { timeout: 45000 });
}

if (process.env.BASELINE_METHOD) { // page-level CLS baseline for another method (proves the shift is the existing inspector opening, not the new view)
  const { page } = await session({ width: 390, height: 844, throttle: 4, name: "baseline" });
  await openStation(page, process.env.BASELINE_METHOD);
  await page.waitForTimeout(3500);
  console.log(process.env.BASELINE_METHOD, "page CLS @390 CPU4x:", (await page.evaluate(() => window.__cls)).toFixed(4));
  await browser.close(); process.exit(0);
}
try {
  // ---------- desktop: content, keyboard, play, off-screen pause, screenshot ----------
  {
    const { ctx, page } = await session({ width: 1280, height: 900, name: "desktop" });
    await openStation(page);
    const stage = page.locator(".sod29-number-method-inspector .sod29-spatial-method-stage.is-ribua");
    await stage.waitFor();
    receipt.source = engineTraceCalls > 0 && process.env.OFFLINE_ENGINE_WITNESS !== "1" ? "live canonical gematria_method_trace via the Number page" : "verbatim engine witness (offline)";
    const text = await stage.innerText();
    for (const n of ["3110", "2677", "5787", "780", "789"]) assert.ok(text.includes(n), `missing ${n}`);
    assert.equal(await stage.locator("button[data-ribua-flat]").count(), 10);
    assert.equal(await page.locator("[data-experience-capability='spatial-method-stage']").count() >= 1, true);
    assert.equal(await page.locator(".sod29-number-method-inspector").count(), 1, "opened inside the existing inspector, no new route/page");
    // static default: no running animation, not playing
    assert.equal(await stage.getAttribute("data-playing"), "false");
    assert.equal(await stage.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length), 0, "static at rest");
    // keyboard (RTL: ArrowLeft = next)
    const first = stage.locator("button[data-ribua-flat='0']");
    await first.focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await stage.locator("button[data-ribua-flat='1']").getAttribute("aria-pressed"), "true");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-ribua-flat")), "1");
    await page.keyboard.press("End");
    assert.equal(await stage.locator("button[data-ribua-flat='9']").getAttribute("aria-pressed"), "true");
    assert.match(await stage.locator(".sod29-spatial-method-stage__ribua-focus").innerText(), /בתשפז = 789/);
    await page.keyboard.press("Home");
    assert.match(await stage.locator(".sod29-spatial-method-stage__ribua-focus").innerText(), /ת = 400/);
    // only one tab stop in the step group (roving tabindex)
    assert.equal(await stage.locator("button[data-ribua-flat][tabindex='0']").count(), 1);
    // play advances then stops; pause when scrolled off-screen
    await stage.getByRole("button", { name: "הפעלה" }).click();
    assert.equal(await stage.getAttribute("data-playing"), "true");
    await page.waitForTimeout(2000);
    const advanced = await stage.locator("button[data-ribua-flat][aria-pressed='true']").getAttribute("data-ribua-flat");
    assert.ok(Number(advanced) >= 1, "play advanced the focus");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight + 5000));
    await page.evaluate(() => { document.querySelector(".sod29-number-method-inspector").style.marginBottom = "4000px"; });
    await stage.evaluate((el) => { const sp = document.createElement("div"); sp.style.height = "4000px"; el.parentElement.insertBefore(sp, el); });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    const before = await stage.locator("button[data-ribua-flat][aria-pressed='true']").getAttribute("data-ribua-flat");
    await page.waitForTimeout(2200);
    const after = await stage.locator("button[data-ribua-flat][aria-pressed='true']").getAttribute("data-ribua-flat");
    assert.equal(after, before, "focus must not advance while the stage is off-screen");
    assert.equal(await stage.getAttribute("data-playing"), "false", "off-screen = no running timer");
    receipt.cases.push({ name: "desktop-content-keyboard-play-offscreen", ok: true });
    await stage.evaluate((el) => el.parentElement.querySelector("div[style*='4000px']")?.remove());
    await page.evaluate(() => { document.querySelector(".sod29-number-method-inspector").style.marginBottom = ""; });
    await stage.scrollIntoViewIfNeeded();
    await stage.locator("button[data-ribua-flat='1']").click();
    await hideFixedChrome(page); await stage.screenshot({ path: `${out}/ribua-5787-desktop.png` });
    await ctx.close();
  }
  // ---------- reduced motion: no play control, still fully usable ----------
  {
    const { ctx, page } = await session({ width: 390, height: 844, reducedMotion: "reduce", name: "reduced" });
    await openStation(page);
    const stage = page.locator(".sod29-number-method-inspector .sod29-spatial-method-stage.is-ribua");
    await stage.waitFor();
    assert.equal(await stage.getAttribute("data-motion"), "reduced");
    assert.equal(await stage.getByRole("button", { name: "הפעלה" }).count(), 0, "no animation control under reduced motion");
    assert.equal(await stage.locator("button[data-ribua-flat]").count(), 10, "static state shows every step");
    await stage.locator("button[data-ribua-flat='4']").click();
    assert.match(await stage.locator(".sod29-spatial-method-stage__ribua-focus").innerText(), /תפרצי = 780/);
    receipt.cases.push({ name: "reduced-motion", ok: true });
    await ctx.close();
  }
  // ---------- mobile + 4x CPU throttle: layout, tap targets, performance ----------
  for (const width of [320, 390]) {
    const { ctx, page } = await session({ width, height: 844, throttle: 4, name: `mobile${width}` });
    const t0 = Date.now();
    await openStation(page);
    const stage = page.locator(".sod29-number-method-inspector .sod29-spatial-method-stage.is-ribua");
    await stage.waitFor();
    const ready = Date.now() - t0;
    await stage.scrollIntoViewIfNeeded();
    const m = await page.evaluate(() => {
      const el = document.querySelector(".sod29-number-method-inspector .sod29-spatial-method-stage.is-ribua");
      const buttons = [...el.querySelectorAll("button")];
      const smallTargets = buttons.filter((b) => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length;
      const minFont = Math.min(...[...el.querySelectorAll("small,p,span,button")].filter((n) => n.textContent.trim()).map((n) => parseFloat(getComputedStyle(n).fontSize)));
      return { docWidth: document.documentElement.scrollWidth, innerWidth, nodes: el.querySelectorAll("*").length, smallTargets, minFont,
        cls: window.__cls, longTasks: window.__longTasks, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    });
    assert.ok(m.docWidth <= m.innerWidth + 1, `horizontal overflow at ${width}`);
    assert.ok(m.minFont >= 14, `text too small at ${width}: ${m.minFont}`);
    assert.equal(m.smallTargets, 0, "all controls are at least 44px");
    // frame pacing while playing under 4x throttle
    await stage.getByRole("button", { name: "הפעלה" }).click();
    const frames = await page.evaluate(() => new Promise((resolve) => {
      const gaps = []; let last = performance.now(); const end = last + 3000;
      const tick = (t) => { gaps.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else resolve(gaps); };
      requestAnimationFrame(tick);
    }));
    const sorted = [...frames].sort((a, b) => a - b);
    const p95 = Math.round(sorted[Math.floor(sorted.length * 0.95)]);
    const dropped = frames.filter((g) => g > 50).length;
    const clsAfter = await page.evaluate(() => window.__cls);
    const clsStage = await page.evaluate(() => window.__clsStage);
    const shifts = await page.evaluate(() => (window.__shifts || []).filter((x) => x.v >= 0.01));
    receipt.cases.push({ name: `mobile-${width}-cpu4x`, readyMsFromNav: ready, ...m, playFrames: frames.length, frameGapP95Ms: p95, droppedOver50ms: dropped, clsPageAfterPlay: Number(clsAfter.toFixed(4)), clsAttributedToStage: Number(clsStage.toFixed(4)), largestShifts: shifts.slice(-4) });
    assert.ok(clsStage <= 0.01, "the illustration itself must not shift layout (page-level CLS is reported separately)");
    await stage.locator("button[data-ribua-flat='1']").click();
    await hideFixedChrome(page); await stage.screenshot({ path: `${out}/ribua-5787-mobile-${width}.png` });
    await ctx.close();
  }
  console.log("PASS", JSON.stringify(receipt, null, 2));
  fs.writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
} catch (error) {
  fs.writeFileSync(`${out}/receipt.failed.json`, JSON.stringify({ ...receipt, error: String(error?.stack || error) }, null, 2));
  console.error("FAIL", error);
  process.exitCode = 1;
} finally { await browser.close(); }
