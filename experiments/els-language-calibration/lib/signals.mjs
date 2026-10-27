// EXP-14: separate signals over the uncapped candidate pool of one window. No signal receives a target, a cipher or a skip; none uses plain-text attestation.
//   G  axis relation (letters not used)
//   H  Hebrew-likeness: a character trigram model trained on the text itself, calibrated per length against the null windows (no lexicon)
//   W  the product's whole reading, ordered by nearness
//   M  mirror pair around the axis column (pair value = H of both members)
//   K  context by components (terms supplied by the caller)
// Every list is a ranking of all candidates that have a score for that signal; nothing is removed by a threshold. Definitions: PREREGISTERED-EXP14.md.
import { overlapKey, rankFindings } from "./ranking.mjs";

const cellKey = (row, col) => row * 1_000_000 + col;

/** FNV-1a, 32 bit, scaled to [0, 1): the fixed pseudo-random tie-break. */
export function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash / 4294967296;
}

/** dist (smallest Chebyshev distance of a cell of the run to a cell of the axis) and hash for every candidate. */
export function addGeometry(candidates, axisCells) {
  for (const candidate of candidates) {
    let dist = Infinity;
    for (const [r, c] of candidate.cells) for (const [ar, ac] of axisCells) dist = Math.min(dist, Math.max(Math.abs(r - ar), Math.abs(c - ac)));
    candidate.dist = dist;
    const [r0, c0] = candidate.cells[0];
    candidate.hash = fnv1a(`${candidate.line}|${r0}|${c0}|${candidate.len}|${candidate.reverse ? 1 : 0}`);
  }
  return candidates;
}

/** Character trigram model of a text (continuous letters, no boundaries): the raw score of a surface is the mean log2 probability per letter. */
export function trainTrigram(text, { limit = text.length } = {}) {
  const index = new Map();
  const n = Math.min(limit, text.length);
  for (let i = 0; i < n; i += 1) if (!index.has(text[i])) index.set(text[i], index.size);
  const A = index.size;
  const c1 = new Float64Array(A);
  const c2 = new Float64Array(A * A);
  const c3 = new Float64Array(A * A * A);
  let a = -1;
  let b = -1;
  for (let i = 0; i < n; i += 1) {
    const x = index.get(text[i]);
    c1[x] += 1;
    if (b >= 0) c2[b * A + x] += 1;
    if (a >= 0) c3[(a * A + b) * A + x] += 1;
    a = b;
    b = x;
  }
  const p1 = (x) => c1[x] / n;
  const p2 = (b2, x) => 0.9 * (c1[b2] > 0 ? c2[b2 * A + x] / c1[b2] : 0) + 0.1 * p1(x);
  const p3 = (a2, b2, x) => 0.6 * (c2[a2 * A + b2] > 0 ? c3[(a2 * A + b2) * A + x] / c2[a2 * A + b2] : 0) + 0.3 * (c1[b2] > 0 ? c2[b2 * A + x] / c1[b2] : 0) + 0.1 * p1(x);
  const score = (surface) => {
    let total = 0;
    let prev2 = -1;
    let prev1 = -1;
    let count = 0;
    for (const char of surface) {
      const x = index.get(char);
      if (x === undefined) return -Infinity;
      const p = prev1 < 0 ? p1(x) : prev2 < 0 ? p2(prev1, x) : p3(prev2, prev1, x);
      total += p > 0 ? Math.log2(p) : -40;
      prev2 = prev1;
      prev1 = x;
      count += 1;
    }
    return count ? total / count : -Infinity;
  };
  return Object.freeze({ letters: A, n, score });
}

/** Raw Hebrew-likeness score on every candidate. */
export function addRawScores(candidates, model) {
  for (const candidate of candidates) candidate.hRaw = model.score(candidate.surface);
  return candidates;
}

/** Null table from per-length raw scores: sorted ascending. `buckets` maps a length to an array of raw scores. */
export function tableFromBuckets(buckets) {
  const table = {};
  for (const [len, values] of buckets) { const sorted = Float64Array.from(values); sorted.sort(); table[len] = sorted; }
  return table;
}

/** Null table from candidate lists (the sorted raw scores of the candidates of the null windows, per length). */
export function nullTable(candidateLists) {
  const buckets = new Map();
  for (const list of candidateLists) for (const c of list) { let bucket = buckets.get(c.len); if (!bucket) { bucket = []; buckets.set(c.len, bucket); } bucket.push(c.hRaw); }
  return tableFromBuckets(buckets);
}

/** H(c) = -log10((n_ge + 1) / (n + 1)) against the null candidates of the same length. */
export function addCalibrated(candidates, table) {
  for (const candidate of candidates) {
    const sorted = table[candidate.len];
    if (!sorted) { candidate.H = 0; continue; }
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < candidate.hRaw) lo = mid + 1; else hi = mid; }
    candidate.H = -Math.log10((sorted.length - lo + 1) / (sorted.length + 1));
  }
  return candidates;
}

/** Mirror partner of every run: its cells reflected about the axis column, in the same order. `M` = H + H(partner); undefined without a partner. */
export function addMirror(candidates, axisColumn) {
  const byCells = new Map();
  for (const c of candidates) byCells.set(c.cells.map(([r, col]) => cellKey(r, col)).join(","), c);
  for (const c of candidates) {
    c.M = undefined;
    if (c.cells.every(([, col]) => col === axisColumn)) continue;
    const partner = byCells.get(c.cells.map(([r, col]) => cellKey(r, 2 * axisColumn - col)).join(","));
    if (partner && partner !== c) c.M = c.H + partner.H;
  }
  return candidates;
}

/** The product's whole reading (no tiling): `whole` and `lexConf`. `readInfo` is a reader made by lib/reading.mjs in mode "whole". */
export function addWhole(candidates, readInfo) {
  for (const c of candidates) { const info = readInfo(c.surface); c.whole = info.readScore === 1; c.lexConf = info.lexConf; }
  return candidates;
}

/** Longest context term contained in the surface (0 if none). Terms are folded by the caller. */
export function addContext(candidates, terms) {
  const list = [...terms].filter((term) => [...term].length >= 2);
  for (const c of candidates) { let best = 0; for (const term of list) if (term.length > best && c.surface.includes(term)) best = term.length; c.ctx = best; }
  return candidates;
}

/** The ranker objects, in the shape rankFindings accepts. The last element of every tuple is the fixed hash. */
export const SIGNAL_RANKERS = Object.freeze({
  G: { eligible: () => true, tuple: (c) => [-c.dist, c.len, c.hash] },
  H: { eligible: () => true, tuple: (c) => [c.H, c.hash] },
  W: { eligible: (c) => c.whole === true, tuple: (c) => [-c.dist, c.len, c.lexConf, c.hash] },
  M: { eligible: (c) => c.M !== undefined, tuple: (c) => [c.M, c.hash] },
  K: { eligible: (c) => c.ctx > 0, tuple: (c) => [c.ctx, -c.dist, -c.len, c.hash] },
});

/** Strength of a finding: its tuple without the hash. */
export const strengthOf = (finding) => finding.tuple.slice(0, -1);

export function buildLists(candidates, { withContext }) {
  const lists = {};
  for (const name of ["G", "H", "W", "M", ...(withContext ? ["K"] : [])]) lists[name] = rankFindings(candidates, SIGNAL_RANKERS[name], {});
  return lists;
}

/** Combined list: the context block first (all K findings, up to `cap`), then a round-robin of the top `per` findings of G, H, W, M; overlapping findings are skipped. */
export function unionWithContext(lists, { per = 25, cap = 50 } = {}) {
  const taken = new Set();
  const out = [];
  const take = (tier, item) => {
    const keys = overlapKey(item.candidate);
    if (keys.some((key) => taken.has(key))) return false;
    for (const key of keys) taken.add(key);
    out.push({ tier, ...item });
    return true;
  };
  let block = 0;
  for (const item of lists.K ?? []) { if (block >= cap) break; if (take("K", item)) block += 1; }
  for (let i = 0; i < per; i += 1) for (const tier of ["G", "H", "W", "M"]) { const item = lists[tier]?.[i]; if (item) take(tier, item); }
  return out;
}

/** Where a target sits in a list of findings: first finding that overlaps it, first that contains it, first that is exactly it. */
export function locate(findings, placements) {
  const wanted = placements.map((p) => ({ keys: overlapKey(p), set: new Set(overlapKey(p)) }));
  let overlap = null;
  let contained = null;
  let exact = null;
  for (let i = 0; i < findings.length; i += 1) {
    const keys = overlapKey(findings[i].candidate);
    const set = new Set(keys);
    for (const w of wanted) {
      if (overlap === null && keys.some((key) => w.set.has(key))) overlap = i + 1;
      if (contained === null && w.keys.every((key) => set.has(key))) contained = i + 1;
      if (exact === null && w.keys.length === keys.length && w.keys.every((key) => set.has(key))) exact = i + 1;
    }
    if (overlap !== null && contained !== null && exact !== null) break;
  }
  return { overlap, contained, exact };
}

/** Null statistics for a target strength. `nullStrengths` holds, per null window, the strengths (tuples without the hash) of its findings, strongest first:
 *  blind share = share of null windows holding a finding at least this strong; null noise = median number of stronger findings in a null window. */
export function nullComparison(nullStrengths, strength) {
  const cmp = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
  const counts = nullStrengths.map((list) => { let n = 0; for (const s of list) { if (cmp(s, strength) > 0) n += 1; else break; } return n; });
  const atLeast = nullStrengths.filter((list) => list.length && cmp(list[0], strength) >= 0).length;
  const sorted = counts.slice().sort((a, b) => a - b);
  return { blindShare: Number((atLeast / nullStrengths.length).toFixed(3)), nullNoiseMedian: sorted.length ? sorted[sorted.length >> 1] : null, windows: nullStrengths.length };
}
