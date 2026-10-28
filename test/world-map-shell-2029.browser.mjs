// World map shell: real components in isolated Vite, fixture data, no network.
// Run: node test/world-map-shell-2029.browser.mjs  (writes work/evidence/world-map-shell/)
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, createWriteStream, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.WORLD_MAP_PORT || 5193);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(ROOT, "work/evidence/world-map-shell");
mkdirSync(OUT, { recursive: true });
const cache = mkdtempSync(path.join(tmpdir(), "world-map-shell-vite-"));
const log = createWriteStream(path.join(OUT, "vite.log"));
const config = { cacheDir: cache, server: { host: "127.0.0.1", port: PORT, strictPort: true, hmr: false } };
const server = spawn("node", ["--input-type=module", "-e",
  `import {createServer} from "vite";const s=await createServer(${JSON.stringify(config)});await s.listen();`], { cwd: ROOT });
server.stdout.pipe(log); server.stderr.pipe(log);
const stop = () => { server.kill(); try { rmSync(cache, { recursive: true, force: true }); } catch { /* ignore */ } };
process.on("exit", stop);

const HTML = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>בדיקת מפת עולם</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="root"></div><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;</script><script type="module" src="/test/fixtures/world-map-shell-2029.jsx"></script></body></html>`;
for (let i = 0; i < 200; i += 1) {
  try { const r = await fetch(BASE); if (r.ok) break; } catch { /* wait */ }
  await new Promise((r) => setTimeout(r, 100));
}

const report = { cases: [], errors: [], external: [] };
const ok = (name, detail = "") => { report.cases.push({ name, detail }); console.log(`ok - ${name}${detail ? ` (${detail})` : ""}`); };
const VIEWPORTS = { "320": { width: 320, height: 640 }, "390": { width: 390, height: 844 }, desktop: { width: 1280, height: 860 } };
const THEMES = ["light", "parchment", "dark"];

const browser = await chromium.launch();
async function open(viewportName, theme, query = "") {
  const context = await browser.newContext({ viewport: VIEWPORTS[viewportName], locale: "he-IL", hasTouch: viewportName !== "desktop", isMobile: viewportName !== "desktop" });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.errors.push(String(error)));
  // Vite dev-client HMR websocket is blocked by the sandbox; it is tooling noise, not app behaviour.
  const devClientNoise = /WebSocket connection to 'ws:\/\/127\.0\.0\.1|\[vite\] failed to connect|Failed to send error to Vite/;
  page.on("console", (message) => { if (message.type() === "error" && !devClientNoise.test(message.text())) report.errors.push(message.text()); });
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1") { report.external.push(url.href); return route.abort(); }
    if (url.pathname === "/world-map") return route.fulfill({ contentType: "text/html", body: HTML });
    if (url.pathname.startsWith("/api/") || route.request().method() !== "GET") { report.external.push(`${route.request().method()} ${url.pathname}`); return route.abort(); }
    return route.continue();
  });
  await page.goto(`${BASE}/world-map?theme=${theme}${query}`);
  await page.waitForSelector(".wm29 [data-wm-node]");
  await page.waitForTimeout(250);
  return { page, context };
}
const box = (page, selector) => page.locator(selector).first().boundingBox();
const lum = ([r, g, b]) => [r, g, b].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const parse = (css) => (css.match(/[\d.]+/g) || []).slice(0, 4).map(Number);
async function colors(page, textSel, bgSel, prop = "color") {
  return page.evaluate(([t, b, p]) => {
    const text = getComputedStyle(document.querySelector(t))[p === "fill" ? "fill" : "color"];
    const bg = getComputedStyle(document.querySelector(b));
    return { text, bg: p === "fill" ? bg.fill : bg.backgroundColor };
  }, [textSel, bgSel, prop]);
}

// 1. Overflow, geometry, screenshots × theme × viewport.
for (const theme of THEMES) {
  for (const name of Object.keys(VIEWPORTS)) {
    const { page, context } = await open(name, theme);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `${theme}/${name}: horizontal overflow ${overflow}px`);
    assert.equal(await page.evaluate(() => document.documentElement.getAttribute("data-theme-preset")), theme);
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".wm29")).direction), "rtl");
    if (name === "desktop") {
      const [mini, canvas] = [await box(page, ".wm29-area-mini"), await box(page, ".wm29-area-canvas")];
      await page.locator("[data-wm-node][data-kind=source]").first().click();
      const inspector = await box(page, ".wm29-inspector");
      assert.ok(mini.x + mini.width <= canvas.x + 1, "mini-map is left of the canvas");
      assert.ok(inspector.x >= canvas.x + canvas.width - 1, "inspector is right of the canvas");
      assert.ok(mini.width <= 220, `mini-map compact (${mini.width})`);
      assert.equal(await page.locator("#wm29-mini-body").isVisible(), true, "desktop mini-map always visible");
      assert.equal(await page.locator(".wm29-mini-toggle").isVisible(), false);
      assert.equal(await page.locator(".wm29-inspector[data-sheet]").count(), 0, "desktop inspector is not a sheet");
    } else {
      assert.equal(await page.locator("#wm29-mini-body").isVisible(), false, `${name}: mini-map collapsed by default`);
      assert.equal(await page.locator(".wm29-mini-toggle").getAttribute("aria-expanded"), "false");
    }
    await page.screenshot({ path: path.join(OUT, `${theme}-${name}.png`), fullPage: false });
    await context.close();
  }
  ok(`no horizontal overflow, RTL, correct regions: ${theme} @ 320/390/desktop`);
}

// 2. Contrast per theme (node text, muted text, tree edge vs canvas).
for (const theme of THEMES) {
  const { page, context } = await open("desktop", theme);
  const label = await colors(page, ".wm29-node-label", ".wm29-node-body", "fill");
  const kind = await colors(page, ".wm29-node-kind", ".wm29-node-body", "fill");
  const head = await colors(page, ".wm29-head p", ".wm29-canvas");
  const edge = await page.evaluate(() => ({ stroke: getComputedStyle(document.querySelector(".wm29-edge-tree")).stroke, bg: getComputedStyle(document.querySelector(".wm29-canvas")).backgroundColor }));
  const prov = await page.evaluate(() => ({ stroke: getComputedStyle(document.querySelector(".wm29-edge-provenance")).stroke }));
  const pageBg = await page.evaluate(() => getComputedStyle(document.querySelector("main")).backgroundColor);
  const checks = {
    nodeLabel: contrast(parse(label.text), parse(label.bg)), nodeKind: contrast(parse(kind.text), parse(kind.bg)),
    headMuted: contrast(parse(head.text), parse(pageBg)), treeEdge: contrast(parse(edge.stroke), parse(edge.bg)),
    provenanceEdge: contrast(parse(prov.stroke), parse(edge.bg)),
  };
  assert.ok(checks.nodeLabel >= 4.5 && checks.nodeKind >= 4.5 && checks.headMuted >= 4.5, `${theme} text contrast ${JSON.stringify(checks)}`);
  assert.ok(checks.treeEdge >= 3 && checks.provenanceEdge >= 3, `${theme} edge contrast ${JSON.stringify(checks)}`);
  ok(`contrast ${theme}`, Object.entries(checks).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(" · "));
  await context.close();
}

// 3. Edges: tree only with evidence; provenance dashed; candidate absent.
{
  const { page, context } = await open("desktop", "light");
  assert.equal(await page.locator("[data-edge-kind=tree]").count(), 2);
  assert.ok(await page.locator("[data-edge-kind=provenance]").count() > 0);
  const dash = await page.locator("[data-edge-kind=provenance]").first().evaluate((el) => getComputedStyle(el).strokeDasharray);
  assert.notEqual(dash, "none", "provenance is dashed (not colour-only)");
  assert.equal(await page.locator("text=הצעה: קשר ליעד לדוגמה").count(), 0, "candidate not on the canvas");
  await page.locator('[data-wm-node][aria-label="ממצא: fixture:finding:3"]').click();
  assert.match(await page.locator(".wm29-candidates").innerText(), /אינן קשרי עץ/);
  assert.equal(await page.locator("[data-edge-kind=tree]").count(), 2, "candidate did not add an edge");
  ok("tree edges need evidence; provenance dashed; candidate stays a proposal");
  await context.close();
}

// 4. Layers separation in the inspector.
{
  const { page, context } = await open("desktop", "light");
  await page.locator('[data-wm-node][aria-label="ממצא: fixture:finding:1"]').click();
  const layers = await page.locator("[data-layer]").evaluateAll((els) => els.map((el) => [el.dataset.layer, el.querySelector("h4").textContent, el.innerText]));
  assert.deepEqual(layers.map((row) => row[0]), ["calculation", "oneZeroDerivation", "interpretation"]);
  assert.match(layers[0][2], /1,456/); assert.match(layers[1][2], /456/); assert.doesNotMatch(layers[2][2], /1,456/);
  await page.locator('[data-wm-node][aria-label="מקור: מקור לדוגמה א׳ — פרסום"]').click();
  const text = await page.locator(".wm29-inspector").innerText();
  assert.match(text, /אינם מקור נוסף/); assert.match(text, /לא קשר עץ/);
  assert.equal(await page.locator("[data-layer]").count(), 0, "calculation layers do not appear on a source");
  ok("calculation / one-zero / interpretation separate; source ≠ finding ≠ occurrence");
  await context.close();
}

// 5. Relation windows: ok / partial / failed / empty / unavailable.
for (const [scenario, expectStatus, assertion] of [
  ["ok", "ok", (text, edges) => { assert.match(text, /edge:fixture-901/); assert.equal(edges, 3); }],
  ["partial", "partial", (text, edges) => { assert.match(text, /אין זה אומר שאין קשר/); assert.doesNotMatch(text, /לא נמצאו/); assert.equal(edges, 2); }],
  ["failed", "failed", (text, edges) => { assert.match(text, /אין זה אומר שאין קשר/); assert.doesNotMatch(text, /לא נמצאו/); assert.equal(edges, 2); }],
  ["empty-ok", "ok", (text) => { assert.match(text, /בחלון שנקרא/); assert.match(text, /אין להסיק מכך שאין קשרים נוספים/); }],
]) {
  const { page, context } = await open("desktop", "light", `&scenario=${scenario}`);
  await page.locator('[data-wm-node][aria-label="ממצא: fixture:finding:3"]').click();
  await page.getByRole("button", { name: "פתיחת קשרים מתועדים" }).click();
  await page.waitForSelector(`[data-relation-status=${expectStatus}]`);
  assertion(await page.locator(".wm29-relations").innerText(), await page.locator("[data-edge-kind=tree]").count());
  await page.screenshot({ path: path.join(OUT, `relations-${scenario}.png`) });
  ok(`relation window: ${scenario}`);
  await context.close();
}
{
  const { page, context } = await open("desktop", "light", "&opener=none&tree=unavailable");
  await page.locator('[data-wm-node][aria-label="ממצא: fixture:finding:3"]').click();
  assert.match(await page.locator(".wm29-relations").innerText(), /אינה זמינה/);
  assert.match(await page.locator(".wm29-canvas-note").innerText(), /לא ידוע אם קיימים קשרים/);
  ok("unavailable opener / unavailable tree layer is never rendered as 'no relation'");
  await context.close();
}

// 6. Mobile: mini-map toggle, bottom sheet, focus management, Escape.
for (const name of ["320", "390"]) {
  const { page, context } = await open(name, "dark");
  await page.getByRole("button", { name: /מיני־מפה/ }).click();
  assert.equal(await page.locator("#wm29-mini-body").isVisible(), true);
  await page.getByRole("button", { name: /מיני־מפה/ }).click();
  assert.equal(await page.locator("#wm29-mini-body").isVisible(), false);

  const node = page.locator('[data-wm-node][aria-label="ממצא: fixture:finding:1"]');
  await node.focus();
  await page.keyboard.press("Enter");
  const sheet = page.locator(".wm29-inspector[data-sheet]");
  await sheet.waitFor();
  assert.equal(await sheet.getAttribute("role"), "dialog");
  const geometry = await sheet.boundingBox();
  const viewport = VIEWPORTS[name];
  assert.ok(Math.abs(geometry.y + geometry.height - viewport.height) <= 1, "sheet anchored to bottom");
  assert.ok(geometry.width >= viewport.width - 1 && geometry.height <= viewport.height * 0.5, "sheet full width, peek height");
  assert.equal(await page.evaluate(() => document.activeElement.id), "wm29-inspector-title", "focus moves to the sheet title");
  await page.screenshot({ path: path.join(OUT, `sheet-${name}.png`) });
  await sheet.getByRole("button", { name: /הרחבת הפרטים/ }).click();
  await page.waitForTimeout(350);
  assert.ok((await sheet.boundingBox()).height > viewport.height * 0.8, "expanded sheet");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden" });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "ממצא: fixture:finding:1", "focus returns to the node");
  ok(`mobile ${name}: mini-map collapses, inspector is a bottom sheet, focus restored`);
  await context.close();
}

// 7. Keyboard + touch targets.
{
  const { page, context } = await open("desktop", "light");
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => document.activeElement.className || document.activeElement.tagName);
  assert.ok(first, "tab reaches content");
  const source = page.locator('[data-wm-node][aria-label="מקור: מקור לדוגמה א׳ — פרסום"]');
  await source.focus();
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.evaluate(() => document.activeElement.dataset.kind), "occurrence", "ArrowLeft goes one layer deeper (RTL)");
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => document.activeElement.dataset.kind), "source");
  const tooSmall = await page.evaluate(() => [...document.querySelectorAll(".wm29 button")].filter((b) => b.offsetParent && (b.offsetHeight < 44 || b.offsetWidth < 44)).map((b) => b.textContent));
  assert.deepEqual(tooSmall, [], "all visible buttons are ≥44px");
  const focusRing = await source.evaluate((el) => getComputedStyle(el.querySelector(".wm29-node-body")).stroke);
  assert.ok(focusRing);
  ok("keyboard: roving arrows follow RTL layers; touch targets ≥ 44px");
  await context.close();
}

// 8. Minimap navigation + no extra loading.
{
  const { page, context } = await open("390", "light");
  await page.getByRole("button", { name: /מיני־מפה/ }).click();
  const before = await page.locator(".wm29-canvas svg > g").getAttribute("transform");
  const rect = await page.locator(".wm29-mini-svg").boundingBox();
  await page.mouse.click(rect.x + rect.width * 0.2, rect.y + rect.height * 0.5);
  const after = await page.locator(".wm29-canvas svg > g").getAttribute("transform");
  assert.notEqual(before, after, "mini-map click pans the canvas");
  ok("mini-map navigates the canvas");
  await context.close();
}

await browser.close();
stop();
report.passed = report.cases.length;
writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
assert.deepEqual(report.errors, [], "no page/console errors");
assert.deepEqual(report.external, [], "no network beyond local Vite");
console.log(`world-map-shell browser: ${report.passed} cases, no console errors, no external requests`);
