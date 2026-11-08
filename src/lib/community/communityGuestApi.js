import { supabase } from "../supabase.js";

// Guest publishing: the server enforces everything (kill switch, rate limits,
// text only, valid parent). These helpers only call it and explain failures.
export const GUEST_LINK_PATTERN = /(https?:\/\/|www\.|[a-z0-9-]+\.(?:com|co\.il|org\.il|org|net|il|io|me|ly|tv|ru|info|xyz|app|dev|gl|be|to)(?:\/|\b))/i;
export const guestBodyHasLink = body => /📎/.test(body || "") || GUEST_LINK_PATTERN.test(body || "");

const GUEST_ERRORS = {
  rate_limited: "שלחתם הרבה הודעות ברצף. אפשר לנסות שוב מאוחר יותר, או להירשם ולפרסם.",
  busy: "הקהילה עמוסה כרגע. נסו שוב בעוד כמה דקות, או הירשמו ופרסמו.",
  links_not_allowed: "אורחים יכולים לפרסם טקסט בלבד, בלי קישורים וקבצים. הירשמו כדי לצרף קישור.",
  too_long: "ההודעה ארוכה מדי.",
  guest_publish_disabled: "פרסום כאורח אינו פעיל כרגע. אפשר להירשם ולפרסם.",
  use_account: "אתם מחוברים לחשבון. נסו לפרסם שוב.",
  invalid_parent: "ההודעה שאליה עונים אינה זמינה יותר.",
  invalid_name: "השם צריך להיות בן 2 עד 30 תווים, בלי סימנים מיוחדים.",
  reply_only: "אורחים יכולים להגיב על הודעה קיימת בלבד. כדי לפתוח שיחה חדשה אפשר להירשם.",
};
export function guestPublishErrorMessage(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  for (const [code, message] of Object.entries(GUEST_ERRORS)) if (text.includes(code)) return message;
  return "לא הצלחנו לפרסם את ההודעה. ההודעה נשמרה, אפשר לנסות שוב.";
}
// Optional display name for a guest. The server is the authority (it also adds the
// "(אורח)" label); this mirrors its rules so a visitor gets feedback before sending.
export const GUEST_NAME_MIN = 2;
export const GUEST_NAME_MAX = 30;
export const GUEST_NAME_STORAGE_KEY = "sod29-community-guest-name-v1";
export function cleanGuestName(value) {
  return String(value ?? "").replace(/[\u0001-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "").replace(/\s+/g, " ").trim();
}
// "" = no name (published as plain "אורח"), "ok" = usable, otherwise the error code.
export function guestNameProblem(value) {
  const name = cleanGuestName(value);
  if (!name) return "";
  if (guestBodyHasLink(name)) return "links_not_allowed";
  const length = [...name].length;
  return length < GUEST_NAME_MIN || length > GUEST_NAME_MAX || /[<>&{}[\]\\/|@#$%^*=+~`;:_]/.test(name) ? "invalid_name" : "ok";
}
// Remembering the name is a per-device convenience only; never required.
export function readGuestName(storage) {
  try { return cleanGuestName(storage?.getItem(GUEST_NAME_STORAGE_KEY)).slice(0, GUEST_NAME_MAX); } catch { return ""; }
}
export function saveGuestName(storage, name) {
  try { const clean = cleanGuestName(name); if (clean) storage?.setItem(GUEST_NAME_STORAGE_KEY, clean); else storage?.removeItem(GUEST_NAME_STORAGE_KEY); } catch { /* storage unavailable */ }
}
// A guest may only comment on an existing message; the server enforces it too.
export async function publishGuestCommunityMessage({ body, parentId = null, website = "", name = "" }, client = supabase) {
  if (!parentId) throw Object.assign(new Error("reply_only"), { code: "reply_only" });
  const guestName = cleanGuestName(name);
  const { data, error } = await client.rpc("add_guest_community_message", { p_body: body, p_parent_id: parentId, p_website: website || null, ...(guestName ? { p_name: guestName } : {}) });
  if (error) throw error;
  return data;
}
// Administrator-only; the server returns an empty list to everyone else.
export async function fetchGuestUnreviewed(client = supabase) {
  const { data, error } = await client.rpc("community_guest_unreviewed", { p_ids: null });
  if (error) throw error;
  return Array.isArray(data) ? data.map(item => typeof item === "string" ? item : Object.values(item || {})[0]).filter(Boolean) : [];
}
export async function reviewGuestMessage(id, action, client = supabase) {
  const { error } = await client.rpc("community_guest_review", { p_id: id, p_action: action });
  if (error) throw error;
}
