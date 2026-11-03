// Posts-only layout metadata on the existing browser history entry. This never
// stores content, identity, research state or a second navigation history.
const FIELD = "sodPostsViewport2029";
const INPUT_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"];
const inert = () => ({ isRestoring: false, setReady() {}, stop() {} });
const currentHref = win => `${win.location.pathname}${win.location.search || ""}${win.location.hash || ""}`;
const currentKey = win => win.history.state?.key || "default";
const coordinate = value => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 10_000_000;

function sameEntry(win, entryKey, href) {
  if (!win?.history || typeof href !== "string" || typeof entryKey !== "string"
    || currentHref(win) !== href || currentKey(win) !== entryKey) return false;
  const pathname = win.location.pathname.replace(/\/$/, "");
  return ["/post", "/2029/posts", "/posts"].includes(pathname) || /^\/(?:tag|category)\/[^/?#]+$/.test(pathname);
}

// Read the existing entry without recording or changing its viewport. Callers
// can snapshot arrival readiness before this entry's scroll tracking starts.
export function readPostsCatalogViewport2029({ entryKey, href, navigationType, win = globalThis.window } = {}) {
  try {
    if (navigationType !== "POP" || !sameEntry(win, entryKey, href)) return null;
    const saved = win.history.state?.[FIELD];
    if (saved?.entryKey !== entryKey || saved?.href !== href || !coordinate(saved.x) || !coordinate(saved.y) || saved.y < 0) return null;
    return { entryKey, href, x: saved.x, y: saved.y };
  } catch { return null; }
}

export function rememberPostsCatalogViewport2029({ entryKey, href, win = globalThis.window } = {}) {
  try {
    if (!sameEntry(win, entryKey, href) || !coordinate(win.scrollX) || !coordinate(win.scrollY) || win.scrollY < 0) return false;
    const state = win.history.state;
    if (state != null && (typeof state !== "object" || Array.isArray(state))) return false;
    const existing = state?.[FIELD];
    if (existing?.entryKey === entryKey && existing.href === href && existing.x === win.scrollX && existing.y === win.scrollY) return true;
    win.history.replaceState({ ...(state || {}), [FIELD]: { entryKey, href, x: win.scrollX, y: win.scrollY } }, "", href);
    return true;
  } catch { return false; }
}

export function capturePostsCatalogDeparture2029(event, options) {
  if (!event || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const link = event.target?.closest?.("a[href]");
  if (!link || !event.currentTarget?.contains?.(link) || link.hasAttribute("download")
    || link.target && link.target.toLowerCase() !== "_self") return false;
  try {
    const win = options?.win || globalThis.window;
    const next = new URL(link.getAttribute("href"), win.location.href);
    if (next.origin !== win.location.origin || `${next.pathname}${next.search}${next.hash}` === currentHref(win)) return false;
    // A local anchor is not departure from the catalog document.
    if (next.pathname === win.location.pathname && next.search === win.location.search) return false;
    return rememberPostsCatalogViewport2029(options);
  } catch { return false; }
}

// Keep a returned entry fresh for its next departure through the shared menu as
// well as a catalog card. No per-scroll writes: settled scrolling and explicit
// ordinary clicks only, confined to the currently mounted Posts history entry.
export function trackPostsCatalogViewport2029({ entryKey, href, win = globalThis.window,
  doc = globalThis.document, isRestoring = () => false } = {}) {
  if (!sameEntry(win, entryKey, href) || !doc) return () => {};
  const options = { entryKey, href, win };
  const capture = event => {
    if (isRestoring() || !sameEntry(win, entryKey, href)) return;
    if (event.type === "click") {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.target?.closest?.("a[href]")) { capturePostsCatalogDeparture2029(event, options); return; }
      const button = event.target?.closest?.("button");
      if (!button || button.formTarget && button.formTarget.toLowerCase() !== "_self") return;
    }
    rememberPostsCatalogViewport2029(options);
  };
  doc.addEventListener("click", capture, true);
  doc.addEventListener("scrollend", capture, { passive: true });
  return () => { doc.removeEventListener("click", capture, true); doc.removeEventListener("scrollend", capture); };
}

export function startPostsCatalogViewportRestore2029({ entryKey, href, navigationType,
  win = globalThis.window, doc = globalThis.document } = {}) {
  const saved = readPostsCatalogViewport2029({ entryKey, href, navigationType, win });
  if (!saved) return inert();
  const target = { x: saved.x, y: saved.y };
  let stopped = false, ready = false, frame = null, observer = null, timer = null, hasSettled = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    observer?.disconnect(); observer = null;
    if (frame != null) win.cancelAnimationFrame(frame);
    win.clearTimeout(timer);
    doc.removeEventListener("load", align, true);
    win.removeEventListener("popstate", stop);
    for (const event of INPUT_EVENTS) win.removeEventListener(event, stopForInput, true);
  };
  const align = () => {
    if (stopped || !ready || frame != null) return;
    if (!sameEntry(win, entryKey, href)) { stop(); return; }
    frame = win.requestAnimationFrame(() => {
      frame = null;
      if (stopped || !ready) return;
      if (!sameEntry(win, entryKey, href)) { stop(); return; }
      if (Math.abs(win.scrollX - target.x) > 0.5 || Math.abs(win.scrollY - target.y) > 0.5) {
        win.scrollTo({ left: target.x, top: target.y, behavior: "instant" });
      }
    });
  };
  const stopForInput = () => {
    const cancelNativeMotion = !stopped && sameEntry(win, entryKey, href);
    const x = win.scrollX, y = win.scrollY;
    stop();
    // CSS smooth scrolling can keep a native POP animation moving after our
    // own replay is canceled. Halt it at the current pixel, then let the input's
    // default action choose the new viewport. Cleanup/timeout/POP never do this.
    if (cancelNativeMotion && coordinate(x) && coordinate(y)) win.scrollTo({ left: x, top: y, behavior: "instant" });
  };
  // Cancellation starts while data is pending, so later completion cannot undo
  // a reader's intentional scroll/click. Existing source-return semantics apply.
  for (const event of INPUT_EVENTS) win.addEventListener(event, stopForInput, { capture: true, passive: true, once: true });
  win.addEventListener("popstate", stop);
  doc.addEventListener("load", align, true);
  timer = win.setTimeout(stop, 30_000);

  return {
    get isRestoring() { return !stopped; },
    stop,
    setReady(value, root) {
      if (stopped) return;
      ready = value === true;
      if (!ready) {
        observer?.disconnect(); observer = null;
        if (frame != null) { win.cancelAnimationFrame(frame); frame = null; }
        return;
      }
      if (!hasSettled) {
        hasSettled = true;
        win.clearTimeout(timer);
        timer = win.setTimeout(stop, 5_000);
      }
      if (!observer && root && typeof win.ResizeObserver === "function") {
        observer = new win.ResizeObserver(align);
        observer.observe(root);
      }
      align();
    },
  };
}
