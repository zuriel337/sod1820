// One first-party page view per real page view (ZURIEL 13.11.2026). The route effect of the public build (RouteEffects2029 in
// src/App2029.jsx, the real source, sliced and evaluated in a VM like public-reading-observability.test.mjs) is driven through the
// cases that used to count twice or not at all: StrictMode double effects, a keyed subtree replaced when the account state resolves,
// a redirect hop, in-app navigation, back/forward, query-only changes, unmeasured routes. The real browser proof of the same cases
// (direct entry, refresh, phone, signed-in member) is test/measurement-visit-once-2029.browser.mjs.
// No network, no browser, no React: a minimal hook runtime stands in for the parts of React the effect uses.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { transform } from "esbuild";
import { readingTelemetryPath } from "../src/lib/publicReadingTelemetry2029.js";

const app = readFileSync(new URL("../src/App2029.jsx", import.meta.url), "utf8");
const start = app.indexOf("function RouteEffects2029()"), end = app.indexOf("\n}\n", start);
assert.ok(start >= 0 && end > start, "RouteEffects2029 must be found");
const source = app.slice(start, end + 3);
const compiled = (await transform(source, { loader: "jsx", format: "cjs" })).code.replaceAll('import("./lib/visits.js")', "visitsModule()");

// One browser document: the module-level state of App2029.jsx (measuredEntry2029) lives as long as the document.
function document_({ hostname = "sod1820.co.il" } = {}) {
  const log = { visits: [], engagement: [] }, timers = [];
  let location = { pathname: "/world", key: "default" }, keyCounter = 0;
  const context = { PUBLIC_READING_RELEASE: true, integratedPreviewEnabled: false, kingdomPreviewEnabled: false,
    useLocation: () => location, useAuth: () => ({ loading: false, isAdmin: false }), React: { useRef: value => ({ current: value }) },
    window: { location: { hostname }, requestIdleCallback: () => 1, cancelIdleCallback() {} },
    document: { querySelector: () => ({}), getElementById: () => ({}), body: {} }, MutationObserver: class { observe() {} disconnect() {} },
    readingTelemetryPath, startWebVitals2029: () => () => {}, initGA() {}, trackPageview() {}, initMarketing() {}, trackMarketingPageview() {},
    ensureIdentity: () => assert.fail("identity bridge"),
    startPageEngagement: (path, deps) => { assert.equal(deps.getSodIdFn(), null); assert.equal(deps.sessionIdFn(), null); log.engagement.push(path); return {}; },
    visitsModule: () => Promise.resolve({ trackVisit: path => { log.visits.push(path); } }),
    setTimeout: (fn, ms) => { timers.push({ fn, ms, live: true }); return timers.length; }, clearTimeout: id => { if (timers[id - 1]) timers[id - 1].live = false; } };
  vm.createContext(context);
  vm.runInContext("let measuredEntry2029 = null; const PAGE_VIEW_SETTLE_MS = 150;" + compiled + ";globalThis.RouteEffects2029 = RouteEffects2029;", context);

  // A mounted instance of the component: a hook list with the dependency comparison React performs.
  function mount() {
    const hooks = []; let cursor = 0, mounted = true;
    const useEffect = (fn, deps) => {
      const i = cursor++, previous = hooks[i];
      if (previous && deps && previous.deps.length === deps.length && deps.every((d, k) => Object.is(d, previous.deps[k]))) return;
      hooks[i] = { deps, fn, cleanup: previous?.cleanup, pending: true };
    };
    const component = () => { cursor = 0; context.useEffect = useEffect; return vm.runInContext("RouteEffects2029()", context); };
    const commit = () => { for (const hook of hooks) if (hook.pending) { hook.pending = false; try { hook.cleanup?.(); } catch { /* none */ } hook.cleanup = hook.fn(); } };
    const instance = {
      render() { assert.ok(mounted); component(); commit(); },
      unmount() { mounted = false; for (const hook of hooks) { try { hook.cleanup?.(); } catch { /* none */ } hook.cleanup = undefined; } },
      // React StrictMode (development): the effects run, are cleaned up and run again.
      strictRemount() { for (const hook of hooks) { hook.cleanup?.(); hook.cleanup = hook.fn(); } },
    };
    instance.render();
    return instance;
  }
  return { log, mount,
    go(pathname) { location = { pathname, key: "k" + ++keyCounter }; },                 // push or replace: a new history entry
    goBackTo(entry) { location = entry; },                                                // traverse to an entry that was visited before
    get location() { return location; },
    // time passes: every live timer that was scheduled with the settle delay fires (the visit is written only after the address settled)
    async settle() { for (const timer of timers) if (timer.live && timer.ms === 150) { timer.live = false; timer.fn(); } await Promise.resolve(); await Promise.resolve(); } };
}

test("direct entry: one visit and one engagement tracker, only after the address has settled", async () => {
  const d = document_(); const view = d.mount();
  for (let i = 0; i < 5; i++) await Promise.resolve();     // let any lazy import resolve: it must still have nothing to write
  assert.deepEqual(d.log.visits, [], "nothing first-party is written before the address settles");
  assert.deepEqual(d.log.engagement, []);
  await d.settle();
  assert.deepEqual(d.log.visits, ["/world"]); assert.deepEqual(d.log.engagement, ["/world"]);
  await d.settle(); assert.deepEqual(d.log.visits, ["/world"], "settling again writes nothing");
  view.unmount();
});

test("StrictMode double effect (development): the first effect is cleaned up before it settles, so the entry is counted once", async () => {
  const d = document_(); const view = d.mount();
  view.strictRemount();
  await d.settle();
  assert.deepEqual(d.log.visits, ["/world"]);
});

test("the account state resolving replaces the keyed subtree: a second mount of the component on the same entry does not count again", async () => {
  // Before the fix: RouteEffects2029 sat inside ResearchProvider, whose child is keyed by the principal ("auth:pending" -> guest/account).
  const early = document_(); const first = early.mount();
  first.unmount(); early.mount();                       // replaced before the delay: the first timer is cleared, the second counts
  await early.settle(); assert.deepEqual(early.log.visits, ["/world"]);
  const late = document_(); const a = late.mount();
  await late.settle(); a.unmount(); late.mount();       // replaced after the visit was written: the record of the measured entry holds
  await late.settle(); assert.deepEqual(late.log.visits, ["/world"]); assert.deepEqual(late.log.engagement, ["/world"]);
});

test("in-app navigation counts every real page change: another page family, another post, and back/forward; query and hash changes do not", async () => {
  const d = document_(); const view = d.mount(); await d.settle();
  const world = d.location;
  d.go("/post"); view.render(); await d.settle();
  d.go("/post/a"); view.render(); await d.settle();
  const postA = d.location;
  d.go("/post/b"); view.render(); await d.settle();                                    // another post: same label, a real page view
  d.goBackTo(postA); view.render(); await d.settle();                                  // back
  d.goBackTo(world); view.render(); await d.settle();                                  // back to the entered page
  assert.deepEqual(d.log.visits, ["/world", "/post", "/post/:item", "/post/:item", "/post/:item", "/world"]);
  // same pathname, new history entry (a query or hash change, a link to the page one is on): not a page view
  d.go("/world"); view.render(); await d.settle();
  assert.equal(d.log.visits.length, 6);
  assert.deepEqual(d.log.engagement, d.log.visits, "one engagement tracker per counted visit");
});

test("a redirect hop is not a page view: only the address that settles is counted", async () => {
  const d = document_(); const view = d.mount(); await d.settle();
  d.go("/els"); view.render();                              // an alias route is entered ...
  d.go("/code"); view.render();                             // ... and replaced at once (Navigate replace)
  await d.settle();
  assert.deepEqual(d.log.visits, ["/world", "/code"]);
  d.go("/a"); view.render(); d.go("/b"); view.render(); d.go("/c"); view.render(); await d.settle();
  assert.deepEqual(d.log.visits.slice(2), ["/c"], "a quick chain of hops counts only its last address");
});

test("routes that are not measured (account, admin, login) write nothing, and the next measured route counts once", async () => {
  const d = document_(); const view = d.mount(); await d.settle();
  for (const path of ["/login", "/me", "/me/profile", "/admin", "/2029/control", "/community/whatsapp"]) {
    d.go(path); view.render(); await d.settle();
  }
  assert.deepEqual(d.log.visits, ["/world"]);
  d.go("/gallery"); view.render(); await d.settle();
  assert.deepEqual(d.log.visits, ["/world", "/gallery"]);
});

test("a host that is not the public site never measures (Preview and protected deployments)", async () => {
  const d = document_({ hostname: "sod1820-abc-sod1820-s-projects.vercel.app" }); d.mount(); await d.settle();
  assert.deepEqual(d.log.visits, []); assert.deepEqual(d.log.engagement, []);
});

test("source pins: the measurement component is mounted outside the keyed subtree and re-runs on the pathname only", () => {
  const body = app.slice(app.indexOf("export default function App2029()"));
  const router = body.indexOf("<BrowserRouter>"), effects = body.indexOf("<RouteEffects2029 />"), provider = body.indexOf("<ResearchProvider>");
  assert.ok(router >= 0 && effects > router && provider > effects, "<RouteEffects2029 /> sits inside the router and before (beside) <ResearchProvider>");
  assert.equal(body.slice(provider).includes("<RouteEffects2029"), false, "it is not rendered inside ResearchProvider again");
  assert.match(source, /\}, \[pathname\]\);\n\n  return null;/, "the visit effect depends on the pathname only: query, hash and account-state changes do not re-run it");
  // Browser lifecycle events are not page views: the effect has no listener for them (the back/forward cache restores the page
  // without running it again, and a tab that is hidden and shown again is the same page view).
  for (const event of ["pageshow", "visibilitychange", "popstate", "focus", "online"]) assert.equal(source.includes(event), false, event);
  assert.match(source, /clearTimeout\(settle\)/, "the cleanup cancels a visit that has not settled");
});
