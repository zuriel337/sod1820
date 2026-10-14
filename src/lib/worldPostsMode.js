// EXPERIMENT (isolation of the Posts system from the World page). Build-time constant:
//   full  = unchanged World
//   basic = post cards from the basic list row only: no post-reading projection, connection
//           resolution, method verification, gematria traces or post-body reads
//   off   = no post data requests at all (reserved space is rendered instead of the card)
// Resolved at build time so the branches below are removed from the bundle, not just hidden.
export const WORLD_POSTS_MODE = import.meta.env.VITE_WORLD_POSTS || 'full';
export const WORLD_POSTS_FULL = WORLD_POSTS_MODE === 'full';
export const WORLD_POSTS_OFF = WORLD_POSTS_MODE === 'off';

// EXPERIMENT: tiered World requests (draw first / after paint / on demand). Build constant.
export const WORLD_TIER = import.meta.env.VITE_WORLD_TIER !== '0';
export const idleRun = (fn, timeout = 1500) => (typeof window !== 'undefined' && window.requestIdleCallback
  ? window.requestIdleCallback(fn, { timeout }) : setTimeout(fn, 300));
