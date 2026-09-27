import assert from "node:assert/strict";
import {
  buildContributorFindingsProjection,
  deriveContributorGroupFacets,
} from "../src/lib/research/contributorFindingsProjection.js";

const contributor = {
  id: "c-zvi",
  slug: "tzvi-opoc",
  display_name: "צבי (OPOC)",
  role: "חוקר",
  wa_names: ["צבי", "OPOC1 OPOC1"],
};

const researchObjects = [
  {
    id: "r1",
    created_at: "2026-09-26T18:32:33Z",
    kind: "fact",
    statement: "גימטריית «ותשועה» = תשפ״ז (787)",
    terms: ["ותשועה"],
    value: 787,
    relates: [],
    source: "channel_updates",
    source_ref: "channel_updates:s1",
    contributor: "צבי (OPOC)",
    confidence: 90,
    engine_verified: true,
    engine_detail: { verification_state: "match", claimed_expression: "ותשועה", claimed_value: 787 },
    evidence: null,
    status: "candidate",
    privacy_scope: null,
    meta: { ext: { wa_channel_intake: { media_ref: null } } },
  },
  {
    id: "r2",
    created_at: "2026-09-26T18:32:34Z",
    kind: "relation",
    statement: "«בדוד עבדו», «כובע» ו«עכוב» שווים בגימטריה (98)",
    terms: ["בדוד עבדו", "כובע", "עכוב"],
    value: 98,
    relates: ["בדוד עבדו", "כובע", "עכוב"],
    source: "channel_updates",
    source_ref: "channel_updates:s1",
    contributor: "צבי (OPOC)",
    confidence: 90,
    engine_verified: true,
    engine_detail: { verification_state: "match", claimed_value: 98 },
    evidence: null,
    status: "candidate",
    privacy_scope: null,
    meta: { ext: { wa_channel_intake: { media_ref: null } } },
  },
  {
    id: "r3",
    created_at: "2026-09-24T16:57:15Z",
    kind: "hypothesis",
    statement: "ייתכן שארבעת המינים קשורים לצמח",
    terms: ["ארבעת המינים", "צמח"],
    value: null,
    relates: ["ארבעת המינים", "צמח"],
    source: "channel_updates",
    source_ref: "channel_updates:s2",
    contributor: "צבי (OPOC)",
    confidence: 50,
    engine_verified: null,
    engine_detail: null,
    evidence: null,
    status: "candidate",
    privacy_scope: null,
    meta: { ext: { wa_channel_intake: { media_ref: "storage-object:m1" } } },
  },
];

const sourceMessages = [
  {
    id: "s1",
    created_at: "2026-09-26T18:14:54Z",
    text: "עכוב בשינוי אותיות כובע\nותשועה = תשפ״ז",
    source: "auto",
    status: "private",
    credit: "צבי (OPOC)",
    channel: "torat-haremez",
    image_url: null,
    thumb_url: null,
    link_url: null,
  },
  {
    id: "s2",
    created_at: "2026-09-24T16:53:38Z",
    text: "קוביית ארבעת המינים",
    source: "auto",
    status: "private",
    credit: "צבי (OPOC)",
    channel: "torat-haremez",
    image_url: "https://example.test/4030.jpg",
    thumb_url: null,
    link_url: null,
  },
];

const topics = [
  {
    id: "t1",
    created_at: "2026-08-07T17:13:18Z",
    approved_at: "2026-08-07T17:13:18Z",
    slug: "620-keter",
    title: "620 — כתר",
    subtitle: null,
    search_terms: ["כתר"],
    image_ids: [],
    numbers: [620],
    highlight_numbers: [620],
    status: "approved",
    quality: 4,
    meter_score: 80,
    created_by: "צבי (OPOC)",
  },
];

const lexicalRows = [
  { phrase: "ותשועה", world: "גאולה", tags: ["תשפ״ז"], is_verified: true, is_published: false },
  { phrase: "צמח", world: "גאולה", tags: ["משיח"], is_verified: true, is_published: true },
];

const projection = buildContributorFindingsProjection({
  contributor,
  researchObjects,
  sourceMessages,
  contributions: [],
  topics,
  lexicalRows,
});

assert.equal(projection.contributor.slug, "tzvi-opoc");
assert.equal(projection.counts.researchObjects, 3);
assert.equal(projection.counts.sourceGroups, 2);
assert.equal(projection.counts.engineVerified, 2);
assert.equal(projection.counts.topics, 1);
assert.equal(projection.sourceGroups[0].sourceRef, "channel_updates:s1");
assert.deepEqual(projection.sourceGroups[0].values, [98, 787]);
assert.ok(projection.sourceGroups[0].facets.includes("number"));
assert.ok(projection.sourceGroups[0].facets.includes("phrase"));
assert.ok(projection.sourceGroups[0].facets.includes("relation"));
assert.ok(projection.sourceGroups[0].lexicalWorlds.includes("גאולה"));
assert.equal(projection.sourceGroups[0].topicState, "finding_only");
assert.ok(projection.sourceGroups[1].facets.includes("media"));
assert.ok(projection.sourceGroups[1].lexicalTags.includes("משיח"));

assert.deepEqual(
  deriveContributorGroupFacets(
    [{ kind: "relation", value: 828, terms: ["צמח"], relates: ["ארבעת המינים"] }],
    { image_url: "https://example.test/a.jpg" },
    [{ id: "topic:1" }]
  ).sort(),
  ["media", "number", "phrase", "relation", "source", "topic"].sort()
);

console.log("Contributor findings projection: PASS");
