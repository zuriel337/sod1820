// The plane story on Home/World over stand-in readers (test/fixtures/story-harness), against the component exactly as before
// (negative control and DOM reference): which reads run, what is drawn, public admission, the explicit World timeline boundary,
// retry/lifecycle behavior and return navigation. Behavior only; no speed is measured here.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { HOME_STORY_POST_COLUMNS_2029 } from "../src/lib/postReadQueries2029.js";

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
  /\/Sod2029Shell\.jsx$/, /\/NavigationIcon2029\.jsx$/, /\/PostTimeline2029\.jsx$/, /\/PostCategories2029\.jsx$/, /\/onDemandLoader2029\.js$/];
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
async function run(script, surface, {
  post = ROW, fullPost, media = null, primaryMedia = null, timeline,
  projectionFlags = {}, moduleFailures = 0, extensionFailures = 0,
  extensionDelay = 60, trackModuleRequests = false, hash = "",
} = {}) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.setContent("<!doctype html><body><div id='root'></div></body>");
  await page.evaluate(([fixture, columns]) => {
    window.__post = fixture.post;
    window.__fullPost = fixture.fullPost;
    window.__media = fixture.media;
    window.__primaryMedia = fixture.primaryMedia;
    window.__timeline = fixture.timeline;
    window.__projectionFlags = fixture.projectionFlags;
    window.__moduleFailures = fixture.moduleFailures;
    window.__extensionFailures = fixture.extensionFailures;
    window.__extensionDelay = fixture.extensionDelay;
    window.__trackModuleRequests = fixture.trackModuleRequests;
    window.__calls = [];
    window.__shellCalls = [];
    window.__contextCalls = [];
    window.__columns = columns.split(",");
  }, [{ post, fullPost, media, primaryMedia, timeline, projectionFlags, moduleFailures, extensionFailures, extensionDelay, trackModuleRequests }, HOME_STORY_POST_COLUMNS_2029]);
  await page.addScriptTag({ content: script });
  await page.evaluate(([s, h]) => window.__api.mount(s, "/" + h), [surface, hash]);
  await sleep(400);
  return { page, calls: await page.evaluate(() => window.__calls.slice()), html: await page.evaluate(() => document.getElementById("root").innerHTML) };
}

test("Home: the story reads the post's card columns once and does not load the reading projection or run its extension reads", { skip }, async () => {
  const now = await run(current, "home");
  try {
    assert.deepEqual(now.calls, ["getPostCardBySlug"]);
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
  try { assert.equal(a.html, b.html); assert.deepEqual(a.calls, ["getPostCardBySlug"]); } finally { await a.page.close(); await b.page.close(); }
});

test("Home: a row with a body, excerpt and author draws the same card as the narrow row the card now receives", { skip }, async () => {
  const fat = { ...ROW, content: "<p>" + "גוף הפוסט ".repeat(500) + "</p>", excerpt: "תקציר", author: "מחבר", created_at: "2026-09-30T08:55:00Z", wp_id: 9 };
  const now = await run(current, "home", { post: fat }), was = await run(before, "home", { post: fat });
  try {
    assert.deepEqual(now.calls, ["getPostCardBySlug"]);
    assert.deepEqual(was.calls, ["fetchPost2029ReadingProjection", "getPostBySlug", "extension reads"]);
    assert.equal(now.html, was.html, "the card is what it was when it received the whole row");
    assert.ok(!now.html.includes("גוף הפוסט"));
  } finally { await now.page.close(); await was.page.close(); }
});

test("Home: a row without any image still goes through the full reader, which may supply the image from the post's experience media", { skip }, async () => {
  const noImage = { ...ROW, thumb_url: null, image_url: null };
  const now = await run(current, "home", { post: noImage, media: { highlight: { poster: "https://img.test/poster.webp" } } });
  const was = await run(before, "home", { post: noImage, media: { highlight: { poster: "https://img.test/poster.webp" } } });
  try {
    assert.deepEqual(now.calls, ["getPostCardBySlug", "fetchPost2029ReadingProjection", "getPostBySlug", "extension reads"], "the card columns first, then the full reader as before");
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
    assert.deepEqual(await now.page.evaluate(() => window.__calls.slice()), ["getPostCardBySlug"]);
    assert.match(await now.page.evaluate(() => document.getElementById("root").innerHTML), /sod29-flight-story is-home/);
  } finally { await now.page.close(); }
});

test("World opening: the compact row draws the same visible story without requesting the projection module or extensions", { skip }, async () => {
  const now = await run(current, "world", { trackModuleRequests: true }), was = await run(before, "world");
  try {
    assert.deepEqual(now.calls, ["getPostCardBySlug"]);
    assert.deepEqual(was.calls, ["fetchPost2029ReadingProjection", "getPostBySlug", "extension reads"], "negative control: the previous opening ran the full reader");
    for (const selector of [".sod29-flight-feature", ".sod29-flight-directions"]) {
      assert.equal(await now.page.locator(selector).evaluate((node) => node.outerHTML), await was.page.locator(selector).evaluate((node) => node.outerHTML), `${selector} remains exact`);
    }
    assert.match(now.html, /sod29-flight-time/);
    assert.equal(await now.page.locator("[data-timeline-current]").count(), 0);
  } finally { await now.page.close(); await was.page.close(); }
});

test("World details: one shared full load preserves timeline order, modified text, source identity and return navigation", { skip }, async () => {
  const timeline = [
    { id: "published", href: "/post/first", label: "הפוסט פורסם" },
    { id: "event", href: "/topic/second#event", label: "האירוע תועד" },
    { id: "current", href: `/post/${ROW.slug}`, label: "הסיפור הנוכחי" },
  ];
  const now = await run(current, "world", { timeline, trackModuleRequests: true });
  try {
    assert.deepEqual(now.calls, ["getPostCardBySlug"]);
    await now.page.locator(".sod29-flight-time summary").click();
    await now.page.locator("[data-timeline-current]").waitFor();
    assert.deepEqual(await now.page.evaluate(() => window.__calls.slice()), [
      "getPostCardBySlug", "projection module request", "fetchPost2029ReadingProjection", "getPostBySlug", "extension reads",
    ]);
    assert.equal(await now.page.locator("[data-timeline-current]").getAttribute("data-timeline-current"), `/post/${ROW.slug}`);
    assert.deepEqual(await now.page.locator("[data-timeline-current] a").allTextContents(), timeline.map((item) => item.label));
    assert.deepEqual(await now.page.locator("[data-timeline-current] a").evaluateAll((links) => links.map((link) => link.getAttribute("href"))), timeline.map((item) => item.href));
    assert.match(await now.page.locator(".sod29-flight-time").innerText(), /עדכון הפוסט: .*עדכון אינו אירוע חדש/);

    await now.page.getByText("לקריאת פוסט המטוס", { exact: false }).click();
    const navigation = await now.page.evaluate(() => ({ shell: window.__shellCalls, context: window.__contextCalls }));
    assert.deepEqual(navigation.shell, [{ path: `/post/${ROW.slug}`, options: { preserve: false } }]);
    assert.equal(navigation.context[0].subject.id, String(ROW.id));
    assert.equal(navigation.context[0].subject.href, `/post/${ROW.slug}`);
    assert.equal(navigation.context[0].selection.sourceRef, `posts:${ROW.id}`);
    assert.equal(navigation.context[0].returnTo.href, "/world#world-plane-story");

    const loadedCalls = await now.page.evaluate(() => window.__calls.slice());
    await now.page.locator(".sod29-flight-time summary").click();
    await now.page.locator(".sod29-flight-time summary").click();
    await sleep(80);
    assert.deepEqual(await now.page.evaluate(() => window.__calls.slice()), loadedCalls, "close/reopen reuses the completed projection");
  } finally { await now.page.close(); }
});

test("World details: module failure retains the opening and only an explicit retry requests the module again", { skip }, async () => {
  const now = await run(current, "world", { moduleFailures: 1, trackModuleRequests: true });
  try {
    const opening = await now.page.locator(".sod29-flight-feature").evaluate((node) => node.outerHTML);
    await now.page.locator(".sod29-flight-time summary").click();
    await now.page.getByText("החיבורים אינם זמינים כרגע").waitFor();
    assert.equal(await now.page.locator(".sod29-flight-feature").evaluate((node) => node.outerHTML), opening);
    assert.deepEqual(await now.page.evaluate(() => window.__calls.slice()), ["getPostCardBySlug", "projection module request"]);

    await now.page.locator(".sod29-flight-time summary").click();
    await now.page.locator(".sod29-flight-time summary").click();
    await sleep(80);
    assert.deepEqual(await now.page.evaluate(() => window.__calls.slice()), ["getPostCardBySlug", "projection module request"], "reopen is not an implicit retry");

    await now.page.locator(".sod29-flight-time").getByText("נסה שוב", { exact: true }).click();
    await now.page.locator("[data-timeline-current]").waitFor();
    assert.deepEqual(await now.page.evaluate(() => window.__calls.slice()), [
      "getPostCardBySlug", "projection module request", "projection module request",
      "fetchPost2029ReadingProjection", "getPostBySlug", "extension reads",
    ]);
  } finally { await now.page.close(); }
});

test("World details: an extension failure keeps the opening and retries data without duplicating the loaded module", { skip }, async () => {
  const now = await run(current, "world", { extensionFailures: 1, trackModuleRequests: true });
  try {
    await now.page.locator(".sod29-flight-time summary").click();
    await now.page.getByText("החיבורים אינם זמינים כרגע").waitFor();
    assert.equal(await now.page.locator(".sod29-flight-feature").count(), 1);
    await now.page.locator(".sod29-flight-time").getByText("נסה שוב", { exact: true }).click();
    await now.page.locator("[data-timeline-current]").waitFor();
    const calls = await now.page.evaluate(() => window.__calls.slice());
    assert.equal(calls.filter((call) => call === "projection module request").length, 1);
    assert.equal(calls.filter((call) => call === "fetchPost2029ReadingProjection").length, 2);
    assert.equal(calls.filter((call) => call === "extension reads").length, 2);
  } finally { await now.page.close(); }
});

test("World details: closing during the load stays closed after completion and reopening does not duplicate work", { skip }, async () => {
  const now = await run(current, "world", { extensionDelay: 300, trackModuleRequests: true });
  try {
    const summary = now.page.locator(".sod29-flight-time summary");
    await summary.click();
    await now.page.waitForFunction(() => window.__calls.includes("extension reads"));
    await summary.click();
    assert.equal(await now.page.locator(".sod29-flight-time").getAttribute("open"), null);
    await sleep(380);
    assert.equal(await now.page.locator(".sod29-flight-time").getAttribute("open"), null, "late success does not reopen details");
    const calls = await now.page.evaluate(() => window.__calls.slice());
    await summary.click();
    await now.page.locator("[data-timeline-current]").waitFor();
    assert.deepEqual(await now.page.evaluate(() => window.__calls.slice()), calls);
  } finally { await now.page.close(); }
});

test("World opening admission matches the public post contract; missing image retains the established full-reader fallback", { skip }, async () => {
  const rejected = [
    ["missing", null],
    ["draft", { ...ROW, tags: ["טיוטה"] }],
    ["forum", { ...ROW, tags: ["פורום"] }],
    ["hidden", { ...ROW, home_hidden: true }],
    ["gpt draft source", { ...ROW, source: "gpt-draft" }],
    ["web import source", { ...ROW, source: "web" }],
    ["empty title", { ...ROW, title: "<br>" }],
  ];
  for (const [label, post] of rejected) {
    const now = await run(current, "world", { post, trackModuleRequests: true });
    try {
      assert.match(now.html, /state-unavailable/, label);
      assert.deepEqual(now.calls, ["getPostCardBySlug"], label);
    } finally { await now.page.close(); }
  }

  const noImage = { ...ROW, thumb_url: null, image_url: null };
  const fallback = await run(current, "world", { post: noImage, media: { highlight: { poster: "https://img.test/poster.webp" } }, trackModuleRequests: true });
  try {
    assert.deepEqual(fallback.calls, [
      "getPostCardBySlug", "projection module request", "fetchPost2029ReadingProjection", "getPostBySlug", "extension reads",
    ]);
    assert.equal(await fallback.page.locator(".sod29-flight-media img").getAttribute("src"), "https://img.test/poster.webp");
  } finally { await fallback.page.close(); }
});

test("World full projection cannot promote draft, private-stage or preview material after a public compact opening", { skip }, async () => {
  for (const flag of ["draft", "privateStage", "previewSnapshot"]) {
    const now = await run(current, "world", { projectionFlags: { [flag]: true }, trackModuleRequests: true });
    try {
      await now.page.locator(".sod29-flight-time summary").click();
      await now.page.getByText("סיפור המטוס אינו זמין כרגע").waitFor();
      assert.equal(await now.page.locator("[data-flight-story]").count(), 0, flag);
    } finally { await now.page.close(); }
  }
});

test("World timeline load survives hash back/forward without a second load", { skip }, async () => {
  const now = await run(current, "world", { hash: "#world-plane-story", trackModuleRequests: true });
  try {
    assert.deepEqual(now.calls, ["getPostCardBySlug"], "the supported story anchor does not imply timeline intent");
    await now.page.locator(".sod29-flight-time summary").click();
    await now.page.locator("[data-timeline-current]").waitFor();
    const loadedCalls = await now.page.evaluate(() => window.__calls.slice());
    await now.page.evaluate(() => window.__api.navigate("/world#world-direction-october"));
    await now.page.waitForFunction(() => window.__location?.hash === "#world-direction-october");
    await now.page.evaluate(() => window.__api.back());
    await now.page.waitForFunction(() => window.__location?.hash === "#world-plane-story");
    assert.deepEqual(await now.page.evaluate(() => window.__calls.slice()), loadedCalls);
  } finally { await now.page.close(); }
});

test("World unmount ignores a late full-reader completion", { skip }, async () => {
  const now = await run(current, "world", { extensionDelay: 250, trackModuleRequests: true });
  const pageErrors = [];
  now.page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await now.page.locator(".sod29-flight-time summary").click();
    await now.page.waitForFunction(() => window.__calls.includes("extension reads"));
    await now.page.evaluate(() => window.__api.unmount());
    await sleep(330);
    assert.equal(await now.page.locator("#root").innerHTML(), "");
    assert.deepEqual(pageErrors, []);
    assert.equal((await now.page.evaluate(() => window.__calls.slice())).filter((call) => call === "fetchPost2029ReadingProjection").length, 1);
  } finally { await now.page.close(); }
});
