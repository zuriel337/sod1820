import { plainMessageText } from "./messageFormatting.js";
import { COMMUNITY_THREAD_UUID } from "./communityThreadFocus.js";
import { COMMUNITY_DRAFT_CACHE } from "./communityDraft.js";

// A guest's message waiting for the one-step community signup. Local to this
// device only (never sent anywhere); it survives the OAuth redirect and is
// published once, by the account that completes the signup, then removed.
export const COMMUNITY_GUEST_POST_KEY = "sod29-community-guest-post-v1";
export const COMMUNITY_GUEST_POST_MAX_AGE = 6 * 3600000;

export function normalizeGuestPost(value, now = Date.now()) {
  if (!value || value.version !== 1 || !Number.isFinite(value.savedAt)
      || now - value.savedAt > COMMUNITY_GUEST_POST_MAX_AGE || value.savedAt > now + 60000
      || typeof value.body !== "string" || value.body.length > 5000) return null;
  const text = plainMessageText(value.body);
  if (!text.trim() || text.length > 1500) return null;
  const parentId = typeof value.parentId === "string" && COMMUNITY_THREAD_UUID.test(value.parentId) ? value.parentId : null;
  return { version: 1, savedAt: value.savedAt, body: value.body, parentId };
}
export function stashGuestPost(storage, { body, parentId = null }, now = Date.now()) {
  try {
    const value = normalizeGuestPost({ version: 1, savedAt: now, body, parentId }, now);
    if (!storage || !value) return false;
    storage.setItem(COMMUNITY_GUEST_POST_KEY, JSON.stringify(value));
    return true;
  } catch { return false; }
}
export function peekGuestPost(storage, now = Date.now()) {
  try {
    const raw = storage?.getItem(COMMUNITY_GUEST_POST_KEY);
    if (!raw) return null;
    const value = normalizeGuestPost(JSON.parse(raw), now);
    if (!value) storage.removeItem(COMMUNITY_GUEST_POST_KEY);
    return value;
  } catch { return null; }
}
// Removes the pending message and the guest composer cache so the text is not
// shown again as a draft after it was published.
export function clearGuestPost(storage) {
  try { storage?.removeItem(COMMUNITY_GUEST_POST_KEY); storage?.removeItem(COMMUNITY_DRAFT_CACHE + "guest"); } catch { /* storage unavailable */ }
}
