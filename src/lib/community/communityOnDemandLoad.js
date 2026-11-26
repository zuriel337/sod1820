// Community first load (speed map S-64, ZURIEL 27.11.2026): public reads that only decorate the chat (pinned strip, staff badges, the online dots) start when the
// visitor shows up (first pointer, key, touch, wheel or scroll, or after a short visible dwell) instead of on every entrance, and timers run only while the tab is
// visible. Same reads, same results; a visitor who never touches the page and leaves within seconds makes none of them. Measurement, the feed and the
// notifications are not touched. No cache, no store: plain timers and listeners.
import { useEffect, useState } from "react";

export const ENGAGED_DWELL_MS = 8000;
const ENGAGE_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel", "scroll"];

/** Pure core, testable without React: calls onEngaged once (first interaction, or after dwellMs of visible time). Returns its cleanup. */
export function watchEngagement(onEngaged, { doc = typeof document === "undefined" ? null : document, win = typeof window === "undefined" ? null : window, dwellMs = ENGAGED_DWELL_MS } = {}) {
  if (!doc || !win) return () => {};
  let done = false, visibleSince = doc.hidden ? null : Date.now(), timer = null;
  const fire = () => { if (done) return; done = true; cleanup(); onEngaged(); };
  const arm = () => { clearTimeout(timer); timer = null; if (!doc.hidden && !done) { visibleSince = Date.now(); timer = setTimeout(fire, dwellMs); } };
  const onVisibility = () => { if (doc.hidden) { clearTimeout(timer); timer = null; visibleSince = null; } else arm(); };
  function cleanup() { clearTimeout(timer); for (const name of ENGAGE_EVENTS) win.removeEventListener(name, fire, true); doc.removeEventListener("visibilitychange", onVisibility); }
  for (const name of ENGAGE_EVENTS) win.addEventListener(name, fire, { capture: true, passive: true, once: true });
  doc.addEventListener("visibilitychange", onVisibility);
  arm();
  return cleanup;
}

/** true once the visitor engaged (or dwelled while visible). Starts false on every page load. */
export function useEngagedOrDwell(dwellMs = ENGAGED_DWELL_MS) {
  const [engaged, setEngaged] = useState(false);
  useEffect(() => (engaged ? undefined : watchEngagement(() => setEngaged(true), { dwellMs })), [engaged, dwellMs]);
  return engaged;
}

/** A timer that runs only while the tab is visible, and runs once at once when the tab comes back after a full period of absence. */
export function visibleInterval(fn, ms, { doc = typeof document === "undefined" ? null : document, now = Date.now } = {}) {
  if (!doc) return () => {};
  let last = now();
  const run = () => { last = now(); fn(); };
  const timer = setInterval(() => { if (!doc.hidden) run(); }, ms);
  const onVisibility = () => { if (!doc.hidden && now() - last >= ms) run(); };
  doc.addEventListener("visibilitychange", onVisibility);
  return () => { clearInterval(timer); doc.removeEventListener("visibilitychange", onVisibility); };
}
