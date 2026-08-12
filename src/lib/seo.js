// ניהול SEO צד-לקוח ל-SPA: כותרת, תיאור, canonical, Open Graph ו-Twitter.
// ה-SPA מוגש כ-index.html יחיד, ולכן כל דף מעדכן את התגיות בעצמו בעת טעינה.

// כתובת האתר הקנונית (דומיין המותג). לשנות כאן אם הדומיין משתנה.
export const SITE_URL = "https://sod1820.co.il";
export const SITE_NAME = "SOD1820";
export const DEFAULT_DESC =
  "אתר כי לה' המלוכה – רמזי הגאולה הגדול בעולם. 14 שנות מחקר, תוכנת דילוגי אותיות, מחשבון גימטריה, עץ המספרים, מאגר חי של צפנים, גילויים ותובנות וכלים לקריאת המציאות בשפת המספרים.";
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

// ── JSON-LD לדף-ישות (מספר/ביטוי) — נעילת צוריאל #2: מתאר ישות, לא כתבה ──
// @graph: DefinedTerm (הישות עצמה) + WebPage (הדף) + BreadcrumbList (בית→מספרים→הערך).
// לא Article: מספר אינו חדשה. משתמשים בזה במקום article-ld בדף המספר.
export function setEntityJsonLd({ term, value, isNumber, path, description, image } = {}) {
  if (typeof document === "undefined") return;
  const canonical = SITE_URL + (path || "");
  const name = isNumber ? String(value) : `${term} · ${value}`;
  const desc = description || DEFAULT_DESC;
  const graph = [
    {
      "@type": "DefinedTerm",
      "@id": canonical + "#term",
      name,
      termCode: String(value),
      description: desc,
      inDefinedTermSet: { "@type": "DefinedTermSet", name: "גימטריה — סוד 1820", url: SITE_URL + "/gematria" },
      url: canonical,
    },
    {
      "@type": "WebPage",
      "@id": canonical,
      url: canonical,
      name: isNumber ? `${value} — דף המספר · ${SITE_NAME}` : `${term} · ${value} — דף הביטוי · ${SITE_NAME}`,
      description: desc,
      inLanguage: "he-IL",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
      about: { "@id": canonical + "#term" },
      primaryImageOfPage: image ? { "@type": "ImageObject", url: image } : undefined,
      breadcrumb: { "@id": canonical + "#breadcrumb" },
    },
    {
      "@type": "BreadcrumbList",
      "@id": canonical + "#breadcrumb",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "בית", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "מספרים", item: SITE_URL + "/numbers" },
        { "@type": "ListItem", position: 3, name, item: canonical },
      ],
    },
  ];
  setJsonLd("sod-entity-ld", { "@context": "https://schema.org", "@graph": graph });
  removeJsonLd("sod-article-ld"); // ודא שאין כפילות עם ה-Article הישן
}
export function clearEntityJsonLd() { removeJsonLd("sod-entity-ld"); }

// ── JSON-LD לפתיל פורום (/forum/:id) — DiscussionForumPosting ──
// זה המארקאפ שמזין את דוח «פורום דיונים» (Discussion Forum) ב-Search Console.
// הפתיל = תרומת-מחקר (research_contributions); התגובות = רשומות עם parent_id=הפתיל.
// גוגל מרנדר את ה-SPA וקורא את ה-JSON-LD הזה (הבוט-routing של הסושיאל נפרד, ב-api/og.js).
// דרישות גוגל: author + datePublished על הפוסט; author + text על כל Comment.
function plain(raw = "", max = 5000) {
  return String(raw).replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ")
    .replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
export function setForumThreadJsonLd({ thread, replies = [], path, image } = {}) {
  if (typeof document === "undefined" || !thread) return;
  const canonical = SITE_URL + (path || "");
  const person = n => ({ "@type": "Person", name: (n && String(n).trim()) || "חבר הקהילה" });
  const text = plain(thread.body || thread.title || "");
  const headline = plain(thread.title || text, 110) || "דיון מחקר";
  const when = thread.created_at || undefined;
  const comments = (replies || [])
    .filter(r => r && (r.body || r.title))
    .map(r => ({
      "@type": "Comment",
      text: plain(r.body || r.title || ""),
      datePublished: r.created_at || undefined,
      author: person(r.author_name),
    }));
  const ld = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": canonical + "#discussion",
    headline,
    articleBody: text,
    url: canonical,
    mainEntityOfPage: canonical,
    datePublished: when,
    dateModified: when,
    author: person(thread.author_name),
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: SITE_URL + "/logo.png" } },
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    inLanguage: "he-IL",
    image: image ? [image] : undefined,
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: comments.length,
    },
  };
  if (comments.length) { ld.comment = comments; ld.commentCount = comments.length; }
  setJsonLd("sod-forum-ld", ld);
  removeJsonLd("sod-article-ld"); // דיון אינו Article — מונע כפילות-סוג
}
export function clearForumJsonLd() { removeJsonLd("sod-forum-ld"); }

// 📅 uploadDate ל-VideoObject חייב להיות ISO 8601 **עם אזור-זמן** (דרישת דוח «סרטונים» ב-GSC:
//    date בלבד «YYYY-MM-DD» → אזהרות «ערך לא תקין» + «חסר אזור-זמן»). המקור אצלנו הוא תאריך-בלבד
//    (home_videos.uploaded_at = date · פוסטים = date), לכן מעגנים לחצות UTC (+00:00) — תקין,
//    יציב (לא מזיז את היום), ומספק את דרישת ה-timezone. ערך שכבר מלא-ותקין נשאר כפי-שהוא.
function videoUploadDate(raw) {
  if (!raw) return undefined;
  const s = String(raw).trim();
  const day = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!day) return undefined;                                   // ערך לא-מזוהה → משמיטים (עדיף מ«לא תקין»)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(s)) return s; // כבר תקין עם tz
  return `${day[1]}T00:00:00+00:00`;                            // date-only → חצות UTC עם offset מפורש
}

// ── JSON-LD לגלריית הסרטים (דף הבית) — ItemList של VideoObject ──
// מזין את דוח «וידאו» ב-Search Console → הסרטונים מופיעים כתוצאות-וידאו עשירות בגוגל
// (thumbnail + כותרת), כדי שמי שמחפש את הסרטונים של סוד1820 יגיע אליהם ראשון.
// דרישות גוגל ל-VideoObject: name · thumbnailUrl · uploadDate · embedUrl/contentUrl.
export function setVideoGalleryJsonLd(videos = []) {
  if (typeof document === "undefined") return;
  const list = (videos || []).filter(v => v && v.yt);
  if (!list.length) { removeJsonLd("sod-video-ld"); return; }
  const items = list.map((v, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "VideoObject",
      name: plain(v.title || "", 110) || SITE_NAME,
      description: plain(v.title || "", 300) || SITE_NAME,
      thumbnailUrl: [v.poster_url || `https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg`],
      uploadDate: videoUploadDate(v.uploaded_at),
      embedUrl: v.yt ? `https://www.youtube-nocookie.com/embed/${v.yt}` : undefined,
      contentUrl: v.video_url || (v.yt ? `https://www.youtube.com/watch?v=${v.yt}` : undefined),
      url: v.slug ? `${SITE_URL}/${v.slug}` : `https://youtu.be/${v.yt}`,
      inLanguage: "he-IL",
      publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: SITE_URL + "/logo.png" } },
    },
  }));
  setJsonLd("sod-video-ld", {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": SITE_URL + "/#video-gallery",
    name: "גלריית הסרטים — סוד 1820",
    itemListElement: items,
  });
}
export function clearVideoGalleryJsonLd() { removeJsonLd("sod-video-ld"); }

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
