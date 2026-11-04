import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicWorldContentProjectionV1 } from "../src/lib/research/publicWorldContentProjectionV1.js";
import { mergeZviFindingsIntoWorldProjection } from "../src/lib/research/worldZviContentProjection2029.js";
import { researchObjectToUniversalFinding } from "../src/lib/research/researchObjectFinding.js";

const one = "e720a119-00e7-4e27-8c8a-d8671ae7b474";
const two = "f720a119-00e7-4e27-8c8a-d8671ae7b474";
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const sourceRef = (uuid) => `channel_updates:${uuid}`;
function row(n, sourceId = one, extra = {}) {
  const research = { id: id(n), source_ref: `${sourceRef(sourceId)}#exact`, status: "approved", privacy_scope: "public" };
  return {
    id: research.id,
    sourceRef: sourceRef(sourceId),
    findingRef: researchObjectToUniversalFinding(research).id,
    href: `/world?finding=${research.id}`,
    publicationState: "approved",
    verificationState: null,
    ...extra,
  };
}
const first = row(1);
const base = buildPublicWorldContentProjectionV1({
  sources: [{ sourceRef: sourceRef(one), title: "מקור א" }, { sourceRef: sourceRef(two), title: "מקור ב" }],
  occurrences: [{ occurrenceRef: "source:a:occurrence", sourceRef: sourceRef(one), href: "/world?source=a" }],
  findings: [{ findingRef: first.findingRef, sourceRefs: [first.sourceRef], href: first.href,
    verificationState: "mismatch", publicationState: "canonical" }],
  treeRelations: [{ findingRef: first.findingRef, targetRef: "node:existing", edgeRef: "edge:existing" }],
});

test("reader findings use the canonical universal identity and attach to exact existing sources without inventing tree edges", () => {
  const snapshot = JSON.stringify(base);
  const result = mergeZviFindingsIntoWorldProjection(base, [
    { rows: [first, row(2, two)], hasMore: true },
    { rows: [row(2, two)], hasMore: false },
  ], { complete: true });
  assert.equal(JSON.stringify(base), snapshot);
  assert.equal(result.findings.length, 2);
  assert.deepEqual(result.findings.find((item) => item.findingRef === row(2, two).findingRef).sourceRefs, [sourceRef(two)]);
  assert.equal(result.findings.find((item) => item.findingRef === first.findingRef).verificationState, "mismatch");
  assert.equal(result.findings.find((item) => item.findingRef === row(2, two).findingRef).verificationState, null);
  assert.deepEqual(result.treeRelations, base.treeRelations);
  assert.equal(result.metrics.findings, 2);
  assert.deepEqual(result.occurrences, base.occurrences);
});

test("an unavailable exact source is never guessed, and the total remains unknown", () => {
  const absent = row(3, "a720a119-00e7-4e27-8c8a-d8671ae7b474");
  const result = mergeZviFindingsIntoWorldProjection(base, [{ rows: [row(2, two), absent], hasMore: false }], { complete: true });
  assert.equal(result.findings.length, 2);
  assert.equal(result.findings.some((item) => item.findingRef === absent.findingRef), false);
  assert.equal(result.coverage.findings.available, false);
  assert.equal(result.metrics.findings, null);
  assert.deepEqual(result.treeRelations, base.treeRelations);
});

test("raw or tampered identities, paths, publication states and source locations are rejected", () => {
  const altered = [
    row(3, one, { findingRef: id(3) }),
    row(4, one, { href: "/world?finding=other" }),
    row(5, one, { publicationState: "candidate" }),
    row(6, one, { sourceRef: `${sourceRef(one)}#bad` }),
  ];
  const result = mergeZviFindingsIntoWorldProjection(base, [{ rows: altered, hasMore: false }], { complete: true });
  assert.deepEqual(result.findings, base.findings);
  assert.equal(result.metrics.findings, null);
});

test("partial, omitted and unavailable pages never turn into a false complete count", () => {
  for (const pages of [[], [{ rows: [] }], [{ rows: [], hasMore: true }], [{ rows: [], hasMore: false, omittedForReview: true }],
    [{ rows: [], hasMore: false, omittedUnavailable: true }], [null]]) {
    const result = mergeZviFindingsIntoWorldProjection(base, pages, { complete: true });
    assert.equal(result.coverage.findings.available, false);
    assert.equal(result.metrics.findings, null);
  }
  const result = mergeZviFindingsIntoWorldProjection(base, [{ rows: [row(2)], hasMore: false }]);
  assert.equal(result.metrics.findings, null);
  assert.equal(result.findings.length, 2);
});

test("a conflicting source for the same finding is not silently added or counted complete", () => {
  const conflict = row(1, two);
  const result = mergeZviFindingsIntoWorldProjection(base, [{ rows: [conflict], hasMore: false }], { complete: true });
  assert.deepEqual(result.findings, base.findings);
  assert.equal(result.metrics.findings, null);
});

test("fabricated verification, stage and graph hints on new rows do not become assertions", () => {
  const input = row(2, one, { verificationState: "match", stage: "finding", nodeId: "123", edgeRef: "edge:fake" });
  const result = mergeZviFindingsIntoWorldProjection(base, [{ rows: [input], hasMore: false }], { complete: true });
  const finding = result.findings.find((item) => item.findingRef === input.findingRef);
  assert.equal(finding.verificationState, null);
  assert.equal(finding.stage, null);
  assert.deepEqual(result.treeRelations, base.treeRelations);
});
