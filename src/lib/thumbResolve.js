// ── Thumbnail Validity Gate — resolver משותף אחד ──────────────────────────────
// כלל-ברזל: thumbnail חייב להיות **תמונה**, לעולם לא קובץ-וידאו. מזין גם את
// VideoObject.thumbnailUrl (src/lib/seo.js) וגם את video:thumbnail_loc (api/sitemap.js).
// אם אין מועמד-תמונה תקין → נפילה ל-cardThumb() (כרטיס-/api/card ממותד), לא לוידאו ולא ריק.
export const THUMB_VIDEO_RE = /\.(mp4|mov|webm|m4v|avi|mkv|m3u8|ogv|3gp)($|\?|#)/i;

// האם ה-URL הוא קובץ-וידאו (לא תקין כ-thumbnail).
export function isVideoUrl(u) {
  return !!u && THUMB_VIDEO_RE.test(String(u));
}

// המועמד הראשון שהוא URL-תמונה תקין (http(s), לא קובץ-וידאו), אחרת null.
export function pickThumb(...candidates) {
  for (const c of candidates) {
    const s = c ? String(c).trim() : "";
    if (s && /^https?:\/\//i.test(s) && !isVideoUrl(s)) return s;
  }
  return null;
}

// כרטיס-ממותד כנפילת-ביטחון (אותו /api/card שה-crawler כבר משתמש בו) — כשאין תמונת-thumbnail תקינה.
export function cardThumb(title, sub = "סוד 1820 · סרטון", sig = "sod1820") {
  const SITE = "https://sod1820.co.il";
  const w = String(title || "סוד 1820").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "סוד 1820";
  return `${SITE}/api/card?w=${encodeURIComponent(w)}&sub=${encodeURIComponent(sub)}&sig=${encodeURIComponent(sig)}`;
}

// resolveThumb: מחזיר תמיד URL-תמונה תקין — מועמד-תמונה ראשון, אחרת cardThumb. לעולם לא URL-וידאו.
export function resolveThumb(candidates, cardTitle, sub, sig) {
  return pickThumb(...(Array.isArray(candidates) ? candidates : [candidates])) || cardThumb(cardTitle, sub, sig);
}
