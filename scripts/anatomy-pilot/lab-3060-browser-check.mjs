// Browser check for the 3060 research lab (S4 structure view), opened from the EXISTING World spatial card. Software WebGL (SwiftShader).
// Read-only: canonical read RPCs only. Usage: BASE=http://localhost:4180 OUT=<dir> node scripts/anatomy-pilot/lab-3060-browser-check.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.BASE || "http://localhost:4180";
const out = process.env.OUT || "/tmp/lab-3060";
fs.mkdirSync(out, { recursive: true });
const receipt = { cases: [], errors: [], chunkRequests: {} };
const browser = await chromium.launch({ args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined });
const RPCS = new Set(["gematria_method_trace", "fn_method_profile", "fn_method_value", "gematria_api", "world_group_source_arrivals_v2", "fn_zero_scale", "fn_verses_by_gematria"]);
const PARTS = ["cube", "outer", "inner", "triangles", "relation"];

async function session({ width, height, reducedMotion = "no-preference", throttle = 1, name, noWebgl = false }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, reducedMotion, ignoreHTTPSErrors: !!process.env.HTTPS_PROXY });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => receipt.errors.push(`${name}: ${e.message}`));
  const seen = [];
  page.on("request", (r) => { if (/StructureScene3D|ConvergenceScene3D|MistaterScene3D/i.test(r.url())) seen.push(r.url().split("/").pop()); });
  await page.addInitScript((blockWebgl) => {
    window.__ctxs = []; const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) {
      if (blockWebgl && /webgl/i.test(type)) return null;
      const c = orig.call(this, type, ...a); if (c && /webgl/i.test(type) && !window.__ctxs.includes(c)) window.__ctxs.push(c); return c; };
    window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  }, noWebgl);
  await page.route("**/*", async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) { const r = req.isNavigationRequest() && url.pathname.startsWith("/2029/") ? await page.request.get(`${base}/2029.html`) : await page.request.fetch(req); return route.fulfill({ response: r }); }
    if (/\.(woff2?|ttf)$/.test(url.pathname) || /googletagmanager|google-analytics/.test(url.hostname)) return route.abort();
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) { const rpc = url.pathname.split("/").pop(); return RPCS.has(rpc) ? route.continue() : route.fulfill({ status: 403, contentType: "application/json", body: "{}" }); }
    return route.continue();
  });
  if (throttle > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle }); }
  return { ctx, page, seen };
}
async function openStage(page) {
  await page.goto(`${base}/world?view=explore&kind=spatial&lab=v1#spatial-yesharim-cube-3060`, { waitUntil: "domcontentloaded" }); // lab=v1: the previous (rollback) look and controls
  const open = page.locator('[data-convergence-card="yesharim-cube-3060"] button', { hasText: "פתח המחשת התכנסות" });
  await open.scrollIntoViewIfNeeded(); await open.click();
  const stage = page.locator('[data-convergence-card="yesharim-cube-3060"] .is-convergence');
  await stage.waitFor();
  await page.waitForFunction(() => document.querySelector(".is-convergence")?.getAttribute("data-state") === "ready", null, { timeout: 45000 });
  return stage;
}
const host = (stage) => stage.locator('[data-renderer="r3f"][data-scene="structure"]');
async function enterLab(stage, page) {
  await stage.locator('[data-s4-action="deepen"]').click();
  await host(stage).locator("canvas").waitFor();
  await page.waitForTimeout(3000); // glyph geometries build asynchronously, then demand-render
}
const action = (stage, name) => stage.locator(`[data-lab-action="${name}"]`);
async function hideChrome(page) { await page.evaluate(() => { for (const el of document.querySelectorAll("body *")) { const p = getComputedStyle(el).position; if ((p === "fixed" || p === "sticky") && !el.querySelector(".is-convergence")) el.style.visibility = "hidden"; } }); }
async function shot(stage, page, name) { await stage.scrollIntoViewIfNeeded(); await hideChrome(page); await stage.screenshot({ path: `${out}/${name}.png` }); }
const selectedPart = async (stage) => host(stage).getAttribute("data-selected-part");
async function frameGaps(page, ms) { return page.evaluate((span) => new Promise((resolve) => { const gaps = []; let last = performance.now(); const end = last + span; const tick = (t) => { gaps.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else resolve(gaps); }; requestAnimationFrame(tick); }), ms); }
async function drag(page, box) { const cx = box.x + box.width / 2, cy = box.y + box.height / 2; await page.mouse.move(cx, cy); await page.mouse.down(); for (let i = 1; i <= 14; i += 1) { await page.mouse.move(cx + i * 6, cy + i * 2); await page.waitForTimeout(30); } await page.mouse.up(); }

try {
  { // ===== desktop: the full lab flow =====
    const { ctx, page, seen } = await session({ width: 1280, height: 900, name: "desktop" });
    const stage = await openStage(page);
    assert.equal(seen.length, 0, "no 3D module is requested before the explicit action");
    await enterLab(stage, page);
    receipt.chunkRequests.afterClick = [...seen];
    assert.ok(seen.some((u) => /StructureScene3D/.test(u)), "structure chunk requested only after the click");
    assert.equal(await stage.getAttribute("data-depth"), "S4");
    const h = host(stage);
    assert.equal(await h.getAttribute("data-parts"), PARTS.join(","));
    assert.equal(await h.getAttribute("data-verified-paths"), "4");
    assert.equal(await selectedPart(stage), "cube");
    await page.waitForTimeout(4000); // glyph geometries resolve asynchronously; read the counters of the settled frame
    await page.mouse.move(5, 5);
    receipt.gpuStats = { drawCalls: Number(await h.getAttribute("data-draw-calls")), geometries: Number(await h.getAttribute("data-gpu-geometries")), textures: Number(await h.getAttribute("data-gpu-textures")) };
    assert.ok(receipt.gpuStats.drawCalls > 0 && receipt.gpuStats.drawCalls < 160, `draw calls within budget: ${receipt.gpuStats.drawCalls}`);
    await shot(stage, page, "lab-desktop-overview");
    // each path (keyboard) selects its part; the panel shows expression, operation, result and provenance
    await stage.locator("button[data-path-index='0']").focus();
    const seenParts = [await selectedPart(stage)];
    for (let i = 1; i < 5; i += 1) { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(150); seenParts.push(await selectedPart(stage)); }
    assert.deepEqual(seenParts, PARTS, "keyboard walks the five paths → five parts");
    assert.match(await stage.locator(".sod29-spatial-lab__part").innerText(), /אין מבנה גאומטרי מאושר/, "path 5 is a relation layer, not a shape");
    await stage.locator("button[data-path-index='2']").click();
    const innerText = await stage.locator(".sod29-spatial-lab__part").innerText();
    assert.match(innerText, /צלעות בצורה[\s\S]*5/); assert.match(innerText, /180/); assert.match(innerText, /אינם אותו דבר/); assert.match(innerText, /source claim\/diagram/);
    assert.match(await stage.locator(".sod29-spatial-convergence__focus").innerText(), /17 × 180 = 3060/);
    // canvas picking: clicks across the structure select at least three different parts
    const picked = new Set();
    const b = await h.boundingBox();
    for (const fy of [0.25, 0.4, 0.55, 0.7, 0.85]) for (const fx of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const box = await h.boundingBox(); await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await page.waitForTimeout(60);
      picked.add(await selectedPart(stage));
    }
    receipt.canvasPickedParts = [...picked];
    assert.ok(picked.size >= 3, `canvas click selects parts (${[...picked].join(",")})`);
    // select the inner ring again, then: focus view, explode, layers, spin
    await stage.locator("button[data-path-index='2']").click();
    await action(stage, "view-focus").click(); assert.equal(await h.getAttribute("data-view"), "focus"); await page.waitForTimeout(1200);
    await shot(stage, page, "lab-desktop-focus-inner");
    await action(stage, "view-overview").click(); await page.waitForTimeout(1200);
    await action(stage, "explode").click(); assert.equal(await h.getAttribute("data-explode"), "true"); await page.waitForTimeout(1500);
    await shot(stage, page, "lab-desktop-exploded");
    await action(stage, "explode").click(); assert.equal(await h.getAttribute("data-explode"), "false"); await page.waitForTimeout(1200);
    await stage.locator('[data-lab-layer="cube"]').click(); assert.equal(await stage.locator('[data-lab-layer="cube"]').getAttribute("aria-pressed"), "false");
    await page.waitForTimeout(400);
    await shot(stage, page, "lab-desktop-cube-layer-hidden");
    await stage.locator('[data-lab-layer="cube"]').click();
    // spin: moves the camera while on, stops when the lab is off-screen
    await action(stage, "spin").click(); assert.equal(await h.getAttribute("data-spin"), "true");
    const a1 = await h.screenshot(); await page.waitForTimeout(1500); const a2 = await h.screenshot();
    assert.notDeepEqual(a1, a2, "slow spin moves the scene");
    await stage.evaluate((el) => { const sp = document.createElement("div"); sp.id = "__spacer"; sp.style.height = "6000px"; el.parentElement.insertBefore(sp, el); });
    await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(800);
    const frames = await frameGaps(page, 1500);
    assert.ok(frames.length > 5);
    const bAfter = await page.evaluate(() => document.querySelector('[data-scene="structure"]')?.getBoundingClientRect().top);
    assert.ok(bAfter > 1500, "the lab is off-screen");
    await page.evaluate(() => document.getElementById("__spacer")?.remove());
    await action(stage, "spin").click();
    // reset
    await action(stage, "explode").click(); await action(stage, "view-focus").click(); await stage.locator('[data-lab-layer="outer"]').click();
    await action(stage, "reset").click(); await page.waitForTimeout(400);
    assert.equal(await h.getAttribute("data-view"), "overview"); assert.equal(await h.getAttribute("data-explode"), "false"); assert.equal(await h.getAttribute("data-spin"), "false");
    assert.equal(await stage.locator('[data-lab-layer="outer"]').getAttribute("aria-pressed"), "true"); assert.equal(await selectedPart(stage), "cube");
    // raziel: the selected path is handed to the EXISTING Raziel panel
    await stage.locator("button[data-path-index='1']").click();
    await action(stage, "raziel").click();
    await page.waitForTimeout(1200);
    const razielText = await page.evaluate(() => (document.querySelector(".sod29-raziel-native-hero, .sod29-panel-context-card")?.closest("[class*=panel], aside, section, div")?.innerText || document.body.innerText).slice(0, 1500));
    receipt.raziel = { opened: /רזיאל/.test(razielText), carriesPath: /ברית|612/.test(razielText), excerpt: razielText.replace(/\n+/g, " | ").slice(0, 400) };
    // scene switch to the fan, and back to 2D
    await page.keyboard.press("Escape");
    await action(stage, "scene-paths").click(); await page.waitForTimeout(1500);
    assert.equal(await stage.locator('[data-renderer="r3f"][data-scene="convergence"]').count(), 1);
    await action(stage, "scene-structure").click(); await page.waitForTimeout(1500);
    await stage.locator('[data-s4-action="return"]').click();
    await stage.locator(".sod29-spatial-convergence__funnel:not(.is-lab)").waitFor();
    await page.waitForTimeout(500);
    const lost = await page.evaluate(() => window.__ctxs.map((c) => c.isContextLost()));
    assert.ok(lost.length > 0 && lost.every(Boolean), `every WebGL context is released after leaving the lab: ${JSON.stringify(lost)}`);
    assert.equal(await page.locator("canvas").count(), 0);
    receipt.cases.push({ name: "desktop-lab-flow", ok: true, contexts: lost.length });
    await ctx.close();
  }
  { // ===== GPU/JS memory across repeated open/close cycles =====
    const { ctx, page } = await session({ width: 1280, height: 900, name: "leak" });
    const stage = await openStage(page);
    const heap = async () => page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
    await enterLab(stage, page); await stage.locator('[data-s4-action="return"]').click(); await page.waitForTimeout(500);
    const before = await heap();
    for (let i = 0; i < 6; i += 1) { await enterLab(stage, page); await action(stage, "explode").click(); await page.waitForTimeout(600); await stage.locator('[data-s4-action="return"]').click(); await page.waitForTimeout(400); }
    const after = await heap();
    const lost = await page.evaluate(() => window.__ctxs.map((c) => c.isContextLost()));
    receipt.leak = { cycles: 6, heapBeforeMB: before, heapAfterMB: after, contexts: lost.length, allLost: lost.every(Boolean) };
    assert.ok(lost.every(Boolean), "no live WebGL context after 6 cycles");
    assert.ok(after == null || after - before < 25, `JS heap growth bounded: ${before} → ${after} MB`);
    receipt.cases.push({ name: "open-close-cycles-no-gpu-leak", ok: true });
    await ctx.close();
  }
  { // ===== reduced motion =====
    const { ctx, page } = await session({ width: 390, height: 844, reducedMotion: "reduce", name: "reduced" });
    const stage = await openStage(page); await enterLab(stage, page);
    assert.equal(await host(stage).getAttribute("data-reduced-motion"), "true");
    assert.equal(await action(stage, "spin").count(), 0, "no spin control under reduced motion");
    await action(stage, "explode").click(); assert.equal(await host(stage).getAttribute("data-explode"), "true");
    await action(stage, "view-focus").click(); assert.equal(await host(stage).getAttribute("data-view"), "focus");
    receipt.cases.push({ name: "reduced-motion-lab", ok: true });
    await ctx.close();
  }
  { // ===== fallbacks =====
    const a = await session({ width: 390, height: 844, name: "nowebgl", noWebgl: true });
    const s1 = await openStage(a.page); await s1.locator('[data-s4-action="deepen"]').click(); await a.page.waitForTimeout(800);
    assert.equal(await s1.getAttribute("data-depth"), "S2"); assert.match(await s1.locator('[role="status"]').first().innerText(), /WebGL אינו זמין/);
    await a.ctx.close();
    const c = await session({ width: 390, height: 844, name: "ctxloss" });
    const s2 = await openStage(c.page); await enterLab(s2, c.page);
    await c.page.evaluate(() => { const cv = document.querySelector('[data-scene="structure"] canvas'); const gl = cv.getContext("webgl2") || cv.getContext("webgl"); gl.getExtension("WEBGL_lose_context").loseContext(); });
    await c.page.waitForFunction(() => document.querySelector(".is-convergence")?.getAttribute("data-depth") === "S2", null, { timeout: 15000 });
    assert.match(await s2.locator('[role="status"]').first().innerText(), /הקשר הגרפי אבד/);
    await c.ctx.close();
    receipt.cases.push({ name: "no-webgl-and-context-loss-fall-back-to-2d", ok: true });
  }
  for (const width of [320, 390]) { // ===== mobile at 4x CPU =====
    const { ctx, page } = await session({ width, height: 844, throttle: 4, name: `mobile${width}` });
    const stage = await openStage(page);
    const t0 = Date.now(); await enterLab(stage, page);
    const h = host(stage);
    const metrics = await page.evaluate(() => {
      const el = document.querySelector(".is-convergence");
      const small = [...el.querySelectorAll("button, summary")].filter((b) => b.getBoundingClientRect().height < 44).map((b) => (b.textContent || "").trim().slice(0, 24));
      return { docWidth: document.documentElement.scrollWidth, innerWidth, canvases: document.querySelectorAll("canvas").length, small, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null };
    });
    assert.ok(metrics.docWidth <= metrics.innerWidth + 1, `overflow at ${width}`); assert.equal(metrics.canvases, 1); assert.deepEqual(metrics.small, [], "all controls ≥ 44px");
    await shot(stage, page, `lab-mobile-${width}-overview`);
    await action(stage, "explode").click(); await page.waitForTimeout(1500); await shot(stage, page, `lab-mobile-${width}-exploded`);
    await action(stage, "explode").click(); await action(stage, "view-focus").click(); await stage.locator("button[data-path-index='1']").click(); await page.waitForTimeout(1500);
    await shot(stage, page, `lab-mobile-${width}-focus`);
    await action(stage, "view-overview").click(); await page.waitForTimeout(1200);
    const box = await h.boundingBox(); await stage.scrollIntoViewIfNeeded();
    const gapsP = frameGaps(page, 2500); await drag(page, await h.boundingBox()); const gaps = await gapsP;
    const sorted = [...gaps].sort((x, y) => x - y);
    receipt.cases.push({ name: `mobile-${width}-lab-cpu4x-swiftshader`, caseWallClockMs: Date.now() - t0 - 3000 /* whole case incl. page load, RPC, screenshots: NOT a scene-ready metric */, ...metrics, small: undefined, dragFrames: gaps.length, frameGapP95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]), droppedOver100ms: gaps.filter((g) => g > 100).length });
    await ctx.close();
  }
  fs.writeFileSync(`${out}/receipt.json`, JSON.stringify(receipt, null, 2));
  console.log("PASS", JSON.stringify(receipt.cases.map((c) => c.name)), "errors:", receipt.errors.length);
} catch (error) {
  fs.writeFileSync(`${out}/receipt.failed.json`, JSON.stringify({ ...receipt, error: String(error?.stack || error).slice(0, 2500) }, null, 2));
  console.error("FAIL", String(error?.message || error).slice(0, 700));
  process.exitCode = 1;
} finally { await browser.close(); }
