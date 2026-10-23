// scripts/claude-shadow-research-core.mjs — CLAUDE_SHADOW_RESEARCH_V1 (pure functions; no I/O, no network, no DB).
//
// EXTEND_EXISTING (see audits/claude_shadow_research_v1/EXISTING_OWNERS_MAP.md):
//   numbers        src/lib/gematria.js                                   (the only calculation path — nothing is computed here)
//   dependency     src/lib/research/pairConditionedMethodDependency.js    (Δ rule; this file adds only a vector fast path + a parity check)
//   spelling       scripts/post-knowledge-staging.mjs                     (variantKey / withinOneEdit / boundaryFlags / timeFlags)
//   multiple tests src/lib/research/els2029StatisticalControls.js         (benjaminiHochberg, createSeededPrng)
// Truly new here: Holm, the matched-control pair sampler, the expression-dependency collapse (JS twin of the DB letter/word
// multiset keys), and the report assembly. Output is a HYPOTHESIS / expert report — never a Finding, never canonical, never published.

import { createHash } from "node:crypto";
import { METHODS, DEPTH_METHODS } from "../src/lib/gematria.js";
import { VARIANT_BASE_PAIRS, independentFamilies } from "../src/lib/research/pairConditionedMethodDependency.js";
import { benjaminiHochberg, createSeededPrng } from "../src/lib/research/els2029StatisticalControls.js";
import { variantKey, withinOneEdit, boundaryFlags, timeFlags } from "./post-knowledge-staging.mjs";

export const SHADOW_VERSION = "claude-shadow-research-v1";
export const PROMPT_VERSION = "claude-shadow-research-v1/prompt-1"; // for the Claude-authored parts (hypotheses, audit notes); no model id is stored in the repo
export const TRUTH_BOUNDARY = Object.freeze({ truthPromotion: false, canonical: false, published: false, stage: "hypothesis_expert_report" });

const ENGINE_METHODS = [...METHODS, ...DEPTH_METHODS];
export const METHOD_KEYS = Object.freeze(ENGINE_METHODS.map((m) => m.key));
const FN = Object.fromEntries(ENGINE_METHODS.map((m) => [m.key, m.fn]));
const INDEX = Object.fromEntries(METHOD_KEYS.map((k, i) => [k, i]));
export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

// ── canonical engine access ───────────────────────────────────────────────────────────────────────────────────
export const engineValue = (method, phrase) => FN[method]?.(phrase);
export const methodVector = (phrase) => Int32Array.from(METHOD_KEYS, (k) => FN[k](phrase));

// ── expression fingerprints (JS twin of fn_expression_letter_multiset_key / fn_expression_word_multiset_key) ────
const FINAL_TO_BASE = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const FINALS = "ךםןףץ";
const HEB = /[א-ת]/u;
const ORDER = "אבגדהוזחטיכלמנסעפצקרשת";
const heb = (s) => [...String(s || "")].filter((c) => HEB.test(c));
export const letterKey = (phrase) => heb(phrase).map((c) => FINAL_TO_BASE[c] || c).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join("");
export const charKey = (phrase) => heb(phrase).sort().join("");
export const wordKey = (phrase) => String(phrase || "").split(" ").filter(Boolean).map((w) => heb(w).join("")).sort().join(" ");
const MATRES = new Set(["א", "ה", "ו", "י"]);
export function fingerprint(phrase) {
  const letters = heb(phrase);
  const finals = letters.filter((c) => FINALS.includes(c));
  const share = letters.length ? letters.filter((c) => MATRES.has(c)).length / letters.length : 0;
  return {
    words: String(phrase).split(" ").filter(Boolean).length,
    letters: letters.length,
    finals: finals.length,
    final_types: finals.sort().join(""),
    matres_bucket: share < 0.25 ? "low" : share < 0.4 ? "mid" : "high",
    spaceless: heb(phrase).join(""),
    letter_key: letterKey(phrase), char_key: charKey(phrase), word_key: wordKey(phrase), variant_key: variantKey(phrase),
  };
}

// ── engine-derived invariance sets (measured on the canonical engine, cross-checked with registry flags) ────────
let invariance = null;
export function engineInvariance() {
  if (invariance) return invariance;
  const prng = createSeededPrng(20261023);
  const pick = (n) => Math.floor(prng() * n);
  const alphabet = [..."אבגדהוזחטיכלמנסעפצקרשתךםןףץ"];
  const rndWord = () => Array.from({ length: 3 + pick(3) }, () => alphabet[pick(alphabet.length)]).join("");
  const shuffleChars = (w) => { const a = [...w]; for (let i = a.length - 1; i > 0; i -= 1) { const j = pick(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.join(""); };
  const stays = Object.fromEntries(METHOD_KEYS.map((k) => [k, { perm: true, word: true, finalsFree: true, additive: true }]));
  for (let t = 0; t < 400; t += 1) {
    const words = Array.from({ length: 1 + pick(3) }, rndWord);
    const phrase = words.join(" ");
    const permuted = words.map(shuffleChars).join(" ");                       // letters permuted inside each word
    const joined = shuffleChars(words.join("")).replace(/(.{3,5})/gu, "$1 ").trim(); // letters permuted across the phrase (word boundaries moved)
    const reordered = [...words].reverse().join(" ");                          // whole words reordered
    const unfinal = [...phrase].map((c) => FINAL_TO_BASE[c] || c).join("");
    const [w1, w2] = [rndWord(), rndWord()];
    for (const k of METHOD_KEYS) {
      if (FN[k](phrase) !== FN[k](permuted) || FN[k](phrase) !== FN[k](joined)) stays[k].perm = false;
      if (FN[k](phrase) !== FN[k](reordered)) stays[k].word = false;
      if (FN[k](phrase) !== FN[k](unfinal)) stays[k].finalsFree = false;
      if (FN[k](`${w1} ${w2}`) !== FN[k](w1) + FN[k](w2)) stays[k].additive = false;
    }
  }
  invariance = {
    permutation_invariant: METHOD_KEYS.filter((k) => stays[k].perm),
    word_order_invariant: METHOD_KEYS.filter((k) => stays[k].word),
    final_insensitive: METHOD_KEYS.filter((k) => stays[k].finalsFree),
    word_additive: METHOD_KEYS.filter((k) => stays[k].additive),
  };
  return invariance;
}

// ── pair evidence: raw equalities → independent families ───────────────────────────────────────────────────────
// Parity contract: with {anagram:false} the result equals the owner's independentFamilies(a,b) (checked, not assumed).
class Families {
  constructor(keys) { this.parent = new Map(keys.map((k) => [k, k])); }
  find(k) { let r = k; while (this.parent.get(r) !== r) r = this.parent.get(r); return r; }
  union(a, b) { const ra = this.find(a); const rb = this.find(b); if (ra !== rb) this.parent.set(rb, ra); }
  groups() { const g = new Map(); for (const k of this.parent.keys()) { const r = this.find(k); g.set(r, [...(g.get(r) || []), k]); } return [...g.values()]; }
}
const DELTA_PAIRS = VARIANT_BASE_PAIRS.map((p) => ({ ...p, v: INDEX[p.variant], b: INDEX[p.base] }));
export function pairEvidenceFromVectors(vecA, vecB, fpA, fpB, { anagram = true } = {}) {
  const raw = METHOD_KEYS.filter((_, i) => vecA[i] === vecB[i]);
  const fam = new Families(raw);
  const reasons = [];
  for (const d of DELTA_PAIRS) {
    if (vecA[d.v] !== vecB[d.v] || vecA[d.b] !== vecB[d.b]) continue;
    if (vecA[d.v] - vecA[d.b] === vecB[d.v] - vecB[d.b]) { fam.union(d.base, d.variant); reasons.push(`final_letter_delta:${d.base}/${d.variant}`); }
  }
  let collapsed = null;
  if (anagram && fpA && fpB && fpA.letter_key === fpB.letter_key) {
    const inv = engineInvariance();
    const strict = fpA.char_key === fpB.char_key;
    const sameWords = fpA.word_key === fpB.word_key;
    const eligible = raw.filter((k) => (sameWords && inv.word_order_invariant.includes(k)) || (inv.permutation_invariant.includes(k) && (strict || inv.final_insensitive.includes(k))));
    for (let i = 1; i < eligible.length; i += 1) fam.union(eligible[0], eligible[i]);
    if (eligible.length > 1) { collapsed = eligible.length; reasons.push(sameWords ? "word_multiset_permutation" : "letter_multiset_permutation"); }
  }
  const groups = fam.groups();
  return { raw_equalities: raw, raw_count: raw.length, families: groups, independent_family_count: groups.length, reasons, anagram_collapsed_methods: collapsed };
}
export const phraseEvidence = (a, b, opts) => pairEvidenceFromVectors(methodVector(a), methodVector(b), fingerprint(a), fingerprint(b), opts);

// ── statistics (deterministic) ─────────────────────────────────────────────────────────────────────────────────
export function holm(pValues, { alpha = 0.05 } = {}) {
  const m = pValues.length;
  const order = pValues.map((p, i) => [p, i]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const adjusted = new Array(m);
  let running = 0;
  order.forEach(([p, i], k) => { running = Math.max(running, Math.min(1, (m - k) * p)); adjusted[i] = running; });
  return { alpha, familySize: m, adjusted, rejected: adjusted.map((v) => v <= alpha) };
}
export { benjaminiHochberg };

export function seedFor(key, base = 20261023) {
  return (parseInt(sha256(`${base}:${key}`).slice(0, 8), 16) >>> 0) || 1;
}

const lenBucketOk = (a, b, slack) => Math.abs(a - b) <= slack;
// Matching ladder (strictest first); the first level that yields enough distinct agreeing control pairs is used (see matchedControl).
export const MATCH_LADDER = Object.freeze([
  { level: 0, label: "words+letters±1+final_types+matres", test: (s, x) => s.words === x.words && lenBucketOk(s.letters, x.letters, 1) && s.final_types === x.final_types && s.matres_bucket === x.matres_bucket },
  { level: 1, label: "words+letters±1+final_count+matres", test: (s, x) => s.words === x.words && lenBucketOk(s.letters, x.letters, 1) && s.finals === x.finals && s.matres_bucket === x.matres_bucket },
  { level: 2, label: "words+letters±1+final_count", test: (s, x) => s.words === x.words && lenBucketOk(s.letters, x.letters, 1) && s.finals === x.finals },
  { level: 3, label: "words+letters±2+final_count", test: (s, x) => s.words === x.words && lenBucketOk(s.letters, x.letters, 2) && s.finals === x.finals },
  { level: 4, label: "words±1+letters±3+final_count±1 (loosest; reported per pair)", test: (s, x) => Math.abs(s.words - x.words) <= 1 && lenBucketOk(s.letters, x.letters, 3) && Math.abs(s.finals - x.finals) <= 1 },
]);

export function buildPool(rows) {
  const seen = new Set();
  const pool = [];
  for (const r of rows) {
    const key = String(r.phrase).replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue; // distinct phrases only: a duplicate row must not count as a second control expression
    seen.add(key);
    pool.push({ id: r.id, phrase: key, fp: fingerprint(key), vec: methodVector(key) });
  }
  return pool;
}

const levelCache = new WeakMap();
// Per ladder level, the corpus expressions that match one side's fingerprint (memoised per pool + signature).
function levelsFor(pool, fp) {
  const cache = levelCache.get(pool) || levelCache.set(pool, new Map()).get(pool);
  const signature = `${fp.words}|${fp.letters}|${fp.finals}|${fp.final_types}|${fp.matres_bucket}`;
  if (!cache.has(signature)) {
    cache.set(signature, MATCH_LADDER.map((step) => pool.reduce((acc, x, i) => (step.test(fp, x.fp) ? (acc.push(i), acc) : acc), [])));
  }
  return cache.get(signature);
}

export const MIN_CONTROL_PAIRS = 200; // distinct agreeing control pairs needed before any p is reported
export const MAX_ENUM = 250000;

// Null model (declared): given that two matched corpus expressions agree in the CLAIMED method, how many independent
// families do they share? Control pairs are ENUMERATED (distinct pairs), never re-sampled with replacement, so the
// effective control size is the number of distinct agreeing pairs — a thin pool cannot masquerade as 100k draws.
// The strictest ladder level that yields ≥ MIN_CONTROL_PAIRS distinct pairs is used. The corpus is human-selected, not a
// neutral sample: this is a control distribution, not a population p-value.
export function matchedControl({ pool, methodIndex, value, fpA, fpB, excludedVariantKeys, seed }) {
  const prng = createSeededPrng(seed);
  const la = levelsFor(pool, fpA);
  const lb = levelsFor(pool, fpB);
  let last = null;
  for (let level = 0; level < MATCH_LADDER.length; level += 1) {
    const left = la[level].filter((i) => !excludedVariantKeys.has(pool[i].fp.variant_key));
    const right = lb[level].filter((i) => !excludedVariantKeys.has(pool[i].fp.variant_key));
    const byValue = new Map();
    for (const i of right) { const v = pool[i].vec[methodIndex]; (byValue.get(v) || byValue.set(v, []).get(v)).push(i); }
    let total = 0;
    for (const x of left) total += (byValue.get(pool[x].vec[methodIndex]) || []).length;
    last = { level, left: left.length, right: right.length, agreeing_pairs: total };
    if (total < MIN_CONTROL_PAIRS) continue;
    const overlap = left.length && right.length && left.some((i) => right.includes(i));
    const seenPairs = overlap ? new Set() : null;
    const chosen = []; // [xi, yi]
    let eligible = 0;
    for (const xi of left) for (const yi of byValue.get(pool[xi].vec[methodIndex]) || []) {
      if (xi === yi || pool[xi].fp.variant_key === pool[yi].fp.variant_key) continue;
      if (seenPairs) { const k = xi < yi ? xi * 1e6 + yi : yi * 1e6 + xi; if (seenPairs.has(k)) continue; seenPairs.add(k); }
      eligible += 1;
      if (chosen.length < MAX_ENUM) chosen.push([xi, yi]);
      else { const j = Math.floor(prng() * eligible); if (j < MAX_ENUM) chosen[j] = [xi, yi]; }
    }
    if (eligible < MIN_CONTROL_PAIRS) continue;
    const generic = []; const sameValue = [];
    for (const [xi, yi] of chosen) {
      const score = pairEvidenceFromVectors(pool[xi].vec, pool[yi].vec, pool[xi].fp, pool[yi].fp).independent_family_count;
      generic.push(score);
      if (pool[xi].vec[methodIndex] === value) sameValue.push(score);
    }
    const agreementRate = total / (left.length * right.length);
    return {
      status: "ok", exhaustive: eligible <= MAX_ENUM, eligible_distinct_pairs: eligible,
      matching: { level, label: MATCH_LADDER[level].label, left_pool: left.length, right_pool: right.length },
      generic, sameValue,
      agreement: { rate: Number(agreementRate.toExponential(4)), bits: Number((-Math.log2(agreementRate)).toFixed(3)), break_even_pairs_scanned: Number((1 / agreementRate).toFixed(1)), information_not_p_value: true },
    };
  }
  return { status: "control_thin", ...last, min_control_pairs: MIN_CONTROL_PAIRS };
}

export function summarizeControl(scores, observed) {
  const n = scores.length;
  if (!n) return null;
  const mean = scores.reduce((s, x) => s + x, 0) / n;
  const variance = scores.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1);
  const sd = Math.sqrt(variance);
  const hits = scores.filter((s) => s >= observed).length; // distinct control pairs with at least the observed number of families
  const p = (1 + hits) / (1 + n);
  return {
    n, hits, mean: Number(mean.toFixed(4)), sd: Number(sd.toFixed(4)), p: Number(p.toFixed(6)),
    p_upper_95_rule_of_three: hits === 0 ? Number((3 / n).toFixed(6)) : null,
    excess_families: Number((observed - mean).toFixed(3)),
    standardized_effect: sd > 0 ? Number(((observed - mean) / sd).toFixed(3)) : null,
    surprise_bits: Number((-Math.log2(p)).toFixed(3)),
    break_even_search_size: Number((1 / p).toFixed(1)),
  };
}

// ── expression dependency groups over relation records ───────────────────────────────────────────────────────
export function dependencyGroups(records) {
  const parent = records.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const union = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb); };
  const reason = new Map();
  const note = (i, j, why) => { union(i, j); reason.set(Math.max(i, j), [...(reason.get(Math.max(i, j)) || []), why]); };
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const a = records[i]; const b = records[j];
      if (a.method !== b.method || a.value !== b.value) continue; // a dependency exists only between claims of the same method and value (the same fact counted twice)
      if (a.fp.spaceless === b.fp.spaceless && a.phrase !== b.phrase) note(i, j, "spacing_variant_of");
      else if (a.fp.variant_key === b.fp.variant_key && a.phrase !== b.phrase) note(i, j, "spelling_variant_of");
      else if (a.fp.letter_key === b.fp.letter_key && a.phrase !== b.phrase) note(i, j, a.fp.word_key === b.fp.word_key ? "word_permutation_of" : "letter_permutation_of");
      else if (a.phrase !== b.phrase && withinOneEdit(a.phrase.replace(/ /g, ""), b.phrase.replace(/ /g, "")) ) note(i, j, "one_edit_variant_of");
    }
  }
  return records.map((_, i) => ({ group: find(i), reasons: reason.get(i) || [] }));
}

export { variantKey, withinOneEdit, boundaryFlags, timeFlags, independentFamilies };
