import test from "node:test";
import assert from "node:assert/strict";
import {
  WORLD_GEMATRIA_METHOD_COLUMNS,
  projectWorldGematriaReviewRows,
} from "../src/lib/research/worldGematriaTriageProjection.js";

function completeRow(extra = {}) {
  return {
    id: "1d5b44b7-661e-4d11-a347-a292dd635740",
    phrase: "סוד החשמל",
    is_verified: false,
    is_published: false,
    tags: [],
    ...Object.fromEntries(WORLD_GEMATRIA_METHOD_COLUMNS.map(({ key }, index) => [key, index + 1])),
    ...extra,
  };
}

test("complete clean Hebrew rows become parity-ready without becoming verified or published", () => {
  const [row] = projectWorldGematriaReviewRows([completeRow()], { integrityRows: [] });
  assert.equal(row.integrityState, "engine_parity_ready");
  assert.equal(row.isVerified, false);
  assert.equal(row.isPublished, false);
  assert.match(row.recommendation, /לא לקידום אוטומטי/u);
});

test("input boundary, missing methods, mismatch and publication stay separate", () => {
  const outside = completeRow({ id: "outside", phrase: "1820 סוד" });
  const missing = completeRow({ id: "missing", miluy: null });
  const mismatch = completeRow({ id: "mismatch", is_published: true });
  const projected = projectWorldGematriaReviewRows([outside, missing, mismatch], {
    integrityRows: [{ id: "mismatch", method: "רגיל", stored: 1, engine: 2 }],
    publishedExceptionIds: [],
    duplicateGroups: [],
  });
  assert.equal(projected[0].integrityState, "outside_clean_hebrew");
  assert.equal(projected[1].integrityState, "missing_method_values");
  assert.equal(projected[2].integrityState, "engine_mismatch");
  assert.equal(projected[2].publicationWarning, true);
});

test("exact duplicate annotation preserves both source references", () => {
  const second = "2a3a3c6e-b870-4b46-9b33-bbbce4d427d6";
  const rows = projectWorldGematriaReviewRows([completeRow(), completeRow({ id: second })]);
  assert.deepEqual(rows[0].duplicateGroupIds, [completeRow().id, second]);
  assert.equal(rows[0].duplicateOccurrenceCount, 1);
  assert.equal(rows[1].sourceRef, `gematria_words:${second}`);
});

test("unavailable integrity gate fails closed", () => {
  const [row] = projectWorldGematriaReviewRows([completeRow()], { integrityAvailable: false });
  assert.equal(row.integrityState, "integrity_unavailable");
  assert.match(row.recommendation, /אין להסיק התאמה/u);
});
