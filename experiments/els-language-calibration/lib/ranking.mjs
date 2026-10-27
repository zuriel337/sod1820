// EXP-11: an uncapped candidate pool for one window, features that do not depend on any word, and fixed rankers. The product's reader (unmodified) reads
// every surface; this module only enumerates straight runs, measures geometry against the axis and orders the results.

export const LINES = Object.freeze([
  { name: "down", dr: 1, dc: 0, text: false },
  { name: "down_right", dr: 1, dc: 1, text: false },
  { name: "down_left", dr: 1, dc: -1, text: false },
  { name: "across", dr: 0, dc: 1, text: true },
]);
export const MIN_LEN = 4;
export const MAX_LEN = 10;
export const TOP_K = 10;
const reverseText = (text) => [...text].reverse().join("");
const cellKey = (row, col) => row * 1_000_000 + col;
const sum = (values) => values.reduce((a, b) => a + b, 0);

/** Letter lookup for a window: undefined outside the box or beyond the end of the stream. */
export function windowLetters({ letters, box, streamLetters }) {
  return (row, col) => {
    if (row < box.r0 || row > box.r1 || col < box.c0 || col > box.c1) return undefined;
    const position = row * box.S + col;
    return position >= streamLetters ? undefined : letters[position];
  };
}

/** Every straight run of MIN_LEN..MAX_LEN letters on the four line types, in both reading directions. */
export function enumerateCandidates({ letterAt, box, minLen = MIN_LEN, maxLen = MAX_LEN }) {
  const out = [];
  for (const line of LINES) {
    for (let row = box.r0; row <= box.r1; row += 1) {
      for (let col = box.c0; col <= box.c1; col += 1) {
        let text = "";
        const cells = [];
        for (let j = 0; j < maxLen; j += 1) {
          const r = row + line.dr * j;
          const c = col + line.dc * j;
          const letter = letterAt(r, c);
          if (letter === undefined) break;
          text += letter;
          cells.push([r, c]);
          const length = j + 1;
          if (length < minLen) continue;
          out.push({ surface: text, cells: cells.slice(), line: line.name, text: line.text, reverse: false, len: length });
          out.push({ surface: reverseText(text), cells: cells.slice().reverse(), line: line.name, text: line.text, reverse: true, len: length });
        }
      }
    }
  }
  return out;
}

/** Share of letters covered by up to `maxTokens` recognized tokens of 3+ letters (gaps allowed); exact dynamic programme. */
export function parseCoverage(surface, isRecognized, maxTokens = 3, minToken = 3) {
  const n = [...surface].length;
  const chars = [...surface];
  const NEG = -1;
  const dp = Array.from({ length: n + 1 }, () => new Array(maxTokens + 1).fill(NEG));
  dp[0][0] = 0;
  for (let i = 1; i <= n; i += 1) {
    for (let k = 0; k <= maxTokens; k += 1) {
      if (dp[i - 1][k] > dp[i][k]) dp[i][k] = dp[i - 1][k];
      if (k === 0) continue;
      for (let j = 0; j <= i - minToken; j += 1) {
        if (dp[j][k - 1] < 0) continue;
        if (!isRecognized(chars.slice(j, i).join(""))) continue;
        const value = dp[j][k - 1] + (i - j);
        if (value > dp[i][k]) dp[i][k] = value;
      }
    }
  }
  return Math.max(...dp[n]) / n;
}

/** Geometry of the axis in the window: its cells, the cells next to it, and its line type. */
export function axisGeometry(positions, box) {
  const cells = positions.map((position) => [Math.floor(position / box.S), position % box.S]);
  const axis = new Set(cells.map(([r, c]) => cellKey(r, c)));
  const next = new Set();
  for (const [r, c] of cells) for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) { const key = cellKey(r + dr, c + dc); if (!axis.has(key)) next.add(key); }
  let step = [1, 0];
  if (cells.length > 1) { const dr = cells[1][0] - cells[0][0]; const dc = cells[1][1] - cells[0][1]; step = dr < 0 || (dr === 0 && dc < 0) ? [-dr, -dc] : [dr, dc]; }
  const lineName = LINES.find((line) => line.dr === step[0] && line.dc === step[1])?.name ?? null;
  return { axis, next, lineName };
}

/** Adds the word-free features and the reading features (from the product's reader) to every candidate. */
export function annotate(candidates, { geometry, read }) {
  for (const candidate of candidates) {
    let cross = false;
    let adjacent = false;
    for (const [r, c] of candidate.cells) {
      const key = cellKey(r, c);
      if (geometry.axis.has(key)) cross = true;
      else if (geometry.next.has(key)) adjacent = true;
    }
    candidate.cross = cross;
    candidate.adjacent = adjacent && !cross;
    candidate.parallel = !cross && geometry.lineName === candidate.line;
    const info = read(candidate.surface);
    candidate.readScore = info.readScore;
    candidate.lexConf = info.lexConf;
    candidate.bases = info.bases;
  }
  return candidates;
}

const compareTuples = (a, b) => { for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return b[i] - a[i]; return 0; };
const stable = (a, b) => a.cells[0][0] - b.cells[0][0] || a.cells[0][1] - b.cells[0][1] || (a.line < b.line ? -1 : a.line > b.line ? 1 : 0) || (a.surface < b.surface ? -1 : a.surface > b.surface ? 1 : 0);

export const READ_BUCKETS = Object.freeze([0.75, 0.8, 0.85, 0.9, 0.95, 1]);
export const bucketOf = (readScore) => READ_BUCKETS.reduce((best, bucket) => (readScore + 1e-9 >= bucket ? bucket : best), 0);

/** Null tail table from windows with no known targets: for each length, how many candidates read at least as well as each bucket. */
export function tailTable(candidateLists) {
  const table = {};
  for (const list of candidateLists) {
    for (const c of list) {
      const row = (table[c.len] ??= { total: 0, atLeast: Object.fromEntries(READ_BUCKETS.map((b) => [b, 0])) });
      row.total += 1;
      const bucket = bucketOf(c.readScore);
      for (const b of READ_BUCKETS) if (bucket >= b) row.atLeast[b] += 1;
    }
  }
  return table;
}

/** Calibrated rarity of how well a candidate reads for its length: -log10 of the null share that reads at least as well (never zero). */
export function rarityOf(candidate, tail) {
  const row = tail[candidate.len];
  const bucket = bucketOf(candidate.readScore);
  if (!row || bucket === 0) return 0;
  return -Math.log10((row.atLeast[bucket] + 1) / (row.total + 1));
}

/** Ranker scores (fixed by PREREGISTERED-EXP11.md, amendment 2). */
export const RANKERS = Object.freeze({
  A: {
    eligible: (c) => c.readScore >= 0.75,
    tuple: (c, ctx) => [rarityOf(c, ctx.tail), c.lexConf],
  },
  B: {
    eligible: (c) => (c.cross || c.adjacent || c.parallel) && c.readScore >= 0.75,
    tuple: (c, ctx) => [c.cross ? 3 : c.adjacent ? 2 : 1, rarityOf(c, ctx.tail), c.lexConf],
  },
  C: {
    eligible: (c, ctx) => ctx.context.size > 0 && c.bases.some((base) => ctx.context.has(base)),
    tuple: (c) => [c.len, c.lexConf],
  },
});

export const overlapKey = (candidate) => candidate.cells.map(([r, c]) => `${candidate.line}:${cellKey(r, c)}`);

/** Findings in order: a candidate that shares a cell on the same line with a kept one is the same finding and is dropped. */
export function rankFindings(candidates, rankerName, ctx) {
  const ranker = typeof rankerName === "string" ? RANKERS[rankerName] : rankerName;
  const eligible = candidates.filter((c) => ranker.eligible(c, ctx)).map((c) => ({ c, tuple: ranker.tuple(c, ctx) }));
  eligible.sort((x, y) => compareTuples(x.tuple, y.tuple) || stable(x.c, y.c));
  const taken = new Set();
  const findings = [];
  for (const { c, tuple } of eligible) {
    const keys = overlapKey(c);
    if (keys.some((key) => taken.has(key))) continue;
    for (const key of keys) taken.add(key);
    findings.push({ candidate: c, tuple });
  }
  return findings;
}

/** Round-robin of the top K findings of each tier; a finding that overlaps one already taken is skipped. */
export function unionRank(lists, k = TOP_K) {
  const taken = new Set();
  const out = [];
  const tiers = Object.keys(lists);
  for (let i = 0; i < k; i += 1) {
    for (const tier of tiers) {
      const item = lists[tier][i];
      if (!item) continue;
      const keys = overlapKey(item.candidate);
      if (keys.some((key) => taken.has(key))) continue;
      for (const key of keys) taken.add(key);
      out.push({ tier, ...item });
    }
  }
  return out;
}

/** Findings that outrank a given tuple and do not overlap the target: the noise that would precede the target itself. */
export function noiseAbove(findings, placements, tuple, compare) {
  const wanted = new Set(placements.flatMap(overlapKey));
  return findings.filter((f) => !overlapKey(f.candidate).some((key) => wanted.has(key)) && compare(f.tuple, tuple) > 0).length;
}

/** Position (1-based) of the first finding that overlaps any placement of the target; null if none. */
export function positionOf(findings, placements) {
  const wanted = new Set(placements.flatMap(overlapKey));
  const index = findings.findIndex((f) => overlapKey(f.candidate).some((key) => wanted.has(key)));
  return index < 0 ? null : index + 1;
}

export function describe(candidate) {
  return { surface: candidate.surface, line: candidate.line, reverse: candidate.reverse, from: candidate.cells[0], to: candidate.cells.at(-1), len: candidate.len, cross: candidate.cross, adjacent: candidate.adjacent, parallel: candidate.parallel, readScore: Number(candidate.readScore.toFixed(2)) };
}

export { sum };
