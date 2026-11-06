// Pure helpers for the research-only split matrix view. The engine lens (`matrix-window`) returns letters and marks of the SAME axis
// matrix; nothing here searches, ranks or creates findings. Everything is derived from occurrences the canonical engine already verified.

export const SPLIT_LIMITS = Object.freeze({ minRows: 5, maxRows: 61, minCols: 3, maxCols: 21, maxBands: 3 });

const int = (value, fallback) => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback);
export const clampInt = (value, min, max, fallback = min) => Math.max(min, Math.min(max, int(value, fallback)));

export function splitHitLabel(hit) {
  if (!hit) return "";
  return `${hit.direction === "back" ? "↑" : "↓"} ${hit.term}`;
}

export function splitSignedSkip(hit) {
  return hit ? (hit.direction === "back" ? -hit.skip : hit.skip) : 0;
}

// One row per verified occurrence in the DOS-style table: Term / Cnt / Skip / Start.
export function splitTableRows(hits = []) {
  const counts = new Map();
  for (const hit of hits) counts.set(hit.term, (counts.get(hit.term) || 0) + 1);
  return hits.map(hit => ({ ...hit, count: counts.get(hit.term) || 1, signedSkip: splitSignedSkip(hit) }));
}

// Columns of two occurrences, as ranges in the shared matrix width. The gap is the number of columns strictly between them.
export function splitColumnGap(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.max(a.colMin, b.colMin) - Math.min(a.colMax, b.colMax) - 1);
}

export function splitRowsOverlap(a, b, slack = 0) {
  return Boolean(a && b) && a.rowMin <= b.rowMax + slack && b.rowMin <= a.rowMax + slack;
}

// A verified occurrence that shares rows with the axis but sits too far away in columns to appear in the axis band.
// Returns a single recommendation, or null. It never ranks by meaning: nearest-in-rows first, then the closest in columns.
export function splitSuggestion(hits = [], axisHitId, colCount = 5) {
  const axis = hits.find(hit => hit.hitId === axisHitId);
  if (!axis) return null;
  const reach = Math.max(colCount, 3);
  const candidates = hits
    .filter(hit => hit.hitId !== axisHitId && splitRowsOverlap(axis, hit, 2) && splitColumnGap(axis, hit) > reach)
    .map(hit => ({ hit, gap: splitColumnGap(axis, hit) }))
    .sort((a, b) => a.gap - b.gap || a.hit.hitId.localeCompare(b.hit.hitId));
  return candidates.length ? { hitId: candidates[0].hit.hitId, term: candidates[0].hit.term, gap: candidates[0].gap } : null;
}

// Rows window centred on an occurrence, kept inside the corpus.
export function splitRowStart(hit, rowCount, totalRows) {
  const count = clampInt(rowCount, SPLIT_LIMITS.minRows, SPLIT_LIMITS.maxRows, 15);
  const mid = Math.round(((hit?.rowMin ?? 0) + (hit?.rowMax ?? 0)) / 2);
  return Math.max(0, Math.min(Math.max(0, int(totalRows, count) - count), mid - Math.floor(count / 2)));
}

// Rows window for several occurrences: centred on all of them when they fit one window, otherwise on the focused (first) one.
export function splitRowStartFor(hits, rowCount, totalRows) {
  const list = (hits || []).filter(Boolean);
  if (!list.length) return 0;
  const count = clampInt(rowCount, SPLIT_LIMITS.minRows, SPLIT_LIMITS.maxRows, 15);
  const rowMin = Math.min(...list.map(hit => hit.rowMin)), rowMax = Math.max(...list.map(hit => hit.rowMax));
  return rowMax - rowMin + 1 <= count ? splitRowStart({ rowMin, rowMax }, count, totalRows) : splitRowStart(list[0], count, totalRows);
}

// Toggle one occurrence in the band list: the axis is always kept first, at most two more are shown.
export function toggleSplitBand(bands, axisHitId, hitId) {
  const current = bands.filter(id => id !== axisHitId);
  if (hitId === axisHitId) return [axisHitId, ...current].slice(0, SPLIT_LIMITS.maxBands);
  const next = current.includes(hitId) ? current.filter(id => id !== hitId) : [...current, hitId].slice(-(SPLIT_LIMITS.maxBands - 1));
  return [axisHitId, ...next];
}

export function splitWindowRequest({ axisHitId, scope, bands, rowStart, rowCount, colCount, columnStarts = {}, seq }) {
  return {
    splitSeq: seq, axisHitId, scope,
    ...(Number.isInteger(rowStart) ? { r0: rowStart } : {}),
    rowCount: clampInt(rowCount, SPLIT_LIMITS.minRows, SPLIT_LIMITS.maxRows, 15),
    colCount: clampInt(colCount, SPLIT_LIMITS.minCols, SPLIT_LIMITS.maxCols, 5),
    bands: bands.slice(0, SPLIT_LIMITS.maxBands).map(hitId => ({ hitId, ...(Number.isInteger(columnStarts[hitId]) ? { c0: columnStarts[hitId] } : {}) })),
  };
}

// A reply (data or error) belongs to the request that is still current only if axis, scope and sequence all match.
export function splitResponseMatches(response, request) {
  return Boolean(response && request && response.target?.splitSeq === request.splitSeq
    && response.target?.axisHitId === request.axisHitId && response.target?.scope === request.scope);
}

// Cell -> mark lookup for one band. The band's own occurrence is written last so it wins where occurrences cross.
export function splitMarkMap(band) {
  const map = new Map();
  const ordered = [...(band?.marks || [])].sort((a, b) => Number(a.hitId === band.hitId) - Number(b.hitId === band.hitId));
  for (const mark of ordered) for (const [r, c] of mark.cells) map.set(`${r}-${c}`, { ...mark, start: mark.start });
  return map;
}
