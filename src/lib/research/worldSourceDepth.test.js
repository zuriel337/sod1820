// node --test src/lib/research/worldSourceDepth.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCategoryCounts, buildSourceDepth, buildPublicNumberHighlights, projectNumberRecordHistory, project2029BuildStatus } from "./worldSourceDepthProjection.js";

test("construction percentage needs a named checklist and verified closure evidence", () => {
  assert.equal(project2029BuildStatus().percent, null);
  const milestones = [
    { id: 'reader', status: 'closed', verified: true, evidenceRef: 'review:123' },
    { id: 'ui', status: 'closed', verified: false, evidenceRef: 'claim:only' },
    { id: 'release', status: 'closed', verified: true },
    { id: 'live', status: 'pending' },
  ];
  assert.equal(project2029BuildStatus({ milestones }).percent, null);
  const status = project2029BuildStatus({ milestones, checklistRef: 'owner:reviewed-checklist-v1' });
  assert.equal(status.percent, 25);
  assert.equal(status.completed, 1);
  assert.equal(status.total, 4);
  assert.equal(status.releaseAuthorized, false);
  assert.equal(project2029BuildStatus({ checklistRef: 'checklist', milestones: [milestones[0], { ...milestones[0], verified: false }] }).percent, 0);
});

test("number record history preserves exact identities and timestamps, without claiming discovery/publication", () => {
  const row = { id: 'number-1', label: '5844', created_at: '2026-09-30T23:22:21Z', is_active: true };
  const items = projectNumberRecordHistory([row, row,
    { ...row, id: 'invalid', label: 'אריאל בן משה' },
    { ...row, id: 'inactive', is_active: false },
    { ...row, id: 'bad-time', created_at: null },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].href, '/2029/number/5844');
  assert.equal(items[0].sourceRef, 'nodes:number-1');
  assert.equal(items[0].at, '2026-09-30T23:22:21.000Z');
  assert.equal(items[0].firstPublicationVerified, false);
  assert.equal(items[0].kind, 'number_record_created');
});

test("number discovery counts distinct public topics and recent approvals, not repeated representations", () => {
  const now = Date.parse("2026-10-12T15:00:00Z");
  const topics = [
    { slug: "old", numbers: [358, 358, 1237], approved_at: "2025-01-01" },
    { slug: "recent", numbers: [1237, 14, 0, -1, "424"], approved_at: "2026-10-11" },
    { slug: "recent", numbers: [1237], approved_at: "2026-10-11" },
    { slug: "future", numbers: [358], approved_at: "2027-01-01" },
  ];
  const rows = buildPublicNumberHighlights(topics, { now });
  assert.deepEqual(rows.map(r => [r.value, r.publicTopics, r.approvedTopics7d]), [[1237, 2, 1], [14, 1, 1], [358, 2, 0]]);
  assert.equal(rows[0].basis, "public_topic_membership");
  assert.equal(rows[0].href, "/2029/number/1237");
});

const posts = [
  { id: 1, slug: "a", categories: ["סוד החשמל", "סוד החשמל", "רמזים חזקים"] },
  { id: 2, slug: "b", categories: ["סוד החשמל"] },
  { id: 2, slug: "b", categories: ["סוד החשמל"] },
  { id: 3, slug: "c", categories: [] },
];
const topics = [
  { slug: "t1", title: "נושא א" },
  { slug: "t2", title: "נושא ב" },
  { slug: "t3", title: "נושא ג" },
];

test("category counts are distinct per post and de-duplicated", () => {
  const counts = Object.fromEntries(buildCategoryCounts(posts).map((c) => [c.category, c.count]));
  assert.equal(counts["סוד החשמל"], 2);
  assert.equal(counts["רמזים חזקים"], 1);
});

test("topic links only through attested edges; no category->topic promotion", () => {
  const d = buildSourceDepth({ posts, topics, attestedLinks: [{ topicSlug: "t1", postSlug: "a" }] });
  const hashmal = d.categories.find((c) => c.category === "סוד החשמל");
  const hints = d.categories.find((c) => c.category === "רמזים חזקים");
  assert.equal(hashmal.linkState, "attested");
  assert.deepEqual(hashmal.linkedTopics.map((l) => l.topic.slug), ["t1"]);
  assert.equal(hints.linkedTopics[0].topic.slug, "t1");
  assert.equal(d.topicsLinked, 1);
});

test("no attested link -> truthful state, full unlinked directory (not first-12 sample)", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ slug: `x${i}`, title: `נושא ${i}` }));
  const d = buildSourceDepth({ posts, topics: many, attestedLinks: [] });
  assert.ok(d.categories.every((c) => c.linkState === "no_attested_link" && c.linkedTopics.length === 0));
  assert.equal(d.unlinkedTopics.length, 30);
});

test("fail closed on unknown topic or post in a link", () => {
  const d = buildSourceDepth({ posts, topics, attestedLinks: [{ topicSlug: "ghost", postSlug: "a" }, { topicSlug: "t2", postSlug: "ghost" }] });
  assert.equal(d.topicsLinked, 0);
  assert.equal(d.unlinkedTopics.length, 3);
});

test("incomplete read is surfaced, not hidden", () => {
  assert.equal(buildSourceDepth({ posts, topics, complete: false }).complete, false);
});
