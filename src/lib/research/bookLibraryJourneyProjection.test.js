import assert from "node:assert/strict";
import test from "node:test";
import { projectBookLibraryJourney } from "./bookLibraryJourneyProjection.js";

function row(id, overrides = {}) {
  return {
    id,
    label: `ספר ${id}`,
    description: "תיאור",
    identity_key: `book:${id}`,
    is_active: true,
    metadata: {
      slug: `book-${id}`,
      projection: { supports: ["2d", "layered", "3d"], canonical_coordinates: false },
      coverage_2029: { structural: "COMPLETE", exact_witness: "PARTIAL" },
      identity_tiers: { digital_object: { path: `Book/${id}.pdf` } },
    },
    ...overrides,
  };
}

test("all-books journey preserves inactive and unverified books as visible work", () => {
  const inactive = row("tanakh", {
    is_active: false,
    metadata: {
      slug: "tanakh",
      corpus: { family: "tanakh" },
      projection: { supports: ["2d", "layered", "3d"] },
      identity_tiers: { digital_object: { path: "public/tanakh.json" } },
    },
  });
  const result = projectBookLibraryJourney([row("active"), inactive]);
  const item = result.items.find(book => book.slug === "tanakh");

  assert.equal(result.summary.total, 2);
  assert.equal(result.summary.activeResearch, 1);
  assert.equal(result.summary.awaitingResearch, 1);
  assert.equal(item.status.identity.complete, true);
  assert.equal(item.status.source.complete, true);
  assert.equal(item.status.research.complete, false);
  assert.equal(item.status.verification.complete, false);
  assert.equal(item.status.publication.complete, false);
  assert.equal(item.status.research.labelHe, "טרם הופעל למחקר");
});

test("explicit point verification stays distinct from publication", () => {
  const verified = row("verified", {
    metadata: {
      slug: "verified",
      projection: { supports: ["3d"] },
      coverage_2029: {
        exact_witness: "CURRENT CLAIM-BEARING LOCI VERIFIED AGAINST EXTERNAL 2ND-EDITION WITNESS",
      },
      identity_tiers: { digital_object: { url: "https://example.invalid/book.pdf" } },
    },
  });
  const result = projectBookLibraryJourney([verified]);

  assert.equal(result.items[0].status.verification.complete, true);
  assert.equal(result.items[0].status.publication.complete, false);
  assert.equal(result.summary.pointVerified, 1);
  assert.equal(result.summary.publicDecided, 0);
});

test("projection strips source paths, prefixes and raw metadata", () => {
  const result = projectBookLibraryJourney([row("safe")]);
  const serialized = JSON.stringify(result.items[0]);

  assert.equal(Object.hasOwn(result.items[0], "metadata"), false);
  assert.equal(serialized.includes("Book/safe.pdf"), false);
  assert.equal(serialized.includes("source_ref_prefixes"), false);
  assert.equal(result.readOnly, true);
  assert.equal(result.publicationEffect, "none");
});

test("bounded result reports partial inventory without inventing missing books", () => {
  const result = projectBookLibraryJourney([row("one")], { totalCount: 31 });
  assert.equal(result.summary.total, 31);
  assert.equal(result.summary.visible, 1);
  assert.equal(result.partial, true);
});
