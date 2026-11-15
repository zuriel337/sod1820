// Browser check for the 3060 multi-path convergence view, opened from the EXISTING World spatial shelf card (no new route).
// Read-only: canonical read RPCs only; any other non-GET request is blocked.
// Usage: BASE=http://localhost:4180 OUT=<dir> node scripts/anatomy-pilot/convergence-3060-browser-check.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.BASE || "http://localhost:4180";
const out = process.env.OUT || "/tmp/convergence-3060";
fs.mkdirSync(out, { recursive: true });
const receipt = { cases: [], errors: [], blocked: [] };
const browser = await chromium.launch({ args: ["--no-sandbox"], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined });

async function session({ width, height, reducedMotion = "no-preference", throttle = 1, name }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion, ignoreHTTPSErrors: !!process.env.HTTPS_PROXY });
  const page = await ctx.newPage();
  page.setDefaultTimeout(40000);
  page.on("pageerror", (e) => receipt.errors.push(`${name}: ${e.message}`));
  await page.addInitScript(() => {
    window.__cls = 0; window.__clsStage = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; (window.__shifts = window.__shifts || []).push({ v: +e.value.toFixed(4), n: (e.sources || []).map((x) => String(x.node?.className || x.node?.nodeName || '?').slice(0, 55)) });
      const nodes = (e.sources || []).map((s) => s.node).filter(Boolean); const inside = (n) => n.closest?.(".is-convergence") && !n.matches?.(".is-convergence");
      if (nodes.length && nodes.every(inside)) window.__clsStage += e.value; else if (nodes.some(inside)) window.__clsOpen = (window.__clsOpen || 0) + e.value; } }).observe({ type: "layout-shift", buffered: true });
  });
  await page.route("**/*", async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) { const r = req.isNavigationRequest() && url.pathname.startsWith("/2029/") ? await page.request.get(`${base}/2029.html`) : await page.request.fetch(req); return route.fulfill({ response: r }); }
    if (/\.(woff2?|ttf)$/.test(url.pathname) || /googletagmanager|google-analytics/.test(url.hostname)) return route.abort();
    if (req.method() !== "GET" && req.method() !== "HEAD" && req.method() !== "OPTIONS") {
      const rpc = url.pathname.includes("/rest/v1/rpc/") ? url.pathname.split("/").pop() : null;
      if (rpc && ["gematria_method_trace", "fn_method_profile", "fn_method_value", "gematria_api", "world_group_source_arrivals_v2"].includes(rpc)) return route.continue();
      receipt.blocked.push(`${req.method()} ${url.pathname}`); return route.fulfill({ status: 403, contentType: "application/json", body: "{}" });
    }
    return route.continue();
  });
  if (throttle > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle }); }
  return { ctx, page };
}

async function openCard(page) {
  await page.goto(`${base}/world?view=explore&kind=spatial#spatial-yesharim-cube-3060`, { waitUntil: "domcontentloaded" });
  const open = page.locator('[data-convergence-card="yesharim-cube-3060"] button', { hasText: "פתח המחשת התכנסות" });
  await open.scrollIntoViewIfNeeded({ timeout: 60000 }); await open.click({ timeout: 60000 });
  const stage = page.locator('[data-convergence-card="yesharim-cube-3060"] .is-convergence');
  await stage.waitFor();
  await page.waitForFunction(() => document.querySelector(".is-convergence")?.getAttribute("data-state") === "ready", null, { timeout: 45000 });
  return stage;
}
async function hideChrome(page) {
  await page.evaluate(() => { for (const el of document.querySelectorAll("body *")) { const p = getComputedStyle(el).position; if ((p === "fixed" || p === "sticky") && !el.querySelector(".is-convergence")) el.style.visibility = "hidden"; } });
}

try {
  { // desktop: content, honesty about the fifth path, keyboard, ledger reuse, play + off-screen pause
    const { ctx, page } = await session({ width: 1280, height: 900, name: "desktop" });
    const stage = await openCard(page);
    assert.equal(await stage.getAttribute("data-verified-paths"), "4");
    assert.equal(await stage.getAttribute("data-total-paths"), "5");
    assert.match(await stage.innerText(), /4 מתוך 5 מסלולים אומתו במנוע/);
    assert.equal(await stage.locator("button[data-path-index]").count(), 5);
    assert.equal(await stage.getAttribute("data-playing"), "false");
    assert.equal(await stage.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length), 0, "static at rest");
    // the 765 path: visible, dashed, not counted
    await stage.locator("button[data-path-index='3']").click();
    const focusText = await stage.locator(".sod29-spatial-convergence__focus").innerText();
    assert.match(focusText, /765/); assert.match(focusText, /המסלול מוצג אך אינו נספר/); assert.match(focusText, /inner_triangles|source diagram|כמות/);
    assert.equal(await stage.locator("li[data-status='no_phrase']").count(), 1);
    // keyboard (RTL: ArrowLeft = next), roving tabindex
    await stage.locator("button[data-path-index='0']").focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-path-index")), "1");
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-path-index")), "4");
    await page.keyboard.press("Home");
    assert.equal(await stage.locator("button[data-path-index][tabindex='0']").count(), 1);
    // reuse: the engine letter ledger of the focused phrase opens the EXISTING stage
    await stage.locator(".sod29-spatial-convergence__ledger summary").click();
    await stage.locator(".sod29-spatial-convergence__ledger .sod29-spatial-method-stage[data-method-key='רגיל']").waitFor();
    assert.match(await stage.locator(".sod29-spatial-convergence__ledger").innerText(), /510/);
    // play, then pause when scrolled off-screen
    await stage.getByRole("button", { name: "הפעלת ההתכנסות" }).click();
    assert.equal(await stage.getAttribute("data-playing"), "true");
    await page.waitForTimeout(1500);
    await stage.evaluate((el) => { const sp = document.createElement("div"); sp.id = "__spacer"; sp.style.height = "6000px"; el.parentElement.insertBefore(sp, el); });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);
    const before = await stage.locator("button[data-path-index][aria-pressed='true']").getAttribute("data-path-index");
    await page.waitForTimeout(2800);
    assert.equal(await stage.locator("button[data-path-index][aria-pressed='true']").getAttribute("data-path-index"), before, "no advance while off-screen");
    assert.equal(await stage.getAttribute("data-playing"), "false");
    await page.evaluate(() => document.getElementById("__spacer")?.remove());
    receipt.cases.push({ name: "desktop-content-honesty-keyboard-ledger-play-offscreen", ok: true });
    await stage.scrollIntoViewIfNeeded();
    await stage.locator("details.sod29-spatial-convergence__ledger").evaluate((d) => { d.open = false; });
    await stage.locator("button[data-path-index='3']").click();
    await hideChrome(page);
    await stage.screenshot({ path: `${out}/convergence-3060-desktop.png` });
    await ctx.close();
  }
  { // reduced motion
    const { ctx, page } = await session({ width: 390, height: 844, reducedMotion: "reduce", name: "reduced" });
    const stage = await openCard(page);
    assert.equal(await stage.getAttribute("data-motion"), "reduced");
    assert.equal(await stage.getByRole("button", { name: "הפעלת ההתכנסות" }).count(), 0);
    assert.equal(await stage.locator("button[data-path-index]").count(), 5);
    receipt.cases.push({ name: "reduced-motion", ok: true });
    await ctx.close();
  }
  for (const width of [320, 390]) { // mobile at 4x CPU
    const { ctx, page } = await session({ width, height: 844, throttle: 4, name: `mobile${width}` });
    const t0 = Date.now();
    const stage = await openCard(page);
    const ready = Date.now() - t0;
    await stage.scrollIntoViewIfNeeded();
    const m = await page.evaluate(() => {
      const el = document.querySelector(".is-convergence");
      const small = [...el.querySelectorAll("button, summary")].filter((b) => { const r = b.getBoundingClientRect(); return r.height < 44; }).length;
      const minFont = Math.min(...[...el.querySelectorAll("small,p,span,button,strong,b")].filter((n) => n.textContent.trim() && !n.closest(".sod29-hebrew-glyph-word")).map((n) => parseFloat(getComputedStyle(n).fontSize)));
      const offenders = [...el.querySelectorAll("small,p,span,button,strong,b")].filter((n) => n.textContent.trim() && !n.closest(".sod29-hebrew-glyph-word") && parseFloat(getComputedStyle(n).fontSize) < 14).map((n) => `${n.tagName}.${String(n.className).slice(0, 50)}:${parseFloat(getComputedStyle(n).fontSize)}:${n.textContent.trim().slice(0, 20)}`);
      const rows = [...el.querySelectorAll(".sod29-spatial-convergence__paths button")].map((b) => ({ over: b.scrollWidth > b.clientWidth + 1 }));
      return { offenders: offenders.slice(0, 5), docWidth: document.documentElement.scrollWidth, innerWidth, nodes: el.querySelectorAll("*").length, smallControls: small, minFont, rowOverflow: rows.filter((r) => r.over).length, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    });
    assert.ok(m.docWidth <= m.innerWidth + 1, `horizontal overflow at ${width}`);
    assert.ok(m.minFont >= 14, `text too small at ${width}: ${m.minFont} ${JSON.stringify(m.offenders)}`);
    assert.equal(m.smallControls, 0, "controls ≥ 44px");
    assert.equal(m.rowOverflow, 0, "no clipped row content");
    await stage.getByRole("button", { name: "הפעלת ההתכנסות" }).click();
    const frames = await page.evaluate(() => new Promise((resolve) => { const gaps = []; let last = performance.now(); const end = last + 3500; const tick = (t) => { gaps.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else resolve(gaps); }; requestAnimationFrame(tick); }));
    const sorted = [...frames].sort((a, b) => a - b);
    const cls = await page.evaluate(() => ({ page: window.__cls, stage: window.__clsStage, open: window.__clsOpen || 0, shifts: (window.__shifts || []).filter((x) => x.v >= 0.005) }));
    receipt.cases.push({ name: `mobile-${width}-cpu4x`, readyMsAfterClick: ready, ...m, playFrames: frames.length, frameGapP95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]), droppedOver50ms: frames.filter((g) => g > 50).length, clsInsideStage: Number(cls.stage.toFixed(4)), clsOpeningPush: Number(cls.open.toFixed(4)), clsPage: Number(cls.page.toFixed(4)), shifts: cls.shifts });
    assert.ok(cls.stage <= 0.01, "nothing moves inside the view once it is open");
    await stage.locator("button[data-path-index='3']").click();
    await hideChrome(page);
    await stage.screenshot({ path: `${out}/convergence-3060-mobile-${width}.png` });
    await ctx.close();
  }
  fs.writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log("PASS", JSON.stringify(receipt.cases.map((c) => c.name)), "errors:", receipt.errors.length);
} catch (error) {
  fs.writeFileSync(`${out}/receipt.failed.json`, JSON.stringify({ ...receipt, error: String(error?.stack || error).slice(0, 2000) }, null, 2));
  console.error("FAIL", String(error?.message || error).slice(0, 600));
  process.exitCode = 1;
} finally { await browser.close(); }
