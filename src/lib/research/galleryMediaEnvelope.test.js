import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { canonicalMediaPresentation } from "../presentation/canonicalPresentation.js";
import {
  MEDIA_RELATION_KIND,
  buildMediaEnvelope,
  normalizeMediaPostSlug,
  dedupeMediaEnvelopes,
  intrinsicToLightboxImage,
  intrinsicResearchDetails,
  mediaIdentity,
  deriveContextNumbers,
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
  for (const c of ["screenshot", "post_context_linked"]) assert.ok(covered.has(c), c);
  const ctx = pilot.rows.find((r) => r.galleryImageId === "7287ad08-1c7b-4642-a5c4-cecbbaf35b81");
  assert.equal(ctx.nodeId, null);
  assert.equal(ctx.relationKind, "source_metadata");
  assert.ok(pilot.rows.some((r) => r.galleryImageId === "abf634b9-cb8f-46c0-927d-87fbe341971c" && r.coverage.includes("screenshot")));
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
  assert.equal(e.intrinsic.legacyPlacement.storedNumbers.provenance, "stored_gallery_claim_not_recomputed");
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

const meta = { source: "news_screenshot", author: "מעריב אונליין", entities: ["נתניהו"], event: "אירוע X", numbers_meaning: { "89": "מסתתר אלהים" },
  gematria_note: "המשיח = 363; verified", post_slug: "chibur-bein-hasafot-mafteach-lagan", approved_by: "ZURIEL", secret: "x" };

test("envelope separates representation / extraction / interpretation / provenance / legacy placement", () => {
  const e = buildMediaEnvelope({ row: row(pilot.rows[0].galleryImageId, { ocr_meta: meta }), relationType: "related" });
  const i = e.intrinsic;
  for (const k of ["representation", "extraction", "interpretation", "provenance", "legacyPlacement"]) assert.ok(i[k], k);
  assert.equal(i.legacyPlacement.state, "legacy_placement_not_visual_truth");
  assert.equal(i.legacyPlacement.description, "d");
  assert.equal(i.interpretation.state, "stored_source_claim");
  assert.equal(i.interpretation.gematriaClaimState, "source_claim_not_recomputed_here");
  assert.equal(i.interpretation.numbersMeaning["89"], "מסתתר אלהים");
  assert.equal(i.provenance.author, "מעריב אונליין");
  assert.equal(JSON.stringify(i).includes("approved_by"), false);
  assert.equal(JSON.stringify(i).includes("secret"), false);
});

test("screenshot comes from stored ocr_meta.source only, never pixels", () => {
  const shot = buildMediaEnvelope({ row: row(pilot.rows[0].galleryImageId, { ocr_meta: meta }) });
  const plain = buildMediaEnvelope({ row: row(pilot.rows[1].galleryImageId, { ocr_meta: { source: "post_5112_existing_approved_asset" } }) });
  const none = buildMediaEnvelope({ row: row(pilot.rows[2].galleryImageId) });
  assert.equal(shot.intrinsic.provenance.storedMediaKind, "screenshot");
  assert.equal(shot.intrinsic.provenance.storedMediaKindBasis, "ocr_meta.source=news_screenshot");
  assert.equal(shot.presentation.kindLabel, "צילום מסך");
  assert.equal(plain.intrinsic.provenance.storedMediaKind, null);
  assert.equal(none.intrinsic.provenance.storedMediaKind, null);
});

test("source_metadata relation is distinct from reality_graph and carries the same intrinsic payload", () => {
  const id = "7287ad08-1c7b-4642-a5c4-cecbbaf35b81";
  const slug = "flydubai-fz1073-363-14000-remzei-geula";
  const r = row(id, { ocr_meta: { post_slug: slug } });
  const m = buildMediaEnvelope({ row: r, relationType: "post_metadata", relationKind: MEDIA_RELATION_KIND.SOURCE_METADATA, postSlug: slug });
  const g = buildMediaEnvelope({ row: r, node: { id: "n9" }, relationType: "contains" });
  assert.equal(m.contextRelation.relationKind, "source_metadata");
  assert.equal(m.contextRelation.projectionReason, "source_metadata:post_metadata");
  assert.doesNotMatch(m.contextRelation.projectionReason, /reality_graph/);
  assert.equal(m.nodeId, null);
  assert.equal(g.contextRelation.relationKind, "reality_graph");
  assert.equal(m.mediaId, g.mediaId);
  assert.equal(m.galleryImageId, g.galleryImageId);
  assert.deepEqual(m.presentation, g.presentation);
  // dedupe: graph relation wins when it comes first
  assert.equal(dedupeMediaEnvelopes([g, m])[0].contextRelation.relationKind, "reality_graph");
  assert.equal(normalizeMediaPostSlug(encodeURIComponent("פוסט-92")), "פוסט-92");
});

test("one canonical presentation: identical across surfaces; context differs", () => {
  const id = pilot.rows[0].galleryImageId;
  const a = buildMediaEnvelope({ row: row(id), node: { id: "n1" }, relationType: "contains" });
  const b = buildMediaEnvelope({ row: row(id), node: { id: "n1" }, relationType: "mentions" });
  assert.deepEqual(a.presentation, b.presentation);
  assert.equal(a.label, a.presentation.label);
  assert.ok(a.presentation.label);
  assert.notEqual(a.contextRelation.projectionReason, b.contextRelation.projectionReason);
});

test("Projector media: shared figure via Entity Hub only, no gallery_images read, no crop, public-safe query", () => {
  const card = fs.readFileSync("src/components/experience2029/ProjectorMediaCards2029.jsx", "utf8");
  assert.match(card, /CanonicalMediaFigure2029/);
  assert.match(card, /fetchPostContextMedia/);
  assert.doesNotMatch(card, /gallery_images|supabase/);
  assert.doesNotMatch(card, /object-fit:\s*cover/);
  assert.match(fs.readFileSync("src/components/experience2029/GoldenProjectorModeLayer2029.jsx", "utf8"), /ProjectorMediaCards2029/);
  const hub = fs.readFileSync("src/lib/research/entityHubProjection.js", "utf8");
  const fn = hub.slice(hub.indexOf("export async function fetchPostContextMedia"), hub.indexOf("function humanGateSummary"));
  assert.match(fn, /\.eq\("published", 1\)/);
  assert.match(fn, /curator_hidden\.is\.null,curator_hidden\.eq\.false/);
  assert.match(fn, /SOURCE_METADATA/);
  assert.doesNotMatch(fn, /\.(insert|update|upsert|delete)\(/);
  assert.doesNotMatch(fn, /from\("(nodes|edges)"\)/);
});

test("no page-local media label rewriting; no DB mutation in media adapter", () => {
  assert.doesNotMatch(fs.readFileSync("src/pages/World2029Page.jsx", "utf8"), /humanMediaLabel/);
  const env = fs.readFileSync("src/lib/research/galleryMediaEnvelope.js", "utf8");
  assert.doesNotMatch(env, /supabase|\.insert\(|\.update\(|\.upsert\(/);
});

test("strict intrinsic: only identity + layers, no flat legacy aliases; outer envelope stays compatible", () => {
  const e = buildMediaEnvelope({ row: row(pilot.rows[0].galleryImageId, { ocr_meta: { event: "E" } }), node: { id: "n1" }, label: "L" });
  assert.deepEqual(Object.keys(e.intrinsic).sort(), ["extraction", "galleryImageId", "interpretation", "label", "legacyPlacement", "mediaId", "nodeId", "provenance", "representation"]);
  for (const k of ["description", "tags", "imageType", "sourceLabel", "ocr", "storedNumbers", "imageUrl", "thumbUrl", "occurredAt", "createdAt", "space", "sourceRef"]) assert.ok(!(k in e.intrinsic), k);
  for (const k of ["description", "tags", "imageType", "sourceLabel", "ocr", "storedNumbers", "imageUrl", "thumbUrl", "occurredAt", "createdAt", "space", "sourceRef"]) assert.ok(k in e, k);
  assert.equal(e.storedNumbers.primary, 14);
  assert.equal(e.ocr.status, "done");
});

test("legacy gallery placement history + date provenance survive (no order/date mutation)", () => {
  const e = buildMediaEnvelope({ row: row(pilot.rows[0].galleryImageId, { gallery_id: "3ee0ec23-04f3-468b-a7b5-67087d41681a", wp_gallery_id: 7, ordering: 3, space: "s", created_at: "2026-09-30T10:00:00Z" }) });
  const lp = e.intrinsic.legacyPlacement;
  assert.equal(lp.galleryId, "3ee0ec23-04f3-468b-a7b5-67087d41681a");
  assert.equal(lp.wpGalleryId, 7);
  assert.equal(lp.ordering, 3);
  assert.deepEqual(lp.storedNumbers.all, [14, 26]);
  assert.equal(lp.occurredAt, "2023-10-01");
  assert.equal(lp.dateProvenance.occurredAt.basis, "gallery_images.occurred_at");
  assert.equal(lp.dateProvenance.createdAt.basis, "gallery_images.created_at");
  assert.equal(lp.state, "legacy_placement_not_visual_truth");
  assert.match(fs.readFileSync("src/lib/research/entityHubProjection.js", "utf8"), /WORLD_MEDIA_FIELDS = "id,gallery_id,wp_gallery_id,ordering,/);
});

test("ocr_meta semantic whitelist expanded; operational keys stay out", () => {
  const e = buildMediaEnvelope({ row: row(pilot.rows[0].galleryImageId, { ocr_meta: { summary: "S", media_kind: "photo", category: "c", language: "he", country: "IL", is_news: true, sha256: "h", raw_bytes: "b", cleared: true, video: "v" } }) });
  const i = e.intrinsic.interpretation;
  assert.deepEqual([i.summary, i.mediaKind, i.category, i.language, i.country, i.isNews], ["S", "photo", "c", "he", "IL", true]);
  const dump = JSON.stringify(e.intrinsic);
  for (const k of ["sha256", "raw_bytes", "cleared", "video"]) assert.equal(dump.includes(k), false, k);
});

test("presentation prefers structured interpretation; legacy description fallback is labelled", () => {
  const id = pilot.rows[0].galleryImageId;
  const s = buildMediaEnvelope({ row: row(id, { ocr_meta: { summary: "תקציר שמור" } }) });
  assert.equal(s.presentation.summary, "תקציר שמור");
  assert.equal(s.presentation.summaryBasis, "stored_interpretation_summary");
  const ev = buildMediaEnvelope({ row: row(id, { ocr_meta: { event: "אירוע" } }) });
  assert.equal(ev.presentation.summaryBasis, "stored_interpretation_event");
  const legacy = buildMediaEnvelope({ row: row(id, { description: "תיאור ישן ארוך" }), label: "כותרת" });
  assert.equal(legacy.presentation.summary, "תיאור ישן ארוך");
  assert.equal(legacy.presentation.summaryBasis, "legacy_placement_description");
  const none = canonicalMediaPresentation({ label: "x" });
  assert.equal(none.summaryBasis, null);
});

test("deriveContextNumbers: bounded, from existing context only, no computation", () => {
  const ctx = { dimensions: { readingFocus: { number: 358 }, surfaceFocus: { number: 73 }, surfaceFindings: [{ value: "1202" }, { value: "1820" }, { value: "358" }, { value: "abc" }, { label: "no value" }] } };
  assert.deepEqual(deriveContextNumbers(ctx), [358, 73, 1202, 1820]);
  assert.deepEqual(deriveContextNumbers(null), []);
  const many = { dimensions: { surfaceFindings: Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1) })) } };
  assert.equal(deriveContextNumbers(many, { cap: 3 }).length, 3);
});

test("Projector graph path is wired: context-derived numbers -> Entity Hub -> existing graph projection, merged with source_metadata", () => {
  const card = fs.readFileSync("src/components/experience2029/ProjectorMediaCards2029.jsx", "utf8");
  assert.match(card, /deriveContextNumbers\(context\)/);
  assert.match(card, /fetchPostContextMedia\(\{ postSlug, numbers:/);
  assert.doesNotMatch(card, /graphMedia = \[\]/);
  assert.doesNotMatch(card, /\b(92|5112|358|1820|424|776)\b/);
  assert.match(fs.readFileSync("src/components/experience2029/GoldenProjectorModeLayer2029.jsx", "utf8"), /<ProjectorMediaCards2029 postSlug=\{postSlug\} context=\{context\}/);
  const hub = fs.readFileSync("src/lib/research/entityHubProjection.js", "utf8");
  const g = hub.slice(hub.indexOf("export async function fetchGraphMediaForNumbers"), hub.indexOf("export async function fetchPostContextMedia"));
  assert.match(g, /resolveEntityHubNode\(\{ type: "number"/);
  assert.match(g, /fetchCanonicalGraphEntityFindings/);
  assert.match(g, /fetchWorldMediaProjection/);
  assert.doesNotMatch(g, /\.(insert|update|upsert|delete)\(|from\("gallery_images"\)|\b(92|5112|358|1820)\b/);
  const p = hub.slice(hub.indexOf("export async function fetchPostContextMedia"), hub.indexOf("function humanGateSummary"));
  assert.match(p, /fetchGraphMediaForNumbers/);
  assert.match(p, /SOURCE_METADATA/);
  // graph first, source_metadata second; same media -> graph relation wins
  assert.match(p, /dedupeMediaEnvelopes\(\[\.\.\.\(graphMedia \|\| \[\]\), \.\.\.metaItems\]\)/);
});

test("Lightbox/research adapters read nested layers", () => {
  const src = fs.readFileSync("src/lib/research/galleryMediaEnvelope.js", "utf8");
  const fn = src.slice(src.indexOf("export function intrinsicToLightboxImage"), src.indexOf("// Surfaces share ONE"));
  assert.doesNotMatch(fn, /intrinsic\.(description|imageUrl|thumbUrl|tags|storedNumbers|ocr|sourceLabel|occurredAt|createdAt|imageType)\b/);
});
