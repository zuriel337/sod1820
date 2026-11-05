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
};
export function guestPublishErrorMessage(error) {
  const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`;
  for (const [code, message] of Object.entries(GUEST_ERRORS)) if (text.includes(code)) return message;
  return "לא הצלחנו לפרסם את ההודעה. ההודעה נשמרה, אפשר לנסות שוב.";
}
export async function publishGuestCommunityMessage({ body, parentId = null, website = "" }, client = supabase) {
  const { data, error } = await client.rpc("add_guest_community_message", { p_body: body, p_parent_id: parentId, p_website: website || null });
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
