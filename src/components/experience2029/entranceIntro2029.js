// Entrance intro for the 2029 Home: the complete approved logo, once per session, then it is gone.
// Decorative only (aria-hidden, pointer-events:none, fixed overlay = no layout shift). Pure decision here so it is testable.
export const ENTRANCE_INTRO_SEEN_KEY = "sod-entrance-intro-seen";
export const ENTRANCE_INTRO_MS = 1700;

// reducedMotion -> never plays (not even on request). `?entrance=1` replays it on demand (owner preview).
// Automated browsers (navigator.webdriver) skip it so health checks and screenshots never wait on an animation.
export function shouldPlayEntranceIntro({ search = "", reducedMotion = false, webdriver = false, seen = false } = {}) {
  if (reducedMotion) return false;
  if (/(?:^|[?&])entrance=1(?:&|$)/.test(String(search || ""))) return true;
  return !webdriver && !seen;
}
