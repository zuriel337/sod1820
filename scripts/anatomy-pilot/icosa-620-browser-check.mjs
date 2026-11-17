// Shape family 2 (icosahedron · עשרימון 620) in the Royal lab: the same directions and engine, opened from the EXISTING World spatial card. SwiftShader.
// Read-only: canonical read RPCs only. Usage: BASE=http://localhost:4180 OUT=<dir> node scripts/anatomy-pilot/icosa-620-browser-check.mjs
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
const PARTS = ["solid"];

async function session({ width, height, reducedMotion = process.env.REDUCED ? "reduce" : "no-preference", throttle = 1, name, noWebgl = false, dsf = 2 }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, reducedMotion, ignoreHTTPSErrors: !!process.env.HTTPS_PROXY });
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
  await page.goto(`${base}/world?view=explore&kind=spatial&lab=${lab}#spatial-keter-esrimon-620`, { waitUntil: "domcontentloaded" }); // direction chosen by link
  const open = page.locator('[data-convergence-card="keter-esrimon-620"] button', { hasText: "פתח המחשת המבנה" });
  await open.scrollIntoViewIfNeeded(); await open.click();
  const stage = page.locator('[data-convergence-card="keter-esrimon-620"] .is-convergence');
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
  // A software GL renderer cannot service a continuously animating scene AND a screenshot at 2x: pause motion for the capture (reduced-motion media), then restore.
  // REDUCED=1 runs the whole context with reduced motion instead (static captures of the rich tier).
  if (!process.env.REDUCED) { await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForTimeout(600); }
  try { await stage.screenshot({ path: `${out}/${name}.png`, timeout: 25000 }); }
  catch { const box = await stage.boundingBox(); const off = await page.evaluate(() => ({ x: scrollX, y: scrollY })); await page.screenshot({ path: `${out}/${name}.png`, clip: { x: box.x + off.x, y: Math.max(0, box.y + off.y), width: box.width, height: Math.min(box.height, 8000) }, fullPage: true, timeout: 60000 }); }
  if (!process.env.REDUCED) await page.emulateMedia({ reducedMotion: "no-preference" });
}
const selectedPart = async (stage) => host(stage).getAttribute("data-selected-part");
async function frameGaps(page, ms) { return page.evaluate((span) => new Promise((resolve) => { const gaps = []; let last = performance.now(); const end = last + span; const tick = (t) => { gaps.push(t - last); last = t; if (t < end) requestAnimationFrame(tick); else resolve(gaps); }; requestAnimationFrame(tick); }), ms); }
async function drag(page, box) { const cx = box.x + box.width / 2, cy = box.y + box.height / 2; await page.mouse.move(cx, cy); await page.mouse.down(); for (let i = 1; i <= 14; i += 1) { await page.mouse.move(cx + i * 6, cy + i * 2); await page.waitForTimeout(30); } await page.mouse.up(); }



const DIRS = (process.env.ONLY || "museum,discovery,lab,v1").split(",");
const FULL = Boolean(process.env.EXTRAS);
const DESKTOP = !process.env.MOBILE_ONLY && !process.env.EXTRAS;
const WIDTHS = process.env.EXTRAS ? [] : (process.env.WIDTHS ? process.env.WIDTHS.split(",").map(Number) : process.env.SKIP_MOBILE ? [] : [390, 320]);
const hall = (stage) => stage.locator(".sod29-spatial-lab-hall");
const stats = async (h) => ({ drawCalls: Number(await h.getAttribute("data-draw-calls")), geometries: Number(await h.getAttribute("data-gpu-geometries")), textures: Number(await h.getAttribute("data-gpu-textures")),
  shadows: await h.getAttribute("data-shadows"), quality: await h.getAttribute("data-quality"), glyph: await h.getAttribute("data-glyph-status") });
const selectedFace = (h) => h.getAttribute("data-selected-face");
async function pickFacesByCanvas(page, stage) {
  const h = host(stage); await h.scrollIntoViewIfNeeded(); const faces = new Set();
  for (const fy of [0.3, 0.4, 0.5, 0.6, 0.7]) for (const fx of [0.25, 0.4, 0.5, 0.6, 0.75]) {
    const box = await h.boundingBox(); await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await page.waitForTimeout(60);
    const f = await selectedFace(h); if (f) faces.add(f);
  }
  return [...faces];
}
const overflow = (page) => page.evaluate(() => ({ docWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
const heap = (page) => page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576));

try {
  for (const dir of DESKTOP ? DIRS : []) {
    const { ctx, page, seen } = await session({ width: 1280, height: 900, name: `desktop-${dir}` });
    const stage = await openStage(page, dir);
    assert.equal(seen.length, 0, "no 3D module before the explicit action");
    assert.match(await stage.locator(".sod29-spatial-method-stage__head").first().innerText(), /המחשת מבנה/, "a single-operation solid is a structure view, not a convergence");
    const t0 = Date.now();
    await stage.locator('[data-s4-action="deepen"]').click();
    await host(stage).locator("canvas").waitFor(); const canvasMs = Date.now() - t0;
    await page.waitForTimeout(4500); await page.mouse.move(5, 5);
    const h = host(stage);
    assert.equal(await h.getAttribute("data-family"), "icosahedron");
    assert.equal(await h.getAttribute("data-face-count"), "20");
    assert.equal(await h.getAttribute("data-verified-paths"), "1"); assert.equal(await h.getAttribute("data-total-paths"), "1");
    assert.equal(await hall(stage).getAttribute("data-direction"), dir);
    const rec = { canvasMs, ...(await stats(h)) };
    if (dir !== "v1") {
      assert.deepEqual(await stage.locator(".sod29-lab-primary > button.r29-chip").allInnerTexts(), ["חקור", "פרק שכבות", "מסלולים"]);
    }
    if (dir === "discovery") assert.equal(await stage.locator(".sod29-discovery__steps li").count(), 0, "nothing is revealed before a choice");
    rec.facesPicked = await pickFacesByCanvas(page, stage);
    assert.ok(rec.facesPicked.length >= 3, `faces are selectable directly in the solid (${rec.facesPicked.join(",")})`);
    if (dir !== "v1") {
      const before = await h.getAttribute("data-explode"); const ex = action(stage, "explode"); await ex.focus();
      await page.keyboard.press("Enter"); await page.waitForTimeout(300); assert.notEqual(await h.getAttribute("data-explode"), before);
      await page.keyboard.press("Enter"); await page.waitForTimeout(300); assert.equal(await h.getAttribute("data-explode"), before);
      rec.keyboard = { explodeToggledByEnter: true };
    }
    await shot(stage, page, `ico-${dir}-desktop-overview`);
    if (dir === "museum") {
      await action(stage, "explode").click(); await page.waitForTimeout(1500); await shot(stage, page, "ico-museum-desktop-exploded");
      await stage.locator(".sod29-lab-more > summary").first().click(); await action(stage, "view-focus").click(); await page.waitForTimeout(1400); await shot(stage, page, "ico-museum-desktop-focus-face");
      assert.match(await stage.locator(".sod29-museum__cartouche").innerText(), /עשרימון[\s\S]*אל[\s\S]*31 × 20 = 620/);
    }
    if (dir === "discovery") {
      await stage.locator('[data-discover-action="restart"]').click();
      await stage.locator("button.sod29-lab-medal[data-path-index='0']").click(); await page.waitForTimeout(1800);
      assert.equal(await h.getAttribute("data-explode"), "true", "discovery opens the layers (the faces)");
      for (let i = 0; i < 3; i += 1) await stage.locator('[data-discover-action="next"]').click();
      assert.match(await stage.locator(".sod29-discovery__final").innerText(), /31 × 20 = 620[\s\S]*אומת ונספר/);
      await shot(stage, page, "ico-discovery-desktop-final");
    }
    if (dir === "lab") {
      assert.equal(await stage.locator(".sod29-research__table tbody tr").count(), 1);
      await stage.locator('[data-lab-tab="source"]').click();
      const src = await stage.locator(".sod29-lab-source").innerText();
      assert.match(src, /icosahedron geometry/); assert.match(src, /המקור הכתוב/);
      await stage.locator('[data-lab-tab="data"]').click();
      assert.match(await stage.locator(".sod29-lab-facts").innerText(), /פאות בצורה[\s\S]*20/);
      await stage.locator('[data-lab-tab="calc"]').click(); await shot(stage, page, "ico-lab-desktop-calc");
    }
    rec.typography = await page.evaluate(() => {
      const root = document.querySelector(".sod29-spatial-lab-hall"); const bad = [], small = [];
      for (const el of root.querySelectorAll("*")) {
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(""); if (!own.trim()) continue; const cs = getComputedStyle(el);
        if (/[\u0590-\u05FF]/.test(own) && /numeric|mono/i.test(cs.fontFamily) && !/Noto|Rubik/i.test(cs.fontFamily.split(",")[0])) bad.push(own.trim().slice(0, 24));
        if (parseFloat(cs.fontSize) < 15 && !el.closest(".sod29-spatial-method-stage__sr-only, [aria-hidden='true']")) small.push(`${own.trim().slice(0, 18)}:${cs.fontSize}`);
      }
      return { hebrewInNumericFace: bad, under15px: small };
    });
    assert.deepEqual(rec.typography.hebrewInNumericFace, []); assert.deepEqual(rec.typography.under15px, [], "no visible text below the Design V2 minimum");
    (receipt.directions[dir] ||= {}).desktop = rec;
    await ctx.close();
  }

  for (const width of WIDTHS) for (const dir of DIRS) {
    const { ctx, page } = await session({ width, height: 844, name: `mobile-${width}-${dir}`, throttle: Number(process.env.THROTTLE) || (width === 390 ? 4 : 1) });
    const stage = await openStage(page, dir);
    await stage.locator('[data-s4-action="deepen"]').click();
    const h = host(stage); await h.locator("canvas").waitFor(); await page.waitForTimeout(6000);
    const ov = await overflow(page); assert.ok(ov.docWidth <= ov.innerWidth + 1, `no horizontal overflow at ${width} (${dir})`);
    await h.scrollIntoViewIfNeeded(); const box = await h.boundingBox();
    const rec = { width, ...(await stats(h)), canvas: { w: Math.round(box.width), h: Math.round(box.height) }, heapMB: await heap(page) };
    rec.clipped = await page.evaluate(() => { const hallEl = document.querySelector(".sod29-spatial-lab-hall"), hr = hallEl.getBoundingClientRect(); return [...hallEl.querySelectorAll("*")].filter((el) => { const r = el.getBoundingClientRect(); const closed = el.closest("details:not([open])"); return r.width > 0 && !(closed && !el.closest("summary")) && !el.closest(".sod29-spatial-method-stage__sr-only, .sod29-research__scroll, canvas") && (r.left < hr.left - 1 || r.right > hr.right + 1 || r.left < -1 || r.right > window.innerWidth + 1); }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`).slice(0, 8); });
    assert.deepEqual(rec.clipped, [], `nothing clipped at ${width} (${dir})`);
    rec.smallTargets = await page.evaluate(() => [...document.querySelectorAll(".sod29-spatial-lab-hall button, .sod29-spatial-lab-hall summary")].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && (r.height < 43.5 || r.width < 43.5); }).map((b) => b.textContent.trim().slice(0, 14)));
    assert.deepEqual(rec.smallTargets, [], "touch targets >= 44px");
    const gapsP = frameGaps(page, 2500); await drag(page, await h.boundingBox()); const gaps = await gapsP; const sorted = [...gaps].sort((x, y) => x - y);
    rec.frameGapP95Ms = Math.round(sorted[Math.floor(sorted.length * 0.95)]); rec.droppedOver100ms = gaps.filter((g) => g > 100).length;
    await shot(stage, page, `ico-${dir}-mobile-${width}`);
    ((receipt.directions[dir] ||= {})[`mobile${width}`] = rec);
    await ctx.close();
  }

  if (FULL) {
    for (const dir of ["museum", "discovery"]) {
      const { ctx, page } = await session({ width: 1280, height: 900, name: `leak-${dir}` });
      const stage = await openStage(page, dir); const before = await heap(page);
      for (let i = 0; i < 5; i += 1) { await stage.locator('[data-s4-action="deepen"]').click(); await host(stage).locator("canvas").waitFor(); await page.waitForTimeout(2200); await stage.locator('[data-s4-action="return"]').click(); await page.waitForTimeout(500); }
      const live = await page.evaluate(() => (window.__ctxs || []).filter((c) => { try { return !c.isContextLost(); } catch { return false; } }).length);
      (receipt.directions[dir] ||= {}).gpuRelease = { cycles: 5, liveContexts: live, heapBeforeMB: before, heapAfterMB: await heap(page) };
      assert.equal(live, 0, `no live WebGL context after closing (${dir})`); await ctx.close();
    }
    for (const dir of ["museum", "lab"]) {
      const { ctx, page } = await session({ width: 390, height: 844, name: `glyphfail-${dir}` });
      const stage = await openStage(page, `${dir}&glyphs=text`);
      await stage.locator('[data-s4-action="deepen"]').click(); const h = host(stage); await h.locator("canvas").waitFor(); await page.waitForTimeout(5000);
      (receipt.directions[dir] ||= {}).glyphFallback = { status: await h.getAttribute("data-glyph-status") };
      assert.equal(receipt.directions[dir].glyphFallback.status, "failed"); await shot(stage, page, `ico-${dir}-glyph-fallback-390`); await ctx.close();
    }
    { const { ctx, page } = await session({ width: 390, height: 844, name: "reduced", reducedMotion: "reduce" });
      const stage = await openStage(page, "museum"); await stage.locator('[data-s4-action="deepen"]').click(); const h = host(stage); await h.locator("canvas").waitFor(); await page.waitForTimeout(3000);
      const a = await h.screenshot(); await page.waitForTimeout(1800); const b = await h.screenshot(); assert.deepEqual(a, b, "no drift with reduced motion"); receipt.reducedMotion = { reduced: await h.getAttribute("data-reduced-motion") }; await ctx.close(); }
  }
} catch (error) { receipt.errors.push(String(error?.stack || error).slice(0, 1200)); }
finally { await browser.close(); fs.writeFileSync(`${out}/receipt-ico-${[process.env.ONLY, process.env.MOBILE_ONLY && "m" + (process.env.WIDTHS || ""), process.env.EXTRAS && "extras"].filter(Boolean).join("-").replace(/,/g, "_") || "all"}.json`, JSON.stringify(receipt, null, 2)); }
console.log(receipt.errors.length ? "FAIL" : "PASS", JSON.stringify(Object.keys(receipt.directions)), "errors:", receipt.errors.length);
if (receipt.errors.length) { console.log(receipt.errors.join("\n")); process.exitCode = 1; }
