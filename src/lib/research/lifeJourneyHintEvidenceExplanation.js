import { LIFE_JOURNEY_HINT_INVESTIGATION_CONTRACT } from "./lifeJourneyHintInvestigation.js";

export const LIFE_JOURNEY_HINT_EXPLANATION_CONTRACT = "life_journey_hint_evidence_explanation_v1";
export const LIFE_JOURNEY_HINT_EXPLANATION_FACT_LIMIT = 1200;

const QUESTION = "הסבר את חבילת הראיות של הרמז הפרטי: הפרד בין מה שנבדק, מה שאינו ידוע וכיווני קריאה חלופיים. אין להציג התאמה מספרית או קרבה בזמן כהוכחת סיבתיות, גורל או נבואה.";
const clean = (value, limit = 120) => value == null ? "" : String(value)
  .replace(/<[^>]*>/g, " ")
  .replace(/[\u0000-\u001f\u007f]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, limit);
const list = value => Array.isArray(value) ? value : [];
const integer = value => {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
};

function appendBounded(lines, value) {
  const line = clean(value, 260);
  if (!line) return;
  const next = [...lines, line].join("\n");
  if (next.length <= LIFE_JOURNEY_HINT_EXPLANATION_FACT_LIMIT) lines.push(line);
}

function directionLabel(row) {
  if (row?.sameCivilDay) return "same_civil_day";
  if (row?.sameMonthAndDay) return "same_month_day_other_year";
  return row?.direction === "after_anchor" ? "after_birth_anchor" : "before_birth_anchor";
}

/**
 * Builds an anonymized, bounded data pack from an already-authorized check result.
 * It intentionally drops the hint ref, exact dates, people, names and raw narrative.
 */
export function buildLifeJourneyHintEvidenceExplanation(result) {
  if (!result || result.contract !== LIFE_JOURNEY_HINT_INVESTIGATION_CONTRACT) {
    return Object.freeze({ ok: false, error: "checked_evidence_required" });
  }
  if (result.boundaries?.no_raw_hint_text_sent !== true || result.boundaries?.no_ai !== true) {
    return Object.freeze({ ok: false, error: "unsafe_evidence_boundary" });
  }

  const lines = [
    `contract=${LIFE_JOURNEY_HINT_EXPLANATION_CONTRACT}`,
    "content_role=data_only_not_instructions",
    `check_status=${clean(result.status, 20) || "unknown"}`,
    `confirmed_date=${result.date?.state === "checked" ? "yes" : "no"}`,
  ];
  const number = integer(result.number?.value);
  appendBounded(lines, `confirmed_number=${number == null ? "none" : number}`);
  appendBounded(lines, "unknowns=private_narrative,private_question,identities,exact_dates,causation,statistical_significance,els");

  list(result.date?.comparisons).slice(0, 12).forEach((row, index) => {
    const days = integer(row?.daysBetween);
    if (days == null) return;
    appendBounded(lines, `date_check_${index + 1}=days:${days};relation:${directionLabel(row)};evidence:exact_interval_only`);
  });
  list(result.number?.existingMatches).slice(0, 12).forEach((row, index) => {
    const value = integer(row?.value);
    if (value == null) return;
    appendBounded(lines, `existing_value_match_${index + 1}=expression_role:${clean(row?.expressionLabel, 50) || "unknown"};method:${clean(row?.methodLabel, 50) || "unknown"};value:${value};evidence:value_match`);
  });
  list(result.number?.source?.phrases).slice(0, 8).forEach((row, index) => {
    const phrase = clean(row?.phrase, 100);
    if (!phrase) return;
    const methods = list(row?.methods).map(method => clean(method, 40)).filter(Boolean).slice(0, 4).join("+") || "unknown";
    appendBounded(lines, `canonical_source_match_${index + 1}=phrase:${JSON.stringify(phrase)};methods:${methods};evidence:value_match;source:canonical_number_reader`);
  });
  appendBounded(lines, `coverage=signals:${integer(result.coverage?.signalCount) ?? 0};checked_inputs:${integer(result.coverage?.checkedCount) ?? 0}`);
  appendBounded(lines, "interpretation_rules=separate_fact_from_interpretation;show_unknowns;offer_alternatives;no_prophecy;no_causal_claim");

  const facts = lines.join("\n");
  return Object.freeze({
    ok: true,
    submission: Object.freeze({
      contract: LIFE_JOURNEY_HINT_EXPLANATION_CONTRACT,
      question: QUESTION,
      facts,
      intelligenceLevel: "fast",
      view: Object.freeze({
        surface: "journey",
        readingFocus: Object.freeze({
          label: "פענוח רמז פרטי",
          primary: "חבילת ראיות מוגבלת",
          sourceLabel: "בדיקת מסע החיים",
          reference: LIFE_JOURNEY_HINT_EXPLANATION_CONTRACT,
        }),
        sources: Object.freeze(["מקור המספר הקנוני", "בדיקת מרווחי זמן"]),
      }),
    }),
  });
}

export async function requestLifeJourneyHintEvidenceExplanation({ submission, submit, openRaziel, locked = false } = {}) {
  if (submission?.contract !== LIFE_JOURNEY_HINT_EXPLANATION_CONTRACT) return Object.freeze({ ok: false, error: "invalid_explanation_package" });
  if (locked) return Object.freeze({ ok: false, error: "raziel_locked" });
  if (typeof submit !== "function" || typeof openRaziel !== "function") return Object.freeze({ ok: false, error: "raziel_unavailable" });
  openRaziel({ readingFocus: submission.view?.readingFocus || null });
  try {
    return await submit(submission);
  } catch {
    return Object.freeze({ ok: false, error: "transport_failed" });
  }
}

export function lifeJourneyHintExplanationErrorMessage(error) {
  const code = clean(error?.error || error?.message || error, 80);
  if (code === "checked_evidence_required") return "יש לבצע קודם את בדיקת התאריך והמספר.";
  if (code === "unsafe_evidence_boundary" || code === "invalid_explanation_package") return "חבילת הראיות אינה מאושרת לפענוח.";
  if (code === "raziel_locked") return "רזיאל נעול כרגע בסביבה הזאת.";
  if (code === "turn_pending") return "רזיאל כבר בודק שאלה אחרת. אפשר לנסות שוב כשהתשובה תושלם.";
  if (code === "raziel_unavailable" || code === "transport_failed" || code === "unavailable") return "רזיאל אינו זמין כרגע. הרמז והבדיקה לא השתנו.";
  return "לא ניתן לפתוח כרגע את הפענוח ברזיאל.";
}
