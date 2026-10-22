// Presentation/replay adapter for the existing els_records identity. No inferred coordinates.
export const ELS_TORAH_LETTER_COUNT = 304805;

const normalizedHebrewLength = value => String(value || "")
  .replace(/[^א-ת]/g, "")
  .replace(/[ךםןףץ]/g, c => ({ך:"כ",ם:"מ",ן:"נ",ף:"פ",ץ:"צ"}[c]))
  .length;

function savedHitCrossesScope(hitId, termLength, limit) {
  const match = /^(\d+)_(-?1)_(\d+)$/.exec(String(hitId || ""));
  if (!match || termLength < 1) return false;
  const skip = Number(match[1]);
  const direction = Number(match[2]);
  const start = Number(match[3]);
  if (!Number.isSafeInteger(skip) || skip < 1 || !Number.isSafeInteger(start) || start < 0) return false;
  const end = start + direction * skip * (termLength - 1);
  return start >= limit || end < 0 || end >= limit;
}

// Some historical records labelled "torah" contain explicit saved finding coordinates that
// continue into the rest of Tanakh. Replay the evidence in the smallest corpus that can contain
// it, while retaining the stored scope for disclosure and never mutating the database row.
export function savedMatrixReplayProfile(row) {
  const storedScope = row?.scope === "tanakh" ? "tanakh" : "torah";
  let legacyScopeRecovered = false;
  if (storedScope === "torah") {
    legacyScopeRecovered = (Array.isArray(row?.positions?.findings) ? row.positions.findings : []).some(finding => {
      const termLength = normalizedHebrewLength(finding?.t);
      const hits = [...(Array.isArray(finding?.sh) ? finding.sh : []), ...(Array.isArray(finding?.sourceShown) ? finding.sourceShown : [])];
      return hits.some(hitId => savedHitCrossesScope(hitId, termLength, ELS_TORAH_LETTER_COUNT));
    });
  }
  return {
    scope: legacyScopeRecovered ? "tanakh" : storedScope,
    storedScope,
    legacyScopeRecovered,
  };
}

export function hasExactSavedMatrix(row) {
  return Number.isInteger(row?.start_index) && row.start_index >= 0
    && Number.isInteger(row?.skip_distance) && row.skip_distance >= 2
    && ["fwd", "back"].includes(row?.direction) && Boolean(row?.corpus_id);
}

export function savedMatrixToItem(row) {
  if (!row) return null;
  const replay = savedMatrixReplayProfile(row);
  return {
    id: row.id || null, slug: row.slug || "", name: row.title || row.search_term,
    term: row.search_term, skip: Math.abs(row.skip_distance || 0), scope: replay.scope,
    storedScope: replay.storedScope, legacyScopeRecovered: replay.legacyScopeRecovered,
    start: Number.isInteger(row.start_index) ? row.start_index : null,
    dir: row.direction === "back" ? -1 : row.direction === "fwd" ? 1 : null,
    corpusId: row.corpus_id || null,
    words: Array.isArray(row.positions?.findings) ? row.positions.findings : [],
    searchWindow: row.positions?.searchWindow || null, view: row.positions?.view || null,
    savedReplayWindow: "compact-v1",
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

// A legacy row may be completed in place only from the same verified term/skip and
// the replay scope selected by the compatibility adapter. Authorization remains server-owned.
export function savedMatrixCanReanchor(row, state) {
  if (!row || hasExactSavedMatrix(row) || state?.verification?.state !== "MATCH") return false;
  const term = value => String(value || "").replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, c => ({ך:"כ",ם:"מ",ן:"נ",ף:"פ",ץ:"צ"}[c]));
  return term(row.search_term) === term(state.term)
    && savedMatrixReplayProfile(row).scope === state.scope
    && Math.abs(Number(row.skip_distance) || 0) === state.axis?.skip;
}

export function savedMatrixWorkspaceHref(row) {
  return row?.slug ? `/code?cipher=${encodeURIComponent(row.slug)}`
    : row?.id ? `/code?record=${encodeURIComponent(row.id)}` : "/code";
}
