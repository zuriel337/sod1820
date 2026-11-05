// SITE_LINK_REGISTRY_V1 — the single verified link table (5.11.2026).
//
// Consumed by the 2029 footer (SiteFooter2029) and by Raziel's deterministic "where is X?" answers
// (razielSiteLinks.js, which also serves wa-raziel). Dependency-free (Deno edge + Vite + node:test).
// It lives apart from the navigation grammar on purpose: that module must contain no hardcoded URL.
// "world" has no spoken aliases: "איפה העולם" / "תן לי את העולם" stay pinned to the existing navigation contract.

// The single verified link table for the 2029 footer AND for Raziel's "where is X?" answers. It extends this
// closed table; it is not a second navigation owner. `availability` mirrors `publicReadingPath` of the public
// reading release (pinned by test/site-link-registry.test.mjs): open = public, building = closed notice page,
// account = needs a signed-in account, section = a place on every page (no URL of its own).
// A link is never invented: Raziel and the footer can only emit an href that appears here.
export const SITE_ORIGIN = "https://sod1820.co.il";
export const SITE_LINK_REGISTRY = Object.freeze([
  ["posts", "פוסטים", "internal", "/post", "open", "discover", ["פוסטים", "כל הפוסטים", "מאמרים", "הבלוג"]],
  ["dimension-five", "מימד חמש", "internal", "/category/מימד חמש", "open", ["מימד חמש", "מימד 5", "מימד ה5"]],
  ["or-geula", "אור הגאולה", "internal", "/community/chat", "open", ["אור הגאולה", "הצאט", "צאט", "צאט היסטורי", "הצאט ההיסטורי", "צאט הקהילה", "חדר צאט"]],
  ["electricity", "סוד החשמל", "internal", "/category/סוד החשמל", "open", ["סוד החשמל", "חשמל"]],
  ["archive", "ארכיון", "internal", "/archive", "building", ["ארכיון", "זרם המציאות", "הארכיון"]],
  ["heichal", "היכל", "internal", "/research", "building", ["היכל", "ההיכל", "סביבת המחקר", "המחקר שלי", "מחקר", "מרכז המחקר"]],
  ["world", "העולם", "internal", "/world", "open", []],
  ["number", "דף המספר", "internal", "/number", "open", ["דף מספר", "דף המספר", "עמוד המספר", "מספר", "מספרים"]],
  ["gematria", "מחשבון גימטריה", "internal", "/gematria", "open", ["גימטריה", "מחשבון", "מחשבון גימטריה", "המחשבון"]],
  ["els", "דילוגי אותיות", "internal", "/code", "building", ["דילוגי אותיות", "דילוגים", "els", "צופן", "הצופן", "הצופן התנכי", "קוד"]],
  ["profile", "האזור שלי", "internal", "/profile", "account", ["האזור שלי", "אזור אישי", "האזור האישי", "פרופיל", "הפרופיל שלי"]],
  ["notifications", "העדכונים שלי", "internal", "/profile#notifications", "account", ["העדכונים שלי", "התראות", "ההתראות שלי", "עדכונים אישיים"]],
  ["start", "כאן מתחילים", "internal", "/start", "building", ["כאן מתחילים", "מתחילים כאן", "התחלה", "להתחיל"]],
  ["community", "קהילה", "internal", "/community", "open", ["קהילה", "הקהילה", "עמוד הקהילה"]],
  ["contact", "אודות וצור קשר", "internal", "/contact", "open", ["צור קשר", "יצירת קשר", "אודות", "קשר", "דבר איתנו", "ליצור קשר"]],
  ["privacy", "מדיניות פרטיות", "internal", "/privacy", "open", ["פרטיות", "מדיניות פרטיות", "מדיניות הפרטיות", "תנאי פרטיות"]],
  ["map", "מפת האתר", "internal", "/map", "open", ["מפת האתר", "מפת המערכת", "מפה", "המפה"]],
  ["newsletter", "הרשמה לעדכונים", "section", "#site-footer-updates", "section", ["ניוזלטר", "הניוזלטר", "הרשמה לעדכונים", "עדכונים במייל", "לקבל עדכונים", "הרשמה", "דיוור"]],
  ["whatsapp", "קבוצת הוואטסאפ", "external", "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql", "open", ["וואטסאפ", "ווטסאפ", "וואצאפ", "קבוצת וואטסאפ", "קבוצת הוואטסאפ", "הקבוצה", "קבוצה", "whatsapp", "וואטסאפ קהילה"]],
  ["instagram", "אינסטגרם", "social", "https://www.instagram.com/zuriel7676?igsh=ZnJodWtxcnh1Y3dp", "open", ["אינסטגרם", "אינסטה", "instagram"]],
  ["facebook", "פייסבוק", "social", "https://www.facebook.com/sod1820", "open", ["פייסבוק", "פיסבוק", "facebook"]],
  ["tiktok", "TikTok", "social", "https://www.tiktok.com/@sod_1820", "open", ["טיקטוק", "תיקתוק", "tiktok"]],
].map(([id, label, kind, href, availability, aliases]) => Object.freeze({
  id, label, kind, href, availability, aliases: Object.freeze(aliases),
})));
export const SITE_LINK_BY_ID = Object.freeze(Object.fromEntries(SITE_LINK_REGISTRY.map((item) => [item.id, item])));
export const SITE_LINK_SOCIAL_IDS = Object.freeze(["instagram", "facebook", "tiktok"]);
// Group words that name several links at once.
export const SITE_LINK_GROUPS = Object.freeze({
  "רשתות חברתיות": SITE_LINK_SOCIAL_IDS, "רשתות": SITE_LINK_SOCIAL_IDS, "סושיאל": SITE_LINK_SOCIAL_IDS,
  "הרשתות החברתיות": SITE_LINK_SOCIAL_IDS, "הרשתות": SITE_LINK_SOCIAL_IDS,
});

// Absolute URL of a registry entry (never a Preview/dev origin). Sections have no URL.
export function siteLinkUrl(item, origin = SITE_ORIGIN) {
  if (!item || item.kind === "section") return "";
  if (item.kind === "external" || item.kind === "social") return item.href;
  return registryUrl(item.href, origin);
}
function registryUrl(href, origin) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith(".vercel.app") || host === "localhost" || host.includes("preview")) return "";
    return parsed.origin + encodeURI(href);
  } catch {
    return "";
  }
}
