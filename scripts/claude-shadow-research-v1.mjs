#!/usr/bin/env node
// scripts/claude-shadow-research-v1.mjs — CLAUDE_SHADOW_RESEARCH_V1 ("מעבדת האתגר של קלוד").
//
// ISOLATED, READ-ONLY, EXPERIMENTAL. Not a canonical engine, not a product path.
//   existing sources (read-only REST, the same public anon key the browser uses)
//     → snapshot (hashed) → claim-stage extraction (existing stagePosts) → canonical-engine re-verification
//     → experimental analysis (dependency collapse, matched controls, multiple-testing) → candidates report
//     → HUMAN GATE (ZURIEL).  Nothing is promoted; this script only writes files into --out.
// No DB write · no RPC · no Supabase branch · no Raziel / metatron_context · no LLM call (llm_calls = 0) · no number computed by a model.
//
//   node scripts/claude-shadow-research-v1.mjs --category "סוד האותיות והמספרים" --out <dir> [--seed 20261023]
//   node scripts/claude-shadow-research-v1.mjs --category "…" --out <dir> --verify <dir>/manifest.json

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { stagePosts, normalizePhrase, toolVersions, gitBlob, STAGING_VERSION } from "./post-knowledge-staging.mjs";
import {
  SHADOW_VERSION, PROMPT_VERSION, TRUTH_BOUNDARY, METHOD_KEYS, sha256, engineValue, fingerprint, methodVector,
  pairEvidenceFromVectors, phraseEvidence, independentFamilies, buildPool, matchedControl, summarizeControl,
  dependencyGroups, holm, benjaminiHochberg, seedFor, engineInvariance, boundaryFlags, timeFlags, MATCH_LADDER, MIN_CONTROL_PAIRS, MAX_ENUM,
} from "./claude-shadow-research-core.mjs";

const stable = (value) => JSON.stringify(value, (_, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
const clip = (text, n = 240) => { const t = String(text || "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const year = (date) => Number(String(date || "").slice(0, 4)) || null;

// ── pure assembly (exported for tests; takes already-fetched data) ─────────────────────────────────────────────
export function periodOf(date) {
  const y = year(date);
  return y == null ? "unknown" : y <= 2016 ? "2013-2016" : y <= 2019 ? "2017-2019" : y <= 2022 ? "2020-2022" : y <= 2024 ? "2023-2024" : "2025-2026";
}
export function postTypeOf(post) {
  const text = `${post.title || ""} ${post.slug || ""}`;
  if (/למתקדמים/u.test(text)) return "advanced";
  if (/קוב|מעוקב/u.test(text)) return "cube";
  if (/אתבש|אלבם|אטבח|צופן|הצפנ|מסתתר|ריבוע/u.test(text)) return "cipher";
  if (/מלחמ|חטופ|טיל|בחירות|נשיא|קורונה|פיגוע|שריפ|רעידת|הפסקת.אש|טרור|עזה/u.test(text)) return "event_hint";
  return "general";
}

export function buildRelationRecords({ staged, postsById, corpus, registry }) {
  const corpusByPhrase = new Map();
  const corpusByVariant = new Map();
  for (const row of corpus) {
    const n = normalizePhrase(row.phrase);
    (corpusByPhrase.get(n) || corpusByPhrase.set(n, []).get(n)).push(row);
    const key = fingerprint(n).variant_key;
    (corpusByVariant.get(key) || corpusByVariant.set(key, []).get(key)).push(row);
  }
  const supporting = new Map();
  for (const row of staged.review_rows) {
    if (row.extraction_status !== "engine_verified") continue;
    const key = `${row.extracted_phrase}|${row.computed_value}|${row.computed_method || "רגיל"}`;
    (supporting.get(key) || supporting.set(key, []).get(key)).push(row);
  }
  const records = staged.attested.map((a) => {
    const key = `${a.phrase}|${a.value}|${a.method}`;
    const rows = supporting.get(key) || [];
    const fp = fingerprint(a.phrase);
    const canonical = engineValue(a.method, a.phrase);
    const exact = corpusByPhrase.get(a.phrase) || [];
    const variants = (corpusByVariant.get(fp.variant_key) || []).filter((r) => normalizePhrase(r.phrase) !== a.phrase);
    const flags = [...new Set(rows.flatMap((r) => r.boundary_flags || []))];
    const time = timeFlags(a.phrase);
    const allHigh = rows.length > 0 && rows.every((r) => r.extraction_confidence === "high");
    const anyHigh = rows.some((r) => r.extraction_confidence === "high" && !(r.boundary_flags || []).length);
    const reviewReasons = [
      ...(canonical === a.value ? [] : ["engine_value_differs_from_claim"]),
      ...(anyHigh && !flags.length ? [] : anyHigh ? [] : ["no_high_confidence_supporting_row"]),
      ...(flags.length && !anyHigh ? flags.map((f) => `boundary:${f}`) : []),
      ...(time.length ? time.map((f) => `time_dependent:${f}`) : []),
    ];
    const status = canonical !== a.value ? "contradicted" : reviewReasons.length ? "review_required" : "verified";
    const best = rows.slice().sort((x, y) => (x.extraction_confidence === "high" ? 0 : 1) - (y.extraction_confidence === "high" ? 0 : 1))[0];
    return {
      relation_id: `R${sha256(key).slice(0, 10)}`,
      phrase: a.phrase, method: a.method, value: a.value,
      fp,
      expression_ids: {
        corpus_expression_ids: exact.map((r) => r.id),
        corpus_match: exact.length ? "exact" : variants.length ? "spelling_variant_only" : "none",
        possible_spelling_variants: variants.slice(0, 3).map((r) => ({ id: r.id, phrase: r.phrase })),
      },
      source_posts: a.posts.map((p) => ({ wp_id: p.wp_id, date: p.date, slug: postsById.get(p.wp_id)?.slug ?? null, period: periodOf(p.date), post_type: postsById.get(p.wp_id) ? postTypeOf(postsById.get(p.wp_id)) : "unknown" })),
      mentions: a.posts.length,
      original_claims: rows.slice(0, 3).map((r) => ({ post_id: r.post_id, row_id: r.row_id, claim_text: clip(r.claim_text), claim_locator: r.claim_locator, declared_method: r.declared_method, declared_value: r.declared_value, confidence: r.extraction_confidence, boundary_flags: r.boundary_flags })),
      claim_row_count: rows.length,
      post_claim: { method: best?.declared_method ?? null, value: best?.declared_value ?? a.value },
      canonical: { method: a.method, value: canonical, matches_claim: canonical === a.value },
      method_family: registry.get(a.method)?.mathematical_family ?? null,
      extraction_confidence: allHigh ? "high" : anyHigh ? "high_and_medium" : rows.length ? "medium" : "unknown",
      status, status_reasons: reviewReasons,
      variant_flags: { boundary: flags, time },
    };
  });
  const groups = dependencyGroups(records);
  const firstSeen = (r) => `${r.source_posts[0]?.date || "9999"}|${r.phrase}`;
  const repOf = new Map();
  groups.forEach((g, i) => { const cur = repOf.get(g.group); if (cur == null || firstSeen(records[i]) < firstSeen(records[cur])) repOf.set(g.group, i); });
  records.forEach((r, i) => {
    const rep = repOf.get(groups[i].group);
    r.dependency = {
      group_id: `G${sha256(`${records[rep].relation_id}`).slice(0, 8)}`,
      role: rep === i ? "independent_representative" : "dependent",
      dependent_on: rep === i ? null : records[rep].relation_id,
      reasons: groups[i].reasons,
      group_size: groups.filter((g) => g.group === groups[i].group).length,
      repeated_mentions_collapsed: r.mentions > 1,
      independence_claim: "dependency_group_only_not_proven_independent",
    };
  });
  return records;
}

// Shared whole words contribute equally to word-additive methods, so a pair "A B = A C" is really the pair "B = C".
// The effective pair removes the common word multiset (only for word-additive methods); the full pair is kept in the record.
export function effectivePair(a, b, additive) {
  const ta = a.phrase.split(" "); const tb = b.phrase.split(" ");
  const pool = [...tb]; const common = [];
  for (const w of ta) { const k = pool.indexOf(w); if (k >= 0) { common.push(w); pool.splice(k, 1); } }
  if (!common.length || !additive) return { phrase_a: a.phrase, phrase_b: b.phrase, reduced: false, common: [] };
  const rest = (tokens) => { const bag = [...common]; return tokens.filter((w) => { const k = bag.indexOf(w); if (k >= 0) { bag.splice(k, 1); return false; } return true; }); };
  const ra = rest(ta).join(" "); const rb = rest(tb).join(" ");
  if (!ra || !rb) return { phrase_a: a.phrase, phrase_b: b.phrase, reduced: false, common, identical_word_multiset: true };
  return { phrase_a: ra, phrase_b: rb, reduced: true, common };
}

function buildPairs({ records, pool, poolIndexByMethod, seed, registry }) {
  const byKey = new Map();
  for (const r of records) (byKey.get(`${r.method}|${r.value}`) || byKey.set(`${r.method}|${r.value}`, []).get(`${r.method}|${r.value}`)).push(r);
  const additive = new Set(engineInvariance().word_additive);
  const pairs = [];
  const excluded = { same_spelling_family: 0 };
  for (const group of byKey.values()) {
    for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) {
      const a = group[i]; const b = group[j];
      if (a.fp.variant_key === b.fp.variant_key || a.fp.spaceless === b.fp.spaceless) { excluded.same_spelling_family += 1; continue; }
      const eff = effectivePair(a, b, additive.has(a.method));
      const fpA = eff.reduced ? fingerprint(eff.phrase_a) : a.fp;
      const fpB = eff.reduced ? fingerprint(eff.phrase_b) : b.fp;
      const full = pairEvidenceFromVectors(methodVector(a.phrase), methodVector(b.phrase), a.fp, b.fp);
      const rawFull = pairEvidenceFromVectors(methodVector(a.phrase), methodVector(b.phrase), a.fp, b.fp, { anagram: false });
      const evidence = eff.reduced ? pairEvidenceFromVectors(methodVector(eff.phrase_a), methodVector(eff.phrase_b), fpA, fpB) : full;
      const sharedPosts = a.source_posts.filter((p) => b.source_posts.some((q) => q.wp_id === p.wp_id)).map((p) => p.wp_id);
      const methodIndex = METHOD_KEYS.indexOf(a.method);
      const testable = !eff.identical_word_multiset;
      const control = testable ? matchedControl({
        pool, methodIndex, value: engineValue(a.method, eff.phrase_a), fpA, fpB,
        excludedVariantKeys: new Set([a.fp.variant_key, b.fp.variant_key, fpA.variant_key, fpB.variant_key]),
        seed: seedFor(`${a.relation_id}|${b.relation_id}`, seed),
      }) : { status: "not_tested_identical_word_multiset" };
      const generic = control.status === "ok" ? summarizeControl(control.generic, evidence.independent_family_count) : null;
      const sameValue = control.status === "ok" ? summarizeControl(control.sameValue, evidence.independent_family_count) : null;
      const reasons = [...evidence.reasons, ...(eff.reduced ? [`shared_words_removed:${eff.common.join(" ")}`] : [])];
      pairs.push({
        pair_id: `P${sha256(`${a.relation_id}|${b.relation_id}`).slice(0, 10)}`,
        a: a.relation_id, b: b.relation_id, phrase_a: a.phrase, phrase_b: b.phrase, method: a.method, value: a.value,
        method_family: registry.get(a.method)?.mathematical_family ?? null,
        relation_type: "same_value",
        origin: sharedPosts.length ? "asserted_in_same_post" : "derived_cross_post",
        shared_posts: sharedPosts,
        effective_pair: eff.reduced ? { phrase_a: eff.phrase_a, phrase_b: eff.phrase_b, removed_common_words: eff.common } : null,
        raw_equalities: full.raw_equalities, raw_count: full.raw_count,
        independent_family_count: evidence.independent_family_count,
        full_phrase_independent_family_count: full.independent_family_count,
        families: evidence.families, dependency_reasons: reasons,
        expression_dependent: a.fp.letter_key === b.fp.letter_key,
        dependency_collapse: { raw: rawFull.raw_count, after_final_letter_rule: rawFull.independent_family_count, after_all: evidence.independent_family_count },
        corpus_value_frequency_information_only: poolIndexByMethod.get(a.method)?.get(a.value) ?? 0,
        control: control.status === "ok" && generic
          ? { status: "ok", null_model: "all distinct matched corpus pairs that agree in the claimed method (generic) · sensitivity: same observed value", matching: { ...control.matching, exhaustive: control.exhaustive, distinct_control_pairs: control.eligible_distinct_pairs }, generic, same_value: sameValue, agreement_in_claimed_method: control.agreement }
          : { status: control.status, ...(control.agreeing_pairs != null ? { left_pool: control.left, right_pool: control.right, agreeing_pairs_at_loosest_level: control.agreeing_pairs, min_control_pairs: control.min_control_pairs } : {}) },
      });
    }
  }
  return { pairs, excluded };
}

function applyCorrections(pairs) {
  const tested = pairs.filter((p) => p.control.status === "ok");
  const ps = tested.map((p) => p.control.generic.p);
  const label = (q) => (q <= 0.05 ? "FDR_SURVIVES_DECLARED_NULL" : "NOT_SIGNIFICANT_UNDER_DECLARED_NULL");
  if (ps.length) {
    const bh = benjaminiHochberg(ps, { alpha: 0.05, familyId: "claude-shadow-v1:all-attested-pairs" });
    const hm = holm(ps);
    tested.forEach((p, i) => { p.significance = { family: "all_attested_pairs", family_size: ps.length, p: ps[i], q_bh: bh.qValues[i], p_holm: hm.adjusted[i], label: label(bh.qValues[i]), ...TRUTH_BOUNDARY }; });
    const asserted = tested.filter((p) => p.origin === "asserted_in_same_post");
    if (asserted.length) {
      const bhA = benjaminiHochberg(asserted.map((p) => p.control.generic.p), { alpha: 0.05, familyId: "claude-shadow-v1:asserted-pairs" });
      const hmA = holm(asserted.map((p) => p.control.generic.p));
      asserted.forEach((p, i) => { p.significance_asserted_only = { family_size: asserted.length, q_bh: bhA.qValues[i], p_holm: hmA.adjusted[i], label: label(bhA.qValues[i]) }; });
    }
  }
  for (const p of pairs.filter((x) => x.control.status !== "ok")) p.significance = { label: null, reason: "CONTROLS_ABSENT", ...TRUTH_BOUNDARY };
  return { tested: tested.length, untested: pairs.length - tested.length };
}

export function rankViews(pairs) {
  const byRaw = pairs.slice().sort((a, b) => b.raw_count - a.raw_count || a.pair_id.localeCompare(b.pair_id));
  const rawRank = new Map(byRaw.map((p, i) => [p.pair_id, i + 1]));
  const strongest = pairs.filter((p) => p.significance?.q_bh != null)
    .sort((a, b) => a.significance.q_bh - b.significance.q_bh || a.control.generic.p - b.control.generic.p || b.control.generic.excess_families - a.control.generic.excess_families || b.independent_family_count - a.independent_family_count || a.pair_id.localeCompare(b.pair_id))
    .slice(0, 30).map((p, i) => ({ rank_after_collapse: i + 1, rank_by_raw_count: rawRank.get(p.pair_id), pair_id: p.pair_id, phrase_a: p.phrase_a, phrase_b: p.phrase_b, method: p.method, value: p.value, origin: p.origin, raw_count: p.raw_count, independent_family_count: p.independent_family_count, p_uncorrected: p.control.generic.p, distinct_control_pairs: p.control.matching.distinct_control_pairs, q_bh: p.significance.q_bh, p_holm: p.significance.p_holm, tier: p.significance.q_bh <= 0.05 ? "fdr_survivor" : p.control.generic.p <= 0.05 ? "exploratory_uncorrected_p<=0.05" : "within_control_range", excess_families: p.control.generic.excess_families, standardized_effect: p.control.generic.standardized_effect, surprise_bits: p.control.generic.surprise_bits, label: p.significance.label, hypothesis_only: true }));
  const afterOrder = pairs.slice().sort((a, b) => b.independent_family_count - a.independent_family_count || b.raw_count - a.raw_count || a.pair_id.localeCompare(b.pair_id));
  const afterRank = new Map(afterOrder.map((p, i) => [p.pair_id, i + 1]));
  const weakened = pairs.filter((p) => p.raw_count - p.independent_family_count >= 2)
    .sort((a, b) => (b.raw_count - b.independent_family_count) - (a.raw_count - a.independent_family_count) || b.raw_count - a.raw_count || a.pair_id.localeCompare(b.pair_id))
    .slice(0, 30).map((p) => ({ pair_id: p.pair_id, phrase_a: p.phrase_a, phrase_b: p.phrase_b, method: p.method, value: p.value, raw_count: p.raw_count, independent_family_count: p.independent_family_count, lost: p.raw_count - p.independent_family_count, rank_by_raw: rawRank.get(p.pair_id), rank_by_independent: afterRank.get(p.pair_id), why: p.dependency_reasons, expression_dependent: p.expression_dependent }));
  return { strongest, weakened };
}

// Deterministic balanced sample over period × post type (round-robin over cells, seeded order inside a cell).
export function balancedSample(records, size = 60, seed = 20261023) {
  const cells = new Map();
  for (const r of records) {
    const post = r.source_posts[0];
    const key = `${post?.period || "unknown"}|${post?.post_type || "unknown"}`;
    (cells.get(key) || cells.set(key, []).get(key)).push(r);
  }
  for (const list of cells.values()) list.sort((a, b) => sha256(`${seed}:${a.relation_id}`).localeCompare(sha256(`${seed}:${b.relation_id}`)));
  const keys = [...cells.keys()].sort();
  const out = [];
  for (let round = 0; out.length < size && keys.some((k) => cells.get(k).length > round); round += 1) {
    for (const k of keys) if (cells.get(k)[round] && out.length < size) out.push({ cell: k, record: cells.get(k)[round] });
  }
  return out;
}

export function renderReport({ results, manifest, strongest, weakened, authored = {} }) {
  const c = results.counts; const pr = c.pairs;
  const tested = results.pairs.filter((p) => p.control.status === "ok");
  const pAt = (x) => tested.filter((p) => p.control.generic.p <= x).length;
  const minP = Math.min(...tested.map((p) => p.control.generic.p));
  const lost = results.pairs.filter((p) => p.raw_count > p.independent_family_count);
  const table = (rows, cols) => ["| " + cols.map((x) => x[0]).join(" | ") + " |", "|" + cols.map(() => "---").join("|") + "|", ...rows.map((r) => "| " + cols.map((x) => String(x[1](r)).replace(/\|/g, "/")).join(" | ") + " |")].join("\n");
  const depReasons = {};
  for (const r of results.relations) for (const reason of r.dependency.reasons) depReasons[reason] = (depReasons[reason] || 0) + 1;
  const levels = {}; for (const p of tested) levels[p.control.matching.level] = (levels[p.control.matching.level] || 0) + 1;
  return `# CLAUDE_SHADOW_RESEARCH_V1 — דוח (מעבדת האתגר של קלוד)

> **סטטוס: השערות ודוח מומחה בלבד.** לא Finding, לא קנוני, לא מפורסם, לא מוזן לשום מערכת. כל מספר כאן הוא קריאה ל-\`src/lib/gematria.js\`; הסטטיסטיקה והתלויות הן קוד דטרמיניסטי. ZURIEL = Human Gate.
> \`truthPromotion:false\` · \`db_writes:0\` · \`llm_calls:0\` · ללא חיבור ל-Raziel / metatron_context.

## 1. מה נקרא (snapshot)
- פוסטים בקטגוריה: **${manifest.snapshot.posts}** (sha256 \`${manifest.snapshot.posts_sha256.slice(0, 12)}…\`)
- קורפוס ציבורי גלוי (\`gematria_words\`, anon): **${manifest.snapshot.corpus_rows_total}** שורות; מאומתות ו≥3 אותיות, מפורקות לביטויים ייחודיים → בריכת בקרה (sha256 \`${manifest.snapshot.corpus_sha256.slice(0, 12)}…\`). חריגות בין עמודת \`ragil\` השמורה למנוע: **${manifest.snapshot.stored_ragil_vs_engine_mismatches}**.
- רג'יסטרי שיטות: **${manifest.snapshot.registry_methods}** (sha256 \`${manifest.snapshot.registry_sha256.slice(0, 12)}…\`); מנוע: ${manifest.method_registry.engine_value_methods} שיטות ערך.

## 2. סטטוסים — ${c.relations_total} היחסים המעוגנים + השאר
${table([["verified", c.by_status.verified, "המנוע שחזר את הערך; חילוץ בטוח"], ["review_required", c.by_status.review_required, "המנוע שחזר, אך גבול ביטוי חשוד / תלוי-זמן / ביטחון בינוני"], ["contradicted", c.by_status.contradicted, "המנוע לא שחזר טענה שנקלטה כמעוגנת (0 צפוי)"], ["extraction_unresolved", c.by_status.extraction_unresolved, "לא שוחזר — רעש גבולות חילוץ; לא שגיאת מחבר, לא verified"], ["not_applicable", c.not_applicable_claims, "לא טענת ערך"], ["verified_but_not_attestable", c.verified_but_not_attestable_rows, "<3 אותיות / לא עברית"]], [["סטטוס", (r) => r[0]], ["מספר", (r) => r[1]], ["משמעות", (r) => r[2]]])}

מורכבות (composite): verified ${c.composite_claims.verified} · mismatch ${c.composite_claims.mismatch} · unresolved ${c.composite_claims.unresolved} — ה-mismatch **אינו** מוכרז כשגיאת מחבר; לבדיקה אנושית.
התאמה לקורפוס: exact ${c.corpus_match.exact} · רק וריאנט כתיב ${c.corpus_match.spelling_variant_only} · לא בקורפוס ${c.corpus_match.none}.

## 3. תלות וקריסה
- יחסים: נציגים עצמאיים **${c.dependency.independent_representatives}**, תלויים **${c.dependency.dependent}** (${Object.entries(depReasons).map(([k, v]) => k + ":" + v).join(", ") || "—"}); יחסים שהוזכרו ביותר מפוסט אחד: ${c.dependency.repeated_mentions} (אזכור חוזר = עובדה אחת).
- זוגות ביטויים עם אותו ערך באותה שיטה: **${pr.total}** (נטענו באותו פוסט: ${pr.asserted_in_same_post}; נגזרו בין-פוסטים: ${pr.derived_cross_post}; הוצאו כאיות-שונה של אותה מילה: ${pr.excluded_same_spelling_family}).
- זוגות שאיבדו חוזק בקריסה (raw > עצמאי): **${lost.length}**; זוגות שהם תמורה של אותן אותיות: ${pr.expression_dependent}.
- כלל ההפרש (Δ) נבדק מול הבעלים \`pairConditionedMethodDependency.js\`: ${manifest.parity_check.pairs_checked} זוגות, **${manifest.parity_check.mismatches}** פערים.

## 4. מובהקות מול בקרות מותאמות (השערה, לא הוכחה)
- מודל האפס המוצהר: **כל** זוגות הקורפוס הייחודיים המותאמים (מספר מילים, אורך ±, מספר/סוג סופיות, הרכב אותיות) שמסכימים באותה שיטה נטענת — **ספירה מלאה, לא דגימה חוזרת**. הקורפוס נבחר-אנושית ולא מדגם ניטרלי; שכיחות בקורפוס מוצגת כמידע בלבד.
- נבדקו **${pr.tested}** מתוך ${pr.total}; ללא בקרה מספקת (<${manifest.parameters.min_control_pairs} זוגות בקרה ייחודיים גם ברמת ההתאמה הרופפת ביותר): ${pr.untested}.
- רמות התאמה (0 = מחמירה): ${Object.entries(levels).map(([k, v]) => k + ":" + v).join(" · ")}.
- p לא-מתוקן ≤0.05: **${pAt(0.05)}** · ≤0.01: **${pAt(0.01)}** · p מינימלי אפשרי בקבוצה: ${minP.toFixed(4)} · p=1 (אין ראיה מעבר להסכמה הנטענת): ${tested.filter((p) => p.control.generic.p === 1).length}.
- **אחרי תיקון (BH ו-Holm על כל ${pr.tested} הזוגות): שורדים BH = ${pr.fdr_survivors}, Holm = ${pr.holm_survivors}.**
- אזהרה: מרחב החיפוש האמיתי של המחברים גדול מ-${pr.tested}; לכן גם תיקון כזה מקל. \`break_even_search_size\` בטבלאות = כמה זוגות מותאמים צריך לסרוק כדי לצפות לתוצאה כזאת במקרה.

### הזוגות הבולטים (אחרי קריסה; מדורגים לפי q, p, גודל אפקט)
${table(strongest.slice(0, 12), [["#", (r) => r.rank_after_collapse], ["דרגה לפי raw", (r) => r.rank_by_raw_count], ["ביטוי א", (r) => r.phrase_a], ["ביטוי ב", (r) => r.phrase_b], ["ערך", (r) => r.value], ["raw", (r) => r.raw_count], ["עצמאי", (r) => r.independent_family_count], ["p", (r) => r.p_uncorrected], ["q BH", (r) => r.q_bh.toFixed(3)], ["עודף משפחות", (r) => r.excess_families], ["אפקט (σ)", (r) => r.standardized_effect ?? "—"], ["bits", (r) => r.surprise_bits], ["שכבה", (r) => r.tier]])}

## 5. נראו חזקים לפני נרמול והיחלשו אחריו
${table(weakened.slice(0, 12), [["ביטוי א", (r) => r.phrase_a], ["ביטוי ב", (r) => r.phrase_b], ["ערך", (r) => r.value], ["raw→עצמאי", (r) => r.raw_count + "→" + r.independent_family_count], ["דרגה raw→אחרי", (r) => r.rank_by_raw + "→" + r.rank_by_independent], ["סיבה", (r) => r.why.map((x) => x.replace(/final_letter_delta:/, "Δ:")).join(", ")]])}

## 6. עלות וזמן
REST: ${manifest.cost_runtime.rest_requests} בקשות, ${manifest.cost_runtime.rows_read} שורות, ${(manifest.cost_runtime.bytes_read / 1e6).toFixed(1)}MB · זמן ריצה כולל ${manifest.cost_runtime.seconds.total}s (קריאה ${manifest.cost_runtime.seconds.read_sources}s · חילוץ ${manifest.cost_runtime.seconds.extraction}s · ניתוח ${manifest.cost_runtime.seconds.analysis}s) · זוגות בקרה שחושבו ${manifest.cost_runtime.control_pairs_evaluated} · LLM בצינור: 0 קריאות, $0.

## 7. בדיקה ידנית מאוזנת (מדגם ${authored.audit?.size ?? "—"} יחסים)
${authored.audit ? `מדגם סדור (period × post type, round-robin בזרע קבוע), ${authored.audit.cells_covered} תאים מתוך 25 אפשריים מכוסים (תאים ריקים — אין יחסים באותו פוסט-טיפוס/תקופה). המנוע שחזר **${authored.audit.engine_value_matches_claim}/${authored.audit.size}**. פסקי דין: ${Object.entries(authored.audit.verdict_counts).map(([k, v]) => k + " " + v).join(" · ")}. פירוט ב-\`manual_sample_audit.json\` (נכתב על-ידי Claude בקריאה ידנית; בודק נאמנות חילוץ בלבד, לא אמת מספרית).` : "טרם נוצר."}

## 8. השערות לבדיקה (לא ממצאים)
${authored.hypotheses ? authored.hypotheses.items.map((h) => `- **${h.id}** — ${h.title}`).join("\n") : "טרם נוצרו."}
כל המספרים בקובץ ההשערות הועתקו בקוד מ-\`results.json\`; הטקסט נכתב על-ידי Claude (prompt_version \`${PROMPT_VERSION}\`).

## 9. מה לא נעשה
אין כתיבה ל-DB / RPC / Supabase branch · אין שינוי ב-post_qa, gematria_words, research_objects · אין חיבור ל-metatron_context או Raziel · אין Result Bundle נוסף · אין API/Edge Function · אין זיכרון נפרד · אין deploy/merge.
`;
}

// ── CLI ────────────────────────────────────────────────────────────────────────────────────────────────────────
const meter = { rest_requests: 0, rows: 0, bytes: 0 };
async function restAll(base, headers, path, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const response = await fetch(`${base}/rest/v1/${path}`, { headers: { ...headers, Range: `${from}-${from + pageSize - 1}`, "Range-Unit": "items" } });
    if (!response.ok) throw new Error(`${path.split("?")[0]} read failed: HTTP ${response.status}`);
    const text = await response.text();
    meter.rest_requests += 1; meter.bytes += Buffer.byteLength(text);
    const page = JSON.parse(text);
    meter.rows += page.length;
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
const git = (...args) => { try { return execFileSync("git", args, { encoding: "utf8" }).trim(); } catch { return null; } };

async function main() {
  const args = process.argv.slice(2);
  const arg = (name, fallback = null) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
  const category = arg("--category");
  const out = arg("--out");
  if (!category || !out) { console.error('usage: --category "<name>" --out <dir> [--seed N] [--verify <manifest.json>]'); process.exit(2); }
    const seed = Number(arg("--seed", 20261023));
  const t0 = Date.now();
  const timing = {};
  const lap = (name, since) => { timing[name] = Number(((Date.now() - since) / 1000).toFixed(2)); };

  // 1 · read-only sources
  let t = Date.now();
  const { SUPABASE_URL, SUPABASE_ANON } = await import("../src/lib/supabasePublicConfig.js");
  const headers = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };
  const posts = await restAll(SUPABASE_URL, headers, `posts?select=wp_id,slug,title,date,modified,content&categories=cs.${encodeURIComponent(`{"${category}"}`)}&order=date.asc,wp_id.asc`, 20);
  const methodRows = await restAll(SUPABASE_URL, headers, "gematria_methods?select=method_key,version,active,mathematical_family,order_sensitive,word_boundary_sensitive,final_letter_sensitive&order=method_key.asc");
  const corpusAll = await restAll(SUPABASE_URL, headers, "gematria_words?select=id,phrase,is_verified,is_published,ragil&order=id.asc");
  lap("read_sources", t);

  // 2 · snapshot hashes (what was read, not what is true)
  const registry = new Map(methodRows.map((m) => [m.method_key, m]));
  const corpus = corpusAll.filter((r) => r.is_verified === true && normalizePhrase(r.phrase).replace(/ /g, "").length >= 3);
  const snapshot = {
    posts_sha256: sha256(posts.map((p) => `${p.wp_id}:${p.modified ?? ""}`).sort().join("\n")),
    corpus_sha256: sha256(corpus.map((r) => `${r.id}|${normalizePhrase(r.phrase)}`).sort().join("\n")),
    registry_sha256: sha256(stable(Object.fromEntries(methodRows.map((m) => [m.method_key, { version: m.version, active: m.active, family: m.mathematical_family, order: m.order_sensitive, boundary: m.word_boundary_sensitive, finals: m.final_letter_sensitive }])))),
    stored_ragil_vs_engine_mismatches: corpusAll.filter((r) => r.ragil != null && engineValue("רגיל", r.phrase) !== Number(r.ragil)).length,
    corpus_rows_total: corpusAll.length, corpus_rows_verified_used_as_control_pool: corpus.length, posts: posts.length, registry_methods: methodRows.length,
  };

  // 3 · claim-stage extraction + canonical re-verification (existing owners)
  t = Date.now();
  const versions = toolVersions();
  const staged = stagePosts(posts, { versions: { extraction: `${versions.staging}/${(versions.triage_js || "?").slice(0, 8)}+${(versions.analysisFlow_js || "?").slice(0, 8)}`, engine: `gematria.js@${(versions.gematria_js || "?").slice(0, 8)}`, registry: snapshot.registry_sha256.slice(0, 12) } });
  lap("extraction", t);
  const postsById = new Map(posts.map((p) => [p.wp_id, p]));
  const records = buildRelationRecords({ staged, postsById, corpus: corpusAll.filter((r) => r.is_verified === true), registry });

  // 4 · experimental analysis
  t = Date.now();
  const pool = buildPool(corpus);
  const poolIndexByMethod = new Map();
  for (const key of new Set(records.map((r) => r.method))) {
    const idx = METHOD_KEYS.indexOf(key); const m = new Map();
    for (const e of pool) m.set(e.vec[idx], (m.get(e.vec[idx]) || 0) + 1);
    poolIndexByMethod.set(key, m);
  }
  // consistency: the lane's own pool vs the stored ragil column (information only; the engine is the authority)
  const { pairs, excluded } = buildPairs({ records, pool, poolIndexByMethod, seed, registry });
  const corrections = applyCorrections(pairs);
  lap("analysis", t);

  // 5 · parity: the vector fast path equals the owner's pairConditionedMethodDependency for every observed pair
  t = Date.now();
  let parityChecked = 0; const parityFail = [];
  for (const p of pairs) {
    const owner = independentFamilies(p.phrase_a, p.phrase_b);
    const mine = phraseEvidence(p.phrase_a, p.phrase_b, { anagram: false });
    parityChecked += 1;
    if (owner.independent_family_count !== mine.independent_family_count || stable(owner.raw_equalities) !== stable(mine.raw_equalities)) parityFail.push(p.pair_id);
  }
  lap("parity_check", t);

  const { strongest, weakened } = rankViews(pairs);
  const unresolved = staged.review_rows.filter((r) => r.extraction_status === "extraction_unresolved");
  const counts = {
    relations_total: records.length,
    by_status: { verified: records.filter((r) => r.status === "verified").length, review_required: records.filter((r) => r.status === "review_required").length, contradicted: records.filter((r) => r.status === "contradicted").length, extraction_unresolved: unresolved.length },
    not_applicable_claims: staged.stats.not_applicable,
    verified_but_not_attestable_rows: staged.review_rows.filter((r) => (r.reason || "").startsWith("verified_but_not_attestable")).length,
    composite_claims: { verified: staged.stats.composite_verified, mismatch: staged.stats.composite_mismatch, unresolved: staged.stats.composite_unresolved, note: "composite mismatches are listed for human review; the lane does not call them author errors" },
    dependency: { independent_representatives: records.filter((r) => r.dependency.role === "independent_representative").length, dependent: records.filter((r) => r.dependency.role === "dependent").length, repeated_mentions: records.filter((r) => r.mentions > 1).length },
    corpus_match: Object.fromEntries(["exact", "spelling_variant_only", "none"].map((k) => [k, records.filter((r) => r.expression_ids.corpus_match === k).length])),
    pairs: { total: pairs.length, asserted_in_same_post: pairs.filter((p) => p.origin === "asserted_in_same_post").length, derived_cross_post: pairs.filter((p) => p.origin === "derived_cross_post").length, excluded_same_spelling_family: excluded.same_spelling_family, expression_dependent: pairs.filter((p) => p.expression_dependent).length, ...corrections, fdr_survivors: pairs.filter((p) => p.significance?.label === "FDR_SURVIVES_DECLARED_NULL").length, holm_survivors: pairs.filter((p) => p.significance?.p_holm != null && p.significance.p_holm <= 0.05).length },
  };
  const results = {
    version: SHADOW_VERSION, ...TRUTH_BOUNDARY,
    note: "Hypothesis / expert report. Every number is a call into src/lib/gematria.js. Nothing here is canonical, published or admitted to the corpus.",
    null_model: { id: "claude-shadow-v1:matched-corpus-pairs-agreeing-in-claimed-method", declared_limits: ["the corpus is human-selected, not a neutral sample", "corpus frequency is information, never a p-value", "controls are ENUMERATED distinct pairs (never re-sampled with replacement); p = (1+hits)/(1+distinct pairs)", "a pair with fewer than MIN_CONTROL_PAIRS distinct control pairs at the loosest level is NOT tested", "BH and Holm are over the declared pair family only; the true search size of the authors is larger and unknown"], seed, matching_ladder: MATCH_LADDER.map((m) => m.label), min_control_pairs: MIN_CONTROL_PAIRS },
    counts, relations: records.map(({ fp, ...r }) => ({ ...r, expression: { words: fp.words, letters: fp.letters, finals: fp.finals, final_types: fp.final_types, matres_bucket: fp.matres_bucket } })),
    pairs, unresolved_claims: unresolved.map((r) => ({ row_id: r.row_id, post_id: r.post_id, phrase: r.extracted_phrase, declared_method: r.declared_method, declared_value: r.declared_value, computed_value: r.computed_value, status: "extraction_unresolved", note: "not an author error, not verified" })),
  };
  const sample = balancedSample(records, 60, seed).map(({ cell, record }) => ({ cell, relation_id: record.relation_id, phrase: record.phrase, method: record.method, value: record.value, status: record.status, posts: record.source_posts.map((p) => p.wp_id), claim: record.original_claims[0] ?? null, canonical_value: record.canonical.value }));

  const resultsText = JSON.stringify(results, null, 1);
  const resultsHash = sha256(resultsText);
  const own = ["scripts/claude-shadow-research-core.mjs", "scripts/claude-shadow-research-v1.mjs", "src/lib/research/pairConditionedMethodDependency.js", "src/lib/research/els2029StatisticalControls.js", "src/lib/gematria.js", "src/lib/triage.js", "src/lib/analysisFlow.js", "scripts/post-knowledge-staging.mjs"];
  const manifest = {
    manifest_version: 1, tool: SHADOW_VERSION, category,
    repro_command: `node scripts/claude-shadow-research-v1.mjs --category "${category}" --out <dir> --seed ${seed}`,
    boundary: TRUTH_BOUNDARY,
    snapshot,
    code: { git_head: git("rev-parse", "HEAD"), git_branch: git("rev-parse", "--abbrev-ref", "HEAD"), worktree_dirty: Boolean(git("status", "--porcelain", "--", "scripts", "src")), blobs: Object.fromEntries(own.map((f) => [f, gitBlob(f)])) },
    method_registry: { version_note: "per-key `version` column; hashed with its dependency/family flags", sha256: snapshot.registry_sha256, methods: methodRows.length, engine_value_methods: METHOD_KEYS.length },
    extractor: { staging: STAGING_VERSION, triage_js: versions.triage_js, analysisFlow_js: versions.analysisFlow_js },
    invariance_sets_measured_on_engine: Object.fromEntries(Object.entries(engineInvariance()).map(([k, v]) => [k, v.length])),
    parameters: { seed, min_control_pairs: MIN_CONTROL_PAIRS, max_enumerated_pairs: MAX_ENUM },
    counts,
    parity_check: { owner: "src/lib/research/pairConditionedMethodDependency.js", pairs_checked: parityChecked, mismatches: parityFail.length },
    results_sha256: resultsHash,
    claude_role: { llm_calls_in_pipeline: 0, prompt_version_for_claude_authored_files: PROMPT_VERSION, model_id_recorded_in_repo: false, note: "model id is reported in the chat only; hypotheses and audit notes are Claude-authored and hypothesis-only" },
    writes: { db_writes: 0, rpc_calls: 0, supabase_branches: 0, raziel_or_metatron_context: false, deploys: 0 },
    cost_runtime: { rest_requests: meter.rest_requests, rows_read: meter.rows, bytes_read: meter.bytes, seconds: { ...timing, total: Number(((Date.now() - t0) / 1000).toFixed(2)) }, llm_calls: 0, llm_cost_usd: 0, control_pairs_evaluated: pairs.reduce((s, p) => s + (p.control.generic?.n ?? 0), 0) },
  };

  const readJson = (name) => { try { return JSON.parse(readFileSync(join(out, name), "utf8")); } catch { return null; } };
  const authored = { audit: readJson("manual_sample_audit.json"), hypotheses: readJson("hypotheses_to_check.json") };
  const files = {
    "SHADOW_REPORT.md": renderReport({ results, manifest, strongest, weakened, authored }),
    "results.json": resultsText,
    "strongest_after_collapse.json": JSON.stringify({ version: SHADOW_VERSION, ...TRUTH_BOUNDARY, note: "ranked by BH q, then uncorrected p, then excess independent families; hypotheses only", rows: strongest }, null, 1),
    "weakened_by_normalization.json": JSON.stringify({ version: SHADOW_VERSION, ...TRUTH_BOUNDARY, note: "pairs whose raw method count looked strong and dropped after dependency collapse", rows: weakened }, null, 1),
    "manual_sample_frame.json": JSON.stringify({ version: SHADOW_VERSION, size: sample.length, seed, rows: sample }, null, 1),
  };
  manifest.claude_authored_artifacts = Object.fromEntries(Object.entries({ "manual_sample_audit.json": authored.audit, "hypotheses_to_check.json": authored.hypotheses }).filter(([, v]) => v).map(([name]) => { const text = readFileSync(join(out, name), "utf8"); return [name, { bytes: Buffer.byteLength(text), sha256: sha256(text), authored_by: "claude", prompt_version: PROMPT_VERSION }]; }));
  manifest.artifacts = Object.fromEntries(Object.entries(files).map(([name, text]) => [name, { bytes: Buffer.byteLength(text), sha256: sha256(text) }]));

  const verifyPath = arg("--verify");
  if (verifyPath) {
    const expected = JSON.parse(readFileSync(verifyPath, "utf8"));
    const drift = [];
    for (const k of ["posts_sha256", "corpus_sha256", "registry_sha256"]) if (expected.snapshot?.[k] !== snapshot[k]) drift.push(`snapshot:${k}`);
    if (expected.results_sha256 !== resultsHash) drift.push("results_sha256");
    console.log(JSON.stringify({ verify: drift.length ? "DRIFT" : "PASS", drift, note: drift.length ? "a snapshot hash changed ⇒ the sources moved; compare counts before trusting the old results" : "same sources, same code ⇒ identical results" }, null, 1));
    process.exit(drift.length ? 1 : 0);
  }

  mkdirSync(out, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(out, name), text);
  writeFileSync(join(out, "manifest.json"), JSON.stringify({ ...manifest, generated_at: new Date().toISOString() }, null, 1));
  console.log(JSON.stringify({ counts, parity_check: manifest.parity_check, cost_runtime: manifest.cost_runtime }, null, 1));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main().catch((error) => { console.error(error.stack || error.message); process.exit(1); });
