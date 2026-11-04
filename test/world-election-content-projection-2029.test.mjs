import test from "node:test";
import assert from "node:assert/strict";
import { ELECTIONS_ISRAEL_21_26_BUNDLE } from "../src/lib/research/electionsIsrael21_26Seed2029.js";
import { buildElectionWorldContentProjection } from "../src/lib/research/worldElectionContentProjection.js";

const gallery = (id) => ({
  galleryImageId: id,
  mediaId: `media:gallery_image:${id}`,
  imageUrl: `https://example.test/${id}.jpg`,
  label: `תמונה ${id}`,
  access: { scope: "public" },
  provenance: { sourceRef: `gallery_images:${id}` },
  reopen: { galleries: [{ href: "/archive?tab=galleries&gal=1" }] },
});

test("election World content keeps sources, occurrences and evidence findings distinct", () => {
  const galleryItems = ELECTIONS_ISRAEL_21_26_BUNDLE.sources
    .map((source) => source.canonicalRef?.replace("gallery-image:", ""))
    .filter(Boolean).map(gallery);
  const publicPosts = [5107, 5113, 5098].map((id) => ({ id, slug: `post-${id}` }));
  const projection = buildElectionWorldContentProjection({ galleryItems, publicPosts });

  assert.equal(projection.contractVersion, "public-world-content-projection/v1");
  assert.equal(projection.sources.some((row) => row.sourceRef === "gallery_images:5e84ac5a-736c-4b7c-9b8c-963aa4d5da11"), true);
  assert.equal(projection.sources.some((row) => row.sourceRef === "posts:5107"), true);
  assert.equal(projection.occurrences.some((row) => row.occurrenceRef === "elections-israel-21-26:ynet-sharshar-1456-snapshot"), true);
  assert.equal(projection.findings.some((row) => row.findingRef === "elections:news-sharshar-1456-at-70pct"), true);
  assert.equal(projection.findings.find((row) => row.findingRef === "elections:news-sharshar-1456-at-70pct").publicationState, "human_gate_pending");
  assert.equal(projection.treeRelations.length, 0, "proposed relations must not become tree edges");
  assert.equal(projection.coverage.treeRelations.available, false);
});

test("unadmitted gallery and post sources fail closed rather than receiving guessed links", () => {
  const projection = buildElectionWorldContentProjection({ galleryItems: [], publicPosts: [] });
  assert.equal(projection.sources.some((row) => row.sourceRef.startsWith("gallery_images:")), false);
  assert.equal(projection.sources.some((row) => row.sourceRef.startsWith("posts:")), false);
  assert.equal(projection.sources.some((row) => row.sourceRef.includes("rybr24j6fe")), true, "external exact locator remains its own source");
});

test("capture time and branch ids do not become publication times or exact locators", () => {
  const bundle = {
    sources: [{ id: "feed-snapshot", accessTier: "public", label: "דיווח", locator: "https://example.com/feed", capturedAt: "2026-10-28T11:31:00+02:00" }],
    branchContract: { evidenceRecords: [] }, resultBundle: { findings: [] },
  };
  const projection = buildElectionWorldContentProjection({ bundle });
  assert.equal(projection.occurrences[0].locator, null);
  assert.equal(projection.occurrences[0].times.publishedAt, null);
});
