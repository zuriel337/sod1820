// URL adapter for the existing BookSourceReader. No inferred source positions.
export function publicBookReadingLocation2029(manifest, { search = "", hash = "" } = {}) {
  const params = new URLSearchParams(search), rawPage = params.get("page"), chapterId = params.get("chapter");
  const chapter = (manifest?.chapters || []).find(item => item.id === chapterId);
  const hashPage = String(hash).match(/^#(?:page=|p|pdf:)(\d+)(?::.*)?$/i)?.[1];
  let page = 1, issue = null;
  if (rawPage != null) {
    if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1 || Number(rawPage) > manifest.pdfPages) issue = "page_unavailable";
    else page = Number(rawPage);
  } else if (chapterId != null) {
    if (!chapter) issue = "chapter_unavailable";
    else page = chapter.from;
  } else if (hashPage) {
    if (Number(hashPage) < 1 || Number(hashPage) > manifest.pdfPages) issue = "page_unavailable";
    else page = Number(hashPage);
  }
  return { page, issue, q: String(params.get("q") || "").slice(0, 120), chapterId: chapter?.id || null };
}

export function publicBookReadingHref2029(href, manifest, { page, q } = {}) {
  const url = new URL(href, "https://sod1820.co.il");
  if (page != null) {
    if (!Number.isSafeInteger(page) || page < 1 || page > manifest.pdfPages) return null;
    url.searchParams.set("page", String(page));
    const chapter = (manifest.chapters || []).find(item => page >= item.from && page <= item.to);
    if (url.searchParams.has("chapter")) {
      if (chapter) url.searchParams.set("chapter", chapter.id);
      else url.searchParams.delete("chapter");
    }
  }
  if (q != null) {
    if (q) url.searchParams.set("q", String(q).slice(0, 120));
    else url.searchParams.delete("q");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
