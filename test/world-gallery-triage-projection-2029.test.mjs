import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchWorldGalleryTriageProjection,
  projectWorldGalleryTriageRows,
} from "../src/lib/research/worldGalleryTriageProjection.js";

const base = {
  id: "00000000-0000-4000-8000-000000000001",
  image_url: "https://example.test/storage/v1/object/public/gallery/a.jpg",
  thumb_url: "https://example.test/a-thumb.jpg",
  name: "גרסה קצרה",
  description: "קצר",
  tags: [],
  ocr_status: "done",
  ocr_numbers: [1820],
  published: 1,
  min_tier: 0,
  curator_hidden: false,
  created_at: "2026-01-01T00:00:00Z",
};

test("gallery triage groups exact URLs, keeps every source and chooses the fuller display row", () => {
  const fuller = {
    ...base,
    id: "00000000-0000-4000-8000-000000000002",
    name: "גרסה מלאה",
    description: "תיאור ארוך ומלא יותר של אותה תמונת מקור",
    tags: ["מספרים", "תיעוד"],
  };
  const projection = projectWorldGalleryTriageRows([base, fuller]);
  assert.equal(projection.counts.duplicateGroups, 1);
  assert.equal(projection.counts.duplicateRows, 1);
  assert.equal(projection.rows.length, 1);
  assert.equal(projection.rows[0].recommendedDisplayId, fuller.id);
  assert.equal(projection.rows[0].occurrenceCount, 2);
  assert.equal(projection.rows[0].independentSourceCount, 1);
  assert.deepEqual(projection.rows[0].sourceRefs, [
    `gallery_images:${fuller.id}`,
    `gallery_images:${base.id}`,
  ]);
  assert.equal(projection.rules.noSourceDeletion, true);
});

test("gallery OCR state remains separate from publication and tree promotion", () => {
  const projection = projectWorldGalleryTriageRows([{ ...base, ocr_status: "error" }], { ocrIssueIds: [base.id] });
  assert.deepEqual(projection.rows[0].issues, ["ocr"]);
  assert.deepEqual(projection.rows[0].ocrReviewStates, ["error"]);
  assert.equal(projection.counts.ocrError, 1);
  assert.equal(projection.rows[0].publicVisible, true);
  assert.match(projection.rows[0].recommendation, /להריץ מחדש/u);
  assert.equal(projection.rules.ocrIsStoredExtractionNotTruth, true);
  assert.equal(projection.rules.noAutomaticTreePromotion, true);
});

test("gallery triage includes fully unlabeled clusters without guessing a label", () => {
  const projection = projectWorldGalleryTriageRows([{ ...base, name: null, description: null }]);
  assert.equal(projection.rows.length, 1);
  assert.deepEqual(projection.rows[0].issues, ["missing_label"]);
  assert.equal(projection.counts.fullyUnlabeledClusters, 1);
  assert.match(projection.rows[0].recommendation, /אין לתייג לפי ניחוש/u);
});

test("gallery review paginates the existing reader and loads OCR issues separately", async () => {
  const calls = [];
  const rows = Array.from({ length: 3 }, (_, index) => ({
    ...base,
    id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
    image_url: `https://example.test/storage/v1/object/public/gallery/${index}.jpg`,
  }));
  const reader = async (params) => {
    calls.push(params);
    if (params.review === "ocr") return { data: [rows[2]], count: 1 };
    return params.page === 0 ? { data: rows.slice(0, 2), count: 3 } : { data: rows.slice(2), count: null };
  };
  const projection = await fetchWorldGalleryTriageProjection({ reader, pageSize: 2 });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].review, "identity");
  assert.equal(calls[1].withCount, false);
  assert.equal(calls[2].review, "ocr");
  assert.equal(projection.counts.total, 3);
  assert.equal(projection.counts.ocrReview, 1);
});
