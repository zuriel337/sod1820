import test from "node:test";
import assert from "node:assert/strict";

import {
  clusterWorldResearchRows,
  normalizeResearchClaimForDuplicateCluster,
} from "../src/lib/research/worldFindingClusters.js";
import {
  buildWorldAllResearchProjection,
  filterWorldAllResearchRows,
} from "../src/lib/research/worldAllResearchProjection.js";

function finding(overrides = {}) {
  return {
    id: overrides.id || "research:a",
    sourceId: overrides.sourceId || "a",
    family: "research_object",
    kind: "relation",
    statement: "רחל מבכה ↔ ארחמנו — 305",
    originalStatement: "רחל מבכה ↔ ארחמנו — 305",
    value: 305,
    access: "private",
    status: "candidate",
    verification: "match",
    source: "channel_updates",
    sourceLabel: "תורת הרמז",
    sourceRef: "channel_updates:a#batch0",
    sourceRefs: ["channel_updates:a#batch0"],
    contributor: "חוקר א",
    createdAt: "2026-10-01T00:00:00.000Z",
    confidence: 60,
    ...overrides,
  };
}

test("claim normalization mirrors the conservative database identity", () => {
  assert.equal(
    normalizeResearchClaimForDuplicateCluster("  רחל  ‘מבכה’ — ארחמנו  "),
    normalizeResearchClaimForDuplicateCluster("רחל מבכה - ארחמנו"),
  );
  assert.notEqual(
    normalizeResearchClaimForDuplicateCluster("יקיר + אפרים"),
    normalizeResearchClaimForDuplicateCluster("יקיר אפרים"),
  );
});

test("exact duplicates become one non-destructive cluster and the longest source text wins", () => {
  const shorter = finding({
    id: "research:short",
    sourceId: "short",
    originalStatement: "רחל מבכה ↔ ארחמנו—305",
    sourceRef: "channel_updates:short#batch0",
    sourceRefs: ["channel_updates:short#batch0"],
    sourceContributorId: "10000000-0000-4000-8000-000000000001",
  });
  const longer = finding({
    id: "research:long",
    sourceId: "long",
    originalStatement: "רחל  מבכה ↔ ארחמנו — 305",
    sourceRef: "channel_updates:long#batch0",
    sourceRefs: ["channel_updates:long#batch0", "archive:long"],
    contributor: "חוקר ב",
    createdAt: "2026-10-02T00:00:00.000Z",
    sourceContributorId: "20000000-0000-4000-8000-000000000002",
  });

  const result = clusterWorldResearchRows([shorter, longer]);

  assert.equal(result.rows.length, 1);
  assert.equal(result.duplicateGroups, 1);
  assert.equal(result.duplicateOccurrences, 1);
  assert.equal(result.nonDestructive, true);
  assert.equal(result.rows[0].id, "research:long");
  assert.equal(result.rows[0].canonicalSelection, "longest_original_statement");
  assert.equal(result.rows[0].occurrenceCount, 2);
  assert.equal(result.rows[0].duplicateOccurrenceCount, 1);
  assert.deepEqual(result.rows[0].sourceRefs.sort(), [
    "archive:long",
    "channel_updates:long#batch0",
    "channel_updates:short#batch0",
  ]);
  assert.deepEqual(result.rows[0].contributors.sort(), ["חוקר א", "חוקר ב"]);
  assert.deepEqual(result.rows[0].sourceContributorIds.sort(), [
    "10000000-0000-4000-8000-000000000001",
    "20000000-0000-4000-8000-000000000002",
  ]);
  assert.deepEqual(result.rows[0].occurrences.map((row) => row.sourceContributorId).sort(), [
    "10000000-0000-4000-8000-000000000001",
    "20000000-0000-4000-8000-000000000002",
  ]);
  assert.deepEqual(result.rows[0].occurrences.map((row) => row.id).sort(), ["research:long", "research:short"]);
});

test("truth, access and governance disagreements are never auto-clustered", () => {
  const base = finding({ id: "research:base" });
  const rows = [
    base,
    finding({ id: "research:value", value: 306 }),
    finding({ id: "research:kind", kind: "fact" }),
    finding({ id: "research:access", access: "public" }),
    finding({ id: "research:status", status: "approved" }),
    finding({ id: "research:verification", verification: "legacy_signal" }),
  ];

  const result = clusterWorldResearchRows(rows);
  assert.equal(result.rows.length, rows.length);
  assert.equal(result.duplicateGroups, 0);
  assert.equal(result.duplicateOccurrences, 0);
});

test("non-research families pass through unchanged", () => {
  const source = { id: "source:a", family: "source_message", statement: "אותו טקסט" };
  const contribution = { id: "contribution:a", family: "contribution", statement: "אותו טקסט" };
  const result = clusterWorldResearchRows([source, contribution]);

  assert.deepEqual(result.rows, [source, contribution]);
  assert.equal(result.duplicateGroups, 0);
});

test("the World projection reports raw rows, clustered rows and all contributing sources", () => {
  const raw = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      created_at: "2026-10-01T00:00:00.000Z",
      kind: "relation",
      statement: "רחל מבכה ↔ ארחמנו—305",
      value: 305,
      source: "channel_updates",
      source_ref: "channel_updates:one#batch0",
      contributor: "חוקר א",
      confidence: 60,
      status: "candidate",
      privacy_scope: "private",
      engine_detail: { verification_state: "match" },
      meta: {},
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      created_at: "2026-10-02T00:00:00.000Z",
      kind: "relation",
      statement: "רחל  מבכה ↔ ארחמנו — 305",
      value: 305,
      source: "channel_updates",
      source_ref: "channel_updates:two#batch0",
      contributor: "חוקר ב",
      confidence: 65,
      status: "candidate",
      privacy_scope: "private",
      engine_detail: { verification_state: "match" },
      meta: {},
    },
  ];

  const projection = buildWorldAllResearchProjection({ researchObjects: raw });

  assert.equal(projection.rawLoaded, 2);
  assert.equal(projection.loaded, 1);
  assert.equal(projection.duplicateProjection.groups, 1);
  assert.equal(projection.duplicateProjection.occurrencesCombined, 1);
  assert.equal(projection.rows[0].occurrenceCount, 2);
  assert.equal(filterWorldAllResearchRows(projection.rows, { contributor: "חוקר א" }).length, 1);
  assert.equal(filterWorldAllResearchRows(projection.rows, { query: "channel_updates:one" }).length, 1);
});
