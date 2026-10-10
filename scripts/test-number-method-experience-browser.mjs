import { createRequire } from "node:module";
import fs from "node:fs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/codex/cua_node/lib/node_modules/playwright")); }
const base = process.env.NUMBER_TEST_BASE || "http://localhost:4173";
const output = process.env.NUMBER_TEST_OUTPUT || "/tmp/number-method-experience";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true,
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(20000);
const receipt = { cases: [], errors: [], blocked: [], gpu: "software Chromium", source: "anonymous live read-only RPCs" };
page.on("pageerror", (e) => receipt.errors.push(e.message));
let r3fModuleUrl;
page.on("response", (response) => { if (response.url().includes("/deps/@react-three_fiber.js")) r3fModuleUrl = response.url(); });
const allowed = new Set(["fn_method_profile", "gematria_method_trace", "fn_zero_scale", "fn_verses_by_gematria", "fn_method_value", "gematria_api", "fn_get_value_phrases", "get_all_value_phrases", "fn_number_families", "fn_system_pulse_2029", "fn_world_system_pulse_v1", "posts_by_number_strict", "fn_number_lookup", "fn_number_dossier", "fn_number_journey", "number_neighbors", "lang_links_list"]);
await page.route("**/*", async (route) => {
  const req = route.request(), url = new URL(req.url());
  if (url.origin === base) {
    const response = req.isNavigationRequest() && url.pathname.startsWith("/2029/")
      ? await page.request.get(`${base}/2029.html`) : await page.request.fetch(req);
    return route.fulfill({ response });
  }
  if (req.method() === "POST" && url.pathname.includes("/rest/v1/rpc/") && allowed.has(url.pathname.split("/").pop())) return route.continue();
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method())) {
    receipt.blocked.push(url.pathname);
    return route.fulfill({ status: 403, contentType: "application/json", body: '{"message":"Read-only verification"}' });
  }
  return route.continue();
});
const inspector = page.locator(".sod29-number-method-inspector");
async function open(expression = "אופק אדנק", method = "מילוי") {
  await page.goto(`${base}/2029/number/1237?focus=${encodeURIComponent(expression)}&method=${encodeURIComponent(method)}`, { waitUntil: "domcontentloaded" });
  await page.locator(".sod29-number-v10-calculation-card").click({ timeout: 45000 });
  await inspector.waitFor();
}
async function ready() {
  await page.waitForFunction(() => {
    const el = document.querySelector(".sod29-number-method-inspector .sod29-spatial-method-stage");
    return el && el.getAttribute("data-state") !== "loading" && (el.getAttribute("data-method-key") || el.getAttribute("data-state") === "context_required");
  }, null, { timeout: 30000 });
}
async function layout(name) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth,
    minimumStageText: Math.min(...[...document.querySelectorAll(".sod29-spatial-method-stage small,.sod29-spatial-method-stage p")].map((el) => parseFloat(getComputedStyle(el).fontSize))) }));
  assert.ok(sizes.documentWidth <= sizes.width + 1, `${name} document overflow`);
  assert.ok(sizes.minimumStageText >= 14, `${name} unreadable text`);
  receipt.cases.push({ name, ...sizes });
}
try {
  if (!process.env.NUMBER_TEST_GPU_ONLY) {
  console.log("open initial");
  await open(); await ready();
  console.log("initial ready");
  await inspector.getByRole("button", { name: "איך מחשבים?", exact: true }).click();
  assert.match(await inspector.innerText(), /סכום עד כאן: 1237/);
  assert.equal(await inspector.locator(".sod29-spatial-method-stage__letters button").count(), 8);
  const small = page.locator('.sod29-ui-icon[data-icon-shape="number"]').first();
  const large = inspector.locator('.sig-icon__core .sod29-ui-icon');
  assert.equal(await small.innerHTML(), await large.innerHTML());
  await inspector.screenshot({ path: `${output}/milui-desktop.png` });
  console.log("open learn", receipt.errors);
  await inspector.getByRole("tab", { name: "למד", exact: true }).click();
  assert.match(await inspector.innerText(), /נסו עם הביטוי שבחרתם/);
  assert.match(await inspector.innerText(), /אופק אדנק/);
  console.log("learn ready", receipt.errors);
  await inspector.getByRole("tab", { name: "למד", exact: true }).press("ArrowLeft");
  assert.equal(await inspector.getByRole("tab", { name: "רזיאל", exact: true }).getAttribute("aria-selected"), "true");
  await inspector.getByRole("tab", { name: "רזיאל", exact: true }).press("Home");
  assert.equal(await inspector.getByRole("tabpanel").getAttribute("aria-labelledby"), await inspector.getByRole("tab", { name: "חישוב", exact: true }).getAttribute("id"));
  await inspector.getByRole("tab", { name: "למד", exact: true }).click();
  receipt.cases.push({ name: "inspector-keyboard", rtlArrowsAndHome: true });
  await inspector.screenshot({ path: `${output}/learn-desktop.png` });
  await inspector.getByRole("tab", { name: "חישוב", exact: true }).click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await layout(`milui-${width}`);
    await inspector.screenshot({ path: `${output}/milui-${width}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-experience-action="number-more-methods"]').click();
  const labels = await page.locator(".sod29-number-v10-method-card>span").allTextContents();
  for (const label of process.env.NUMBER_TEST_FOCUSED ? [] : labels) {
    console.log("method", label);
    let card = page.locator(".sod29-number-v10-method-card").filter({ has: page.locator("span", { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) }) });
    if (!await card.count()) await page.locator('[data-experience-action="number-more-methods"]').click();
    await card.click();
    if (!await inspector.isVisible()) await page.locator(".sod29-number-v10-calculation-card").click();
    await ready();
    const stage = inspector.locator(".sod29-spatial-method-stage");
    const context = label.includes("רבתי");
    assert.equal(await stage.count(), 1, label);
    if (context) {
      assert.equal(await stage.getAttribute("data-state"), "context_required");
      assert.match(await card.innerText(), /—/);
      assert.doesNotMatch(await inspector.locator(".sod29-number-method-calc-line").innerText(), /342000/);
    } else {
      const button = inspector.getByRole("button", { name: "איך מחשבים?", exact: true });
      if (await button.count()) await button.click();
      assert.match(await inspector.locator(".sod29-number-core2029-trace-steps").innerText(), /תוצאה:/);
    }
    await inspector.getByRole("tab", { name: "למד", exact: true }).click();
    assert.match(await inspector.innerText(), /מה השיטה עושה/);
    assert.doesNotMatch(await inspector.innerText(), /base_additive|composite_sum|LEGACY HYBRID/);
    await inspector.getByRole("tab", { name: "חישוב", exact: true }).click();
    receipt.cases.push({ name: label, stage: await stage.getAttribute("data-method-visual"), context });
    if (["מילוי בלבד", "מילוי דמילוי", "משולש מדרגות"].includes(label)) await inspector.screenshot({ path: `${output}/method-${encodeURIComponent(label)}.png` });
  }
  }
  console.log("open gpu");
  await open("התגלות", "מסתתר"); await ready();
  const stage = inspector.locator(".sod29-spatial-method-stage");
  const scene = await stage.getAttribute("data-scene-id");
  await inspector.locator('[data-s4-action="deepen"]').click();
  await inspector.locator('[data-renderer="r3f"] canvas').waitFor({ timeout: 30000 });
  assert.equal(await stage.getAttribute("data-scene-id"), scene);
  await page.waitForTimeout(1500);
  assert.ok(r3fModuleUrl, "R3F module request observed");
  await page.waitForFunction(async (url) => {
    const { _roots } = await import(url);
    const state = _roots.get(document.querySelector('[data-renderer="r3f"] canvas'))?.store.getState();
    let count = 0;
    state?.scene.traverse((node) => { if (node.userData.glyphId) count++; });
    return count === 6;
  }, r3fModuleUrl, { timeout: 30000 });
  const materials = [];
  for (const preset of ["dark", "light", "parchment"]) {
    await page.evaluate(async (value) => (await import("/src/lib/themeMode.js")).setThemePreset(value), preset);
    await page.waitForTimeout(350);
    await layout(`mistater-${preset}`);
    const material = await page.evaluate(async (url) => {
      const { _roots } = await import(url);
      const state = _roots.get(document.querySelector('[data-renderer="r3f"] canvas')).store.getState();
      const glyphs = [];
      state.scene.traverse((node) => { if (node.userData.glyphId) glyphs.push({ id: node.userData.glyphId,
        color: node.children[0].material.color.getHexString(), geometry: node.children[0].geometry.type }); });
      return { glyphs, calls: state.gl.info.render.calls, frameloop: state.frameloop };
    }, r3fModuleUrl);
    assert.equal(material.glyphs.length, 6);
    assert.ok(material.glyphs.every((g) => g.geometry === "ExtrudeGeometry"));
    assert.ok(material.calls > 0);
    assert.equal(material.frameloop, "demand");
    materials.push({ preset, ...material });
    await inspector.locator('[data-renderer="r3f"]').screenshot({ path: `${output}/mistater-3d-${preset}.png` });
  }
  assert.ok(new Set(materials.map((m) => m.glyphs[0].color)).size >= 2, "3D materials follow palette changes");
  receipt.cases.push({ name: "svg-extrusion-and-presets", materials });
  await page.evaluate(async () => (await import("/src/lib/themeMode.js")).setThemePreset("dark"));
  await inspector.screenshot({ path: `${output}/mistater-3d.png` });
  receipt.cases.push({ name: "mistater-3d", scene, canvas: true });
  await inspector.locator('[data-s4-action="return"]').click();
  assert.equal(await inspector.locator("canvas").count(), 0);
  await page.evaluate(() => document.querySelector(".sod29-root").setAttribute("data-frame-reduced-motion", "true"));
  const geometry = await inspector.locator(".sod29-spatial-method-stage__tension-letter").first().evaluate((el) => getComputedStyle(el).transform);
  assert.notEqual(geometry, "none", "reduced motion preserves letter placement");
  const connector = await inspector.locator(".sod29-spatial-method-stage__tension-path").first().evaluate((el) => ({ animation: getComputedStyle(el).animationName, offset: getComputedStyle(el).strokeDashoffset }));
  assert.equal(connector.animation, "none");
  assert.equal(connector.offset, "0px");
  await inspector.locator(".sig-icon").hover();
  assert.equal(await inspector.locator(".sig-icon").evaluate((el) => getComputedStyle(el).transform), "none");
  receipt.cases.push({ name: "frame-reduced-motion", geometry, connector });
  await page.evaluate(() => document.querySelector(".sod29-root").setAttribute("data-frame-reduced-motion", "false"));
  await inspector.locator('[data-s4-action="deepen"]').click();
  await inspector.locator("canvas").waitFor();
  await page.evaluate(() => document.querySelector(".sod29-root").setAttribute("data-frame-reduced-motion", "true"));
  await inspector.locator('[data-renderer="r3f"][data-reduced-motion="true"]').waitFor();
  await page.evaluate(() => document.querySelector(".sod29-root").setAttribute("data-frame-reduced-motion", "false"));
  await inspector.locator('[data-renderer="r3f"][data-reduced-motion="false"]').waitFor();
  receipt.cases.push({ name: "live-3d-motion-preference", updatedWithoutRemount: true });
  await inspector.locator("canvas").evaluate((el) => el.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext());
  await inspector.locator('[data-s4-action="deepen"]').waitFor();
  assert.equal(await inspector.locator("canvas").count(), 0);
  assert.match(await inspector.innerText(), /הקשר הגרפי אבד/);
  assert.equal(await stage.getAttribute("data-scene-id"), scene);
  receipt.cases.push({ name: "context-lost", sameScene: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(); await ready();
  await inspector.locator(".sig-icon").hover();
  assert.equal(await inspector.locator(".sig-icon").evaluate((el) => getComputedStyle(el).transform), "none");
  receipt.cases.push({ name: "reduced-motion", static: true });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return String(kind).startsWith("webgl") ? null : getContext.call(this, kind, ...args);
    };
  });
  await open("התגלות", "מסתתר"); await ready();
  await inspector.locator('[data-s4-action="deepen"]').click();
  assert.equal(await inspector.locator("canvas").count(), 0);
  assert.match(await inspector.innerText(), /WebGL אינו זמין/);
  receipt.cases.push({ name: "no-webgl", fallback: "S2" });
  await open("אופק אדנק", "אות רבתי"); await ready();
  assert.match(await page.locator(".sod29-number-v10-calculation-card").innerText(), /לא התקבלה תוצאה/);
  assert.doesNotMatch(await page.locator(".sod29-number-v10-calculation-card").innerText(), /=/);
  assert.equal(await page.locator('[data-experience-capability="number-result-summary"]').count(), 0);
  await inspector.getByRole("tab", { name: "למד", exact: true }).click();
  assert.match(await inspector.innerText(), /סימון מפורש במקור/);
  assert.doesNotMatch(await inspector.innerText(), /רגיל · גדול|= 342000|= 1237/);
  await inspector.screenshot({ path: `${output}/context-required.png` });
  receipt.cases.push({ name: "contextual-method-without-result", noRootFallback: true });
  assert.deepEqual(receipt.errors, []);
  receipt.passed = true;
} catch (error) {
  receipt.failure = error.stack;
  await page.screenshot({ path: `${output}/failure.png` });
  throw error;
} finally {
  receipt.blocked = [...new Set(receipt.blocked)];
  fs.writeFileSync(`${output}/browser-receipt.json`, JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ cases: receipt.cases.length, passed: receipt.passed, errors: receipt.errors, failure: receipt.failure }));
  await browser.close();
}
