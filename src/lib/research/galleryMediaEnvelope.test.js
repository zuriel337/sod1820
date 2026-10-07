import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildMediaEnvelope,
  dedupeMediaEnvelopes,
  intrinsicToLightboxImage,
  intrinsicResearchDetails,
  mediaIdentity,
} from "./galleryMediaEnvelope.js";

const pilot = JSON.parse(fs.readFileSync("test/fixtures/gallery-golden-media-pilot.json", "utf8"));
const row = (id, extra = {}) => ({
  id, name: "n", description: "d", image_url: `https://x/${id}.jpg`, thumb_url: `https://x/t-${id}.jpg`,
  occurred_at: "2023-10-01", image_type: "gematria", tags: ["a"], source: "update",
  ocr_text: "טקסט", ocr_status: "done", ocr_numbers: [14], primary_value: 14, all_values: [14, 26], related_values: [], ...extra,
});

test("pilot manifest: 10-20 unique rows, required coverage, no fabricated coverage", () => {
  assert.ok(pilot.rows.length >= 10 && pilot.rows.length <= 20);
  assert.equal(new Set(pilot.rows.map((r) => r.galleryImageId)).size, pilot.rows.length);
  const covered = new Set(pilot.rows.flatMap((r) => r.coverage));
  for (const c of ["text", "gematria", "event_news", "historical", "source_date", "strong_ocr", "pending_ocr", "error_ocr", "number_linked"]) assert.ok(covered.has(c), c);
  assert.ok(pilot.known_gaps.screenshot && pilot.known_gaps.post_context_linked);
});

test("identity is stable and derived from gallery id only", () => {
  const id = pilot.rows[0].galleryImageId;
  assert.equal(mediaIdentity(id), `media:gallery_image:${id}`);
  assert.equal(mediaIdentity("not-a-uuid"), null);
});

test("intrinsic payload is identical across contexts; only contextRelation differs", () => {
  const id = pilot.rows[0].galleryImageId;
  const a = buildMediaEnvelope({ row: row(id), node: { id: "n1" }, label: "L", relationType: "mentions" });
  const b = buildMediaEnvelope({ row: row(id), node: { id: "n1" }, label: "L", relationType: "contains" });
  assert.equal(JSON.stringify(a.intrinsic), JSON.stringify(b.intrinsic));
  assert.notEqual(a.contextRelation.relationType, b.contextRelation.relationType);
  assert.equal(a.mediaId, b.mediaId);
  assert.equal(a.galleryImageId, id);
  assert.equal(a.nodeId, "n1");
});

test("dedupe keeps first by media identity", () => {
  const id = pilot.rows[0].galleryImageId;
  const a = buildMediaEnvelope({ row: row(id), relationType: "contains" });
  const b = buildMediaEnvelope({ row: row(id), relationType: "mentions" });
  const out = dedupeMediaEnvelopes([a, b]);
  assert.equal(out.length, 1);
  assert.equal(out[0].relationType, "contains");
});

test("stored numbers are marked as unrecomputed claims; lightbox adapter uses full image", () => {
  const e = buildMediaEnvelope({ row: row(pilot.rows[1].galleryImageId), relationType: "related" });
  assert.equal(e.intrinsic.storedNumbers.provenance, "stored_gallery_claim_not_recomputed");
  const lb = intrinsicToLightboxImage(e.intrinsic);
  assert.equal(lb.image_url, e.imageUrl);
  assert.notEqual(lb.image_url, e.thumbUrl);
  assert.equal(intrinsicResearchDetails(e.intrinsic).ocrStatus, "done");
});

test("rows without image or valid id yield no envelope", () => {
  assert.equal(buildMediaEnvelope({ row: row("bad") }), null);
  assert.equal(buildMediaEnvelope({ row: row(pilot.rows[0].galleryImageId, { image_url: null }) }), null);
});

test("surfaces consume the shared figure and never read gallery_images directly; whole-image contain", () => {
  const surfaces = [
    "src/components/number2029/NumberLivingWorld2029.jsx",
    "src/pages/World2029Page.jsx",
    "src/pages/Topic2029Page.jsx",
    "src/components/experience2029/CanonicalMediaFigure2029.jsx",
  ];
  for (const f of surfaces) {
    const src = fs.readFileSync(f, "utf8");
    assert.doesNotMatch(src, /from\(\s*["']gallery_images["']\s*\)/, f);
    if (f !== surfaces[3]) assert.match(src, /CanonicalMediaFigure2029/, f);
  }
  const css = fs.readFileSync("src/components/experience2029/canonicalMediaImage2029.css", "utf8");
  assert.match(css, /object-fit:contain!important/);
  assert.doesNotMatch(fs.readFileSync("src/pages/topic2029.css", "utf8"), /media-grid img\{[^}]*object-fit:cover/);
  const lb = fs.readFileSync("src/components/Lightbox.jsx", "utf8");
  assert.match(lb, /object-fit: contain/);
  assert.match(lb, /ArrowLeft/);
});
