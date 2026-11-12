// "Smart thread line": remember, per root thread and per browser, when the reader last had the thread on
// screen. Replies newer than that moment light up their segment of the thread line. Nothing is stored on the
// server; every storage call is guarded because private windows / blocked storage can throw.
const KEY = "sod29-thread-seen-v1";
const MAX_ENTRIES = 400;

function read() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

/** ISO time the reader last saw this root thread, or null on a first visit (then nothing is marked new). */
export function getThreadSeenAt(rootId) {
  if (!rootId || typeof window === "undefined") return null;
  const value = read()[rootId];
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

export function markThreadSeen(rootId, at = new Date().toISOString()) {
  if (!rootId || typeof window === "undefined") return;
  try {
    const map = read();
    map[rootId] = at;
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) for (const key of keys.sort((a, b) => Date.parse(map[a]) - Date.parse(map[b])).slice(0, keys.length - MAX_ENTRIES)) delete map[key];
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch { /* storage unavailable: the line simply does not highlight */ }
}

/** A reply is new when it is newer than the last visit and was not written by the reader. */
export function isNewReply(reply, seenAt, currentUserId) {
  if (!seenAt || !reply?.createdAt) return false;
  if (currentUserId && reply.authorUserId === currentUserId) return false;
  const created = Date.parse(reply.createdAt), seen = Date.parse(seenAt);
  return Number.isFinite(created) && Number.isFinite(seen) && created > seen;
}

/** «אמילי, דני ועוד 2» for the collapsed thread summary (loaded replies only). */
export function repliesAuthorSummary(replies, max = 2) {
  const names = [];
  for (const reply of replies || []) {
    const name = typeof reply?.authorName === "string" ? reply.authorName.trim() : "";
    if (name && !names.includes(name)) names.push(name);
  }
  if (!names.length) return "";
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} ועוד ${rest}` : shown.join(" ו");
}
