// Scroll behaviour for the 2029 runtime (BrowserRouter has no <ScrollRestoration>).
// Measured on PR1100: on back/forward the browser restores the offset as soon as the (still short) document
// allows, then the content above keeps arriving and scroll anchoring pushes the page further down
// (Home +650..+1250px from where the user left; World after forward stayed at 0). The browser stays in
// charge of the first restore; this adds only:
//   - back/forward (POP) with a remembered offset: pause scroll anchoring at once, wait until the document is
//     tall enough AND has stopped growing, put the page at the remembered offset (instant), and keep anchoring
//     paused until the document has stopped growing for a short hold (bounded) so late content cannot move it; any touch/wheel/key/pointer ends it;
//   - a page that marks its blocks with data-scroll-anchor (Home) is restored to the READING PLACE, not only to a number: the block that starts at or above
//     the viewport top, and the distance below its top, are remembered with the offset; on a return the same place in the same block is restored, tracked
//     while the layout settles (late content above, held boxes collapsing when a read fails or comes back empty), and kept for the hold. A block that is gone
//     falls back to the block before it, then to the number;
//   - a new entry (PUSH to another pathname, no hash): start at the top (instant: html is scroll-behavior:smooth);
//   - any location with a hash is left alone — the page that owns the anchor scrolls (direct load, in-page, cross-page).
export const SCROLL_STORE_KEY = 'sod2029-scroll-v1';
export const SCROLL_ANCHOR_STORE_KEY = 'sod2029-scroll-anchor-v1';
export const ANCHOR_ATTR = 'data-scroll-anchor';
export const SCROLL_STORE_MAX = 60;
export const RESTORE_MAX_WAIT_MS = 4000;
export const RESTORE_TOLERANCE_PX = 40;
export const RESTORE_STABLE_MS = 400; // the document must stop growing before we jump (content above the target keeps arriving)
export const RESTORE_FORCE_AFTER_MS = 3000;
export const RESTORE_HOLD_MS = 2500; // after the jump, anchoring stays paused until the document has not grown for this long...
export const RESTORE_HOLD_MAX_MS = 8000; // ...but never longer than this after the jump (content that arrives later is left to the browser)

export function planNavigation({ navType, pathname, prevPathname, hash, saved, anchors }) {
  if (hash) return { action: 'none' };
  if (navType === 'POP') return Number.isFinite(saved) && saved > 0 ? { action: 'restore', y: saved, ...(Array.isArray(anchors) && anchors.length ? { anchors } : {}) } : { action: 'none' };
  if (navType === 'PUSH' && prevPathname != null && pathname !== prevPathname) return { action: 'top' };
  return { action: 'none' };
}

export function readStore(storage, key = SCROLL_STORE_KEY) {
  try { const v = JSON.parse(storage.getItem(key) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

// Where scrollY must be so that the viewport shows the same place relative to a block that it showed when the page was left.
//   off = distance of the viewport top below the block's top, h = the block's height then; top/height = the block now (document coordinates).
//   Inside the block (off < h): the same distance below its top, never past its end (a block that shrank puts the person at its end, not beyond it).
//   Below the block (off >= h): the same distance below its end, so changes in the block's height are followed.
export function anchorTarget({ off, h }, { top, height }) {
  return off < h ? top + Math.min(off, height) : top + height + (off - h);
}

// The reading place: the last marked block that starts at or above the viewport top (document order), then the one before it as the fallback.
// Each entry is [id, off, h]. null when the page has no marked blocks or the viewport is above the first one.
export function readAnchors(win) {
  const doc = win.document;
  if (!doc || typeof doc.querySelectorAll !== 'function') return null;
  const blocks = [...doc.querySelectorAll(`[${ANCHOR_ATTR}]`)].map((el) => ({ id: el.getAttribute(ANCHOR_ATTR), rect: el.getBoundingClientRect() })).filter((b) => b.id && b.rect.height > 0);
  let k = -1;
  blocks.forEach((b, i) => { if (b.rect.top <= 1) k = i; });
  if (k < 0) return null;
  const pick = (b) => [b.id, Math.max(0, Math.round(-b.rect.top)), Math.round(b.rect.height)];
  return k > 0 ? [pick(blocks[k]), pick(blocks[k - 1])] : [pick(blocks[k])];
}

// Resolve the saved reading place against the page as it is now: the first remembered block that exists (and is displayed) decides; otherwise the number.
export function resolveReadingPlace(win, y, anchors) {
  const doc = win.document;
  if (Array.isArray(anchors) && anchors.length && doc && typeof doc.querySelectorAll === 'function') {
    const present = [...doc.querySelectorAll(`[${ANCHOR_ATTR}]`)];
    for (const [id, off, h] of anchors) {
      const el = present.find((node) => node.getAttribute(ANCHOR_ATTR) === id);
      const rect = el && el.getBoundingClientRect();
      if (rect && rect.height > 0) {
        // a page that got shorter cannot be scrolled past its end: the reading place is then the end of the page
        const room = Math.max(0, (doc.documentElement?.scrollHeight || Infinity) - (win.innerHeight || 0));
        return { y: Math.min(room, Math.max(0, Math.round(anchorTarget({ off, h }, { top: rect.top + (win.scrollY || 0), height: rect.height })))), anchored: true };
      }
    }
  }
  return { y, anchored: false };
}
export function trimStore(store, max = SCROLL_STORE_MAX) {
  const keys = Object.keys(store);
  if (keys.length <= max) return store;
  return Object.fromEntries(keys.slice(keys.length - max).map((k) => [k, store[k]]));
}

export function createScrollRestorer2029(win = window) {
  const storage = win.sessionStorage || { getItem: () => null };
  const store = readStore(storage), anchorStore = readStore(storage, SCROLL_ANCHOR_STORE_KEY);
  let currentKey = null, prevPathname = null, restoring = null, queued = false, stopListening = null, last = null;

  const persist = () => {
    try { win.sessionStorage.setItem(SCROLL_STORE_KEY, JSON.stringify(trimStore(store))); } catch { /* storage may be blocked */ }
    try { win.sessionStorage.setItem(SCROLL_ANCHOR_STORE_KEY, JSON.stringify(trimStore(anchorStore))); } catch { /* storage may be blocked */ }
  };
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
    const anchors = readAnchors(win);
    delete anchorStore[currentKey]; if (anchors) anchorStore[currentKey] = anchors;
  };
  const onScroll = () => { if (!queued) { queued = true; win.requestAnimationFrame(record); } };
  const flush = () => { record(); persist(); };
  const cancelRestore = () => { if (restoring) { restoring.cancel(); restoring = null; } };
  const jump = (y) => win.scrollTo({ top: y, left: 0, behavior: 'instant' });

  function restore(y, anchors) {
    cancelRestore();
    const anchored = Array.isArray(anchors) && anchors.length > 0;
    let tracker = null;
    const root = win.document.documentElement;
    const started = Date.now(); let done = false, lastH = root.scrollHeight, lastChange = started;
    const inputs = ['touchstart', 'wheel', 'keydown', 'pointerdown'];
    const anchorBefore = root.style ? root.style.overflowAnchor : undefined;
    // Scroll anchoring would shift us again when content above the target is inserted after the jump.
    if (root.style) root.style.overflowAnchor = 'none';
    const finish = () => {
      if (done) return; done = true;
      inputs.forEach((e) => win.removeEventListener(e, finish));
      tracker?.disconnect(); tracker = null;
      if (root.style) root.style.overflowAnchor = anchorBefore || '';
      if (restoring === handle) restoring = null;
    };
    const handle = { cancel: finish };
    restoring = handle;
    inputs.forEach((e) => win.addEventListener(e, finish, { passive: true, once: true }));
    let holdUntil = 0, holdCap = 0;
    // During the hold an anchored restore follows the reading place: whatever happens above it (late content, a held box collapsing because its read
    // failed or came back empty) must not move the person. Runs per frame and, where available, from a ResizeObserver, i.e. after layout and before paint.
    const follow = () => {
      const place = resolveReadingPlace(win, y, anchors);
      if (place.anchored && Math.abs((win.scrollY || 0) - place.y) > 1) jump(place.y);
    };
    const tick = () => {
      if (done) return;
      const now = Date.now(), h = root.scrollHeight;
      if (holdUntil) {
        if (anchored) follow();
        // Content that keeps arriving after the jump (late sections) must not hand the page to scroll anchoring yet:
        // the saved offset belongs to the final layout, and anchoring a still-partial layout locks onto the wrong content.
        if (h !== lastH) { lastH = h; holdUntil = Math.min(now + RESTORE_HOLD_MS, holdCap); }
        if (now >= holdUntil) { finish(); return; } win.requestAnimationFrame(tick); return;
      }
      if (h !== lastH) { lastH = h; lastChange = now; }
      const place = resolveReadingPlace(win, y, anchors), target = place.y;
      // none of the remembered blocks is in the page yet: wait for it (bounded by the force deadline), then fall back to the number
      const waiting = anchored && !place.anchored && now - started < RESTORE_FORCE_AFTER_MS;
      const reachable = h - win.innerHeight >= target - 1;
      // A number is only meaningful in the final layout, so a numeric restore waits until the document stops growing. A reading place is content-relative and is
      // followed from here on, so once its block is in the page it is placed at once: waiting would let a collapse or a late section move the person first.
      const stable = (anchored && place.anchored) || now - lastChange >= RESTORE_STABLE_MS || now - started >= RESTORE_FORCE_AFTER_MS;
      if (reachable && stable && !waiting) {
        if (Math.abs((win.scrollY || 0) - target) > RESTORE_TOLERANCE_PX) jump(target);
        holdCap = now + RESTORE_HOLD_MAX_MS; holdUntil = now + RESTORE_HOLD_MS; lastH = h;
        if (anchored && typeof win.ResizeObserver === 'function') { tracker = new win.ResizeObserver(() => { if (!done && holdUntil) follow(); }); tracker.observe(root); }
        win.requestAnimationFrame(tick); return;
      }
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
      const plan = planNavigation({ navType, pathname, prevPathname, hash, saved: store[key], anchors: anchorStore[key] });
      currentKey = key; prevPathname = pathname; last = null;
      cancelRestore();
      if (plan.action === 'restore') restore(plan.y, plan.anchors);
      else if (plan.action === 'top') jump(0);
      return plan;
    },
  };
}
