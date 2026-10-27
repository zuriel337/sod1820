// Merges the outputs of several windowed statements (queries.windowedOccurrencesSql) into one statement about a skip range.
// Coverage is CHECKED, not assumed: the ranges must be contiguous from skipMin to skipMax, every window must have a status, and none may be incomplete.

const parseRange = (range) => {
  const match = /^(\d+)-(\d+)$/.exec(String(range));
  if (!match) throw new TypeError(`range must look like "lo-hi", got ${JSON.stringify(range)}`);
  return [Number(match[1]), Number(match[2])];
};

export function summarizeWindowedSearch({ term, skipMin, skipMax, parts }) {
  if (!Array.isArray(parts) || !parts.length) throw new RangeError("at least one part is required");
  const ranges = parts.map((part) => ({ part, range: parseRange(part.range) })).sort((a, b) => a.range[0] - b.range[0]);
  const gaps = [];
  let expectedLo = skipMin;
  for (const { range: [lo, hi] } of ranges) {
    if (lo > expectedLo) gaps.push([expectedLo, lo - 1]);
    if (lo < expectedLo) gaps.push(["overlap", lo, expectedLo - 1]);
    expectedLo = Math.max(expectedLo, hi + 1);
  }
  if (expectedLo <= skipMax) gaps.push([expectedLo, skipMax]);
  const statuses = {};
  let windows = 0;
  for (const { part } of ranges) {
    windows += Number(part.windows);
    for (const [status, count] of Object.entries(part.statuses || {})) statuses[status] = (statuses[status] || 0) + Number(count);
  }
  const incomplete = ranges.flatMap(({ part }) => part.incomplete || []);
  const hits = ranges.flatMap(({ part }) => (part.hits || []).map((hit) => ({ skip: Number(hit.skip), dir: Number(hit.dir), start: Number(hit.start), end: Number(hit.end) })));
  const statusTotal = Object.values(statuses).reduce((sum, count) => sum + count, 0);
  return Object.freeze({
    term, skipMin, skipMax, parts: ranges.length, windows, statuses, hits, incomplete, gaps,
    complete: gaps.length === 0 && incomplete.length === 0 && statusTotal === windows,
    dbMs: ranges.reduce((sum, { part }) => sum + Number(part.db_ms || 0), 0),
  });
}
