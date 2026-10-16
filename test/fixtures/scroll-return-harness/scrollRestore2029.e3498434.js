// HISTORICAL negative control for test/scroll-return-2029.test.mjs: src/lib/scrollRestore2029.js exactly as at e3498434 (before the reading-anchor restore).
// Not used by the product.
// Scroll behaviour for the 2029 runtime (BrowserRouter has no <ScrollRestoration>).
// Measured on PR1100: on back/forward the browser restores the offset as soon as the (still short) document
// allows, then the content above keeps arriving and scroll anchoring pushes the page further down
// (Home +650..+1250px from where the user left; World after forward stayed at 0). The browser stays in
// charge of the first restore; this adds only:
//   - back/forward (POP) with a remembered offset: pause scroll anchoring at once, wait until the document is
//     tall enough AND has stopped growing, put the page at the remembered offset (instant), and keep anchoring
//     paused until the document has stopped growing for a short hold (bounded) so late content cannot move it; any touch/wheel/key/pointer ends it;
//   - a new entry (PUSH to another pathname, no hash): start at the top (instant: html is scroll-behavior:smooth);
//   - any location with a hash is left alone — the page that owns the anchor scrolls (direct load, in-page, cross-page).
export const SCROLL_STORE_KEY = 'sod2029-scroll-v1';
export const SCROLL_STORE_MAX = 60;
export const RESTORE_MAX_WAIT_MS = 4000;
export const RESTORE_TOLERANCE_PX = 40;
export const RESTORE_STABLE_MS = 400; // the document must stop growing before we jump (content above the target keeps arriving)
export const RESTORE_FORCE_AFTER_MS = 3000;
export const RESTORE_HOLD_MS = 2500; // after the jump, anchoring stays paused until the document has not grown for this long...
export const RESTORE_HOLD_MAX_MS = 8000; // ...but never longer than this after the jump (content that arrives later is left to the browser)

export function planNavigation({ navType, pathname, prevPathname, hash, saved }) {
  if (hash) return { action: 'none' };
  if (navType === 'POP') return Number.isFinite(saved) && saved > 0 ? { action: 'restore', y: saved } : { action: 'none' };
  if (navType === 'PUSH' && prevPathname != null && pathname !== prevPathname) return { action: 'top' };
  return { action: 'none' };
}

export function readStore(storage) {
  try { const v = JSON.parse(storage.getItem(SCROLL_STORE_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
export function trimStore(store, max = SCROLL_STORE_MAX) {
  const keys = Object.keys(store);
  if (keys.length <= max) return store;
  return Object.fromEntries(keys.slice(keys.length - max).map((k) => [k, store[k]]));
}

export function createScrollRestorer2029(win = window) {
  const store = readStore(win.sessionStorage || { getItem: () => null });
  let currentKey = null, prevPathname = null, restoring = null, queued = false, stopListening = null, last = null;

  const persist = () => { try { win.sessionStorage.setItem(SCROLL_STORE_KEY, JSON.stringify(trimStore(store))); } catch { /* storage may be blocked */ } };
  const record = () => {
    queued = false;
    if (currentKey == null || restoring) return;
    const y = Math.max(0, Math.round(win.scrollY || 0));
    const h = win.document.documentElement.scrollHeight;
    // When the page is swapped out the document shrinks and the browser clamps scrollY to the new maximum
    // before the router's location key changes; that clamped value is not where the user was.
    if (last && h < last.h - 1 && y < last.y && y >= h - win.innerHeight - 1) return;
    last = { y, h };
    delete store[currentKey]; store[currentKey] = y; // re-insert: most recent last, for trimming
  };
  const onScroll = () => { if (!queued) { queued = true; win.requestAnimationFrame(record); } };
  const flush = () => { record(); persist(); };
  const cancelRestore = () => { if (restoring) { restoring.cancel(); restoring = null; } };
  const jump = (y) => win.scrollTo({ top: y, left: 0, behavior: 'instant' });

  function restore(y) {
    cancelRestore();
    const root = win.document.documentElement;
    const started = Date.now(); let done = false, lastH = root.scrollHeight, lastChange = started;
    const inputs = ['touchstart', 'wheel', 'keydown', 'pointerdown'];
    const anchorBefore = root.style ? root.style.overflowAnchor : undefined;
    // Scroll anchoring would shift us again when content above the target is inserted after the jump.
    if (root.style) root.style.overflowAnchor = 'none';
    const finish = () => {
      if (done) return; done = true;
      inputs.forEach((e) => win.removeEventListener(e, finish));
      if (root.style) root.style.overflowAnchor = anchorBefore || '';
      if (restoring === handle) restoring = null;
    };
    const handle = { cancel: finish };
    restoring = handle;
    inputs.forEach((e) => win.addEventListener(e, finish, { passive: true, once: true }));
    let holdUntil = 0, holdCap = 0;
    const tick = () => {
      if (done) return;
      const now = Date.now(), h = root.scrollHeight;
      if (holdUntil) {
        // Content that keeps arriving after the jump (late sections) must not hand the page to scroll anchoring yet:
        // the saved offset belongs to the final layout, and anchoring a still-partial layout locks onto the wrong content.
        if (h !== lastH) { lastH = h; holdUntil = Math.min(now + RESTORE_HOLD_MS, holdCap); }
        if (now >= holdUntil) { finish(); return; } win.requestAnimationFrame(tick); return;
      }
      if (h !== lastH) { lastH = h; lastChange = now; }
      const reachable = h - win.innerHeight >= y - 1;
      const stable = now - lastChange >= RESTORE_STABLE_MS || now - started >= RESTORE_FORCE_AFTER_MS;
      if (reachable && stable) { if (Math.abs((win.scrollY || 0) - y) > RESTORE_TOLERANCE_PX) jump(y); holdCap = now + RESTORE_HOLD_MAX_MS; holdUntil = now + RESTORE_HOLD_MS; lastH = h; win.requestAnimationFrame(tick); return; }
      if (now - started > RESTORE_MAX_WAIT_MS) { finish(); return; }
      win.requestAnimationFrame(tick);
    };
    win.requestAnimationFrame(tick);
  }

  return {
    start() {
      win.addEventListener('scroll', onScroll, { passive: true });
      win.addEventListener('pagehide', flush);
      stopListening = () => { win.removeEventListener('scroll', onScroll); win.removeEventListener('pagehide', flush); cancelRestore(); };
    },
    stop() { flush(); stopListening?.(); },
    // call from a layout effect when the router location changes
    onLocation({ key, pathname, hash, navType }) {
      const plan = planNavigation({ navType, pathname, prevPathname, hash, saved: store[key] });
      currentKey = key; prevPathname = pathname; last = null;
      cancelRestore();
      if (plan.action === 'restore') restore(plan.y);
      else if (plan.action === 'top') jump(0);
      return plan;
    },
  };
}
