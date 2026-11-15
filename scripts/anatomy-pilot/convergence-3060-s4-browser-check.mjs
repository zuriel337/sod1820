// S4 (3D) browser check for the 3060 convergence view, opened from the EXISTING World spatial card. Software WebGL (SwiftShader).
// Read-only: canonical read RPCs only. Usage: BASE=http://localhost:4180 OUT=<dir> node scripts/anatomy-pilot/convergence-3060-s4-browser-check.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.BASE || "http://localhost:4180";
const out = process.env.OUT || "/tmp/convergence-3060-s4";
fs.mkdirSync(out, { recursive: true });
const receipt = { cases: [], errors: [], requests3d: {} };
const browser = await chromium.launch({ args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined });
const RPCS = ["gematria_method_trace", "fn_method_profile", "fn_method_value", "gematria_api", "world_group_source_arrivals_v2"];

async function session({ width, height, reducedMotion = "no-preference", throttle = 1, name, noWebgl = false }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion, ignoreHTTPSErrors: !!process.env.HTTPS_PROXY });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => receipt.errors.push(`${name}: ${e.message}`));
  const seen = [];
  page.on("request", (r) => { if (/ConvergenceScene3D|MistaterScene3D|three/i.test(r.url())) seen.push(r.url().split("/").pop()); });
  if (noWebgl) await page.addInitScript(() => { const orig = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/i.test(type) ? null : orig.call(this, type, ...a); }; });
  await page.route("**/*", async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) { const r = req.isNavigationRequest() && url.pathname.startsWith("/2029/") ? await page.request.get(`${base}/2029.html`) : await page.request.fetch(req); return route.fulfill({ response: r }); }
    if (/\.(woff2?|ttf)$/.test(url.pathname) || /googletagmanager|google-analytics/.test(url.hostname)) return route.abort();
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) { const rpc = url.pathname.split("/").pop(); return RPCS.includes(rpc) ? route.continue() : route.fulfill({ status: 403, contentType: "application/json", body: "{}" }); }
    return route.continue();
  });
  if (throttle > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle }); }
  return { ctx, page, seen };
}
async function openStage(page) {
  await page.goto(`${base}/world?view=explore&kind=spatial#spatial-yesharim-cube-3060`, { waitUntil: "domcontentloaded" });
  const open = page.locator('[data-convergence-card="yesharim-cube-3060"] button', { hasText: "פתח המחשת התכנסות" });
  await open.scrollIntoViewIfNeeded(); await open.click();
  const stage = page.locator('[data-convergence-card="yesharim-cube-3060"] .is-convergence');
  await stage.waitFor();
  await page.waitForFunction(() => document.querySelector(".is-convergence")?.getAttribute("data-state") === "ready", null, { timeout: 45000 });
  return stage;
}
const deepen = (stage) => stage.locator('[data-s4-action="deepen"]');
async function waitScene(stage, page) {
  await stage.locator('[data-renderer="r3f"][data-scene="convergence"] canvas').waitFor();
  await page.waitForTimeout(2500); // glyph geometries load asynchronously, then demand-render
}
async function hideChrome(page) { await page.evaluate(() => { for (const el of document.querySelectorAll("body *")) { const p = getComputedStyle(el).position; if ((p === "fixed" || p === "sticky") && !el.querySelector(".is-convergence")) el.style.visibility = "hidden"; } }); }
async function drag(page, box) {
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy); await page.mouse.down();
  for (let i = 1; i <= 14; i += 1) { await page.mouse.move(cx + i * 6, cy + i * 2); await page.waitForTimeout(30); }
  await page.mouse.up();
}
async function frameGaps(page, ms) {
  return page.evaluate((span) => new Promise((resolve) => { const gaps = []; let last = performance.now(); const end = last + span; const tick = (t) => { gaps.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else resolve(gaps); }; requestAnimationFrame(tick); }), ms);
}

try {
  { // desktop: lazy boundary, scene content, selection by canvas click + DOM controls, return, screenshot
    const { ctx, page, seen } = await session({ width: 1280, height: 900, name: "desktop" });
    const stage = await openStage(page);
    assert.equal(seen.length, 0, "no 3D module is requested before the explicit action");
    assert.equal(await stage.getAttribute("data-depth"), "S2");
    await deepen(stage).click();
    await waitScene(stage, page);
    receipt.requests3d.afterClick = [...seen];
    assert.ok(seen.some((u) => /ConvergenceScene3D/.test(u)), "the 3D chunk is requested only after the click");
    assert.equal(await stage.getAttribute("data-depth"), "S4");
    const host = stage.locator('[data-renderer="r3f"][data-scene="convergence"]');
    assert.equal(await host.getAttribute("data-node-count"), "5");
    assert.equal(await host.getAttribute("data-verified-paths"), "4");
    assert.equal(await stage.locator(".sod29-spatial-convergence__funnel").count(), 0, "S2 funnel replaced by the canvas");
    assert.equal(await stage.locator(".sod29-spatial-method-stage__sr-only li").count(), 5);
    assert.match(await stage.locator(".sod29-spatial-method-stage__sr-only").innerText(), /765 × 4 = 3060/);
    const box = await host.boundingBox();
    await stage.scrollIntoViewIfNeeded();
    await hideChrome(page);
    await host.screenshot({ path: `${out}/s4-desktop-default.png` });
    // selection: click across the slab row; at least three different focus texts must appear (R3F onClick wiring)
    const texts = new Set();
    for (const f of [0.16, 0.33, 0.5, 0.67, 0.84]) {
      const b = await host.boundingBox(); // fresh viewport coordinates (the page may have scrolled)
      await page.mouse.click(b.x + b.width * f, b.y + b.height * 0.34);
      await page.waitForTimeout(250);
      texts.add(await stage.locator(".sod29-spatial-convergence__focus strong").first().innerText());
    }
    receipt.canvasClickFocusTexts = [...texts];
    assert.ok(texts.size >= 3, `canvas click selects paths (${[...texts].join(" | ")})`);
    // DOM controls keep working in S4
    await stage.getByRole("button", { name: "המסלול הבא" }).click();
    await stage.locator(".sod29-spatial-convergence__focus").waitFor();
    await drag(page, await host.boundingBox());
    await stage.getByRole("button", { name: "הפעלת ההתכנסות" }).click();
    assert.equal(await stage.getAttribute("data-playing"), "true");
    await page.waitForTimeout(1500);
    await stage.getByRole("button", { name: "עצירה" }).click();
    await host.screenshot({ path: `${out}/s4-desktop-rotated.png` });
    await stage.locator('[data-s4-action="return"]').click();
    await stage.locator(".sod29-spatial-convergence__funnel").waitFor();
    assert.equal(await stage.getAttribute("data-depth"), "S2");
    receipt.cases.push({ name: "desktop-lazy-scene-select-controls-return", ok: true });
    await ctx.close();
  }
  { // reduced motion
    const { ctx, page } = await session({ width: 390, height: 844, reducedMotion: "reduce", name: "reduced" });
    const stage = await openStage(page); await deepen(stage).click(); await waitScene(stage, page);
    assert.equal(await stage.locator('[data-renderer="r3f"]').getAttribute("data-reduced-motion"), "true");
    assert.equal(await stage.getByRole("button", { name: "הפעלת ההתכנסות" }).count(), 0);
    receipt.cases.push({ name: "reduced-motion-s4", ok: true });
    await ctx.close();
  }
  { // no WebGL → truthful fallback to S2
    const { ctx, page } = await session({ width: 390, height: 844, name: "nowebgl", noWebgl: true });
    const stage = await openStage(page); await deepen(stage).click();
    await page.waitForTimeout(800);
    assert.equal(await stage.getAttribute("data-depth"), "S2");
    assert.match(await stage.locator('[role="status"]').first().innerText(), /WebGL אינו זמין/);
    assert.equal(await stage.locator("canvas").count(), 0);
    receipt.cases.push({ name: "no-webgl-fallback", ok: true });
    await ctx.close();
  }
  { // real context loss → fallback to S2 with note
    const { ctx, page } = await session({ width: 390, height: 844, name: "ctxloss" });
    const stage = await openStage(page); await deepen(stage).click(); await waitScene(stage, page);
    await page.evaluate(() => { const c = document.querySelector('[data-scene="convergence"] canvas'); const gl = c.getContext("webgl2") || c.getContext("webgl"); gl.getExtension("WEBGL_lose_context").loseContext(); });
    await page.waitForFunction(() => document.querySelector(".is-convergence")?.getAttribute("data-depth") === "S2", null, { timeout: 15000 });
    assert.match(await stage.locator('[role="status"]').first().innerText(), /הקשר הגרפי אבד/);
    receipt.cases.push({ name: "context-loss-fallback", ok: true });
    await ctx.close();
  }
  for (const width of [320, 390]) { // mobile at 4x CPU
    const { ctx, page } = await session({ width, height: 844, throttle: 4, name: `mobile${width}` });
    const stage = await openStage(page);
    const t0 = Date.now(); await deepen(stage).click(); await waitScene(stage, page);
    const sceneMs = Date.now() - t0 - 2500;
    const host = stage.locator('[data-renderer="r3f"][data-scene="convergence"]');
    const box = await host.boundingBox();
    await stage.scrollIntoViewIfNeeded();
    const m = await page.evaluate(() => ({ docWidth: document.documentElement.scrollWidth, innerWidth, canvases: document.querySelectorAll("canvas").length,
      smallControls: [...document.querySelectorAll(".is-convergence button")].filter((b) => b.getBoundingClientRect().height < 44).length,
      heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }));
    assert.ok(m.docWidth <= m.innerWidth + 1, `horizontal overflow at ${width}`);
    assert.equal(m.canvases, 1); assert.equal(m.smallControls, 0);
    const gapsPromise = frameGaps(page, 2500); await drag(page, box); const gaps = await gapsPromise;
    const sorted = [...gaps].sort((a, b) => a - b);
    receipt.cases.push({ name: `mobile-${width}-s4-cpu4x-swiftshader`, sceneReadyMsAfterClick: sceneMs, ...m, dragFrames: gaps.length, frameGapP95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]), droppedOver100ms: gaps.filter((g) => g > 100).length });
    await hideChrome(page);
    await host.screenshot({ path: `${out}/s4-mobile-${width}.png` });
    await ctx.close();
  }
  fs.writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log("PASS", JSON.stringify(receipt.cases.map((c) => c.name)), "errors:", receipt.errors.length);
} catch (error) {
  fs.writeFileSync(`${out}/receipt.failed.json`, JSON.stringify({ ...receipt, error: String(error?.stack || error).slice(0, 2500) }, null, 2));
  console.error("FAIL", String(error?.message || error).slice(0, 700));
  process.exitCode = 1;
} finally { await browser.close(); }
