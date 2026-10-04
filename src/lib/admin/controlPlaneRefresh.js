// Browser-local, read-only refresh policy. No background job or persisted store.
export function dueRefreshKeys(keys, sources, attempts, now, intervalMs) {
  return [...new Set(keys)].filter(key => {
    if (sources[key]?.status === "loading") return false;
    const attempt = attempts[key];
    if (!attempt) return true;
    const delay = Math.min(intervalMs * 2 ** Math.min(attempt.failures || 0, 4), 900000);
    return now - attempt.at >= delay;
  });
}

export function createVisibleRefresh({ doc, win, intervalMs, run, onState = () => {},
  setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer = null, stopped = false, busy = false;
  const cancel = () => { if (timer != null) clearTimer(timer); timer = null; };
  const available = () => !stopped && doc.visibilityState === "visible" && win.navigator.onLine !== false;
  const state = () => doc.visibilityState !== "visible" ? "paused" : win.navigator.onLine === false ? "offline" : "waiting";
  const schedule = () => { cancel(); if (!stopped) { onState(state()); if (available()) timer = setTimer(tick, intervalMs); } };
  async function tick() {
    cancel();
    if (!available() || busy) { if (!busy) schedule(); return; }
    busy = true; onState("refreshing");
    try { await run(); } catch { /* each source owns its read error */ }
    finally { busy = false; if (!stopped) schedule(); }
  }
  const changed = () => { cancel(); if (available()) void tick(); else if (!stopped) onState(state()); };
  doc.addEventListener("visibilitychange", changed);
  win.addEventListener("online", changed); win.addEventListener("offline", changed);
  schedule();
  return () => { stopped = true; cancel(); doc.removeEventListener("visibilitychange", changed);
    win.removeEventListener("online", changed); win.removeEventListener("offline", changed); };
}
