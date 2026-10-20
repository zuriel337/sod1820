import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ELECTIONS_SOURCE_ID, ELECTIONS_SOURCE_SLUG,
  ELECTIONS_REVIEWED_PHRASES, projectElections631Context,
} from "../src/lib/research/contextualAxisPriority2029.js";

const post = (extra = {}) => ({
  id: ELECTIONS_SOURCE_ID, slug: ELECTIONS_SOURCE_SLUG, home_hidden: false,
  tags: ["הבחירות", "631", "1820"], source: "ai",
  content: '<h2>הבחירות</h2>' +
    '<p>הבחירות = 631</p><p>מלך ישראל = 631</p>' +
    '<p>נפתלי בנט = 631</p><p>עופר וינטר = 631</p>' +
    '<p>נס נתניהו = 631</p>' +
    '<p style="font-weight:900">עופר וינטר</p><p style="opacity:.8">מילוי = 1820</p>',
  ...extra,
});
const rows = ELECTIONS_REVIEWED_PHRASES.map((phrase) => ({
  phrase, ragil: 631, is_verified: true, is_published: phrase !== "עופר וינטר",
}));

test("active thematic axis 631 precedes source-attested 1820, with no ranking or score", () => {
  const m = projectElections631Context({ post: post(), gematriaRows: rows });
  assert.equal(m.available, true);
  assert.deepEqual(m.priority.order, [631, 1820]);
  assert.equal(m.priority.kind, "context_first_editorial_focus");
  assert.equal(m.priority.scope, "connections_not_people");
  assert.equal("score" in m.priority, false);
  assert.equal("score" in m.depth, false);
  assert.equal(m.publicMatches.length, 4);
  assert.ok(m.publicMatches.every((c) => c.value === 631 && c.method === "רגיל"));
});

test("unpublished corpus row stays authored source only; neither counts as published nor as independent evidence", () => {
  const m = projectElections631Context({ post: post(), gematriaRows: rows });
  assert.equal(m.publicMatches.some((c) => c.phrase === "עופר וינטר"), false);
  assert.equal(m.authoredClaim.evidenceKind, "authored_source_only_not_published_corpus");
  assert.equal(m.crossMethodAnchor.evidenceKind, "authored_source_only_not_published_corpus");
  assert.equal(m.crossMethodAnchor.value, 1820);
  assert.equal(m.crossMethodAnchor.method, "מילוי");
  assert.equal(m.crossMethodAnchor.engineParity, null);
  assert.equal(m.verifiedIndependentSourceCount, null);
  assert.equal(m.linkApproval, "not_mapped");
  assert.equal(m.linkedPost.status, "not_released_by_this_projection");
});

test("all six existing dimensions are present, unknown is not zero or a made-up score", () => {
  const m = projectElections631Context({ post: post(), gematriaRows: rows });
  assert.deepEqual(m.depth.dimensions.map((d) => d.key),
    ["calculations", "links", "convergence", "independence", "editor", "approval"]);
  assert.equal(m.depth.dimensions.find((d) => d.key === "independence").coverage, "unmapped");
  assert.equal(m.depth.dimensions.find((d) => d.key === "approval").coverage, "unmapped");
  assert.equal(m.depth.dimensions.find((d) => d.key === "links").coverage, "none");
  assert.ok(m.depth.numbers.every((n) => n.existingMeter === null));
  assert.ok(m.depth.numbers.every((n) => n.verified.length === 0), "published corpus != replayed engine parity");
  assert.deepEqual(m.depth.sourceCount.groups, ["post:5107"]);
});

test("canonical method parity can fill the calculations dimension only on the public corpus rows", () => {
  const verifier = (phrase, method, value) => method === "רגיל" && value === 631 && phrase !== "עופר וינטר";
  const m = projectElections631Context({ post: post(), gematriaRows: rows, verifyCalculation: verifier });
  const calculations = m.depth.dimensions.find((d) => d.key === "calculations");
  assert.equal(calculations.coverage, "partial", "verified 631, unverified 1820");
  assert.equal(m.depth.numbers.find((n) => n.value === 631).verified.length, 4);
  assert.equal(m.depth.numbers.find((n) => n.value === 1820).verified.length, 0);
  assert.equal(m.publicMatches.some((r) => r.phrase === "עופר וינטר"), false, "parity must not publish an unpublished corpus row");
  const noTrace = projectElections631Context({ post: post(), gematriaRows: rows });
  assert.equal(noTrace.depth.dimensions.find((d) => d.key === "calculations").coverage, "none");
});

test("unrelated, hidden and draft sources are rejected without using tags as authority", () => {
  for (const wrong of [post({ id: 5108 }), post({ slug: "wrong" }),
    post({ home_hidden: true }), post({ tags: ["טיוטה"] }), post({ tags: ["פורום"] })]) {
    assert.equal(projectElections631Context({ post: wrong, gematriaRows: rows }).available, false);
  }
  assert.equal(projectElections631Context({ post: post({ content: "<p>מלך ישראל = 631</p>" }), gematriaRows: rows }).available, false);
});

test("no invented 1820 witness when source is changed", () => {
  const altered = post({ content: post().content.replace("מילוי = 1820", "מילוי = 0") });
  const m = projectElections631Context({ post: altered, gematriaRows: rows });
  assert.equal(m.available, true);
  assert.equal(m.crossMethodAnchor, null);
  assert.equal(m.depth.numbers.find((n) => n.value === 1820).expressions.length, 0);
  assert.equal(m.priority.reasons.some((r) => r.includes("1820")), false);
});

test("bad rows and numerically equal but unapproved phrases cannot enter published results", () => {
  const candidates = [
    { phrase: "עופר וינטר", ragil: 631, is_verified: true, is_published: false },
    { phrase: "מלך ישראל", ragil: 631, is_verified: true, is_published: false },
    { phrase: "נפתלי בנט", ragil: 631, is_verified: false, is_published: true },
    { phrase: "הבחירות", ragil: 630, is_verified: true, is_published: true },
    { phrase: "שאול", ragil: 631, is_verified: true, is_published: true },
  ];
  const m = projectElections631Context({ post: post(), gematriaRows: candidates });
  assert.equal(m.available, true);
  assert.equal(m.publicMatches.length, 0);
  assert.equal(m.depth.sourceCount.groups.length, 1);
});

test("preview is in the existing rail, behind integrated-preview and explicit click only", () => {
  const file = readFileSync(new URL("../src/components/experience2029/SurfaceContextRail2029.jsx", import.meta.url), "utf8");
  const view = readFileSync(new URL("../src/components/experience2029/Elections631ContextPreview2029.jsx", import.meta.url), "utf8");
  assert.match(file, /VITE_INTEGRATED_PREVIEW === "true"/);
  assert.match(file, /electionsPreviewOpen && Elections631ContextPreview2029/);
  assert.match(file, /String\(context.subject.id\) === "5107"/);
  assert.match(view, /getPostBySlug\(ELECTIONS_SOURCE_SLUG\)/);
  assert.match(view, /eq\("is_published", true\)/);
  assert.match(view, /ContextDepthMeter2029/);
  assert.doesNotMatch(view, /research_objects|UPDATE|INSERT|convergence_meter/);
});
