import { AHAVAT_CONTENT_SOURCE } from "./ahavatTorahContentDepth2029.js";
import { AHAVAT_ROOT_SECTIONS, AHAVAT_ROOT_COLUMNS } from "./ahavatTorahRoots2029.js";
import { ahavatSourceSearch } from "./ahavatTorahPeople2029.js";

// Local source-glyph readings, not modernization, lexical normalization or a
// claim that a whole column has been proofread. The original OCR is never edited.
const readings = [
  ["roots:31:right", "ההו ובהו", "תהו ובהו"],
  ["roots:31:right", "על פני ההום", "על פני תהום"],
  ["roots:31:left", "אף הגעו", "אף תגעו"],
  ["roots:32:right", "צפור בערו", "צפור בעדו"],
  ["roots:32:right", "ויכםו", "ויכסו"],
  ["roots:32:left", "בחמלת המלם", "בחמלת המלט"],
  ["roots:33:right", "יפנשך", "יפגשך"],
  ["roots:33:left", "בצפררעים", "בצפרדעים"],
  ["roots:34:right", "ומזלנותיו", "ומזלגותיו"],
  ["roots:34:right", "רשת ברכוב", "רשת כרכוב"],
  ["roots:34:left", "מנרש", "מגרש"],
  ["roots:35:right", "וראבון", "ודאבון"],
  ["roots:35:right", "בשרירוה", "בשרירות"],
  ["roots:35:left", "ואתא רת", "ואתא דת"],
  ["roots:35:left", "וררום", "ודרום"],
];
export const AHAVAT_ROOT_GLYPH_READINGS = Object.freeze(readings.map(([fragmentId, before, after], ordinal) => Object.freeze({
  id: `${fragmentId}:glyph-review:${ordinal + 1}`,
  fragmentId, pdfPage: Number(fragmentId.split(":")[1]), before, after,
  status: "local_glyph_reading", basis: "direct_visual_source_comparison",
  sourceUrl: `${AHAVAT_CONTENT_SOURCE.pdfUrl}#page=${fragmentId.split(":")[1]}&view=FitH`,
})));

export function ahavatPartiallyReviewedRoots(bundle) {
  if (bundle?.source_identity !== AHAVAT_CONTENT_SOURCE.identity || bundle.pdf_sha256 !== AHAVAT_CONTENT_SOURCE.pdfSha256 || bundle.schema_version !== "ahavat-torah-roots-transcript.v1" || !Array.isArray(bundle.fragments)) throw new Error("Foreign roots source");
  const ids = new Set(bundle.fragments.map(fragment => fragment.id));
  if (bundle.fragments.length !== 10 || ids.size !== 10 || AHAVAT_ROOT_GLYPH_READINGS.some(reading => !ids.has(reading.fragmentId))) throw new Error("Incomplete roots source");
  return bundle.fragments.map(fragment => {
    if (!AHAVAT_ROOT_COLUMNS.some(column => column.id === fragment.id && column.page === fragment.pdf_page && column.column === fragment.column)) throw new Error("Foreign roots column");
    const changes = AHAVAT_ROOT_GLYPH_READINGS.filter(item => item.fragmentId === fragment.id);
    let text = fragment.text;
    for (const change of changes) {
      if (typeof text !== "string" || text.split(change.before).length !== 2 || fragment.pdf_page !== change.pdfPage) throw new Error(`Source review no longer applies: ${change.id}`);
      text = text.replace(change.before, change.after);
    }
    return Object.freeze({ id: fragment.id, pdfPage: fragment.pdf_page, column: fragment.column,
      originalOcr: fragment.text, partiallyReviewedText: text,
      appliedReadings: Object.freeze(changes.map(item => item.id)),
      status: "partial_proofreading_not_verified_quotation",
      remainingReview: "שאר הטור עדיין מחייב הגהה מול הצילום; לא נקבע מספר ערכים ולא הוחל כלל שורש מודרני.",
    });
  });
}

// Search both reading layers without changing the source-native column identity.
export function ahavatReviewedRootFragments(bundle, query = "") {
  if (!bundle) return [];
  const needle = ahavatSourceSearch(query);
  return ahavatPartiallyReviewedRoots(bundle).map(fragment => ({
    id: fragment.id, pdf_page: fragment.pdfPage, column: fragment.column,
    text: fragment.partiallyReviewedText, originalOcr: fragment.originalOcr,
    appliedReadings: fragment.appliedReadings, reviewStatus: fragment.status,
  })).filter(fragment => !needle || ahavatSourceSearch([
    fragment.text, fragment.originalOcr,
    AHAVAT_ROOT_SECTIONS.find(section => section.page === fragment.pdf_page)?.title,
  ].join(" ")).includes(needle));
}
