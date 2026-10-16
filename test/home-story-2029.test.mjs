// The plane story on Home asks for the post's own row and nothing of the reading projection's extension phase. The real WorldFlightStory2029 over stand-in readers
// (test/fixtures/story-harness), against the component exactly as before (negative control and DOM reference): which reads run, what is drawn, what happens when the row
// cannot be used on Home, and that World still gets the full projection. Behavior only; no speed is measured here.
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
const harness = join(here, "fixtures/story-harness");
const stubs = join(harness, "stubs.js");
const CURRENT = join(here, "../src/components/research/WorldFlightStory2029.jsx");
const BEFORE = join(harness, "WorldFlightStory2029.bdaf63e4.jsx");

const REPLACED = [/\/lib\/supabase\.js$/, /\/lib\/research\/post2029ReadingProjection\.js$/, /\/lib\/research\/post2029ExperienceProjection\.js$/, /\/lib\/research\/worldDiscoveryStream\.js$/, /\/lib\/postReadQueries2029\.js$/,
  /\/Sod2029Shell\.jsx$/, /\/NavigationIcon2029\.jsx$/, /\/PostTimeline2029\.jsx$/, /\/PostCategories2029\.jsx$/];
const plugin = (story) => ({
  name: "story-harness", enforce: "pre",
  resolveId(source) { if (source === "@story") return story; if (REPLACED.some((pattern) => pattern.test(source))) return stubs; if (/\.css$/.test(source)) return "\0empty-css"; return null; },
  load(id) { return id === "\0empty-css" ? "export default ''" : null; },
});
async function bundle(story) {
  const outDir = mkdtempSync(join(tmpdir(), "story-harness-"));
  await build({ configFile: false, logLevel: "silent", root: harness, plugins: [plugin(story), react()], define: { "process.env.NODE_ENV": '"production"' },
    build: { outDir, emptyOutDir: true, minify: false, lib: { entry: join(harness, "main.jsx"), formats: ["iife"], name: "StoryHarness", fileName: () => "harness.js" } } });
  return readFileSync(join(outDir, readdirSync(outDir).find((name) => name.endsWith(".js"))), "utf8");
}
let current = null, before = null, browser = null;
test.before(async () => {
  if (skip) return;
  [current, before] = await Promise.all([bundle(CURRENT), bundle(BEFORE)]);
  browser = await chromium.launch({ executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
});
test.after(async () => { await browser?.close(); });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ROW = { id: 5107, slug: "flydubai-fz1073-363-14000-remzei-geula", title: "טיסה אחת", tags: ["חדשות"], categories: ["רמזי גאולה", "מספרים"], thumb_url: "https://img.test/thumb.webp", image_url: "https://img.test/full.webp",
  date: "2026-10-01T10:00:00Z", modified: "2026-10-02T10:00:00Z" };
async function run(script, surface, { post = ROW, media = null, hash = "" } = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent("<!doctype html><body><div id='root'></div></body>");
  await page.evaluate(([row, mediaValue]) => { window.__post = row; window.__media = mediaValue; window.__calls = []; }, [post, media]);
  await page.addScriptTag({ content: script });
  await page.evaluate(([s, h]) => window.__api.mount(s, "/" + h), [surface, hash]);
  await sleep(400);
  return { page, calls: await page.evaluate(() => window.__calls.slice()), html: await page.evaluate(() => document.getElementById("root").innerHTML) };
}

test("Home: the story reads the post's row once and does not load the reading projection or run its extension reads", { skip }, async () => {
  const now = await run(current, "home");
  try {
    assert.deepEqual(now.calls, ["getPostBySlug"]);
    assert.match(now.html, /sod29-flight-story is-home/);
    assert.equal(await now.page.locator("img").getAttribute("src"), ROW.thumb_url);
  } finally { await now.page.close(); }
  const was = await run(before, "home");
  try { assert.deepEqual(was.calls, ["fetchPost2029ReadingProjection", "getPostBySlug", "extension reads"], "negative control: the component before loaded the builder and ran the extension phase for the same card"); }
  finally { await was.page.close(); }
});

test("Home: the card is the same markup as before, for the same row", { skip }, async () => {
  const now = await run(current, "home"), was = await run(before, "home");
  try { assert.equal(now.html, was.html); assert.ok(now.html.length > 200); } finally { await now.page.close(); await was.page.close(); }
  // an image only in the full-size field, no categories, no date: the same again
  const sparse = { ...ROW, thumb_url: null, categories: [], date: null, modified: null };
  const a = await run(current, "home", { post: sparse }), b = await run(before, "home", { post: sparse });
  try { assert.equal(a.html, b.html); assert.deepEqual(a.calls, ["getPostBySlug"]); } finally { await a.page.close(); await b.page.close(); }
});

test("Home: a row without any image still goes through the full reader, which may supply the image from the post's experience media", { skip }, async () => {
  const noImage = { ...ROW, thumb_url: null, image_url: null };
  const now = await run(current, "home", { post: noImage, media: { highlight: { poster: "https://img.test/poster.webp" } } });
  const was = await run(before, "home", { post: noImage, media: { highlight: { poster: "https://img.test/poster.webp" } } });
  try {
    assert.ok(now.calls.includes("fetchPost2029ReadingProjection"), "the full reader decides");
    assert.equal(await now.page.locator("img").getAttribute("src"), "https://img.test/poster.webp");
    assert.equal(now.html, was.html, "and the card is what it was");
  } finally { await now.page.close(); await was.page.close(); }
});

test("Home: a post that is not Home material (not found, draft, forum) ends in the same unavailable message without loading the builder", { skip }, async () => {
  for (const post of [null, { ...ROW, tags: ["טיוטה"] }, { ...ROW, tags: ["פורום"] }]) {
    const now = await run(current, "home", { post }), was = await run(before, "home", { post });
    try {
      assert.match(now.html, /state-unavailable/);
      assert.match(now.html, /נסה שוב את המקור/);
      assert.equal(now.html, was.html, "the message is the one it was");
      assert.ok(!now.calls.includes("fetchPost2029ReadingProjection"));
    } finally { await now.page.close(); await was.page.close(); }
  }
});

test("Home: the retry in the story's own message reads the row again, and only that", { skip }, async () => {
  const now = await run(current, "home", { post: null });
  try {
    await now.page.evaluate((row) => { window.__post = row; window.__calls.length = 0; }, ROW);
    await now.page.getByText("נסה שוב את המקור").click();
    await sleep(300);
    assert.deepEqual(await now.page.evaluate(() => window.__calls.slice()), ["getPostBySlug"]);
    assert.match(await now.page.evaluate(() => document.getElementById("root").innerHTML), /sod29-flight-story is-home/);
  } finally { await now.page.close(); }
});

test("World: the story still gets the full projection (timeline and all), exactly as before", { skip }, async () => {
  const now = await run(current, "world"), was = await run(before, "world");
  try {
    assert.deepEqual(now.calls, was.calls);
    assert.ok(now.calls.includes("extension reads"));
    assert.equal(now.html, was.html);
    assert.match(now.html, /sod29-flight-time/);
  } finally { await now.page.close(); await was.page.close(); }
});
