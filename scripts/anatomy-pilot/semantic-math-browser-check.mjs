// Semantic Mathematical Understanding: operations drawn from the typed operation (registry sign, roles, origins) on the EXISTING World spatial cards — 620, 3060, 910, 1020. SwiftShader.
// Read-only: canonical read RPCs only. Usage: BASE=http://localhost:4180 OUT=<dir> node scripts/anatomy-pilot/semantic-math-browser-check.mjs
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



const cardLocator = (page, slug) => page.locator(`#spatial-${slug}`);
async function openCard(page, slug, lab = "museum") {
  await page.goto(`${base}/world?view=explore&kind=spatial&lab=${lab}#spatial-${slug}`, { waitUntil: "domcontentloaded" });
  const card = cardLocator(page, slug); await card.waitFor(); await card.scrollIntoViewIfNeeded();
  return card;
}
const openStageIn = async (page, card) => {
  await card.locator('[data-convergence-card] button').first().click();
  const stage = card.locator(".is-convergence"); await stage.waitFor();
  await page.waitForFunction((id) => { const el = document.querySelector(`#${id} .is-convergence`); const state = el?.getAttribute("data-state"); return state === "ready" || state === "loading" && el.querySelectorAll('[data-status="pending"]').length === 0; }, `spatial-${card._slug || ""}`, { timeout: 45000 }).catch(() => {});
  await page.waitForFunction(() => document.querySelector(".is-convergence")?.getAttribute("data-state") === "ready", null, { timeout: 60000 });
  return stage;
};
const record = {};

try {
  { // ===== 620 (museum): the icosahedron with its operation drawn from the registry =====
    const { ctx, page } = await session({ width: 1280, height: 900, name: "620", reducedMotion: "reduce" });
    const card = await openCard(page, "keter-esrimon-620", "museum"); const stage = await openStageIn(page, card);
    await stage.locator('[data-s4-action="deepen"]').click(); await host(stage).locator("canvas").waitFor(); await page.waitForTimeout(3500);
    assert.deepEqual(await stage.locator(".sod29-lab-medal__qty").allInnerTexts(), ["× 20"]);
    assert.match(await stage.locator(".sod29-museum__cartouche").innerText(), /31 × 20 = 620/);
    assert.match(await host(stage).locator(".sod29-spatial-method-stage__sr-only li").first().textContent(), /אל \(31\) × 20 = 620/);
    await shot(stage, page, "sem-620-museum");
    record.r620 = { medals: ["× 20"], cartouche: "31 × 20 = 620" };
    await ctx.close();
  }
  { // ===== 3060 (lab): five paths, each with its own tag; 765 unverified =====
    const { ctx, page } = await session({ width: 1280, height: 900, name: "3060", reducedMotion: "reduce" });
    const card = await openCard(page, "yesharim-cube-3060", "lab"); const stage = await openStageIn(page, card);
    await stage.locator('[data-s4-action="deepen"]').click(); await host(stage).locator("canvas").waitFor(); await page.waitForTimeout(3500);
    const rows = await stage.locator(".sod29-research__table tbody tr").evaluateAll((trs) => trs.map((tr) => ({ status: tr.dataset.status, text: tr.innerText.replace(/\s+/g, " ") })));
    assert.equal(rows.length, 5); assert.equal(rows.filter((r) => r.status === "verified").length, 4); assert.equal(rows[3].status, "no_phrase");
    await stage.locator("button.sod29-research__pick[data-path-index='3']").click();
    assert.match(await stage.locator(".sod29-research__eq").innerText(), /765 × 4 = 3060/);
    await stage.locator('[data-lab-tab="source"]').click();
    assert.match(await stage.locator(".sod29-lab-source").innerText(), /לא אומת|אין ביטוי מאומת/);
    await shot(stage, page, "sem-3060-lab-765");
    record.r3060 = { rows: rows.length, verified: 4 };
    await ctx.close();
  }
  { // ===== 910 (the add path): the sign is "+" from the registry, two expressions, two ledgers, both paths verified by the engine =====
    const { ctx, page } = await session({ width: 1280, height: 900, name: "910", reducedMotion: "reduce" });
    const card = await openCard(page, "raza-deshabbat-910", "v1"); const stage = await openStageIn(page, card);
    const rows = await stage.locator(".sod29-spatial-convergence__paths li").evaluateAll((lis) => lis.map((li) => ({ op: li.dataset.operation, status: li.dataset.status, sign: li.querySelector(".sod29-spatial-convergence__times")?.textContent })));
    assert.deepEqual(rows.map((r) => [r.op, r.sign]), [["add", "+"], ["multiply", "×"]], "each path draws ITS operation's sign");
    assert.deepEqual(rows.map((r) => r.status), ["verified", "verified"], "both derivations verified by the engine");
    assert.match(await stage.locator(".sod29-spatial-convergence__focus strong").first().innerText(), /208 \+ 702 = 910/);
    assert.equal(await stage.locator(".sod29-spatial-convergence__focus details.sod29-spatial-convergence__ledger").count(), 2, "a sum of two expressions has two ledgers");
    await shot(stage, page, "sem-910-stage");
    await stage.locator("button[data-path-index='1']").click();
    assert.match(await stage.locator(".sod29-spatial-convergence__focus strong").first().innerText(), /70 × 13 = 910/);
    await stage.locator('[data-s4-action="deepen"]').click(); await page.waitForTimeout(2500);
    assert.equal(await stage.locator('[data-renderer="r3f"][data-scene="convergence"]').count(), 1, "the paths scene opens for a non-drawn family");
    record.r910 = { rows };
    await ctx.close();
  }
  { // ===== shelf breakdown for every card: roles, origins, unsupported labelling =====
    const { ctx, page } = await session({ width: 1280, height: 900, name: "shelf", reducedMotion: "reduce" });
    const out = {};
    for (const slug of ["hashgacha-pratit-1020", "raza-deshabbat-910", "keter-esrimon-620", "yesharim-cube-3060"]) {
      const card = await openCard(page, slug, "museum");
      const details = card.locator(`[data-operation-breakdown="${slug}"]`); await details.waitFor(); await details.locator("summary").click();
      out[slug] = (await details.innerText()).replace(/\s+/g, " ");
    }
    assert.match(out["hashgacha-pratit-1020"], /כפל: 6 × 10 × טוב \(17\) = 1020/); assert.match(out["hashgacha-pratit-1020"], /גיאומטריה 6 \(cube geometry\)/); assert.match(out["hashgacha-pratit-1020"], /כמות 10 \(מקור המודל \(assignment\)\)/); assert.match(out["hashgacha-pratit-1020"], /ביטוי טוב = 17/);
    assert.match(out["raza-deshabbat-910"], /חיבור: רזא \(208\) \+ שבת \(702\) = 910/); assert.match(out["raza-deshabbat-910"], /כפל: סוד \(70\) × אחד \(13\) = 910/);
    assert.match(out["keter-esrimon-620"], /כפל: אל \(31\) × 20 = 620/); assert.match(out["keter-esrimon-620"], /גיאומטריה 20 \(icosahedron geometry\)/);
    assert.match(out["yesharim-cube-3060"], /765 × 4 = 3060/);
    // 1020 is the cube family's first model (one operation carried by the cube): it now has the structure view, with the three-factor product drawn from the typed operation
    const c1020 = await openCard(page, "hashgacha-pratit-1020", "museum");
    assert.equal(await c1020.locator("button", { hasText: "פתח המחשת המבנה" }).count(), 1, "1020 opens the cube structure view");
    assert.equal(await page.locator('[data-convergence-card="hashgacha-pratit-1020"] .is-convergence').count(), 0, "the stage itself opens only on the explicit action");
    record.shelf = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.slice(0, 300)]));
    await ctx.close();
  }
} catch (error) { receipt.errors.push(String(error?.stack || error).slice(0, 1400)); }
finally { await browser.close(); receipt.record = record; fs.writeFileSync(`${out}/receipt-semantic.json`, JSON.stringify(receipt, null, 2)); }
console.log(receipt.errors.length ? "FAIL" : "PASS", JSON.stringify(Object.keys(record)), "errors:", receipt.errors.length);
if (receipt.errors.length) { console.log(receipt.errors.join("\n")); process.exitCode = 1; }
