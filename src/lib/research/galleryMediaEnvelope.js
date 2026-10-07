// Gallery media envelope (GALLERY_INTRINSIC_MEDIA_PROJECTOR_V1) — pure adapter, no I/O.
// Extends the Entity Hub media projection: ONE stable media identity + an INTRINSIC payload
// (what belongs to the media itself) kept separate from sibling layers: provenance, legacyPlacement
// (gallery history) and contextRelation (why it shows up here). Intrinsic is byte-equivalent across
// Projector / Number / World / Topic; only contextRelation varies. Stored numbers/OCR are provenance claims — never recomputed here,
// never truth/canonical/publication.

import { canonicalMediaPresentation } from "../presentation/canonicalPresentation.js";

const OCR_TEXT_CAP = 4000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const clean = (value) => (typeof value === "string" ? value.trim() : "");
const ints = (value) => (Array.isArray(value) ? value.filter((n) => Number.isSafeInteger(n)) : []);

export function mediaIdentity(galleryImageId) {
  const id = clean(String(galleryImageId || ""));
  return uuid.test(id) ? `media:gallery_image:${id.toLowerCase()}` : null;
}

const strList = (value, cap = 24) => (Array.isArray(value)
  ? value.map((v) => clean(typeof v === "string" ? v : "")).filter(Boolean).slice(0, cap)
  : []);
const strMap = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [k, v] of Object.entries(value).slice(0, 24)) if (typeof v === "string" && clean(v)) out[clean(k)] = clean(v);
  return out;
};

// Slugs may be stored percent-encoded; compare fully decoded + NFC (same rule as the pilot gate).
export function normalizeMediaPostSlug(value) {
  let out = clean(String(value ?? ""));
  if (!out) return null;
  try { for (let i = 0; i < 3 && /%[0-9a-f]{2}/i.test(out); i += 1) out = decodeURIComponent(out); } catch { return null; }
  return out.normalize("NFC") || null;
}

// Stored ocr_meta → labelled SOURCE CLAIMS. Whitelist only (no approved_by / unknown keys);
// nothing here is pixel inference, face/person identity, or recomputed gematria.
export function buildStoredInterpretation(ocrMeta) {
  const meta = ocrMeta && typeof ocrMeta === "object" && !Array.isArray(ocrMeta) ? ocrMeta : {};
  const gematriaNote = clean(meta.gematria_note) || null;
  return {
    state: "stored_source_claim",
    basis: "gallery_images.ocr_meta",
    topic: clean(meta.topic) || null,
    topics: strList(meta.topics),
    entities: strList(meta.entities),
    scene: clean(meta.scene) || null,
    storedImageKind: clean(meta.image_type) || null,
    event: clean(meta.event) || null,
    summary: clean(meta.summary) || null,
    mediaKind: clean(meta.media_kind) || null,
    category: clean(meta.category) || null,
    language: clean(meta.language) || null,
    country: clean(meta.country) || null,
    isNews: typeof meta.is_news === "boolean" ? meta.is_news : null,
    numbersMeaning: strMap(meta.numbers_meaning),
    // A stored note that says "verified" is still a claim here: trace proof lives in the engine, not in this row.
    gematriaNote,
    gematriaClaimState: gematriaNote ? "source_claim_not_recomputed_here" : null,
  };
}

export function buildMediaProvenance(row) {
  const meta = row?.ocr_meta && typeof row.ocr_meta === "object" && !Array.isArray(row.ocr_meta) ? row.ocr_meta : {};
  const metaSource = clean(meta.source) || null;
  return {
    sourceRef: `gallery_images:${row.id}`,
    storedSource: clean(row.source) || null,
    metaSource,
    author: clean(meta.author) || null,
    publication: clean(meta.publication) || null,
    sourceProvenance: clean(meta.source_provenance) || null,
    postSlug: normalizeMediaPostSlug(meta.post_slug),
    // Screenshot is read from STORED metadata only (never pixels).
    storedMediaKind: metaSource === "news_screenshot" ? "screenshot" : null,
    storedMediaKindBasis: metaSource === "news_screenshot" ? "ocr_meta.source=news_screenshot" : null,
  };
}

// INTRINSIC = what belongs to the media itself: identity, representation, stored extraction
// (OCR) and stored interpretation claims. Nothing about where/when/how the gallery filed it.
export function buildIntrinsicMedia({ row, node = null, label = "" }) {
  const mediaId = mediaIdentity(row?.id);
  if (!mediaId || !row?.image_url) return null;
  const ocrText = clean(row.ocr_text);
  const ocr = {
    status: clean(row.ocr_status) || null,
    text: ocrText ? ocrText.slice(0, OCR_TEXT_CAP) : null,
    numbers: ints(row.ocr_numbers),
  };
  const representation = {
    imageUrl: row.image_url,
    thumbUrl: row.thumb_url || row.image_url,
    fit: "preserve-whole-image",
  };
  return Object.freeze({
    mediaId,
    nodeId: node?.id ? String(node.id) : null,
    galleryImageId: String(row.id),
    label,
    representation,
    extraction: { ...ocr, state: "stored_extraction" },
    interpretation: buildStoredInterpretation(row.ocr_meta),
  });
}

// Legacy PLACEMENT / HISTORY layer (sibling of intrinsic): where/how/when the row was filed on
// gallery_images, preserved unchanged (chronology/order never rewritten). Not visual truth about
// the image and never confused with the current surface context (contextRelation).
export function buildLegacyPlacement({ row, node = null }) {
  const storedNumbers = {
    primary: Number.isSafeInteger(row?.primary_value) ? row.primary_value : null,
    all: ints(row?.all_values),
    related: ints(row?.related_values),
    provenance: "stored_gallery_claim_not_recomputed",
  };
  const createdAt = row?.created_at || node?.created_at || null;
  return Object.freeze({
    galleryId: row?.gallery_id ?? null,
    wpGalleryId: row?.wp_gallery_id ?? null,
    ordering: Number.isFinite(row?.ordering) ? row.ordering : null,
    description: clean(row?.description) || null,
    tags: Array.isArray(row?.tags) ? row.tags : [],
    space: clean(row?.space) || null,
    imageType: clean(row?.image_type) || null,
    occurredAt: row?.occurred_at || null,
    createdAt,
    // Date provenance: which stored column each date came from (never inferred from pixels).
    dateProvenance: {
      occurredAt: row?.occurred_at ? { value: row.occurred_at, basis: "gallery_images.occurred_at" } : null,
      createdAt: row?.created_at ? { value: row.created_at, basis: "gallery_images.created_at" } : (node?.created_at ? { value: node.created_at, basis: "nodes.created_at" } : null),
    },
    storedNumbers,
    state: "legacy_placement_not_visual_truth",
  });
}

// relationKind separates graph-proven adjacency from stored-metadata context. A
// source_metadata relation is NOT reality_graph: no node/edge exists or is created for it.
export const MEDIA_RELATION_KIND = Object.freeze({ GRAPH: "reality_graph", SOURCE_METADATA: "source_metadata" });

export function buildContextRelation({ relationType = "related", surface = null, relationKind = MEDIA_RELATION_KIND.GRAPH, postSlug = null } = {}) {
  const sourceMeta = relationKind === MEDIA_RELATION_KIND.SOURCE_METADATA;
  return {
    relationKind,
    relationType,
    projectionReason: sourceMeta ? `source_metadata:${relationType}` : `reality_graph:${relationType}`,
    basis: sourceMeta ? "gallery_images.ocr_meta.post_slug" : "nodes/edges",
    postSlug: sourceMeta ? normalizeMediaPostSlug(postSlug) : null,
    surface,
  };
}

// Flat legacy fields are preserved so existing consumers keep working; `intrinsic`,
// `presentation` and `contextRelation` are the contract new/updated surfaces consume.
// `presentation` ({label, summary}) is computed ONCE here via the shared canonical function.
export function buildMediaEnvelope({ row, node = null, label = "", relationType = "related", relationKind = MEDIA_RELATION_KIND.GRAPH, postSlug = null }) {
  const intrinsic = buildIntrinsicMedia({ row, node, label });
  if (!intrinsic) return null;
  const provenance = Object.freeze(buildMediaProvenance(row));
  const legacyPlacement = buildLegacyPlacement({ row, node });
  const contextRelation = buildContextRelation({ relationType, relationKind, postSlug });
  const presentation = Object.freeze(canonicalMediaPresentation({ ...intrinsic, provenance, legacyPlacement }));
  const lp = legacyPlacement;
  return {
    mediaId: intrinsic.mediaId,
    nodeId: intrinsic.nodeId,
    galleryImageId: intrinsic.galleryImageId,
    label: presentation.label,
    description: lp.description,
    imageUrl: intrinsic.representation.imageUrl,
    thumbUrl: intrinsic.representation.thumbUrl,
    relationType,
    occurredAt: lp.occurredAt,
    createdAt: lp.createdAt,
    imageType: lp.imageType,
    space: lp.space,
    tags: lp.tags,
    sourceRef: provenance.sourceRef,
    sourceLabel: provenance.storedSource,
    ocr: { status: intrinsic.extraction.status, text: intrinsic.extraction.text, numbers: intrinsic.extraction.numbers },
    storedNumbers: lp.storedNumbers,
    projectionReason: contextRelation.projectionReason,
    // Strict sibling layers (the contract): intrinsic · provenance · legacyPlacement · presentation · contextRelation.
    intrinsic,
    provenance,
    legacyPlacement,
    presentation,
    contextRelation,
  };
}

// Dedupe by stable media identity (first wins — callers sort by context before calling).
export function dedupeMediaEnvelopes(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = item?.mediaId || item?.galleryImageId;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Existing Lightbox consumes gallery-row-shaped objects; adapt the envelope's sibling layers
// (intrinsic representation + legacyPlacement history) — placement is never read from intrinsic.
export function mediaToLightboxImage(envelope) {
  const intrinsic = envelope?.intrinsic;
  if (!intrinsic) return null;
  const lp = envelope.legacyPlacement || {};
  const rep = intrinsic.representation || {};
  return {
    id: intrinsic.galleryImageId,
    name: envelope.presentation?.label || intrinsic.label,
    description: lp.description,
    image_url: rep.imageUrl,
    thumb_url: rep.thumbUrl,
    occurred_at: lp.occurredAt,
    created_at: lp.createdAt,
    tags: lp.tags,
    image_type: lp.imageType,
    primary_value: lp.storedNumbers?.primary ?? null,
    all_values: lp.storedNumbers?.all || [],
    related_values: lp.storedNumbers?.related || [],
  };
}

// Compact research-details model for the Lightbox side panel (claims, labelled as such).
export function mediaResearchDetails(envelope) {
  const intrinsic = envelope?.intrinsic;
  if (!intrinsic) return null;
  const prov = envelope.provenance || {};
  return {
    ocrStatus: intrinsic.extraction?.status ?? null,
    ocrText: intrinsic.extraction?.text ?? null,
    ocrNumbers: intrinsic.extraction?.numbers || [],
    sourceLabel: prov.storedSource ?? null,
    provenance: envelope.legacyPlacement?.storedNumbers?.provenance ?? null,
    mediaKind: prov.storedMediaKind || null,
    author: prov.author || null,
    publication: prov.publication || null,
    event: intrinsic.interpretation?.event || null,
    entities: intrinsic.interpretation?.entities || [],
    numbersMeaning: intrinsic.interpretation?.numbersMeaning || {},
    gematriaNote: intrinsic.interpretation?.gematriaNote || null,
    gematriaClaimState: intrinsic.interpretation?.gematriaClaimState || null,
    interpretationState: intrinsic.interpretation?.state || null,
  };
}

// Surfaces share ONE presentation entry: given any envelope, return the intrinsic payload.
export function mediaIntrinsicOf(item) {
  return item?.intrinsic || null;
}

// Bounded governed numbers already present in the EXISTING research context (readingFocus /
// surfaceFocus / surfaceFindings values). Pure: no domain values are hardcoded here and nothing
// is computed — only integers the context already carries are passed to the Entity Hub.
export function deriveContextNumbers(context, { cap = 8 } = {}) {
  const dims = context?.dimensions || {};
  const out = [];
  const add = (value) => {
    const text = typeof value === "string" ? value.trim() : value;
    if (typeof text === "string" && !/^\d{1,9}$/.test(text)) return;
    const n = Number(text);
    if (Number.isSafeInteger(n) && n > 0 && !out.includes(n)) out.push(n);
  };
  add(dims.readingFocus?.number);
  add(dims.surfaceFocus?.number);
  for (const finding of Array.isArray(dims.surfaceFindings) ? dims.surfaceFindings : []) add(finding?.value);
  return out.slice(0, Math.max(0, cap));
}
