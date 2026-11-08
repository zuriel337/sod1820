// ===== עזרי טקסט/תאריך משותפים =====

export const toSlug = name => name.trim().replace(/\s+/g, '-');
export const fromSlug = slug => decodeURIComponent(slug).replace(/-/g, ' ');

export function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8230;/g, "…")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => { try { return String.fromCodePoint(parseInt(code, 10)); } catch { return ""; } })
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDateHe(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString("he-IL", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// תאריך לפי הלוח העברי — "כ״ח בסיוון התשפ״ו"
export function formatDateHebrewCal(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString("he-IL-u-ca-hebrew", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch {
    return "";
  }
}

export function formatDateWP(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}, ${hh}:${mi}`;
}

// "לפני X דקות/שעות/ימים/שבועות/חודשים/שנים" — זמן יחסי בעברית, תמיד יחסי («יותר יפה»,
// בקשת צוריאל 15.8.2026: בכל האתר להציג «לפני כמה זמן» במקום תאריך). בלי נפילה-לתאריך.
// למי שעדיין צריך תאריך מלא (SEO/סכמה/ארכיון) — יש formatDateHe/formatDateWP.
// Natural Hebrew counts (ZURIEL 8.11.2026): one = "לפני שעה", two = the dual ("לפני שעתיים"), three and more = "לפני 3 שעות".
// Minutes use "שתי דקות" (the dual noun form "דקתיים" is not used in speech). Never "לפני 2 ימים" / "לפני 2 שעות".
const agoUnit = (n, one, two, many) => n === 1 ? `לפני ${one}` : n === 2 ? `לפני ${two}` : `לפני ${n} ${many}`;

export function timeAgoHe(dateStr) {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return formatDateHe(dateStr);
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return "לפני רגע";
  const min = Math.floor(sec / 60);
  if (min < 60) return agoUnit(min, "דקה", "שתי דקות", "דקות");
  const hr = Math.floor(min / 60);
  if (hr < 24) return agoUnit(hr, "שעה", "שעתיים", "שעות");
  const day = Math.floor(hr / 24);
  if (day < 7) return agoUnit(day, "יום", "יומיים", "ימים");
  const week = Math.floor(day / 7);
  if (day < 30) return agoUnit(week, "שבוע", "שבועיים", "שבועות");
  const month = Math.floor(day / 30);
  if (month < 12) return agoUnit(month, "חודש", "חודשיים", "חודשים");
  // 360–364 days is month 12 (not < 12) but not yet a full 365-day year: it reads "לפני שנה", never "לפני 0 שנים".
  const year = Math.max(1, Math.floor(day / 365));
  return agoUnit(year, "שנה", "שנתיים", "שנים");
}

// 🎬 מזהה-וידאו יוטיוב מתוך טקסט חופשי (youtu.be/ID · watch?v=ID · embed/ID · shorts/ID).
// מחזיר את המזהה הראשון שנמצא, או null. משמש להטמעת נגן בפורום (עמוד-שרשור + כרטיס-פיד).
export function youtubeId(text = "") {
  if (!text) return null;
  const m = String(text).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^&\s]*&)*v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
// 🔗 ה-URL הראשון של יוטיוב בטקסט (להסרה מהטקסט לאחר הטמעת הנגן — לא להציג קישור-כפול).
export function youtubeUrl(text = "") {
  const m = String(text || "").match(/https?:\/\/(?:www\.)?(?:youtu\.be|youtube(?:-nocookie)?\.com)\/\S+/);
  return m ? m[0] : null;
}

export const cleanLabel = s =>
  s ? s.replace(/&quot;/g, '"').replace(/&#8211;/g, '–').replace(/&#\d+;/g, '').trim() : '';
