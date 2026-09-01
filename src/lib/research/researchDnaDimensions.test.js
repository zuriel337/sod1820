// Tests for researchDnaDimensions.js — run with: node --test src/lib/research/researchDnaDimensions.test.js
// Zero external dependencies (Node's built-in test runner), mirrors triage.test.js/engagement.test.js
// convention. Exercises the REAL adapter functions (all pure — no supabase/network calls) so the
// crosswalk is proven against actual live adapter output shapes, not hand-rolled approximations.
//
// SOD1820 — RESEARCH DNA <-> UNIVERSAL FINDING DIMENSION CROSSWALK CLOSURE (Depth Dimensions
// Foundation scoping). Acceptance criteria this file proves: every live adapter is recognized and
// gets an explicit disposition; no silent coercion; unknown/unmapped stays explicit; only the 12
// ratified Research DNA dimension names are ever returned as a canonicalDimension.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalDimensionsOf, RESEARCH_DNA_DIMENSIONS, MAPPING_TYPES } from "./researchDnaDimensions.js";
import { elsStateToUniversalFindings } from "./universalFinding.js";
import { gematriaApiResultToFindings } from "./canonicalGematria.js";
import { numberAnchorToUniversalFinding } from "./numberAnchorFinding.js";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { graphNodeToUniversalFinding, graphEdgeToUniversalFinding } from "./entityGraphFinding.js";
import { topicConvergenceToUniversalFinding } from "./topicConvergence.js";

function only(findings) {
  assert.equal(findings.length, 1, "expected exactly one Finding from this fixture");
  return findings[0];
}

// ── ELS adapter (kind="els", native key "corpus") ──────────────────────────────────────────────
test("ELS finding: dimensions.corpus -> canonical Provenance, CANONICAL_DIRECT, lossless", () => {
  const findings = elsStateToUniversalFindings({
    status: "ok",
    scope: "torah",
    termRaw: "אור",
    axis: { hitId: "5_1_100" },
    findings: [],
  });
  const finding = only(findings);
  assert.equal(finding.kind, "els");
  const rows = canonicalDimensionsOf(finding);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0].nativeKey, "corpus");
  assert.equal(rows[0].nativeValue, "torah");
  assert.equal(rows[0].canonicalDimension, "Provenance");
  assert.equal(rows[0].mappingType, MAPPING_TYPES.CANONICAL_DIRECT);
  assert.equal(rows[0].lossless, true);
});

// ── Canonical Gematria adapter (kind="gematria", native key "numeric") ─────────────────────────
test("Gematria finding: dimensions.numeric -> canonical Method (NOT canonical Numeric), CANONICAL_DIRECT", () => {
  const findings = gematriaApiResultToFindings({ input: "אהרן", methods: { ragil: 256 } });
  const finding = only(findings);
  assert.equal(finding.kind, "gematria");
  const rows = canonicalDimensionsOf(finding);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nativeKey, "numeric");
  assert.deepEqual(rows[0].nativeValue, { methodKey: "ragil", value: 256 });
  assert.equal(rows[0].canonicalDimension, "Method");
  assert.notEqual(rows[0].canonicalDimension, "Numeric", "must not collide with DNA's real Numeric-Language dimension");
  assert.equal(rows[0].mappingType, MAPPING_TYPES.CANONICAL_DIRECT);
});

// ── Legacy number_anchors adapter (kind="number-anchor", native key "legacyNumberAnchor") ──────
test("Number-anchor finding: dimensions.legacyNumberAnchor -> ADAPTER_NATIVE_DETAIL, no DNA axis fabricated", () => {
  const finding = numberAnchorToUniversalFinding({ value: 1820, category: "geulah", fact: "עולה שם הוי\"ה" });
  assert.equal(finding.kind, "number-anchor");
  const rows = canonicalDimensionsOf(finding);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nativeKey, "legacyNumberAnchor");
  assert.equal(rows[0].canonicalDimension, null, "curated legacy context must never be fabricated onto a DNA axis");
  assert.equal(rows[0].mappingType, MAPPING_TYPES.ADAPTER_NATIVE_DETAIL);
  assert.equal(rows[0].lossless, true);
});

// ── research_objects adapter (kind="research-object", native key "researchObjectKind") ─────────
test("Research-object finding: dimensions.researchObjectKind -> ADAPTER_NATIVE_DETAIL, verbatim kind preserved", () => {
  const finding = researchObjectToUniversalFinding({
    id: "ro-1", kind: "hypothesis", statement: "test statement", status: "candidate",
  });
  assert.equal(finding.kind, "research-object");
  const rows = canonicalDimensionsOf(finding);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nativeKey, "researchObjectKind");
  assert.equal(rows[0].nativeValue, "hypothesis");
  assert.equal(rows[0].canonicalDimension, null);
  assert.equal(rows[0].mappingType, MAPPING_TYPES.ADAPTER_NATIVE_DETAIL);
});

// ── Entity/Graph node adapter (kind="graph-entity", native key "graphNodeType") ─────────────────
test("Graph-node finding: dimensions.graphNodeType -> canonical Semantic, CANONICAL_DERIVED", () => {
  const finding = graphNodeToUniversalFinding({ id: "n1", type: "convergence", label: "1820" });
  assert.equal(finding.kind, "graph-entity");
  const rows = canonicalDimensionsOf(finding);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nativeKey, "graphNodeType");
  assert.equal(rows[0].nativeValue, "convergence");
  assert.equal(rows[0].canonicalDimension, "Semantic");
  assert.equal(rows[0].mappingType, MAPPING_TYPES.CANONICAL_DERIVED);
});

// ── Entity/Graph edge adapter (kind="graph-relation", native key "relationFamily") ──────────────
test("Graph-edge finding: dimensions.relationFamily -> explicitly UNMAPPED, not forced into Semantic/Research", () => {
  const finding = graphEdgeToUniversalFinding({ id: "e1", from_node: "n1", to_node: "n2", relation_type: "equals" });
  assert.equal(finding.kind, "graph-relation");
  const rows = canonicalDimensionsOf(finding);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nativeKey, "relationFamily");
  assert.equal(rows[0].nativeValue, "equals");
  assert.equal(rows[0].canonicalDimension, null);
  assert.equal(rows[0].mappingType, MAPPING_TYPES.UNMAPPED);
});

// ── Topic/Convergence adapter (kind="convergence", native key "graph") ──────────────────────────
test("Convergence finding: dimensions.graph -> canonical Research, CANONICAL_DIRECT", () => {
  const finding = topicConvergenceToUniversalFinding({
    card: { id: "c1", slug: "1820", title: "1820", status: "approved" },
  });
  assert.equal(finding.kind, "convergence");
  const rows = canonicalDimensionsOf(finding);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nativeKey, "graph");
  assert.equal(rows[0].canonicalDimension, "Research");
  assert.equal(rows[0].mappingType, MAPPING_TYPES.CANONICAL_DIRECT);
});

// ── Forward-compatibility: an unrecognized adapter/kind must never throw or be silently dropped ─
test("Unknown kind + unknown native key -> explicit UNMAPPED row, never throws, never silently dropped", () => {
  const foreignFinding = {
    v: 1, kind: "some-future-adapter",
    projection: { anchors: [], relations: [], dimensions: { mysteryFacet: { anything: true } } },
  };
  const rows = canonicalDimensionsOf(foreignFinding);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].nativeKey, "mysteryFacet");
  assert.equal(rows[0].canonicalDimension, null);
  assert.equal(rows[0].mappingType, MAPPING_TYPES.UNMAPPED);
  assert.match(rows[0].notes, /No registry entry/);
});

test("A registered kind with an unregistered extra key also stays explicit, not dropped", () => {
  const finding = {
    v: 1, kind: "gematria",
    projection: { anchors: [], relations: [], dimensions: { numeric: { methodKey: "ragil", value: 256 }, extraFutureFacet: 42 } },
  };
  const rows = canonicalDimensionsOf(finding);
  assert.equal(rows.length, 2);
  const extra = rows.find(r => r.nativeKey === "extraFutureFacet");
  assert.ok(extra);
  assert.equal(extra.mappingType, MAPPING_TYPES.UNMAPPED);
});

// ── No missing/empty dimensions never throws ─────────────────────────────────────────────────
test("Finding with no projection.dimensions -> empty array, never throws", () => {
  assert.deepEqual(canonicalDimensionsOf({ kind: "els", projection: { dimensions: {} } }), []);
  assert.deepEqual(canonicalDimensionsOf({ kind: "els" }), []);
  assert.deepEqual(canonicalDimensionsOf(null), []);
  assert.deepEqual(canonicalDimensionsOf(undefined), []);
});

// ── One-System-Law guard: every non-null canonicalDimension must be one of the 12 ratified names ─
test("Every canonicalDimension across all live adapters is one of the 12 ratified Research DNA dimensions", () => {
  const dnaSet = new Set(RESEARCH_DNA_DIMENSIONS);
  assert.equal(RESEARCH_DNA_DIMENSIONS.length, 12, "11-vs-12 verdict: live vocabulary has 12 names, not 11");

  const fixtures = [
    only(elsStateToUniversalFindings({ status: "ok", scope: "torah", termRaw: "אור", axis: { hitId: "5_1_100" }, findings: [] })),
    only(gematriaApiResultToFindings({ input: "אהרן", methods: { ragil: 256 } })),
    numberAnchorToUniversalFinding({ value: 1820, category: "geulah", fact: "x" }),
    researchObjectToUniversalFinding({ id: "ro-1", kind: "hypothesis", statement: "s" }),
    graphNodeToUniversalFinding({ id: "n1", type: "convergence", label: "1820" }),
    graphEdgeToUniversalFinding({ id: "e1", from_node: "n1", to_node: "n2", relation_type: "equals" }),
    topicConvergenceToUniversalFinding({ card: { id: "c1", slug: "1820", title: "1820", status: "approved" } }),
  ];

  for (const finding of fixtures) {
    for (const row of canonicalDimensionsOf(finding)) {
      if (row.canonicalDimension !== null) {
        assert.ok(
          dnaSet.has(row.canonicalDimension),
          `kind="${finding.kind}" nativeKey="${row.nativeKey}" mapped to "${row.canonicalDimension}", ` +
          "which is not one of the 12 ratified Research DNA dimensions — a 13th taxonomy was invented."
        );
      }
    }
  }
});

// ── Purity: canonicalDimensionsOf must never mutate its input ───────────────────────────────────
test("canonicalDimensionsOf does not mutate the input finding", () => {
  const finding = topicConvergenceToUniversalFinding({
    card: { id: "c1", slug: "1820", title: "1820", status: "approved" },
  });
  const before = JSON.stringify(finding);
  canonicalDimensionsOf(finding);
  assert.equal(JSON.stringify(finding), before);
});
