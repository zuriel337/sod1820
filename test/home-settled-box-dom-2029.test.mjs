// useSettledBox in a real browser: what a viewport width change does to a box that was remembered at another width while its list is still loading.
// The same scenario runs against the current hook and against the hook of e23dee27 (negative control): the old one released the held height but left an
// empty box (no loading slots, since its `held` only changes at the next render), so the box collapsed and grew again. The current one re-renders the
// loading slots at the new width in the same frame (flushSync), so no painted frame shows the collapsed box.
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
const harness = join(here, "fixtures/settled-box-harness");
// The hold rules of the product's own stylesheet (not a copy): min-block-size from the remembered box, and align-content: start so a held box never stretches its rows.
const homeCss = readFileSync(join(here, "../src/components/experience2029/homeComposition2029.css"), "utf8");
const holdRules = homeCss.split("\n").filter((line) => /^\.h29 \[data-h29-hold\]/.test(line)).join("\n");
const CSS = `${holdRules}\nbody { margin: 0; }`;
const CSS_WITHOUT_ALIGN = CSS.replace(/\.h29 \[data-h29-hold\] \{ align-content: start; \}/, "");

async function bundle(hookPath) {
  const outDir = mkdtempSync(join(tmpdir(), "settled-box-harness-"));
  await build({ configFile: false, logLevel: "silent", root: harness, plugins: [react()], define: { "process.env.NODE_ENV": '"production"' },
    resolve: { alias: { "@hook": hookPath } },
    build: { outDir, emptyOutDir: true, minify: false, lib: { entry: join(harness, "main.jsx"), formats: ["iife"], name: "SettledBoxHarness", fileName: () => "harness.js" } } });
  return join(outDir, readdirSync(outDir).find((name) => name.endsWith(".js")));
}
let current = null, previous = null, atHead = null, browser = null;
test.before(async () => {
  if (skip) return;
  [current, previous, atHead] = await Promise.all([bundle(join(here, "../src/components/experience2029/useSettledBox2029.js")), bundle(join(harness, "useSettledBox.e23dee27.js")), bundle(join(harness, "useSettledBox.e3498434.js"))]);
  browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
});
test.after(async () => { await browser?.close(); });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function openHarness(script, width = 390, css = CSS) {
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  await page.setContent(`<!doctype html><style>${css}</style><body></body>`);
  await page.addScriptTag({ content: readFileSync(script, "utf8") });
  return page;
}
// A page with a real origin, so images can be held back and let through later (the cards carry images that arrive after the content settled).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
async function openHarnessWithSlowImages(script, css = CSS) {
  const page = await browser.newPage({ viewport: { width: 390, height: 700 } });
  const held = [];
  await page.route("http://harness.test/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith("/slow-")) held.push(route);
    else route.fulfill({ contentType: "text/html", body: `<!doctype html><style>${css}</style><body></body>` });
  });
  await page.goto("http://harness.test/");
  await page.addScriptTag({ content: readFileSync(script, "utf8") });
  return { page, held, release: async () => { for (const route of held.splice(0)) await route.fulfill({ contentType: "image/png", body: PNG }); } };
}
// remembered at the current width, then "return to Home while the list is loading again"
async function returnWhileLoading(page) {
  await page.evaluate(() => window.__api.mount({ pending: false, items: 4, slots: 4 }));
  await page.waitForFunction(() => window.__api.memory() !== null);
  const memory = await page.evaluate(() => window.__api.memory());
  await page.evaluate(() => { window.__api.unmount(); window.__api.mount({ pending: true, items: 0, slots: 4 }); });
  await page.evaluate(() => window.__api.startFrames());
  await sleep(150);
  return memory;
}

test("a box remembered at this width is its own placeholder on a return: held height applied, no loading slots rendered", { skip }, async () => {
  const page = await openHarness(current);
  try {
    const memory = await returnWhileLoading(page);
    assert.equal(memory.h, 4 * 100 + 3 * 8, "natural extent of the four cards and their gaps");
    const state = await page.evaluate(() => window.__api.state());
    assert.deepEqual([state.held, state.slots, state.hasVar, state.h], ["1", 0, true, memory.h]);
  } finally { await page.close(); }
});

test("a viewport width change while loading releases the hold and draws the loading slots at the new width in the same frame", { skip }, async () => {
  const page = await openHarness(current);
  try {
    await returnWhileLoading(page);
    await page.setViewportSize({ width: 320, height: 700 });
    await sleep(400);
    const frames = (await page.evaluate(() => window.__api.frames())).filter((frame) => frame.vw === 320);
    assert.ok(frames.length > 3, "frames were sampled after the resize");
    const collapsed = frames.filter((frame) => frame.slots === 0 && !frame.hasVar && frame.cards === 0);
    assert.equal(collapsed.length, 0, `no frame shows the box collapsed (empty, hold released, no slots): ${JSON.stringify(collapsed.slice(0, 2))}`);
    const last = frames.at(-1);
    assert.deepEqual([last.held, last.slots, last.hasVar, last.minBlock], ["0", 4, false, "0px"]);
    assert.ok(frames.every((frame) => frame.h >= 4 * 100), "the reserved height never drops below the slots' natural height");
  } finally { await page.close(); }
});

test("negative control: the hook of e23dee27 collapses the box on the same width change (released, but no slots until a later render)", { skip }, async () => {
  const page = await openHarness(previous);
  try {
    await returnWhileLoading(page);
    await page.setViewportSize({ width: 320, height: 700 });
    await sleep(400);
    const frames = (await page.evaluate(() => window.__api.frames())).filter((frame) => frame.vw === 320);
    const collapsed = frames.filter((frame) => frame.slots === 0 && !frame.hasVar && frame.cards === 0);
    assert.ok(collapsed.length > 0, "the previous hook leaves an empty, collapsed box");
    assert.ok(collapsed.every((frame) => frame.h < 4 * 100), "collapsed below the slots' natural height");
  } finally { await page.close(); }
});

test("an unchanged width keeps the hold (a height-only viewport change is not a width change)", { skip }, async () => {
  const page = await openHarness(current);
  try {
    const memory = await returnWhileLoading(page);
    await page.setViewportSize({ width: 390, height: 500 });
    await sleep(300);
    const state = await page.evaluate(() => window.__api.state());
    assert.deepEqual([state.held, state.slots, state.hasVar, state.h], ["1", 0, true, memory.h]);
  } finally { await page.close(); }
});

test("after a release the loaded list is natural size at the new width, and the new width is what gets remembered", { skip }, async () => {
  const page = await openHarness(current);
  try {
    await returnWhileLoading(page);
    await page.setViewportSize({ width: 320, height: 700 });
    await sleep(300);
    await page.evaluate(() => window.__api.render({ pending: false, items: 4, slots: 4 }));
    await sleep(300);
    const state = await page.evaluate(() => window.__api.state());
    assert.deepEqual([state.cards, state.slots, state.minBlock], [4, 0, "0px"]);
    const memory = await page.evaluate(() => window.__api.memory());
    assert.equal(memory.vw, 320, "remembered for the viewport it was measured at");
    assert.equal(memory.w, 320);
  } finally { await page.close(); }
});

// A list that settles with another number of items than the box that was held (4 -> 2) is natural size, and stays so through later renders. The previous hook
// kept the held height in an inline variable: once the new, smaller box was remembered the hold attribute came back and re-expanded the list to the old height.
async function shrinkThenRerender(page) {
  await page.evaluate(() => window.__api.mount({ pending: false, items: 4, slots: 4 }));
  await page.waitForFunction(() => window.__api.memory() !== null);
  await page.evaluate(() => { window.__api.unmount(); window.__api.mount({ pending: true, items: 0, slots: 4 }); });
  await sleep(100);
  await page.evaluate(() => window.__api.render({ pending: false, items: 2, slots: 4 }));
  await sleep(200);
  const settled = await page.evaluate(() => window.__api.state());
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__api.render({ pending: false, items: 2, slots: 4 })); await sleep(100); }
  return { settled, later: await page.evaluate(() => window.__api.state()) };
}
test("a list that settles with fewer items than the held box stays natural size through later renders", { skip }, async () => {
  const page = await openHarness(current);
  try {
    const { settled, later } = await shrinkThenRerender(page);
    assert.equal(settled.h, 2 * 100 + 8, "natural size right after the read");
    assert.equal(later.h, 2 * 100 + 8, "and after later renders");
    assert.equal(later.hasVar, false, "the spent held height is dropped");
  } finally { await page.close(); }
});
test("negative control: the hook of e3498434 (the head before this fix) re-expands that list to the old held height on a later render", { skip }, async () => {
  const page = await openHarness(atHead);
  try {
    const { later } = await shrinkThenRerender(page);
    assert.equal(later.h, 4 * 100 + 3 * 8, "back at the held height of the four items it had before");
    assert.equal(later.hasVar, true);
  } finally { await page.close(); }
});

// ---- the box that is remembered and held: what it is measured from, what it does to the rows, and the message that keeps it ----
const NATURAL = 4 * 100 + 3 * 8;   // four 100 px cards and their gaps

test("the remembered box is the layout extent of the list: cards painted offset by an entrance animation do not inflate it", { skip }, async () => {
  const page = await openHarness(current);
  try {
    await page.evaluate(() => window.__api.mount({ pending: false, items: 4, slots: 4, shift: 6 }));
    await page.waitForFunction(() => window.__api.memory() !== null);
    assert.equal((await page.evaluate(() => window.__api.memory())).h, NATURAL, "the layout extent, whatever the paint does");
  } finally { await page.close(); }
});
test("negative control: the hook of e3498434 measured the painted rectangles and remembered a box 18 px taller than the list", { skip }, async () => {
  const page = await openHarness(atHead);
  try {
    await page.evaluate(() => window.__api.mount({ pending: false, items: 4, slots: 4, shift: 6 }));
    await page.waitForFunction(() => window.__api.memory() !== null);
    assert.equal((await page.evaluate(() => window.__api.memory())).h, NATURAL + 3 * 6);
  } finally { await page.close(); }
});

// a box held at 8 px more than the list is (what the old measurement left behind); the images have not arrived, so the content is not final yet
async function returnOverHeld(script, css) {
  const harness = await openHarnessWithSlowImages(script, css);
  await harness.page.evaluate((h) => { window.__api.remember({ w: 390, vw: 390, h, n: 4 }); window.__api.mount({ pending: false, items: 4, slots: 4, images: true }); }, NATURAL + 8);
  await sleep(250);
  return harness;
}
test("a held box never stretches its rows: the extra height stays blank at the end, the cards keep their own height", { skip }, async () => {
  const { page } = await returnOverHeld(current);
  try {
    const geometry = await page.evaluate(() => window.__api.geometry());
    assert.deepEqual([geometry.box, geometry.extent, geometry.firstRow, geometry.hasVar], [NATURAL + 8, NATURAL, "100px", true]);
  } finally { await page.close(); }
});
test("negative control: without align-content: start the same held box hands its extra height to the grid rows", { skip }, async () => {
  const { page } = await returnOverHeld(current, CSS_WITHOUT_ALIGN);
  try {
    const geometry = await page.evaluate(() => window.__api.geometry());
    assert.equal(geometry.firstRow, "102px");
    assert.ok(geometry.extent > NATURAL, "and the list measured from itself is taller than it is");
  } finally { await page.close(); }
});

// the list came back empty, or its read failed: a message stands where the cards were, in the box that was held
async function returnEmpty(script) {
  const page = await openHarness(script);
  await page.evaluate((h) => { window.__api.remember({ w: 390, vw: 390, h, n: 4 }); window.__api.mount({ pending: true, items: 0, slots: 4 }); }, NATURAL);
  await sleep(100);
  await page.evaluate(() => window.__api.startFrames());
  await page.evaluate(() => window.__api.render({ pending: false, items: 0, slots: 4, keep: true }));
  await sleep(300);
  return page;
}
test("an empty return keeps the box that was held: the message is in the place of the cards and no frame collapses", { skip }, async () => {
  const page = await returnEmpty(current);
  try {
    const geometry = await page.evaluate(() => window.__api.geometry());
    assert.deepEqual([geometry.box, geometry.message, geometry.hasVar], [NATURAL, "unavailable", true]);
    const frames = await page.evaluate(() => window.__api.frames());
    assert.ok(frames.length > 3 && frames.every((frame) => frame.h === NATURAL), `every frame keeps ${NATURAL}px: ${JSON.stringify([...new Set(frames.map((frame) => frame.h))])}`);
  } finally { await page.close(); }
});
test("negative control: the hook of e3498434 collapses the box into the message", { skip }, async () => {
  const page = await returnEmpty(atHead);
  try {
    assert.ok((await page.evaluate(() => window.__api.geometry())).box < NATURAL / 4);
  } finally { await page.close(); }
});
test("a retry from the message loads again in the same box and the list that arrives fits it, with nothing remembered about the empty state", { skip }, async () => {
  const page = await returnEmpty(current);
  try {
    assert.equal((await page.evaluate(() => window.__api.memory())).h, NATURAL, "an empty list is not remembered");
    await page.evaluate(() => window.__api.render({ pending: true, items: 0, slots: 4 }));
    await sleep(100);
    assert.equal((await page.evaluate(() => window.__api.geometry())).box, NATURAL, "retrying keeps the box");
    await page.evaluate(() => window.__api.render({ pending: false, items: 4, slots: 4 }));
    await sleep(300);
    const geometry = await page.evaluate(() => window.__api.geometry());
    assert.deepEqual([geometry.box, geometry.extent, geometry.hasVar], [NATURAL, NATURAL, true]);
  } finally { await page.close(); }
});

// ---- the reservation a message keeps is bounded, and let go only where the person cannot see it ----
async function failedWhileHeld(page, { before = 0 } = {}) {
  await page.evaluate(({ h, before }) => { window.__api.remember({ w: 390, vw: 390, h, n: 4 }); window.__api.mount({ pending: true, items: 0, slots: 4, before }); }, { h: NATURAL, before });
  await sleep(100);
  await page.evaluate(() => window.__api.render({ pending: false, items: 0, slots: 4, keep: true, before: window.__api.before }));
}
test("a message keeps the whole reservation while its area is in view or above the viewport (shrinking it there moves what the person reads), and what follows it does not move", { skip }, async () => {
  const page = await openHarness(current);
  try {
    await page.evaluate(() => { window.__api.before = 0; });
    await failedWhileHeld(page);
    await sleep(300);
    assert.equal((await page.evaluate(() => window.__api.geometry())).box, NATURAL, "in view: nothing moves");
    // scroll until the area is entirely above the viewport and what follows it is in view
    const tailDocTop = await page.evaluate(() => window.__api.tailDocTop());
    await page.evaluate((top) => window.scrollTo(0, top + 20), tailDocTop);
    await sleep(500);
    const geometry = await page.evaluate(() => window.__api.geometry());
    assert.equal(geometry.box, NATURAL, "above the viewport: the reservation stays (letting it go would move the reading place)");
    const tailTop = await page.evaluate(() => window.__api.tailTop());
    assert.ok(Math.abs(tailTop - -20) <= 1, `what follows the area did not move (${tailTop}px instead of -20px)`);
  } finally { await page.close(); }
});
test("a message's reservation is let go when the person scrolls past the area upwards (the area is then below the viewport)", { skip }, async () => {
  const page = await openHarness(current);
  try {
    await page.evaluate(() => { window.__api.before = 1500; });
    await page.evaluate(({ h }) => { window.__api.remember({ w: 390, vw: 390, h, n: 4 }); window.__api.mount({ pending: true, items: 0, slots: 4, before: 1500 }); }, { h: NATURAL });
    await sleep(100);
    await page.evaluate(() => window.scrollTo(0, 1500));   // the area is in view when its read fails
    await sleep(200);
    await page.evaluate(() => window.__api.render({ pending: false, items: 0, slots: 4, keep: true, before: 1500 }));
    await sleep(400);
    assert.equal((await page.evaluate(() => window.__api.geometry())).box, NATURAL, "in view: kept whole");
    await page.evaluate(() => window.scrollTo(0, 0));       // up and past it: the area is now below the viewport
    await sleep(500);
    assert.equal((await page.evaluate(() => window.__api.geometry())).box, 160, "below the viewport: bounded");
  } finally { await page.close(); }
});
test("an area below the first screen shrinks to the bound at once (nothing in view is under it), and a retry gives the whole reservation back", { skip }, async () => {
  const page = await openHarness(current);
  try {
    await page.evaluate(() => { window.__api.before = 2000; });
    await failedWhileHeld(page, { before: 2000 });
    await sleep(400);
    assert.equal((await page.evaluate(() => window.__api.geometry())).box, 160);
    await page.evaluate(() => window.__api.render({ pending: true, items: 0, slots: 4, before: 2000 }));
    await sleep(200);
    assert.equal((await page.evaluate(() => window.__api.geometry())).box, NATURAL, "retrying loads in the whole box that was held, so the list that arrives fits it");
  } finally { await page.close(); }
});
test("an area that held less than the bound keeps what it held (nothing to give back)", { skip }, async () => {
  const page = await openHarness(current);
  try {
    await page.evaluate(() => { window.__api.remember({ w: 390, vw: 390, h: 120, n: 2 }); window.__api.mount({ pending: true, items: 0, slots: 2, before: 2000 }); });
    await sleep(100);
    await page.evaluate(() => window.__api.render({ pending: false, items: 0, slots: 2, keep: true, before: 2000 }));
    await sleep(400);
    assert.equal((await page.evaluate(() => window.__api.geometry())).box, 120);
  } finally { await page.close(); }
});
test("a cold area (nothing remembered) keeps the box its loading state had, so a failure does not collapse it either", { skip }, async () => {
  const page = await openHarness(current);
  try {
    await page.evaluate(() => window.__api.mount({ pending: true, items: 0, slots: 3 }));
    await sleep(200);
    const loadingBox = (await page.evaluate(() => window.__api.geometry())).box;
    assert.equal(loadingBox, 3 * 100 + 2 * 8);
    await page.evaluate(() => window.__api.render({ pending: false, items: 0, slots: 3, keep: true }));
    await sleep(300);
    const geometry = await page.evaluate(() => window.__api.geometry());
    assert.deepEqual([geometry.box, geometry.message], [loadingBox, "unavailable"]);
  } finally { await page.close(); }
});
