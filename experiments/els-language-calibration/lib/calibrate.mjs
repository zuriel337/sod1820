// EXP-09: how unusual is what the product's language reader returns for a verified axis, compared with the same reader on windows of the same
// shape at other places of the text? The reader is the product's own (product-reader.mjs); this module only chooses the windows and reads numbers
// off the reader's returned (already capped) output.

const int = (value, min, max, name) => {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer in [${min}, ${max}]`);
  return value;
};
const length = (item) => [...String(item?.exactLetters || "")].length;
const max = (values) => values.reduce((best, value) => (value > best ? value : best), 0);

/** The axis object the reader expects, from an engine occurrence (start, skip, dir, number of letters). */
export function axisOf({ start, skip, dir, length: letters }) {
  int(start, 0, 5_000_000, "start"); int(skip, 2, 1_000_000, "skip"); int(letters, 2, 40, "length");
  if (![-1, 1].includes(dir)) throw new RangeError("dir must be -1 or 1");
  return { start, skip: dir * skip, dir, positions: Array.from({ length: letters }, (_, i) => start + dir * skip * i) };
}

/** Numbers read off one inspection exactly as the product returns it (readings, splits and relations are capped by the product itself). */
export function metricsOf(inspection) {
  const { readings = [], segmentations = [], relations = [], boundaries = [], coverage = {} } = inspection;
  return Object.freeze({
    lexiconLookups: Number(coverage.lexiconLookups || 0),
    candidatesExamined: Number(coverage.candidatesExamined || 0),
    readings: readings.length,
    readingMaxLen: max(readings.map(length)),
    reading5plus: readings.filter((item) => length(item) >= 5).length,
    segmentations: segmentations.length,
    segmentationMaxLen: max(segmentations.map(length)),
    segmentationsLong: segmentations.filter((item) => length(item) >= 7).length,
    relations: relations.length,
    relationBestScore: max(relations.map((item) => Number(item.candidateScore || 0))),
    relationBestExact: max(relations.map((item) => Number(item.exactMatches || 0))),
    boundaries: boundaries.length,
    boundaryBestScore: max(boundaries.map((item) => Number(item.profileScore || 0))),
  });
}

export const PRIMARY_METRIC = "relationBestScore"; // fixed before the run (PREREGISTERED.md): the ranking that decides which relation the product recommends
export const SECONDARY_METRICS = Object.freeze(["reading5plus", "segmentationsLong"]);

/**
 * Deterministic windows of the real shape: the axis is moved so that its first letter lands on (m * 104729) mod (stream - span); a move is kept only
 * when the product's box has the same number of rows and columns, so the real and shifted windows hold the same number of cells.
 */
export function shiftedAxes({ axis, box, boxOf, streamLetters, count, multiplier = 104729, maxAttempts = 20000 }) {
  int(count, 5, 500, "count");
  const span = Math.abs(axis.positions.at(-1) - axis.positions[0]);
  const lowest = axis.dir === 1 ? 0 : span;
  const room = streamLetters - span;
  const out = [];
  for (let m = 1; m <= maxAttempts && out.length < count; m += 1) {
    const first = lowest + ((m * multiplier) % room);
    const delta = first - axis.positions[0];
    const moved = { ...axis, start: axis.start + delta, positions: axis.positions.map((position) => position + delta) };
    if (moved.positions.some((position) => position < 0 || position >= streamLetters)) continue;
    const movedBox = boxOf(moved);
    if (!movedBox || movedBox.r1 - movedBox.r0 !== box.r1 - box.r0 || movedBox.c1 - movedBox.c0 !== box.c1 - box.c0) continue;
    out.push({ axis: moved, box: movedBox, m });
  }
  if (out.length < count) throw new Error(`only ${out.length} of ${count} windows of the same shape were found`);
  return out;
}

/** Upper-tail comparison of the real value with the shifted ones, per metric. */
export function compare({ real, shifted }) {
  const result = {};
  for (const key of Object.keys(real)) {
    const values = shifted.map((entry) => entry[key]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const ge = values.filter((value) => value >= real[key]).length;
    result[key] = Object.freeze({
      real: real[key], nullMean: Number(mean.toFixed(3)), nullMax: Math.max(...values), nullMin: Math.min(...values),
      saturated: new Set(values).size === 1 && values[0] === real[key], p: Number(((1 + ge) / (values.length + 1)).toFixed(4)),
    });
  }
  return Object.freeze(result);
}
