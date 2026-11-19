import { elsOccurrenceId, elsStateAxisOccurrenceId, sameElsOccurrence } from "./research/elsOccurrenceIdentity.js";
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
    // The exact occurrence with its corpus (the engine's occurrence_id); a record without exact coordinates opens as before.
    ...(hasExactSavedMatrix(row) ? { occurrenceId: savedMatrixOccurrenceId(row) } : {}),
    words: Array.isArray(row.positions?.findings) ? row.positions.findings : [],
    searchWindow: row.positions?.searchWindow || null, view: row.positions?.view || null,
    hideMain: !!row.positions?.hideMain,
    postUrl: row.positions?.postUrl || "", postTitle: row.positions?.postTitle || "",
    desc: row.description || "", image: row.image_url || "", author: row.author_name || "",
  };
}

export function elsMatrixLoadKey(row, journey) {
  if (journey) return JSON.stringify(journey);
  return row ? JSON.stringify([row.id, row.search_term, row.skip_distance, row.scope, row.start_index, row.direction, row.corpus_id]) : null;
}

export function savedMatrixOccurrenceId(row) {
  return hasExactSavedMatrix(row) ? elsOccurrenceId({ corpusId: row.corpus_id, term: row.search_term, skip: row.skip_distance,
    dir: row.direction === "back" ? -1 : 1, start: row.start_index }) : null;
}

// The open matrix is the saved one only when it is the same exact occurrence in the same corpus (the occurrence_id).
export function savedMatrixMatchesAxis(row, state) {
  if (!hasExactSavedMatrix(row) || state?.verification?.state !== "MATCH") return false;
  return (row.scope || "torah") === state.scope && sameElsOccurrence(savedMatrixOccurrenceId(row), elsStateAxisOccurrenceId(state));
}

export function savedMatrixWorkspaceHref(row, mode) {
  const href = row?.slug ? `/code?cipher=${encodeURIComponent(row.slug)}`
    : row?.id ? `/code?record=${encodeURIComponent(row.id)}` : "/code";
  return href !== "/code" && (mode === "research" || mode === "classic") ? `${href}&mode=${mode}` : href;
}
