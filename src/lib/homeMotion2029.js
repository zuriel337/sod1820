// Shared rules for the restrained Home motion. Pure helpers (no DOM), so they are unit-testable.
export const RECENT_DAYS = 14;
export const RECENT_SOURCE_HOURS = 24;
const HOUR = 3600000;

/** True when `value` is a valid time inside the last `windowMs` (and not in the future by more than an hour). */
export function isRecent(value, windowMs, now = Date.now()) {
  const time = value ? new Date(value).getTime() : NaN;
  if (!Number.isFinite(time)) return false;
  const age = now - time;
  return age >= -HOUR && age <= windowMs;
}

export const recentConvergence = (approvedAt, now) => isRecent(approvedAt, RECENT_DAYS * 24 * HOUR, now);
export const recentSource = (arrivalAt, now) => isRecent(arrivalAt, RECENT_SOURCE_HOURS * HOUR, now);

/** Seen marks are per browser (localStorage); the server-side per-user state does not exist yet. */
const SEEN_KEY = "sod-home-seen-updates";
const store = () => { try { return window.localStorage; } catch (_) { return null; } };
export function readSeen() {
  try { return JSON.parse(store()?.getItem(SEEN_KEY) || "{}") || {}; } catch (_) { return {}; }
}
export function markSeen(key, seen = readSeen()) {
  const next = { ...seen, [key]: Date.now() };
  try { store()?.setItem(SEEN_KEY, JSON.stringify(next)); } catch (_) { /* optional */ }
  return next;
}
