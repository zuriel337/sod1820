import { normalizeCommunityThreadFocus } from "./communityThreadFocus.js";
import { communityMessageShareUrl } from "./communityMessageShare.js";

// A bounded, device-local view cursor. This is neither a read receipt nor
// research/Follow state; message bodies and account details are never cached.
export const COMMUNITY_READING_CACHE = "sod29-community-reading-v1:";
const MAX_AGE = 90 * 86400000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function communityReadingPrincipal(auth = {}) {
  if (auth.loading || auth.user && !auth.verified) return null;
  return auth.user?.id ? `user:${auth.user.id}` : "guest";
}
const empty = () => ({ version: 1, updatedAt: 0, last: null, threads: [] });
function tuple(value) {
  if (!UUID.test(value?.root_id || "") || !UUID.test(value?.message_id || "") || typeof value.created_at !== "string" || !Number.isFinite(Date.parse(value.created_at))) return null;
  return { root_id: value.root_id.toLowerCase(), message_id: value.message_id.toLowerCase(), created_at: new Date(value.created_at).toISOString().slice(0, 19) + "." + ((value.created_at.match(/\.(\d+)(?:Z|[+-]\d\d:\d\d)$/)?.[1] || "").padEnd(6, "0").slice(0, 6)) + "Z" };
}
export function normalizeReadingPosition(input, now = Date.now()) {
  if (!input || input.version !== 1 || !Number.isFinite(input.updatedAt) || now - input.updatedAt > MAX_AGE || input.updatedAt > now + 60000) return empty();
  const seen = new Set(), threads = [];
  for (const raw of Array.isArray(input.threads) ? input.threads.slice(0, 40) : []) {
    const item = tuple(raw);
    if (item && !seen.has(item.root_id)) { seen.add(item.root_id); threads.push(item); }
  }
  const lastTuple = tuple(input.last);
  const path = Array.isArray(input.last?.path) ? input.last.path : [];
  const focus = lastTuple && normalizeCommunityThreadFocus({ threadId: lastTuple.root_id, replyId: lastTuple.message_id, path: path.join(",") });
  const top = input.last?.top;
  return { version: 1, updatedAt: input.updatedAt, threads, last: focus && Number.isFinite(top)
    ? { ...lastTuple, path: focus.path, top: Math.max(-100000, Math.min(2000, Math.round(top))) } : null };
}
export function rememberCommunityReading(previous, position, now = Date.now()) {
  const state = normalizeReadingPosition(previous, now);
  const candidate = normalizeReadingPosition({ version: 1, updatedAt: now, last: position, threads: [position] }, now).last;
  if (!candidate) return state;
  const before = state.threads.find(item => item.root_id === candidate.root_id);
  const newer = !before || candidate.created_at > before.created_at || candidate.created_at === before.created_at && candidate.message_id > before.message_id;
  const nextTuple = newer ? tuple(candidate) : before;
  return { version: 1, updatedAt: now, last: candidate, threads: [nextTuple, ...state.threads.filter(item => item.root_id !== candidate.root_id)].slice(0, 40) };
}
export function loadCommunityReading(storage, principal, now = Date.now()) {
  if (!principal) return empty();
  try { return normalizeReadingPosition(JSON.parse(storage?.getItem(COMMUNITY_READING_CACHE + principal) || "null"), now); } catch { return empty(); }
}
export function saveCommunityReading(storage, principal, value) {
  if (!principal || !storage) return false;
  try { storage.setItem(COMMUNITY_READING_CACHE + principal, JSON.stringify(normalizeReadingPosition(value))); return true; } catch { return false; }
}
export function communityReadingHref(position, origin = "https://sod1820.co.il") {
  if (!position?.path) return null;
  const focus = normalizeCommunityThreadFocus({ threadId: position.root_id || position.path[0], replyId: position.message_id || "", path: position.path.join(",") });
  if (!focus) return null;
  const url = communityMessageShareUrl(origin, focus.path);
  if (!url) return null;
  const parsed = new URL(url);
  return parsed.pathname + parsed.search + `#message-${focus.path.at(-1)}`;
}
export function captureCommunityReading(root, win = globalThis.window) {
  if (!root || !win || root.closest('[inert],[aria-hidden="true"]')) return null;
  const doc = root.ownerDocument;
  if (doc.hidden || [...doc.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(element => element.getBoundingClientRect().height > 0)) return null;
  const header = doc.querySelector(".sod29-header");
  const safeTop = Math.max(80, header?.getBoundingClientRect().bottom || 0);
  const visible = [...root.querySelectorAll(".sod29-community-thread[data-community-path]")].map(element => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ element, rect }) => rect.height > 0 && rect.bottom > safeTop && rect.top < win.innerHeight - 80 && !element.closest('[hidden],[inert]'));
  const picked = visible.find(({ rect }) => rect.top >= safeTop) || visible[0];
  if (!picked) return null;
  const path = picked.element.dataset.communityPath.split(",");
  return { root_id: path[0], message_id: path.at(-1), path, created_at: picked.element.dataset.communityCreated, top: picked.rect.top };
}
