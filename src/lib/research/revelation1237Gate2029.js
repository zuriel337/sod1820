// 1,237 — התגלות: gate model (2029 only).
//
// A presentation + orchestration layer over EXISTING owners. It owns no reader,
// no graph edge, no Topic and no content store:
//   * Topic + sources .......... fetchTopicSourceContext (already rechecks
//                                published=1 / min_tier=0 / not curator_hidden on every read)
//   * method values ............ fetchNumberMethodProfile -> fn_method_profile (canonical engine)
//   * gallery rows ............. getImagesByGallery ids, then re-admitted through
//                                fetchGallerySourceContext (same public gate, source identity + occurrences)
//   * shared contract .......... WORLD_UNIFIED_PUBLIC_CONTENT_PROJECTION v1
// Readers are injected so this module stays pure and testable.
//
// Layer separation that must never blur:
//   source ≠ occurrence ≠ finding ≠ tree relation; report ≠ calculation ≠ interpretation;
//   a shared source, tag, identical number or candidate is NOT an edge.

import { buildPublicWorldContentProjectionV1 } from "./publicWorldContentProjectionV1.js";

export const REVELATION_1237 = Object.freeze({ topicSlug: "1237", value: 1237 });

// Exact spellings (as stored/queried) and the exact method each is shown in.
export const GATE_PHRASES = Object.freeze([
  Object.freeze({ id: "hitgalut", expression: "התגלות", methodKey: "מסתתר", role: "הנסתר" }),
  Object.freeze({ id: "vraita", expression: "וראית את אחרי", methodKey: "רגיל", role: "הגלוי" }),
]);

export const GATE_GALLERIES = Object.freeze([
  Object.freeze({ wpGalleryId: 29, title: "לילה כיום יאיר" }),
  Object.freeze({ wpGalleryId: 81, title: "2137-318-1237" }),
]);
export const GALLERY_PAGE_SIZE = 6;

const clean = (value) => value == null ? "" : String(value).trim();
const list = (value) => Array.isArray(value) ? value : [];
const engineValue = (value) => {
  if ((typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim())) return null;
  return Number.isFinite(Number(value)) ? Number(value) : null;
};

// ── methods ───────────────────────────────────────────────────────────────────────────────
// Never computes a value. "confirmed" only when the canonical engine returned the target
// value for exactly this spelling and method; otherwise the real value is shown.
export function buildMethodCard(rows, spec, target = REVELATION_1237.value) {
  const profile = list(rows);
  const row = profile.find((entry) => clean(entry?.methodKey) === spec.methodKey) || null;
  const plain = profile.find((entry) => clean(entry?.methodKey) === "רגיל") || null;
  const value = engineValue(row?.computedValue);
  if (value == null) {
    return Object.freeze({ ...spec, status: "unavailable", value: null, plainValue: null });
  }
  return Object.freeze({
    ...spec,
    status: value === target ? "confirmed" : "different_value",
    value,
    methodLabel: clean(row.displayLabel) || spec.methodKey,
    family: clean(row.mathematicalFamily) || null,
    definitionVersion: row.definitionVersion ?? null,
    sub: clean(row.sub) || null,
    // The plain value is shown next to a non-plain method so the two are never conflated.
    plainValue: spec.methodKey !== "רגיל" ? engineValue(plain?.computedValue) : null,
    engine: "fn_method_profile",
  });
}

export async function loadMethodCards({ fetchMethodProfile, phrases = GATE_PHRASES } = {}) {
  return Promise.all(phrases.map(async (spec) => {
    try { return buildMethodCard(await fetchMethodProfile(spec.expression), spec); }
    catch { return Object.freeze({ ...spec, status: "failed", value: null, plainValue: null }); }
  }));
}

// Rendered gate slot, not an invented gallery locator or authored Topic claim.
// The existing Topic resolver re-reads the exact method/value before opening depth.
export function gateMethodFocus2029(card) {
  const spec = GATE_PHRASES.find((entry) => entry.id === card?.id);
  const value = engineValue(card?.value);
  if (!spec || card?.expression !== spec.expression || card?.methodKey !== spec.methodKey
    || !["confirmed", "different_value"].includes(card?.status)
    || !Number.isSafeInteger(value) || value < 0) return null;
  const key = `rv-method-${spec.id}`;
  return {
    row: { text: spec.expression, method: spec.methodKey, value,
      sourcePath: `revelation1237.gateMethods.${spec.id}` },
    origin: { key, locator: `#${key}`, sectionId: "rv-center", kind: "method_profile",
      expectedMethodVersion: card.definitionVersion ?? null },
  };
}

// ── galleries ─────────────────────────────────────────────────────────────────────────────
// Stored gallery order only. Legacy "importance" is never a ranking signal here.
export function storedOrderIds(rows) {
  return [...new Set(list(rows)
    .filter((row) => row?.id)
    .sort((a, b) => (Number(a.ordering ?? Infinity) - Number(b.ordering ?? Infinity)) || String(a.id).localeCompare(String(b.id)))
    .map((row) => String(row.id)))];
}

export async function loadGalleryPage({ wpGalleryId, listGalleryImages, fetchSourceContext, offset = 0, limit = GALLERY_PAGE_SIZE }) {
  const candidates = storedOrderIds(await listGalleryImages(wpGalleryId));
  const slice = candidates.slice(offset, offset + limit);
  const { items = [], occurrencesTruncated = false } = slice.length ? await fetchSourceContext({ imageIds: slice }) : {};
  // Fresh admission result is authoritative: keep only rows the public gate returned, in stored order.
  const order = new Map(slice.map((id, index) => [id, index]));
  const admitted = [...new Map(items
    .filter((item) => item?.galleryImageId && order.has(item.galleryImageId))
    .map((item) => [item.galleryImageId, item])).values()]
    .sort((a, b) => order.get(a.galleryImageId) - order.get(b.galleryImageId));
  return {
    wpGalleryId, items: admitted, offset, limit,
    totalListed: candidates.length,
    hasMore: offset + limit < candidates.length,
    // Advance over scanned positions, not the smaller set admitted for display.
    nextOffset: Math.min(offset + limit, candidates.length),
    occurrencesTruncated,
    // A listed row that the gate withheld is not shown and not counted as shown.
    withheld: slice.length - admitted.length,
  };
}

// ── time: report time is never the result and never the upload time ─────────────────────
export function splitSourceTimes(item) {
  const occurredAt = clean(item?.occurredAt) || null;
  return Object.freeze({
    occurredAt,
    occurredBasis: occurredAt ? "stored_occurred_at" : null,
    // createdAt is when the file entered the archive, never an event or report date.
    archivedAt: clean(item?.createdAt) || null,
    // The report label is the source's own title, kept verbatim (it often carries its own date).
    reportLabel: clean(item?.label) || null,
    result: "not_asserted",
  });
}

// ── reviewed statements ───────────────────────────────────────────────────────────────────
// A reviewed locator picks one already-admitted source and a connection it states.
// The statement counts only if the live (re-admitted) caption still contains the exact text.
export const REVIEWED_STATEMENTS = Object.freeze([
  Object.freeze({
    id: "david-14", connection: "david-14", galleryImageId: "c63c64fa-944b-4e4d-884a-8f9fc806b903",
    requiredText: ["14 = דוד", "1237 = התגלות (מסתתר)"],
  }),
  Object.freeze({
    id: "corona-isolated-soldiers", connection: "corona", galleryImageId: "84d4f578-0269-4b96-b0c0-1b1810d6847e",
    requiredText: ["1237 חיילים חולים בקורונה", "וראית את אחרי = 1237"],
  }),
  Object.freeze({
    id: "corona-teshuva-david", connection: "corona", galleryImageId: "467caeeb-85d9-40f8-acc5-3cb25c6ba873",
    requiredText: ["נגיף קורונה - תשובה - דוד = 1237"],
  }),
]);

const squash = (text) => clean(text).replace(/\s+/g, " ");

export function verifyReviewedStatements(items, specs = REVIEWED_STATEMENTS) {
  const byImage = new Map(list(items).map((item) => [item?.galleryImageId, item]));
  return specs.flatMap((spec) => {
    const item = byImage.get(spec.galleryImageId);
    if (!item) return [];
    const text = squash(`${item.description || ""} ${item.label || ""}`);
    if (!spec.requiredText.every((needle) => text.includes(squash(needle)))) return [];
    return [Object.freeze({ ...spec, item, times: splitSourceTimes(item) })];
  });
}

// ── connections ───────────────────────────────────────────────────────────────────────────
// Status ladder (strongest first). Only `tree` is a tree relation.
export const CONNECTION_STATUS = Object.freeze({
  tree: { label: "קשר עץ מתועד", detail: "edgeRef או החלטה ממשלית" },
  source_statement: { label: "נאמר במקור", detail: "ניסוח המקור, לא קשר עץ" },
  shared_source: { label: "מקור משותף", detail: "אותה תמונה במקור — אינו קשר עץ" },
  candidate: { label: "מועמד לבדיקה", detail: "טרם נבדק מקור; אינו קשר" },
});

// Editorial wiring only — each slug is a pre-existing approved Topic. The status is
// derived from live evidence, never configured.
export const CONNECTION_TARGETS = Object.freeze([
  Object.freeze({ id: "david-14", title: "דוד ו־14", slug: "645-david-melech-yisrael", numbers: [14], statementId: "david-14", note: "העבודה שלפני: 14 = דוד, ואז 1237 = התגלות." }),
  Object.freeze({ id: "geula-45", title: "גאולה ו־45", slug: "45-frequency", numbers: [45], note: "הטופיק „45 — התדר” קיים; חיבורו ל־1237 טרם נשען על מקור משותף." }),
  Object.freeze({ id: "meron", title: "מירון", slug: "meron", numbers: [14, 45], sensitive: true, note: "אירוע קשה. מוצג בעדינות, כקישור מקורות בלבד — ללא עיטור מספרי." }),
  Object.freeze({ id: "trump", title: "דונלד טראמפ", slug: "trump", numbers: [1237], note: "סף צירי הוועידה הרפובליקנית ב־2016; ראו את שכבות הדיווח, החישוב והפרשנות." }),
  Object.freeze({ id: "india", title: "הציר ההודי", slug: "india-axis", numbers: [], note: "אותה תמונת מקור מופיעה גם בציר ההודי." }),
]);

export function classifyConnections({ context, statements = [], treeRelations = [], targets = CONNECTION_TARGETS }) {
  const sharedSlugs = new Set(list(context?.links?.topics).map((row) => row?.slug));
  return targets.map((target) => {
    const edge = list(treeRelations).find((relation) => relation?.slug === target.slug && (relation.edgeRef || relation.governanceRef));
    const statement = target.statementId ? statements.find((row) => row.id === target.statementId) : null;
    let status = "candidate";
    let evidence = null;
    if (edge) { status = "tree"; evidence = { edgeRef: edge.edgeRef || null, governanceRef: edge.governanceRef || null }; }
    else if (statement) { status = "source_statement"; evidence = { galleryImageId: statement.galleryImageId }; }
    else if (sharedSlugs.has(target.slug)) {
      status = "shared_source";
      evidence = { href: list(context?.links?.topics).find((row) => row.slug === target.slug)?.href || null };
    }
    return Object.freeze({ ...target, status, evidence });
  });
}

// ── US / Trump: three layers, never merged ────────────────────────────────────────────────
export const TRUMP_THRESHOLD_LAYERS = Object.freeze({
  report: Object.freeze({
    key: "report", title: "דיווח",
    text: "בפריימריז הרפובליקניים ב־2016 נדרשו 1,237 צירי ועידה כדי לזכות במועמדות — זהו סף הוועידה.",
    state: "נוסח שמור באתר. מקורות חדשותיים מתוארכים עדיין לא צורפו לשער; הם ממתינים לרישום מקור.",
  }),
  calculation: Object.freeze({
    key: "calculation", title: "חישוב",
    text: "אין כאן חישוב גימטרי: 1,237 בשכבה הזו הוא סף מניין צירים, לא ערך של מילה.",
    state: null,
  }),
  interpretation: Object.freeze({
    key: "interpretation", title: "פרשנות",
    text: "הקשר בין סף המועמדות לבין ההתגלות הוא קריאה פרשנית של המחברים. הוא אינו עובדה ואינו קשר עץ.",
    state: null,
  }),
});
export const TRUMP_NOT_ELECTORS = "זה אינו מספר האלקטורים שבהם זכה טראמפ בבחירות הכלליות.";

// ── Israel elections: read the existing owner bundle, add nothing ───────────────────────────
export function israelElectionsNote(bundle) {
  const row = list(bundle?.evidence?.interpretation).find((entry) => entry?.id === "historical-1237-bennett");
  if (!row || row.accessTier !== "public") return null;
  const text = clean(row.statement);
  if (!text) return null;
  return Object.freeze({
    id: row.id, text, lane: "interpretation",
    // The owner bundle keeps this interpretation pending the human gate; the gate says so.
    governanceState: clean(row.governanceState) || null,
  });
}

// ── unified contract ──────────────────────────────────────────────────────────────────────
// source → occurrence → finding. Tree relations are included only when the caller has
// edgeRef/governanceRef evidence; the contract builder drops everything else.
export function buildGateProjection({ sourceItems = [], treeRelations = [], coverage = {} }) {
  const sources = [];
  const occurrences = [];
  for (const item of list(sourceItems)) {
    const sourceRef = clean(item?.sourceIdentity?.ref);
    if (!sourceRef) continue;
    sources.push({ sourceRef, title: clean(item.label) || null, sourceHref: item.reopen?.imageHref || null,
      media: item.imageUrl ? [{ mediaRef: item.mediaId, kind: "image", href: item.imageUrl, alt: clean(item.label) || null, provenance: sourceRef }] : [] });
    for (const occurrence of list(item.occurrences)) {
      const placement = occurrence.legacyPlacement || {};
      occurrences.push({
        occurrenceRef: `occ:${occurrence.mediaId}`, sourceRef,
        locator: placement.wpGalleryId != null ? `gallery:${placement.wpGalleryId}#${placement.ordering ?? ""}` : null,
        times: { occurredAt: placement.occurredAt ?? null, publishedAt: null, updatedAt: null },
      });
    }
  }
  return buildPublicWorldContentProjectionV1({ sources, occurrences, treeRelations, coverage });
}
