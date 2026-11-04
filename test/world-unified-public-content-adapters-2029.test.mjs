import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicWorldContentProjectionV1 } from "../src/lib/research/publicWorldContentProjectionV1.js";
import {
  adaptLegacyTopicsV1,
  adaptPublicFindingRowsV1,
  adaptPublicSourceRowsV1,
} from "../src/lib/research/publicWorldContentAdaptersV1.js";

test("one adapter handles contributor, publication and news-shaped public source rows without a special corpus path", () => {
  const input = adaptPublicSourceRowsV1([
    { sourceRef: "channel_updates:zvi-1", occurrenceRef: "occ:zvi-1", title: "צורה", contributor: { slug: "tzvi-opoc", label: "צבי" }, times: { occurredAt: "2026-10-01" } },
    { sourceRef: "posts:hashmal-1", occurrenceRef: "occ:hashmal-1", title: "מאמר", publisher: { key: "sod-hashmal", label: "סוד החשמל" }, times: { publishedAt: "2026-10-02" } },
    { sourceRef: "events:news-1", occurrenceRef: "occ:news-1", title: "עדכון", times: { updatedAt: "2026-10-03" } },
  ]);
  const projection = buildPublicWorldContentProjectionV1(input);
  assert.equal(projection.sources.length, 3);
  assert.equal(projection.occurrences.length, 3);
  assert.equal(projection.metrics.corpusSources, 3);
  assert.equal(projection.sources.find((item) => item.sourceRef === "channel_updates:zvi-1").contributor.slug, "tzvi-opoc");
});

test("adapter refuses to invent a source ref and preserves distinct occurrence times", () => {
  const input = adaptPublicSourceRowsV1([
    { title: "No canonical source ref" },
    { sourceRef: "channel_updates:1", occurrenceRef: "occ:1", times: { occurredAt: "2026-01-01", publishedAt: "2026-01-02", updatedAt: "2026-01-03" } },
  ]);
  assert.equal(input.sources.length, 1);
  assert.deepEqual(input.occurrences[0].times, { occurredAt: "2026-01-01", publishedAt: "2026-01-02", updatedAt: "2026-01-03" });
});

test("78 legacy Topics remain compatibility and public findings retain exact source provenance", () => {
  const legacyTopics = adaptLegacyTopicsV1(Array.from({ length: 78 }, (_, index) => ({ id: `topic:${index}`, slug: `topic-${index}` })));
  const sources = adaptPublicSourceRowsV1([{ sourceRef: "channel_updates:1", occurrenceRef: "occ:1" }]);
  const findings = adaptPublicFindingRowsV1([{ id: "finding:1", sourceRef: "channel_updates:1", verificationState: "match" }]);
  const projection = buildPublicWorldContentProjectionV1({ ...sources, findings, compatibility: { legacyTopics } });
  assert.equal(projection.metrics.corpusSources, 1);
  assert.equal(projection.metrics.legacyTopics, 78);
  assert.deepEqual(projection.findings[0].sourceRefs, ["channel_updates:1"]);
});
