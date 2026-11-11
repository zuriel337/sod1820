import test from "node:test";
import assert from "node:assert/strict";
import { publicProvenPostSourceUpdate, publicProvenPostSourceUpdates, PROVEN_POST_SOURCE_UPDATES, orderedSourceUpdates, provenUpdateForHash, formatUpdateDate, addedDateLabel, plainDayLabel } from "./postSourceUpdates2029.js";

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
  // Since 12.11.2026 the 10.11 units (rev 261->262 and 263->264) sit before them, newest first.
  assert.deepEqual(ordered.map((entry) => entry.id), ["knesset-sworn-1234-1011", "election-turnout-777-news-signal", "sharshar-shoes-66", "sharshar-knesset-source", "sharshar-monthly-help-requests", "netanyahu-77-mazal"]);
  assert.equal(ordered[2].label, "שרשר · נעליים · בן דוד = 66");
  assert.equal(ordered[2].updatedAt, "2026-10-12T13:52:58.270789Z");
  assert.equal(ordered[5].updatedAt, "2026-10-10T23:19:35.974936Z");
  assert.equal(formatUpdateDate(ordered[2].updatedAt), "12.10.2026");
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

test("a certified newer source preserves distinct child events and their real times", () => {
  const content = PROVEN_POST_SOURCE_UPDATES[5107].map(e => `<section id="${e.targetId}"></section>`).join("");
  const events = publicProvenPostSourceUpdates(reviewedPost({ modified: "2026-10-12T13:52:58.270789Z", content }));
  // modified = 12.10: the two 10.11 units belong to a LATER certified version, so they are not part of it.
  assert.equal(events.length, 4);
  assert.equal(new Set(events.map(e => e.eventKey)).size, 4);
  assert.equal(events.at(-1).revision, 184);
  assert.equal(events.at(-1).at, "2026-10-10T23:19:35.974Z");
  const removed = publicProvenPostSourceUpdates(reviewedPost({ modified: "2026-10-12T13:52:58.270789Z", content: content.replace('id="netanyahu-77-mazal"', 'id="removed"') }));
  assert.equal(removed.length, 3);
  assert.equal(publicProvenPostSourceUpdates(reviewedPost({ modified: "2026-10-13T00:00:00Z", content })).length, 0);
});

test("10.11 units: proven by snapshot intervals inside one Jerusalem day, anchored on real source ids, never guessed", () => {
  const entries = PROVEN_POST_SOURCE_UPDATES[5107];
  const byId = Object.fromEntries(entries.map((entry) => [entry.id, entry]));
  const turnout = byId["election-turnout-777-news-signal"], sworn = byId["knesset-sworn-1234-1011"];
  assert.deepEqual([turnout.beforeRevision, turnout.afterRevision, turnout.timeBasis], [261, 262, "snapshot_interval"]);
  assert.deepEqual([sworn.beforeRevision, sworn.afterRevision, sworn.timeBasis], [263, 264, "snapshot_interval"]);
  for (const entry of [turnout, sworn]) {
    assert.ok(Date.parse(entry.notBefore) < Date.parse(entry.updatedAt));
    assert.equal(addedDateLabel(entry), "10.11.2026");
  }
  // an interval that spans two Jerusalem days shows NO date, but the unit itself is still real
  assert.equal(addedDateLabel({ ...sworn, notBefore: "2026-11-09T10:00:00Z" }), "");
  assert.equal(addedDateLabel({ ...sworn, notBefore: undefined }), "");
  // event day is its own axis (27.10 turnout report, 10.11 swearing-in) and never replaces the added date
  assert.equal(plainDayLabel(turnout.eventDate), "27.10.2026");
  assert.equal(plainDayLabel(sworn.eventDate), "10.11.2026");
  assert.equal(plainDayLabel("2026-13"), "");
  assert.notEqual(plainDayLabel(turnout.eventDate), addedDateLabel(turnout));
});

test("the current certified source (posts.modified 2026-11-10T16:56:00.412935Z) keeps every unit with its own original time", () => {
  const content = PROVEN_POST_SOURCE_UPDATES[5107].map((e) => `<section id="${e.targetId}"></section>`).join("");
  const events = publicProvenPostSourceUpdates(reviewedPost({ modified: "2026-11-10T16:56:00.412935Z", content }));
  assert.equal(events.length, 6);
  assert.deepEqual(events.map((event) => event.targetId), ["knesset-sworn-1234-1011", "election-turnout-777-news-signal", "sharshar-shoes-66", "sharshar-knesset-source", "sharshar-monthly-help-requests", "netanyahu-77-mazal"]);
  assert.equal(new Set(events.map((e) => e.eventKey)).size, 6);
  // a metadata-only reader (no body) certifies only the matching revision's units
  const light = publicProvenPostSourceUpdates(reviewedPost({ modified: "2026-11-10T16:56:00.412935Z" }));
  assert.deepEqual(light.map((event) => event.targetId), ["knesset-sworn-1234-1011", "election-turnout-777-news-signal"]);
  // the 11.11 08:46 revision (1437 block) has no source id, so it is NOT an update and never an event
  assert.equal(PROVEN_POST_SOURCE_UPDATES[5107].some((entry) => entry.afterRevision === 266), false);
});
