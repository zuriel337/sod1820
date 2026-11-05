// SITE_LINK_REGISTRY_V1 — the single, dependency-free source of truth for canonical, verified site links.
//
// Consumers: the 2029 Smart Footer (src/components/experience2029/Footer2029.jsx) and the deterministic Raziel
// navigation answers (supabase/functions/_shared/razielNavigationActions.js, shared by the site and wa-raziel).
// It EXTENDS the closed Raziel route table (number page, world) with the other verified public targets; the route
// *state* truth stays `publicReadingPath` in src/lib/publicReadingRelease2029.js. `defaultState` below is the
// state in the production public-reading artifact and is pinned to that router by test/site-link-registry.test.mjs,
// so an internal link can never be presented as open while the router closes it.
//
// No network, no database, no model, no URL from model output. Every href here was written by a person and is
// verified by test; an unknown phrase never produces a link.
//
// Dependency-free on purpose (Deno edge + Vite + node:test).

export const SITE_LINK_REGISTRY_VERSION = "site-link-registry-v1";
export const SITE_LINK_ORIGIN = "https://sod1820.co.il";

export const SITE_LINK_GROUPS = Object.freeze({
  discover: "לגלות",
  research: "לחקור",
  personal: "שלי",
  info: "מידע",
  social: "רשתות",
});

// Verified external destinations (preserved from the Legacy footer; pinned to it by test).
export const SITE_LINK_EXTERNAL = Object.freeze({
  whatsapp: "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql",
  instagram: "https://www.instagram.com/zuriel7676?igsh=ZnJodWtxcnh1Y3dp",
  facebook: "https://www.facebook.com/sod1820",
  tiktok: "https://www.tiktok.com/@sod_1820",
});

// state: "public" = open to every visitor; "closed" = under construction (never shown as an active link);
// "account" = a personal area that continues through login (Legacy `/profile` continuity);
// "service" = a working service page that is deliberately not indexed (`/updates`, router state "service-closed").
// closed.alt = the id of an open entry that still serves the visitor; message = the honest, warm reason.
const entry = (value) => Object.freeze({
  ...value,
  aliases: Object.freeze([...(value.aliases || [])]),
  legacyHrefs: Object.freeze([...(value.legacyHrefs || [value.href])]),
  ...(value.closed ? { closed: Object.freeze({ ...value.closed }) } : {}),
  ...(value.footer ? { footer: Object.freeze({ ...value.footer }) } : {}),
});

export const SITE_LINKS = Object.freeze([
  // ── לגלות ──
  entry({ id: "posts", label: "פוסטים", href: "/post", defaultState: "public", aliases: ["פוסטים", "הפוסטים", "מאמרים", "הכתבות"], footer: { group: "discover", order: 1 } }),
  entry({ id: "dimension-five", label: "מימד חמש", href: "/category/מימד חמש", defaultState: "public", aliases: ["מימד חמש", "מימד 5", "המימד החמישי"], footer: { group: "discover", order: 2 } }),
  entry({ id: "or-geula", label: "אור הגאולה", href: "/community/chat", defaultState: "public", aliases: ["אור הגאולה", "צאט", "צ׳אט", "צ'אט", "הצאט", "הצ׳אט", "הצ'אט", "צ׳אט הקהילה", "הצ׳אט הקהילתי", "שיחת הקהילה"], legacyHrefs: ["/community/chat", "/chat", "/דף-צאט-ראשי"], footer: { group: "discover", order: 3 } }),
  entry({ id: "electricity", label: "סוד החשמל", href: "/category/סוד החשמל", defaultState: "public", aliases: ["סוד החשמל"], footer: { group: "discover", order: 4 } }),
  entry({ id: "archive", label: "ארכיון", href: "/archive", defaultState: "closed", aliases: ["ארכיון", "הארכיון"],
    closed: { message: "הארכיון ההיסטורי בתהליך התאמה. הגלריות והתוכן שפורסם זמינים בנפרד.", alt: "gallery" }, footer: { group: "discover", order: 5 } }),
  // ── לחקור ──
  entry({ id: "heichal", label: "היכל", href: "/research", defaultState: "closed", aliases: ["היכל", "ההיכל", "חדר המחקר"], legacyHrefs: ["/research", "/heichal", "/היכל"],
    closed: { message: "ההיכל נמצא בבנייה ואינו פתוח לציבור עדיין. אפשר להמשיך לספרים ולמקורות.", alt: "books" }, footer: { group: "research", order: 1 } }),
  // raziel:false — owner decision: "/world" opens from Raziel only through the existing explicit "open the world" grammar,
  // never from a "where is" question, so the site-link answers do not index this entry.
  entry({ id: "world", label: "העולם", href: "/world", defaultState: "public", raziel: false, aliases: ["עולם", "העולם"], footer: { group: "research", order: 2 } }),
  entry({ id: "number", label: "דף המספר", href: "/number", defaultState: "public", aliases: ["דף המספר", "עמוד המספר", "חיפוש מספר", "מספר או ביטוי", "חיפוש מספרים"], footer: { group: "research", order: 4 } }),
  entry({ id: "els", label: "דילוגי אותיות", href: "/code", defaultState: "closed", aliases: ["דילוגי אותיות", "דילוגים", "הצופן התנכי", "הצופן התנ״כי", "הצופן", "els"], legacyHrefs: ["/code", "/els", "/lab/els"],
    closed: { message: "כלי הצופן החדש נמצא בבנייה. הצפנים שפורסמו נשארים זמינים בספרייה.", alt: "codes" }, footer: { group: "research", order: 5 } }),
  // בית המדרש (ZURIEL 5.11.2026): a first-class destination in the menu and footer. Open to the public (ZURIEL 5.11.2026); its
  // true state still follows the router (`publicReadingPath`), and it is never shown as an active link if the router closes it.
  entry({ id: "beit-midrash", label: "בית המדרש", href: "/beit-midrash", defaultState: "public", aliases: ["בית מדרש", "בית המדרש", "הבית מדרש", "הבית מדרש של האתר", "בית המדרש של האתר"],
    legacyHrefs: ["/beit-midrash", "/בית-מדרש"],
    closed: { message: "בית המדרש נמצא בתהליך התאמה למערכת החדשה. הספרים והמקורות הציבוריים זמינים בינתיים.", alt: "books" }, footer: { group: "research", order: 6 } }),
  // ── שלי ──
  entry({ id: "profile", label: "האזור שלי", href: "/profile", defaultState: "account", aliases: ["האזור שלי", "אזור אישי", "האזור האישי", "הפרופיל שלי", "פרופיל"], footer: { group: "personal", order: 1 } }),
  entry({ id: "my-research", label: "המחקר שלי", href: "/research", defaultState: "closed", aliases: ["המחקר שלי"],
    closed: { message: "המחקר האישי נמצא בבנייה. אפשר להמשיך למחשבון הגימטריה.", alt: "gematria" }, footer: { group: "personal", order: 2 } }),
  entry({ id: "notifications", label: "העדכונים שלי", href: "/profile#notifications", defaultState: "account", aliases: ["העדכונים שלי", "ההתראות שלי", "התראות"], footer: { group: "personal", order: 3 } }),
  // ── מידע ──
  entry({ id: "start", label: "כאן מתחילים", href: "/start", defaultState: "closed", aliases: ["כאן מתחילים", "מתחילים כאן", "איפה מתחילים"],
    closed: { message: "עמוד ההתחלה הישן בתהליך התאמה. מפת האתר מראה מה פתוח עכשיו.", alt: "map" }, footer: { group: "info", order: 1 } }),
  entry({ id: "community", label: "קהילה", href: "/community", defaultState: "public", aliases: ["קהילה", "הקהילה", "דף הקהילה"], footer: { group: "info", order: 2 } }),
  entry({ id: "contact", label: "אודות וצור קשר", href: "/contact", defaultState: "public", aliases: ["צור קשר", "יצירת קשר", "אודות", "אודות וצור קשר", "דיווח או הצעה"], footer: { group: "info", order: 3 } }),
  entry({ id: "privacy", label: "מדיניות פרטיות", href: "/privacy", defaultState: "public", aliases: ["פרטיות", "מדיניות פרטיות", "מדיניות הפרטיות"], footer: { group: "info", order: 4 } }),
  entry({ id: "map", label: "מפת האתר", href: "/map", defaultState: "public", aliases: ["מפת האתר", "מפת המערכת", "מפה"], footer: { group: "info", order: 5 } }),
  entry({ id: "updates", label: "עדכונים במייל", href: "/updates", defaultState: "service", aliases: ["ניוזלטר", "עדכונים במייל", "עדכוני האתר", "הרשמה לעדכונים", "רשימת תפוצה", "הרשמה לניוזלטר"] }),
  // ── יעדים פתוחים שמשמשים חלופה כשיעד נעול (אינם בכותרת התחתונה) ──
  entry({ id: "books", label: "ספרים ומקורות", href: "/books", defaultState: "public", aliases: ["ספרים", "ספרים ומקורות"] }),
  entry({ id: "codes", label: "ספריית הצפנים", href: "/codes", defaultState: "public", aliases: ["ספריית צפנים", "ספריית הצפנים", "צפנים שפורסמו"] }),
  entry({ id: "gallery", label: "גלריות", href: "/gallery", defaultState: "public", aliases: ["גלריות", "הגלריות"] }),
  entry({ id: "gematria", label: "מחשבון גימטריה", href: "/gematria", defaultState: "public", aliases: ["מחשבון גימטריה", "מחשבון", "גימטריה"], footer: { group: "research", order: 3 } }),
  // ── רשתות חיצוניות (קישורים מאומתים, נשמרו מהאתר הישן) ──
  entry({ id: "whatsapp", label: "קבוצת הוואטסאפ", href: SITE_LINK_EXTERNAL.whatsapp, external: true, glyph: "💬", defaultState: "public",
    aliases: ["וואטסאפ", "ווטסאפ", "וואצאפ", "ווצאפ", "וואטסאפ של האתר", "קבוצת הוואטסאפ", "קבוצת וואטסאפ", "קבוצת ווצאפ", "קבוצת הווצאפ", "קבוצת הוואצאפ", "קבוצת הווטסאפ", "whatsapp"], tracking: "whatsapp-join", footer: { group: "social", order: 1 } }),
  entry({ id: "instagram", label: "אינסטגרם", href: SITE_LINK_EXTERNAL.instagram, external: true, glyph: "◎", defaultState: "public", aliases: ["אינסטגרם", "אינסטה", "instagram"], footer: { group: "social", order: 2 } }),
  entry({ id: "facebook", label: "פייסבוק", href: SITE_LINK_EXTERNAL.facebook, external: true, glyph: "f", defaultState: "public", aliases: ["פייסבוק", "פיסבוק", "facebook"], footer: { group: "social", order: 3 } }),
  entry({ id: "tiktok", label: "TikTok", href: SITE_LINK_EXTERNAL.tiktok, external: true, glyph: "♪", defaultState: "public", aliases: ["טיקטוק", "טיק טוק", "tiktok"], footer: { group: "social", order: 4 } }),
]);

const BY_ID = new Map(SITE_LINKS.map((item) => [item.id, item]));
const INTERNAL_HREFS = new Set(SITE_LINKS.filter((item) => !item.external).map((item) => item.href));
const EXTERNAL_HREFS = new Set(SITE_LINKS.filter((item) => item.external).map((item) => item.href));

export function siteLinkById(id) {
  return BY_ID.get(String(id)) || null;
}

// First registry entry for an exact href (the Heichal/"my research" pair share /research; the first one wins).
export function siteLinkByHref(href) {
  return typeof href === "string" ? SITE_LINKS.find((item) => item.href === href) || null : null;
}

export function isRegistrySiteHref(href) {
  return typeof href === "string" && (INTERNAL_HREFS.has(href) || EXTERNAL_HREFS.has(href));
}

export function isRegistryExternalHref(href) {
  return typeof href === "string" && EXTERNAL_HREFS.has(href);
}

// The footer groups, in display order, straight from the registry (never a second list).
export function siteLinksForFooterGroup(group) {
  return SITE_LINKS
    .filter((item) => item.footer?.group === group)
    .sort((a, b) => a.footer.order - b.footer.order);
}

// Same-site absolute https link for chat transports. External links are returned as written.
export function siteLinkAbsoluteUrl(item, origin = SITE_LINK_ORIGIN) {
  if (!item) return "";
  if (item.external) return EXTERNAL_HREFS.has(item.href) ? item.href : "";
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith(".vercel.app") || host === "localhost" || host.includes("preview")) return "";
    return parsed.origin + item.href;
  } catch {
    return "";
  }
}

// Phrase normalisation shared by alias lookups: no niqqud, no apostrophes/geresh/gershayim (the navigation
// grammar drops them too), one space, lower case.
export function normalizeSiteLinkPhrase(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/[֑-ׇ]/g, "")
    .replace(/[׳״'"`’‘“”´]/g, "")
    .replace(/[?!.,;:()\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const ALIAS_INDEX = (() => {
  const index = new Map();
  for (const item of SITE_LINKS) {
    if (item.raziel === false) continue;
    for (const alias of [item.label, ...item.aliases]) {
      const key = normalizeSiteLinkPhrase(alias);
      if (key && !index.has(key)) index.set(key, item.id);
    }
  }
  return index;
})();

// Whole-phrase lookup, optionally forgiving one leading definite-article/preposition ("ה", "ל", "ב", "מ", "את ", "אל ").
export function findSiteLinkByPhrase(phrase) {
  const key = normalizeSiteLinkPhrase(phrase);
  if (!key) return null;
  // key, then without "את "/"אל ", then without one more leading ה/ל/ב/מ (so "את הפרטיות" and "לוואטסאפ" both resolve).
  const withoutParticle = key.replace(/^(?:את |אל )/u, "");
  const withoutPrefix = withoutParticle.replace(/^(?:ל|ב|מ|ה)/u, "");
  for (const candidate of [key, withoutParticle, withoutPrefix]) {
    const id = candidate ? ALIAS_INDEX.get(candidate) : null;
    if (id) return BY_ID.get(id);
  }
  return null;
}
