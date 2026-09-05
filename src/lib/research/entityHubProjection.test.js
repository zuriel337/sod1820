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
import { buildMethodResultBridge, buildPhraseEntityLinks } from "./entityHubProjection.js";
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
