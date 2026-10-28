// EXP-16 metrics, all descriptive. Nothing here filters a proposal: every metric is computed on the verified and unverified lists as they are, and the first group (tier A)
// is a presentation order that the report compares with the rest, not a cut.
import { foldFinals } from "./region.mjs";

export const MIN_LONG = 5; // letters
export const RARE_MAX_HITS = 3; // occurrences over the whole Torah at the same skip (the engine's own count; "not rare" when the page was truncated)

const lengthOf = (finding) => [...finding.text].length;

/** Letter frequencies of the Torah text itself (the page's embedded copy of the stream): the chance model behind "how many occurrences would be expected anyway". */
export function chanceModel(letters) {
  const counts = new Map();
  for (const ch of letters) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return { N: letters.length, counts };
}
/** Expected number of occurrences of `text` at one skip, over both directions, in a stream of N letters with independent letters at these frequencies. */
export function expectedChance(model, text, skip) {
  const letters = [...text];
  const starts = Math.max(0, model.N - (letters.length - 1) * skip);
  let p = 1;
  for (const ch of letters) p *= (model.counts.get(ch) ?? 0) / model.N;
  return 2 * starts * p;
}
/** The Torah stream (scope `torah` of the engine): 304,805 letters, md5 of the whole stream as computed by SQL over public.torah_stream on 2026-10-28. The page embeds a longer text (the whole Tanakh); its first 304,805 letters must equal the stream. */
export const TORAH_LENGTH = 304_805;
export const TORAH_MD5 = "0066c2431821863d258745e664d3883e";
export function torahChanceModel(pageLettersText, md5Of) {
  const torah = pageLettersText.slice(0, TORAH_LENGTH);
  if (md5Of(torah) !== TORAH_MD5) throw new Error("the page's first 304,805 letters differ from public.torah_stream (md5): refusing to build the chance model");
  return chanceModel(torah);
}
export const UNLIKELY_E = 1; // fewer than one chance occurrence expected anywhere in the Torah at this skip
const median = (values) => { if (!values.length) return null; const sorted = values.slice().sort((a, b) => a - b); const mid = sorted.length >> 1; return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; };

/** One row per proposal, with what is needed downstream: the model's own fields joined to the verification outcome. */
export function enrich(classified, raw, chance = null) {
  const byId = new Map(raw.map((item) => [item.id, item]));
  return classified.map((finding) => {
    const model = byId.get(finding.id) ?? {};
    const verified = finding.verdict !== "not_verified";
    const isEls = finding.verdict === "verified_by_engine";
    const check = finding.checks.find((c) => c.engine_found === true || c.letters_match === true && (c.plain_text || c.synthetic)) ?? finding.checks[0];
    const hits = isEls ? check?.engine_hits ?? null : null;
    const skip = isEls ? finding.occurrences[0]?.params?.skip ?? null : null;
    const expected = isEls && chance && skip ? expectedChance(chance, finding.text, skip) : null;
    const truncated = isEls ? check?.engine_truncated === true : false;
    return {
      id: finding.id, text: finding.text, length: lengthOf(finding), verified, verdict: finding.verdict, isEls,
      readingKind: finding.occurrences[0]?.reading?.[0] ?? null, reading: finding.occurrences[0]?.reading ?? null,
      kind: model.kind ?? null, tier: model.tier ?? null, storyRelated: model.story_related === true, continueFrom: model.continue_from === true, fromFinding: model.from_finding ?? "",
      hits, truncated, skip, expected, unlikely: expected !== null && expected < UNLIKELY_E, unlikelier: expected !== null && expected < 0.1,
      rare: isEls && hits !== null && !truncated && hits <= RARE_MAX_HITS, long: lengthOf(finding) >= MIN_LONG, parts: Array.isArray(model.parts) ? model.parts.length : 0,
      phrase: Array.isArray(model.parts) && model.parts.length > 1,
    };
  });
}

const count = (rows, predicate) => rows.filter(predicate).length;
const mix = (rows) => Object.fromEntries(["R", "C", "D", "A"].map((k) => [k, count(rows, (r) => r.readingKind === k)]));

export function runMetrics(rows) {
  const els = rows.filter((r) => r.isEls);
  const first = rows.filter((r) => r.tier === "A");
  const rest = rows.filter((r) => r.tier !== "A");
  const interesting = (r) => r.isEls && r.long && (r.unlikely || (r.expected === null && r.rare)); // a proxy only: a long verified ELS that is unlikely by chance at its skip
  return {
    proposals: rows.length,
    verified: count(rows, (r) => r.verified),
    notVerified: count(rows, (r) => !r.verified),
    byVerdict: { engine: els.length, plainText: count(rows, (r) => r.verdict === "verified_plain_text_only"), synthetic: count(rows, (r) => r.verdict === "verified_synthetic") },
    els: {
      n: els.length, len3to4: count(els, (r) => r.length <= 4), len5to6: count(els, (r) => r.length >= 5 && r.length <= 6), len7plus: count(els, (r) => r.length >= 7),
      long: count(els, (r) => r.long), longStoryRelated: count(els, (r) => r.long && r.storyRelated), storyRelated: count(els, (r) => r.storyRelated),
      rare: count(els, (r) => r.rare), unlikely: count(els, (r) => r.unlikely), unlikelier: count(els, (r) => r.unlikelier), medianExpected: median(els.filter((r) => r.expected !== null).map((r) => r.expected)), medianHits: median(els.filter((r) => r.hits !== null && !r.truncated).map((r) => r.hits)), truncatedPages: count(els, (r) => r.truncated),
      kinds: mix(els),
    },
    noise: { likelyByChance: count(els, (r) => r.expected !== null && !r.unlikely), likelyByChanceShare: els.length ? count(els, (r) => r.expected !== null && !r.unlikely) / els.length : null, shortEls: count(els, (r) => r.length <= 4), shortElsShare: els.length ? count(els, (r) => r.length <= 4) / els.length : null, nonRareElsShare: els.length ? count(els, (r) => !r.rare) / els.length : null, plainTextShare: rows.length ? count(rows, (r) => r.verdict === "verified_plain_text_only") / rows.length : null },
    tiers: { A: first.length, B: count(rows, (r) => r.tier === "B"), C: count(rows, (r) => r.tier === "C"), missing: count(rows, (r) => r.tier === null) },
    firstGroup: { n: first.length, els: count(first, (r) => r.isEls), plain: count(first, (r) => r.verdict === "verified_plain_text_only"), long: count(first, (r) => r.long), rare: count(first, (r) => r.rare), unlikely: count(first, (r) => r.unlikely), interesting: count(first, interesting), kinds: mix(first), storyRelated: count(first, (r) => r.storyRelated) },
    outsideFirstGroup: { n: rest.length, interesting: count(rest, interesting), longEls: count(rest, (r) => r.isEls && r.long), kinds: mix(rest) },
    continuation: { fromFinding: count(rows, (r) => r.fromFinding !== ""), extension: count(rows, (r) => r.kind === "extension"), crossing: count(rows, (r) => r.kind === "crossing"), phrases: count(rows, (r) => r.phrase) },
  };
}

/** Planted recall: for each planted word, the best way a proposal matches it (exact / contains / overlaps / missed) and the tier of that proposal. */
export function plantedRecall(planted, classified, raw) {
  const rows = enrich(classified, raw);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return planted.map((word) => {
    const wordCells = new Set(word.cells.map(([i, j]) => `${i},${j}`));
    let best = { match: "missed", id: null, tier: null };
    const rank = { missed: 0, overlaps: 1, contains: 2, exact: 3 };
    for (const finding of classified) {
      if (finding.verdict === "not_verified") continue;
      for (const occ of finding.occurrences) {
        const cells = new Set(occ.cells.map(([i, j]) => `${i},${j}`));
        const shared = [...wordCells].filter((cell) => cells.has(cell)).length;
        if (shared < 2) continue;
        const match = shared === wordCells.size && cells.size === wordCells.size ? "exact" : shared === wordCells.size ? "contains" : "overlaps";
        if (rank[match] > rank[best.match]) best = { match, id: finding.id, tier: byId.get(finding.id)?.tier ?? null, text: finding.text };
      }
    }
    return { text: word.text, kind: word.kind, reversed: word.reversed, distance: word.distance, type: word.type, length: word.folded.length, reading: word.reading, ...best, firstGroup: best.tier === "A" };
  });
}

/** Summaries of planted results grouped by one attribute. */
export function recallBy(results, key) {
  const groups = new Map();
  for (const r of results) { const k = String(r[key]); const g = groups.get(k) ?? { n: 0, exact: 0, found: 0, firstGroup: 0 }; g.n += 1; if (r.match === "exact") g.exact += 1; if (r.match === "exact" || r.match === "contains") g.found += 1; if (r.firstGroup && (r.match === "exact" || r.match === "contains")) g.firstGroup += 1; groups.set(k, g); }
  return Object.fromEntries(groups);
}

export { foldFinals };
