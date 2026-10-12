// Presentation/replay adapter for the existing els_records identity. No inferred coordinates.
export function hasExactSavedMatrix(row) {
  return Number.isInteger(row?.start_index) && row.start_index >= 0
    && Number.isInteger(row?.skip_distance) && row.skip_distance >= 2
    && ["fwd", "back"].includes(row?.direction) && Boolean(row?.corpus_id);
}

export function savedMatrixToItem(row) {
  if (!row) return null;
  return {
    id: row.id || null, slug: row.slug || "", name: row.title || row.search_term,
    term: row.search_term, skip: Math.abs(row.skip_distance || 0), scope: row.scope || "torah",
    start: Number.isInteger(row.start_index) ? row.start_index : null,
    dir: row.direction === "back" ? -1 : row.direction === "fwd" ? 1 : null,
    corpusId: row.corpus_id || null,
    words: Array.isArray(row.positions?.findings) ? row.positions.findings : [],
    searchWindow: row.positions?.searchWindow || null, view: row.positions?.view || null,
    hideMain: !!row.positions?.hideMain,
    postUrl: row.positions?.postUrl || "", postTitle: row.positions?.postTitle || "",
    desc: row.description || "", image: row.image_url || "", author: row.author_name || "",
  };
}

export function savedMatrixMatchesAxis(row, state) {
  if (!hasExactSavedMatrix(row) || state?.verification?.state !== "MATCH") return false;
  const term = value => String(value || "").replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, c => ({ך:"כ",ם:"מ",ן:"נ",ף:"פ",ץ:"צ"}[c]));
  return term(row.search_term) === term(state.term)
    && (row.scope || "torah") === state.scope
    && state.axis?.hitId === `${row.skip_distance}_${row.direction === "back" ? -1 : 1}_${row.start_index}`;
}

export function savedMatrixWorkspaceHref(row) {
  return row?.slug ? `/els?cipher=${encodeURIComponent(row.slug)}`
    : row?.id ? `/els?record=${encodeURIComponent(row.id)}` : "/els";
}
