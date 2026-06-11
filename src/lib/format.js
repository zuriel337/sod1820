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

export const cleanLabel = s =>
  s ? s.replace(/&quot;/g, '"').replace(/&#8211;/g, '–').replace(/&#\d+;/g, '').trim() : '';
