// Gallery media envelope (GALLERY_INTRINSIC_MEDIA_PROJECTOR_V1) — pure adapter, no I/O.
// Extends the Entity Hub media projection: ONE stable media identity + an INTRINSIC payload
// (what the image is) kept separate from the CONTEXT relation (why it shows up here).
// Intrinsic payload is byte-equivalent across Projector / Number / World / Topic; only
// contextRelation varies. Stored numbers/OCR are provenance claims — never recomputed here,
// never truth/canonical/publication.

const OCR_TEXT_CAP = 4000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const clean = (value) => (typeof value === "string" ? value.trim() : "");
const ints = (value) => (Array.isArray(value) ? value.filter((n) => Number.isSafeInteger(n)) : []);

export function mediaIdentity(galleryImageId) {
  const id = clean(String(galleryImageId || ""));
  return uuid.test(id) ? `media:gallery_image:${id.toLowerCase()}` : null;
}

export function buildIntrinsicMedia({ row, node = null, label = "" }) {
  const mediaId = mediaIdentity(row?.id);
  if (!mediaId || !row?.image_url) return null;
  const ocrText = clean(row.ocr_text);
  return Object.freeze({
    mediaId,
    nodeId: node?.id ? String(node.id) : null,
    galleryImageId: String(row.id),
    label,
    description: clean(row.description) || null,
    imageUrl: row.image_url,
    thumbUrl: row.thumb_url || row.image_url,
    occurredAt: row.occurred_at || null,
    createdAt: row.created_at || node?.created_at || null,
    imageType: clean(row.image_type) || null,
    space: clean(row.space) || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    sourceLabel: clean(row.source) || null,
    sourceRef: `gallery_images:${row.id}`,
    ocr: {
      status: clean(row.ocr_status) || null,
      text: ocrText ? ocrText.slice(0, OCR_TEXT_CAP) : null,
      numbers: ints(row.ocr_numbers),
    },
    // Stored claims only: provenance of the gallery row, not engine output.
    storedNumbers: {
      primary: Number.isSafeInteger(row.primary_value) ? row.primary_value : null,
      all: ints(row.all_values),
      related: ints(row.related_values),
      provenance: "stored_gallery_claim_not_recomputed",
    },
  });
}

export function buildContextRelation({ relationType = "related", surface = null } = {}) {
  return { relationType, projectionReason: `reality_graph:${relationType}`, surface };
}

// Flat legacy fields are preserved so existing consumers keep working; `intrinsic` and
// `contextRelation` are the split contract new/updated surfaces consume.
export function buildMediaEnvelope({ row, node = null, label = "", relationType = "related" }) {
  const intrinsic = buildIntrinsicMedia({ row, node, label });
  if (!intrinsic) return null;
  const contextRelation = buildContextRelation({ relationType });
  return {
    mediaId: intrinsic.mediaId,
    nodeId: intrinsic.nodeId,
    galleryImageId: intrinsic.galleryImageId,
    label: intrinsic.label,
    description: intrinsic.description,
    imageUrl: intrinsic.imageUrl,
    thumbUrl: intrinsic.thumbUrl,
    relationType,
    occurredAt: intrinsic.occurredAt,
    createdAt: intrinsic.createdAt,
    imageType: intrinsic.imageType,
    space: intrinsic.space,
    tags: intrinsic.tags,
    sourceRef: intrinsic.sourceRef,
    projectionReason: contextRelation.projectionReason,
    intrinsic,
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

// Existing Lightbox consumes gallery-row-shaped objects; adapt the intrinsic payload only.
export function intrinsicToLightboxImage(intrinsic) {
  if (!intrinsic) return null;
  return {
    id: intrinsic.galleryImageId,
    name: intrinsic.label,
    description: intrinsic.description,
    image_url: intrinsic.imageUrl,
    thumb_url: intrinsic.thumbUrl,
    occurred_at: intrinsic.occurredAt,
    created_at: intrinsic.createdAt,
    tags: intrinsic.tags,
    image_type: intrinsic.imageType,
    primary_value: intrinsic.storedNumbers.primary,
    all_values: intrinsic.storedNumbers.all,
    related_values: intrinsic.storedNumbers.related,
  };
}

// Compact research-details model for the Lightbox side panel (claims, labelled as such).
export function intrinsicResearchDetails(intrinsic) {
  if (!intrinsic) return null;
  return {
    ocrStatus: intrinsic.ocr.status,
    ocrText: intrinsic.ocr.text,
    ocrNumbers: intrinsic.ocr.numbers,
    sourceLabel: intrinsic.sourceLabel,
    provenance: intrinsic.storedNumbers.provenance,
  };
}

// Surfaces share ONE presentation entry: given any envelope, return the intrinsic payload.
export function mediaIntrinsicOf(item) {
  return item?.intrinsic || null;
}
