// Refresh the existing public projection while keeping the reader's place.
export const COMMUNITY_REFRESH_INTERVAL_MS = 30000;

export function mergeCommunityRefreshRows(current, fresh, sort = "newest", { complete = false } = {}) {
  if (!fresh.length) return [];
  const direction = sort === "oldest" ? 1 : -1;
  const compare = (a, b) => direction * (String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id).localeCompare(String(b.id)));
  const ids = new Set(fresh.map((row) => row.id));
  const boundary = fresh[fresh.length - 1];
  // The fresh page proves current visibility only through its final row.
  // Keep already-loaded history beyond that boundary and deduplicate it.
  const tail = complete ? [] : current.filter((row) => !ids.has(row.id) && compare(row, boundary) > 0);
  const merged = [...fresh, ...tail].sort(compare);
  return JSON.stringify(merged) === JSON.stringify(current) ? current : merged;
}

export function captureCommunityScrollAnchor(root, win = globalThis.window) {
  if (!root || !win) return null;
  for (const element of root.querySelectorAll(".sod29-community-thread[id]")) {
    const rect = element.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < win.innerHeight) return { id: element.id, top: rect.top };
  }
  return null;
}

export function restoreCommunityScrollAnchor(anchor, doc = globalThis.document, win = globalThis.window) {
  const element = anchor && doc?.getElementById(anchor.id);
  if (!element || !win) return;
  const delta = element.getBoundingClientRect().top - anchor.top;
  if (Math.abs(delta) > 1) win.scrollBy({ top: delta, behavior: "instant" });
}

export function startCommunityRefresh({
  refresh,
  doc = globalThis.document,
  win = globalThis.window,
  intervalMs = COMMUNITY_REFRESH_INTERVAL_MS,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
}) {
  if (!doc || !win) return () => {};
  let stopped = false;
  let running = false;
  let timer = null;
  const visible = () => !doc.hidden && doc.visibilityState !== "hidden";
  const cancel = () => { if (timer !== null) clearTimer(timer); timer = null; };
  const schedule = () => {
    cancel();
    if (!stopped && visible()) timer = setTimer(run, intervalMs);
  };
  async function run() {
    cancel();
    if (stopped || running || !visible()) return;
    running = true;
    try { await refresh(); } catch { /* retain the last successful view; retry on the next visible tick */ }
    finally { running = false; if (!stopped) schedule(); }
  }
  const onVisibility = () => { if (visible()) void run(); else cancel(); };
  const onFocus = () => { if (visible()) void run(); };
  doc.addEventListener("visibilitychange", onVisibility);
  win.addEventListener("focus", onFocus);
  schedule();
  return () => {
    stopped = true;
    cancel();
    doc.removeEventListener("visibilitychange", onVisibility);
    win.removeEventListener("focus", onFocus);
  };
}
