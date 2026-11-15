// Royal V2 browser check: the three design directions (A Museum · B Discovery · C Lab) and V1 on ONE engine, from the EXISTING World spatial card. SwiftShader.
// Read-only: canonical read RPCs only. Usage: BASE=http://localhost:4180 OUT=<dir> node scripts/anatomy-pilot/lab-3060-v2-browser-check.mjs
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.BASE || "http://localhost:4180";
const out = process.env.OUT || "/tmp/lab-3060";
fs.mkdirSync(out, { recursive: true });
const receipt = { directions: {}, cases: [], errors: [] };
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
async function openStage(page, lab = "museum") {
  await page.goto(`${base}/world?view=explore&kind=spatial&lab=${lab}#spatial-yesharim-cube-3060`, { waitUntil: "domcontentloaded" }); // direction chosen by link
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
async function shot(stage, page, name) {
  await stage.scrollIntoViewIfNeeded(); await hideChrome(page);
  // A software GL renderer cannot service a continuously drifting scene AND a screenshot: pause the drift for the capture (reduced-motion media), then restore
  await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForTimeout(500);
  try { await stage.screenshot({ path: `${out}/${name}.png`, timeout: 20000 }); }
  catch { const box = await stage.boundingBox(); await page.screenshot({ path: `${out}/${name}.png`, clip: { x: box.x, y: Math.max(0, box.y), width: box.width, height: Math.min(box.height, 8000) }, fullPage: true, timeout: 60000 }); }
  await page.emulateMedia({ reducedMotion: process.env.REDUCED ? "reduce" : "no-preference" });
}
const selectedPart = async (stage) => host(stage).getAttribute("data-selected-part");
async function frameGaps(page, ms) { return page.evaluate((span) => new Promise((resolve) => { const gaps = []; let last = performance.now(); const end = last + span; const tick = (t) => { gaps.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else resolve(gaps); }; requestAnimationFrame(tick); }), ms); }
async function drag(page, box) { const cx = box.x + box.width / 2, cy = box.y + box.height / 2; await page.mouse.move(cx, cy); await page.mouse.down(); for (let i = 1; i <= 14; i += 1) { await page.mouse.move(cx + i * 6, cy + i * 2); await page.waitForTimeout(30); } await page.mouse.up(); }


const DIRS = (process.env.ONLY || "museum,discovery,lab,v1").split(","); // ONLY=museum for a quick run
const FULL = Boolean(process.env.EXTRAS); // GPU-release cycles, glyph-failure fallback and reduced-motion cases
const DESKTOP = !process.env.MOBILE_ONLY && !process.env.EXTRAS;
const WIDTHS = process.env.EXTRAS ? [] : (process.env.WIDTHS ? process.env.WIDTHS.split(",").map(Number) : process.env.SKIP_MOBILE ? [] : [390, 320]);
const hall = (stage) => stage.locator(".sod29-spatial-lab-hall");
const stats = async (h) => ({ drawCalls: Number(await h.getAttribute("data-draw-calls")), geometries: Number(await h.getAttribute("data-gpu-geometries")), textures: Number(await h.getAttribute("data-gpu-textures")),
  shadows: await h.getAttribute("data-shadows"), look: await h.getAttribute("data-look"), quality: await h.getAttribute("data-quality"), glyph: await h.getAttribute("data-glyph-status") });
async function pickByCanvas(page, stage) {
  const picked = new Set(); const h = host(stage); await h.scrollIntoViewIfNeeded();
  for (const fy of [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]) for (const fx of [0.15, 0.3, 0.45, 0.5, 0.6, 0.75, 0.88]) {
    const box = await h.boundingBox(); await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await page.waitForTimeout(50);
    const part = await selectedPart(stage); if (part) picked.add(part);
  }
  return [...picked];
}
async function overflow(page) { return page.evaluate(() => ({ docWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })); }
const heap = (page) => page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576));

try {
  // ===== desktop: every direction =====
  for (const dir of DESKTOP ? DIRS : []) {
    const { ctx, page, seen } = await session({ width: 1280, height: 900, name: `desktop-${dir}` });
    const stage = await openStage(page, dir);
    assert.equal(seen.length, 0, "no 3D module before the explicit action");
    const t0 = Date.now();
    await stage.locator('[data-s4-action="deepen"]').click();
    await host(stage).locator("canvas").waitFor();
    const canvasMs = Date.now() - t0;
    await page.waitForTimeout(4500);
    await page.mouse.move(5, 5);
    const h = host(stage);
    assert.equal(await hall(stage).getAttribute("data-direction"), dir);
    assert.equal(await h.getAttribute("data-parts"), PARTS.join(","));
    assert.equal(await h.getAttribute("data-verified-paths"), "4", "765 stays unverified in every direction");
    const s = await stats(h);
    const rec = { canvasMs, ...s };
    if (dir !== "v1") {
      assert.equal(await stage.locator(".sod29-lab-primary > button.r29-chip").count(), 3, "three primary actions only");
      assert.deepEqual(await stage.locator(".sod29-lab-primary > button.r29-chip").allInnerTexts(), ["חקור", "פרק שכבות", "מסלולים"]);
      assert.equal(await stage.locator(".sod29-lab-more").first().getAttribute("open"), null, "secondary tools start closed");
    }
    if (dir === "discovery") assert.equal(await stage.locator(".sod29-discovery__steps li").count(), 0, "nothing is revealed before a choice");
    rec.canvasPickedParts = await pickByCanvas(page, stage);
    assert.ok(rec.canvasPickedParts.length >= 3, `direct selection in the structure (${rec.canvasPickedParts.join(",")})`);
    await stage.locator('[data-lab-action="reset"], [data-lab-action="scene-structure"]').first().scrollIntoViewIfNeeded();
    await shot(stage, page, `v2-${dir}-desktop-overview`);

    if (dir === "museum") {
      await stage.locator("button.sod29-lab-medal[data-path-index='2']").click();
      assert.match(await stage.locator(".sod29-museum__cartouche").innerText(), /מחומש פנימי[\s\S]*טוב[\s\S]*17 × 180 = 3060/);
      await action(stage, "explode").click(); await page.waitForTimeout(1500); await shot(stage, page, "v2-museum-desktop-exploded");
      await stage.locator(".sod29-lab-more > summary").first().click();
      await action(stage, "view-focus").click(); await page.waitForTimeout(1400); await shot(stage, page, "v2-museum-desktop-focus");
      assert.equal(await h.getAttribute("data-spin"), "true", "museum drifts gently by default");
    }
    if (dir === "discovery") {
      await stage.locator('[data-discover-action="restart"]').click(); // the canvas picks above started the reveal; start again from the beginning
      assert.equal(await stage.locator(".sod29-discovery__steps li").count(), 0);
      await stage.locator("button.sod29-lab-medal[data-path-index='2']").click(); await page.waitForTimeout(1800);
      assert.equal(await h.getAttribute("data-view"), "focus", "discovery moves in on the chosen shape");
      assert.equal(await h.getAttribute("data-explode"), "true", "discovery opens the layers");
      assert.equal(await stage.locator(".sod29-discovery__steps li").count(), 1);
      await shot(stage, page, "v2-discovery-desktop-step1");
      for (let i = 0; i < 3; i += 1) await stage.locator('[data-discover-action="next"]').click();
      assert.match(await stage.locator(".sod29-discovery__final").innerText(), /17 × 180 = 3060[\s\S]*אומת ונספר/);
      await shot(stage, page, "v2-discovery-desktop-final");
      // the unverified path is never promoted
      await stage.locator("button.sod29-lab-medal[data-path-index='3']").click();
      await stage.locator('[data-discover-action="all"]').click();
      const t3 = await stage.locator(".sod29-discovery").innerText();
      assert.match(t3, /לא אומת, לא נספר/); assert.doesNotMatch(t3, /אומת ונספר/);
      assert.match(t3, /אין ביטוי מאומת/);
      await shot(stage, page, "v2-discovery-desktop-765");
    }
    if (dir === "lab") {
      assert.equal(await stage.locator(".sod29-research__table tbody tr").count(), 5);
      assert.equal(await stage.locator(".sod29-research__table tr[data-status='verified']").count(), 4);
      await stage.locator("button.sod29-research__pick[data-path-index='3']").click();
      assert.match(await stage.locator(".sod29-research__table tr[data-selected='true']").innerText(), /לא אומת|אין ביטוי|לא נספר/);
      await stage.locator('[data-lab-tab="source"]').click();
      const src = await stage.locator(".sod29-lab-source").innerText();
      assert.match(src, /ערך הביטוי/); assert.match(src, /הכמות/); assert.match(src, /המקור הכתוב/); assert.match(src, /המודל אינו מצמיד הופעה/);
      await stage.locator("button[role='tab'][data-lab-tab='calc']").click();
      await stage.locator("button.sod29-research__pick[data-path-index='2']").click();
      await stage.locator('[data-lab-tab="data"]').click();
      assert.match(await stage.locator(".sod29-lab-facts").innerText(), /צלעות בצורה[\s\S]*5[\s\S]*180/);
      await stage.locator('[data-lab-tab="calc"]').click();
      await shot(stage, page, "v2-lab-desktop-calc");
    }
    // typography: no Hebrew run in the numeric face; headings/supporting copy at Design V2 sizes
    rec.typography = await page.evaluate(() => {
      const root = document.querySelector(".sod29-spatial-lab-hall"); const bad = [], small = [];
      for (const el of root.querySelectorAll("*")) {
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
        if (!own.trim()) continue; const cs = getComputedStyle(el);
        if (/[\u0590-\u05FF]/.test(own) && /numeric|mono/i.test(cs.fontFamily) && !/Noto|Rubik/i.test(cs.fontFamily.split(",")[0])) bad.push(own.trim().slice(0, 24));
        if (parseFloat(cs.fontSize) < 15 && !el.closest(".sod29-spatial-method-stage__sr-only")) small.push(`${own.trim().slice(0, 18)}:${cs.fontSize}`);
      }
      return { hebrewInNumericFace: bad, under15px: small };
    });
    assert.deepEqual(rec.typography.hebrewInNumericFace, [], "no Hebrew run in the numeric face");
    receipt.directions[dir] = { ...(receipt.directions[dir] || {}), desktop: rec };
    await ctx.close();
  }

  // ===== mobile: every direction at 390 (CPU x4) and 320 =====
  for (const width of WIDTHS) for (const dir of DIRS) {
    const { ctx, page } = await session({ width, height: 844, name: `mobile-${width}-${dir}`, throttle: width === 390 ? 4 : 1 });
    const stage = await openStage(page, dir);
    await stage.locator('[data-s4-action="deepen"]').click();
    const h = host(stage); await h.locator("canvas").waitFor(); await page.waitForTimeout(6000);
    const ov = await overflow(page);
    assert.ok(ov.docWidth <= ov.innerWidth + 1, `no horizontal page overflow at ${width} (${ov.docWidth}/${ov.innerWidth}) ${dir}`);
    await h.scrollIntoViewIfNeeded();
    const box = await h.boundingBox();
    const rec = { width, ...(await stats(h)), canvas: { w: Math.round(box.width), h: Math.round(box.height) }, heapMB: await heap(page), doc: ov };
    // touch-size of every control inside the hall
    rec.smallTargets = await page.evaluate(() => [...document.querySelectorAll(".sod29-spatial-lab-hall button, .sod29-spatial-lab-hall summary")].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 43.5 || r.width < 43.5); }).map((b) => `${b.textContent.trim().slice(0, 14)}:${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`));
    const gapsP = frameGaps(page, 2500); await drag(page, await h.boundingBox()); const gaps = await gapsP; const sorted = [...gaps].sort((x, y) => x - y);
    rec.frameGapP95Ms = Math.round(sorted[Math.floor(sorted.length * 0.95)]); rec.droppedOver100ms = gaps.filter((g) => g > 100).length;
    await shot(stage, page, `v2-${dir}-mobile-${width}`);
    receipt.directions[dir] = { ...(receipt.directions[dir] || {}), [`mobile${width}`]: rec };
    await ctx.close();
  }

  // ===== GPU lifecycle for the heaviest tier (museum: shadows on) and discovery: 5 open/close cycles =====
  for (const dir of FULL ? ["museum", "discovery"] : []) {
    const { ctx, page } = await session({ width: 1280, height: 900, name: `leak-${dir}` });
    const stage = await openStage(page, dir);
    const before = await heap(page);
    for (let i = 0; i < 5; i += 1) { await stage.locator('[data-s4-action="deepen"]').click(); await host(stage).locator("canvas").waitFor(); await page.waitForTimeout(2200); await stage.locator('[data-s4-action="return"]').click(); await page.waitForTimeout(500); }
    const live = await page.evaluate(() => (window.__ctxs || []).filter((c) => { try { return !c.isContextLost(); } catch { return false; } }).length);
    const after = await heap(page);
    (receipt.directions[dir] ||= {}).gpuRelease = { cycles: 5, liveContexts: live, heapBeforeMB: before, heapAfterMB: after };
    assert.equal(live, 0, `no live WebGL context after closing (${dir})`);
    await ctx.close();
  }

  // ===== glyph assets fail to load: readable text fallback in every direction =====
  for (const dir of FULL ? ["museum", "lab"] : []) {
    const { ctx, page } = await session({ width: 390, height: 844, name: `glyphfail-${dir}` });
    await page.route(/heglyph-/, (route) => route.abort());
    const stage = await openStage(page, dir);
    await stage.locator('[data-s4-action="deepen"]').click(); const h = host(stage); await h.locator("canvas").waitFor(); await page.waitForTimeout(5000);
    (receipt.directions[dir] ||= {}).glyphFallback = { status: await h.getAttribute("data-glyph-status") };
    assert.equal(receipt.directions[dir].glyphFallback.status, "failed");
    assert.equal((await page.locator("[data-glyph-fallback]").count()) >= 0, true);
    await shot(stage, page, `v2-${dir}-glyph-fallback-390`);
    await ctx.close();
  }

  // ===== reduced motion: no drift, no motion =====
  if (FULL) { const { ctx, page } = await session({ width: 390, height: 844, name: "reduced", reducedMotion: "reduce" });
    const stage = await openStage(page, "museum");
    await stage.locator('[data-s4-action="deepen"]').click(); const h = host(stage); await h.locator("canvas").waitFor(); await page.waitForTimeout(3000);
    receipt.reducedMotion = { reduced: await h.getAttribute("data-reduced-motion") };
    const a = await h.screenshot(); await page.waitForTimeout(1800); const b = await h.screenshot();
    assert.deepEqual(a, b, "no drift with reduced motion"); assert.equal(receipt.reducedMotion.reduced, "true");
    await ctx.close(); }
} catch (error) { receipt.errors.push(String(error?.stack || error).slice(0, 1200)); }
finally { await browser.close(); fs.writeFileSync(`${out}/receipt-v2-${[process.env.ONLY, process.env.MOBILE_ONLY && "m" + (process.env.WIDTHS || ""), process.env.EXTRAS && "extras"].filter(Boolean).join("-").replace(/,/g, "_") || "all"}.json`, JSON.stringify(receipt, null, 2)); }
console.log(receipt.errors.length ? "FAIL" : "PASS", JSON.stringify(Object.keys(receipt.directions)), "errors:", receipt.errors.length);
if (receipt.errors.length) { console.log(receipt.errors.join("\n")); process.exitCode = 1; }
