import test from "node:test";
import assert from "node:assert/strict";
import { publicProvenPostSourceUpdate, PROVEN_POST_SOURCE_UPDATES, orderedSourceUpdates, provenUpdateForHash, formatUpdateDate } from "./postSourceUpdates2029.js";

const UPDATED = "2026-10-10T23:19:35.974936+00:00";
const reviewedPost = (extra = {}) => ({
  id: 5107,
  slug: "sharshar-elections-redemption-hints-draft",
  title: "הבחירות לכנסת ה־26",
  home_hidden: false,
  source: "ai",
  tags: ["הבחירות", "שרשר"],
  modified: UPDATED,
  ...extra,
});

test("only the owner-certified BEFORE→AFTER 5107 section is a public source-update projection", () => {
  const proof = PROVEN_POST_SOURCE_UPDATES[5107].find((entry) => entry.id === "netanyahu-77-mazal");
  assert.equal(proof.beforeRevision, 183);
  assert.equal(proof.afterRevision, 184);
  const event = publicProvenPostSourceUpdate(reviewedPost());
  assert.equal(event.kind, "source_fragment_revision");
  assert.equal(event.sourceRef, "posts:5107");
  assert.equal(event.fragmentRef, "posts:5107#netanyahu-77-mazal");
  assert.equal(event.eventKey, "posts:5107#netanyahu-77-mazal@revision:184");
  assert.equal(event.at, "2026-10-10T23:19:35.974Z");
  assert.equal(event.label, "נתניהו בן 77 — מזל ופרשת בראשית");
  assert.equal(event.targetHref, "/post/sharshar-elections-redemption-hints-draft#netanyahu-77-mazal");
});

test("no event for cover-only edits, changed content version, or unknown section identity", () => {
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ modified: "2026-10-11T21:21:26Z" })), null);
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ modified: "2026-10-10T20:00:00Z" })), null);
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ slug: "unrelated" })), null);
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ id: 5112 })), null);
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ content: "<p>the audited section was removed</p>" })), null);
  assert.ok(publicProvenPostSourceUpdate(reviewedPost({ content: '<section id="netanyahu-77-mazal"></section>' })));
});

test("a hidden, draft/forum or internal carrier can never create a public update", () => {
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ home_hidden: true })), null);
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ tags: ["טיוטה"] })), null);
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ tags: ["פורום"] })), null);
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ source: "gpt-draft" })), null);
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ source: "web" })), null);
  assert.equal(publicProvenPostSourceUpdate(reviewedPost({ modified: null })), null);
});

test("event is a safe public label / location, never raw post_revisions or private research", () => {
  const update = publicProvenPostSourceUpdate(reviewedPost());
  const raw = JSON.stringify(update);
  assert.equal(raw.includes("post_revisions"), false);
  assert.equal(raw.includes("content"), false);
  assert.equal(raw.includes("research_objects"), false);
  assert.deepEqual(Object.keys(update).sort(), [
    "at", "attribution", "eventKey", "fragmentRef", "kind", "label",
    "revision", "sourceRef", "targetHref", "targetId",
  ].sort());
});

test("the three 205->206 source units are listed newest-first with the real addition time, Netanyahu keeps its own", () => {
  const ordered = orderedSourceUpdates([...PROVEN_POST_SOURCE_UPDATES[5107]]);
  assert.deepEqual(ordered.map((entry) => entry.id), ["sharshar-shoes-66", "sharshar-knesset-source", "sharshar-monthly-help-requests", "netanyahu-77-mazal"]);
  assert.equal(ordered[0].label, "שרשר · נעליים · בן דוד = 66");
  assert.equal(ordered[0].updatedAt, "2026-10-12T13:52:58.270789Z");
  assert.equal(ordered[3].updatedAt, "2026-10-10T23:19:35.974936Z");
  assert.equal(formatUpdateDate(ordered[0].updatedAt), "12.10.2026");
  const event = publicProvenPostSourceUpdate(reviewedPost({ modified: "2026-10-12T13:52:58.270789Z" }));
  assert.equal(event.revision, 206);
  assert.equal(event.targetHref, "/post/sharshar-elections-redemption-hints-draft#sharshar-shoes-66");
});

test("native hash resolves only to a proven unit of the same post", () => {
  assert.equal(provenUpdateForHash(5107, "#sharshar-knesset-source").id, "sharshar-knesset-source");
  assert.equal(provenUpdateForHash(5107, "#netanyahu-77-mazal").id, "netanyahu-77-mazal");
  assert.equal(provenUpdateForHash(5107, "#unknown"), null);
  assert.equal(provenUpdateForHash(5112, "#sharshar-shoes-66"), null);
  assert.equal(provenUpdateForHash(5107, "#%E0%A4%A"), null);
});

test("Bennett 207->208 units are certified with the exact saved time and only for their own slug", () => {
  const entries = PROVEN_POST_SOURCE_UPDATES[5113];
  assert.deepEqual(entries.map((entry) => entry.targetId), ["bennett-israel-78", "bennett-dead-sea-sequence"]);
  assert.ok(entries.every((entry) => entry.beforeRevision === 207 && entry.afterRevision === 208 && entry.updatedAt === "2026-10-12T14:06:54.127591Z"));
  const event = publicProvenPostSourceUpdate({ id: 5113, slug: "bennett-melach-631-78", source: "ai", tags: [], modified: "2026-10-12T14:06:54.127591Z" });
  assert.equal(event.revision, 208);
  assert.equal(event.fragmentRef, "posts:5113#bennett-israel-78");
  assert.equal(publicProvenPostSourceUpdate({ id: 5113, slug: "bennett-melach-631-78", source: "ai", tags: [], modified: "2026-10-03T00:00:00Z" }), null);
  assert.equal(provenUpdateForHash(5113, "#bennett-dead-sea-sequence").id, "bennett-dead-sea-sequence");
});
