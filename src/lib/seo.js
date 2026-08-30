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

// ── JSON-LD לדף «אור הגאולה» (/or-geula) — ItemList של VideoObject מקבצי-הווידאו של הערוץ ──
// מזין את דוח «וידאו» ב-Search Console → הסרטונים של אור הגאולה מופיעים כתוצאות-וידאו עשירות
// (thumbnail + כותרת) בגוגל. אלו **קבצי-מדיה** (channel_updates: image_url=mp4, thumb_url=תמונה),
// לא יוטיוב — לכן VideoObject עם contentUrl (הקובץ) + thumbnailUrl + uploadDate + url לסרטון הספציפי
// (/or-geula?v=id, ה-deep-link הקיים). דרישות גוגל ל-VideoObject: name · thumbnailUrl · uploadDate · contentUrl.
const OG_VIDEO_RE = /\.(mp4|mov|webm|m4v|avi|mkv)($|\?|#)/i;
export function setOrGeulaVideosJsonLd(rows = []) {
  if (typeof document === "undefined") return;
  const clean = (t) => { const s = plain(t || ""); return (s && s !== "📷 עדכון" && s !== "🎬 עדכון וידאו") ? s : ""; };
  const vids = (rows || []).filter(r => r && r.image_url && OG_VIDEO_RE.test(r.image_url) && r.thumb_url).slice(0, 50);
  if (!vids.length) { removeJsonLd("sod-orgeula-vid-ld"); return; }
  const items = vids.map((v, i) => {
    const name = clean(v.text).slice(0, 110) || "אור הגאולה — סרטון";
    return {
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "VideoObject",
        name,
        description: clean(v.text).slice(0, 300) || name,
        thumbnailUrl: [v.thumb_url],
        uploadDate: videoUploadDate(v.created_at),
        contentUrl: v.image_url,
        url: `${SITE_URL}/or-geula?v=${v.id}`,
        inLanguage: "he-IL",
        publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: SITE_URL + "/logo.png" } },
      },
    };
  });
  setJsonLd("sod-orgeula-vid-ld", {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": SITE_URL + "/or-geula#videos",
    name: "אור הגאולה — אוסף הסרטונים והרמזים",
    numberOfItems: items.length,
    itemListElement: items,
  });
}
export function clearOrGeulaVideosJsonLd() { removeJsonLd("sod-orgeula-vid-ld"); }

// ── חילוץ ווידאו-ראשי מתוכן-פוסט ──────────────────────────────────────────────
// מחזיר {contentUrl?, embedUrl?, poster?} מתוך ה-HTML של הפוסט, או null אם אין ווידאו.
// מקורות: <source>/<video> עם .mp4 מאוחסן-עצמי · יוטיוב (embed/watch/youtu.be). poster= לתמונה.
const _POST_MP4_RE = /<(?:source|video)[^>]+src="([^"]+\.mp4[^"]*)"/i;
const _POST_MP4_BARE_RE = /(https?:\/\/[^"'\s<>]+\.mp4)/i;
const _POST_YT_RE = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;
export function extractPostVideo(post = {}) {
  const c = typeof post.content === "string" ? post.content : "";
  if (!c) return null;
  const mp4 = c.match(_POST_MP4_RE) || c.match(_POST_MP4_BARE_RE);
  const yt = c.match(_POST_YT_RE);
  const poster = (c.match(/poster="([^"]+)"/i) || [])[1] || null;
  if (!mp4 && !yt) return null;
  return {
    contentUrl: mp4 ? mp4[1] : undefined,
    embedUrl: yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}` : undefined,
    poster,
  };
}

// ── JSON-LD VideoObject לפוסט שהוא video-primary (הסרטון הוא הישות המרכזית של הדף) ──
// דרישות גוגל: name · thumbnailUrl · uploadDate · (contentUrl|embedUrl). mainEntityOfPage = ה-canonical
// של הפוסט (/<slug>) — דף-צפייה קנוני עצמאי → מתקן «הסרטון לא מופיע בדף צפייה». מסיר את ה-Article LD
// כדי למנוע סתירת-זהות Article↔Video (הישות המרכזית = הסרטון). נכשל-שקט (מחזיר false) אם אין thumbnail
// אמיתי — אז נשארים עם ה-Article (Rank, Don't Hide — לא ממציאים thumbnail).
export function setPostVideoJsonLd({ post = {}, path, description } = {}) {
  if (typeof document === "undefined") return false;
  const v = extractPostVideo(post);
  const thumb = post.image_url || (v && v.poster) || null;
  if (!v || (!v.contentUrl && !v.embedUrl) || !thumb) { removeJsonLd("sod-post-video-ld"); return false; }
  const canonical = SITE_URL + (path || "");
  const name = plain(post.title || "", 110) || SITE_NAME;
  const desc = description || cleanDescription(post.excerpt || post.content || "") || name;
  setJsonLd("sod-post-video-ld", {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": canonical + "#video",
    name,
    description: desc,
    thumbnailUrl: [thumb],
    uploadDate: videoUploadDate(post.date || post.modified),
    contentUrl: v.contentUrl || undefined,
    embedUrl: v.embedUrl || undefined,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    inLanguage: "he-IL",
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: SITE_URL + "/logo.png" } },
  });
  removeJsonLd("sod-article-ld"); // video-primary → הישות המרכזית היא הסרטון, לא מאמר
  return true;
}
export function clearPostVideoJsonLd() { removeJsonLd("sod-post-video-ld"); }

// ── JSON-LD VideoObject יחיד לדף-הצפייה של סרטון אור-הגאולה (/or-geula/video/:id) ──
// canonical עצמאי לכל סרטון (מתקן את קריסת-ה-canonical של /or-geula?v=). mainEntityOfPage = ה-watch URL.
export function setOrGeulaSingleVideoJsonLd(v, path) {
  if (typeof document === "undefined") return false;
  const clean = (t) => { const s = plain(t || ""); return (s && s !== "📷 עדכון" && s !== "🎬 עדכון וידאו") ? s : ""; };
  const thumb = v && v.thumb_url;
  if (!v || !v.image_url || !OG_VIDEO_RE.test(v.image_url) || !thumb) { removeJsonLd("sod-orgeula-one-ld"); return false; }
  const canonical = SITE_URL + (path || `/or-geula/video/${v.id}`);
  const name = clean(v.text).slice(0, 110) || "אור הגאולה — סרטון";
  setJsonLd("sod-orgeula-one-ld", {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": canonical + "#video",
    name,
    description: clean(v.text).slice(0, 300) || name,
    thumbnailUrl: [thumb],
    uploadDate: videoUploadDate(v.created_at),
    contentUrl: v.image_url,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    inLanguage: "he-IL",
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: SITE_URL + "/logo.png" } },
  });
  removeJsonLd("sod-orgeula-vid-ld"); // בדף-צפייה יחיד אין ItemList — רק ה-VideoObject הזה
  return true;
}
export function clearOrGeulaSingleVideoJsonLd() { removeJsonLd("sod-orgeula-one-ld"); }

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
