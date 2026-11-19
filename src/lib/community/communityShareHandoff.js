import { communityReadingPrincipal } from "./communityReadingPosition.js";
import { loadCommunityDraft, saveCommunityDraft } from "./communityDraft.js";
import { plainMessageText } from "./messageFormatting.js";

// «שתפו בקהילה» (canonical_ui_components_law v8 §§1–7, v13 §2; ZURIEL 19.11.2026). No new composer, URL, query string or table: the share
// window writes the source link into the person's EXISTING community draft (communityDraft.js, their own device, expiring) and opens the
// existing composer, which restores the draft and shows the link as the source card (CommunityMessageContent). The person's own words
// stay required (communityShareOwnWords below). An existing draft is kept: the link is added at its end, never replacing their text.

const SITE_HOSTS = new Set(["sod1820.co.il", "www.sod1820.co.il", "sod1820.vercel.app"]);
const URL_IN_TEXT = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

export function communityShareDraft({ auth, href, storage = typeof window === "undefined" ? null : safeLocalStorage(), now = Date.now() }) {
  if (!href) return { ok: false, message: "אין קישור ציבורי לשיתוף מהעמוד הזה." };
  if (auth?.loading) return { ok: false, message: "בודקים את החשבון… נסו שוב בעוד רגע." };
  const principal = communityReadingPrincipal(auth || {});
  if (!principal) return { ok: false, message: "אפשר לשתף בקהילה אחרי אימות החשבון." };
  const current = loadCommunityDraft(storage, principal, now);
  if (!current.available) return { ok: false, message: "לא ניתן לשמור טיוטה במכשיר הזה. אפשר להעתיק את הקישור ולהדביק בקהילה." };
  const before = current.value?.body || "";
  if (before.includes(href)) return { ok: true, kept: true };
  const body = before.trim() ? `${before.replace(/\s+$/, "")}\n${href}` : href;
  const saved = saveCommunityDraft(storage, principal, { body, reply: null, hadAttachments: current.value?.hadAttachments === true }, now);
  return saved ? { ok: true } : { ok: false, message: "הטיוטה ארוכה מדי כדי לצרף את הקישור. קצרו אותה בקהילה ונסו שוב." };
}

/**
 * The person's own words around a link to this site (v8 §2): a message whose text is only a site link (or a link with one word or emoji)
 * cannot be published. Messages without a site link are unchanged.
 */
export function communityShareOwnWords(draft) {
  const text = plainMessageText(String(draft || ""));
  const links = text.match(URL_IN_TEXT) || [];
  if (!links.some(isSiteLink)) return true;
  const words = text.replace(URL_IN_TEXT, " ").match(/[\p{L}\p{N}]{2,}/gu) || [];
  return words.length >= 2;
}

function isSiteLink(raw) {
  try { return SITE_HOSTS.has(new URL(/^www\./i.test(raw) ? `https://${raw}` : raw).hostname.toLowerCase()); } catch { return false; }
}
function safeLocalStorage() { try { return window.localStorage; } catch { return null; } }
