// The inner exploration of the 1020 cube — end-to-end walkthrough in a real browser (SwiftShader). Read-only: canonical read RPCs only; the PDF itself is never fetched.
//   REVIEW=http://localhost:4181  a build WITH the book-publication review flag (the Sefer Yetzirah reader exists): the full walkthrough
//   HOSTED=http://localhost:4180  the public-reading-like build (flag OFF — what the protected Preview serves): the book doorways are locked, the rest works
// Usage: REVIEW=… HOSTED=… OUT=<dir> node scripts/anatomy-pilot/cube-journey-browser-check.mjs        (CASE=walk|hosted|nogl|motion|mobile|leak to run one part)
import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const REVIEW = process.env.REVIEW || "http://localhost:4181", HOSTED = process.env.HOSTED || "http://localhost:4180";
const out = process.env.OUT || "/tmp/cube-journey";
fs.mkdirSync(out, { recursive: true });
const ONLY = process.env.CASE ? process.env.CASE.split(",") : ["walk", "hosted", "nogl", "motion", "mobile", "leak"];
const receipt = { cases: {}, errors: [] };
const browser = await chromium.launch({ args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined });
const RPCS = new Set(["gematria_method_trace", "fn_method_profile", "fn_method_value", "gematria_api", "world_group_source_arrivals_v2", "fn_zero_scale", "fn_verses_by_gematria"]);
const SLUG = "hashgacha-pratit-1020";

async function session(base, { width = 1280, height = 900, reducedMotion = "reduce", noWebgl = false, dsf = 1, name = "s", throttle = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, reducedMotion, ignoreHTTPSErrors: !!process.env.HTTPS_PROXY });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => receipt.errors.push(`${name}: ${e.message}`));
  const requests = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (u.origin === base || /supabase|vercel/.test(u.hostname)) requests.push(`${r.method()} ${u.hostname === new URL(base).hostname ? u.pathname : u.hostname + u.pathname}`); });
  await page.addInitScript((blockWebgl) => {
    window.__ctxs = []; const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) { if (blockWebgl && /webgl/i.test(type)) return null; const c = orig.call(this, type, ...a); if (c && /webgl/i.test(type) && !window.__ctxs.includes(c)) window.__ctxs.push(c); return c; };
  }, noWebgl);
  await page.route("**/*", async (route) => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === base) { const r = req.isNavigationRequest() && (url.pathname.startsWith("/2029/") || url.pathname.startsWith("/number/")) ? await page.request.get(`${base}/2029.html`) : await page.request.fetch(req); return route.fulfill({ response: r }); }
    if (/\.(woff2?|ttf)$/.test(url.pathname) || /googletagmanager|google-analytics|googleapis|gstatic/.test(url.hostname)) return route.abort();
    if (url.pathname.endsWith(".pdf")) return route.abort(); // the source PDF is never fetched here; the reader's own page chrome is what is checked
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) { const rpc = url.pathname.split("/").pop(); return RPCS.has(rpc) ? route.continue() : route.fulfill({ status: 403, contentType: "application/json", body: "{}" }); }
    return route.continue();
  });
  if (throttle > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle }); }
  return { ctx, page, requests };
}
const cardUrl = (base, extra = "") => `${base}/world?view=explore&kind=spatial&lab=museum${extra}#spatial-${SLUG}`;
async function openStage(page, base, extra = "") {
  await page.goto(cardUrl(base, extra), { waitUntil: "domcontentloaded" });
  const stage = page.locator(`[data-convergence-card="${SLUG}"] .is-convergence`);
  if (!(await stage.count())) {
    const open = page.locator(`[data-convergence-card="${SLUG}"] button`, { hasText: "פתח המחשת המבנה" });
    await open.scrollIntoViewIfNeeded(); await open.click();
  }
  await stage.waitFor();
  await page.waitForFunction(() => document.querySelector(".is-convergence")?.getAttribute("data-state") === "ready", null, { timeout: 45000 });
  return stage;
}
const host = (page) => page.locator('[data-renderer="r3f"][data-scene="structure"]');
const panel = (page) => page.locator("[data-cube-journey]");
const location_ = (page) => page.evaluate(() => ({ path: location.pathname, search: location.search, hash: location.hash }));
async function hideChrome(page) { await page.evaluate(() => { for (const el of document.querySelectorAll("body *")) { const p = getComputedStyle(el).position; if ((p === "fixed" || p === "sticky") && !el.querySelector(".is-convergence") && !el.querySelector("[data-cube-journey]")) el.style.visibility = "hidden"; } }); }
// hide=false for pages outside the lab (the frame's own controls — the exact-return button — must stay usable afterwards)
async function shot(page, name, target, hide = true) {
  if (hide) await hideChrome(page);
  const el = target || page.locator(`[data-convergence-card="${SLUG}"]`);
  await el.scrollIntoViewIfNeeded();
  let ok = false, last = null;
  for (let i = 0; i < 3 && !ok; i += 1) { try { await el.screenshot({ path: `${out}/${name}.png`, timeout: 25000 }); ok = true; } catch (e) { last = e; await page.waitForTimeout(1200); } }
  if (!ok) throw last;
}
const frameReturn = (page) => page.locator('button[aria-label="חזרה מדויקת"]:visible').first();
async function enterAndWait(page) {
  await page.locator("[data-cube-enter]").click();
  await host(page).waitFor(); await host(page).locator("canvas").waitFor();
  await page.waitForFunction(() => document.querySelector('[data-renderer="r3f"][data-scene="structure"]')?.getAttribute("data-inside") === "true");
  await panel(page).waitFor();
  await page.waitForTimeout(2500); // glyphs + the first inside frame
}
const doorsText = (page) => page.locator(".sod29-cube-journey__door").allInnerTexts();

try {
  // ============ the full walkthrough on a build that has the book reader ============
  if (ONLY.includes("walk")) {
    const { ctx, page, requests } = await session(REVIEW, { name: "walk" });
    const rec = { steps: [] };
    const step = (name, data = {}) => rec.steps.push({ name, ...data });
    const stage = await openStage(page, REVIEW);
    // 0) before: the cube as it was (outside) — the explicit entry exists, nothing is inside yet
    assert.equal(await page.locator("[data-cube-enter]").count(), 1); assert.match(await page.locator("[data-cube-enter]").innerText(), /היכנס לתוך הקובייה/);
    assert.equal(await panel(page).count(), 0, "not inside before the explicit action");
    await stage.locator('[data-s4-action="deepen"]').click(); await host(page).locator("canvas").waitFor(); await page.waitForTimeout(3500);
    assert.equal(await host(page).getAttribute("data-inside"), "false");
    await shot(page, "01-before-outside-overview", stage);
    // 1) enter: a distinct state (not zoom): inside attribute, open wall, breadcrumb, six faces, exit
    await page.locator("[data-cube-enter]").click();
    await page.waitForFunction(() => document.querySelector('[data-renderer="r3f"][data-scene="structure"]')?.getAttribute("data-inside") === "true");
    await panel(page).waitFor(); await page.waitForTimeout(2500);
    const inside = host(page);
    assert.equal(await inside.getAttribute("data-inside"), "true"); assert.equal(await inside.getAttribute("data-open-wall"), "0", "the wall behind the camera (opposite the default face 3) is the open doorway");
    assert.equal(await inside.getAttribute("data-inside-face"), "2");
    assert.match(await page.locator(".sod29-cube-journey__crumbs").innerText(), /קובייה 1020[\s\S]*בפנים/);
    assert.equal(await page.locator("[data-journey-face]").count(), 6); assert.equal(await page.locator("[data-journey-exit]").count(), 1);
    assert.match(await page.evaluate(() => location.search), /cube=in/);
    assert.equal(await page.locator(".sod29-cube-journey__context").count(), 0, "no doors until a face is chosen");
    await shot(page, "02-inside-no-face", stage); step("enter", { search: (await location_(page)).search });
    // 2) choose face 3 (DOM): URL, scene, breadcrumb, ONE contextual door set
    await page.locator('[data-journey-face="2"]').click(); await page.waitForTimeout(1500);
    assert.match((await location_(page)).search, /face=2/); assert.equal(await inside.getAttribute("data-inside-face"), "2"); assert.equal(await inside.getAttribute("data-selected-face"), "2");
    assert.match(await page.locator(".sod29-cube-journey__crumbs").innerText(), /פאה 3 מתוך 6/);
    const doors = await doorsText(page); assert.equal(doors.length, 7, `seven doorways (${doors.length})`);
    assert.match(doors.join("\n"), /אמת «טוב» = 17 במנוע/); assert.match(doors.join("\n"), /פתח את המספר 17/); assert.match(doors.join("\n"), /המשך ל־3060/);
    assert.match(await page.locator(".sod29-cube-journey__lede").innerText(), /אינן ממצאים נפרדים|לא ממצאים נפרדים/);
    await shot(page, "03-inside-face3-doors", stage); step("face", { doors: doors.length });
    // 2b) a face picked IN the scene (canvas click) goes through the same controlled state
    const box = await inside.boundingBox(); const seen = new Set();
    for (const fy of [0.35, 0.5, 0.65]) for (const fx of [0.3, 0.5, 0.7]) { await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await page.waitForTimeout(160); const f = await inside.getAttribute("data-selected-face"); if (f) seen.add(f); }
    assert.ok(seen.size >= 1, "a wall is selectable from inside the scene"); step("canvas-pick", { faces: [...seen] });
    await page.locator('[data-journey-face="2"]').click(); await page.waitForTimeout(800);
    // 3) verify 'טוב' = 17 with the canonical regular trace (the existing ledger)
    await page.locator('#cube-door-verify button').click();
    await page.locator("#cube-door-verify-body").waitFor();
    const verifyText = await page.locator("#cube-door-verify").innerText();
    assert.match(verifyText, /אומת במנוע: טוב = 17 \(רגיל\)/); assert.ok(requests.some((r) => /gematria_method_trace/.test(r)), "the canonical engine was asked");
    await shot(page, "04-verify-17", page.locator("#cube-journey")); step("verify", { engineCalled: true });
    // 3b) the cited Zvi calculation
    await page.locator('#cube-door-zvi button').click(); await page.locator("#cube-door-zvi-body").waitFor();
    assert.match(await page.locator("#cube-door-zvi-body").innerText(), /6 × 10 × 17 = 1020[\s\S]*לא מזהה ערוץ ציבורי/);
    // 4) Number door → frame exact return restores the same face and focuses the door
    const zviSource = (await page.locator("#cube-door-zvi-body").innerText());
    assert.doesNotMatch(zviSource, /channel_updates:|whatsapp/i, "no private source row is exposed");
    await page.locator('[data-journey-link="number"]').click();
    await page.waitForURL(/\/2029\/number\/17/); await page.waitForTimeout(1500);
    const back = frameReturn(page); await back.waitFor();
    assert.equal(await back.isDisabled(), false, "the frame offers the exact return"); assert.match((await back.getAttribute("title")) || "", /חזרה לקובייה 1020 · פאה 3/);
    await shot(page, "05-number-17-with-return", page.locator("body"), false).catch(() => {});
    await back.click(); await page.waitForURL(/kind=spatial/); await host(page).waitFor(); await panel(page).waitFor(); await page.waitForTimeout(2500);
    let loc = await location_(page); assert.match(loc.search, /cube=in/); assert.match(loc.search, /face=2/); assert.match(loc.search, /door=number/); assert.equal(loc.hash, `#spatial-${SLUG}`);
    assert.equal(await host(page).getAttribute("data-inside-face"), "2"); assert.equal(await page.locator('[data-journey-face="2"]').getAttribute("aria-pressed"), "true");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "cube-door-number", "focus returns to the doorway that was left"); step("return-number", { search: loc.search });
    // 5) the Book: six directions — chosen AFTER entry, never attached to a face; then the source-bound reader at PDF 73
    assert.match(await page.locator("#cube-door-seals").innerText(), /אינה שש החותמות/); assert.equal(await page.locator('[data-journey-link="seals"]').count(), 0, "no link before a direction is chosen");
    await page.locator('#cube-door-seals [data-journey-direction="east"]').click(); await page.waitForTimeout(500);
    const sealsHref = await page.locator('[data-journey-link="seals"]').getAttribute("href");
    assert.equal(sealsHref, "/2029/control?surface=sefer-yetzirah-world&page=73&structure=sy-structure%3Asix-seals-synoptic&component=sy-structure%3Asix-seals-synoptic%3Acomponent%3Aeast");
    assert.match(await page.locator("#cube-door-seals").innerText(), /book:sefer-yetzirah-9perushim#p73:synoptic_body:text:synoptic:ch1:six-seals/);
    await shot(page, "06-seals-direction-chosen", page.locator("#cube-journey"));
    await page.locator('[data-journey-link="seals"]').click(); await page.waitForURL(/surface=sefer-yetzirah-world/);
    await page.locator("#yetzirah29-source").waitFor(); assert.match(await page.locator("#yetzirah29-source-title").innerText(), /עמוד PDF 73/);
    const reader = await page.evaluate(() => ({ search: location.search, selected: new URLSearchParams(location.search).get("component") }));
    assert.equal(reader.selected, "sy-structure:six-seals-synoptic:component:east");
    await page.locator("#yetzirah29-structure-learning, .ssl-guide").first().waitFor({ timeout: 20000 }).catch(() => {});
    const readerBody = await page.locator("body").innerText(); assert.match(readerBody, /מזרח/);
    await shot(page, "07-book-six-seals-p73", page.locator("body"), false).catch(() => {});
    const back2 = frameReturn(page); await back2.waitFor(); assert.equal(await back2.isDisabled(), false); assert.match((await back2.getAttribute("title")) || "", /חזרה לקובייה 1020 · פאה 3/);
    await back2.click(); await page.waitForURL(/kind=spatial/); await panel(page).waitFor(); await page.waitForTimeout(2500);
    loc = await location_(page); assert.match(loc.search, /door=seals/); assert.match(loc.search, /dir=east/); assert.match(loc.search, /face=2/);
    assert.equal(await page.locator('[data-journey-direction="east"]').first().getAttribute("aria-pressed"), "true", "the chosen direction is restored"); assert.equal(await page.evaluate(() => document.activeElement?.id), "cube-door-seals"); step("return-seals", { search: loc.search });
    // 5b) optional: the Gra variant at PDF 175, with its open textual discrepancy stated
    assert.match(await page.locator("#cube-door-gra").innerText(), /בירר \/ בחר/); assert.equal(await page.locator('[data-journey-link="gra"]').getAttribute("href"), "/2029/control?surface=sefer-yetzirah-world&page=175&structure=sy-structure%3Asix-seals-gra-edition&component=sy-structure%3Asix-seals-gra-edition%3Acomponent%3Aeast");
    // 6) טוב ורע — the ten depths, PDF 53; and exact return
    await page.locator('[data-journey-link="depths"]').click(); await page.waitForURL(/experience=depths/);
    await page.locator("#yetzirah29-source").waitFor(); assert.match(await page.locator("#yetzirah29-source-title").innerText(), /עמוד PDF 53/);
    assert.match(await page.locator("body").innerText(), /עומק טוב|טוב/);
    await shot(page, "08-book-ten-depths-p53", page.locator("body"), false).catch(() => {});
    const back3 = frameReturn(page); await back3.waitFor(); await back3.click(); await page.waitForURL(/kind=spatial/); await panel(page).waitFor(); await page.waitForTimeout(2000);
    loc = await location_(page); assert.match(loc.search, /door=depths/); assert.equal(await page.evaluate(() => document.activeElement?.id), "cube-door-depths"); step("return-depths", { search: loc.search });
    // 7) המשך ל־3060 (the related Zvi model) and exact return to the same face
    await page.locator('[data-journey-link="next"]').click(); await page.waitForURL(/spatial-yesharim-cube-3060|yesharim/); await page.waitForTimeout(2500);
    assert.equal(await page.locator("#spatial-yesharim-cube-3060").count(), 1, "the related Zvi model 3060 is on the page"); assert.equal(await panel(page).count(), 0, "the cube journey does not follow into another card");
    assert.match(await page.locator("#spatial-yesharim-cube-3060").innerText(), /1020 × 3|השגחה פרטית/);
    const back4 = frameReturn(page); await back4.waitFor(); assert.equal(await back4.isDisabled(), false); await back4.click();
    await page.waitForURL(/cube=in/); await panel(page).waitFor(); await host(page).waitFor(); await page.waitForTimeout(2500);
    loc = await location_(page); assert.match(loc.search, /face=2/); assert.match(loc.search, /door=next/); assert.equal(loc.hash, `#spatial-${SLUG}`);
    assert.equal(await host(page).getAttribute("data-inside-face"), "2"); assert.equal(await page.evaluate(() => document.activeElement?.id), "cube-door-next"); step("return-next", { search: loc.search });
    await shot(page, "09-exact-return-same-face", page.locator(`[data-convergence-card="${SLUG}"]`));
    // 8) browser Back also restores (the URL is the state): leave via a link, press Back
    await page.locator('[data-journey-link="number"]').click(); await page.waitForURL(/\/2029\/number\/17/); await page.goBack(); await page.waitForURL(/cube=in/); await panel(page).waitFor();
    assert.match((await location_(page)).search, /face=2/); step("browser-back", { ok: true });
    // 9) a reload restores the same face and the same doorway
    await page.reload({ waitUntil: "domcontentloaded" }); await panel(page).waitFor(); await host(page).waitFor(); await page.waitForTimeout(2500);
    assert.equal(await page.locator('[data-journey-face="2"]').getAttribute("aria-pressed"), "true"); step("reload", { ok: true });
    // 10) exit: back to the outside cube, state cleared from the URL
    await page.locator("[data-journey-exit]").click(); await page.waitForFunction(() => document.querySelector('[data-renderer="r3f"][data-scene="structure"]')?.getAttribute("data-inside") === "false");
    assert.doesNotMatch((await location_(page)).search, /cube=in/); assert.equal(await panel(page).count(), 0); assert.equal(await page.locator("[data-cube-enter]").count(), 1);
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute("data-cube-enter")), true, "focus returns to the entry");
    // sourceRef / privacy: no request to a private source row, no source PDF, no write
    const writes = requests.filter((r) => /^(POST|PUT|PATCH|DELETE) /.test(r) && !/gematria_method_trace|rpc|auth/.test(r));
    rec.requests = { engineCalls: requests.filter((r) => /gematria_method_trace/.test(r)).length, pdf: requests.filter((r) => /\.pdf/.test(r)).length, unexpectedWrites: writes };
    // the PDF is requested only by the Books owner's reader (its iframe) after the doorway is crossed, and the harness aborts it; the cube page itself never asks for it
    assert.ok(rec.requests.pdf >= 1 && rec.requests.pdf <= 6, "the PDF is requested by the reader only"); assert.deepEqual(writes, [], "no write of any kind");
    receipt.cases.walk = rec; await ctx.close();
  }

  // ============ the protected-Preview-like build: the book reader is NOT in the artifact ============
  if (ONLY.includes("hosted")) {
    const { ctx, page } = await session(HOSTED, { name: "hosted" });
    const rec = {};
    await openStage(page, HOSTED); await enterAndWait(page);
    await page.locator('[data-journey-face="2"]').click(); await page.waitForTimeout(1000);
    const locked = page.locator(".sod29-cube-journey__locked");
    assert.equal(await locked.count(), 3, "seals, Gra and the depths are link-only here");
    for (const text of await locked.allInnerTexts()) { assert.match(text, /בבדיקת פרסום/); assert.match(text, /book:sefer-yetzirah-9perushim/); assert.match(text, /PDF (73|175|53)/); }
    assert.equal(await page.locator('[data-journey-link="seals"], [data-journey-link="gra"], [data-journey-link="depths"]').count(), 0, "no link to a reader that is not in this artifact");
    assert.equal(await page.locator('[data-journey-link="number"]').count(), 1); assert.equal(await page.locator('[data-journey-link="next"]').count(), 1);
    // the open doors still work, and so does the exact return
    await page.locator('#cube-door-verify button').click(); assert.match(await page.locator("#cube-door-verify").innerText(), /אומת במנוע/);
    await page.locator('[data-journey-link="number"]').click(); await page.waitForURL(/number\/17/); const back = frameReturn(page); await back.waitFor(); await back.click();
    await page.waitForURL(/cube=in/); await panel(page).waitFor(); assert.equal(await page.evaluate(() => document.activeElement?.id), "cube-door-number");
    await shot(page, "10-hosted-locked-doors", page.locator("#cube-journey"));
    rec.locked = 3; receipt.cases.hosted = rec; await ctx.close();
  }

  // ============ no WebGL: the whole exploration is still there as DOM ============
  if (ONLY.includes("nogl")) {
    const { ctx, page } = await session(REVIEW, { name: "nogl", noWebgl: true });
    const stage = await openStage(page, REVIEW);
    await page.locator("[data-cube-enter]").click(); await panel(page).waitFor();
    assert.equal(await page.locator("canvas").count(), 0, "no canvas without WebGL");
    assert.match(await stage.locator('[data-s4-action="deepen"], .sod29-spatial-method-stage__depth-controls small').first().innerText().catch(() => ""), /./);
    await page.locator('[data-journey-face="4"]').click(); assert.equal((await doorsText(page)).length, 7);
    assert.match((await location_(page)).search, /face=4/);
    await shot(page, "11-no-webgl-dom-exploration", page.locator(`[data-convergence-card="${SLUG}"]`));
    receipt.cases.nogl = { canvas: 0, doors: 7 }; await ctx.close();
  }

  // ============ motion: entering is a camera crossing (not a cut) with reduced motion off; reduced motion cuts instantly ============
  if (ONLY.includes("motion")) {
    const { ctx, page } = await session(REVIEW, { name: "motion", reducedMotion: "no-preference" });
    await openStage(page, REVIEW);
    await page.locator('[data-s4-action="deepen"]').click(); await host(page).locator("canvas").waitFor(); await page.waitForTimeout(3500);
    await page.locator("[data-cube-enter]").click(); await page.waitForFunction(() => document.querySelector('[data-renderer="r3f"][data-scene="structure"]')?.getAttribute("data-inside") === "true");
    const during = await host(page).getAttribute("data-open-wall"); assert.equal(during, "0", "while the camera crosses, the near wall is the open doorway");
    await page.waitForTimeout(2200);
    assert.equal(await host(page).getAttribute("data-reduced-motion"), "false");
    await page.locator("[data-journey-exit]").click(); await page.waitForTimeout(1500);
    receipt.cases.motion = { crossingOpenWall: during }; await ctx.close();
    const r = await session(REVIEW, { name: "reduced", reducedMotion: "reduce" });
    await openStage(r.page, REVIEW); await enterAndWait(r.page);
    assert.equal(await host(r.page).getAttribute("data-reduced-motion"), "true"); await r.ctx.close();
  }

  // ============ phones: nothing clipped, touch targets ≥44px, no text <15px in the panel, RTL ============
  if (ONLY.includes("mobile")) {
    for (const width of [390, 320]) {
      const { ctx, page } = await session(REVIEW, { name: `mobile-${width}`, width, height: 844, throttle: 4 });
      await openStage(page, REVIEW); await enterAndWait(page);
      await page.locator('[data-journey-face="2"]').click(); await page.waitForTimeout(1200);
      const ov = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, inner: window.innerWidth })); assert.ok(ov.doc <= ov.inner + 1, `no horizontal overflow at ${width}`);
      const probe = await page.evaluate(() => {
        const root = document.querySelector("[data-cube-journey]"), rr = root.getBoundingClientRect(), clipped = [], small = [], targets = [];
        for (const el of root.querySelectorAll("*")) { const r = el.getBoundingClientRect(); if (r.width > 0 && (r.left < rr.left - 1 || r.right > rr.right + 1 || r.right > window.innerWidth + 1 || r.left < -1)) clipped.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 24)}`);
          const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim(); if (own && parseFloat(getComputedStyle(el).fontSize) < 15) small.push(`${own.slice(0, 16)}:${getComputedStyle(el).fontSize}`); }
        for (const b of root.querySelectorAll("button, a")) { const r = b.getBoundingClientRect(); if (r.width > 0 && (r.height < 43.5 || r.width < 43.5)) targets.push(b.textContent.trim().slice(0, 14)); }
        return { clipped: clipped.slice(0, 8), small: small.slice(0, 8), targets: targets.slice(0, 8), dir: getComputedStyle(root).direction };
      });
      assert.deepEqual(probe.clipped, [], `nothing clipped at ${width}`); assert.deepEqual(probe.small, [], "no text under 15px"); assert.deepEqual(probe.targets, [], "touch targets >= 44px"); assert.equal(probe.dir, "rtl");
      await shot(page, `12-mobile-${width}-inside`, page.locator(`[data-convergence-card="${SLUG}"]`));
      (receipt.cases.mobile ||= {})[width] = { overflow: false, ...probe }; await ctx.close();
    }
  }

  // ============ GPU lifecycle: enter / exit 5 times, then close the 3D: no live WebGL context, flat heap ============
  if (ONLY.includes("leak")) {
    const { ctx, page } = await session(REVIEW, { name: "leak" });
    const stage = await openStage(page, REVIEW);
    const heap = () => page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576));
    await stage.locator('[data-s4-action="deepen"]').click(); await host(page).locator("canvas").waitFor(); await page.waitForTimeout(3000);
    const before = await heap();
    for (let i = 0; i < 5; i += 1) {
      await page.locator("[data-cube-enter]").click(); await page.waitForFunction(() => document.querySelector('[data-renderer="r3f"][data-scene="structure"]')?.getAttribute("data-inside") === "true"); await page.waitForTimeout(1800);
      await page.locator("[data-journey-exit]").click(); await page.waitForFunction(() => document.querySelector('[data-renderer="r3f"][data-scene="structure"]')?.getAttribute("data-inside") === "false"); await page.waitForTimeout(800);
    }
    const counters = await host(page).evaluate((h) => ({ geometries: Number(h.dataset.gpuGeometries), textures: Number(h.dataset.gpuTextures) }));
    await stage.locator('[data-s4-action="return"]').click(); await page.waitForTimeout(1200);
    const live = await page.evaluate(() => (window.__ctxs || []).filter((c) => { try { return !c.isContextLost(); } catch { return false; } }).length);
    assert.equal(live, 0, "no live WebGL context after closing"); receipt.cases.leak = { cycles: 5, liveContexts: live, heapBeforeMB: before, heapAfterMB: await heap(), ...counters }; await ctx.close();
  }
} catch (error) { receipt.errors.push(String(error?.stack || error).slice(0, 1600)); }
finally { await browser.close(); fs.writeFileSync(`${out}/receipt-cube-journey-${(process.env.CASE || "all").replace(/,/g, "_")}.json`, JSON.stringify(receipt, null, 2)); }
console.log(receipt.errors.length ? "FAIL" : "PASS", JSON.stringify(Object.keys(receipt.cases)), "errors:", receipt.errors.length);
if (receipt.errors.length) { console.log(receipt.errors.join("\n")); process.exitCode = 1; }
