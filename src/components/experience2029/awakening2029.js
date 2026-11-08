// Awakening (the arrival cue): decided here as a pure function so it is testable.
// The opening shell breathes while the page loads; when the real frame arrives after a wait, a light wave runs from the crown along the arc and the
// bar's gold line, one glint crosses the crown and the verse rises. Decorative only. It plays at most once per page load, only when the visitor really
// waited (a fast warm load shows no opening, so it shows no cue), never under reduced motion, and automated browsers skip it so health checks and
// screenshots never catch it mid-flight. `?entrance=1` replays it on demand (owner preview).
export const AWAKENING_MIN_WAIT_MS = 700;
export const AWAKENING_MS = 1100;

export function shouldPlayAwakening({ search = "", reducedMotion = false, webdriver = false, waitedMs = 0, scrolled = false } = {}) {
  if (reducedMotion || scrolled) return false;
  if (/(?:^|[?&])entrance=1(?:&|$)/.test(String(search || ""))) return true;
  return !webdriver && waitedMs >= AWAKENING_MIN_WAIT_MS;
}
