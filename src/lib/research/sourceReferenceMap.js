// Universal Source Reference Map v1
// Read-only evidence projection. Owns no truth, storage, graph or governance.
// Research Intake v8 remains the canonical owner of source/witness semantics.

const HEBREW_NUMERAL_VALUES = Object.freeze({
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50,
  ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
});

export function parseHebrewLocatorNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  const letters = raw.replace(/[^א-ת]/g, "");
  if (!letters) return null;
  let total = 0;
  for (const letter of letters) {
    const n = HEBREW_NUMERAL_VALUES[letter];
    if (!n) return null;
    total += n;
  }
  return total > 0 ? total : null;
}

export function normalizeWitnessText(value) {
  // Punctuation, whitespace, maqaf and source spelling separators are presentation,
  // not witness letters. We intentionally do NOT normalize the Hebrew letters themselves.
  return String(value ?? "").replace(/[^א-ת]/g, "");
}

export function nearestQuoteForReference(reference, quotedSegments = [], maxDistance = 650) {
  const refStart = Number(reference?.start);
  if (!Number.isFinite(refStart)) return null;
  let best = null;
  for (const quote of quotedSegments || []) {
    const end = Number(quote?.end);
    if (!Number.isFinite(end) || end > refStart) continue;
    const distance = refStart - end;
    if (distance > maxDistance) continue;
    if (!best || distance < best.distance) best = { quote, distance };
  }
  return best?.quote || null;
}

function verificationRow({ reference, quote, chapter, verse, witness, status, exactTextMatch, unresolvedReason = null }) {
  return {
    ...reference,
    chapter,
    verse,
    sourceQuote: quote?.text || null,
    witness: witness ? {
      corpus: "tanach_verses",
      book: witness.book,
      chapter: witness.chapter,
      verse: witness.verse,
      text: witness.text,
    } : null,
    verificationState: status,
    exactTextMatch: Boolean(exactTextMatch),
    unresolvedReason,
  };
}

/**
 * Build one read-only Source Map from already-extracted references.
 * `lookupVerse({book,chapter,verse})` is injected by the surface so this module remains
 * a generic orchestration helper rather than a second Tanakh engine/store.
 */
export async function buildSourceReferenceMap({
  source = {},
  text = "",
  references = [],
  quotedSegments = [],
  lookupVerse,
} = {}) {
  const verified = [];

  for (const reference of references || []) {
    const chapter = parseHebrewLocatorNumber(reference?.chapterRaw);
    const verse = parseHebrewLocatorNumber(reference?.verseRaw);
    const quote = nearestQuoteForReference(reference, quotedSegments);

    if (!reference?.book || !chapter || !verse || typeof lookupVerse !== "function") {
      verified.push(verificationRow({
        reference,
        quote,
        chapter,
        verse,
        witness: null,
        status: "unresolved",
        exactTextMatch: false,
        unresolvedReason: !reference?.book || !chapter || !verse ? "invalid_locator" : "witness_lookup_unavailable",
      }));
      continue;
    }

    let witness = null;
    try {
      witness = await lookupVerse({ book: reference.book, chapter, verse });
    } catch {
      witness = null;
    }

    if (!witness) {
      verified.push(verificationRow({
        reference,
        quote,
        chapter,
        verse,
        witness: null,
        status: "unresolved",
        exactTextMatch: false,
        unresolvedReason: "witness_not_found",
      }));
      continue;
    }

    const quoteNorm = normalizeWitnessText(quote?.text);
    const witnessNorm = normalizeWitnessText(witness.text);
    const exactTextMatch = Boolean(quoteNorm && witnessNorm && quoteNorm === witnessNorm);

    verified.push(verificationRow({
      reference,
      quote,
      chapter,
      verse,
      witness,
      status: exactTextMatch ? "VERIFIED_EXACT" : "REFERENCE_VERIFIED",
      exactTextMatch,
      unresolvedReason: quote && !exactTextMatch ? "quoted_text_differs_from_canonical_witness" : null,
    }));
  }

  const counts = {
    references: verified.length,
    verifiedExact: verified.filter((r) => r.verificationState === "VERIFIED_EXACT").length,
    referenceVerified: verified.filter((r) => r.verificationState === "REFERENCE_VERIFIED").length,
    unresolved: verified.filter((r) => r.verificationState === "unresolved").length,
  };

  return {
    v: 1,
    contract: "research_intake_foundation_contract_v8",
    mode: "read_only_evidence_projection",
    sourceArtifact: {
      kind: source.kind || "unknown",
      sourceRef: source.sourceRef || null,
      title: source.title || null,
      contributor: source.contributor || null,
      occurredAt: source.occurredAt || null,
      textLength: String(text || "").length,
    },
    references: verified,
    supportingSources: [],
    contradictorySources: [],
    unresolved: verified.filter((r) => r.verificationState === "unresolved" || r.unresolvedReason),
    counts,
    invariants: [
      "SOURCE_REFERENCE_IS_EVIDENCE_NOT_GRAPH_IDENTITY",
      "REFERENCE_FOUND_DOES_NOT_EQUAL_QUOTED_TEXT_VERIFIED",
      "VERIFIED_EXACT_REQUIRES_NORMALIZED_SOURCE_QUOTE_EQUALS_CANONICAL_WITNESS",
      "SOURCE_MAP_DOES_NOT_CANONICALIZE_OR_PUBLISH",
    ],
  };
}

export default buildSourceReferenceMap;
