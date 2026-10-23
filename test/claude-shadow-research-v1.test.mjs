// CLAUDE_SHADOW_RESEARCH_V1 — isolation, engine parity, dependency collapse, enumerated controls, corrections.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  SHADOW_VERSION, PROMPT_VERSION, TRUTH_BOUNDARY, METHOD_KEYS, MATCH_LADDER, MIN_CONTROL_PAIRS, engineInvariance, engineValue,
  fingerprint, methodVector, pairEvidenceFromVectors, phraseEvidence, buildPool, matchedControl, summarizeControl, dependencyGroups,
  holm, benjaminiHochberg, seedFor,
} from "../scripts/claude-shadow-research-core.mjs";
import { effectivePair, buildRelationRecords, rankViews, balancedSample, periodOf, postTypeOf } from "../scripts/claude-shadow-research-v1.mjs";
import { independentFamilies } from "../src/lib/research/pairConditionedMethodDependency.js";
import { METHODS, DEPTH_METHODS } from "../src/lib/gematria.js";
import { createSeededPrng } from "../src/lib/research/els2029StatisticalControls.js";

const ENGINE = Object.fromEntries([...METHODS, ...DEPTH_METHODS].map((m) => [m.key, m.fn]));
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const code = (path) => read(path).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n").replace(/createHash\("sha256"\)\.update\(/g, "createHash("); // hashing is not a DB update
const SHADOW_FILES = ["../scripts/claude-shadow-research-core.mjs", "../scripts/claude-shadow-research-v1.mjs"];

test("isolation: read-only REST, no write verbs, no Raziel / metatron_context / post_qa / Edge Function, no LLM client", () => {
  for (const file of SHADOW_FILES) {
    const source = code(file);
    assert.doesNotMatch(source, /method:\s*["'](POST|PUT|PATCH|DELETE)["']/i, file);
    assert.doesNotMatch(source, /\.rpc\(|\.insert\(|\.upsert\(|\.update\(|\.delete\(|functions\.invoke|createClient\(/, file);
    assert.doesNotMatch(source, /from\s+["'][^"']*(?:raziel|ai-analyze|metatron)[^"']*["']/i, `${file}: no import of Raziel / Edge Function code`);
    assert.doesNotMatch(source, /rest\/v1\/(?:post_qa|research_objects|metatron_context|post_gematria_links)|apply_migration|create_branch|askRaziel\(/, `${file}: no access to the protected tables`);
    assert.doesNotMatch(source, /anthropic|openai|\bgemini\b|messages\.create|api\.anthropic/i, file);
    assert.doesNotMatch(source, /claude-(?:opus|sonnet|haiku|fable)-\d/i, `${file}: no model id may be stored in a repo artifact`);
  }
  const cli = code("../scripts/claude-shadow-research-v1.mjs");
  assert.match(cli, /fetch\(`\$\{base\}\/rest\/v1\//);
  assert.equal([...cli.matchAll(/fetch\(/g)].length, 1, "exactly one fetch call site: the GET reader");
  assert.match(cli, /writeFileSync\(join\(out,/, "only local files are written");
  assert.equal(TRUTH_BOUNDARY.truthPromotion, false);
  assert.match(SHADOW_VERSION, /^claude-shadow-research-v1$/);
  assert.match(PROMPT_VERSION, /prompt-\d+$/);
});

test("no gematria arithmetic of its own: every value is a call into the canonical engine", () => {
  for (const file of SHADOW_FILES) {
    const source = code(file);
    assert.doesNotMatch(source, /charCodeAt|GEMATRIA_VALUES|const\s+VALUES\s*=|\{\s*א:\s*1/, file);
  }
  for (const phrase of ["חכמה", "ירושלים", "שנת יהוה"]) {
    const vec = methodVector(phrase);
    METHOD_KEYS.forEach((key, i) => assert.equal(vec[i], ENGINE[key](phrase), `${key} ${phrase}`));
  }
  assert.equal(engineValue("רגיל", "חכמה"), 73);
});

test("vector fast path equals the owner's pairConditionedMethodDependency (known pair + 1,500 seeded pairs)", () => {
  const known = phraseEvidence("ירושלים", "שומרים", { anagram: false });
  assert.equal(known.raw_count, 5);
  assert.equal(known.independent_family_count, 3);
  const prng = createSeededPrng(7);
  const letters = [..."אבגדהוזחטיכךלמםנןסעפףצץקרשת"];
  const word = () => Array.from({ length: 2 + Math.floor(prng() * 4) }, () => letters[Math.floor(prng() * letters.length)]).join("");
  let compared = 0;
  for (let i = 0; i < 1500; i += 1) {
    const a = `${word()} ${word()}`; const b = prng() < 0.5 ? a.split(" ").reverse().join(" ") : `${word()} ${word()}`;
    const mine = phraseEvidence(a, b, { anagram: false });
    const owner = independentFamilies(a, b);
    assert.equal(mine.independent_family_count, owner.independent_family_count, `${a} / ${b}`);
    assert.deepEqual(mine.raw_equalities, owner.raw_equalities);
    compared += 1;
  }
  assert.equal(compared, 1500);
});

test("anagram collapse: same-letter permutations are ONE fact for permutation-invariant methods (rank, don't hide)", () => {
  const strict = phraseEvidence("באור", "בורא");
  assert.equal(strict.independent_family_count, 1);
  assert.ok(strict.raw_count >= 10, "raw results are kept");
  assert.ok(strict.reasons.includes("letter_multiset_permutation"));
  const words = phraseEvidence("משיח בן דויד משיח בן יוסף", "משיח בן יוסף משיח בן דויד");
  assert.equal(words.independent_family_count, 1);
  assert.ok(words.reasons.includes("word_multiset_permutation"));
  const inv = engineInvariance();
  for (const key of ["רגיל", "גדול", "סידורי", "מילוי"]) assert.ok(inv.permutation_invariant.includes(key), key);
  for (const key of ["ריבוע", "מסתתר", "משולש הפוך"]) assert.ok(!inv.permutation_invariant.includes(key), `${key} is order-sensitive`);
  assert.ok(inv.word_order_invariant.includes("ריבוע"), "per-word methods survive a word reorder");
  assert.ok(inv.word_additive.includes("רגיל") && inv.word_additive.includes("ריבוע"), "per-word reset ⇒ additive over whole words");
  assert.ok(!inv.word_additive.includes("משולש מילה"), "running triangle is not additive over words");
  // property: the sets are what the engine does, not what a flag claims
  const prng = createSeededPrng(11);
  const letters = [..."אבגדהוזחטיכלמנסעפצקרשת"];
  for (let t = 0; t < 200; t += 1) {
    const w = Array.from({ length: 4 }, () => letters[Math.floor(prng() * letters.length)]);
    const shuffled = [...w].sort(() => prng() - 0.5).join("");
    for (const key of inv.permutation_invariant) assert.equal(ENGINE[key](w.join("")), ENGINE[key](shuffled), key);
  }
});

test("spelling / spacing variants of one expression are a dependency, not a second relation", () => {
  const rec = (phrase, value = 776, method = "רגיל") => ({ phrase, value, method, fp: fingerprint(phrase) });
  const groups = dependencyGroups([rec("שנת יהוה"), rec("שנת י ה ו ה"), rec("פרצופים", 506), rec("שנת יהוה", 776, "אתבש")]);
  assert.equal(groups[0].group, groups[1].group);
  assert.ok(groups[1].reasons.includes("spacing_variant_of"));
  assert.notEqual(groups[0].group, groups[2].group);
  assert.notEqual(groups[0].group, groups[3].group, "same phrase under another method is a different claim");
});

test("shared whole words are removed for word-additive methods only; identical word multisets are not tested", () => {
  const additive = new Set(engineInvariance().word_additive);
  const a = { phrase: "ביבי מלך ישראל" }; const b = { phrase: "דויד מלך ישראל" };
  const eff = effectivePair(a, b, additive.has("רגיל"));
  assert.deepEqual([eff.phrase_a, eff.phrase_b, eff.reduced], ["ביבי", "דויד", true]);
  assert.equal(effectivePair(a, b, false).reduced, false);
  assert.equal(effectivePair({ phrase: "אבג דהו" }, { phrase: "דהו אבג" }, true).identical_word_multiset, true);
});

function syntheticPool(n = 4000) {
  const prng = createSeededPrng(99);
  const letters = [..."אבגדהוזחטיכלמנסעפצקרשת"];
  const rows = Array.from({ length: n }, (_, i) => ({ id: `w${i}`, phrase: Array.from({ length: 3 + Math.floor(prng() * 3) }, () => letters[Math.floor(prng() * letters.length)]).join("") }));
  return buildPool(rows);
}

test("controls are ENUMERATED distinct pairs (never resampled with replacement); thin pools are not tested", () => {
  const pool = syntheticPool();
  const fp = fingerprint("שלום");
  const run = () => matchedControl({ pool, methodIndex: 0, value: engineValue("רגיל", "שלום"), fpA: fp, fpB: fp, excludedVariantKeys: new Set([fp.variant_key]), seed: seedFor("t") });
  const first = run();
  assert.equal(first.status, "ok");
  assert.ok(first.eligible_distinct_pairs >= MIN_CONTROL_PAIRS);
  assert.equal(first.generic.length, Math.min(first.eligible_distinct_pairs, 250000), "one score per DISTINCT pair");
  assert.deepEqual(run().generic, first.generic, "deterministic");
  assert.ok(first.generic.every((s) => s >= 1), "all control pairs agree in the claimed method, so at least one family");
  const thin = matchedControl({ pool: pool.slice(0, 60), methodIndex: 0, value: 1, fpA: fp, fpB: fp, excludedVariantKeys: new Set(), seed: 1 });
  assert.equal(thin.status, "control_thin");
  assert.equal(thin.min_control_pairs, MIN_CONTROL_PAIRS);
});

test("the pool counts a phrase once (duplicate rows are not extra control expressions)", () => {
  const pool = buildPool([{ id: 1, phrase: "אור גדר" }, { id: 2, phrase: "אור  גדר" }, { id: 3, phrase: "שלום" }]);
  assert.equal(pool.length, 2);
});

test("summary statistics: conservative p, effect size, bits, break-even search size; rule of three when no hits", () => {
  const scores = [...Array(95).fill(1), ...Array(5).fill(3)];
  const s = summarizeControl(scores, 3);
  assert.equal(s.n, 100); assert.equal(s.hits, 5);
  assert.equal(s.p, Number((6 / 101).toFixed(6)));
  assert.equal(s.excess_families, Number((3 - 1.1).toFixed(3)));
  assert.equal(s.surprise_bits, Number((-Math.log2(6 / 101)).toFixed(3)));
  assert.equal(s.break_even_search_size, Number((101 / 6).toFixed(1)));
  const none = summarizeControl(Array(300).fill(1), 2);
  assert.equal(none.hits, 0);
  assert.equal(none.p, Number((1 / 301).toFixed(6)));
  assert.equal(none.p_upper_95_rule_of_three, 0.01);
  assert.equal(summarizeControl([], 2), null);
});

test("multiple-testing: BH is the owner's, Holm is the lane's addition; neither labels without controls", () => {
  const ps = [0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205, 0.212, 0.216];
  const h = holm(ps);
  assert.deepEqual(h.adjusted.map((x) => Number(x.toFixed(3))), [0.01, 0.072, 0.312, 0.312, 0.312, 0.312, 0.312, 0.615, 0.615, 0.615]);
  assert.deepEqual(h.rejected.slice(0, 3), [true, false, false]);
  const bh = benjaminiHochberg(ps, { alpha: 0.05, familyId: "t" });
  assert.equal(bh.status, "EXECUTED");
  assert.ok(bh.qValues.every((q, i) => q >= ps[i] && q <= 1));
  assert.equal(benjaminiHochberg(ps).status, "CONTEXT_REQUIRED", "no declared family ⇒ no q-values");
});

test("relation records: statuses, expression ids, dependency representative, no inference of meaning", () => {
  const staged = {
    attested: [
      { phrase: "באור", value: 209, method: "רגיל", kinds: ["explicit-claim"], posts: [{ wp_id: 1, date: "2014-01-01" }] },
      { phrase: "בורא", value: 209, method: "רגיל", kinds: ["explicit-claim"], posts: [{ wp_id: 2, date: "2020-01-01" }, { wp_id: 3, date: "2021-01-01" }] },
      { phrase: "שלום עולם", value: 999, method: "רגיל", kinds: ["explicit-claim"], posts: [{ wp_id: 2, date: "2020-01-01" }] },
      { phrase: "חודש אדר", value: engineValue("רגיל", "חודש אדר"), method: "רגיל", kinds: ["explicit-claim"], posts: [{ wp_id: 2, date: "2020-01-01" }] },
    ],
    review_rows: [
      { row_id: "1:0", post_id: 1, claim_text: "באור = 209", claim_locator: "phrase_and_value_on_line", extracted_phrase: "באור", declared_method: null, computed_method: "רגיל", declared_value: 209, computed_value: 209, extraction_status: "engine_verified", extraction_confidence: "high", boundary_flags: [] },
      { row_id: "2:0", post_id: 2, claim_text: "בורא = 209", claim_locator: "phrase_and_value_on_line", extracted_phrase: "בורא", declared_method: null, computed_method: "רגיל", declared_value: 209, computed_value: 209, extraction_status: "engine_verified", extraction_confidence: "medium", boundary_flags: ["function_word_at_edge"] },
      { row_id: "2:1", post_id: 2, claim_text: "חודש אדר = x", claim_locator: "phrase_and_value_on_line", extracted_phrase: "חודש אדר", declared_method: null, computed_method: "רגיל", declared_value: engineValue("רגיל", "חודש אדר"), computed_value: engineValue("רגיל", "חודש אדר"), extraction_status: "engine_verified", extraction_confidence: "high", boundary_flags: [] },
    ],
  };
  const postsById = new Map([[1, { slug: "a", title: "למתקדמים" }], [2, { slug: "b", title: "x" }]]);
  const registry = new Map([["רגיל", { mathematical_family: "base_additive" }]]);
  const records = buildRelationRecords({ staged, postsById, corpus: [{ id: "c1", phrase: "באור" }], registry });
  const by = Object.fromEntries(records.map((r) => [r.phrase, r]));
  assert.equal(by["באור"].status, "verified");
  assert.deepEqual(by["באור"].expression_ids.corpus_expression_ids, ["c1"]);
  assert.equal(by["באור"].method_family, "base_additive");
  assert.equal(by["בורא"].status, "review_required");
  assert.ok(by["בורא"].status_reasons.some((x) => x.startsWith("boundary:")));
  assert.equal(by["שלום עולם"].status, "contradicted", "engine does not reproduce a claim that was attested");
  assert.ok(by["חודש אדר"].status_reasons.some((x) => x.startsWith("time_dependent:")) || by["חודש אדר"].status === "review_required");
  assert.equal(by["באור"].dependency.role, "independent_representative", "earliest source is the representative");
  assert.equal(by["בורא"].dependency.role, "dependent");
  assert.equal(by["בורא"].dependency.dependent_on, by["באור"].relation_id);
  assert.equal(by["בורא"].dependency.independence_claim, "dependency_group_only_not_proven_independent");
  assert.equal(by["בורא"].mentions, 2);
  assert.equal(by["בורא"].dependency.repeated_mentions_collapsed, true);
  assert.equal(by["באור"].source_posts[0].post_type, "advanced");
});

test("rank views: strongest by q then p; weakened lists raw→independent drops with rank change", () => {
  const mk = (id, raw, ind, p, q) => ({ pair_id: id, phrase_a: id, phrase_b: id, method: "רגיל", value: 1, origin: "asserted_in_same_post", raw_count: raw, independent_family_count: ind, dependency_reasons: ["x"], expression_dependent: false, control: { status: "ok", matching: { distinct_control_pairs: 300 }, generic: { p, excess_families: ind - 1, standardized_effect: 1, surprise_bits: 1 } }, significance: { q_bh: q, p_holm: q, label: "x" } });
  const { strongest, weakened } = rankViews([mk("a", 9, 1, 0.9, 1), mk("b", 3, 3, 0.02, 1), mk("c", 5, 5, 0.001, 0.4)]);
  assert.deepEqual(strongest.map((r) => r.pair_id), ["c", "b", "a"]);
  assert.equal(strongest[0].tier, "exploratory_uncorrected_p<=0.05");
  assert.equal(strongest[2].tier, "within_control_range");
  assert.deepEqual(weakened.map((r) => r.pair_id), ["a"]);
  assert.ok(weakened[0].rank_by_raw < weakened[0].rank_by_independent);
});

test("manual sample frame is deterministic and balanced across period × post type", () => {
  const records = [];
  const periods = ["2013-2016", "2017-2019", "2020-2022", "2023-2024", "2025-2026"];
  const types = ["advanced", "cube", "cipher", "event_hint", "general"];
  for (const p of periods) for (const t of types) for (let i = 0; i < 6; i += 1) records.push({ relation_id: `${p}${t}${i}`, source_posts: [{ period: p, post_type: t }] });
  const one = balancedSample(records, 50, 5); const two = balancedSample(records, 50, 5);
  assert.deepEqual(one.map((x) => x.record.relation_id), two.map((x) => x.record.relation_id));
  const cells = new Set(one.map((x) => x.cell));
  assert.equal(cells.size, 25, "every cell is represented before any cell is repeated");
  assert.equal(periodOf("2015-03-01"), "2013-2016"); assert.equal(periodOf("2026-08-05"), "2025-2026");
  assert.equal(postTypeOf({ title: "גימטריה למתקדמים" }), "advanced");
  assert.equal(postTypeOf({ title: "ריבוע" }), "cipher");
});

test("the matching ladder is declared strictest-first and ends in an explicit, reported loosest level", () => {
  assert.equal(MATCH_LADDER[0].level, 0);
  assert.match(MATCH_LADDER.at(-1).label, /loosest/);
  assert.ok(MATCH_LADDER.every((step, i) => step.level === i));
  const strict = fingerprint("אור גדר");
  assert.equal(MATCH_LADDER[0].test(strict, fingerprint("אור גדר")), true);
  assert.equal(MATCH_LADDER[0].test(strict, fingerprint("שלום")), false, "different word count");
  assert.equal(pairEvidenceFromVectors(methodVector("אור"), methodVector("אור"), fingerprint("אור"), fingerprint("אור")).independent_family_count >= 1, true);
});
