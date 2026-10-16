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
const CSS = ".h29 [data-h29-hold] { min-block-size: var(--h29-settled-h, 0px); } body { margin: 0; }";

async function bundle(hookPath) {
  const outDir = mkdtempSync(join(tmpdir(), "settled-box-harness-"));
  await build({ configFile: false, logLevel: "silent", root: harness, plugins: [react()], define: { "process.env.NODE_ENV": '"production"' },
    resolve: { alias: { "@hook": hookPath } },
    build: { outDir, emptyOutDir: true, minify: false, lib: { entry: join(harness, "main.jsx"), formats: ["iife"], name: "SettledBoxHarness", fileName: () => "harness.js" } } });
  return join(outDir, readdirSync(outDir).find((name) => name.endsWith(".js")));
}
let current = null, previous = null, browser = null;
test.before(async () => {
  if (skip) return;
  [current, previous] = await Promise.all([bundle(join(here, "../src/components/experience2029/useSettledBox2029.js")), bundle(join(harness, "useSettledBox.e23dee27.js"))]);
  browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
});
test.after(async () => { await browser?.close(); });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function openHarness(script, width = 390) {
  const page = await browser.newPage({ viewport: { width, height: 700 } });
  await page.setContent(`<!doctype html><style>${CSS}</style><body></body>`);
  await page.addScriptTag({ content: readFileSync(script, "utf8") });
  return page;
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
