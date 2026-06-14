// ניהול SEO צד-לקוח ל-SPA: כותרת, תיאור, canonical, Open Graph ו-Twitter.
// ה-SPA מוגש כ-index.html יחיד, ולכן כל דף מעדכן את התגיות בעצמו בעת טעינה.

// כתובת האתר הקנונית (דומיין המותג). לשנות כאן אם הדומיין משתנה.
export const SITE_URL = "https://sod1820.co.il";
export const SITE_NAME = "SOD1820";
export const DEFAULT_DESC =
  "כי לה' המלוכה · SOD1820 — גימטריה, דילוגי אותיות (ELS) ותיעוד אירועים בשפת המספרים.";
export const DEFAULT_IMAGE = SITE_URL + "/favicon.svg";

function upsertMeta(attr, key, content) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * מעדכן את כל תגיות ה-SEO של הדף הנוכחי.
 * @param {object} o
 * @param {string} o.title         כותרת הדף (ללא שם האתר; יתווסף אוטומטית)
 * @param {string} [o.description] תיאור מטא
 * @param {string} [o.path]        נתיב canonical (למשל "/post"); ברירת מחדל: location.pathname
 * @param {string} [o.image]       תמונת שיתוף (URL מלא)
 * @param {string} [o.type]        og:type ("website" / "article")
 * @param {boolean} [o.noindex]    האם לחסום אינדוקס (דפי ניהול)
 */
export function applySeo(o = {}) {
  if (typeof document === "undefined") return;
  const description = o.description || DEFAULT_DESC;
  const title = o.title ? `${o.title} · ${SITE_NAME}` : `${SITE_NAME}`;
  const path = o.path != null ? o.path : window.location.pathname;
  const canonical = SITE_URL + (path === "/" ? "" : path);
  const image = o.image || DEFAULT_IMAGE;
  const type = o.type || "website";

  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", o.noindex ? "noindex, nofollow" : "index, follow");
  upsertLink("canonical", canonical);

  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:locale", "he_IL");
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:image", image);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);
}
