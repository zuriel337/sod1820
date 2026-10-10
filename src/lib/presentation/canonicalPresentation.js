import { hebrewNumeral } from "../gematria.js";
import { formatTanakhReferenceParts } from "./tanakhReferenceParts.js";

const METHOD_PUBLIC_LABEL_OVERRIDES = Object.freeze({
  "קדמי": "משולש",
  "משולש גדול": "משולש גדול",
  "רגיל+משולש": "רגיל + משולש",
});

const LEGACY_PUBLIC_LABEL_OVERRIDES = Object.freeze({
  "קדמי · משולש": "משולש",
  "קדמי גדול · משולש גדול": "משולש גדול",
  "רגיל + משולש (קדמי)": "רגיל + משולש",
});

const clean = (value) => value == null ? "" : String(value).trim();


const RESEARCH_PUBLIC_LABELS = Object.freeze({
  convergence: Object.freeze({ singular: "התכנסות", plural: "התכנסויות" }),
});

const ENTITY_PUBLIC_LABELS = Object.freeze({
  topic: Object.freeze({ singular: "התכנסות", plural: "התכנסויות" }),
  convergence: Object.freeze({ singular: "התכנסות", plural: "התכנסויות" }),
  number: Object.freeze({ singular: "מספר", plural: "מספרים" }),
  book: Object.freeze({ singular: "ספר / מקור", plural: "ספרים ומקורות" }),
  source: Object.freeze({ singular: "מקור", plural: "מקורות" }),
  event: Object.freeze({ singular: "אירוע", plural: "אירועים" }),
  phrase: Object.freeze({ singular: "ביטוי", plural: "ביטויים" }),
  word: Object.freeze({ singular: "מילה", plural: "מילים" }),
  foreign_word: Object.freeze({ singular: "מילה לועזית", plural: "מילים לועזיות" }),
  language_bridge: Object.freeze({ singular: "גשר שפה", plural: "גשרי שפה" }),
  image: Object.freeze({ singular: "תמונה", plural: "תמונות" }),
  media: Object.freeze({ singular: "מדיה", plural: "מדיה" }),
  post: Object.freeze({ singular: "פוסט", plural: "פוסטים" }),
  entity: Object.freeze({ singular: "ישות", plural: "ישויות" }),
  relation: Object.freeze({ singular: "קשר", plural: "קשרים" }),
});

const RELATION_PUBLIC_LABELS = Object.freeze({
  equals: "שוויון",
  cross: "הצטלבות",
  related: "קשור",
  contains: "מכיל",
  mentions: "מזכיר",
  converges_on: "מתכנס אל",
  evidence_for: "מקור ל־",
  cipher_link: "קשר לצופן",
  demand_signal: "אות ביקוש",
  scale_x10: "קשר ×10",
  zero_scale: "שינוי קנה־מידה",
  source_provenance: "מקור",
});

const FINDING_KIND_PUBLIC_LABELS = Object.freeze({
  "graph-relation": "קשר",
  "graph-entity": "ישות",
  research: "מחקר",
  topic: "התכנסות",
  convergence: "התכנסות",
  source: "מקור",
  number: "מספר",
  entity: "ישות",
  post: "פוסט",
  event: "אירוע",
  verse: "פסוק",
});

export function canonicalEntityPublicLabel(type, { plural = false } = {}) {
  const key = clean(type).toLowerCase();
  const labels = ENTITY_PUBLIC_LABELS[key];
  if (!labels) return clean(type) || (plural ? "פריטים" : "פריט");
  return plural ? labels.plural : labels.singular;
}

export function canonicalRelationPublicLabel(type) {
  const key = clean(type).toLowerCase();
  return RELATION_PUBLIC_LABELS[key] || "קשור";
}

export function canonicalFindingKindPublicLabel(kind, type = null) {
  const key = clean(kind).toLowerCase();
  return FINDING_KIND_PUBLIC_LABELS[key] || canonicalEntityPublicLabel(type || kind);
}

export function looksLikeMediaFilename(value) {
  return /\.(?:jpe?g|png|webp|gif|svg|avif|bmp|heic|heif)$/i.test(clean(value));
}

function looksTechnicalPublicLabel(value) {
  const text = clean(value);
  return !text
    || looksLikeMediaFilename(text)
    || /^(?:gallery(?:_images)?|nodes?|edges?|work_log|channel_updates|wa_bot_log|research-cue):/i.test(text)
    || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text);
}

export function canonicalMediaPublicLabel(input, { fallback = "תמונה" } = {}) {
  const row = input && typeof input === "object" ? input : { label: input };
  const candidates = [
    row.publicLabel,
    row.title,
    row.name,
    row.label,
    row.description,
  ].map(clean).filter(Boolean);
  const human = candidates.find((value) => !looksTechnicalPublicLabel(value));
  if (!human) return fallback;
  return human.length > 82 ? human.slice(0, 81).trimEnd() + "…" : human;
}

// ONE public media label + summary for every surface (Number/World/Topic/Projector).
// Accepts an intrinsic payload or a raw {name,label,description}. Context reasons live elsewhere.
const MEDIA_KIND_LABEL = Object.freeze({ screenshot: "צילום מסך" });
export function canonicalMediaPresentation(input, { fallback = "תמונה" } = {}) {
  const src = input && typeof input === "object" ? input : { label: input };
  const label = canonicalMediaPublicLabel({
    publicLabel: src.publicLabel,
    title: src.title,
    name: src.name,
    label: src.label,
    description: src.legacyPlacement?.description ?? src.description,
  }, { fallback });
  const kind = clean(src.provenance?.storedMediaKind);
  const interp = src.interpretation || {};
  const desc = clean(src.legacyPlacement?.description ?? src.description);
  // Prefer STRUCTURED stored interpretation; legacy placement description is a labelled fallback.
  const structured = clean(interp.summary) || clean(interp.event) || clean(interp.scene) || clean(interp.mediaKind);
  let summaryRaw = "";
  let summaryBasis = null;
  if (structured) {
    summaryRaw = structured;
    summaryBasis = clean(interp.summary) ? "stored_interpretation_summary" : clean(interp.event) ? "stored_interpretation_event" : clean(interp.scene) ? "stored_interpretation_scene" : "stored_interpretation_media_kind";
  } else if (desc && desc !== label) {
    summaryRaw = desc;
    summaryBasis = "legacy_placement_description";
  }
  const summary = summaryRaw.length > 160 ? summaryRaw.slice(0, 159).trimEnd() + "…" : summaryRaw;
  return { label, summary: summary || null, summaryBasis: summary ? summaryBasis : null, kindLabel: MEDIA_KIND_LABEL[kind] || null };
}

export function canonicalGraphRelationTitle(relation, { anchorId = null } = {}) {
  if (!relation || typeof relation !== "object") return "קשר";
  const from = relation.from || null;
  const to = relation.to || null;
  const anchor = clean(anchorId);
  const counterpart = anchor && clean(from?.id) === anchor ? to
    : anchor && clean(to?.id) === anchor ? from
      : to || from;
  const type = clean(counterpart?.type);
  const label = ["image", "media"].includes(type)
    ? canonicalMediaPublicLabel(counterpart, { fallback: canonicalEntityPublicLabel(type) })
    : clean(counterpart?.label) || canonicalEntityPublicLabel(type || "entity");
  return [label, canonicalRelationPublicLabel(relation.relationType)].filter(Boolean).join(" · ");
}

/**
 * Human-facing Hebrew label for canonical research entity types.
 * Internal identity remains unchanged (e.g. type="convergence").
 */
export function canonicalResearchPublicLabel(type, { plural = false } = {}) {
  const key = clean(type).toLowerCase();
  const labels = RESEARCH_PUBLIC_LABELS[key];
  if (!labels) return clean(type);
  return plural ? labels.plural : labels.singular;
}

/**
 * Human-facing Hebrew method label.
 * Identity remains the canonical Registry method_key; this function is presentation only.
 */
export function canonicalMethodPublicLabel(method) {
  const key = clean(typeof method === "string"
    ? method
    : method?.method_key ?? method?.methodKey ?? method?.key ?? method?.method);
  if (METHOD_PUBLIC_LABEL_OVERRIDES[key]) return METHOD_PUBLIC_LABEL_OVERRIDES[key];

  const label = clean(typeof method === "string"
    ? method
    : method?.display_label ?? method?.displayLabel ?? method?.label);
  if (LEGACY_PUBLIC_LABEL_OVERRIDES[label]) return LEGACY_PUBLIC_LABEL_OVERRIDES[label];
  return label || key || "שיטה";
}

/**
 * Registry order is the only method-order authority. Projection may take a bounded prefix,
 * but must not reorder it with a local priority array.
 */
export function sortMethodsByCanonicalOrder(rows = []) {
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const ao = Number(a?.sort_order ?? a?.sortOrder);
    const bo = Number(b?.sort_order ?? b?.sortOrder);
    const af = Number.isFinite(ao) ? ao : Number.MAX_SAFE_INTEGER;
    const bf = Number.isFinite(bo) ? bo : Number.MAX_SAFE_INTEGER;
    return af - bf
      || canonicalMethodPublicLabel(a).localeCompare(canonicalMethodPublicLabel(b), "he")
      || clean(a?.method_key ?? a?.methodKey ?? a?.key).localeCompare(clean(b?.method_key ?? b?.methodKey ?? b?.key), "he");
  });
}

export function hebrewReferenceNumber(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) return "";
  return hebrewNumeral(n);
}

function parseRefString(ref) {
  const raw = clean(ref);
  if (!raw) return null;
  const match = raw.match(/^(.+?)\s+(\d+)(?:\s*[:,]\s*(\d+))?$/);
  if (!match) return null;
  return {
    book: clean(match[1]),
    chapter: Number(match[2]),
    verse: match[3] == null ? null : Number(match[3]),
    raw,
  };
}

/**
 * Hebrew-first display reference. Raw/canonical source identity must remain unchanged elsewhere.
 * Examples: ישעיהו 53:5 -> ישעיהו נ״ג, ה׳ ; תהלים 23 -> תהלים כ״ג.
 */
export function formatTanakhRef(input, chapter = null, verse = null) {
  let book = "";
  let ch = chapter;
  let vs = verse;
  let fallback = "";

  if (input && typeof input === "object") {
    book = clean(input.book ?? input.bookLabel ?? input.book_name);
    ch = input.chapter ?? chapter;
    vs = input.verse ?? verse;
    fallback = clean(input.ref);
  } else if (chapter != null) {
    book = clean(input);
    fallback = [book, ch, vs].filter((value) => value != null && value !== "").join(" ");
  } else {
    const parsed = parseRefString(input);
    if (!parsed) return clean(input);
    ({ book, chapter: ch, verse: vs, raw: fallback } = parsed);
  }

  const chapterHe = hebrewReferenceNumber(ch);
  if (!book || !chapterHe) return fallback || clean(input);
  const verseHe = hebrewReferenceNumber(vs);
  return formatTanakhReferenceParts(book, chapterHe, verseHe);
}

export function formatVerseGematriaSuffix(value) {
  const n = Number(value);
  return Number.isFinite(n) ? ` = ${n.toLocaleString("he-IL")}` : "";
}
