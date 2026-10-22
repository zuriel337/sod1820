// Pure Hebrew presentation adapter for Books 2029 canonical values.
//
// This module changes presentation only. It never infers truth, authorization,
// publication, verification or canonicality, and it deliberately keeps the raw
// value separate from the user-facing Hebrew label.

const RAW_DETAIL = "הערך המקורי זמין בפרטי הבדיקה.";

const view = (labelHe, semanticRole = "neutral", detailHe = null) =>
  Object.freeze({ labelHe, detailHe, semanticRole });

const dictionary = (rows) => Object.freeze(Object.fromEntries(rows));

const COVERAGE_KEYS = dictionary([
  ["structural", view("מיפוי מבני")],
  ["structural_digital_object", view("מבנה המקור הדיגיטלי")],
  ["structural_sections", view("חלקים מבניים")],
  ["research_map", view("מפת המחקר")],
  ["content_scan", view("סריקת תוכן")],
  ["close_read", view("קריאה צמודה")],
  ["exact_witness", view("בדיקת עדות המקור")],
  ["exact_witness_close_read", view("קריאה מדויקת בעדות המקור")],
  ["source_exhaustion", view("מיצוי המקור")],
  ["corpus_exhaustion", view("מיצוי הקורפוס")],
  ["deep_research", view("מחקר עומק")],
  ["dossier_version", view("גרסת תיק המחקר")],
  ["active_blocks", view("בלוקים פעילים")],
  ["exact_lexical_census", view("מפקד לשוני מדויק")],
  ["historical_witness_collation", view("השוואת עדים היסטוריים")],
  ["unresolved_total", view("נקודות לא פתורות", "unresolved")],
  ["whole_book_high_value_map", view("מפת מוקדי הערך של הספר")],
]);

const COVERAGE_VALUES = dictionary([
  ["COMPLETE", view("הושלם", "complete")],
  ["CLOSED", view("נסגר", "complete")],
  ["PARTIAL", view("חלקי", "partial")],
  ["NOT ESTABLISHED", view("טרם הוכח", "unresolved")],
  ["NOT EXHAUSTIVE", view("אינו ממצה", "partial")],
  ["SUFFICIENT", view("מספיק לשלב הנוכחי", "sufficient")],
  ["SUFFICIENT_FOR_PROJECTION", view("מספיק להצגה", "sufficient")],
  ["TABLE OF CONTENTS MAPPED", view("תוכן העניינים מופה", "complete")],
  ["327 PDF PAGES PRESENT", view("327 עמודי PDF קיימים", "metric")],
  ["48/48 COMPLETE", view("48 מתוך 48 הושלמו", "complete")],
  ["90/90 COMPLETE", view("90 מתוך 90 הושלמו", "complete")],
  ["99/99 COMPLETE", view("99 מתוך 99 הושלמו", "complete")],
  ["220/220 COMPLETE", view("220 מתוך 220 הושלמו", "complete")],
  ["195/195 COMPLETE", view("195 מתוך 195 הושלמו", "complete")],
  ["V2 CLOSED", view("מחקר עומק גרסה 2 נסגר", "complete")],
  ["BOUNDED CLOSURE WITH EXPLICIT RESIDUALS", view("נסגר בגבול מוגדר, עם נקודות המשך מפורשות", "partial")],
  ["CURRENT CLAIM-BEARING LOCI VERIFIED AGAINST EXTERNAL 2ND-EDITION WITNESS", view("מוקדי הטענות הנוכחיים אומתו מול עד חיצוני מן המהדורה השנייה", "verified")],
  ["NOT ESTABLISHED AS COMPLETE", view("שלמות הבדיקה טרם הוכחה", "unresolved")],
  ["ALL 5 PARTS MAPPED AT DECISION-CHANGING LOCI · PARTS 1+3 DEEP", view("כל חמשת החלקים מופו במוקדים המשנים החלטה; חלקים 1 ו־3 נחקרו לעומק", "partial")],
  ["BOUNDED / PROCEDURE-AND-REPRESENTATION FAMILIES", view("כיסוי מוגדר של משפחות תהליך וייצוג", "partial")],
  ["MAJOR THEMATIC BLOCKS + TERMINAL SECTIONS CLOSED", view("החטיבות הנושאיות המרכזיות והסעיפים המסיימים נסגרו", "complete")],
  ["PARTIAL / HIGH-VALUE LOCI + RECONSTRUCTED BATCHES", view("כיסוי חלקי של מוקדי ערך ושל קבוצות ששוחזרו", "partial")],
  ["GOLDEN V3 · WHOLE-BOOK HIGH-VALUE MAP", view("מפת מוקדי ערך לכל הספר, גרסה 3", "neutral")],
  ["WHOLE-BOOK STRESS TEST", view("בדיקת עומס מחקרית לכל הספר", "neutral")],
  ["COMPLETE FOR CURRENT GOLDEN", view("הושלם לצורך תרחיש הקבלה הנוכחי", "complete")],
]);

const LOCATOR_KINDS = dictionary([
  ["pdf_page_block", view("עמוד PDF ובלוק")],
  ["pdf_page_region", view("עמוד PDF ואזור")],
  ["pdf_page_work_block", view("עמוד PDF, חיבור פנימי ובלוק")],
  ["pdf_page_zone_work", view("עמוד PDF, אזור וחיבור")],
  ["external_pdf_page", view("עמוד בקובץ PDF חיצוני")],
  ["section_locus", view("סעיף או יחידת תוכן")],
  ["verse", view("ספר, פרק ופסוק")],
]);

const EDITION_STATUSES = dictionary([
  ["bibliographic_metadata_partial", view("פרטי המהדורה חלקיים", "partial")],
  ["bibliographic_metadata_verified_from_front_matter", view("פרטי המהדורה אומתו מן הדפים הפותחים", "verified")],
  ["edition_identity_not_promoted_here", view("זהות המהדורה טרם הופרדה כזהות עצמאית", "pending")],
  ["first_print_identity_verified_source_plus_bibliographic", view("זהות הדפוס הראשון אומתה מן המקור ומפרטים ביבליוגרפיים", "verified")],
  ["site_research_edition_historical_edition_not_adjudicated", view("קיימת מהדורת מחקר יציבה; המהדורה ההיסטורית המדויקת טרם הוכרעה", "pending")],
]);

const SOURCE_WORK_STATUSES = dictionary([
  ["SEMANTIC_TIER_NOT_PROMOTED_TO_SEPARATE_NODE", view("החיבור מזוהה בתוך הספר וטרם הופרד כזהות עצמאית", "pending")],
  ["COMPOSITE_WORK_FAMILY_SEMANTIC_TIER_NOT_PROMOTED_TO_SEPARATE_NODE", view("משפחת חיבורים מורכבת מזוהה בתוך הספר וטרם הופרדה לזהויות עצמאיות", "pending")],
]);

const TEXTUAL_VERSION_STATUSES = dictionary([
  ["NOT_YET_DISTINGUISHED_FROM_CURRENT_WITNESS", view("הגרסה הטקסטואלית טרם הופרדה מן העדות הנוכחית", "pending")],
]);

const RESEARCH_KINDS = dictionary([
  ["observation", view("תצפית מחקרית")],
  ["hypothesis", view("השערת מחקר", "interpretive")],
  ["fact", view("טענת עובדה", "claim")],
  ["relation", view("קשר מחקרי")],
  ["question", view("שאלת מחקר", "unresolved")],
]);

const RESEARCH_STATUSES = dictionary([
  ["candidate", view("מועמד למחקר", "candidate")],
  ["approved", view("מאושר", "approved")],
  ["canonical", view("קנוני", "canonical")],
  ["published", view("פורסם", "published")],
]);

const ACCESS_STATUSES = dictionary([
  ["private", view("פרטי", "private")],
  ["person_only", view("אישי בלבד", "private")],
  ["group", view("זמין לקבוצה מורשית", "restricted")],
  ["public_candidate", view("מועמד לפרסום ציבורי", "public_candidate")],
  ["public", view("ציבורי", "public")],
  ["published", view("פורסם לציבור", "public")],
]);

const VERIFICATION_STATES = dictionary([
  ["match", view("נמצא תואם", "verified")],
  ["not_applicable", view("אימות מנוע אינו חל כאן", "not_applicable")],
  ["not_tested", view("טרם נבדק במנוע", "pending")],
  ["mismatch", view("נמצאה אי־התאמה", "mismatch")],
  ["source_witness_verified", view("עדות המקור אומתה", "verified")],
  ["multi_locus_source_witness_verified", view("עדות המקור אומתה בכמה מוקדים", "verified")],
  ["source_witness_verified_multi_locus", view("עדות המקור אומתה בכמה מוקדים", "verified")],
  ["source_procedure_reconstructed_with_engine_verified_numeric_components", view("הליך המקור שוחזר; הרכיבים המספריים אומתו במנוע", "verified")],
  ["aggregate_verified_label_semantics_unresolved", view("הסכום אומת; משמעות התוויות עדיין פתוחה", "unresolved")],
  ["arithmetic_source_claim_not_gematria_engine", view("טענה חשבונית מן המקור; אינה אימות גימטריה במנוע", "not_applicable")],
  ["component_engine_verified_composite_source_derived", view("הרכיבים אומתו במנוע; ההרכבה נגזרת מן המקור", "verified")],
  ["component_match_composite_unregistered", view("הרכיבים תואמים; ההרכבה אינה רשומה", "pending")],
  ["component_values_tested", view("ערכי הרכיבים נבדקו", "verified")],
  ["component_verified_operation_unmapped", view("הרכיבים אומתו; הפעולה טרם מופתה", "pending")],
  ["component_verified_representation_mismatch", view("הרכיבים אומתו; נמצאה אי־התאמה בייצוג", "mismatch")],
  ["component_verified_source_procedure_pdf_pending", view("הרכיבים אומתו; הליך המקור ממתין לבדיקת PDF", "pending")],
  ["digital_internal_consistency_match_pdf_pending", view("העקביות הדיגיטלית תואמת; בדיקת PDF ממתינה", "pending")],
  ["source_family_reconstructed_canonical_semantics_distinguished", view("משפחת המקור שוחזרה וההבחנות הסמנטיות נשמרו", "verified")],
  ["source_family_reconstructed_execution_not_applicable", view("משפחת המקור שוחזרה; הרצה אינה רלוונטית", "not_applicable")],
  ["source_family_reconstructed_execution_unmapped", view("משפחת המקור שוחזרה; ההרצה טרם מופתה", "pending")],
  ["source_text_reconstructed_count_match_execution_partial", view("טקסט המקור שוחזר והספירה תואמת; ההרצה חלקית", "partial")],
  ["source_witness_re_rendered_and_dense_line_visually_adjudicated_with_digital_reconstruction_aid", view("עדות המקור הוצגה מחדש ונבדקה חזותית בסיוע שחזור דיגיטלי", "verified")],
  ["source_witness_verified_components_numeric_checked", view("עדות המקור אומתה ורכיביה המספריים נבדקו", "verified")],
  ["source_witness_verified_no_execution_mapping", view("עדות המקור אומתה; אין מיפוי להרצה", "verified")],
  ["source_witness_verified_numeric_not_reproduced", view("עדות המקור אומתה; התוצאה המספרית לא שוחזרה", "unresolved")],
  ["source_witness_verified_reconstructed", view("עדות המקור אומתה באמצעות שחזור", "verified")],
  ["source_witness_verified_structural_reconstruction", view("עדות המקור אומתה באמצעות שחזור מבני", "verified")],
  ["textual_restoration_candidate_pdf_unadjudicated", view("מועמד לשחזור טקסטואלי; ה־PDF טרם הוכרע", "pending")],
  ["worked_multi_locus_engine_components_verified_pdf_pending", view("עיבוד רב־מוקדי; רכיבי המנוע אומתו ובדיקת PDF ממתינה", "pending")],
]);

const TECHNICAL_TERMS = dictionary([
  ["BOOKS · SOURCES · WITNESSES", view("ספרים, מקורות ועדויות")],
  ["BOOKS · ONE RESEARCH REALITY", view("ספרייה אחת בתוך מרחב המחקר")],
  ["CORPUS PROJECTION", view("קורפוס מקורות")],
  ["Library Group", view("קבוצת ספרים")],
  ["PERSONAL SOURCE INTAKE", view("הוספת מקור אישי למחקר")],
  ["Private Source", view("מקור פרטי")],
  ["Light Intake", view("קליטה ראשונית")],
  ["Book Research Lab", view("מחקר עומק בספר")],
  ["runtime pending", view("התשתית עדיין אינה זמינה", "unavailable")],
  ["Research Object", view("פריט מחקר")],
  ["dataset", view("מערך נתונים")],
  ["snapshot", view("תמונת מצב מתועדת")],
  ["coverage", view("כיסוי")],
  ["residuals", view("נקודות שנותרו לבדיקה")],
  ["Projection", view("תצוגה")],
  ["Foundation", view("תשתית המערכת")],
  ["Human Gate", view("אישור אנושי")],
  ["Golden", view("תרחיש קבלה")],
  ["engine", view("מנוע החישוב", "technical", "לאחר שההקשר ברור אפשר לקצר ל״המנוע״.")],
  ["trace", view("פירוט הבדיקה", "technical")],
  ["raw", view("חומר מקורי או חומר גולמי", "technical", "הניסוח המדויק נקבע לפי ההקשר.")],
]);

const SCREEN_STATES = dictionary([
  ["library_loading", view("טוען את הספרייה…", "loading")],
  ["book_loading", view("טוען את הספר ואת החומר המקושר אליו…", "loading")],
  ["no_authorized_books", view("אין כרגע ספרים זמינים להצגה.", "empty")],
  ["book_unavailable", view("הספר אינו זמין כרגע.", "unavailable")],
  ["restricted", view("חלק מחומר המחקר אינו זמין בהרשאה הנוכחית.", "restricted")],
  ["truncated", view("מוצג מבחר ראשוני; חומר נוסף נשמר במאגר וייטען לפי דרישה.", "partial")],
  ["no_approved_material", view("אין כרגע חומר מחקר מאושר להצגה.", "empty")],
  ["network_error", view("לא ניתן לטעון כרגע. אפשר לנסות שוב.", "failure")],
  ["action_unavailable", view("האפשרות עדיין אינה זמינה.", "unavailable")],
  ["save_success", view("נשמר בספרייה.", "success")],
  ["save_failure", view("השמירה לא הושלמה. אפשר לנסות שוב.", "failure")],
]);

export const BOOK_HEBREW_PRESENTATION_DOMAINS = Object.freeze({
  COVERAGE_KEY: "coverage_key",
  COVERAGE_VALUE: "coverage_value",
  LOCATOR_KIND: "locator_kind",
  EDITION_STATUS: "edition_status",
  SOURCE_WORK_STATUS: "source_work_status",
  TEXTUAL_VERSION_STATUS: "textual_version_status",
  RESEARCH_KIND: "research_kind",
  RESEARCH_STATUS: "research_status",
  ACCESS_STATUS: "access_status",
  VERIFICATION_STATE: "verification_state",
  TECHNICAL_TERM: "technical_term",
  SCREEN_STATE: "screen_state",
});

function rawOrNull(rawValue) {
  return rawValue == null ? null : rawValue;
}

function clean(rawValue) {
  return rawValue == null ? "" : String(rawValue).trim();
}

function result(rawValue, selected, isKnown) {
  return Object.freeze({
    labelHe: selected.labelHe,
    detailHe: selected.detailHe ?? null,
    semanticRole: selected.semanticRole,
    rawValue: rawOrNull(rawValue),
    isKnown,
  });
}

function presentMapped(rawValue, map, {
  normalize = (value) => value,
  missing = view("המצב טרם הוגדר", "unknown"),
  unknown = view("קיים מצב נוסף", "unknown", RAW_DETAIL),
} = {}) {
  const cleaned = clean(rawValue);
  if (!cleaned) return result(rawValue, missing, false);
  const key = normalize(cleaned);
  const selected = Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
  return result(rawValue, selected || unknown, Boolean(selected));
}

const lower = (value) => value.toLowerCase();
const upper = (value) => value.toUpperCase();

export function presentBookCoverageKey(rawValue) {
  return presentMapped(rawValue, COVERAGE_KEYS, {
    normalize: lower,
    missing: view("מדד כיסוי נוסף", "unknown"),
    unknown: view("מדד כיסוי נוסף", "unknown", RAW_DETAIL),
  });
}

export function presentBookCoverageValue(rawValue) {
  const cleaned = clean(rawValue);
  if (!cleaned) return result(rawValue, view("מצב הכיסוי דורש עיון", "unknown"), false);
  const exact = COVERAGE_VALUES[upper(cleaned)];
  if (exact) return result(rawValue, exact, true);

  const ratio = cleaned.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (ratio) return result(rawValue, view(`${ratio[1]} מתוך ${ratio[2]}`, "metric"), true);
  const version = cleaned.match(/^v(\d+)$/i);
  if (version) return result(rawValue, view(`גרסה ${version[1]}`, "metric"), true);
  if (/^\d+$/.test(cleaned)) return result(rawValue, view(cleaned, "metric"), true);

  return result(rawValue, view("מצב הכיסוי דורש עיון", "unknown", RAW_DETAIL), false);
}

export function presentBookLocatorKind(rawValue) {
  return presentMapped(rawValue, LOCATOR_KINDS, {
    normalize: lower,
    missing: view("מראה־מקום מפורט", "unknown"),
    unknown: view("מראה־מקום מפורט", "unknown", RAW_DETAIL),
  });
}

export function presentBookEditionStatus(rawValue) {
  return presentMapped(rawValue, EDITION_STATUSES, {
    normalize: lower,
    missing: view("פרטי המהדורה עדיין חלקיים", "partial"),
    unknown: view("מצב המהדורה דורש עיון", "unknown", RAW_DETAIL),
  });
}

export function presentBookSourceWorkStatus(rawValue) {
  return presentMapped(rawValue, SOURCE_WORK_STATUSES, {
    normalize: upper,
    missing: view("מצב החיבור דורש עיון", "unknown"),
    unknown: view("מצב החיבור דורש עיון", "unknown", RAW_DETAIL),
  });
}

export function presentBookTextualVersionStatus(rawValue) {
  return presentMapped(rawValue, TEXTUAL_VERSION_STATUSES, {
    normalize: upper,
    missing: view("מצב הגרסה הטקסטואלית דורש עיון", "unknown"),
    unknown: view("מצב הגרסה הטקסטואלית דורש עיון", "unknown", RAW_DETAIL),
  });
}

export function presentBookResearchKind(rawValue) {
  return presentMapped(rawValue, RESEARCH_KINDS, {
    normalize: lower,
    missing: view("פריט מחקר", "unknown"),
    unknown: view("פריט מחקר", "unknown", RAW_DETAIL),
  });
}

export function presentBookResearchStatus(rawValue) {
  return presentMapped(rawValue, RESEARCH_STATUSES, {
    normalize: lower,
    missing: view("מצב המחקר טרם הוגדר", "unknown"),
    unknown: view("מצב המחקר טרם הוגדר", "unknown", RAW_DETAIL),
  });
}

export function presentBookAccessStatus(rawValue) {
  return presentMapped(rawValue, ACCESS_STATUSES, {
    normalize: lower,
    missing: view("מצב הגישה טרם הוגדר", "unknown"),
    unknown: view("מצב הגישה טרם הוגדר", "unknown", RAW_DETAIL),
  });
}

export function presentBookVerificationState(rawValue) {
  return presentMapped(rawValue, VERIFICATION_STATES, {
    normalize: lower,
    missing: view("מצב הבדיקה טרם הוגדר", "unknown"),
    unknown: view("קיים מצב בדיקה נוסף", "unknown", "הפרטים זמינים בשכבת הבדיקה."),
  });
}

export function presentBookTechnicalTerm(rawValue) {
  return presentMapped(rawValue, TECHNICAL_TERMS, {
    missing: view("מונח מערכת", "technical"),
    unknown: view("מונח מערכת", "technical", RAW_DETAIL),
  });
}

export function presentBookScreenState(rawValue) {
  return presentMapped(rawValue, SCREEN_STATES, {
    normalize: lower,
    missing: view("המצב אינו זמין כרגע.", "unknown"),
    unknown: view("המצב אינו זמין כרגע.", "unknown", RAW_DETAIL),
  });
}

const PRESENTERS = Object.freeze({
  [BOOK_HEBREW_PRESENTATION_DOMAINS.COVERAGE_KEY]: presentBookCoverageKey,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.COVERAGE_VALUE]: presentBookCoverageValue,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.LOCATOR_KIND]: presentBookLocatorKind,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.EDITION_STATUS]: presentBookEditionStatus,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.SOURCE_WORK_STATUS]: presentBookSourceWorkStatus,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.TEXTUAL_VERSION_STATUS]: presentBookTextualVersionStatus,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.RESEARCH_KIND]: presentBookResearchKind,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.RESEARCH_STATUS]: presentBookResearchStatus,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.ACCESS_STATUS]: presentBookAccessStatus,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.VERIFICATION_STATE]: presentBookVerificationState,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.TECHNICAL_TERM]: presentBookTechnicalTerm,
  [BOOK_HEBREW_PRESENTATION_DOMAINS.SCREEN_STATE]: presentBookScreenState,
});

export function presentBookValue(domain, rawValue) {
  const domainKey = clean(domain).toLowerCase();
  const presenter = Object.prototype.hasOwnProperty.call(PRESENTERS, domainKey)
    ? PRESENTERS[domainKey]
    : null;
  return presenter
    ? presenter(rawValue)
    : result(rawValue, view("פרט מערכת נוסף", "unknown", RAW_DETAIL), false);
}
