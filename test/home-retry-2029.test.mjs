// The retry in the message of a failed Home area, with the real DiscoveryGateways2029 and HomeComposition2029 over stand-in readers (test/fixtures/retry-harness):
// what each area shows when its read fails or comes back empty, and above all that a retry repeats the reads of THAT area only. Behavior only: nothing here is a
// measurement of speed, and no real read, database or network is involved. The video-defer checks count the fixture response bytes only.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

let chromium = null;
for (const base of [import.meta.url, `file://${process.env.PLAYWRIGHT_DIR || "/opt/node-tools"}/node_modules/`]) {
  try { chromium = createRequire(base)("playwright").chromium; break; } catch { /* try the next location */ }
}
const executablePath = process.env.PERF_CHROME || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);
const skip = !chromium || !executablePath;
const here = fileURLToPath(new URL(".", import.meta.url));
const harness = join(here, "fixtures/retry-harness");
const stubs = join(harness, "stubs.js");
const FAILED = "הטעינה נכשלה. אפשר לנסות שוב.";
// the product's own hold rules (the settled-box height and the frame state of a block that failed), so the boxes in these tests are the real ones
const holdRules = readFileSync(join(here, "../src/components/experience2029/homeComposition2029.css"), "utf8").split("\n").filter((line) => /^\.h29 \[data-h29-hold/.test(line)).join("\n");

// The real modules that reach for a database or only draw are replaced by name; everything else in the components is the real code.
const REPLACED = [/\/lib\/supabase\.js$/, /\/lib\/research\/homePostCards2029\.js$/, /\/lib\/elsMatrices\.js$/, /\/lib\/elsSavedMatrix\.js$/, /\/lib\/runtimeSwitches2029\.js$/, /\/lib\/research\/explorerFacets\.js$/,
  /\/WatchButton\.jsx$/, /\/NavigationIcon2029\.jsx$/, /\/ConvergenceRatings2029\.jsx$/, /\/HomeHeroMotion2029\.jsx$/, /\/PostCategories2029\.jsx$/, /\/HomeBuildSignup2029\.jsx$/];
const substitute = () => ({
  name: "substitute-readers",
  enforce: "pre",
  resolveId(source, importer) { if (importer && importer.startsWith(join(here, "../src")) && REPLACED.some((pattern) => pattern.test(source))) return stubs; if (/\.css$/.test(source)) return "\0empty-css"; return null; },
  load(id) { return id === "\0empty-css" ? "export default ''" : null; },
});
async function bundle() {
  const outDir = mkdtempSync(join(tmpdir(), "retry-harness-"));
  await build({ configFile: false, logLevel: "silent", root: harness, plugins: [substitute(), react()], define: { "process.env.NODE_ENV": '"production"', "import.meta.env.DEV": "false" },
    build: { outDir, emptyOutDir: true, minify: false, lib: { entry: join(harness, "main.jsx"), formats: ["iife"], name: "RetryHarness", fileName: () => "harness.js" } } });
  return join(outDir, readdirSync(outDir).find((name) => name.endsWith(".js")));
}
let script = null, browser = null;
test.before(async () => {
  if (skip) return;
  script = await bundle();
  browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
});
test.after(async () => { await browser?.close(); });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function open(plan = {}, { farBiblical = false, farGateways = false, disableIO = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const geometry = `${farGateways ? "#root{padding-top:2000px}" : ""}${farBiblical ? ".dg29-grid{display:block}.dg29-gateway{display:block;min-height:900px}" : ""}`;
  await page.setContent(`<!doctype html><style>${holdRules}\nbody{margin:0}${geometry}</style><body><div id='root'></div></body>`);
  await page.evaluate(({ p, noIO }) => {
    window.__plan = p;
    window.__calls = [];
    window.__videoPayloadBytes = 0;
    if (noIO) Object.defineProperty(window, "IntersectionObserver", { value: undefined, configurable: true });
  }, { p: plan, noIO: disableIO });
  await page.addScriptTag({ content: readFileSync(script, "utf8") });
  return page;
}
const calls = (page) => page.evaluate(() => window.__calls.slice());
const videoPayloadBytes = (page) => page.evaluate(() => window.__videoPayloadBytes || 0);
const settle = async (page, ms = 400) => { await sleep(ms); };
const gateway = (page, title) => page.locator(`article.dg29-gateway:has(h3:text-is("${title}"))`);
const texts = (locator) => locator.evaluate((node) => node.innerText);

test("gateways: a cold Home entry makes no discovery read until the secondary area approaches the viewport", { skip }, async (t) => {
  const page = await open({}, { farGateways: true, farBiblical: true });
  try {
    await page.evaluate(() => window.__api.mount("gateways"));
    await settle(page);
    assert.deepEqual(await calls(page), [], "offscreen secondary gateways make no initial request");
    assert.equal(await page.locator(".dg29").getAttribute("data-dg29-load-state"), "deferred");
    const box = await page.locator(".dg29").boundingBox(), viewport = page.viewportSize();
    assert.ok(box.y > viewport.height + 400, `fixture starts beyond the bounded lead: ${box.y}`);
    await page.evaluate(({ y, h }) => window.scrollTo(0, y - h - 350), { y: box.y, h: viewport.height });
    await page.waitForFunction(() => window.__calls.filter((name) => name !== "videos").length === 4);
    await settle(page, 80);
    assert.deepEqual((await calls(page)).filter((name) => name !== "videos").sort(), ["matrices", "posts:מימד חמש", "posts:שבילי שפה", "posts:הצופן בסרטים"].sort());
    assert.equal(await page.locator(".dg29").getAttribute("data-dg29-load-state"), "armed");
    t.diagnostic("fixture initial delta while offscreen: -4 requests; video remains governed by its own 600px boundary");
  } finally { await page.close(); }
});

test("gateways: the video RPC is absent above fold, starts once 600px before the biblical gateway, preserves its items, and never repeats on re-entry", { skip }, async (t) => {
  const page = await open({}, { farBiblical: true });
  try {
    await page.evaluate(() => window.__api.mount("gateways"));
    await settle(page);
    const biblical = gateway(page, "הצופן התנ״כי");
    assert.equal((await calls(page)).filter((name) => name === "videos").length, 0, "initial above-fold entry has no video read");
    assert.equal(await videoPayloadBytes(page), 0, "initial fixture transfer excludes the video payload");
    assert.equal(await page.locator(".dg29").getAttribute("data-dg29-state"), "ready", "real primary rows make the gateways ready without waiting for deferred depth");
    assert.equal(await page.locator(".dg29").getAttribute("data-dg29-videos-state"), "deferred");

    const before = await biblical.boundingBox();
    const viewport = page.viewportSize();
    assert.ok(before.y > viewport.height + 600, `fixture starts outside the bounded margin: ${before.y}`);
    await page.evaluate(({ y, h }) => window.scrollTo(0, y - h - 550), { y: before.y, h: viewport.height });
    await page.waitForFunction(() => window.__calls.filter((name) => name === "videos").length === 1);
    await settle(page, 80);
    const approached = await biblical.boundingBox();
    assert.ok(approached.y >= viewport.height, `read began before the gateway became visible: ${approached.y}`);
    assert.equal(await page.locator(".dg29").getAttribute("data-dg29-videos-state"), "ready");
    assert.deepEqual(await biblical.locator("a.dg29-source span:first-child").allTextContents(), ["סרטון אחד", "סרטון שני", "מטריצה אחת", "מטריצה שתיים"]);
    const bytes = await videoPayloadBytes(page);
    assert.ok(bytes > 0, "fixture records the deferred response bytes");

    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page, 80);
    await page.evaluate(({ y, h }) => window.scrollTo(0, y - h - 550), { y: before.y, h: viewport.height });
    await settle(page, 120);
    assert.equal((await calls(page)).filter((name) => name === "videos").length, 1, "observer disconnects after the first approach");
    assert.equal(await videoPayloadBytes(page), bytes, "re-entry transfers no duplicate payload");
    t.diagnostic(`fixture initial delta: -1 request / -${bytes} bytes; rootMargin lead: 600px`);
  } finally { await page.close(); }
});

test("gateways: a deferred video failure keeps the existing biblical retry and a later attempt restores the same items", { skip }, async () => {
  const page = await open({ videos: ["fail", "ok"], matrices: ["empty", "empty"] }, { farBiblical: true });
  try {
    await page.evaluate(() => window.__api.mount("gateways"));
    await settle(page);
    const biblical = gateway(page, "הצופן התנ״כי");
    const before = await biblical.boundingBox(), viewport = page.viewportSize();
    await page.evaluate(({ y, h }) => window.scrollTo(0, y - h - 550), { y: before.y, h: viewport.height });
    await page.waitForFunction(() => window.__calls.filter((name) => name === "videos").length === 1);
    await settle(page, 80);
    assert.equal(await biblical.locator("button.h29-btn").count(), 1, "the empty/failed area remains retryable");
    await page.evaluate(() => { window.__calls.length = 0; });
    await biblical.locator("button.h29-btn").click();
    await settle(page);
    assert.deepEqual((await calls(page)).sort(), ["matrices", "videos"]);
    assert.deepEqual(await biblical.locator("a.dg29-source span:first-child").allTextContents(), ["סרטון אחד", "סרטון שני"]);
  } finally { await page.close(); }
});

test("gateways: browsers without IntersectionObserver load the biblical videos once instead of hiding them", { skip }, async () => {
  const page = await open({}, { farBiblical: true, disableIO: true });
  try {
    await page.evaluate(() => window.__api.mount("gateways"));
    await settle(page);
    assert.equal((await calls(page)).filter((name) => name === "videos").length, 1);
    assert.equal(await page.locator(".dg29").getAttribute("data-dg29-videos-state"), "ready");
    assert.equal(await gateway(page, "הצופן התנ״כי").locator("a.dg29-source").count(), 4);
  } finally { await page.close(); }
});

test("gateways: each area that failed says so in its own box with its own retry; areas that loaded and areas that are simply empty carry none", { skip }, async () => {
  const page = await open({ "posts:שבילי שפה": ["fail"], "posts:הצופן בסרטים": ["ok"], videos: ["empty"], matrices: ["fail"], "posts:מימד חמש": ["empty"] });
  try {
    await page.evaluate(() => window.__api.mount("gateways"));
    await settle(page);
    const language = gateway(page, "שבילי שפה"), cinema = gateway(page, "הצופן בקולנוע"), biblical = gateway(page, "הצופן התנ״כי");
    assert.match(await texts(language), new RegExp(FAILED));
    assert.equal(await language.locator("button.h29-btn").count(), 1);
    assert.equal(await cinema.locator("a.dg29-source").count(), 3, "the area that loaded shows its rows");
    assert.equal(await cinema.locator("button").count(), 0);
    assert.match(await texts(biblical), new RegExp(FAILED), "the matrices reader rejected and the videos reader came back empty: the area has nothing and one of its readers failed");
    assert.equal(await biblical.locator("button.h29-btn").count(), 1);
    // the dimension strip came back empty without failing: plain text, no retry
    assert.match(await page.locator(".dg29-dimension").innerText(), /אין פריט נוסף להצגה/);
    assert.equal(await page.locator(".dg29-dimension button.h29-btn").count(), 0);
  } finally { await page.close(); }
});

test("gateways: a retry repeats only the reads of the area that failed, and only that area changes", { skip }, async () => {
  const page = await open({ "posts:שבילי שפה": ["fail"], videos: ["empty"], matrices: ["fail"] });
  try {
    await page.evaluate(() => window.__api.mount("gateways"));
    await settle(page);
    assert.equal((await calls(page)).length, 5, "the first load runs the five readers once");
    const cinemaBefore = await texts(gateway(page, "הצופן בקולנוע"));
    await page.evaluate(() => { window.__calls.length = 0; });
    await gateway(page, "שבילי שפה").locator("button.h29-btn").click();
    await settle(page);
    assert.deepEqual(await calls(page), ["posts:שבילי שפה"], "the language area repeated its own read and nothing else");
    assert.equal(await gateway(page, "שבילי שפה").locator("a.dg29-source").count(), 2, "and now shows its rows (two of the three: the claim limit of that gateway)");
    assert.equal(await gateway(page, "שבילי שפה").locator("button").count(), 0);
    assert.equal(await texts(gateway(page, "הצופן בקולנוע")), cinemaBefore, "the area next to it did not change");
    assert.match(await texts(gateway(page, "הצופן התנ״כי")), new RegExp(FAILED), "the other failed area is still waiting for its own retry");
    await page.evaluate(() => { window.__calls.length = 0; });
    await gateway(page, "הצופן התנ״כי").locator("button.h29-btn").click();
    await settle(page);
    assert.deepEqual((await calls(page)).sort(), ["matrices", "videos"], "the biblical gateway is built from two readers; both ran again, nothing else did");
    assert.equal(await gateway(page, "הצופן התנ״כי").locator("a.dg29-source").count(), 4);
  } finally { await page.close(); }
});

test("gateways: an area that has some rows shows them even if one of its readers failed (no message, no retry: the area did not fail to load)", { skip }, async () => {
  const page = await open({ matrices: ["fail"] });
  try {
    await page.evaluate(() => window.__api.mount("gateways"));
    await settle(page);
    assert.equal(await gateway(page, "הצופן התנ״כי").locator("a.dg29-source").count(), 2, "the two video rows");
    assert.equal(await gateway(page, "הצופן התנ״כי").locator("button").count(), 0);
  } finally { await page.close(); }
});

test("gateways: a reader that swallows its errors makes an empty biblical gateway retryable; an empty category read by a reader that throws is simply empty", { skip }, async () => {
  const page = await open({ "posts:שבילי שפה": ["empty"], videos: ["empty"], matrices: ["empty"] });
  try {
    await page.evaluate(() => window.__api.mount("gateways"));
    await settle(page);
    assert.equal(await gateway(page, "שבילי שפה").locator("button").count(), 0);
    assert.match(await texts(gateway(page, "שבילי שפה")), /אין כרגע פוסטים ציבוריים בקטגוריה זו/);
    assert.equal(await gateway(page, "הצופן התנ״כי").locator("button.h29-btn").count(), 1);
    assert.match(await texts(gateway(page, "הצופן התנ״כי")), /אין כרגע סרטונים או מטריצות ציבוריות להצגה/, "it says what it always said when it is empty");
  } finally { await page.close(); }
});

test("gateways: a retry after a failed read runs that read once more and shows the rows it brings", { skip }, async () => {
  const page = await open({ "posts:שבילי שפה": ["fail", "ok"] });
  try {
    await page.evaluate(() => window.__api.mount("gateways"));
    await settle(page);
    await gateway(page, "שבילי שפה").locator("button.h29-btn").click();
    await settle(page);
    assert.equal(await gateway(page, "שבילי שפה").locator("a.dg29-source").count(), 2);
    assert.equal((await calls(page)).filter((name) => name === "posts:שבילי שפה").length, 2, "one read per attempt");
  } finally { await page.close(); }
});

test("Home: an empty latest-updates read shows the hero's and the strip's messages; one retry repeats that read only (not the strip below, not the gateways)", { skip }, async () => {
  const page = await open({ latest: ["empty"] });
  try {
    await page.evaluate(() => window.__api.mount("home"));
    await settle(page);
    assert.equal(await page.locator(".h29-hero.is-unavailable").count(), 1);
    assert.equal(await page.locator(".h29-updates .h29-notice button.h29-btn").count(), 1);
    assert.equal(await page.locator(".h29-updates article.h29-card").count(), 0);
    const first = await calls(page);
    assert.deepEqual([first.filter((name) => name === "latest").length, first.includes("notable"), first.filter((name) => name.startsWith("posts:")).length], [1, true, 3]);
    await page.evaluate(() => { window.__calls.length = 0; });
    await page.locator(".h29-updates .h29-notice button.h29-btn").click();
    await settle(page);
    assert.deepEqual(await calls(page), ["latest"], "only the read that failed ran again");
    assert.equal(await page.locator(".h29-updates article.h29-card").count(), 3, "four latest posts, the first of them is the hero's");
    assert.equal(await page.locator(".h29-notice").count(), 0);
    assert.equal(await page.locator(".h29-hero.is-unavailable").count(), 0);
  } finally { await page.close(); }
});

test("Home: the hero's own retry is the same retry; the strip of notable convergences retries by itself", { skip }, async () => {
  const page = await open({ latest: ["empty"] });
  try {
    await page.evaluate(() => window.__api.mount("home"));
    await settle(page);
    await page.evaluate(() => { window.__calls.length = 0; });
    await page.locator(".h29-hero.is-unavailable button.h29-btn").click();
    await settle(page);
    assert.deepEqual(await calls(page), ["latest"]);
  } finally { await page.close(); }
  // second visit: the strip was on screen before, so when its read fails a message stands in its place and its retry repeats that read only
  const again = await open({ notable: ["ok", "fail", "ok"] });
  try {
    await again.evaluate(() => window.__api.mount("home"));
    await settle(again);
    assert.equal(await again.locator(".h29-notable article").count(), 4, "first visit: the strip loaded");
    await again.evaluate(() => { window.__api.unmount(); window.__calls.length = 0; window.__api.mount("home"); });
    await settle(again);
    assert.equal(await again.locator(".h29-notable .h29-notice button.h29-btn").count(), 1, "the strip failed on the second visit: a message with a retry stands in its place");
    assert.equal(await again.locator("section[aria-label='התכנסויות בולטות']").count(), 1, "the section did not disappear");
    await again.evaluate(() => { window.__calls.length = 0; });
    await again.locator(".h29-notable .h29-notice button.h29-btn").click();
    await settle(again);
    assert.deepEqual(await calls(again), ["notable"], "only the strip's read ran again");
    assert.equal(await again.locator(".h29-notable article").count(), 4);
  } finally { await again.close(); }
});

// The plane story draws its own message when it cannot load. Its slot keeps the box the story held (it is the area the person was reading), bounded once out of view.
test("Home: the story slot keeps the box the story held when the story swaps to its own message; once out of view the box is bounded, and the story's own retry loads it again in that box", { skip }, async () => {
  const page = await open({ story: ["ok", "fail", "ok"] });
  try {
    await page.addStyleTag({ content: ".h29 > .h29-sec { min-height: 1000px; }" });   // the story sits below the first screen, so it can be in view or out of it
    await page.evaluate(() => window.__api.mount("home", { withStory: true }));
    await settle(page, 1100);
    const slot = page.locator("[data-scroll-anchor='home:reveal:story']");
    const box = async () => Math.round((await slot.boundingBox()).height);
    assert.equal(await box(), 300, "first visit: the story's own height, remembered");
    await page.evaluate(() => { window.__api.unmount(); window.__api.mount("home", { withStory: true }); });
    // scroll so that the slot is in view when the story fails
    await slot.scrollIntoViewIfNeeded();
    await page.evaluate(() => { window.__frames = []; const tick = () => { const n = document.querySelector("[data-scroll-anchor='home:reveal:story']"); if (n) window.__frames.push(Math.round(n.getBoundingClientRect().height)); window.__tick = requestAnimationFrame(tick); }; tick(); });
    await settle(page, 1100);
    assert.equal(await page.locator("[data-scroll-anchor='home:reveal:story'] .state-unavailable").count(), 1, "the story swapped to its own message");
    assert.equal(await box(), 300, "second visit: the story failed, the slot keeps the box it held (in view: nothing moves)");
    const heights = await page.evaluate(() => { cancelAnimationFrame(window.__tick); return [...new Set(window.__frames)]; });
    assert.ok(heights.every((h) => h >= 300), `no frame shows the slot collapsed: ${JSON.stringify(heights)}`);
    // out of view: bounded
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page, 500);
    assert.equal(await box(), 160, "out of view the reservation is bounded");
    // the story's own retry: loads in a whole box again, and the story that arrives fits it
    await slot.scrollIntoViewIfNeeded();
    await page.locator("[data-scroll-anchor='home:reveal:story'] button").click();
    await settle(page, 1100);
    assert.equal(await box(), 300);
    assert.equal(await page.locator("[data-scroll-anchor='home:reveal:story'] .state-unavailable").count(), 0);
  } finally { await page.close(); }
});

test("Home, cold load: the updates strip stands four loading cards in the first screen until its read settles; the notable strip and the gateways stand none without evidence", { skip }, async () => {
  const page = await open({});
  try {
    await page.evaluate(() => window.__api.mount("home"));
    await sleep(8);
    assert.equal(await page.locator(".h29-updates article.h29-card.is-loading[aria-hidden='true']").count(), 4);
    assert.equal(await page.locator(".h29-notable .is-loading").count(), 0);
    assert.equal(await page.locator(".dg29-source.is-loading, .dg29-dimension-source.is-loading").count(), 0);
    await sleep(500);
    assert.equal(await page.locator(".h29-updates article.is-loading").count(), 0, "the real cards took their places");
    assert.equal(await page.locator(".h29-updates article.h29-card").count(), 3);
  } finally { await page.close(); }
});
