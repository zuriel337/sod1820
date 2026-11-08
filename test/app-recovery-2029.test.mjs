// 2029 stale-deployment recovery: pure behaviour of src/lib/appRecovery2029.js + the static wiring contract
// (entry installs it before render, the Routes sit inside ErrorBoundary2029, the transport is untouched).
// The real-browser reproduction is test/stale-chunk-recovery-2029.browser.mjs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  CHUNK_LOAD_SIGNATURES, RECOVERY_GUARD_KEY, isChunkLoadError, createAppRecovery2029,
  installAppRecovery2029, recoverFromChunkLoadError2029, _resetAppRecovery2029ForTests,
} from "../src/lib/appRecovery2029.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const ENTRY = "https://sod1820.co.il/assets/2029-AAAA1111.js";
const NEXT_ENTRY = "https://sod1820.co.il/assets/2029-BBBB2222.js";
const CHUNK = new TypeError("Failed to fetch dynamically imported module: https://sod1820.co.il/assets/World2029Page-xyz.js");

const memoryStorage = (seed = {}) => {
  const data = new Map(Object.entries(seed));
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => { data.set(k, String(v)); }, data };
};
function harness({ entry = ENTRY, storage = memoryStorage(), getStorage } = {}) {
  const win = new EventTarget();
  const reloads = [];
  const recovery = createAppRecovery2029({ win, entryKey: entry, getStorage: getStorage ?? (() => storage), reload: () => reloads.push(1) });
  return { win, reloads, recovery, storage };
}
const fire = (win, type, props) => { const event = Object.assign(new Event(type, { cancelable: true }), props); win.dispatchEvent(event); return event; };
const preloadError = (win, payload) => fire(win, "vite:preloadError", payload === undefined ? {} : { payload });
const rejection = (win, reason) => fire(win, "unhandledrejection", { reason });

test("signatures: Chrome, Firefox, Safari and Vite CSS preload failures match; unrelated errors do not", () => {
  assert.equal(CHUNK_LOAD_SIGNATURES.length, 4);
  for (const message of [
    "Failed to fetch dynamically imported module: https://x/assets/a.js",
    "error loading dynamically imported module: https://x/assets/a.js",
    "Importing a module script failed.",
    "Unable to preload CSS for /assets/Timeline2029-a6_QYh8e.css",
  ]) {
    assert.equal(isChunkLoadError(new Error(message)), true, message);
    assert.equal(isChunkLoadError(message), true, "plain string");
    assert.equal(isChunkLoadError({ message }), true, "error-like object");
  }
  for (const value of [
    new TypeError("Failed to fetch"), new Error("boom"), new Error("Cannot read properties of undefined (reading 'default')"),
    new SyntaxError("Unexpected token '<'"), "", null, undefined, 0, {}, { message: 42 }, Symbol("x"),
    { get message() { throw new Error("hostile getter"); } },
  ].entries()) assert.equal(isChunkLoadError(value[1]), false, `unrelated value #${value[0]}`);
});

test("single reload: the first chunk failure reloads once, repeats in the same page do not reload again", () => {
  const { recovery, reloads, storage } = harness();
  assert.equal(recovery.recover(CHUNK), "reloading");
  assert.equal(reloads.length, 1);
  assert.equal(storage.data.get(RECOVERY_GUARD_KEY), ENTRY, "guard keyed by the entry script URL");
  assert.equal(recovery.recover(CHUNK), "reloading", "a reload is already in flight");
  assert.equal(recovery.recover(new Error("Unable to preload CSS for /assets/x.css")), "reloading");
  assert.equal(reloads.length, 1, "never a second reload from the same page");
});

test("guard: the same entry build never reloads twice (after the reload the fallback is surfaced)", () => {
  const storage = memoryStorage();
  const first = harness({ storage });
  assert.equal(first.recovery.recover(CHUNK), "reloading");
  // The page after the reload is a fresh controller on the SAME build and the SAME sessionStorage.
  const second = harness({ storage });
  assert.equal(second.recovery.recover(CHUNK), "exhausted");
  assert.equal(second.reloads.length, 0, "no reload when the guard is already set");
  assert.equal(second.recovery.recover(CHUNK), "exhausted");
  assert.equal(second.reloads.length, 0);
});

test("guard is per entry build: a newer build gets its own single attempt", () => {
  const storage = memoryStorage({ [RECOVERY_GUARD_KEY]: ENTRY });
  const next = harness({ storage, entry: NEXT_ENTRY });
  assert.equal(next.recovery.recover(CHUNK), "reloading");
  assert.equal(next.reloads.length, 1);
  assert.equal(storage.data.get(RECOVERY_GUARD_KEY), NEXT_ENTRY);
  const again = harness({ storage, entry: NEXT_ENTRY });
  assert.equal(again.recovery.recover(CHUNK), "exhausted");
  assert.equal(again.reloads.length, 0);
});

test("entry key ignores query and hash so one build is one key", () => {
  const storage = memoryStorage();
  harness({ storage, entry: ENTRY + "?v=1#a" }).recovery.recover(CHUNK);
  assert.equal(storage.data.get(RECOVERY_GUARD_KEY), ENTRY);
});

test("storage unavailable: no reload and no loop (blocked, throwing, silent no-op)", () => {
  const blocked = harness({ getStorage: () => { throw new DOMException("denied", "SecurityError"); } });
  assert.equal(blocked.recovery.recover(CHUNK), "exhausted");
  assert.equal(blocked.reloads.length, 0, "fail closed: a reload loop is the worse failure");

  const noStorage = harness({ getStorage: () => null });
  assert.equal(noStorage.recovery.recover(CHUNK), "exhausted");
  assert.equal(noStorage.reloads.length, 0);

  const full = harness({ getStorage: () => ({ getItem: () => null, setItem: () => { throw new DOMException("full", "QuotaExceededError"); } }) });
  assert.equal(full.recovery.recover(CHUNK), "exhausted");
  assert.equal(full.reloads.length, 0);

  // setItem "succeeds" but nothing persists (some private modes): the read-back catches it.
  const silent = harness({ getStorage: () => ({ getItem: () => null, setItem: () => {} }) });
  assert.equal(silent.recovery.recover(CHUNK), "exhausted");
  assert.equal(silent.reloads.length, 0);
});

test("a reload that throws is reported as exhausted, not as reloading", () => {
  const recovery = createAppRecovery2029({ win: new EventTarget(), entryKey: ENTRY, getStorage: () => memoryStorage(), reload: () => { throw new Error("blocked"); } });
  assert.equal(recovery.recover(CHUNK), "exhausted");
  assert.equal(recovery.reloading, false);
});

test("unrelated errors are ignored: no reload, no guard, storage untouched", () => {
  let touched = 0;
  const storage = { getItem: () => { touched++; return null; }, setItem: () => { touched++; } };
  const { recovery, reloads } = harness({ getStorage: () => storage });
  for (const error of [new Error("boom"), new TypeError("Failed to fetch"), "string", null, undefined, new RangeError("Maximum call stack size exceeded")])
    assert.equal(recovery.recover(error), "ignored");
  assert.equal(reloads.length, 0);
  assert.equal(touched, 0);
});

test("install: vite:preloadError (CSS signature) reloads once and does not swallow the error", () => {
  const { win, recovery, reloads, storage } = harness();
  assert.equal(recovery.install(), true);
  const event = preloadError(win, new Error("Unable to preload CSS for /assets/Timeline2029-a6_QYh8e.css"));
  assert.equal(event.defaultPrevented, false, "the original error keeps propagating so React.lazy rejects into the boundary");
  assert.equal(reloads.length, 1);
  assert.equal(storage.data.get(RECOVERY_GUARD_KEY), ENTRY);
  preloadError(win, CHUNK);
  assert.equal(reloads.length, 1, "second event: still one reload");
});

test("install: a preload error whose payload is some other error (module throws while evaluating) is ignored", () => {
  const { win, recovery, reloads, storage } = harness();
  recovery.install();
  preloadError(win, new ReferenceError("someGlobal is not defined"));
  assert.equal(reloads.length, 0);
  assert.equal(storage.data.size, 0);
  // The Vite event without any payload is itself the signal.
  preloadError(win);
  assert.equal(reloads.length, 1);
});

test("install: an unhandled chunk rejection reloads once; the next one on the same build surfaces the fallback", () => {
  const storage = memoryStorage();
  const first = harness({ storage }); first.recovery.install();
  const surfacedFirst = []; first.recovery.subscribe((e) => surfacedFirst.push(e));
  rejection(first.win, CHUNK);
  assert.equal(first.reloads.length, 1);
  assert.deepEqual(surfacedFirst, [], "a reload is the answer, nothing is surfaced");
  rejection(first.win, CHUNK);
  assert.equal(first.reloads.length, 1);
  assert.deepEqual(surfacedFirst, [], "reload still in flight in this page");

  const second = harness({ storage }); second.recovery.install(); // the reloaded page
  const surfaced = []; second.recovery.subscribe((e) => surfaced.push(e));
  rejection(second.win, CHUNK);
  assert.equal(second.reloads.length, 0, "guard already set: no reload");
  assert.deepEqual(surfaced, [CHUNK], "the failure is surfaced to the boundary instead");
});

test("install: unrelated rejections and errors do nothing; matching window errors are handled", () => {
  const { win, recovery, reloads } = harness();
  recovery.install();
  const surfaced = []; recovery.subscribe((e) => surfaced.push(e));
  rejection(win, new Error("boom")); rejection(win, "just a string"); rejection(win, undefined);
  fire(win, "error", { message: "ResizeObserver loop limit exceeded", error: undefined });
  fire(win, "error", { message: "Script error." });
  assert.equal(reloads.length, 0); assert.deepEqual(surfaced, []);
  fire(win, "error", { message: "Uncaught TypeError: Failed to fetch dynamically imported module: x", error: undefined });
  assert.equal(reloads.length, 1, "the uncaught render error that unmounted the tree is the same failure");
});

test("surface: a throwing subscriber never breaks recovery; unsubscribe stops notifications", () => {
  const storage = memoryStorage({ [RECOVERY_GUARD_KEY]: ENTRY });
  const { win, recovery } = harness({ storage });
  recovery.install();
  const got = [];
  recovery.subscribe(() => { throw new Error("subscriber"); });
  const off = recovery.subscribe((e) => got.push(e));
  rejection(win, CHUNK);
  assert.equal(got.length, 1);
  off();
  rejection(win, CHUNK);
  assert.equal(got.length, 1);
});

test("install is idempotent, removable, and a no-op without a window", () => {
  const { win, recovery, reloads } = harness();
  assert.equal(recovery.install(), true);
  assert.equal(recovery.install(), false, "second install adds no listeners");
  rejection(win, CHUNK);
  assert.equal(reloads.length, 1, "exactly one handler ran");
  recovery.uninstall();
  const fresh = harness({ storage: memoryStorage() });
  assert.equal(fresh.recovery.install(), true);
  fresh.recovery.uninstall();
  rejection(fresh.win, CHUNK);
  assert.equal(fresh.reloads.length, 0, "uninstalled");
  assert.equal(createAppRecovery2029({ win: null }).install(), false, "node / no window");
});

test("shared controller: install and the boundary talk to the same instance", () => {
  _resetAppRecovery2029ForTests();
  assert.equal(installAppRecovery2029({ entryKey: ENTRY }), false, "no window in node: nothing installed");
  assert.equal(recoverFromChunkLoadError2029(new Error("boom")), "ignored");
  _resetAppRecovery2029ForTests();
});

// ---- static wiring contract ------------------------------------------------------------------------------------------

test("contract: the entry installs the recovery before render, keyed by its own URL", () => {
  const main = read("src/main2029.jsx");
  assert.match(main, /import \{ installAppRecovery2029 \} from "\.\/lib\/appRecovery2029\.js"/);
  assert.match(main, /installAppRecovery2029\(\{ entryKey: import\.meta\.url \}\)/);
  const install = main.indexOf("installAppRecovery2029({");
  assert.ok(install > 0 && install < main.indexOf("createRoot(document"), "installed before the root is created");
  assert.ok(install < main.indexOf("root.render("), "installed before render");
  assert.match(main, /initRuntimeErrorCapture\(\)/, "the shared incident capture stays installed");
});

test("contract: every lazy Route renders inside ErrorBoundary2029, which resets on pathname change", () => {
  const app = read("src/App2029.jsx");
  assert.match(app, /import ErrorBoundary2029 from "\.\/components\/experience2029\/ErrorBoundary2029\.jsx"/);
  assert.match(app, /function RouteErrorBoundary2029\(\{ children \}\)[\s\S]{0,200}useLocation\(\)[\s\S]{0,200}<ErrorBoundary2029 resetKey=\{pathname\}>\{children\}<\/ErrorBoundary2029>/);
  assert.match(app, /<RouteErrorBoundary2029>\s*<Suspense fallback=\{<Loading2029 \/>\}>\s*<PublicReadingBoundary><Routes>[\s\S]*<\/Routes><\/PublicReadingBoundary>\s*<\/Suspense><\/RouteErrorBoundary2029>/);
  // The on-demand install suggestion chunk is outside the Routes: it gets a silent boundary, never a blank app.
  assert.match(app, /<ErrorBoundary2029 fallback=\{null\}><Suspense fallback=\{null\}><InstallSuggestion2029 kind=\{kind\} \/><\/Suspense><\/ErrorBoundary2029>/);
});

test("contract: ErrorBoundary2029 is a class boundary with recovery first, Hebrew RTL fallback, reload and home", () => {
  const boundary = read("src/components/experience2029/ErrorBoundary2029.jsx");
  assert.match(boundary, /export default class ErrorBoundary2029 extends React\.Component/);
  assert.match(boundary, /static getDerivedStateFromError/);
  assert.match(boundary, /componentDidCatch\(error, info\)/);
  assert.match(boundary, /isChunkLoadError\(error\)[\s\S]{0,200}recoverFromChunkLoadError2029\(error\)/, "chunk-load errors go through the recovery first");
  assert.match(boundary, /subscribeAppRecovery2029/, "surfaced (unhandled) chunk failures reach the fallback");
  assert.match(boundary, /componentDidUpdate\(previous\)[\s\S]{0,200}previous\.resetKey !== this\.props\.resetKey/);
  assert.match(boundary, /reportRuntimeIncident\("error_boundary"/, "the shared incident capture (console-only in the public-reading release)");
  assert.ok(!/track\("runtime_error"/.test(boundary), "the boundary never bypasses the shared capture");
  assert.match(boundary, /dir="rtl"/); assert.match(boundary, /lang="he"/);
  assert.match(boundary, /window\.location\.reload\(\)/); assert.match(boundary, /רענון הדף/);
  assert.match(boundary, /<a href="\/"/); assert.match(boundary, /לעמוד הבית/);
  assert.match(boundary, /use2029Palette/, "existing 2029 theme tokens, no new stylesheet");
  assert.ok(!/\.css["']/.test(boundary), "no CSS import: the fallback must render even when the CSS chunk is the missing one");
  assert.ok(!/from "react-router-dom"/.test(boundary), "a document link, not a client-side attempt at the next chunk");
});

test("contract: the recovery module is pure and leaves the service-worker handshake alone", () => {
  const module = read("src/lib/appRecovery2029.js");
  assert.ok(!/^\s*import\s/m.test(module), "no imports: usable and testable without the app graph");
  assert.ok(!/preventDefault/.test(module.replace(/\/\/.*$/gm, "")), "the original error is never swallowed");
  assert.ok(!/serviceWorker|navigator\./.test(module), "no service-worker involvement");
  for (const transportFile of ["public-reading-deploy/transport.js", "public-reading-deploy/middleware.js"]) {
    assert.ok(!/appRecovery2029|RECOVERY_GUARD_KEY|sod2029_chunk_reload/.test(read(transportFile)), `${transportFile} is untouched (a Worker byte change forces a service-worker update for every client)`);
  }
});
