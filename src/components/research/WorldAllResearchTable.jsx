import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWorldFindingReviewPage, fetchWorldGematriaReviewPage, fetchWorldInsightReviewPage } from "../../lib/research/worldFindingReviewClient.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import ConvergenceRatings2029 from "../experience2029/ConvergenceRatings2029.jsx";

const clean = (value) => value == null ? "" : String(value).trim();
const PAGE = 40;

const FAMILY_LABELS = Object.freeze({
  research_object: "ממצאי מחקר",
  source_message: "מקורות / הודעות",
  contribution: "תרומות מחקר",
  topic: "נושאים",
});

const KIND_LABELS = Object.freeze({
  fact: "ממצא מסוג עובדה",
  relation: "קשר מחקרי",
  observation: "תצפית",
  hypothesis: "השערה",
  question: "שאלת מחקר",
  source_message: "הודעת מקור",
  contribution: "תרומת מחקר",
  topic: "נושא",
});

const ACCESS_LABELS = Object.freeze({
  private: "פרטי · גלוי לך",
  public_candidate: "מועמד לציבור · טרם פורסם",
  public: "ציבורי",
  shared: "משותף",
});

const STATUS_LABELS = Object.freeze({
  candidate: "מועמד",
  approved: "מאושר",
  canonical: "קנוני",
  published: "פורסם",
  draft: "טיוטה",
  rejected: "נדחה",
  reject: "נדחה",
  idea: "רעיון",
  discussion: "דיון",
});

const VERIFICATION_LABELS = Object.freeze({
  match: "אומת",
  mismatch: "נמצאה אי־התאמה",
  partial_needs_review: "בדיקה חלקית · דורש סקירה",
  method_unknown: "השיטה אינה זמינה לבדיקה",
  not_tested: "טרם נבדק",
  not_applicable: "לא חל",
  legacy_signal: "סימון ישן · לא אומת במפורש",
});

const MEDIA_LABELS = Object.freeze({
  image: "תמונה",
  media: "מדיה",
  linked_media: "מדיה מקושרת",
  video: "וידאו",
});

const QUALITY_LABELS = Object.freeze({
  rated: "יש נתון איכות",
  high: "איכות גבוהה · 70 ומעלה",
  medium: "איכות בינונית · 40–69",
  low: "איכות נמוכה · מתחת ל־40",
  unrated: "אין נתון איכות",
});

const SORT_LABELS = Object.freeze({
  strength: "החזקים תחילה",
  quality: "איכות הראיות",
  newest: "החדשים ביותר",
});

const CONTINUATION_LABELS = Object.freeze({
  already_connected: "כבר מחובר לעץ",
  ready: "מוכן ליישום מבוקר",
  clustered: "אשכול כפילות מאושר",
  blocked_missing_target: "חסום · חסר יעד",
  needs_review: "עדיין דורש בדיקה",
  set_aside: "הושם בצד",
});

const ELS_QUEUE_LABELS = Object.freeze({
  identity_incomplete: "זהות שחזור חסרה",
  missing_engine_envelope: "חסרה מעטפת מנוע",
  legacy_envelope_capped: "מעטפה ישנה · החיפוש נקטע בתקרה",
  legacy_envelope_unreplayed: "מעטפה ישנה · טרם שוחזרה",
  replay_evidence_available: "ראיית replay היסטורית קיימת",
});

const LANGUAGE_QUEUE_LABELS = Object.freeze({
  verified_with_source: "אומת עם מקור תרגום",
  verified_missing_source: "אומת אנושית · חסר מקור תרגום",
  needs_human_review_and_source: "דורש אימות ומקור תרגום",
  needs_human_review: "דורש אימות אנושי",
});

const GEMATRIA_QUEUE_LABELS = Object.freeze({
  engine_parity_ready: "התאמת מנוע מלאה · מוכן להכרעה",
  outside_clean_hebrew: "דורש בדיקת כתיב ומקור",
  missing_method_values: "חסרים ערכי שיטות",
  engine_mismatch: "אי־התאמה למנוע",
  integrity_unavailable: "שער האימות אינו זמין",
});

const GEMATRIA_INPUT_CLASS_LABELS = Object.freeze({
  clean_hebrew: "עברית נקייה",
  contains_digits: "ביטוי עם ספרות",
  contains_latin: "שפה או תעתיק לטיני",
  hebrew_diacritics: "עברית מנוקדת",
  math_expression: "ביטוי חישובי",
  punctuation: "פיסוק או סימני מקור",
  delta_expression: "ביטוי הפרש Δ",
  other_or_spacing: "כתיב או ריווח לבדיקה",
});

const INSIGHT_QUEUE_LABELS = Object.freeze({
  ready_for_connection_review: "שלם מבנית · מוכן לבדיקת חיבור",
  missing_source: "חסר מקור מדויק",
  descriptive_source: "המקור תיאורי בלבד",
  missing_evidence: "חסרה רמת ראיות",
  not_verified: "דורש בדיקת אימות",
  inactive: "מחוץ לעדשה הפעילה",
});

const LEGACY_REPLAY_LABELS = Object.freeze({
  deterministic_match: "Replay תואם · קלט נקי",
  mixed_input_match: "Replay תואם · קלט מעורב לבדיקה",
  deterministic_mismatch: "Replay מצא אי־התאמה",
  incomplete_regular_envelope: "מעטפת רגיל חסרה",
  arithmetic_match: "חיבור שוחזר במלואו",
  arithmetic_mismatch: "החיבור אינו משתחזר",
  arithmetic_envelope_mismatch: "החישוב והמעטפת אינם תואמים",
  arithmetic_unsupported: "תחביר חשבוני לא נתמך",
  compound_match: "שרשרת מורכבת שוחזרה במלואה",
  compound_mismatch: "השרשרת המורכבת אינה משתחזרת",
  compound_envelope_mismatch: "השרשרת והמעטפת אינן תואמות",
  compound_method_unresolved: "שיטת רכיב בשרשרת אינה פתורה",
  compound_unsupported: "מבנה השרשרת אינו נתמך",
  explicit_match: "מעטפת אימות מפורשת · התאמה מלאה",
  explicit_numeric_match: "מעטפת אימות מפורשת · התאמה מספרית בלבד",
  explicit_state_conflict: "סתירה בין דגל המנוע למצב הבדיקה",
  explicit_review_required: "מעטפת אימות מפורשת · דורשת בדיקה",
  legacy_matrix_match: "מטריצת שיטות שוחזרה במלואה",
  legacy_matrix_claim_unmatched: "המטריצה תקינה · טענת המקור לא אומתה",
  legacy_matrix_mismatch: "ערכי המטריצה אינם משתחזרים",
  legacy_matrix_partial: "מטריצת שיטות חלקית",
  legacy_matrix_unsupported: "מבנה מטריצה לא נתמך",
  legacy_incomplete_method_envelope: "מעטפת שיטה חסרה",
  legacy_source_metadata_only: "מטא־דאטה של מקור · ללא חישוב",
  missing_engine_detail_unverified: "סומן לא מאומת · חסר פירוט מנוע",
  missing_engine_assessment: "אין הערכת מנוע",
  missing_replay_envelope: "חסרה מעטפת replay",
  mixed_replay_states: "אשכול עם מצבי replay שונים",
});

const MISSING_ENGINE_QUEUE_LABELS = Object.freeze({
  spatial_or_constants: "מרחבים וצורות",
  constants_or_sequences: "קבועים ורצפים",
  els_or_cipher: "צפנים ודילוגים",
  language: "שפה ותעתיק",
  formula: "ביטוי עם אופרטור",
  numeric_statement: "טענה עם מספר",
  textual_statement: "טענה טקסטואלית",
});

const MISSING_ENGINE_SUBTYPE_LABELS = Object.freeze({
  cubes: "קוביות",
  polyhedra_and_pyramids: "פאונים ופירמידות",
  circles_and_spheres: "מעגלים וכדורים",
  space_and_axes: "מרחב, תלת־ממד וצירים",
  pi: "π / פאי",
  euler_e: "e / קבוע אוילר",
  numeric_sequence: "רצף מספרי",
});

const SPATIAL_METADATA_LABELS = Object.freeze({
  complete: "זהות מרחבית מלאה",
  partial: "מטא־דאטה מרחבי חלקי",
  missing: "חסר מטא־דאטה מרחבי",
});

const CONSTANT_CHECK_LABELS = Object.freeze({
  rounded_match: "הקירוב שוחזר",
  rounded_mismatch: "הקירוב אינו משתחזר",
  exact_match: "החישוב המדויק שוחזר",
  exact_mismatch: "החישוב המדויק אינו משתחזר",
  unsupported_expression: "חסר ביטוי שניתן לשחזר",
});

const REPLAY_SOURCE_LABELS = Object.freeze({
  exact_source: "מקור מדויק",
  source_locator_repair: "דורש תיקון locator",
});

const REPLAY_TARGET_LABELS = Object.freeze({
  already_connected: "כבר מחובר לעץ",
  single_structured_target: "יעד מובנה יחיד לבדיקה",
  multiple_structured_targets: "כמה יעדים · נדרשת הכרעה",
  missing_structured_target: "חסר יעד מובנה",
  mixed_target_states: "מצבי יעד שונים באשכול",
});

const REPLAY_TARGET_EVIDENCE_LABELS = Object.freeze({
  existing_promotion: "חיבור חי קיים",
  exact_row_value_match: "יעד מספר יחיד תואם לערך",
  exact_value_primary_with_context: "מספר ראשי תואם + הקשרים",
  exact_value_among_multiple_numbers: "מספר תואם + מספרים נוספים",
  row_value_conflict: "סתירה בין יעד מספר לערך",
  missing_row_value: "יעד מספר בלי ערך מובנה",
  structured_target_only: "יעד מובנה ללא התאמת ערך",
  multiple_structured_targets_only: "כמה יעדים ללא התאמת ערך",
  structured_value_without_target: "ערך מובנה בלי יעד מתועד",
  missing_value_and_target: "חסרים יעד וערך מובנה",
});

const LEGACY_REPLAY_READY = new Set(["deterministic_match", "arithmetic_match", "compound_match", "explicit_match", "legacy_matrix_match"]);
const LEGACY_REPLAY_BLOCKED = new Set([
  "deterministic_mismatch",
  "arithmetic_mismatch",
  "arithmetic_envelope_mismatch",
  "compound_mismatch",
  "compound_envelope_mismatch",
  "compound_method_unresolved",
  "explicit_state_conflict",
  "legacy_matrix_claim_unmatched",
  "legacy_matrix_mismatch",
]);

function legacyReplayClass(state) {
  if (LEGACY_REPLAY_READY.has(state)) return "is-ready";
  if (LEGACY_REPLAY_BLOCKED.has(state)) return "is-blocked";
  return "is-review";
}

function legacyReplayDescription(replay) {
  if (replay?.state === "deterministic_match") {
    return `המנוע הקנוני החזיר ${replay.replayComputed}; עדיין נדרשת הכרעת מקור ויעד.`;
  }
  if (replay?.state === "mixed_input_match") return "החישוב תואם, אך הביטוי כולל ספרות או לטינית ולכן נשאר לבדיקה.";
  if (replay?.state === "arithmetic_match") {
    return `החיבור וכל ${replay.operandCount || 0} הרכיבים שוחזרו; מצב האמת והחיבור לעץ לא השתנו.`;
  }
  if (replay?.state === "compound_match") {
    return `השרשרת וכל ${replay.operandCount || 0} רכיבי הגימטריה שוחזרו במנוע הקנוני; עדיין נדרשת הכרעת מקור ויעד.`;
  }
  if (replay?.state === "compound_method_unresolved") return "לפחות רכיב אחד דורש הכרעת שיטה; השרשרת נשארת חסומה.";
  if (replay?.state === "explicit_match") return "המעטפת הקיימת מתעדת התאמה מלאה; עדיין נדרשת הכרעת מקור ויעד.";
  if (replay?.state === "explicit_numeric_match") return "המספרים תואמים, אך זו אינה הוכחת קורפוס, ייחודיות או משמעות.";
  if (replay?.state === "explicit_state_conflict") return "דגל המנוע ומצב הבדיקה סותרים זה את זה; ההופעה חסומה עד תיקון המעטפת.";
  if (replay?.state === "explicit_review_required") return "המעטפת מתעדת אי־התאמה, בדיקה חלקית או שיטה שאינה רשומה; אין לקדם.";
  if (replay?.state === "legacy_matrix_match") return `${replay.checkedMethodCount || 0} ערכי שיטה שוחזרו; זו תקינות חישובית בלבד ועדיין נדרשת הכרעת מקור ויעד.`;
  if (replay?.state === "legacy_matrix_claim_unmatched") return "ערכי המנוע משתחזרים, אך טענת המקור עצמה אינה מסומנת כמותאמת ולכן נשארת חסומה.";
  if (replay?.state === "legacy_matrix_mismatch") return "לפחות ערך שיטה אחד שונה מתוצאת המנוע הקנוני; הרשומה חסומה.";
  if (replay?.state === "legacy_matrix_partial") return "חלק מן הביטויים במטריצה אינם כוללים שיטה קנונית שניתנת לשחזור.";
  if (replay?.state === "legacy_incomplete_method_envelope") return "נשמרו שיטה ותוצאה בלי ביטוי מלא; אין אפשרות לשחזר את החישוב.";
  if (replay?.state === "legacy_source_metadata_only") return "השדה מכיל פרטי קליטה של המקור ואינו מעטפת חישוב.";
  if (replay?.state === "missing_engine_detail_unverified") return `המקור והטקסט קיימים, אך אין פירוט שמסביר מדוע הממצא לא אומת; ${replay.routingReason || "נשאר חסום."}`;
  if (replay?.state === "missing_engine_assessment") return `לא נשמרה הערכת מנוע. ${replay.routingReason || "יש למיין לפי סוג לפני הרצה."}`;
  if (replay?.state === "missing_replay_envelope") return "הסימון הישן אינו כולל קלט ושיטה מובנים שאפשר להריץ מחדש.";
  if (replay?.state?.endsWith("_unsupported")) return "המבנה אינו עומד בדקדוק הדטרמיניסטי המצומצם ונשאר לבדיקה.";
  return "נדרשת השלמת מעטפת או הכרעת מפעיל לפני אישור.";
}

function humanLabel(map, value, fallback = "אחר") {
  return map[clean(value)] || fallback;
}

function contributorLabel(value) {
  const text = clean(value);
  if (!text) return "ייחוס לא צוין";
  if (/[א-ת]/.test(text)) return text;
  if (/^ZURIEL$/i.test(text)) return "צוריאל";
  if (/^(?:GPT|CLAUDE)$/i.test(text)) return "מערכת המחקר";
  return "תווית ייחוס לא פתורה";
}

function safeVisibleText(value, fallback = null) {
  const text = clean(value);
  if (!text) return fallback;
  if (!/[A-Za-z]/.test(text)) return text;
  const hebrew = text
    .replace(/[A-Za-z][A-Za-z0-9_.:/#()'’-]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /[א-ת]/.test(hebrew) ? hebrew : fallback;
}

function AccessLabel({ value }) {
  return <span className="sod29-world-all-research-access">
    {humanLabel(ACCESS_LABELS, value, "היקף גישה לא צוין")}
  </span>;
}

function VerificationLabel({ row }) {
  const label = humanLabel(VERIFICATION_LABELS, row.verification, "מצב אימות לא ידוע");
  if (row.verification === "mismatch") return <span className="sod29-world-all-research-warn">{label}</span>;
  if (row.verification === "match") return <span className="sod29-world-all-research-ok">{label}</span>;
  return <span className="sod29-world-all-research-muted">{label}</span>;
}

function occurrenceSourceKey(occurrence) {
  const ref = clean(occurrence?.sourceRef);
  return ref ? ref.replace(/#.*$/u, "") : clean(occurrence?.id);
}

function initialReviewFilters() {
  if (typeof window === "undefined") return {
    finding: "", contributorId: "", contributorLabel: "", sort: "strength", strength: "all", recommendation: "all", verification: "all", replay: "all", replayQueue: "all", replaySubtype: "all", replaySpatialMetadata: "all", replaySource: "all", replayTarget: "all", replayTargetEvidence: "all", pendingEngineTarget: "all", pendingEngineTargetEvidence: "all",
  };
  const params = new URLSearchParams(window.location.search);
  const sort = clean(params.get("sort"));
  const strength = clean(params.get("strength"));
  const recommendation = clean(params.get("recommendation"));
  const verification = clean(params.get("verification"));
  const replay = clean(params.get("replay"));
  const replayQueue = clean(params.get("replayQueue"));
  const replaySubtype = clean(params.get("replaySubtype"));
  const replaySpatialMetadata = clean(params.get("replaySpatialMetadata"));
  const replaySource = clean(params.get("replaySource"));
  const replayTarget = clean(params.get("replayTarget"));
  const replayTargetEvidence = clean(params.get("replayTargetEvidence"));
  const pendingEngineTarget = clean(params.get("pendingEngineTarget"));
  const pendingEngineTargetEvidence = clean(params.get("pendingEngineTargetEvidence"));
  return {
    finding: clean(params.get("finding")),
    contributorId: clean(params.get("contributorId")),
    contributorLabel: clean(params.get("contributorLabel")),
    sort: Object.hasOwn(SORT_LABELS, sort) ? sort : "strength",
    strength: ["חזק", "בינוני", "חלש"].includes(strength) ? strength : "all",
    recommendation: ["מתאים לעץ", "דורש בדיקה", "כפילות", "דורש מקור", "שיוך זהות לא פתור", "דורש OCR או תמלול", "לא מתאים"].includes(recommendation)
      ? recommendation : "all",
    verification: Object.hasOwn(VERIFICATION_LABELS, verification) ? verification : "all",
    replay: Object.hasOwn(LEGACY_REPLAY_LABELS, replay) ? replay : "all",
    replayQueue: Object.hasOwn(MISSING_ENGINE_QUEUE_LABELS, replayQueue) ? replayQueue : "all",
    replaySubtype: Object.hasOwn(MISSING_ENGINE_SUBTYPE_LABELS, replaySubtype) ? replaySubtype : "all",
    replaySpatialMetadata: Object.hasOwn(SPATIAL_METADATA_LABELS, replaySpatialMetadata) ? replaySpatialMetadata : "all",
    replaySource: Object.hasOwn(REPLAY_SOURCE_LABELS, replaySource) ? replaySource : "all",
    replayTarget: Object.hasOwn(REPLAY_TARGET_LABELS, replayTarget) ? replayTarget : "all",
    replayTargetEvidence: Object.hasOwn(REPLAY_TARGET_EVIDENCE_LABELS, replayTargetEvidence) ? replayTargetEvidence : "all",
    pendingEngineTarget: Object.hasOwn(REPLAY_TARGET_LABELS, pendingEngineTarget) ? pendingEngineTarget : "all",
    pendingEngineTargetEvidence: Object.hasOwn(REPLAY_TARGET_EVIDENCE_LABELS, pendingEngineTargetEvidence) ? pendingEngineTargetEvidence : "all",
  };
}

function triageClass(value) {
  if (value === "מתאים לעץ") return "is-ready";
  if (value === "לא מתאים") return "is-blocked";
  if (value === "כפילות") return "is-duplicate";
  return "is-review";
}

function continuationClass(value) {
  if (["already_connected", "ready"].includes(value)) return "is-ready";
  if (value === "clustered") return "is-duplicate";
  if (["blocked_missing_target", "set_aside"].includes(value)) return "is-blocked";
  return "is-review";
}

function treeTargetLabel(match) {
  const type = match?.type === "number" ? "מספר" : match?.type === "topic" ? "נושא" : match?.type === "book" ? "ספר" : "יעד";
  return `${type} · ${clean(match?.label || match?.key)}`;
}

function DuplicateOccurrences({ row }) {
  const occurrences = Array.isArray(row?.occurrences) ? row.occurrences : [];
  if (occurrences.length < 2) return null;

  const sourceCount = new Set(occurrences.map(occurrenceSourceKey).filter(Boolean)).size;
  const canonicalText = clean(row.originalStatement || row.statement);

  return <details className="sod29-world-all-research-duplicates">
    <summary>
      <span>נמצא ב־{occurrences.length} הופעות</span>
      <small>{sourceCount} {sourceCount === 1 ? "מקור" : "מקורות"} · הנוסח המלא ביותר מוצג למעלה</small>
    </summary>
    <ol>
      {occurrences.map((occurrence, index) => {
        const variant = clean(occurrence.originalStatement || occurrence.statement);
        return <li key={occurrence.id || `${occurrence.sourceRef || "source"}:${index}`}>
          <div className="sod29-world-all-research-occurrence-head">
            <strong>{safeVisibleText(occurrence.sourceLabel, "מקור מחקר")}</strong>
            {occurrence.createdAt ? <span>{bilingualDateLabel(occurrence.createdAt)}</span> : null}
          </div>
          <div className="sod29-world-all-research-occurrence-meta">
            <span>ייחוס · {contributorLabel(occurrence.contributor)}</span>
            {occurrence.sourceRef ? <code className="sod29-world-all-research-ref" dir="ltr">{occurrence.sourceRef}</code> : null}
          </div>
          {variant && variant !== canonicalText
            ? <p>{safeVisibleText(variant, "גרסת מקור שמורה")}</p>
            : null}
        </li>;
      })}
    </ol>
  </details>;
}

export default function WorldAllResearchTable({ state }) {
  const initial = useMemo(initialReviewFilters, []);
  const [query, setQuery] = useState(initial.finding);
  const [finding, setFinding] = useState(initial.finding);
  const [kind, setKind] = useState("all");
  const [access, setAccess] = useState("all");
  const [status, setStatus] = useState("all");
  const [verification, setVerification] = useState(initial.verification);
  const [contributor, setContributor] = useState("all");
  const [contributorId] = useState(initial.contributorId);
  const [tree, setTree] = useState("all");
  const [meter, setMeter] = useState("all");
  const [sort, setSort] = useState(initial.sort);
  const [strength, setStrength] = useState(initial.strength);
  const [recommendation, setRecommendation] = useState(initial.recommendation);
  const [continuation, setContinuation] = useState("all");
  const [quality, setQuality] = useState("all");
  const [topic, setTopic] = useState("all");
  const [source, setSource] = useState("all");
  const [replay, setReplay] = useState(initial.replay);
  const [replayQueue, setReplayQueue] = useState(initial.replayQueue);
  const [replaySubtype, setReplaySubtype] = useState(initial.replaySubtype);
  const [replaySpatialMetadata, setReplaySpatialMetadata] = useState(initial.replaySpatialMetadata);
  const [replaySource, setReplaySource] = useState(initial.replaySource);
  const [replayTarget, setReplayTarget] = useState(initial.replayTarget);
  const [replayTargetEvidence, setReplayTargetEvidence] = useState(initial.replayTargetEvidence);
  const [pendingEngineTarget, setPendingEngineTarget] = useState(initial.pendingEngineTarget);
  const [pendingEngineTargetEvidence, setPendingEngineTargetEvidence] = useState(initial.pendingEngineTargetEvidence);
  const [retryKey, setRetryKey] = useState(0);
  const [review, setReview] = useState({ loading: false, loadingMore: false, error: null, projection: null, page: null });
  const [elsQueue, setElsQueue] = useState({ open: false, loading: false, error: null, data: null, filter: "all", limit: 40 });
  const [languageQueue, setLanguageQueue] = useState({ open: false, loading: false, error: null, data: null });
  const [galleryQueue, setGalleryQueue] = useState({ open: false, loading: false, error: null, data: null, filter: "all", limit: 40 });
  const [gematriaQueue, setGematriaQueue] = useState({ open: false, loading: false, loadingMore: false, error: null, projection: null, page: null });
  const [insightQueue, setInsightQueue] = useState({ open: false, loading: false, loadingMore: false, error: null, projection: null, page: null });
  const requestRef = useRef(0);

  const filters = useMemo(() => ({
    query, finding, kind, access, status, verification, contributor, contributorId, tree, meter,
    sort, strength, recommendation, continuation, quality, topic, source, replay, replayQueue, replaySubtype, replaySpatialMetadata, replaySource, replayTarget, replayTargetEvidence, pendingEngineTarget, pendingEngineTargetEvidence,
  }), [query, finding, kind, access, status, verification, contributor, contributorId, tree, meter, sort, strength, recommendation, continuation, quality, topic, source, replay, replayQueue, replaySubtype, replaySpatialMetadata, replaySource, replayTarget, replayTargetEvidence, pendingEngineTarget, pendingEngineTargetEvidence]);

  const resetFilters = () => {
    setQuery("");
    setFinding("");
    setKind("all");
    setAccess("all");
    setStatus("all");
    setVerification("all");
    setContributor("all");
    setTree("all");
    setMeter("all");
    setSort("strength");
    setStrength("all");
    setRecommendation("all");
    setContinuation("all");
    setQuality("all");
    setTopic("all");
    setSource("all");
    setReplay("all");
    setReplayQueue("all");
    setReplaySubtype("all");
    setReplaySpatialMetadata("all");
    setReplaySource("all");
    setReplayTarget("all");
    setReplayTargetEvidence("all");
    setPendingEngineTarget("all");
    setPendingEngineTargetEvidence("all");
  };

  useEffect(() => {
    if (!state?.enabled) return undefined;
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    setReview((current) => ({
      ...current,
      loading: true,
      loadingMore: false,
      error: null,
      page: null,
      projection: current.projection ? { ...current.projection, rows: [] } : null,
    }));
    const timer = setTimeout(() => {
      fetchWorldFindingReviewPage({ filters, offset: 0, signal: controller.signal })
        .then((result) => {
          if (requestRef.current !== requestId) return;
          setReview({ loading: false, loadingMore: false, error: null, projection: result.projection, page: result.page });
        })
        .catch((error) => {
          if (error?.name === "AbortError" || requestRef.current !== requestId) return;
          setReview((current) => ({ ...current, loading: false, loadingMore: false, error }));
        });
    }, query ? 250 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [state?.enabled, filters, retryKey]);

  const loadMore = async () => {
    if (!review.page?.hasMore || review.loading || review.loadingMore) return;
    const requestId = ++requestRef.current;
    setReview((current) => ({ ...current, loadingMore: true, error: null }));
    try {
      const result = await fetchWorldFindingReviewPage({ filters, offset: review.page.nextOffset });
      if (requestRef.current !== requestId) return;
      setReview((current) => ({
        loading: false,
        loadingMore: false,
        error: null,
        projection: {
          ...result.projection,
          rows: [...(current.projection?.rows || []), ...(result.projection?.rows || [])],
        },
        page: result.page,
      }));
    } catch (error) {
      if (requestRef.current !== requestId) return;
      setReview((current) => ({ ...current, loadingMore: false, error }));
    }
  };

  const projection = review.projection;
  const rows = projection?.rows || [];
  const filteredElsRows = useMemo(() => {
    const all = elsQueue.data?.rows || [];
    return elsQueue.filter === "all" ? all : all.filter((row) => row.state === elsQueue.filter);
  }, [elsQueue.data, elsQueue.filter]);
  const filteredGalleryRows = useMemo(() => {
    const all = galleryQueue.data?.rows || [];
    if (galleryQueue.filter === "all") return all;
    return all.filter((row) => row.issues.includes(galleryQueue.filter));
  }, [galleryQueue.data, galleryQueue.filter]);

  const openElsQueue = async () => {
    if (elsQueue.data) {
      setElsQueue((current) => ({ ...current, open: !current.open, limit: 40 }));
      return;
    }
    setElsQueue((current) => ({ ...current, open: true, loading: true, error: null }));
    try {
      const { fetchWorldElsTriageProjection } = await import("../../lib/research/worldElsTriageProjection.js");
      const data = await fetchWorldElsTriageProjection();
      setElsQueue((current) => ({ ...current, open: true, loading: false, data, error: null, limit: 40 }));
    } catch (error) {
      setElsQueue((current) => ({ ...current, open: true, loading: false, error }));
    }
  };

  const openLanguageQueue = async () => {
    if (languageQueue.data) {
      setLanguageQueue((current) => ({ ...current, open: !current.open }));
      return;
    }
    setLanguageQueue((current) => ({ ...current, open: true, loading: true, error: null }));
    try {
      const { fetchWorldLanguageTriageProjection } = await import("../../lib/research/worldLanguageTriageProjection.js");
      const data = await fetchWorldLanguageTriageProjection();
      setLanguageQueue({ open: true, loading: false, error: null, data });
    } catch (error) {
      setLanguageQueue((current) => ({ ...current, open: true, loading: false, error }));
    }
  };

  const openGalleryQueue = async () => {
    if (galleryQueue.data) {
      setGalleryQueue((current) => ({ ...current, open: !current.open, limit: 40 }));
      return;
    }
    setGalleryQueue((current) => ({ ...current, open: true, loading: true, error: null }));
    try {
      const { fetchWorldGalleryTriageProjection } = await import("../../lib/research/worldGalleryTriageProjection.js");
      const data = await fetchWorldGalleryTriageProjection();
      setGalleryQueue((current) => ({ ...current, open: true, loading: false, error: null, data, limit: 40 }));
    } catch (error) {
      setGalleryQueue((current) => ({ ...current, open: true, loading: false, error }));
    }
  };

  const openGematriaQueue = async () => {
    if (gematriaQueue.projection) {
      setGematriaQueue((current) => ({ ...current, open: !current.open }));
      return;
    }
    setGematriaQueue((current) => ({ ...current, open: true, loading: true, error: null }));
    try {
      const data = await fetchWorldGematriaReviewPage({ offset: 0 });
      setGematriaQueue({ open: true, loading: false, loadingMore: false, error: null, projection: data.projection, page: data.page });
    } catch (error) {
      setGematriaQueue((current) => ({ ...current, open: true, loading: false, loadingMore: false, error }));
    }
  };

  const loadMoreGematria = async () => {
    if (!gematriaQueue.page?.hasMore || gematriaQueue.loadingMore) return;
    setGematriaQueue((current) => ({ ...current, loadingMore: true, error: null }));
    try {
      const data = await fetchWorldGematriaReviewPage({ offset: gematriaQueue.page.nextOffset });
      setGematriaQueue((current) => ({
        ...current,
        loadingMore: false,
        projection: { ...data.projection, rows: [...(current.projection?.rows || []), ...(data.projection?.rows || [])] },
        page: data.page,
      }));
    } catch (error) {
      setGematriaQueue((current) => ({ ...current, loadingMore: false, error }));
    }
  };

  const openInsightQueue = async () => {
    if (insightQueue.projection) {
      setInsightQueue((current) => ({ ...current, open: !current.open }));
      return;
    }
    setInsightQueue((current) => ({ ...current, open: true, loading: true, error: null }));
    try {
      const data = await fetchWorldInsightReviewPage({ offset: 0 });
      setInsightQueue({ open: true, loading: false, loadingMore: false, error: null, projection: data.projection, page: data.page });
    } catch (error) {
      setInsightQueue((current) => ({ ...current, open: true, loading: false, loadingMore: false, error }));
    }
  };

  const loadMoreInsights = async () => {
    if (!insightQueue.page?.hasMore || insightQueue.loadingMore) return;
    setInsightQueue((current) => ({ ...current, loadingMore: true, error: null }));
    try {
      const data = await fetchWorldInsightReviewPage({ offset: insightQueue.page.nextOffset });
      setInsightQueue((current) => ({
        ...current,
        loadingMore: false,
        projection: { ...data.projection, rows: [...(current.projection?.rows || []), ...(data.projection?.rows || [])] },
        page: data.page,
      }));
    } catch (error) {
      setInsightQueue((current) => ({ ...current, loadingMore: false, error }));
    }
  };

  if (!state?.enabled) return null;

  return <section className="sod29-section sod29-world-all-research" id="world-all-research" aria-label="ממצאים לבדיקה">
    <div className="sod29-section-head">
      <div>
        <div className="sod29-kicker">שער אנושי · ממצאים לבדיקה</div>
        <h2>{contributorId ? `הממצאים המובילים של ${initial.contributorLabel || "התורם הנבחר"}` : "הממצאים המובילים"}</h2>
        <p className="sod29-muted">ברירת המחדל היא סדר דוח המיון: החזקים תחילה. חוזק החיבור, איכות הראיות, עצמאות המקורות, האימות והפרסום מוצגים בנפרד ואינם ציון אמת.</p>
      </div>
      {projection && review.page ? <span className="sod29-chip">{rows.length} מתוך {review.page.totalFiltered}</span> : null}
    </div>

    {review.loading ? <div className="sod29-world-all-research-state">טוען את 40 הממצאים הראשונים…</div> : null}
    {review.error ? <div className="sod29-world-all-research-state">הממצאים לא נטענו כרגע. <button className="sod29-action" type="button" onClick={() => setRetryKey((value) => value + 1)}>נסה שוב</button></div> : null}

    {projection ? <>
      {projection.corpusAudit?.workstreams?.length ? <section className="sod29-world-kind-section" aria-label="מפת תורי המיון בקורפוס">
        <header><div><h3>מפת תורי המיון בקורפוס</h3><p>צילום מצב מ־26.10.2026. כל שורה מצביעה למאגר הקנוני; הספירות הן צירים נפרדים וחלקן חופפות.</p></div><span>{projection.corpusAudit.workstreams.length} תחומי עבודה</span></header>
        {projection.triageSnapshot?.strengthBreakdown ? <>
          <h4>כל דוח הממצאים · לפי חוזק</h4>
          <div className="sod29-world-kind-card-grid">{Object.entries(projection.triageSnapshot.strengthBreakdown).map(([strengthLabel, breakdown]) => <article className="sod29-world-kind-card" key={strengthLabel}>
            <small>{breakdown.cards.toLocaleString("he-IL")} כרטיסים · {breakdown.occurrences.toLocaleString("he-IL")} הופעות</small>
            <strong>{strengthLabel}</strong>
            <div className="sod29-world-spatial-status" aria-label={`פירוט ${strengthLabel}`}>
              {Object.entries(breakdown.recommendations || {}).map(([label, count]) => <span key={label}>{label}: {count.toLocaleString("he-IL")}</span>)}
              <span>אשכולות טקסט זהה: {breakdown.exactDuplicateClusters.toLocaleString("he-IL")}</span>
              <span>הופעות עודפות שנשמרו: {breakdown.duplicateOccurrencesCombined.toLocaleString("he-IL")}</span>
              <span>הצעות יעד בדוח: {breakdown.proposedTreeTargets.toLocaleString("he-IL")}</span>
            </div>
            <small>הצעת יעד אינה חיבור חי; הופעה חוזרת אינה מקור עצמאי.</small>
          </article>)}</div>
        </> : null}
        {projection.corpusAudit.findingBatches?.length ? <>
          <h4>מנות ההמשך הגדולות</h4>
          <div className="sod29-world-kind-card-grid">{projection.corpusAudit.findingBatches.map((batch) => <article className="sod29-world-kind-card" key={batch.key}>
            <small>{batch.total.toLocaleString("he-IL")} כרטיסים בדוח</small>
            <strong>{batch.label}</strong>
            <p>{batch.state}</p>
            <p><b>סדר טיפול:</b> {batch.next}</p>
            <a className="sod29-action" href={batch.route}>פתח מנה מסוננת ←</a>
          </article>)}</div>
        </> : null}
        <div className="sod29-world-kind-card-grid">{projection.corpusAudit.workstreams.map((stream) => <article className="sod29-world-kind-card" key={stream.key}>
          <small>{stream.total.toLocaleString("he-IL")} רשומות בתחום</small>
          <strong>{stream.label}</strong>
          <p>{stream.state}</p>
          <div className="sod29-world-spatial-status" aria-label={`מצב ${stream.label}`}>{stream.counts.map((item) => <span key={item.label}>{item.label}: {item.value.toLocaleString("he-IL")}</span>)}</div>
          <p><b>השלב הבא:</b> {stream.next}</p>
          <a className="sod29-action" href={stream.route}>פתח את המקור הקנוני ←</a>
        </article>)}</div>
        <details className="sod29-world-all-research-duplicates"><summary>כללי הקריאה של המפה</summary><ul>{projection.corpusAudit.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></details>
        <div className="sod29-actions">
          <button className="sod29-action primary" type="button" onClick={openElsQueue} aria-expanded={elsQueue.open}>{elsQueue.open ? "סגור את תור ELS" : "פתח תור ELS מפורט"}</button>
          <button className="sod29-action" type="button" onClick={openLanguageQueue} aria-expanded={languageQueue.open}>{languageQueue.open ? "סגור את תור השפה" : "פתח תור שפה מפורט"}</button>
          <button className="sod29-action" type="button" onClick={openGalleryQueue} aria-expanded={galleryQueue.open}>{galleryQueue.open ? "סגור את תור התמונות" : "פתח תור גלריות ו־OCR"}</button>
          <button className="sod29-action" type="button" onClick={openGematriaQueue} aria-expanded={gematriaQueue.open}>{gematriaQueue.open ? "סגור את תור הגימטריה" : "פתח תור גימטריה מפורט"}</button>
          <button className="sod29-action" type="button" onClick={openInsightQueue} aria-expanded={insightQueue.open}>{insightQueue.open ? "סגור את תור התובנות" : "פתח תור תובנות ומקורות"}</button>
        </div>
      </section> : null}

      {elsQueue.open ? <section className="sod29-world-kind-section" aria-label="תור אימות צפני ELS">
        <header><div><h3>תור אימות צפני ELS</h3><p>נטען רק לפי בקשה דרך הקורא הקיים ובהרשאת החשבון. פרסום, מעטפת מנוע וראיית replay היסטורית מוצגים בנפרד; אף אחד מהם אינו אימות חי.</p></div>{elsQueue.data ? <span>{elsQueue.data.counts.total} רשומות</span> : null}</header>
        {elsQueue.loading ? <p role="status">טוען את קטלוג הצפנים המורשה…</p> : null}
        {elsQueue.error ? <p role="status">תור הצפנים אינו זמין כרגע. לא הומצאו נתונים חלופיים.</p> : null}
        {elsQueue.data ? <>
          <div className="sod29-world-all-research-summary">
            <span><b>{elsQueue.data.counts.publicPublished}</b> מפורסמים וציבוריים</span>
            <span><b>{elsQueue.data.counts.missingEngineEnvelope}</b> ללא מעטפת מנוע</span>
            <span><b>{elsQueue.data.counts.legacyEnvelopeUnreplayed}</b> מעטפות ישנות שלא שוחזרו</span>
            <span><b>{elsQueue.data.counts.legacyEnvelopeCapped}</b> חיפוש ישן שנקטע בתקרה</span>
            <span><b>{elsQueue.data.counts.replayEvidenceAvailable}</b> עם ראיית replay היסטורית</span>
            <span><b>{elsQueue.data.counts.missingStartIndex}</b> ללא נקודת התחלה</span>
            <span><b>{elsQueue.data.counts.duplicateIdentityGroups}</b> קבוצות זהות שחזור כפולה</span>
          </div>
          <div className="sod29-world-all-research-filters">
            <label><span>מצב אימות ELS</span><select value={elsQueue.filter} onChange={(event) => setElsQueue((current) => ({ ...current, filter: event.target.value, limit: 40 }))}>
              <option value="all">כל הרשומות · {elsQueue.data.counts.total}</option>
              {Object.entries(ELS_QUEUE_LABELS).map(([value, label]) => <option key={value} value={value}>{label} · {elsQueue.data.rows.filter((row) => row.state === value).length}</option>)}
            </select></label>
          </div>
          <div className="sod29-world-all-research-count">מוצגים {Math.min(elsQueue.limit, filteredElsRows.length)} מתוך {filteredElsRows.length} במסנן ELS.</div>
          <div className="sod29-world-all-research-list">{filteredElsRows.slice(0, elsQueue.limit).map((row) => <article className="sod29-world-all-research-row" key={row.id}>
            <div className="sod29-world-all-research-row-head"><div className="sod29-world-all-research-tags"><span>ELS</span><span>{row.status === "published" ? "פורסם" : "מחוץ לעדשה הציבורית"}</span><span>{row.visibility === "public" ? "ציבורי" : "נראות אחרת"}</span></div><span>{ELS_QUEUE_LABELS[row.state]}</span></div>
            <strong>{row.title}</strong>
            <div className="sod29-world-finding-measures" aria-label="צירי אימות ELS נפרדים">
              <div><small>זהות קורפוס</small><strong>{row.corpusId ? "קיימת" : "חסרה"}</strong></div>
              <div><small>מונח מנורמל</small><strong>{row.termNorm || "חסר"}</strong></div>
              <div><small>נקודת התחלה</small><strong>{row.startIndex ?? "חסרה"}</strong></div>
              <div><small>מעטפת מנוע</small><strong>{row.hasEngineEnvelope ? "קיימת" : "חסרה"}</strong></div>
              <div><small>Replay מפורש</small><strong>{row.hasReplayMatch ? "MATCH היסטורי" : row.envelopeCapped ? "נקטע בתקרה" : "טרם שוחזר"}</strong></div>
            </div>
            <p className="sod29-world-all-research-secondary">{row.term || "מונח לא צוין"}{row.skip != null ? ` · דילוג ${row.skip}` : " · דילוג חסר"}{row.direction ? ` · ${row.direction}` : " · כיוון חסר"}{row.scope ? ` · ${row.scope}` : ""}</p>
            {row.identityMissing.length ? <p><b>חסר לשחזור:</b> <code dir="ltr">{row.identityMissing.join(" · ")}</code></p> : null}
            <div className="sod29-world-source-locator"><strong>מזהה ומקור קנוני</strong><code dir="ltr">els_records:{row.id}</code><div className="sod29-actions">{row.href ? <a className="sod29-action" href={row.href}>פתח את הצופן ←</a> : null}</div><small>ראיית replay מאמתת את ההופעה הטכנית בלבד; היא אינה ציון אמת, איכות או משמעות.</small></div>
          </article>)}</div>
          {elsQueue.limit < filteredElsRows.length ? <div className="sod29-actions"><button className="sod29-action" type="button" onClick={() => setElsQueue((current) => ({ ...current, limit: current.limit + 40 }))}>הצג עוד 40</button></div> : null}
        </> : null}
      </section> : null}

      {languageQueue.open ? <section className="sod29-world-kind-section" aria-label="תור אימות שפה וגשרים">
        <header><div><h3>תור אימות שפה וגשרים</h3><p>תרגום, שוויון מספרי, שיטה, רמת ראיות ואימות אנושי נשארים צירים נפרדים.</p></div>{languageQueue.data ? <span>{languageQueue.data.counts.total} קשרים</span> : null}</header>
        {languageQueue.loading ? <p role="status">טוען את גשרי השפה מן הקורא הקנוני…</p> : null}
        {languageQueue.error ? <p role="status">תור השפה אינו זמין כרגע. לא הומצאו נתונים חלופיים.</p> : null}
        {languageQueue.data ? <>
          <div className="sod29-world-all-research-summary">
            <span><b>{languageQueue.data.counts.approved}</b> מאושרים</span>
            <span><b>{languageQueue.data.counts.humanVerified}</b> מאומתים אנושית</span>
            <span><b>{languageQueue.data.counts.needsHumanReview}</b> דורשים הכרעה</span>
            <span><b>{languageQueue.data.counts.verifiedWithSource}</b> אומתו עם מקור תרגום</span>
            <span><b>{languageQueue.data.counts.verifiedMissingSource}</b> אומתו אך חסר מקור תרגום</span>
            <span><b>{languageQueue.data.counts.needsHumanReviewAndSource}</b> חסרים אימות ומקור</span>
            <span><b>{languageQueue.data.counts.duplicateGroups}</b> קבוצות זהות</span>
          </div>
          <div className="sod29-world-all-research-list">{languageQueue.data.rows.map((row) => <article className="sod29-world-all-research-row" key={row.id}>
            <div className="sod29-world-all-research-row-head"><div className="sod29-world-all-research-tags"><span>{row.language}</span><span>{row.relationshipType}</span><span>{row.status === "approved" ? "מאושר" : row.status}</span></div><span>{LANGUAGE_QUEUE_LABELS[row.state]}</span></div>
            <strong>{row.hebrew} ↔ <span dir="ltr">{row.foreignWord}</span></strong>
            <div className="sod29-world-finding-measures" aria-label="צירי גשר שפה נפרדים">
              <div><small>ערך עברי</small><strong>{row.gematriaHebrew ?? "אין נתון"}</strong></div>
              <div><small>שיטה</small><strong>{row.method || "אין נתון"}</strong></div>
              <div><small>רמת ראיות</small><strong>{row.evidenceLevel || "אין נתון"}</strong></div>
              <div><small>מקור תרגום</small><strong>{row.translationSource || "אין נתון"}</strong></div>
              <div><small>אימות אנושי</small><strong>{row.humanVerified ? "כן" : "טרם"}</strong></div>
            </div>
            {row.note ? <p className="sod29-world-all-research-secondary">{row.note}</p> : null}
            <div className={`sod29-world-triage-recommendation ${row.state === "verified_with_source" ? "is-ready" : "is-review"}`}><small>המלצה</small><strong>{row.recommendation}</strong></div>
            <div className="sod29-world-source-locator"><strong>מזהה מקור</strong><code dir="ltr">{row.sourceRef}</code><small>אימות של תרגום או תעתיק אינו הופך את הפרשנות לאמת, ושוויון מספרי אינו מוכיח משמעות.</small></div>
          </article>)}</div>
        </> : null}
      </section> : null}

      {galleryQueue.open ? <section className="sod29-world-kind-section" aria-label="תור גלריות תמונות ו-OCR">
        <header><div><h3>תור גלריות, OCR וכפילויות</h3><p>נטען רק בלחיצה. כתובת תמונה זהה מתקבצת לתצוגה אחת, אך כל הופעת מקור נשמרת ואינה נספרת כראיה עצמאית נוספת.</p></div>{galleryQueue.data ? <span>{galleryQueue.data.counts.queueItems} אשכולות לטיפול</span> : null}</header>
        {galleryQueue.loading ? <p role="status">סורק את זהויות התמונות ואת מצב ה־OCR…</p> : null}
        {galleryQueue.error ? <p role="status">תור התמונות אינו זמין כרגע. לא הומצאו נתונים חלופיים.</p> : null}
        {galleryQueue.data ? <>
          <div className="sod29-world-all-research-summary">
            <span><b>{galleryQueue.data.counts.total}</b> תמונות במאגר המורשה</span>
            <span><b>{galleryQueue.data.counts.publicVisible}</b> בעדשה הציבורית</span>
            <span><b>{galleryQueue.data.counts.ocrReview}</b> בתור בדיקת OCR</span>
            <span><b>{galleryQueue.data.counts.ocrPending}</b> OCR בהמתנה</span>
            <span><b>{galleryQueue.data.counts.ocrError}</b> שגיאות OCR</span>
            <span><b>{galleryQueue.data.counts.ocrDoneMissingText}</b> הושלם בלי טקסט</span>
            <span><b>{galleryQueue.data.counts.ocrMissingSource}</b> מקור OCR חסר</span>
            <span><b>{galleryQueue.data.counts.duplicateGroups}</b> אשכולות כתובת זהה</span>
            <span><b>{galleryQueue.data.counts.duplicateRows}</b> הופעות עודפות שנשמרו</span>
            <span><b>{galleryQueue.data.counts.fullyUnlabeledClusters}</b> אשכולות בלי שם ותיאור</span>
          </div>
          <div className="sod29-world-all-research-filters">
            <label><span>סוג טיפול</span><select value={galleryQueue.filter} onChange={(event) => setGalleryQueue((current) => ({ ...current, filter: event.target.value, limit: 40 }))}>
              <option value="all">כל התור · {galleryQueue.data.rows.length}</option>
              <option value="ocr">דורש OCR · {galleryQueue.data.rows.filter((row) => row.issues.includes("ocr")).length}</option>
              <option value="duplicate">כתובת זהה · {galleryQueue.data.rows.filter((row) => row.issues.includes("duplicate")).length}</option>
              <option value="missing_label">בלי שם ותיאור · {galleryQueue.data.rows.filter((row) => row.issues.includes("missing_label")).length}</option>
            </select></label>
          </div>
          <div className="sod29-world-all-research-count">מוצגים {Math.min(galleryQueue.limit, filteredGalleryRows.length)} מתוך {filteredGalleryRows.length} במסנן הגלריות.</div>
          <div className="sod29-world-all-research-list">{filteredGalleryRows.slice(0, galleryQueue.limit).map((row) => <article className="sod29-world-all-research-row sod29-world-gallery-triage-row" key={row.id}>
            <div className="sod29-world-all-research-row-head"><div className="sod29-world-all-research-tags"><span>תמונה</span>{row.issues.includes("ocr") ? <span>דורש OCR</span> : null}{row.issues.includes("duplicate") ? <span>{row.occurrenceCount} הופעות זהות</span> : null}{row.issues.includes("missing_label") ? <span>בלי שם ותיאור</span> : null}<span>{row.publicVisible ? "בעדשה הציבורית" : "מחוץ לעדשה הציבורית"}</span></div><span>{row.independentSourceCount} מקור עצמאי</span></div>
            {row.thumbUrl ? <a href={row.imageUrl} target="_blank" rel="noreferrer" aria-label={`פתח תמונת מקור: ${row.title}`}><img className="sod29-world-all-research-media" src={row.thumbUrl} alt={row.title} loading="lazy" decoding="async" /></a> : null}
            <strong>{row.title}</strong>
            {row.description ? <p className="sod29-world-all-research-secondary">{row.description}</p> : null}
            <div className="sod29-world-finding-measures" aria-label="צירי בדיקת תמונה נפרדים">
              <div><small>מצב OCR</small><strong>{row.ocrReviewStates.includes("pending") ? "בהמתנה" : row.ocrReviewStates.includes("error") ? "שגיאה" : row.ocrReviewStates.includes("missing_source") ? "מקור חסר" : row.ocrReviewStates.includes("missing_text") ? "הושלם בלי טקסט" : row.ocrStatus}</strong></div>
              <div><small>הופעות</small><strong>{row.occurrenceCount}</strong></div>
              <div><small>מקורות עצמאיים</small><strong>{row.independentSourceCount}</strong></div>
              <div><small>תגיות</small><strong>{row.tags.length || "אין נתון"}</strong></div>
              <div><small>מספרי OCR</small><strong>{row.numbers.length ? row.numbers.join(" · ") : "אין נתון"}</strong></div>
            </div>
            <div className={`sod29-world-triage-recommendation ${row.issues.includes("ocr") || row.issues.includes("missing_label") ? "is-review" : "is-duplicate"}`}><small>המלצה</small><strong>{row.recommendation}</strong></div>
            <div className="sod29-world-source-locator"><strong>נציג התצוגה המומלץ</strong><code dir="ltr">gallery_images:{row.recommendedDisplayId}</code><small>{row.representativeReason}</small></div>
            {row.occurrences.length > 1 ? <details className="sod29-world-all-research-duplicates"><summary><span>כל {row.occurrences.length} הופעות המקור</span><small>אף רשומה לא נמחקה</small></summary><ol>{row.occurrences.map((occurrence) => <li key={occurrence.id}><code dir="ltr">{occurrence.sourceRef}</code><span>{occurrence.id === row.recommendedDisplayId ? "נציג מומלץ" : "הופעה שמורה"}{occurrence.ocrIncomplete ? " · דורשת OCR" : ""}</span></li>)}</ol></details> : null}
          </article>)}</div>
          {galleryQueue.limit < filteredGalleryRows.length ? <div className="sod29-actions"><button className="sod29-action" type="button" onClick={() => setGalleryQueue((current) => ({ ...current, limit: current.limit + 40 }))}>הצג עוד 40</button></div> : null}
        </> : null}
      </section> : null}

      {gematriaQueue.open ? <section className="sod29-world-kind-section" aria-label="תור אימות גימטריה">
        <header><div><h3>תור אימות גימטריה</h3><p>כל עמוד כולל עד 40 רשומות דרך שער המנהל הקיים. התאמת מנוע, אישור אנושי, פרסום וחיבור לעץ נשארים צירים נפרדים.</p></div>{gematriaQueue.page ? <span>{gematriaQueue.projection.rows.length} מתוך {gematriaQueue.page.totalFiltered}</span> : null}</header>
        {gematriaQueue.loading ? <p role="status">טוען את מנת הגימטריה הראשונה…</p> : null}
        {gematriaQueue.error ? <p role="status">תור הגימטריה אינו זמין כרגע. לא הומצאו תוצאות אימות.</p> : null}
        {gematriaQueue.projection ? <>
          <div className="sod29-world-all-research-summary">
            <span><b>{gematriaQueue.projection.summary.unverified}</b> טרם סומנו מאומתים</span>
            <span><b>{gematriaQueue.projection.summary.deterministicReady}</b> התאמת מנוע מלאה</span>
            <span><b>{gematriaQueue.projection.summary.outsideCleanHebrew}</b> לבדיקת כתיב ומקור</span>
            <span><b>{gematriaQueue.projection.summary.containsDigits}</b> מכילים ספרות</span>
            <span><b>{gematriaQueue.projection.summary.outsidePunctuation}</b> עם פיסוק מקור</span>
            <span><b>{gematriaQueue.projection.summary.outsideDelta}</b> ביטויי Δ</span>
            <span><b>{gematriaQueue.projection.summary.outsideDiacritics}</b> כתיב מנוקד</span>
            <span><b>{gematriaQueue.projection.summary.outsideMathOperators}</b> ביטויים חישוביים</span>
            <span><b>{gematriaQueue.projection.summary.outsideLatinExclusive}</b> שפה או תעתיק לטיני</span>
            <span><b>{gematriaQueue.projection.summary.duplicateGroups}</b> קבוצות ביטוי זהה</span>
            <span><b>{gematriaQueue.projection.summary.unverifiedPublished}</b> פורסם בלי סימון אימות</span>
          </div>
          {!gematriaQueue.projection.integrityAvailable ? <p className="sod29-world-all-research-boundary">שער התאמת המנוע לא היה זמין. כל הרשומות במנה נשארו במצב חסום.</p> : null}
          <div className="sod29-world-all-research-list">{gematriaQueue.projection.rows.map((row) => <article className="sod29-world-all-research-row" key={row.id}>
            <div className="sod29-world-all-research-row-head"><div className="sod29-world-all-research-tags"><span>גימטריה</span><span>{row.encrypted ? "ביטוי מוצפן" : "ביטוי מקור"}</span>{row.duplicateOccurrenceCount ? <span>{row.duplicateGroupIds.length} הופעות זהות</span> : null}{row.publicationWarning ? <span>דורש בדיקת פרסום</span> : null}</div><span>{GEMATRIA_QUEUE_LABELS[row.integrityState]}</span></div>
            <strong>{row.displayPhrase}</strong>
            <div className="sod29-world-finding-measures" aria-label="צירי בדיקת גימטריה נפרדים">
              <div><small>רגיל שמור</small><strong>{row.regularValue ?? "אין נתון"}</strong></div>
              <div><small>שער מנוע</small><strong>{GEMATRIA_QUEUE_LABELS[row.integrityState]}</strong></div>
              <div><small>ערכים חסרים</small><strong>{row.missingMethods.length || "אין"}</strong></div>
              <div><small>אי־התאמות</small><strong>{row.mismatches.length || "אין"}</strong></div>
              <div><small>פרסום</small><strong>{row.isPublished ? "מסומן מפורסם" : "לא פורסם"}</strong></div>
            </div>
            {!row.inputSignals.cleanHebrew ? <p className="sod29-world-all-research-secondary">מחוץ לגבול העברית הנקייה · {GEMATRIA_INPUT_CLASS_LABELS[row.inputSignals.inputClass]}</p> : null}
            {row.missingMethods.length ? <p><b>חסרים:</b> {row.missingMethods.join(" · ")}</p> : null}
            {row.mismatches.length ? <details className="sod29-world-all-research-duplicates"><summary>אי־התאמות לערכי המנוע</summary><ul>{row.mismatches.map((mismatch) => <li key={mismatch.method}>{mismatch.method}: שמור {String(mismatch.stored)} · מנוע {String(mismatch.engine)}</li>)}</ul></details> : null}
            <div className={`sod29-world-triage-recommendation ${row.integrityState === "engine_parity_ready" ? "is-ready" : row.integrityState === "engine_mismatch" ? "is-blocked" : "is-review"}`}><small>המלצה</small><strong>{row.recommendation}</strong></div>
            {row.duplicateGroupIds.length ? <div className="sod29-world-semantic-duplicate"><strong>קבוצת ביטוי זהה · תצוגה בלבד</strong>{row.duplicateGroupIds.map((id) => <code dir="ltr" key={id}>gematria_words:{id}</code>)}<p>כל הרשומות נשמרות; החזרה אינה מקור עצמאי נוסף.</p></div> : null}
            <div className="sod29-world-source-locator"><strong>מזהה מקור</strong><code dir="ltr">{row.sourceRef}</code><small>התאמת חישוב אינה הוכחת משמעות, איכות או אמת.</small></div>
          </article>)}</div>
          {gematriaQueue.page?.hasMore ? <div className="sod29-actions"><button className="sod29-action" type="button" disabled={gematriaQueue.loadingMore} onClick={loadMoreGematria}>{gematriaQueue.loadingMore ? "טוען…" : "טען עוד 40"}</button></div> : null}
        </> : null}
      </section> : null}

      {insightQueue.open ? <section className="sod29-world-kind-section" aria-label="תור תובנות מקורות וראיות">
        <header><div><h3>תור תובנות, מקורות וראיות</h3><p>המקור, רמת הראיות, האימות והפעילות מוצגים בנפרד. מקור תיאורי נשמר אך אינו מוצג כקישור מדויק.</p></div>{insightQueue.page ? <span>{insightQueue.projection.rows.length} מתוך {insightQueue.page.totalFiltered}</span> : null}</header>
        {insightQueue.loading ? <p role="status">טוען את מנת התובנות הראשונה…</p> : null}
        {insightQueue.error ? <p role="status">תור התובנות אינו זמין כרגע. לא הומצאו מקורות או רמות ראיות.</p> : null}
        {insightQueue.projection ? <>
          <div className="sod29-world-all-research-summary">
            <span><b>{insightQueue.projection.summary.total}</b> תובנות</span>
            <span><b>{insightQueue.projection.summary.active}</b> פעילות</span>
            <span><b>{insightQueue.projection.summary.missingSourceRef}</b> ללא source_ref</span>
            <span><b>{insightQueue.projection.summary.descriptiveSourceRef}</b> מקור תיאורי בלבד</span>
            <span><b>{insightQueue.projection.summary.missingEvidence}</b> ללא רמת ראיות</span>
            <span><b>{insightQueue.projection.summary.structurallyReady}</b> שלמות מבנית</span>
            <span><b>{insightQueue.projection.summary.activeMissingSource}</b> פעילות בלי מקור</span>
            <span><b>{insightQueue.projection.summary.activeDescriptiveSource}</b> פעילות עם מקור תיאורי</span>
            <span><b>{insightQueue.projection.summary.markedVerifiedMissingExactSource}</b> מסומנות מאומתות בלי locator מדויק</span>
          </div>
          <div className="sod29-world-all-research-list">{insightQueue.projection.rows.map((row) => <article className="sod29-world-all-research-row" key={row.id}>
            <div className="sod29-world-all-research-row-head"><div className="sod29-world-all-research-tags"><span>תובנה</span><span>{row.active ? "פעילה" : "מחוץ לעדשה הפעילה"}</span><span>{row.verified ? "מסומנת מאומתת" : "טרם סומנה מאומתת"}</span>{row.duplicateOccurrenceCount ? <span>{row.duplicateGroupIds.length} הופעות טקסט זהה</span> : null}</div><span>{INSIGHT_QUEUE_LABELS[row.state]}</span></div>
            <strong>{row.title}</strong>
            {row.summary ? <p className="sod29-world-all-research-secondary">{row.summary}</p> : null}
            <div className="sod29-world-finding-measures" aria-label="צירי בדיקת תובנה נפרדים">
              <div><small>מקור</small><strong>{row.sourceLocatorState === "locator_like" ? "locator שמור" : row.sourceLocatorState === "descriptive_only" ? "תיאור בלבד" : "חסר"}</strong></div>
              <div><small>רמת ראיות</small><strong>{row.evidenceLevel ?? "אין נתון"}</strong></div>
              <div><small>אימות</small><strong>{row.verified ? "כן" : "טרם"}</strong></div>
              <div><small>הוכחה שמורה</small><strong>{row.proofPresent ? "קיימת" : "אין נתון"}</strong></div>
              <div><small>מספרים קשורים</small><strong>{row.relatedNumbers.length ? row.relatedNumbers.join(" · ") : "אין נתון"}</strong></div>
            </div>
            <div className={`sod29-world-triage-recommendation ${row.structurallyReady ? "is-ready" : row.state === "inactive" ? "is-blocked" : "is-review"}`}><small>המלצה</small><strong>{row.recommendation}</strong></div>
            <div className="sod29-world-source-locator"><strong>מזהה התובנה</strong><code dir="ltr">{row.sourceRef}</code>{row.storedSourceRef ? <code dir="ltr">source_ref: {row.storedSourceRef}</code> : <small>לא נשמר source_ref.</small>}{row.sourceHref ? <div className="sod29-actions"><a className="sod29-action" href={row.sourceHref}>פתח מקור מדויק ←</a></div> : null}<small>רמת ראיות או סימון אימות אינם תחליף למקור שניתן לאיתור.</small></div>
            {row.duplicateGroupIds.length ? <div className="sod29-world-semantic-duplicate"><strong>טקסט זהה · קיבוץ תצוגה בלבד</strong>{row.duplicateGroupIds.map((id) => <code dir="ltr" key={id}>insights:{id}</code>)}<p>שתי הרשומות נשמרות; לא בוצע מיזוג או מחיקה.</p></div> : null}
          </article>)}</div>
          {insightQueue.page?.hasMore ? <div className="sod29-actions"><button className="sod29-action" type="button" disabled={insightQueue.loadingMore} onClick={loadMoreInsights}>{insightQueue.loadingMore ? "טוען…" : "טען עוד 40"}</button></div> : null}
        </> : null}
      </section> : null}

      <div className="sod29-world-all-research-summary">
        <span><b>{projection.triageSnapshot?.matchedCards || 0}</b> כרטיסים מדוח המיון</span>
        <span><b>{projection.triageSnapshot?.recommendationCounts?.["מתאים לעץ"] || 0}</b> המלצות עץ בדוח 22.10</span>
        <span><b>{projection.triageSnapshot?.strengthCounts?.["חזק"] || 0}</b> ממצאים חזקים</span>
        <span><b>{projection.treeMatchedResearchOccurrences || 0}</b> רשומות מחוברות ליעד קיים בעץ</span>
        <span><b>{projection.meteredResearchOccurrences || 0}</b> רשומות עם מד יעד זמין</span>
        {projection.duplicateProjection?.groups ? <span><b>{projection.duplicateProjection.groups}</b> אשכולות מאוחדים</span> : null}
        <span><b>{projection.triageSnapshot?.untriagedLiveCards || 0}</b> חדשים שטרם מוינו בדוח</span>
      </div>

      {projection.triageSnapshot?.strongContinuation ? <div className="sod29-world-all-research-summary">
        <span><b>{projection.triageSnapshot.strongContinuation.alreadyConnected}</b> חזקים שכבר מחוברים</span>
        <span><b>{projection.triageSnapshot.strongContinuation.readyForImplementation}</b> מוכנים ליישום מבוקר</span>
        <span><b>{projection.triageSnapshot.strongContinuation.clusteredDuplicates}</b> כפילויות תקינות לתצוגת אשכול</span>
        <span><b>{projection.triageSnapshot.strongContinuation.correctedDuplicateClassifications}</b> סיווגי כפילות שתוקנו</span>
        <span><b>{projection.triageSnapshot.strongContinuation.blockedMissingTarget}</b> חסומים עד יצירת יעד</span>
        <span><b>{projection.triageSnapshot.strongContinuation.needsReview}</b> עדיין דורשים בדיקה</span>
        <span><b>{projection.triageSnapshot.strongContinuation.setAside}</b> הושמו בצד</span>
      </div> : null}

      {projection.triageSnapshot?.mediumMatchContinuation ? <div className="sod29-world-all-research-summary">
        <span><b>{projection.triageSnapshot.mediumMatchContinuation.explicitMatchFindings}</b> בינוניים עם התאמה מפורשת שנבדקו</span>
        <span><b>{projection.triageSnapshot.mediumMatchContinuation.readyForImplementation}</b> מוכנים לעץ במנה זו</span>
        <span><b>{projection.triageSnapshot.mediumMatchContinuation.sourceRequired}</b> חסרי מקור תוכן עצמאי</span>
        <span><b>{projection.triageSnapshot.mediumMatchContinuation.identityUnresolved}</b> שיוך זהות לא פתור</span>
        <span><b>{projection.triageSnapshot.mediumMatchContinuation.ocrRequired}</b> דורש חיבור תמונה / OCR</span>
      </div> : null}

      {projection.technicallyReadyReplayOccurrences ? <div className="sod29-world-all-research-summary" aria-label="מצב הכרעת מקור ויעד לממצאים בשלים טכנית">
        <span><b>{projection.technicallyReadyReplayOccurrences}</b> הופעות בשלות טכנית לביקורת מקור ויעד</span>
        <span><b>{projection.byLegacyReplaySourceReadiness?.exact_source || 0}</b> עם מקור מדויק</span>
        <span><b>{projection.byLegacyReplaySourceReadiness?.source_locator_repair || 0}</b> דורשות תיקון locator</span>
        <span><b>{projection.byLegacyReplayTargetReadiness?.already_connected || 0}</b> כבר מחוברות</span>
        <span><b>{projection.byLegacyReplayTargetReadiness?.single_structured_target || 0}</b> עם יעד יחיד לבדיקה</span>
        <span><b>{projection.byLegacyReplayTargetEvidence?.exact_row_value_match || 0}</b> יעדי מספר יחידים שתואמים לערך המובנה</span>
        <span><b>{projection.byLegacyReplayTargetEvidence?.exact_value_primary_with_context || 0}</b> מספר ראשי תואם עם הקשרים נוספים</span>
        <span><b>{projection.byLegacyReplayTargetEvidence?.exact_value_among_multiple_numbers || 0}</b> מספר תואם לצד מספרים נוספים</span>
        <span><b>{projection.byLegacyReplayTargetEvidence?.structured_value_without_target || 0}</b> עם ערך מובנה להצעת יעד מספר</span>
        <span><b>{projection.byLegacyReplayTargetEvidence?.missing_value_and_target || 0}</b> בלי יעד ובלי ערך מובנה</span>
        <span><b>{projection.byLegacyReplayTargetReadiness?.multiple_structured_targets || 0}</b> עם כמה יעדים</span>
        <span><b>{projection.byLegacyReplayTargetReadiness?.missing_structured_target || 0}</b> בלי יעד מובנה</span>
      </div> : null}

      {projection.pendingEngineReviewOccurrences ? <div className="sod29-world-all-research-summary" aria-label="מצב מקור ויעד לפני השלמת מעטפת מנוע">
        <span><b>{projection.pendingEngineReviewOccurrences}</b> הופעות ללא מעטפת מנוע</span>
        <span><b>{projection.byPendingEngineSourceReadiness?.exact_source || 0}</b> עם מקור מדויק</span>
        <span><b>{projection.byPendingEngineSourceReadiness?.source_locator_repair || 0}</b> דורשות איתור מקור</span>
        <span><b>{projection.byPendingEngineTargetReadiness?.single_structured_target || 0}</b> עם יעד יחיד שמור</span>
        <span><b>{projection.byPendingEngineTargetReadiness?.multiple_structured_targets || 0}</b> עם כמה יעדים שמורים</span>
        <span><b>{projection.byPendingEngineTargetReadiness?.missing_structured_target || 0}</b> בלי יעד שמור</span>
        <span><b>{projection.byPendingEngineTargetEvidence?.exact_row_value_match || 0}</b> יעד יחיד תואם ל־value</span>
        <span><b>{projection.byPendingEngineTargetEvidence?.structured_value_without_target || 0}</b> value קיים בלי יעד</span>
      </div> : null}

      {projection.truncated ? <div className="sod29-world-all-research-state">המאגר גדול מגבול הקריאה הנוכחי; מוצג כל מה שנטען והמצב מסומן כחלקי.</div> : null}
      <div className="sod29-world-all-research-state">דוח המיון מ־22.10.2026 נשמר כנקודת ייחוס. החלטות ההמשך מ־26.10.2026 מוצגות מעליו בנפרד. הטקסט, ההרשאות, מצב הפרסום, המקורות והיעדים נקראים עכשיו מהמערכת; שכבת המיון אינה משנה אותם.</div>

      <div className="sod29-world-all-research-filters">
        <label className="is-wide"><span>חיפוש בממצאים</span><input value={query} onChange={(e) => { setQuery(e.target.value); setFinding(""); }} placeholder="טקסט, מזהה, חוקר, מספר או מקור…" /></label>
        <label><span>סדר</span><select value={sort} onChange={(e) => setSort(e.target.value)}>{Object.entries(SORT_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>חוזק</span><select value={strength} onChange={(e) => setStrength(e.target.value)}><option value="all">כל רמות החוזק</option>{Object.entries(projection.byTriageStrength || {}).map(([value, count]) => <option value={value} key={value}>{value} · {count}</option>)}</select></label>
        <label><span>המלצת מיון</span><select value={recommendation} onChange={(e) => setRecommendation(e.target.value)}><option value="all">כל ההמלצות</option>{Object.entries(projection.byTriageRecommendation || {}).map(([value, count]) => <option value={value} key={value}>{value} · {count}</option>)}</select></label>
        <label><span>החלטת המשך</span><select value={continuation} onChange={(e) => setContinuation(e.target.value)}><option value="all">כל החלטות ההמשך</option>{Object.entries(projection.byContinuationState || {}).map(([value, count]) => <option value={value} key={value}>{humanLabel(CONTINUATION_LABELS, value, "מצב המשך נוסף")} · {count}</option>)}</select></label>
        <label><span>איכות ראיות</span><select value={quality} onChange={(e) => setQuality(e.target.value)}><option value="all">עם ובלי נתון</option>{Object.entries(QUALITY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>נושא בעץ</span><select value={topic} onChange={(e) => setTopic(e.target.value)}><option value="all">כל הנושאים</option>{(projection.topicOptions || []).map((option) => <option value={option.value} key={option.value}>{option.label} · {option.count}</option>)}</select></label>
        <label><span>מקור</span><select value={source} onChange={(e) => setSource(e.target.value)}><option value="all">כל המקורות</option>{(projection.sourceOptions || []).map((option) => <option value={option.value} key={option.value}>{option.label} · {option.count}</option>)}</select></label>
        <label><span>סוג</span><select value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">כל הסוגים</option>{Object.keys(projection.byKind).sort().map((v) => <option value={v} key={v}>{humanLabel(KIND_LABELS, v, "סוג מחקר נוסף")} · {projection.byKind[v]}</option>)}</select></label>
        <label><span>גישה · מנהל</span><select value={access} onChange={(e) => setAccess(e.target.value)}><option value="all">הכול · בלי הסתרה בתוך הרשאת החשבון</option>{Object.keys(projection.byAccess).sort().map((v) => <option value={v} key={v}>{humanLabel(ACCESS_LABELS, v, "היקף גישה נוסף")} · {projection.byAccess[v]}</option>)}</select></label>
        <label><span>מצב פרסום / ממשל</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">כל המצבים</option>{Object.keys(projection.byStatus).sort().map((v) => <option value={v} key={v}>{humanLabel(STATUS_LABELS, v, "מצב פנימי")} · {projection.byStatus[v]}</option>)}</select></label>
        <label><span>אימות</span><select value={verification} onChange={(e) => setVerification(e.target.value)}><option value="all">כל מצבי האימות</option>{Object.keys(projection.byVerification).sort().map((v) => <option value={v} key={v}>{humanLabel(VERIFICATION_LABELS, v, "מצב אימות נוסף")} · {projection.byVerification[v]}</option>)}</select></label>
        <label><span>Replay לאות ישן</span><select value={replay} onChange={(e) => setReplay(e.target.value)}><option value="all">כל מצבי ה־replay</option>{Object.entries(projection.byLegacyReplayState || {}).map(([value, count]) => <option value={value} key={value}>{humanLabel(LEGACY_REPLAY_LABELS, value, "מצב replay נוסף")} · {count}</option>)}</select></label>
        <label><span>ניתוב ללא מעטפת מנוע</span><select value={replayQueue} onChange={(e) => setReplayQueue(e.target.value)}><option value="all">כל סוגי התוכן</option>{Object.entries(MISSING_ENGINE_QUEUE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label><span>תת־סוג מרחב או קבוע</span><select value={replaySubtype} onChange={(e) => setReplaySubtype(e.target.value)}><option value="all">כל תתי־הסוג</option>{Object.entries(MISSING_ENGINE_SUBTYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label} · {projection.byLegacyReplaySubtype?.[value] || 0}</option>)}</select></label>
        <label><span>שלמות זהות מרחבית</span><select value={replaySpatialMetadata} onChange={(e) => setReplaySpatialMetadata(e.target.value)}><option value="all">עם ובלי מטא־דאטה</option>{Object.entries(SPATIAL_METADATA_LABELS).map(([value, label]) => <option value={value} key={value}>{label} · {projection.bySpatialResearchMetadataState?.[value] || 0}</option>)}</select></label>
        <label><span>שלמות מקור · בשל טכנית</span><select value={replaySource} onChange={(e) => setReplaySource(e.target.value)}><option value="all">מקור מדויק ותיקונים</option>{Object.entries(REPLAY_SOURCE_LABELS).map(([value, label]) => <option value={value} key={value}>{label} · {projection.byLegacyReplaySourceReadiness?.[value] || 0}</option>)}</select></label>
        <label><span>מצב יעד · בשל טכנית</span><select value={replayTarget} onChange={(e) => setReplayTarget(e.target.value)}><option value="all">כל מצבי היעד</option>{Object.entries(REPLAY_TARGET_LABELS).map(([value, label]) => <option value={value} key={value}>{label} · {projection.byLegacyReplayTargetReadiness?.[value] || 0}</option>)}</select></label>
        <label><span>ראיית יעד · בשל טכנית</span><select value={replayTargetEvidence} onChange={(e) => setReplayTargetEvidence(e.target.value)}><option value="all">כל ראיות היעד</option>{Object.entries(REPLAY_TARGET_EVIDENCE_LABELS).map(([value, label]) => <option value={value} key={value}>{label} · {projection.byLegacyReplayTargetEvidence?.[value] || 0}</option>)}</select></label>
        <label><span>יעד · חסרה מעטפת מנוע</span><select value={pendingEngineTarget} onChange={(e) => setPendingEngineTarget(e.target.value)}><option value="all">כל מצבי היעד לפני מנוע</option>{Object.entries(REPLAY_TARGET_LABELS).map(([value, label]) => <option value={value} key={value}>{label} · {projection.byPendingEngineTargetReadiness?.[value] || 0}</option>)}</select></label>
        <label><span>ראיית יעד · חסרה מעטפת</span><select value={pendingEngineTargetEvidence} onChange={(e) => setPendingEngineTargetEvidence(e.target.value)}><option value="all">כל ראיות היעד לפני מנוע</option>{Object.entries(REPLAY_TARGET_EVIDENCE_LABELS).map(([value, label]) => <option value={value} key={value}>{label} · {projection.byPendingEngineTargetEvidence?.[value] || 0}</option>)}</select></label>
        <label><span>ייחוס / תורם</span><select value={contributor} onChange={(e) => setContributor(e.target.value)}><option value="all">כל הייחוסים</option>{Object.entries(projection.byContributor).sort((a,b) => b[1]-a[1]).map(([v,count]) => <option value={v} key={v}>{contributorLabel(v)} · {count}</option>)}</select></label>
        <label><span>חיבור לעץ · מנהל</span><select value={tree} onChange={(e) => setTree(e.target.value)}>
          <option value="all">הכול</option><option value="matched">מחוברים ליעד קיים</option><option value="unmatched">ממתין לשיוך · מנהל בלבד</option>
        </select></label>
        <label><span>מד יעד</span><select value={meter} onChange={(e) => setMeter(e.target.value)}>
          <option value="all">עם ובלי מד</option><option value="metered">יש מד זמין</option><option value="unmetered">עדיין אין מד</option>
        </select></label>
        <button className="sod29-action sod29-world-all-research-reset" type="button" onClick={resetFilters}>אפס מסננים</button>
      </div>

      <div className="sod29-world-all-research-count">מוצגים {rows.length} מתוך {review.page?.totalFiltered || 0} במסנן הנוכחי.</div>

      <div className="sod29-world-all-research-list">
        {rows.map((row) => {
          const rating = row.linkedTopicRating || null;
          const ratingNumbers = rating?.numbers?.length ? rating.numbers : row.values;
          const highlightNumbers = rating?.highlightNumbers?.length ? rating.highlightNumbers : row.values;
          const triage = row.triage || null;
          const treeTargets = Array.isArray(row.treeMatches) ? row.treeMatches : [];
          const representativeId = triage?.displayRepresentativeId || triage?.recommendedKeepId || null;
          const representativeHref = representativeId
            ? `/world?admin=1&finding=${encodeURIComponent(representativeId)}#finding-${encodeURIComponent(representativeId)}`
            : null;
          const keepHref = triage?.recommendedKeepId
            ? `/world?admin=1&finding=${encodeURIComponent(triage.recommendedKeepId)}#finding-${encodeURIComponent(triage.recommendedKeepId)}`
            : null;
          const proposedTreeTargets = triage?.proposedTreeTargets?.length
            ? triage.proposedTreeTargets
            : triage?.proposedTreeTarget ? [triage.proposedTreeTarget] : [];
          return <article className="sod29-world-all-research-row" id={`finding-${row.sourceId}`} key={row.id}>
          <div className="sod29-world-all-research-row-head">
            <div className="sod29-world-all-research-tags">
              <span>{triage?.rank ? `סדר דוח · #${triage.rank}` : "טרם דורג בדוח"}</span>
              <span>{humanLabel(FAMILY_LABELS, row.family, "שכבת מחקר")}</span>
              <span>{row.typeLabel || humanLabel(KIND_LABELS, row.kind, "ממצא מחקר")}</span>
              {row.access ? <AccessLabel value={row.access} /> : null}
              {row.mediaClass ? <span>{humanLabel(MEDIA_LABELS, row.mediaClass, "מדיה")}</span> : null}
            </div>
            <VerificationLabel row={row} />
          </div>

          <div className="sod29-world-finding-measures" aria-label="מדדי ממצא נפרדים">
            <div><small>חוזק החיבור</small><strong>{triage?.strength || "טרם דורג"}</strong></div>
            <div><small>איכות הראיות</small><strong>{row.evidenceQuality?.label || "אין נתון"}</strong></div>
            <div><small>מקורות עצמאיים</small><strong>{row.independentSourceCount || "אין נתון"}</strong></div>
            <div><small>מצב בדיקה</small><strong>{humanLabel(VERIFICATION_LABELS, row.verification, "מצב נוסף")}</strong></div>
            <div><small>מצב פרסום / ממשל</small><strong>{humanLabel(STATUS_LABELS, row.status, "לא צוין")}</strong></div>
          </div>

          <div className={`sod29-world-triage-recommendation ${triageClass(triage?.recommendation)}`}>
            <small>המלצת המיון</small>
            <strong>{triage?.recommendation || "טרם מוין בדוח"}</strong>
          </div>

          {triage?.continuationState ? <div className={`sod29-world-triage-recommendation ${continuationClass(triage.continuationState)}`}>
            <span><small>החלטת המשך · 26.10.2026</small><strong>{triage.continuationLabel || humanLabel(CONTINUATION_LABELS, triage.continuationState, "מצב המשך")}</strong></span>
            <small>{triage.continuationReason}</small>
          </div> : null}

          {row.legacyReplay ? <div className={`sod29-world-triage-recommendation ${legacyReplayClass(row.legacyReplay.state)}`}>
            <span><small>Replay מנהלי · אינו משנה סטטוס אמת{row.legacyReplay.routingQueue ? ` · ${humanLabel(MISSING_ENGINE_QUEUE_LABELS, row.legacyReplay.routingQueue, "תור תוכן")}` : ""}{row.legacyReplay.routingSubtype ? ` · ${humanLabel(MISSING_ENGINE_SUBTYPE_LABELS, row.legacyReplay.routingSubtype, "תת־סוג")}` : ""}{row.legacyReplay.spatialResearchContext ? ` · ${humanLabel(SPATIAL_METADATA_LABELS, row.legacyReplay.spatialResearchContext.state, "זהות מרחבית")}` : ""}</small><strong>{humanLabel(LEGACY_REPLAY_LABELS, row.legacyReplay.state, "מצב replay")}</strong></span>
            <small>{legacyReplayDescription(row.legacyReplay)}</small>
          </div> : null}

          {row.legacyReplay?.spatialResearchContext?.state !== "missing" && row.legacyReplay?.spatialResearchContext ? <details className="sod29-world-all-research-duplicates">
            <summary>מטא־דאטה מרחבי מתועד · {humanLabel(SPATIAL_METADATA_LABELS, row.legacyReplay.spatialResearchContext.state, "זהות מרחבית")}</summary>
            <ul>
              <li>סיווג: {row.legacyReplay.spatialResearchContext.classification || "אין נתון"}</li>
              <li>אשכול: {row.legacyReplay.spatialResearchContext.cluster || "אין נתון"}</li>
              <li>תפקיד: {row.legacyReplay.spatialResearchContext.role || "אין נתון"}</li>
              <li>מפתח מוקד: <code dir="ltr">{row.legacyReplay.spatialResearchContext.researchFocusKey || "אין נתון"}</code></li>
              <li>מקור מרחבי: <code dir="ltr">{row.legacyReplay.spatialResearchContext.sourceRef || "אין נתון"}</code></li>
            </ul>
            <small>השדות מוצגים כפי שנשמרו במקור; המערכת אינה משלימה אותם לפי שם או טקסט.</small>
          </details> : null}

          {row.legacyReplay?.constantCheck ? <div className={`sod29-world-triage-recommendation ${["rounded_mismatch", "exact_mismatch"].includes(row.legacyReplay.constantCheck.state) ? "is-blocked" : "is-review"}`}>
            <span><small>בדיקת קבוע או רצף · חישוב בלבד</small><strong>{humanLabel(CONSTANT_CHECK_LABELS, row.legacyReplay.constantCheck.state, "דורש בדיקה")}</strong></span>
            {row.legacyReplay.constantCheck.expression ? <small><code dir="ltr">{row.legacyReplay.constantCheck.expression}</code> · נטען: {row.legacyReplay.constantCheck.claimed ?? "אין נתון"} · חושב: {row.legacyReplay.constantCheck.isApproximation ? row.legacyReplay.constantCheck.roundedComputed : row.legacyReplay.constantCheck.computed}</small> : <small>המקור מזכיר תוצאה אך אינו מוסר את המשוואה המלאה, ולכן לא בוצע ניחוש.</small>}
            <small>{row.legacyReplay.constantCheck.isApproximation ? "ההשוואה היא לפי מספר הספרות העשרוניות שנכתב במקור; קירוב אינו שוויון מדויק." : "בדיקת הסכום אינה מאמתת את המשמעות או הפרשנות שנקשרה אליו."}</small>
          </div> : null}

          {row.legacyReplay?.pendingEngineContext ? <div className="sod29-world-triage-recommendation is-review">
            <span>
              <small>הקשר מקור ויעד · לפני השלמת מעטפת מנוע</small>
              <strong>{humanLabel(REPLAY_SOURCE_LABELS, row.legacyReplay.pendingEngineContext.sourceReadiness, "מצב מקור נוסף")} · {humanLabel(REPLAY_TARGET_LABELS, row.legacyReplay.pendingEngineContext.targetReadiness, "מצב יעד נוסף")}</strong>
            </span>
            <small>{row.legacyReplay.pendingEngineContext.reason}</small>
            {row.legacyReplay.pendingEngineContext.proposedNumberTargets?.length ? <small>הצעת מספר מן ה־value המובנה: {row.legacyReplay.pendingEngineContext.proposedNumberTargets.join(" · ")}. אין לחבר לפני הכרעת המנוע.</small> : null}
          </div> : null}

          {row.legacyReplay?.decision ? <div className={`sod29-world-triage-recommendation ${row.legacyReplay.decision.decisionState === "already_connected" ? "is-ready" : "is-review"}`}>
            <span>
              <small>הכרעת מקור ויעד · מנהל בלבד · ללא קידום אוטומטי</small>
              <strong>{humanLabel(REPLAY_SOURCE_LABELS, row.legacyReplay.decision.sourceReadiness, "מצב מקור נוסף")} · {humanLabel(REPLAY_TARGET_LABELS, row.legacyReplay.decision.targetReadiness, "מצב יעד נוסף")}</strong>
            </span>
            <small>{row.legacyReplay.decision.reason}</small>
            {row.legacyReplay.decision.targets?.length ? <details className="sod29-world-all-research-duplicates">
              <summary>היעדים המובנים שנשמרו · {row.legacyReplay.decision.targets.length}</summary>
              <ul>{row.legacyReplay.decision.targets.map((target) => <li key={`${target.type}:${target.key}`}>{treeTargetLabel(target)}</li>)}</ul>
            </details> : null}
            {row.legacyReplay.decision.proposedNumberTargets?.length ? <small>הצעת יעד מספר מן ה־value המובנה בלבד: {row.legacyReplay.decision.proposedNumberTargets.join(" · ")}. ההצעה אינה חיבור חי.</small> : null}
          </div> : null}

          {row.mediaUrl ? <img className="sod29-world-all-research-media" src={row.mediaUrl} loading="lazy" alt="" /> : null}
          <strong>{safeVisibleText(row.statement, "ממצא מחקר")}</strong>
          {row.secondary && row.secondary !== row.statement ? <p className="sod29-world-all-research-secondary">{safeVisibleText(row.secondary, null)}</p> : null}
          {row.contextLine ? <p className="sod29-world-all-research-secondary">{safeVisibleText(row.contextLine, null)}</p> : null}

          <div className="sod29-world-all-research-meta">
            <span>ייחוס · {contributorLabel(row.contributor)}</span>
            {row.value != null ? <span>ערך · {row.value}</span> : null}
            <span>מקור · {safeVisibleText(row.sourceLabel, "מקור מחקר")}</span>
            {row.createdAt ? <span>נוסף למחקר · {bilingualDateLabel(row.createdAt)}</span> : null}
          </div>

          <details className="sod29-world-all-research-duplicates sod29-world-ranking-why">
            <summary>למה הממצא נמצא במקום הזה?</summary>
            <div>
              <p>{triage?.evidenceReason || "הממצא נוסף אחרי נקודת החיתוך של הדוח ולכן טרם קיבל הכרעת מיון."}</p>
              {triage?.historicalRecommendation ? <p>בדוח 22.10 ההמלצה הייתה „{triage.historicalRecommendation}”; החלטת ההמשך מוצגת בנפרד ואינה משנה את הרשומה החיה.</p> : null}
              {row.researchStrength?.reasons?.length ? <ul>{row.researchStrength.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
              <small>חוזק, איכות ראיות, מספר מקורות, אימות ופרסום נשארים צירים נפרדים. אף אחד מהם אינו ציון אמת.</small>
            </div>
          </details>

          <DuplicateOccurrences row={row} />

          {representativeHref ? <div className="sod29-world-semantic-duplicate">
            <strong>כפילות סמנטית שסומנה בדוח</strong>
            <p>כל הרשומות והמקורות נשמרים. הנוסח הארוך/המלא שנבחר כנציג התצוגה הוא <code dir="ltr">{representativeId}</code>.</p>
            {triage.recommendedKeepId && triage.recommendedKeepId !== representativeId ? <p>מצביע השמירה מדוח 22.10 נשאר <code dir="ltr">{triage.recommendedKeepId}</code>; הוא אינו מחליף את נציג התצוגה המלא יותר.</p> : null}
            {triage.duplicateIds?.length ? <small>מזהים קשורים: {triage.duplicateIds.join(" · ")}</small> : null}
            <div className="sod29-actions">
              <a className="sod29-action" href={representativeHref}>פתח את נציג התצוגה ←</a>
              {keepHref && keepHref !== representativeHref ? <a className="sod29-action" href={keepHref}>פתח את מצביע השמירה ←</a> : null}
            </div>
          </div> : null}

          {triage?.relatedFindingIds?.length ? <div className="sod29-world-semantic-duplicate">
            <strong>ממצאים קשורים · אינם כפילות</strong>
            <small>{triage.relatedFindingIds.join(" · ")}</small>
          </div> : null}

          {row.attributionLabel ? <div className="sod29-world-all-research-cluster">{safeVisibleText(row.attributionLabel, "ייחוס המקור לא הוכרע")}</div> : null}
          {row.spatialCluster ? <div className="sod29-world-all-research-cluster">קיים אשכול מחקר מרחבי</div> : null}

          {row.family === "research_object" ? <div className="sod29-world-all-research-cluster">
            <strong>{rating ? `מד החיבור לעץ · יעד מדויק · ${rating.title}` : "מד החיבור לעץ · אין נתון"}</strong>
            <p>{rating
              ? "זהו המד של הנושא המדויק בעץ, לא מד של הממצא ולא ציון אמת. איכות היעד המוצגת כאן נפרדת מאיכות הראיות של הממצא."
              : "אין לממצא מד יעד זמין. הוא נשאר ללא נתון ואינו מקבל ציון אפס מומצא."}</p>
            <ConvergenceRatings2029
              quality={rating?.quality ?? null}
              meterScore={rating?.meterScore ?? null}
              highlightNumbers={highlightNumbers || []}
              numbers={ratingNumbers || []}
              popover
            />
            {rating?.href ? <Link className="sod29-action" to={rating.href}>פתח את יעד העץ ←</Link> : null}
            {proposedTreeTargets.length ? <details className="sod29-world-all-research-duplicates" open={proposedTreeTargets.length > 1}>
              <summary>יעדי העץ שהומלצו · {proposedTreeTargets.length}</summary>
              <ul>{proposedTreeTargets.map((target) => <li key={target}><code dir="ltr">{target}</code></li>)}</ul>
            </details> : null}
            {treeTargets.length ? <details className="sod29-world-all-research-duplicates">
              <summary>כל החיבורים המתועדים לעץ · {treeTargets.length}</summary>
              <ul>{treeTargets.map((match, targetIndex) => <li key={`${match.type}:${match.key}:${targetIndex}`}>{treeTargetLabel(match)}</li>)}</ul>
            </details> : <p>ממתין לשיוך · מידע למנהל בלבד.</p>}
          </div> : null}

          <div className="sod29-world-source-locator">
            <strong>מקור וכתובת מדויקת</strong>
            <code dir="ltr">{row.sourceRef || "אין source locator"}</code>
            {row.legacyReplay?.canonicalSourceRef && row.legacyReplay.canonicalSourceRef !== row.sourceRef
              ? <small>מקור channel מדויק נוסף שנשמר ב־source_refs: <code dir="ltr">{row.legacyReplay.canonicalSourceRef}</code></small>
              : null}
            <div className="sod29-actions">
              <a className="sod29-action" href={row.canonicalFindingHref}>קישור ישיר לממצא</a>
              {row.sourceHref ? <a className="sod29-action" href={row.sourceHref} target="_blank" rel="noreferrer">פתח מקור ↗</a> : null}
              {row.href ? row.href.startsWith("/") ? <Link className="sod29-action" to={row.href}>פתח יעד מספר ←</Link> : <a className="sod29-action" href={row.href} target="_blank" rel="noreferrer">פתח יעד ↗</a> : null}
            </div>
            {!row.sourceHref ? <small>למקור הזה אין כתובת Web מאומתת; המזהה המדויק נשמר בלי להמציא קישור.</small> : null}
          </div>
        </article>;
        })}
      </div>

      {!review.loading && !review.error && !rows.length ? <div className="sod29-world-all-research-state">אין פריטים במסנן הזה. אפס מסננים כדי לחזור לכל החומר.</div> : null}
      {review.page?.hasMore ? <div className="sod29-actions"><button className="sod29-action primary" type="button" disabled={review.loadingMore} onClick={loadMore}>{review.loadingMore ? "טוען…" : `הצג עוד ${PAGE}`}</button></div> : null}

      <div className="sod29-world-all-research-boundary">{clean(projection.truthBoundary)}</div>
    </> : null}
  </section>;
}
