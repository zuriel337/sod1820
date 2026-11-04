import { plainMessageText } from "./messageFormatting.js";
import { COMMUNITY_THREAD_UUID } from "./communityThreadFocus.js";

// An expiring local composer cache, never published content or account identity.
export const COMMUNITY_DRAFT_CACHE = "sod29-community-draft-v1:";
export const COMMUNITY_DRAFT_MAX_AGE = 7 * 86400000;
export function normalizeCommunityDraft(value, now = Date.now()) {
  if (!value || value.version !== 1 || !Number.isFinite(value.updatedAt)
      || now - value.updatedAt > COMMUNITY_DRAFT_MAX_AGE || value.updatedAt > now + 60000
      || typeof value.body !== "string" || value.body.length > 5000 || plainMessageText(value.body).length > 1500) return null;
  let reply = null;
  if (value.reply != null) {
    if (!COMMUNITY_THREAD_UUID.test(value.reply.id || "") || value.reply.parentId != null && !COMMUNITY_THREAD_UUID.test(value.reply.parentId)
        || value.reply.parentId === value.reply.id) return null;
    reply = { id: value.reply.id, parentId: value.reply.parentId || null };
  }
  return { version: 1, updatedAt: value.updatedAt, body: value.body, reply, hadAttachments: value.hadAttachments === true };
}
export function loadCommunityDraft(storage, principal, now = Date.now()) {
  if (!principal) return { value: null, available: true };
  try {
    if (!storage) throw new Error("Storage unavailable");
    const key = COMMUNITY_DRAFT_CACHE + principal, raw = storage.getItem(key);
    const value = normalizeCommunityDraft(JSON.parse(raw || "null"), now);
    if (raw && !value) storage.removeItem(key);
    return { value, available: true };
  } catch { return { value: null, available: false }; }
}
export function saveCommunityDraft(storage, principal, draft, now = Date.now()) {
  if (!principal) return false;
  try {
    if (!storage) throw new Error("Storage unavailable");
    const value = normalizeCommunityDraft({ version: 1, updatedAt: now, body: draft.body, reply: draft.reply, hadAttachments: draft.hadAttachments }, now);
    if (!value) return false;
    if (!plainMessageText(value.body).trim() && !value.reply && !value.hadAttachments) storage.removeItem(COMMUNITY_DRAFT_CACHE + principal);
    else storage.setItem(COMMUNITY_DRAFT_CACHE + principal, JSON.stringify(value));
    return true;
  } catch { return false; }
}
