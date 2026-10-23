import test from "node:test";
import assert from "node:assert/strict";
import { buildWorldMainStoryProjection } from "../src/lib/research/worldMainStoryProjection.js";

function finding(id, {
  status = "approved",
  access = "public",
  verification = "match",
  target = id,
  sourceRef = `channel_updates:${id}`,
  meterScore = null,
  quality = null,
  occurrenceCount = 1,
  independentSourceCount,
} = {}) {
  return {
    id: `research:${id}`,
    sourceId: id,
    family: "research_object",
    statement: `ממצא ${id}`,
    secondary: `תקציר ${id}`,
    kind: "observation",
    status,
    access,
    verification,
    sourceRef,
    sourceRefs: [sourceRef],
    sourceHref: "https://example.com/source",
    canonicalFindingHref: `/world?finding=${id}#finding-${id}`,
    treeMatches: target ? [{ type: "topic", key: target, label: `יעד ${target}` }] : [],
    linkedTopicRating: target ? { meterScore, quality } : null,
    occurrenceCount,
    ...(independentSourceCount === undefined ? {} : { independentSourceCount }),
  };
}

test("main story accepts only public approved/canonical findings with match plus a tree target", () => {
  const projection = buildWorldMainStoryProjection({ rows: [
    finding("strong"),
    finding("candidate", { status: "candidate" }),
    finding("private", { access: "private" }),
    finding("unverified", { verification: "not_tested" }),
    finding("unconnected", { target: null }),
  ] });

  assert.deepEqual(projection.items.map((item) => item.id), ["strong"]);
  assert.equal(projection.publicOnly, true);
  assert.equal(projection.items[0].connectionStrength, "strong");
  assert.equal(projection.items[0].status, "approved");
  assert.equal(projection.items[0].access, "public");
});

test("main story preserves separate axes and never invents missing independence or quality", () => {
  const projection = buildWorldMainStoryProjection({ rows: [
    finding("measured", { meterScore: 91, quality: 8, independentSourceCount: 2 }),
    finding("unmeasured"),
  ] });

  const measured = projection.items.find((item) => item.id === "measured");
  const unmeasured = projection.items.find((item) => item.id === "unmeasured");
  assert.equal(measured.evidenceQuality, 8);
  assert.equal(measured.independentSourceCount, 2);
  assert.match(measured.whySelected.join(" "), /לא ציון אמת/);
  assert.equal(unmeasured.evidenceQuality, null);
  assert.equal(unmeasured.independentSourceCount, null);
  assert.equal(unmeasured.independentSourceCountLabel, "אין נתון");
});

test("main story keeps one duplicate representative and all preserved occurrences", () => {
  const projection = buildWorldMainStoryProjection({ rows: [
    {
      ...finding("long-version", { occurrenceCount: 3 }),
      occurrences: [
        { sourceId: "short-a", sourceRef: "channel_updates:a" },
        { sourceId: "short-b", sourceRef: "channel_updates:b" },
        { sourceId: "long-version", sourceRef: "channel_updates:c" },
      ],
    },
  ] });

  assert.equal(projection.items.length, 1);
  assert.equal(projection.items[0].id, "long-version");
  assert.equal(projection.items[0].occurrenceCount, 3);
  assert.deepEqual(
    projection.items[0].occurrences.map((occurrence) => occurrence.sourceRef),
    ["channel_updates:a", "channel_updates:b", "channel_updates:c"],
  );
});

test("opening selection favors source and target diversity with stable bounded fallback", () => {
  const projection = buildWorldMainStoryProjection({ rows: [
    finding("a", { target: "shared", sourceRef: "channel_updates:shared", meterScore: 99 }),
    finding("b", { target: "shared", sourceRef: "channel_updates:other", meterScore: 98 }),
    finding("c", { target: "unique", sourceRef: "channel_updates:unique", meterScore: 60 }),
  ] }, { limit: 2 });

  assert.deepEqual(projection.items.map((item) => item.id), ["a", "c"]);
  assert.equal(projection.displayedCount, 2);
  assert.equal(projection.eligibleCount, 3);
});

test("main story keeps exact public finding and verified source links", () => {
  const projection = buildWorldMainStoryProjection({ rows: [finding("exact")] });
  assert.equal(projection.items[0].canonicalFindingHref, "/world?finding=exact#finding-exact");
  assert.equal(projection.items[0].sourceHref, "https://example.com/source");
  assert.equal(projection.items[0].sourceRef, "channel_updates:exact");
});
