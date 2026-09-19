import { hebrewNumeral } from "../gematria.js";

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
  return verseHe ? `${book} ${chapterHe}, ${verseHe}` : `${book} ${chapterHe}`;
}

export function formatVerseGematriaSuffix(value) {
  const n = Number(value);
  return Number.isFinite(n) ? ` = ${n.toLocaleString("he-IL")}` : "";
}
