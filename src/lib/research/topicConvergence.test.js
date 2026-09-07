// Tests for topicConvergence.js authored-content bridge — run with:
//   node --test src/lib/research/topicConvergence.test.js
// Node's built-in runner (node:test + assert/strict), same convention as the sibling research tests.
//
// LEGACY_CONTENT_TO_ONE_RESEARCH_OS_BRIDGE_V1 (work_log 1af998d5, parents e98849a1 / 6ffdf33e).
// Every fixture below is SYNTHETIC. Shapes mirror the live topic_cards.findings shapes observed
// read-only on 2026-09-05 (object phrases / bullets / rows / connections / posts / candidates,
// root-array concept / numeric-claim / post / convergence_ref), but no phrase, slug, id, note or
// account below is copied from any real row.
//
// What this file proves (memo VERIFICATION clause):
//   • supported shapes project losslessly into typed, source-path-addressed facts
//   • unknown shapes are explicitly accounted (never dropped, never invented)
//   • internal (_-prefixed) keys are accounted by NAME only — values never enter the envelope
//   • Finding identity is stable: adding content does not change the Finding id
//   • no mutation of the input card
//   • no truth promotion: stage/status/verification stay null; method labels stay verbatim text
//   • the SAME code path serves a phrases-only card, a richer bullets card, a root-array card
//     and a non-contributor object card — there is no author-specific branch to test around.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  topicConvergenceToUniversalFinding,
  projectTopicCardContent,
  topicConvergenceContentSections,
  AUTHORED_CLAIM,
  AUTHORED_SECTION_ORDER,
  TOPIC_CARD_SELECT_FIELDS,
  buildTopicListQuery,
} from "./topicConvergence.js";
import { isUniversalFinding } from "./universalFinding.js";

const authored = (finding) => finding.evidence.facts.filter(f => f.claim === AUTHORED_CLAIM);
const ofType = (finding, type) => authored(finding).filter(f => f.type === type);
const summaryOf = (finding) => finding.evidence.facts.find(f => f.type === "authored-content-summary");

// ── Fixtures (synthetic) ───────────────────────────────────────────────────────────────────────
const PHRASES_CARD = {
  id: "11111111-1111-4111-8111-111111111111", slug: "synthetic-conv-77", title: "77 — דוגמה סינתטית",
  status: "approved", created_by: "תורם-בדיקה", numbers: [77], highlight_numbers: [77],
  findings: {
    hint: "רמז סינתטי לבדיקה.",
    caveat: "עובדה = מנוע; פרשנות = רמז.",
    source: "contribution:תורם-בדיקה",
    phrases: ["ביטוי-א", "ביטוי-ב", "  ביטוי-ג  ", "", 42],
  },
};

const BULLETS_CARD = {
  id: "22222222-2222-4222-8222-222222222222", slug: "synthetic-core-500", title: "500 — גרעין סינתטי",
  status: "approved", created_by: "תורם-בדיקה", numbers: [500], image_ids: ["img-a", "img-b"],
  findings: {
    headline: "הגרעין המאושר",
    hint: "רמז.",
    caveat: "הסתייגות.",
    writer: "תורם-בדיקה",
    writer_convergence: true,
    bullets: ["שורה ראשונה", { t: "שורה עם תמונה", img: "img-b" }, { img: "img-a" }, 7],
    candidates: ["מועמד-א", "מועמד-ב"],
    rows: [{ p: "ביטוי-ראשי", v: 500, note: "רגיל" }, { p: "ביטוי-משני", v: "500" }, "מחרוזת-בלבד", null],
    connections: [{ number: 500, links: ["קשר-א", "קשר-ב"], note: "הערה" }, { number: "x", links: "לא-מערך" }],
    posts: [{ slug: "synthetic-post", title: "פוסט סינתטי", wp_id: 9 }, "bad"],
    post: { slug: "synthetic-post-2", title: "פוסט-יחיד", wp_id: 10 },
  },
};

const ARRAY_CARD = {
  id: "33333333-3333-4333-8333-333333333333", slug: "synthetic-axis", title: "ציר סינתטי",
  status: "approved", created_by: "עורך-בדיקה", numbers: [604, 1359],
  findings: [
    { type: "concept", title: "מושג", text: "טקסט המושג." },
    { n: 604, method: "מסתתר/רגיל", phrase: "ביטוי-א (מסתתר) = ביטוי-ב (רגיל)" },
    { n: "1359", method: "רגיל", phrase: "ביטוי-ג", note: "הערה", hint: "רמז-אלמנט" },
    { phrase: "ביטוי-בלי-מספר" },
    { type: "post", id: 5, slug: "synthetic-post", title: "פוסט" },
    { type: "convergence_ref", node: "44444444-4444-4444-8444-444444444444", slug: "synthetic-other", title: "לעוגן אחר", note: "מפנים, לא משכפלים" },
    { type: "mystery", foo: 1 },
    "loose-string",
  ],
};

const UNKNOWN_KEYS_CARD = {
  id: "55555555-5555-4555-8555-555555555555", slug: "synthetic-draft", title: "טיוטה סינתטית",
  status: "approved", created_by: "מערכת-בדיקה",
  findings: {
    hint: "רמז",
    hypotheses: ["h1"],
    verified_facts: [{ a: 1 }],
    cipher: { k: "v" },
    theme: "נושא",
    _do_not_publish: true,
    _research_draft: true,
    _internal_provenance: { account: "SECRET-SHOULD-NEVER-APPEAR@example.invalid", curated_by: "x" },
    _note: "SECRET-NOTE-SHOULD-NEVER-APPEAR",
  },
};

// ── Object shape: phrases-only (the dominant contributor shape) ────────────────────────────────
test("phrases-only card: every non-empty string phrase becomes an authored-phrase fact with a source path; junk is accounted", () => {
  const finding = topicConvergenceToUniversalFinding({ card: PHRASES_CARD });
  assert.ok(isUniversalFinding(finding));
  const phrases = ofType(finding, "authored-phrase");
  assert.deepEqual(phrases.map(p => p.text), ["ביטוי-א", "ביטוי-ב", "ביטוי-ג"]);
  assert.deepEqual(phrases.map(p => p.sourcePath), ["findings.phrases[0]", "findings.phrases[1]", "findings.phrases[2]"]);
  assert.deepEqual(phrases.map(p => p.index), [0, 1, 2]);
  // A phrase carries NO value and NO method — nothing was inferred from the hint text "(רגיל)".
  for (const p of phrases) { assert.equal("value" in p, false); assert.equal("methodLabel" in p, false); }
  const summary = summaryOf(finding);
  assert.equal(summary.shape, "object");
  // "" (empty) and 42 (number) are unsupported phrase entries — accounted, not silently dropped.
  assert.equal(summary.unsupported.length, 2);
  assert.deepEqual(summary.unsupported.map(u => u.sourcePath), ["findings.phrases[3]", "findings.phrases[4]"]);
  assert.equal(ofType(finding, "authored-hint")[0].text, "רמז סינתטי לבדיקה.");
  assert.equal(ofType(finding, "authored-caveat")[0].text, "עובדה = מנוע; פרשנות = רמז.");
  assert.deepEqual(ofType(finding, "authored-attribution").map(a => [a.field, a.text]), [["source", "contribution:תורם-בדיקה"]]);
});

// ── Object shape: the rich editorial shape ─────────────────────────────────────────────────────
test("bullets/rows/connections/posts/candidates: supported entries project, malformed entries are accounted", () => {
  const finding = topicConvergenceToUniversalFinding({ card: BULLETS_CARD });
  const bullets = ofType(finding, "authored-bullet");
  assert.deepEqual(bullets.map(b => [b.text, b.imageId]), [["שורה ראשונה", null], ["שורה עם תמונה", "img-b"], ["", "img-a"]]);
  const rows = ofType(finding, "authored-row");
  assert.deepEqual(rows.map(r => [r.phrase, r.value, r.note]), [["ביטוי-ראשי", 500, "רגיל"], ["ביטוי-משני", 500, null], ["מחרוזת-בלבד", null, null]]);
  assert.equal(rows[1].valueRaw, "500", "raw authored value is preserved next to the parsed one");
  const conns = ofType(finding, "authored-connection");
  assert.equal(conns.length, 2);
  assert.deepEqual(conns[0].links, ["קשר-א", "קשר-ב"]);
  assert.equal(conns[1].number, null, "non-numeric authored number stays null, never coerced");
  assert.equal(conns[1].numberRaw, "x");
  const posts = ofType(finding, "authored-post-ref");
  assert.deepEqual(posts.map(p => [p.slug, p.wpId, p.sourcePath]), [["synthetic-post", 9, "findings.posts[0]"], ["synthetic-post-2", 10, "findings.post"]]);
  assert.deepEqual(ofType(finding, "authored-candidate").map(c => c.text), ["מועמד-א", "מועמד-ב"]);
  assert.equal(ofType(finding, "authored-headline")[0].text, "הגרעין המאושר");
  const summary = summaryOf(finding);
  // bullets[3]=7, rows[3]=null, posts[1]="bad" → three accounted unsupported entries.
  assert.deepEqual(summary.unsupported.map(u => u.sourcePath).sort(), ["findings.bullets[3]", "findings.posts[1]", "findings.rows[3]"]);
  assert.equal(summary.flags.writerConvergence, true);
  // Card-level source fact carries attribution + image ids, never a contributor entity.
  const src = finding.evidence.facts.find(f => f.type === "topic-card-source");
  assert.equal(src.created_by, "תורם-בדיקה");
  assert.deepEqual(src.image_ids, ["img-a", "img-b"]);
});

// ── Root-array shape ───────────────────────────────────────────────────────────────────────────
test("root-array card: concept / numeric-claim / post / convergence_ref typed; method label verbatim; unknown elements accounted", () => {
  const finding = topicConvergenceToUniversalFinding({ card: ARRAY_CARD });
  assert.equal(summaryOf(finding).shape, "array");
  const concepts = ofType(finding, "authored-concept");
  assert.deepEqual(concepts.map(c => [c.title, c.text, c.sourcePath]), [["מושג", "טקסט המושג.", "findings[0]"]]);
  const claims = ofType(finding, "authored-numeric-claim");
  assert.deepEqual(claims.map(c => [c.value, c.methodLabel, c.phrase]), [
    [604, "מסתתר/רגיל", "ביטוי-א (מסתתר) = ביטוי-ב (רגיל)"],
    [1359, "רגיל", "ביטוי-ג"],
    [null, null, "ביטוי-בלי-מספר"],
  ]);
  assert.equal(claims[1].valueRaw, "1359");
  assert.equal(claims[1].hint, "רמז-אלמנט");
  assert.equal(claims[0].methodLabel, "מסתתר/רגיל", "composite authored label is carried verbatim, not split or resolved");
  assert.deepEqual(ofType(finding, "authored-post-ref").map(p => [p.slug, p.postId]), [["synthetic-post", 5]]);
  const refs = ofType(finding, "authored-convergence-ref");
  assert.deepEqual(refs.map(r => [r.slug, r.nodeId, r.note]), [["synthetic-other", "44444444-4444-4444-8444-444444444444", "מפנים, לא משכפלים"]]);
  assert.ok(finding.evidence.refs.includes("nodes:44444444-4444-4444-8444-444444444444"), "referenced convergence node is an evidence ref");
  const summary = summaryOf(finding);
  assert.deepEqual(summary.unsupported.map(u => [u.sourcePath, u.elementType ?? null]), [["findings[6]", "mystery"], ["findings[7]", null]]);
});

// ── Unknown keys + internal markers ────────────────────────────────────────────────────────────
test("unknown keys are explicit unsupported facts; _-prefixed keys are names only and their values never enter the envelope", () => {
  const finding = topicConvergenceToUniversalFinding({ card: UNKNOWN_KEYS_CARD });
  const summary = summaryOf(finding);
  assert.deepEqual(summary.unsupported.map(u => u.field).sort(), ["cipher", "hypotheses", "theme", "verified_facts"]);
  assert.deepEqual(summary.internalKeys.sort(), ["_do_not_publish", "_internal_provenance", "_note", "_research_draft"]);
  assert.equal(summary.flags.doNotPublish, true);
  assert.equal(summary.flags.researchDraft, true);
  assert.equal(finding.access.reason, "source-flag:_do_not_publish");
  assert.equal(finding.access.tier, null, "a source flag never manufactures an access tier");
  const serialized = JSON.stringify(finding);
  assert.equal(serialized.includes("SECRET-SHOULD-NEVER-APPEAR"), false);
  assert.equal(serialized.includes("SECRET-NOTE-SHOULD-NEVER-APPEAR"), false);
  assert.equal(serialized.includes("curated_by"), false);
});

// ── Identity stability + no mutation ───────────────────────────────────────────────────────────
test("Finding id is unchanged by authored content; card input is not mutated", () => {
  const bare = topicConvergenceToUniversalFinding({ card: { id: PHRASES_CARD.id, slug: PHRASES_CARD.slug, title: PHRASES_CARD.title, status: "approved" } });
  const before = JSON.stringify(PHRASES_CARD);
  const rich = topicConvergenceToUniversalFinding({ card: PHRASES_CARD });
  assert.equal(rich.id, bare.id, "content facts are evidence, not identity — the Finding id must not move");
  assert.deepEqual(rich.identity, bare.identity);
  assert.equal(rich.subject.key, "synthetic-conv-77");
  assert.equal(JSON.stringify(PHRASES_CARD), before);
  // A card fetched WITHOUT the findings column (older caller) projects exactly as before: no summary.
  assert.equal(summaryOf(bare), undefined);
  assert.equal(authored(bare).length, 0);
});

// ── Truth axes stay honest ─────────────────────────────────────────────────────────────────────
test("no truth promotion: stage/status/verification remain null; every authored fact is tagged source-authored", () => {
  for (const card of [PHRASES_CARD, BULLETS_CARD, ARRAY_CARD, UNKNOWN_KEYS_CARD]) {
    const finding = topicConvergenceToUniversalFinding({ card });
    assert.equal(finding.stage, null);
    assert.equal(finding.status, null);
    assert.equal(finding.verification.verification_state, null);
    assert.equal(finding.verification.engine_result, null);
    for (const f of authored(finding)) assert.equal(f.claim, AUTHORED_CLAIM);
    assert.equal(finding.provenance.createdBy, "ADAPTER:topic-convergence-v1");
  }
});

// ── Same path for every author ─────────────────────────────────────────────────────────────────
test("no author-specific branch: identical structure regardless of created_by", () => {
  const a = topicConvergenceToUniversalFinding({ card: { ...PHRASES_CARD, created_by: "צבי (OPOC)" } });
  const b = topicConvergenceToUniversalFinding({ card: { ...PHRASES_CARD, created_by: "ai" } });
  const c = topicConvergenceToUniversalFinding({ card: { ...PHRASES_CARD, created_by: null } });
  const strip = (f) => JSON.stringify({ ...f, provenance: null, evidence: { ...f.evidence, facts: f.evidence.facts.map(x => x.type === "topic-card-source" ? { ...x, created_by: null } : x) } });
  assert.equal(strip(a), strip(b));
  assert.equal(strip(a), strip(c));
});

// ── Section grouping helper ────────────────────────────────────────────────────────────────────
test("topicConvergenceContentSections: fixed canonical order for object shape, true source order inside sections, null for content-less findings", () => {
  const rich = topicConvergenceContentSections(topicConvergenceToUniversalFinding({ card: BULLETS_CARD }));
  assert.equal(rich.shape, "object");
  assert.deepEqual(rich.order, ["headline", "hint", "rows", "bullets", "connections", "candidates", "posts", "caveat"]);
  assert.ok(rich.order.every((k, i, arr) => i === 0 || AUTHORED_SECTION_ORDER.indexOf(arr[i - 1]) < AUTHORED_SECTION_ORDER.indexOf(k)));
  assert.deepEqual(rich.sections.bullets.map(b => b.index), [0, 1, 2]);
  assert.equal(rich.createdBy, "תורם-בדיקה");
  assert.equal(rich.isEmpty, false);

  const arr = topicConvergenceContentSections(topicConvergenceToUniversalFinding({ card: ARRAY_CARD }));
  assert.deepEqual(arr.order, ["concepts", "numericClaims", "convergenceRefs", "posts"]);
  assert.deepEqual(arr.sections.numericClaims.map(c => c.index), [1, 2, 3]);

  const withheld = topicConvergenceContentSections(topicConvergenceToUniversalFinding({ card: UNKNOWN_KEYS_CARD }));
  assert.equal(withheld.flags.doNotPublish, true);
  assert.deepEqual(withheld.unsupported.map(u => u.field).sort(), ["cipher", "hypotheses", "theme", "verified_facts"]);

  const bare = topicConvergenceToUniversalFinding({ card: { id: "x1", slug: "x", title: "x", status: "approved" } });
  assert.equal(topicConvergenceContentSections(bare), null);
  assert.equal(topicConvergenceContentSections(null), null);
});

// ── Projector edge cases ───────────────────────────────────────────────────────────────────────
test("projectTopicCardContent: null/empty/unknown shapes never throw and are explicitly classified", () => {
  assert.equal(projectTopicCardContent(null).shape, "empty");
  assert.equal(projectTopicCardContent(undefined).shape, "empty");
  assert.equal(projectTopicCardContent({}).shape, "empty");
  assert.equal(projectTopicCardContent([]).shape, "empty");
  const str = projectTopicCardContent("just a string");
  assert.equal(str.shape, "unknown");
  assert.equal(str.unsupported.length, 1);
  assert.equal(str.unsupported[0].valueType, "string");
  const num = projectTopicCardContent(5);
  assert.equal(num.shape, "unknown");
  const custom = projectTopicCardContent({ phrases: ["a"] }, { root: "card.findings" });
  assert.equal(custom.facts[0].sourcePath, "card.findings.phrases[0]");
  // Attribution/flags are NOT counted as content.
  const counts = projectTopicCardContent({ source: "s", auto: true, phrases: ["p"] }).counts;
  assert.deepEqual(counts, { supported: 1, unsupported: 0, internal: 0 });
});

// ── Canonical fetch path carries the body ──────────────────────────────────────────────────────
test("canonical SELECT now includes findings + attribution columns (P1/Research Viewer receive the body without edits)", () => {
  for (const col of ["findings", "created_by", "image_ids", "search_terms", "occurred_at", "id", "slug", "title", "node_id", "status"]) {
    assert.ok(TOPIC_CARD_SELECT_FIELDS.split(",").includes(col), `missing column ${col}`);
  }
});

// ── UNIVERSAL_EXPLORER_V1_SLICE1_GENERIC_LIST_MODE (work_log e3097bb5) ─────────────────────────
// buildTopicListQuery is the pure, network-free query-shape builder for the bounded Topic/
// Convergence list-mode reader — proves bounds clamping and deterministic compound ordering
// without mocking Supabase (no such convention exists in this codebase; the fetch stays thin).

test("buildTopicListQuery: default limit/offset applied when omitted", () => {
  const q = buildTopicListQuery();
  assert.equal(q.limit, 24);
  assert.equal(q.rangeStart, 0);
  assert.equal(q.rangeEnd, 24, "rangeEnd = rangeStart + limit, so range() fetches limit+1 rows for hasMore detection");
});

test("buildTopicListQuery: limit is clamped to [1, 100], never trusts caller-supplied extremes", () => {
  assert.equal(buildTopicListQuery({ limit: 0 }).limit, 1);
  assert.equal(buildTopicListQuery({ limit: -5 }).limit, 1);
  assert.equal(buildTopicListQuery({ limit: 99999 }).limit, 100);
  assert.equal(buildTopicListQuery({ limit: "not-a-number" }).limit, 24, "non-numeric falls back to the default, never NaN/unbounded");
});

test("buildTopicListQuery: offset never goes negative", () => {
  assert.equal(buildTopicListQuery({ offset: -10 }).rangeStart, 0);
  assert.equal(buildTopicListQuery({ offset: 50 }).rangeStart, 50);
});

test("buildTopicListQuery: ordering is a fixed, deterministic compound key regardless of input (stable pagination)", () => {
  const a = buildTopicListQuery();
  const b = buildTopicListQuery({ limit: 5, offset: 100 });
  assert.deepEqual(a.order, [["approved_at", false], ["id", true]]);
  assert.deepEqual(a.order, b.order, "the compound order never varies by limit/offset — no caller can destabilize pagination");
});

// GPT challenge 165a9e59 correction (2): finite, non-negative, integer normalization — Infinity
// and fractional inputs must never reach .range() unchanged.

test("buildTopicListQuery: Infinity/NaN limit and offset fall back to the default/zero, never pass through", () => {
  const q = buildTopicListQuery({ limit: Infinity, offset: Infinity });
  assert.equal(q.limit, 24);
  assert.equal(q.rangeStart, 0);
  assert.equal(buildTopicListQuery({ limit: NaN }).limit, 24);
  assert.equal(buildTopicListQuery({ limit: -Infinity }).limit, 24);
});

test("buildTopicListQuery: fractional limit/offset are truncated to integers", () => {
  const q = buildTopicListQuery({ limit: 2.7, offset: 5.9 });
  assert.equal(q.limit, 2);
  assert.equal(q.rangeStart, 5);
  assert.equal(Number.isInteger(q.limit), true);
  assert.equal(Number.isInteger(q.rangeStart), true);
  assert.equal(Number.isInteger(q.rangeEnd), true);
});

// ── UNIVERSAL_EXPLORER_V1_SLICE5_RANKING_V1 correction (work_log dispatch 764b3b9b, independent
// audit AFTER 6050377d): rankByMeterScore is the ONE canonical topic-list reader's own ranking
// mode — replacing a forked duplicate reader that used to live in explorerRanking.js. Default
// (omitted/false) must stay byte-identical to every existing caller's order, proven above; these
// tests cover the new opt-in branch only. ──────────────────────────────────────────────────────

test("buildTopicListQuery: rankByMeterScore:true prepends meter_score DESC ahead of the SAME proven approved_at+id tiebreak", () => {
  const ranked = buildTopicListQuery({ rankByMeterScore: true });
  assert.deepEqual(ranked.order, [["meter_score", false], ["approved_at", false], ["id", true]]);
});

test("buildTopicListQuery: rankByMeterScore defaults to false — every existing caller's order is byte-unchanged", () => {
  assert.deepEqual(buildTopicListQuery().order, [["approved_at", false], ["id", true]]);
  assert.deepEqual(buildTopicListQuery({ limit: 5, offset: 100 }).order, [["approved_at", false], ["id", true]]);
  assert.deepEqual(buildTopicListQuery({ rankByMeterScore: false }).order, [["approved_at", false], ["id", true]]);
});

test("buildTopicListQuery: rankByMeterScore never affects bounds — same limit/offset clamping either way", () => {
  const a = buildTopicListQuery({ limit: 5, offset: 100 });
  const b = buildTopicListQuery({ limit: 5, offset: 100, rankByMeterScore: true });
  assert.equal(a.limit, b.limit);
  assert.equal(a.rangeStart, b.rangeStart);
  assert.equal(a.rangeEnd, b.rangeEnd);
});

// ── Slice 7 (UNIVERSAL_EXPLORER_V1_SLICE7_SEARCH_COMPOSITION, work_log dispatch c0612463):
// buildTopicListQuery's new `search` field. Every existing test above this point never passed
// `q`, so `search` was implicitly null there too — proving the no-query shape is byte-identical
// to pre-Slice-7 behavior; these tests make that explicit and cover the search-specific cases ──

test("buildTopicListQuery: no q (or empty/whitespace q) yields search:null — byte-identical to pre-Slice-7 shape", () => {
  assert.equal(buildTopicListQuery().search, null);
  assert.equal(buildTopicListQuery({ q: "" }).search, null);
  assert.equal(buildTopicListQuery({ q: "   " }).search, null);
});

test("buildTopicListQuery: q is trimmed", () => {
  assert.equal(buildTopicListQuery({ q: "  התגלות  " }).search, "התגלות");
  assert.equal(buildTopicListQuery({ q: " 1237 " }).search, "1237");
});

test("buildTopicListQuery: q strips LIKE-wildcard AND .or()-filter control chars (%,_,(,)) — a raw comma/paren in free text can never break out of the multi-column .or() filter fetchTopicCardList builds from it", () => {
  assert.equal(buildTopicListQuery({ q: "a,b" }).search, "ab");
  assert.equal(buildTopicListQuery({ q: "x(y)" }).search, "xy");
  assert.equal(buildTopicListQuery({ q: "%_" }).search, null);
});

test("buildTopicListQuery: search never changes the ranking order contract — meter_score DESC → approved_at DESC → id ASC (or the unranked order) is identical with or without a search term", () => {
  assert.deepEqual(
    buildTopicListQuery({ rankByMeterScore: true, q: "התגלות" }).order,
    [["meter_score", false], ["approved_at", false], ["id", true]],
  );
  assert.deepEqual(
    buildTopicListQuery({ q: "התגלות" }).order,
    [["approved_at", false], ["id", true]],
  );
});
