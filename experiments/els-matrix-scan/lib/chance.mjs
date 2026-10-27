// Model-based chance baseline for CROSSING findings: how many dictionary words would be expected to cross the anchor if the stream's letters
// were drawn independently with the stream's own letter frequencies (an iid-letter null, declared as such). It is a SEPARATE comparison option:
// it needs no engine call (one read-only query over the letter frequencies and the dictionary) and it answers a different question from
// the tile-translation comparison of region scans.
import { baseLetters } from "./letters.mjs";

export const CHANCE_MODEL_ID = "iid_letter_frequencies_v1";
export const CHANCE_LOCAL_MODEL_ID = "iid_region_letter_frequencies_add_one_v1";

const BASE_LETTERS = [..."אבגדהוזחטיכלמנסעפצקרשת"];

/** Counts of each of the 22 base letters in a region's letter grid (the sensitivity variant of the baseline). */
export function regionLetterCounts(grid) {
  const counts = Object.fromEntries(BASE_LETTERS.map((letter) => [letter, 0]));
  for (const line of grid) for (const letter of line) if (letter in counts) counts[letter] += 1;
  return counts;
}

export function describeChanceModel() {
  return [
    "Chance baseline for crossing findings (declared null model: independent letters with the stream's own letter frequencies).",
    "1. p(x) = occurrences of letter x in the canonical stream / stream length (22 base letters; final forms are folded onto base letters).",
    "2. A dictionary word w crosses the anchor when one of its letters is the SAME stream position as one of the anchor's letters.",
    "3. For a crossing at word index i and anchor cell j (anchor letter a_j = w_i), in a fixed matrix direction, the other letters of w must match the stream letters at fixed positions: probability = product over k != i of p(w_k).",
    "4. Expected crossings of w = D x sum over i of m_i x product over k != i of p(w_k), where m_i = number of anchor cells carrying the letter w_i and D = number of crossing directions scanned (diag: 2 skips x 2 directions = 4).",
    "5. Expected total = sum over the scanned dictionary; per length likewise. Observed counts are compared with Poisson upper tails P(X >= observed | expected).",
    "6. Sensitivity: the same formula with the letter frequencies of the display region itself (add-one smoothed) — a text neighbourhood can use some letters more than the whole Torah does.",
    "7. Limits: letters in a text are not independent (local patterns exist, though at skip W the letters are far apart); dictionary words overlap and are not independent events; the anchor is one of several occurrences of the term (a post-hoc choice: every extra occurrence looked at is another comparison); the Poisson tail is a one-sided screening number, never a verdict. No significance label is produced.",
  ].join("\n");
}

/** P(X >= k) for X ~ Poisson(lambda), by the complement of the lower sum (exact for the small k and lambda used here). */
export function poissonUpperTail(k, lambda) {
  if (!Number.isInteger(k) || k < 0 || !(lambda >= 0)) throw new RangeError("k must be a non-negative integer and lambda >= 0");
  if (k === 0) return 1;
  if (lambda === 0) return 0;
  let term = Math.exp(-lambda);
  let below = term;
  for (let i = 1; i < k; i += 1) { term *= lambda / i; below += term; }
  return Math.max(0, 1 - below);
}

/** The formula of step 4 for one word (pure; the SQL computes the same thing over the whole dictionary). letterProbability: {letter: p}. */
export function expectedCrossings(word, anchorTerm, letterProbability, directionCount) {
  const letters = [...baseLetters(word)];
  const anchor = [...baseLetters(anchorTerm)];
  let total = 0;
  for (let i = 0; i < letters.length; i += 1) {
    const matches = anchor.filter((letter) => letter === letters[i]).length;
    if (!matches) continue;
    total += matches * letters.reduce((product, letter, k) => (k === i ? product : product * letterProbability[letter]), 1);
  }
  return directionCount * total;
}

/** expectation: the JSON of expectedCrossingSql. findings: crossing findings (with .length). */
export function compareToChance({ expectation, findings, local = null }) {
  const observedBy = new Map();
  for (const finding of findings) observedBy.set(finding.length, (observedBy.get(finding.length) || 0) + 1);
  const lengths = [...new Set([...Object.keys(expectation.by_length).map(Number), ...observedBy.keys()])].sort((a, b) => b - a);
  const byLength = lengths.map((len) => {
    const expected = Number(expectation.by_length[len]?.expected ?? 0);
    const observed = observedBy.get(len) || 0;
    return { len, words: Number(expectation.by_length[len]?.words ?? 0), expected, observed, upperTail: poissonUpperTail(observed, expected) };
  });
  const expectedTotal = Number(expectation.expected_total);
  return Object.freeze({
    model: CHANCE_MODEL_ID,
    expectedTotal,
    observedTotal: findings.length,
    observedOverExpected: expectedTotal > 0 ? Number((findings.length / expectedTotal).toFixed(3)) : null,
    upperTail: poissonUpperTail(findings.length, expectedTotal),
    byLength,
    perWord: expectation.per_word ?? {},
    sensitivity: local ? Object.freeze({ model: CHANCE_LOCAL_MODEL_ID, expectedTotal: Number(local.expected_total), upperTail: poissonUpperTail(findings.length, Number(local.expected_total)), byLength: Object.fromEntries(Object.entries(local.by_length).map(([len, entry]) => [len, Number(entry.expected)])) }) : null,
    method: describeChanceModel(),
  });
}
