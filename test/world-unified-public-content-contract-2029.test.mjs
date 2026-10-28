import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPublicWorldContentProjectionV1,
  composePublicWorldContentProjectionPagesV1,
  PUBLIC_WORLD_CONTENT_PROJECTION_CONTRACT_VERSION,
} from "../src/lib/research/publicWorldContentProjectionV1.js";

const source = (sourceRef, extra = {}) => ({ sourceRef, title: sourceRef, ...extra });

test("one public envelope keeps source identity, occurrence, cluster, finding and tree relation distinct", () => {
  const projection = buildPublicWorldContentProjectionV1({
    sources: [source("channel_updates:a"), source("channel_updates:a"), source("posts:20")],
    occurrences: [
      { occurrenceRef: "occ:a:one", sourceRef: "channel_updates:a", locator: "#one", times: { occurredAt: "2026-10-01" } },
      { occurrenceRef: "occ:a:two", sourceRef: "channel_updates:a", locator: "#two", times: { publishedAt: "2026-10-02" } },
    ],
    clusters: [{ clusterRef: "cluster:a", basis: "exact_source_text", occurrenceRefs: ["occ:a:one", "occ:a:two"] }],
    seriesCategories: [{ key: "spatial-structures", kind: "category", label: "מרחבים ומבנים", sourceRefs: ["channel_updates:a"] }],
    findings: [{ findingRef: "finding:1", sourceRefs: ["channel_updates:a"], verificationState: "match" }],
    treeRelations: [{ findingRef: "finding:1", targetRef: "node:374", governanceRef: "decision:374" }],
    compatibility: { legacyTopics: [{ topicRef: "topic:old-1", title: "נושא ישן" }] },
  });

  assert.equal(projection.contractVersion, PUBLIC_WORLD_CONTENT_PROJECTION_CONTRACT_VERSION);
  assert.equal(projection.sources.length, 2);
  assert.equal(projection.occurrences.length, 2);
  assert.equal(projection.clusters.length, 1);
  assert.equal(projection.findings.length, 1);
  assert.equal(projection.treeRelations.length, 1);
  assert.equal(projection.metrics.corpusSources, 2, "occurrences, clusters, findings and Topics never inflate corpus sources");
  assert.equal(projection.metrics.legacyTopics, 1);
});

test("unavailable readers are explicit and never fabricate a zero", () => {
  const projection = buildPublicWorldContentProjectionV1({
    sources: [source("channel_updates:a")],
    coverage: { sources: { available: false }, findings: { available: false } },
  });
  assert.deepEqual(projection.coverage.sources, { available: false, total: null });
  assert.equal(projection.metrics.corpusSources, null);
  assert.deepEqual(projection.coverage.findings, { available: false, total: null });
  assert.equal(projection.metrics.findings, null);
  assert.equal(projection.coverage.occurrences.total, 0, "an available empty reader remains honestly empty");
});

test("shared author, number, category or title cannot create a tree relation", () => {
  const base = {
    sources: [source("channel_updates:a", { contributor: { slug: "tzvi-opoc", label: "צבי" } })],
    findings: [{ findingRef: "finding:1", sourceRefs: ["channel_updates:a"] }],
  };
  for (const relation of [
    { findingRef: "finding:1", targetRef: "node:374" },
    { findingRef: "finding:1", targetRef: "node:374", author: "צבי" },
    { findingRef: "finding:1", targetRef: "node:374", category: "מרחבים ומבנים" },
    { findingRef: "finding:1", targetRef: "node:374", sharedValue: 374 },
  ]) {
    assert.equal(buildPublicWorldContentProjectionV1({ ...base, treeRelations: [relation] }).treeRelations.length, 0);
  }
});

test("legacy Topics are compatibility only and no source-specific route exists", () => {
  const zvi = buildPublicWorldContentProjectionV1({
    sources: [source("channel_updates:zvi")],
    compatibility: { legacyTopics: [{ topicRef: "topic:zvi" }] },
  });
  const anotherWriter = buildPublicWorldContentProjectionV1({
    sources: [source("posts:writer")],
    compatibility: { legacyTopics: [{ topicRef: "topic:writer" }] },
  });
  assert.equal(zvi.metrics.corpusSources, 1);
  assert.equal(anotherWriter.metrics.corpusSources, 1);
  assert.equal(zvi.sources[0].sourceRef, "channel_updates:zvi");
  assert.equal(anotherWriter.sources[0].sourceRef, "posts:writer");
});

test("the 78 legacy Zvi Topics remain addressable without becoming 78 corpus sources", () => {
  const legacyTopics = Array.from({ length: 78 }, (_, index) => ({
    topicRef: `topic:zvi-${index + 1}`,
    slug: `zvi-${index + 1}`,
    href: `/topic/zvi-${index + 1}`,
  }));
  const projection = buildPublicWorldContentProjectionV1({
    sources: [source("channel_updates:zvi-a"), source("channel_updates:zvi-b")],
    compatibility: { legacyTopics },
  });
  assert.equal(projection.compatibility.legacyTopics.length, 78);
  assert.equal(projection.metrics.legacyTopics, 78);
  assert.equal(projection.metrics.corpusSources, 2);
  assert.equal(projection.coverage.legacyTopics.available, true);
});

test("page composition deduplicates source identities across supplied public pages", () => {
  const zviPage = buildPublicWorldContentProjectionV1({
    sources: [source("channel_updates:zvi-a"), source("posts:shared")],
    occurrences: [{ occurrenceRef: "occ:zvi-a", sourceRef: "channel_updates:zvi-a" }],
    compatibility: { legacyTopics: [{ topicRef: "topic:zvi" }] },
  });
  const writerPage = buildPublicWorldContentProjectionV1({
    sources: [source("posts:shared"), source("els_records:writer-a")],
    occurrences: [{ occurrenceRef: "occ:writer-a", sourceRef: "els_records:writer-a" }],
  });
  const projection = composePublicWorldContentProjectionPagesV1([zviPage, writerPage]);

  assert.equal(projection.sources.length, 3);
  assert.equal(projection.metrics.corpusSources, 3);
  assert.equal(projection.metrics.occurrences, 2);
  assert.equal(projection.metrics.legacyTopics, 1);
  assert.deepEqual(projection.sources.map((item) => item.sourceRef), [
    "channel_updates:zvi-a", "posts:shared", "els_records:writer-a",
  ]);
});

test("page composition fails coverage closed when any supplied public page is unavailable", () => {
  const availablePage = buildPublicWorldContentProjectionV1({
    sources: [source("posts:available")],
  });
  const unavailablePage = buildPublicWorldContentProjectionV1({
    sources: [source("posts:deferred")],
    coverage: { sources: { available: false }, findings: { available: false } },
  });
  const projection = composePublicWorldContentProjectionPagesV1([availablePage, unavailablePage]);

  assert.deepEqual(projection.coverage.sources, { available: false, total: null });
  assert.equal(projection.metrics.corpusSources, null);
  assert.deepEqual(projection.coverage.findings, { available: false, total: null });
  assert.equal(projection.metrics.findings, null);
});

test("empty page composition reports unknown coverage rather than a fabricated empty corpus", () => {
  const projection = composePublicWorldContentProjectionPagesV1([]);
  assert.deepEqual(projection.coverage.sources, { available: false, total: null });
  assert.equal(projection.metrics.corpusSources, null);
});
