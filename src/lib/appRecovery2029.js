// 2029 stale-deployment recovery: a lazy route chunk (or its CSS) that disappears after a new deployment must
// never leave the reader on a blank screen.
//
// Why this exists: the only recovery the old runtime had (a `vite:preloadError` reload) lived in the retired entry.
// In the 2029 app a missing lazy chunk rejects React.lazy, the error reaches no boundary, and the whole tree
// unmounts (evidence LB-1: 24/24 lab runs, and 404 bursts in the live logs after alias swaps).
//
// Contract:
//  - Only dynamic-import / CSS-preload failure signatures are acted on. Any other error is ignored (returns "ignored").
//  - At most ONE automatic reload per entry build. The guard lives in sessionStorage keyed by the entry script URL,
//    so a newer build gets its own single attempt and the same build never loops.
//  - Storage that cannot persist the guard (blocked, quota, private mode, silent no-op) means NO reload: a loop is the
//    worse failure, and the visible fallback has a manual reload button.
//  - When the guard is already set, nothing reloads; the failure is surfaced to subscribers (ErrorBoundary2029).
//  - Pure and dependency-injected (window, storage, reload, entry key) so it is unit-testable in node.
// Not here on purpose: the service worker / bootstrap handshake (public-reading-deploy/transport.js) is untouched.

export const RECOVERY_GUARD_KEY = "sod2029_chunk_reload_v1";

// Chrome/Edge, Firefox, Safari, and Vite's own CSS preload failure.
export const CHUNK_LOAD_SIGNATURES = Object.freeze([
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
]);

function messageOf(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try { return typeof value.message === "string" ? value.message : ""; } catch { return ""; }
}

export function isChunkLoadError(value) {
  const message = messageOf(value);
  return message !== "" && CHUNK_LOAD_SIGNATURES.some(signature => signature.test(message));
}

const withoutQuery = value => String(value || "").split(/[?#]/)[0];

// The bootstrap imports the entry from an inline module, so there is no <script src> to read in production:
// the entry passes its own import.meta.url. This is only the fallback for other hosts (tests, dev).
function entryFromDocument(win) {
  try {
    const script = win.document.querySelector('script[type="module"][src]');
    return withoutQuery(script?.getAttribute("src")) || "unknown";
  } catch { return "unknown"; }
}

/**
 * @param {object} [options]
 * @param {Window} [options.win]            default globalThis.window
 * @param {() => Storage} [options.getStorage]  default () => win.sessionStorage (may throw)
 * @param {() => void} [options.reload]     default () => win.location.reload()
 * @param {string | (() => string)} [options.entryKey]  current entry build identity (entry script URL)
 */
export function createAppRecovery2029(options = {}) {
  const win = options.win ?? (typeof window !== "undefined" ? window : undefined);
  const getStorage = options.getStorage ?? (() => win.sessionStorage);
  const reload = options.reload ?? (() => win.location.reload());
  const entryKey = () => withoutQuery(typeof options.entryKey === "function" ? options.entryKey() : options.entryKey) || entryFromDocument(win);
  const listeners = new Set();
  let reloading = false;
  let uninstall = null;

  // Claim the single reload for this build. Verifies by reading back, so a silent no-op storage also fails closed.
  function claimReload() {
    try {
      const storage = getStorage();
      if (!storage) return false;
      const key = entryKey();
      if (storage.getItem(RECOVERY_GUARD_KEY) === key) return false;
      storage.setItem(RECOVERY_GUARD_KEY, key);
      return storage.getItem(RECOVERY_GUARD_KEY) === key;
    } catch { return false; }
  }

  // "ignored" (not a chunk-load failure), "reloading" (a reload is in flight or was just started),
  // "exhausted" (this build already reloaded once, or the guard cannot be stored: show the fallback).
  // `trusted` is for the Vite event itself carrying no payload: the event is the signal.
  function recover(error, { trusted = false } = {}) {
    if (!trusted && !isChunkLoadError(error)) return "ignored";
    if (reloading) return "reloading";
    if (!claimReload()) return "exhausted";
    reloading = true;
    try { reload(); } catch { reloading = false; return "exhausted"; }
    return "reloading";
  }

  function surface(error) {
    for (const listener of [...listeners]) { try { listener(error); } catch { /* a subscriber never breaks recovery */ } }
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  function install() {
    if (uninstall) return false;
    if (!win || typeof win.addEventListener !== "function") return false;
    // Vite dispatches this when a dynamic import or its CSS fails. Not defaultPrevented on purpose: the original error
    // must keep propagating so React.lazy rejects into ErrorBoundary2029 (and swallowed prefetches stay swallowed).
    // A payload that is some other error (e.g. a module that throws while evaluating) is ignored by recover();
    // only a payload-less event is trusted as the signal itself.
    const onPreloadError = event => {
      const payload = event?.payload;
      recover(payload, { trusted: payload == null });
    };
    // Nobody handled the failure: reload once, otherwise surface the fallback.
    const unhandled = error => { if (recover(error) === "exhausted") surface(error); };
    const onRejection = event => unhandled(event?.reason);
    const onError = event => { if (event?.error != null && isChunkLoadError(event.error)) unhandled(event.error); else if (isChunkLoadError(event?.message)) unhandled(event.message); };
    win.addEventListener("vite:preloadError", onPreloadError);
    win.addEventListener("unhandledrejection", onRejection);
    win.addEventListener("error", onError);
    uninstall = () => {
      win.removeEventListener?.("vite:preloadError", onPreloadError);
      win.removeEventListener?.("unhandledrejection", onRejection);
      win.removeEventListener?.("error", onError);
      uninstall = null;
    };
    return true;
  }

  return { recover, subscribe, install, uninstall: () => uninstall?.(), get reloading() { return reloading; } };
}

// One controller per page. The entry installs it before render; ErrorBoundary2029 reaches the same instance.
let shared = null;
export function getAppRecovery2029(options) {
  if (!shared) shared = createAppRecovery2029(options);
  return shared;
}
export function installAppRecovery2029(options) { return getAppRecovery2029(options).install(); }
export function recoverFromChunkLoadError2029(error) { return getAppRecovery2029().recover(error); }
export function subscribeAppRecovery2029(listener) { return getAppRecovery2029().subscribe(listener); }
export function _resetAppRecovery2029ForTests() { shared?.uninstall(); shared = null; }
