// ניהול SEO צד-לקוח ל-SPA: כותרת, תיאור, canonical, Open Graph ו-Twitter.
// ה-SPA מוגש כ-index.html יחיד, ולכן כל דף מעדכן את התגיות בעצמו בעת טעינה.

// כתובת האתר הקנונית (דומיין המותג). לשנות כאן אם הדומיין משתנה.
export const SITE_URL = "https://sod1820.co.il";
export const SITE_NAME = "SOD1820";
export const DEFAULT_DESC =
  "אתר כי לה' המלוכה – רמזי הגאולה הגדול בעולם. 14 שנות מחקר, תוכנת דילוגי אותיות, מחשבון גימטריה, עץ המספרים, מאגר חי של צפנים, חידושי AI וכלים לקריאת המציאות בשפת המספרים.";
// תמונת ברירת מחדל לשיתוף — PNG (לא SVG: רשתות חברתיות וגוגל לא מציגות SVG).
export const DEFAULT_IMAGE = SITE_URL + "/logo.png";

// ניקוי טקסט לתיאור מטא: הסרת HTML/בוילרפלייט, קיצור לגבול מילה (~160 תווים).
export function cleanDescription(raw = "", max = 160) {
  let s = String(raw)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/^\s*מאת[:\s].{0,40}?(?=\s)/, " ")  // הסרת "מאת ..." בתחילת התוכן
    .replace(/\s+/g, " ")
    .trim();
  if (s.length <= max) return s;
  s = s.slice(0, max);
  const cut = s.lastIndexOf(" ");
  if (cut > max * 0.6) s = s.slice(0, cut);
  return s.replace(/[\s,.;:–-]+$/, "") + "…";
}

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
 * @param {string} [o.fullTitle]   כותרת מלאה לשימוש כמות שהיא (לא יתווסף שם האתר)
 * @param {string} [o.description] תיאור מטא
 * @param {string} [o.path]        נתיב canonical (למשל "/post"); ברירת מחדל: location.pathname
 * @param {string} [o.image]       תמונת שיתוף (URL מלא)
 * @param {string} [o.type]        og:type ("website" / "article")
 * @param {boolean} [o.noindex]    האם לחסום אינדוקס (דפי ניהול)
 * @param {string} [o.publishedTime] תאריך פרסום (ISO) — למאמרים
 * @param {string} [o.modifiedTime]  תאריך עדכון (ISO) — למאמרים
 * @param {string} [o.author]        שם הכותב — למאמרים
 * @param {string[]} [o.tags]        תגיות — למאמרים (article:tag)
 * @param {string} [o.section]       קטגוריה ראשית — למאמרים (article:section)
 */
export function applySeo(o = {}) {
  if (typeof document === "undefined") return;
  const description = o.description || DEFAULT_DESC;
  const title = o.fullTitle ? o.fullTitle : (o.title ? `${o.title} · ${SITE_NAME}` : `${SITE_NAME}`);
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
  upsertMeta("property", "og:image:alt", o.title || SITE_NAME);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);

  // ── מטא ייעודי למאמרים (article:*) ──
  const artKeys = ["article:published_time", "article:modified_time", "article:author", "article:section"];
  if (type === "article") {
    if (o.publishedTime) upsertMeta("property", "article:published_time", o.publishedTime);
    if (o.modifiedTime)  upsertMeta("property", "article:modified_time", o.modifiedTime);
    if (o.author)        upsertMeta("property", "article:author", o.author);
    if (o.section)       upsertMeta("property", "article:section", o.section);
    removeMeta("property", "article:tag");
    (o.tags || []).slice(0, 8).forEach(t => addMeta("property", "article:tag", t));
  } else {
    // ניקוי שאריות ממאמר קודם בניווט SPA
    artKeys.forEach(k => removeMeta("property", k));
    removeMeta("property", "article:tag");
  }

  // ── נתוני מבנה (JSON-LD) ──
  if (type === "article") {
    setJsonLd("sod-article-ld", {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: (o.title || "").slice(0, 110),
      description,
      image: [image],
      datePublished: o.publishedTime || undefined,
      dateModified: o.modifiedTime || o.publishedTime || undefined,
      author: { "@type": o.author ? "Person" : "Organization", name: o.author || SITE_NAME },
      publisher: {
        "@type": "Organization", name: SITE_NAME,
        logo: { "@type": "ImageObject", url: SITE_URL + "/logo.png" },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      inLanguage: "he-IL",
    });
  } else {
    removeJsonLd("sod-article-ld");
  }
}

// ── עוזרי מטא נוספים ──
function addMeta(attr, key, content) {
  if (typeof document === "undefined") return;
  const el = document.createElement("meta");
  el.setAttribute(attr, key);
  el.setAttribute("content", content);
  el.setAttribute("data-sod-multi", key);
  document.head.appendChild(el);
}
function removeMeta(attr, key) {
  if (typeof document === "undefined") return;
  document.head.querySelectorAll(`meta[${attr}="${key}"]`).forEach(el => el.remove());
}
function setJsonLd(id, obj) {
  if (typeof document === "undefined") return;
  const clean = JSON.parse(JSON.stringify(obj)); // מסיר undefined
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(clean);
}
function removeJsonLd(id) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.remove();
}
