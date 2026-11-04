import { projectLifeJourneyHintDate } from "./lifeJourneyHintProjection.js";

export const LIFE_JOURNEY_HINT_CAPTURE_CONTRACT = "life_journey_private_hint_capture_v1";
export const LIFE_JOURNEY_HINT_CAPTURE_MAX_NOTE = 2000;
export const LIFE_JOURNEY_HINT_CAPTURE_MAX_QUESTION = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(["idea", "dream", "sync", "plate", "link", "event"]);
const clean = value => value == null ? "" : String(value).trim();
const bounded = (value, max) => clean(value).slice(0, max);

function sourceUrl(value) {
  const raw = clean(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function prepareLifeJourneyHintCapture(input = {}, {
  personRef = "",
  authorizedMemberRefs = [],
} = {}) {
  const rootRef = clean(personRef);
  const observation = bounded(input.observation, LIFE_JOURNEY_HINT_CAPTURE_MAX_NOTE);
  const question = bounded(input.question, LIFE_JOURNEY_HINT_CAPTURE_MAX_QUESTION);
  const selectedRef = clean(input.memberRef);
  const allowed = new Set((Array.isArray(authorizedMemberRefs) ? authorizedMemberRefs : []).map(clean).filter(Boolean));
  const captureRef = clean(input.captureRef);
  const occurredAt = clean(input.occurredAt);
  const rawNumber = clean(input.number);
  const number = rawNumber ? Number(rawNumber) : null;
  const rawSource = clean(input.sourceUrl);

  if (!rootRef) return Object.freeze({ ok: false, error: "missing_person" });
  if (!observation) return Object.freeze({ ok: false, error: "missing_observation" });
  if (!question) return Object.freeze({ ok: false, error: "missing_question" });
  if (!UUID.test(captureRef)) return Object.freeze({ ok: false, error: "invalid_capture_ref" });
  if (selectedRef && !allowed.has(selectedRef)) return Object.freeze({ ok: false, error: "unauthorized_member" });
  if (occurredAt && projectLifeJourneyHintDate(occurredAt).state !== "dated") {
    return Object.freeze({ ok: false, error: "invalid_event_date" });
  }
  if (rawNumber && (!Number.isSafeInteger(number) || number < 0)) {
    return Object.freeze({ ok: false, error: "invalid_number" });
  }
  const canonicalSource = sourceUrl(rawSource);
  if (rawSource && !canonicalSource) return Object.freeze({ ok: false, error: "invalid_source_url" });

  const title = bounded(input.title, 120) || (number != null ? `רמז · ${number}` : "תצפית פרטית");
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      capture_ref: captureRef,
      capture_contract: LIFE_JOURNEY_HINT_CAPTURE_CONTRACT,
      hint_type: ALLOWED_TYPES.has(input.hintType) ? input.hintType : "idea",
      title,
      note: observation,
      research_question: question,
      occurred_at: occurredAt || null,
      date_precision: occurredAt ? "day" : null,
      life_journey_member_ref: selectedRef || null,
      number,
      source_url: canonicalSource,
    }),
  });
}

export function isLifeJourneyHintCaptureReceipt(row, expected) {
  if (!row || !expected || !UUID.test(clean(row.id))) return false;
  return clean(row.capture_ref) === clean(expected.capture_ref)
    && clean(row.capture_contract) === LIFE_JOURNEY_HINT_CAPTURE_CONTRACT
    && clean(row.note) === clean(expected.note)
    && clean(row.research_question) === clean(expected.research_question)
    && clean(row.occurred_at) === clean(expected.occurred_at)
    && clean(row.life_journey_member_ref) === clean(expected.life_journey_member_ref);
}

export async function saveLifeJourneyHintCapture({
  user,
  input,
  personRef,
  authorizedMemberRefs,
  writeHint,
} = {}) {
  const prepared = prepareLifeJourneyHintCapture(input, { personRef, authorizedMemberRefs });
  if (!prepared.ok) return prepared;
  if (!user?.id || typeof writeHint !== "function") return Object.freeze({ ok: false, error: "writer_unavailable" });
  let row;
  try {
    row = await writeHint(user, prepared.value, { fallbackLocal: false });
  } catch {
    return Object.freeze({ ok: false, error: "write_failed" });
  }
  if (!isLifeJourneyHintCaptureReceipt(row, prepared.value)) {
    return Object.freeze({ ok: false, error: "invalid_write_receipt" });
  }
  return Object.freeze({ ok: true, row, capture: prepared.value });
}

export function lifeJourneyHintCaptureErrorMessage(error) {
  const code = clean(error?.error || error?.message || error);
  if (code === "missing_observation") return "כתבו מה ראיתם או חוויתם.";
  if (code === "missing_question") return "כתבו מה תרצו להבין מהרמז.";
  if (code === "unauthorized_member") return "האדם שנבחר אינו חלק מהמסע המורשה כרגע.";
  if (code === "invalid_event_date") return "תאריך האירוע אינו תקין.";
  if (code === "invalid_number") return "המספר צריך להיות מספר שלם ואינו יכול להיות שלילי.";
  if (code === "invalid_source_url") return "קישור המקור צריך להתחיל ב־http או https.";
  if (code === "invalid_write_receipt") return "השמירה לא אושרה במלואה ולכן הרמז לא נוסף למסך.";
  if (code === "writer_unavailable" || code === "hint_writer_unavailable") return "שמירה פרטית אינה זמינה כרגע בסביבה הזאת.";
  return "לא ניתן לשמור כרגע את הרמז הפרטי.";
}
