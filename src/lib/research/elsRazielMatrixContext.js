// Bounded presentation of the existing ELS matrix. This is not a Result Bundle,
// verification receipt, or an independent search: the server must replay the axis.
const FINALS = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const normalize = value => [...String(value || "")].filter(c => c >= "א" && c <= "ת").map(c => FINALS[c] || c).join("");
const integer = value => Number.isSafeInteger(value);

export function normalizeElsRazielMatrixContext(value) {
  const axis = value?.axis, matrix = value?.matrix;
  if (value?.contract !== "els_matrix_presentation_context_v1" || !axis || !matrix
      || !["torah", "tanakh"].includes(axis.scope) || normalize(axis.term) !== axis.term
      || axis.term.length < 2 || axis.term.length > 24 || !integer(axis.skip) || axis.skip < 2
      || !integer(axis.start) || axis.start < 0 || ![1, -1].includes(axis.dir)
      || axis.hitId !== `${axis.skip}_${axis.dir}_${axis.start}`
      || typeof axis.corpusId !== "string" || !/^[a-f0-9]{16,64}$/u.test(axis.corpusId)
      || !integer(matrix.width) || matrix.width !== axis.skip || !integer(matrix.rowStart) || matrix.rowStart < 0
      || !integer(matrix.colStart) || matrix.colStart < 0 || matrix.colStart >= matrix.width
      || !Array.isArray(matrix.rows) || !matrix.rows.length || matrix.rows.length > 12
      || matrix.rows.some(row => typeof row !== "string" || !row.length || row.length > 20 || /[^א-ת ]/u.test(row))) return null;
  return { contract: value.contract, axis: { term: axis.term, scope: axis.scope, corpusId: axis.corpusId,
    skip: axis.skip, dir: axis.dir, start: axis.start, hitId: axis.hitId },
    matrix: { width: matrix.width, rowStart: matrix.rowStart, colStart: matrix.colStart, rows: matrix.rows.slice() },
    trust: { axis: "client_reported_match_replay_required", matrix: "unverified_presentation", interpretation: "not_evidence" } };
}

export function buildElsRazielMatrixContext(state) {
  const axis = state?.axis, matrix = state?.matrix, geometry = state?.geometry;
  const term = normalize(state?.termRaw || state?.term);
  const dir = axis?.direction === "fwd" ? 1 : axis?.direction === "back" ? -1 : 0;
  if (state?.status !== "ok" || state?.verification?.state !== "MATCH" || !axis?.hitId
      || !["torah", "tanakh"].includes(state.scope) || term.length < 2 || term.length > 24
      || !integer(axis.skip) || axis.skip < 2 || !integer(axis.start) || axis.start < 0
      || axis.length !== term.length || !dir || !integer(matrix?.S) || matrix.S !== geometry?.S
      || !integer(matrix.r0) || !integer(matrix.c0) || !integer(matrix.cw)
      || !Array.isArray(matrix.rows) || matrix.rows.some(row => typeof row !== "string")) return null;
  if (axis.hitId !== `${axis.skip}_${dir}_${axis.start}`) return null;
  const axisRow = Math.floor(axis.start / matrix.S), axisCol = axis.start % matrix.S;
  const firstRow = Math.max(0, Math.min(matrix.rows.length - 1, axisRow - matrix.r0 - 5));
  const firstCol = Math.max(0, Math.min(matrix.cw - 1, axisCol - matrix.c0 - 8));
  if (matrix.rows.length === 0 || axisRow < matrix.r0 || axisRow >= matrix.r0 + matrix.rows.length
      || axisCol < matrix.c0 || axisCol >= matrix.c0 + matrix.cw) return null;
  const rows = matrix.rows.slice(firstRow, firstRow + 12).map(row => row.slice(firstCol, firstCol + 20));
  if (!rows.length || rows.some(row => row.length === 0 || /[^א-ת ]/u.test(row))) return null;
  return normalizeElsRazielMatrixContext({
    contract: "els_matrix_presentation_context_v1",
    axis: { term, scope: state.scope, corpusId: state.verification.corpus_id || null,
      skip: axis.skip, dir, start: axis.start, hitId: axis.hitId },
    matrix: { width: matrix.S, rowStart: matrix.r0 + firstRow, colStart: matrix.c0 + firstCol, rows },
    trust: { axis: "client_reported_match_replay_required", matrix: "unverified_presentation", interpretation: "not_evidence" },
  });
}
