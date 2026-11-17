// Readable content first (ZURIEL 16.11.2026: "התוכן הקריא ... יהיו במקום ראשון לפני כל פעולות המחקר רזיאל או כל פעולה שיש פעולות מדידה גם
// לדחות את הכל"). afterReadableContent2029 is the one point where a public page's optional work starts (the first-party visit, Google
// Analytics, the Meta Pixel, the frame's background reads): after the load event, the page's primary content and its priority image, then at
// an idle moment; bounded by CONTENT_FIRST_CAP_MS; at once when the page is hidden first (if asked). Driven here with a hand-made window and
// document and mocked timers; the built-artifact proof is test/content-first-2029.browser.mjs.
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterReadableContent2029, primaryContentSelector2029, CONTENT_FIRST_CAP_MS } from "../src/lib/publicReadingRelease2029.js";

function page({ readyState = "loading", present = [], image = null } = {}) {
  const on = { window: new Map(), document: new Map() }, idles = [], observers = [];
  const add = (where) => (type, fn) => { const list = on[where].get(type) || new Set(); list.add(fn); on[where].set(type, list); };
  const remove = (where) => (type, fn) => on[where].get(type)?.delete(fn);
  const shown = new Set(present);
  const env = {
    window: { addEventListener: add("window"), removeEventListener: remove("window"),
      requestIdleCallback: (fn) => { idles.push(fn); return idles.length; }, cancelIdleCallback: (id) => { idles[id - 1] = null; } },
    document: { readyState, visibilityState: "visible", body: {}, getElementById: () => ({}), addEventListener: add("document"), removeEventListener: remove("document"),
      querySelector: (selector) => selector === 'img[fetchpriority="high"]' ? image : (selector.split(", ").some(part => shown.has(part)) ? {} : null) },
    MutationObserver: class { constructor(fn) { this.fn = fn; this.live = false; observers.push(this); } observe() { this.live = true; } disconnect() { this.live = false; } },
  };
  Object.assign(globalThis, env);
  const fire = (where, type) => { for (const fn of [...(on[where].get(type) || [])]) fn({ type }); };
  return {
    env, idles, observers, on,
    load() { env.document.readyState = "complete"; fire("window", "load"); },
    show(selector) { shown.add(selector); for (const o of observers) if (o.live) o.fn([]); },
    idle() { const pending = idles.splice(0); for (const fn of pending) fn?.(); },
    hide() { env.document.visibilityState = "hidden"; fire("document", "visibilitychange"); },
    pagehide() { fire("window", "pagehide"); },
    listeners() { return [...on.window.values(), ...on.document.values()].reduce((n, set) => n + set.size, 0); },
  };
}
function image({ complete = false } = {}) {
  const on = new Map();
  return { complete, on, addEventListener: (t, fn) => on.set(t, fn), removeEventListener: (t, fn) => { if (on.get(t) === fn) on.delete(t); },
    finish(type = "load") { this.complete = true; on.get(type)?.({ type }); } };
}
const cleanup = () => { for (const key of ["window", "document", "MutationObserver"]) delete globalThis[key]; };

// ZURIEL 17.11.2026: the Home's primary content is its pinned מפת המציאות lead, first on the page.
const HOME = '[data-home-pinned-lead]:not([data-home-pinned-lead="loading"])';
const POST = '[data-experience-surface="post-reading"], [data-experience-surface="not-found"], .sod29-frame-state';
test("which content each page waits for: the Home's settled pinned lead, a Post's article or the notice that replaces it; other pages only the load", () => {
  assert.equal(primaryContentSelector2029("/"), HOME);
  assert.equal(primaryContentSelector2029("/2029"), HOME, "the Home's 2029 alias");
  assert.equal(primaryContentSelector2029("/post/some-slug"), POST);
  assert.equal(primaryContentSelector2029("/%D7%A1%D7%93%D7%A8-%D7%AA%D7%A4%D7%99%D7%9C%D7%94"), POST, "an original single-segment Post address");
  assert.match(readFileSync(new URL("../src/pages/NotFound2029Page.jsx", import.meta.url), "utf8"), /<main data-experience-surface="not-found"/, "the not-found page is a settled state");
  assert.match(readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8"),
    /data-home-pinned-lead=\{lead \? "feed" : member \? "catalog" : "loading"\}/, "the Home's states the selector relies on (a Post, loading)");
  assert.match(readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8"), /data-home-pinned-lead="none"/, "and none to show: never left waiting");
  for (const path of ["/community", "/world", "/posts", "/gematria", "/number/26", "/privacy"]) assert.equal(primaryContentSelector2029(path), null, path);
});

test("the Home: nothing starts before the load, the primary column and the priority image; then at an idle moment, once", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); t.after(cleanup);
  const cover = image();
  const p = page({ image: cover });
  const started = [];
  afterReadableContent2029("/", () => started.push("work"));
  p.load(); assert.deepEqual(started, []); assert.equal(p.idles.length, 0, "loaded, the primary column is not there yet");
  assert.ok(p.observers.some(o => o.live), "it watches for the primary column");
  p.show(HOME); assert.equal(p.idles.length, 0, "the priority image is still downloading");
  cover.finish("load"); assert.equal(p.idles.length, 1); assert.deepEqual(started, []);
  p.idle(); assert.deepEqual(started, ["work"]);
  p.hide(); p.load(); t.mock.timers.tick(CONTENT_FIRST_CAP_MS * 2); assert.deepEqual(started, ["work"], "once");
  assert.equal(p.listeners(), 0, "every listener is removed");
});

test("a Post: its article in the first document counts as shown; a priority image that fails does not hold the work", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); t.after(cleanup);
  const cover = image();
  const p = page({ present: ['[data-experience-surface="post-reading"]'], image: cover });
  const started = [];
  afterReadableContent2029("/post/a", () => started.push("work"), { idle: false });
  assert.deepEqual(started, [], "the document has not loaded");
  p.load(); assert.deepEqual(started, []);
  cover.finish("error"); assert.deepEqual(started, ["work"], "idle: false starts at once");
});

test("a Post that settles on a notice (not found, error) measures at once, without the cap", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); t.after(cleanup);
  for (const notice of ['[data-experience-surface="not-found"]', '.sod29-frame-state']) {
    const p = page({ readyState: "complete" });
    const started = [];
    afterReadableContent2029("/post/missing", () => started.push(notice), { idle: false });
    assert.deepEqual(started, [], "still loading");
    p.show(notice); assert.deepEqual(started, [notice]);
  }
});

test("another page waits for the load only; a page with no content marker never waits for one", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); t.after(cleanup);
  const p = page();
  const started = [];
  afterReadableContent2029("/community", () => started.push("work"));
  assert.equal(p.observers.length, 0);
  p.load(); assert.equal(p.idles.length, 1); p.idle(); assert.deepEqual(started, ["work"]);
});

test("bounded: content that never arrives delays the work by the cap, never drops it", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); t.after(cleanup);
  const p = page({ readyState: "complete" });
  const started = [];
  afterReadableContent2029("/post/never", () => started.push("work"), { idle: false });
  t.mock.timers.tick(CONTENT_FIRST_CAP_MS - 1); assert.deepEqual(started, []);
  t.mock.timers.tick(1); assert.deepEqual(started, ["work"]);
  assert.equal(p.observers.some(o => o.live), false);
});

test("a stalled priority image is bounded by the same cap", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); t.after(cleanup);
  const p = page({ readyState: "complete", present: ['[data-experience-surface="post-reading"]'], image: image() });
  const started = [];
  afterReadableContent2029("/post/a", () => started.push("work"));
  t.mock.timers.tick(CONTENT_FIRST_CAP_MS); assert.equal(p.idles.length, 1); p.idle(); assert.deepEqual(started, ["work"]);
});

test("onHidden: a reader who leaves or switches away before the content is counted at once; without it, hiding changes nothing", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); t.after(cleanup);
  let p = page();
  const visits = [];
  afterReadableContent2029("/post/a", () => visits.push("visit"), { idle: false, onHidden: true });
  p.hide(); assert.deepEqual(visits, ["visit"]);
  p.load(); assert.deepEqual(visits, ["visit"], "once");
  p = page();
  afterReadableContent2029("/post/b", () => visits.push("pagehide"), { idle: false, onHidden: true });
  p.pagehide(); assert.deepEqual(visits, ["visit", "pagehide"]);
  p = page();
  const ga = [];
  afterReadableContent2029("/post/c", () => ga.push("ga"));
  p.hide(); assert.deepEqual(ga, [], "Google and Meta do not start on hiding");
});

test("cancel: a page left before its content starts nothing and leaves no listener, observer or timer", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); t.after(cleanup);
  const p = page();
  const started = [];
  const cancel = afterReadableContent2029("/", () => started.push("work"), { onHidden: true });
  p.load(); assert.ok(p.observers.some(o => o.live));
  cancel();
  p.show(HOME); p.hide(); t.mock.timers.tick(CONTENT_FIRST_CAP_MS * 2); p.idle();
  assert.deepEqual(started, []);
  assert.equal(p.listeners(), 0); assert.equal(p.observers.some(o => o.live), false);
  // cancelling during the idle wait cancels the idle callback too
  const q = page({ readyState: "complete" });
  const stop = afterReadableContent2029("/community", () => started.push("late"));
  assert.equal(q.idles.length, 1); stop(); q.idle(); assert.deepEqual(started, []);
});

test("no window (server render, node): a no-op", () => {
  cleanup();
  assert.equal(typeof afterReadableContent2029("/", () => assert.fail("must not run")), "function");
});

test("source pins: measurement, ads and the frame's background reads follow the content", () => {
  const app = readFileSync(new URL("../src/App2029.jsx", import.meta.url), "utf8");
  assert.match(app, /afterReadableContent2029\(pathname, \(\) => \{\s+initGA\(\{ publicReading: true/, "Google's tag (and the Pixel after it) start inside the content gate");
  assert.equal((app.match(/afterReadableContent2029\(pathname,/g) || []).length, 2, "the visit and Google/Meta both wait for the content");
  const feed = readFileSync(new URL("../src/components/experience2029/useSystemFeed2029.js", import.meta.url), "utf8");
  assert.match(feed, /afterReadableContent2029\(window\.location\.pathname/);
  const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");
  assert.match(frame, /useSystemFeed2029\(\{.*afterContent: surface !== "home" \}\)/, "away from the Home the feed waits; on the Home it is the content");
  assert.match(readFileSync(new URL("../src/lib/adsense.js", import.meta.url), "utf8"), /const ADSENSE_PAUSED = true;/, "ads paused (ZURIEL 16.11.2026)");
  assert.doesNotMatch(readFileSync(new URL("../src/lib/visits.js", import.meta.url), "utf8"), /^\s*import\b[^;]*["']\.\/dayContext\.js["']/m, "no Hebrew calendar with the visit");
});
