import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicWorldContentProjectionV1 } from "../src/lib/research/publicWorldContentProjectionV1.js";
import { buildWorldUnifiedPublicContentLanding } from "../src/lib/research/worldUnifiedPublicContentLanding.js";

test("landing keeps the lightweight public people index separate from not-yet-loaded corpus totals", () => {
  const landing = buildWorldUnifiedPublicContentLanding({
    peopleIndex: { people: [{ slug: "zvi" }, { slug: "writer" }] },
  });
  assert.equal(landing.people.total, 2);
  assert.deepEqual(landing.sections.find((section) => section.key === "sources"), {
    key: "sources", label: "מקורות", available: false, total: null,
  });
  assert.equal(landing.supplied.completeCorpus, false);
});

test("landing composes supplied public pages without treating legacy Topics as sources", () => {
  const zvi = buildPublicWorldContentProjectionV1({
    sources: [{ sourceRef: "channel_updates:zvi", contributor: { slug: "tzvi-opoc" } }],
    occurrences: [{ occurrenceRef: "occ:zvi", sourceRef: "channel_updates:zvi" }],
    seriesCategories: [{ key: "spatial-structures", kind: "category", sourceRefs: ["channel_updates:zvi"] }],
    compatibility: { legacyTopics: [{ topicRef: "topic:zvi" }] },
    coverage: { findings: { available: false }, treeRelations: { available: false } },
  });
  const writer = buildPublicWorldContentProjectionV1({
    sources: [{ sourceRef: "posts:writer", contributor: { slug: "writer" } }],
    findings: [{ findingRef: "uf:writer", sourceRefs: ["posts:writer"] }],
  });
  const landing = buildWorldUnifiedPublicContentLanding({ contentPages: [zvi, writer] });

  assert.equal(landing.content.metrics.corpusSources, 2);
  assert.equal(landing.content.metrics.legacyTopics, 1);
  assert.equal(landing.sections.find((section) => section.key === "legacy-topics").compatibilityOnly, true);
  assert.deepEqual(landing.supplied.contributorSlugs, ["tzvi-opoc", "writer"]);
  assert.equal(landing.sections.find((section) => section.key === "findings").total, null,
    "one unavailable Findings page keeps the combined count unknown");
});
