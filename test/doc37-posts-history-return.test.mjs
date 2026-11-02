import test from "node:test";
import assert from "node:assert/strict";
import { capturePostsCatalogDeparture2029, rememberPostsCatalogViewport2029,
  startPostsCatalogViewportRestore2029, trackPostsCatalogViewport2029 } from "../src/lib/research/postsCatalogViewport2029.js";

const HREF = "/2029/posts?series=messages-from-righteous&page=2&q=%D7%9E%D7%A1%D7%A8#posts-catalog";
function eventTarget() {
  const listeners = new Map();
  return { listeners,
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    fire(type, event = {}) { for (const fn of [...(listeners.get(type) || [])]) fn({ type, ...event }); },
    count() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
  };
}
function fixture({ key = "catalog-key", href = HREF, y = 2500 } = {}) {
  const timers = new Map(), frames = new Map(), scrolls = [], replacements = [], observers = [];
  let sequence = 0, nativeChanges = 0;
  const win = { ...eventTarget(), location: new URL(href, "https://preview.example"), scrollX: 0, scrollY: y, maxY: 30_000,
    requestAnimationFrame(fn) { const id = ++sequence; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    scrollTo(options) { scrolls.push(options); win.scrollX = options.left; win.scrollY = Math.min(options.top, win.maxY); },
    ResizeObserver: class { constructor(fn) { this.fn = fn; this.connected = false; observers.push(this); } observe(root) { this.root = root; this.connected = true; } disconnect() { this.connected = false; } },
  };
  const history = { state: { idx: 7, key, usr: { existingReturn: "kept" }, retained: "value" },
    replaceState(state, title, url) { replacements.push({ state, title, url }); history.state = state; },
  };
  Object.defineProperty(history, "scrollRestoration", { get: () => "auto", set: () => { nativeChanges++; } });
  win.history = history;
  const doc = eventTarget(), options = { win, doc, entryKey: key || "default", href, navigationType: "POP" };
  return { win, doc, options, scrolls, replacements, observers, timers, frames,
    nativeChanges: () => nativeChanges,
    flushFrames() { const tasks = [...frames.values()]; frames.clear(); tasks.forEach(fn => fn()); },
    timeout(delay) { for (const [id, value] of [...timers]) if (value.delay === delay) { timers.delete(id); value.fn(); } },
    resize() { for (const observer of observers) if (observer.connected) observer.fn(); },
    snapshot() { assert.equal(rememberPostsCatalogViewport2029(options), true); return history.state.sodPostsViewport2029; },
  };
}
function click(href = "/video/public-asset", patch = {}, linkPatch = {}) {
  const link = { target: "", getAttribute: key => key === "href" ? href : null, hasAttribute: () => false, ...linkPatch };
  return { button: 0, defaultPrevented: false, target: { closest: () => link }, currentTarget: { contains: value => value === link }, ...patch };
}

test("capture keeps router/history fields and exact encoded query/hash, storing layout metadata only", () => {
  const f = fixture();
  assert.equal(capturePostsCatalogDeparture2029(click(), f.options), true);
  assert.equal(f.replacements.length, 1);
  assert.equal(f.win.history.state.idx, 7);
  assert.equal(f.win.history.state.key, "catalog-key");
  assert.deepEqual(f.win.history.state.usr, { existingReturn: "kept" });
  assert.equal(f.win.history.state.retained, "value");
  assert.deepEqual(f.win.history.state.sodPostsViewport2029, { entryKey: "catalog-key", href: HREF, x: 0, y: 2500 });
  assert.equal(f.replacements[0].url, HREF);
  assert.equal(f.nativeChanges(), 0);
});

test("modifier/new-tab/download/external/local-anchor/canceled actions never capture departure", () => {
  for (const event of [click(undefined, { ctrlKey: true }), click(undefined, { metaKey: true }),
    click(undefined, { altKey: true }), click(undefined, { shiftKey: true }), click(undefined, { button: 1 }),
    click(undefined, { defaultPrevented: true }), click(undefined, {}, { target: "_blank" }),
    click(undefined, {}, { hasAttribute: key => key === "download" }), click("https://other.example/video/x"),
    click("javascript:alert(1)"), click(HREF), click(HREF.replace("#posts-catalog", "#another")),
    click(undefined, { currentTarget: { contains: () => false } }), click(undefined, { target: {} })]) {
    const f = fixture();
    assert.equal(capturePostsCatalogDeparture2029(event, f.options), false);
    assert.equal(f.replacements.length, 0);
  }
});

test("wrong current key/path or malformed coordinates cannot create or replay a viewport", () => {
  for (const patch of [{ entryKey: "wrong" }, { href: HREF + "-changed" }]) {
    const f = fixture();
    assert.equal(rememberPostsCatalogViewport2029({ ...f.options, ...patch }), false);
    assert.equal(f.replacements.length, 0);
  }
  assert.equal(rememberPostsCatalogViewport2029(fixture({ href: "/world" }).options), false);
  for (const y of [NaN, Infinity, -1, "2500", 20_000_000]) {
    const f = fixture({ y });
    assert.equal(rememberPostsCatalogViewport2029(f.options), false);
  }
  for (const patch of [{ entryKey: "wrong" }, { href: HREF + "-changed" }, { y: NaN }, { y: -1 }]) {
    const f = fixture(); f.snapshot(); Object.assign(f.win.history.state.sodPostsViewport2029, patch);
    const restore = startPostsCatalogViewportRestore2029(f.options); restore.setReady(true, {}); f.flushFrames();
    assert.equal(f.scrolls.length, 0); assert.equal(f.win.count(), 0); assert.equal(f.timers.size, 0);
  }
});

test("native initial entry without a key uses Router default, while PUSH/REPLACE never replay", () => {
  const initial = fixture({ key: undefined });
  delete initial.win.history.state.key; initial.options.entryKey = "default";
  assert.equal(initial.snapshot().entryKey, "default");
  for (const navigationType of ["PUSH", "REPLACE"]) {
    const f = fixture(); f.snapshot();
    startPostsCatalogViewportRestore2029({ ...f.options, navigationType }).setReady(true, {}); f.flushFrames();
    assert.equal(f.scrolls.length, 0); assert.equal(f.win.count(), 0); assert.equal(f.timers.size, 0);
  }
});

test("POP waits for admitted mixed-page completion and repairs native short-document clamping exactly", () => {
  const f = fixture(); f.snapshot();
  f.win.maxY = 925; f.win.scrollY = 925;
  const restore = startPostsCatalogViewportRestore2029(f.options);
  restore.setReady(false, {}); f.doc.fire("load"); f.flushFrames();
  assert.equal(f.scrolls.length, 0, "pending Posts/source do not start restoration");
  f.win.maxY = 17_248;
  restore.setReady(true, {}); f.flushFrames();
  assert.deepEqual(f.scrolls, [{ left: 0, top: 2500, behavior: "instant" }]);
  assert.equal(f.win.scrollY, 2500);
  f.win.scrollY = 2581; f.resize(); f.flushFrames();
  assert.equal(f.win.scrollY, 2500, "late layout/source geometry still returns to the original pixel");
  assert.equal(f.nativeChanges(), 0);
  restore.stop();
  assert.equal(f.win.count(), 0); assert.equal(f.doc.count(), 0); assert.equal(f.timers.size, 0);
  assert.ok(f.observers.every(observer => !observer.connected));
});

test("wheel/touch/pointer/key intent cancels even while source data is pending", () => {
  for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) for (const pending of [true, false]) {
    const f = fixture(); f.snapshot(); f.win.scrollY = 925;
    const restore = startPostsCatalogViewportRestore2029(f.options);
    if (!pending) restore.setReady(true, {});
    f.win.fire(event); restore.setReady(true, {}); f.flushFrames(); f.resize(); f.doc.fire("load"); f.flushFrames();
    assert.equal(f.scrolls.length, 0, `${event}/${pending}: reader intent wins over late readiness`);
    assert.equal(f.win.count(), 0); assert.equal(f.doc.count(), 0); assert.equal(f.frames.size, 0);
  }
});

test("route changes and time limits disconnect correction and cannot steal a later viewport", () => {
  for (const stopBy of ["popstate", "key", "href", "wait-timeout", "settled-timeout", "cleanup"]) {
    const f = fixture(); f.snapshot(); f.win.scrollY = 925;
    const restore = startPostsCatalogViewportRestore2029(f.options);
    if (stopBy === "popstate") f.win.fire("popstate");
    if (stopBy === "key") f.win.history.state.key = "new-route";
    if (stopBy === "href") f.win.location = new URL("https://preview.example/world");
    if (stopBy === "wait-timeout") f.timeout(30_000);
    if (stopBy === "cleanup") restore.stop();
    restore.setReady(true, {});
    if (stopBy === "settled-timeout") f.timeout(5_000);
    f.flushFrames();
    assert.equal(f.scrolls.length, 0, stopBy);
    assert.equal(f.win.count(), 0); assert.equal(f.doc.count(), 0); assert.equal(f.frames.size, 0); assert.equal(f.timers.size, 0);
  }
});

test("failed/short results settle with real height and stop without invented content or infinite retries", () => {
  const f = fixture(); f.snapshot(); f.win.scrollY = 925; f.win.maxY = 925;
  const restore = startPostsCatalogViewportRestore2029(f.options);
  restore.setReady(true, {}); f.flushFrames();
  assert.equal(f.win.scrollY, 925, "browser's real height remains authoritative when content is unavailable");
  assert.equal(f.scrolls.length, 1);
  f.timeout(5_000); f.resize(); f.doc.fire("load"); f.flushFrames();
  assert.equal(f.scrolls.length, 1); assert.equal(f.win.count(), 0); assert.equal(f.doc.count(), 0);
});

test("settled scrolling keeps repeat returns fresh without recording initial clamp or per-scroll updates", () => {
  const f = fixture(); f.snapshot(); f.win.scrollY = 925;
  const restore = startPostsCatalogViewportRestore2029(f.options);
  const stopTracking = trackPostsCatalogViewport2029({ ...f.options, isRestoring: () => restore.isRestoring });
  f.doc.fire("scrollend");
  assert.equal(f.win.history.state.sodPostsViewport2029.y, 2500, "clamped loading viewport cannot overwrite the departure");
  restore.setReady(true, {}); f.flushFrames();
  f.win.fire("wheel"); f.win.scrollY = 3100;
  for (let i = 0; i < 100; i++) f.doc.fire("scroll");
  assert.equal(f.replacements.length, 1, "no per-scroll listener/writes");
  f.doc.fire("scrollend");
  assert.equal(f.win.history.state.sodPostsViewport2029.y, 3100);
  f.doc.fire("scrollend");
  assert.equal(f.replacements.length, 2, "unchanged coordinates do not write history again");
  stopTracking(); restore.stop();
  f.win.scrollY = 925;
  const returned = startPostsCatalogViewportRestore2029(f.options); returned.setReady(true, {}); f.flushFrames();
  assert.equal(f.win.scrollY, 3100, "next POP restores the later position, not the first card's stale position");
  returned.stop(); assert.equal(f.doc.count(), 0);
});

test("ordinary shared-menu links/buttons capture the departing Posts entry, and tracking is route-scoped", () => {
  const f = fixture();
  const stopTracking = trackPostsCatalogViewport2029(f.options);
  const button = { formTarget: "" };
  f.doc.fire("click", { button: 0, target: { closest: selector => selector === "button" ? button : null } });
  assert.equal(f.win.history.state.sodPostsViewport2029.y, 2500);
  f.win.scrollY = 3456;
  f.doc.fire("click", click("/world"));
  assert.equal(f.win.history.state.sodPostsViewport2029.y, 3456);
  f.win.scrollY = 4000; f.doc.fire("click", click("/world", { ctrlKey: true }));
  assert.equal(f.win.history.state.sodPostsViewport2029.y, 3456);
  f.win.history.state.key = "another-entry"; f.doc.fire("scrollend");
  assert.equal(f.replacements.length, 2);
  stopTracking(); assert.equal(f.doc.count(), 0);
});
