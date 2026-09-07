// Tests for the generic method-result bridge in entityHubProjection.js — run with:
//   node --test src/lib/research/entityHubProjection.test.js
// Node's built-in runner, pure functions only (no supabase/network). P1_1237_HITGALUT_METHOD_BRIDGE
// (work_log 2a0b6702 / ACK 14d66a0e). All fixtures are SYNTHETIC — no real phrase, id or value is
// asserted here; the live golden case (רגיל=844 · מסתתר=1237 for the canonical entity) is proven
// against the canonical Supabase project in the work_log AFTER, not in unit tests.
//
// Proves: (1) rows are derived from whatever methods the engine actually returned (no hardcoded
// method list); (2) Registry joins on db_column and supplies identity/governance; (3) a stored
// canonical value is treated as a real prior claim → honest match/mismatch, otherwise not_tested;
// (4) number-node linking only when the node exists (Rank, don't hide: unlinked rows stay);
// (5) inputs are never mutated; (6) the reverse (phrase → entity) map only points at existing nodes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMethodResultBridge, buildPhraseEntityLinks, buildEntityListQuery, resolveExplorerListParams } from "./entityHubProjection.js";
import { gematriaApiResultToFindings } from "./canonicalGematria.js";
import { isUniversalFinding } from "./universalFinding.js";

const ENGINE = gematriaApiResultToFindings({ input: "ביטוי-סינתטי", methods: { aaa: 100, bbb: 200, ccc: 300 } });
const REGISTRY = [
  { method_key: "שיטה-א", db_column: "aaa", display_label: "שיטה א", sort_order: 2, active: true, in_engine: true },
  { method_key: "שיטה-ב", db_column: "bbb", display_label: "שיטה ב", sort_order: 1, active: true, in_engine: false },
  // ccc has no registry row on purpose
];
const GW = { id: "11111111-1111-4111-8111-111111111111", phrase: "ביטוי-סינתטי", is_verified: true, is_published: true, aaa: 100, bbb: 999, ccc: null };
const NUMBER_NODES = [{ id: "n-100", type: "number", label: "100" }, { id: "n-300", type: "number", label: "300" }];

test("bridge rows come from the engine output only; registry joined on db_column; sorted by registry order", () => {
  const rows = buildMethodResultBridge({ subjectLabel: "ביטוי-סינתטי", subjectNodeId: "node-1", gwRow: GW, engineFindings: ENGINE, registryRows: REGISTRY, numberNodes: NUMBER_NODES });
  assert.deepEqual(rows.map(r => r.dbColumn), ["bbb", "aaa", "ccc"], "registry sort_order first, unregistered last");
  assert.deepEqual(rows.map(r => r.methodKey), ["שיטה-ב", "שיטה-א", "ccc"], "unregistered method keeps its engine column as key — never invented");
  assert.deepEqual(rows.map(r => r.engineValue), [200, 100, 300]);
  assert.equal(rows[1].governed, true);
  assert.equal(rows[0].governed, false, "not in_engine ⇒ not governed");
  assert.equal(rows[2].registry, null);
});

test("stored canonical value is a real claim: match / mismatch / not_tested — never fabricated", () => {
  const rows = buildMethodResultBridge({ subjectLabel: "ביטוי-סינתטי", gwRow: GW, engineFindings: ENGINE, registryRows: REGISTRY, numberNodes: NUMBER_NODES });
  const by = Object.fromEntries(rows.map(r => [r.dbColumn, r]));
  assert.equal(by.aaa.verificationState, "match");
  assert.equal(by.aaa.finding.verification.claimed_value, 100);
  assert.equal(by.aaa.finding.verification.engine_result, 100);
  assert.equal(by.bbb.verificationState, "mismatch");
  assert.equal(by.bbb.finding.verification.claimed_value, 999);
  assert.equal(by.bbb.finding.verification.engine_result, 200);
  assert.equal(by.ccc.verificationState, "not_tested");
  assert.equal(by.ccc.finding.verification.claimed_value, null);
  assert.equal(by.ccc.finding.verification.engine_method_tested, "ccc");
  for (const r of rows) {
    assert.ok(isUniversalFinding(r.finding));
    assert.equal(r.finding.stage, null, "projection never sets epistemic type");
    assert.equal(r.finding.status, null, "projection never sets governance");
  }
});

test("number-node linking only where the node exists; unlinked rows are kept (Rank, don't hide)", () => {
  const rows = buildMethodResultBridge({ subjectLabel: "ביטוי-סינתטי", subjectNodeId: "node-1", gwRow: GW, engineFindings: ENGINE, registryRows: REGISTRY, numberNodes: NUMBER_NODES });
  const by = Object.fromEntries(rows.map(r => [r.dbColumn, r]));
  assert.deepEqual(by.aaa.numberNode, { id: "n-100", label: "100", identityKey: null });
  assert.deepEqual(by.aaa.hrefs, { number: "/number/100", hub: "/entity-hub-preview/number/100" });
  assert.deepEqual(by.aaa.finding.projection.relations, [{ type: "method-result-link", methodKey: "שיטה-א", dbColumn: "aaa", value: 100, toNodeId: "n-100", toType: "number" }]);
  assert.equal(by.aaa.finding.identity.entityRef, "node-1");
  assert.equal(by.bbb.numberNode, null);
  assert.equal(by.bbb.hrefs, null);
  assert.deepEqual(by.bbb.finding.projection.relations, [], "no node ⇒ no link; still no edge invented");
  assert.ok(rows.length === 3, "row without a number node is not dropped");
});

test("no gematria_words row: every method is not_tested, no claim fields, still linkable", () => {
  const rows = buildMethodResultBridge({ subjectLabel: "ביטוי-סינתטי", gwRow: null, engineFindings: ENGINE, registryRows: REGISTRY, numberNodes: NUMBER_NODES });
  assert.ok(rows.every(r => r.verificationState === "not_tested" && r.storedValue === null && r.finding.verification.claimed_expression === null));
  assert.equal(rows.find(r => r.dbColumn === "aaa").hrefs.hub, "/entity-hub-preview/number/100");
});

test("inputs are not mutated; empty inputs yield empty output", () => {
  const before = JSON.stringify({ ENGINE, REGISTRY, GW, NUMBER_NODES });
  buildMethodResultBridge({ subjectLabel: "x", gwRow: GW, engineFindings: ENGINE, registryRows: REGISTRY, numberNodes: NUMBER_NODES });
  assert.equal(JSON.stringify({ ENGINE, REGISTRY, GW, NUMBER_NODES }), before);
  assert.deepEqual(buildMethodResultBridge({}), []);
  assert.deepEqual(buildMethodResultBridge({ subjectLabel: "x", engineFindings: [{ kind: "els" }] }), [], "non-gematria findings are ignored");
});

test("phrase → entity links only for existing nodes; first node per label wins; hub href encoded", () => {
  const links = buildPhraseEntityLinks([
    { id: "e1", label: "ביטוי א", identity_key: "gw:abc" },
    { id: "e2", label: "ביטוי א", identity_key: "gw:dup" },
    { id: "e3", label: "  ", identity_key: null },
    { id: null, label: "ללא-מזהה" },
  ]);
  assert.deepEqual(Object.keys(links), ["ביטוי א"]);
  assert.deepEqual(links["ביטוי א"], { nodeId: "e1", identityKey: "gw:abc", href: `/entity-hub-preview/entity/${encodeURIComponent("ביטוי א")}` });
  assert.deepEqual(buildPhraseEntityLinks([]), {});
});

// UNIVERSAL_EXPLORER_V1_SLICE1_GENERIC_LIST_MODE (work_log e3097bb5): buildEntityListQuery is
// the pure, network-free query-shape builder for the generic node-type list-mode reader —
// proves bounds clamping, deterministic compound ordering, and type isolation without mocking
// Supabase (this codebase has no supabase-mocking convention; the actual fetch stays thin).

test("buildEntityListQuery: default limit/offset applied when omitted", () => {
  const q = buildEntityListQuery({ type: "number" });
  assert.equal(q.type, "number");
  assert.equal(q.limit, 24);
  assert.equal(q.rangeStart, 0);
  assert.equal(q.rangeEnd, 24, "rangeEnd = rangeStart + limit, so range() fetches limit+1 rows for hasMore detection");
  assert.equal(q.activeOnly, true);
});

test("buildEntityListQuery: limit is clamped to [1, 100], never trusts caller-supplied extremes", () => {
  assert.equal(buildEntityListQuery({ type: "number", limit: 0 }).limit, 1);
  assert.equal(buildEntityListQuery({ type: "number", limit: -5 }).limit, 1);
  assert.equal(buildEntityListQuery({ type: "number", limit: 99999 }).limit, 100);
  assert.equal(buildEntityListQuery({ type: "number", limit: "not-a-number" }).limit, 24, "non-numeric falls back to the default, never NaN/unbounded");
});

test("buildEntityListQuery: offset never goes negative", () => {
  assert.equal(buildEntityListQuery({ type: "number", offset: -10 }).rangeStart, 0);
  assert.equal(buildEntityListQuery({ type: "number", offset: 50 }).rangeStart, 50);
});

test("buildEntityListQuery: ordering is a fixed, deterministic compound key regardless of input (stable pagination)", () => {
  const a = buildEntityListQuery({ type: "number" });
  const b = buildEntityListQuery({ type: "book", limit: 5, offset: 100 });
  assert.deepEqual(a.order, [["created_at", false], ["id", true]]);
  assert.deepEqual(a.order, b.order, "the compound order never varies by type/limit/offset — no caller can destabilize pagination");
});

test("buildEntityListQuery: type isolation — the requested type passes through exactly, trimmed, never substituted or defaulted to another type", () => {
  assert.equal(buildEntityListQuery({ type: "event" }).type, "event");
  assert.equal(buildEntityListQuery({ type: "  year  " }).type, "year", "whitespace trimmed, value otherwise untouched");
  assert.equal(buildEntityListQuery({ type: "" }).type, "", "empty type stays empty — never silently defaults to some other type");
  assert.equal(buildEntityListQuery({}).type, "", "missing type stays empty — the fetch wrapper short-circuits on this rather than querying all types");
});

test("buildEntityListQuery: activeOnly defaults true and respects an explicit false (the pure builder stays generic — allowlist/force-true enforcement lives in resolveExplorerListParams, tested below)", () => {
  assert.equal(buildEntityListQuery({ type: "number" }).activeOnly, true);
  assert.equal(buildEntityListQuery({ type: "number", activeOnly: false }).activeOnly, false);
});

// GPT challenge 165a9e59 correction (2): finite, non-negative, integer normalization — Infinity
// and fractional inputs must never reach .range() unchanged.

test("buildEntityListQuery: Infinity limit/offset fall back to the default/zero, never pass through", () => {
  const q = buildEntityListQuery({ type: "number", limit: Infinity, offset: Infinity });
  assert.equal(q.limit, 24, "Infinity is not a finite limit — falls back to the default");
  assert.equal(q.rangeStart, 0, "Infinity is not a finite offset — falls back to 0");
});

test("buildEntityListQuery: -Infinity and NaN also fall back cleanly", () => {
  assert.equal(buildEntityListQuery({ type: "number", limit: -Infinity }).limit, 24);
  assert.equal(buildEntityListQuery({ type: "number", limit: NaN }).limit, 24);
  assert.equal(buildEntityListQuery({ type: "number", offset: NaN }).rangeStart, 0);
});

test("buildEntityListQuery: fractional limit/offset are truncated to integers, not passed through fractional", () => {
  const q = buildEntityListQuery({ type: "number", limit: 2.7, offset: 5.9 });
  assert.equal(q.limit, 2, "Math.trunc(2.7) = 2, never rounded up or left fractional");
  assert.equal(q.rangeStart, 5, "Math.trunc(5.9) = 5");
  assert.equal(Number.isInteger(q.limit), true);
  assert.equal(Number.isInteger(q.rangeStart), true);
  assert.equal(Number.isInteger(q.rangeEnd), true);
});

// GPT challenge 165a9e59 correction (1): the v1 populated-facet allowlist + forced activeOnly.
// resolveExplorerListParams is pure and fully covers this without any network mock.

test("resolveExplorerListParams: allowlisted types resolve, always with activeOnly forced true", () => {
  for (const type of ["number", "entity", "event", "year", "word", "phrase", "foreign_word", "language_bridge"]) {
    const resolved = resolveExplorerListParams({ type, activeOnly: false });
    assert.ok(resolved, `${type} should be allowlisted`);
    assert.equal(resolved.type, type);
    assert.equal(resolved.activeOnly, true, "activeOnly:false from the caller must be overridden, never honored");
  }
});

test("resolveExplorerListParams: non-facet node families are rejected, never silently broadened to (e.g. rule/post/image are real, populated node types that must not leak in as an Explorer facet)", () => {
  for (const type of ["rule", "post", "image", "contribution", "convergence"]) {
    assert.equal(resolveExplorerListParams({ type }), null, `${type} must not resolve — it is not a v1 Explorer facet`);
  }
});

test("resolveExplorerListParams: entity_types with zero real nodes are rejected too, not silently allowed through as an empty facet", () => {
  for (const type of ["verse", "name", "person", "place", "object", "research", "fieldmap", "relationship"]) {
    assert.equal(resolveExplorerListParams({ type }), null, `${type} must not resolve — zero real nodes per the empty-facet rule`);
  }
});

test("resolveExplorerListParams: missing/empty type rejects deterministically", () => {
  assert.equal(resolveExplorerListParams({}), null);
  assert.equal(resolveExplorerListParams({ type: "" }), null);
  assert.equal(resolveExplorerListParams({ type: "   " }), null);
});

// ── Slice 7 (UNIVERSAL_EXPLORER_V1_SLICE7_SEARCH_COMPOSITION, work_log dispatch c0612463):
// buildEntityListQuery's new `search` field — proves the search term itself is normalized
// (trimmed, wildcard-stripped) BEFORE fetchEntityListByType ever builds a query, and that an
// absent/empty q leaves the shape byte-identical to every pre-Slice-7 assertion above (no `q`
// key was passed to buildEntityListQuery in any test above this point, and search is still null
// there) ─────────────────────────────────────────────────────────────────────────────────────

test("buildEntityListQuery: no q (or empty/whitespace q) yields search:null — byte-identical to pre-Slice-7 shape", () => {
  assert.equal(buildEntityListQuery({ type: "number" }).search, null);
  assert.equal(buildEntityListQuery({ type: "number", q: "" }).search, null);
  assert.equal(buildEntityListQuery({ type: "number", q: "   " }).search, null);
  assert.equal(buildEntityListQuery({ type: "number", q: null }).search, null);
});

test("buildEntityListQuery: q is trimmed and passed through as the search term", () => {
  assert.equal(buildEntityListQuery({ type: "number", q: "  1237  " }).search, "1237");
  assert.equal(buildEntityListQuery({ type: "word", q: "  התגלות  " }).search, "התגלות");
});

test("buildEntityListQuery: q strips Postgres LIKE wildcard chars so it can never be interpreted as a wildcard", () => {
  assert.equal(buildEntityListQuery({ type: "number", q: "%25off_" }).search, "25off");
  assert.equal(buildEntityListQuery({ type: "number", q: "%_" }).search, null, "a query of pure wildcard chars normalizes to no search at all");
});

test("buildEntityListQuery: search is independent of type/limit/offset — same normalization regardless", () => {
  assert.equal(buildEntityListQuery({ type: "book", limit: 5, offset: 100, q: " אור " }).search, "אור");
});
