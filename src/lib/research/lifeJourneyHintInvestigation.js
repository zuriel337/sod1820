import { getNumberLookup } from "../supabase.js";
import { projectLifeJourneyHintDate } from "./lifeJourneyHintProjection.js";
import { projectLifeJourneyNumberSources } from "./lifeJourneyFamilySourceResearch.js";
import { exactLifeJourneyDaysBetween } from "./lifeJourneyTimeMap.js";

export const LIFE_JOURNEY_HINT_INVESTIGATION_CONTRACT = "life_journey_hint_bounded_checks_v1";
export const LIFE_JOURNEY_HINT_INVESTIGATION_MAX_DATE_COMPARISONS = 12;
export const LIFE_JOURNEY_HINT_INVESTIGATION_MAX_EXISTING_MATCHES = 12;

const clean = value => value == null ? "" : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const integer = value => (typeof value === "number" || (typeof value === "string" && value.trim()))
  && Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;

function dateDirection(eventIso, anchorIso) {
  if (eventIso === anchorIso) return "same_day";
  return eventIso > anchorIso ? "after_anchor" : "before_anchor";
}

function existingNumberMatches(research, number, selected, names) {
  if (research?.state !== "ready" || number == null) return [];
  const rows = [];
  const seen = new Set();
  const add = finding => {
    const memberRef = clean(finding?.memberRef);
    const value = integer(finding?.value);
    if (!selected.has(memberRef) || value !== number) return;
    const methodLabel = clean(finding?.methodLabel || finding?.methodKey) || "שיטה קנונית";
    const expressionLabel = clean(finding?.expressionLabel || finding?.expressionRole) || "ביטוי שנבדק קודם";
    const key = `${memberRef}:${methodLabel}:${expressionLabel}:${value}`;
    if (seen.has(key) || rows.length >= LIFE_JOURNEY_HINT_INVESTIGATION_MAX_EXISTING_MATCHES) return;
    seen.add(key);
    rows.push(Object.freeze({
      id: clean(finding?.id) || key,
      memberRef,
      memberName: names.get(memberRef) || "אדם במסע",
      methodLabel,
      expressionLabel,
      value,
      sourceRef: clean(finding?.sourceRef) || null,
      versionRef: clean(finding?.versionRef) || null,
    }));
  };
  list(research?.methodFindings).forEach(add);
  list(research?.rows).forEach(row => list(row?.data?.methodFindings).forEach(finding => add({ ...finding, memberRef: row?.memberRef })));
  return rows;
}

export function createLifeJourneyHintInvestigationReaders({ readNumber = getNumberLookup } = {}) {
  if (typeof readNumber !== "function") throw new TypeError("lifeJourneyHintInvestigation: existing number reader is required");
  return Object.freeze({ readNumber });
}

/**
 * Explicit read-only consumer over one already-owned hint. It never parses the
 * narrative, starts family/name research, persists a result, calls AI or calls ELS.
 */
export async function runLifeJourneyHintInvestigation({
  hint,
  members = [],
  selectedRefs = [],
  birthTimeline = [],
  research = null,
  readers = null,
} = {}) {
  const hintRef = clean(hint?.id);
  if (!hintRef || hintRef.length > 160) return Object.freeze({ ok: false, error: "invalid_hint_ref" });
  const memberRows = list(members).slice(0, LIFE_JOURNEY_HINT_INVESTIGATION_MAX_DATE_COMPARISONS);
  const authorized = new Set(memberRows.map(member => clean(member?.source_ref || member?.memberRef)).filter(Boolean));
  const associatedRef = clean(hint?.life_journey_member_ref);
  if (associatedRef && !authorized.has(associatedRef)) return Object.freeze({ ok: false, error: "unauthorized_member_ref" });
  const selected = new Set(list(selectedRefs).map(clean).filter(ref => authorized.has(ref)));
  const names = new Map(memberRows.map(member => [clean(member?.source_ref || member?.memberRef), clean(member?.name) || "אדם במסע"]));
  const date = projectLifeJourneyHintDate(hint?.occurred_at);
  const number = integer(hint?.number);

  if (date.state !== "dated" && number == null) {
    return Object.freeze({ ok: false, error: "no_confirmed_inputs" });
  }

  const dateComparisons = date.state === "dated" ? list(birthTimeline)
    .filter(anchor => selected.has(clean(anchor?.memberRef)) && authorized.has(clean(anchor?.memberRef)))
    .slice(0, LIFE_JOURNEY_HINT_INVESTIGATION_MAX_DATE_COMPARISONS)
    .flatMap(anchor => {
      const anchorIso = clean(anchor?.dateIso);
      const daysBetween = exactLifeJourneyDaysBetween(date.dateIso, anchorIso);
      if (!anchorIso || daysBetween == null) return [];
      return [Object.freeze({
        id: `${hintRef}:${clean(anchor?.memberRef)}:date`,
        memberRef: clean(anchor?.memberRef),
        memberName: names.get(clean(anchor?.memberRef)) || "אדם במסע",
        anchorDateIso: anchorIso,
        daysBetween,
        direction: dateDirection(date.dateIso, anchorIso),
        sameCivilDay: date.dateIso === anchorIso,
        sameMonthAndDay: date.dateIso.slice(5) === anchorIso.slice(5),
      })];
    }) : [];

  const existingMatches = existingNumberMatches(research, number, selected, names);
  let numberSource = null;
  let numberSourceState = number == null ? "not_requested" : "empty";
  if (number != null) {
    const activeReaders = readers?.readNumber ? readers : createLifeJourneyHintInvestigationReaders();
    try {
      numberSource = projectLifeJourneyNumberSources(number, await activeReaders.readNumber(number));
      numberSourceState = numberSource?.phrases?.length ? "results" : "empty";
    } catch {
      numberSourceState = "error";
    }
  }

  const signalCount = dateComparisons.length + existingMatches.length + (numberSource?.phrases?.length || 0);
  const checkedCount = Number(date.state === "dated") + Number(number != null);
  const status = numberSourceState === "error"
    ? dateComparisons.length || existingMatches.length ? "partial" : "error"
    : signalCount ? "results" : "empty";
  return Object.freeze({
    ok: true,
    result: Object.freeze({
      contract: LIFE_JOURNEY_HINT_INVESTIGATION_CONTRACT,
      hintRef,
      status,
      inputs: Object.freeze({
        confirmedDate: date.state === "dated" ? date.dateIso : null,
        number,
        associatedMemberRef: associatedRef || null,
        selectedMemberCount: selected.size,
      }),
      date: Object.freeze({
        state: date.state === "dated" ? "checked" : "not_requested",
        representation: date.state === "dated" ? date : null,
        comparisons: Object.freeze(dateComparisons),
      }),
      number: Object.freeze({
        state: number == null ? "not_requested" : "checked",
        value: number,
        existingMatches: Object.freeze(existingMatches),
        sourceState: numberSourceState,
        source: numberSource,
      }),
      coverage: Object.freeze({ checkedCount, signalCount, selectedMemberCount: selected.size }),
      boundaries: Object.freeze({
        explicit_request_only: true,
        structured_confirmed_inputs_only: true,
        no_raw_hint_text_sent: true,
        no_name_or_family_search: true,
        no_ai: true,
        no_els: true,
        no_write: true,
        no_new_store: true,
        equality_is_not_meaning: true,
        temporal_proximity_is_not_causation: true,
      }),
    }),
  });
}

export function lifeJourneyHintInvestigationErrorMessage(error) {
  const code = clean(error?.error || error?.message || error);
  if (code === "no_confirmed_inputs") return "כדי לבדוק את הרמז צריך תאריך אירוע מדויק או מספר מדויק שאושרו מראש.";
  if (code === "unauthorized_member_ref") return "השייכות האישית של הרמז אינה מורשית במסע הזה.";
  if (code === "invalid_hint_ref") return "הפניית הרמז אינה תקינה לבדיקה.";
  return "לא ניתן להשלים כרגע את הבדיקה המוגבלת.";
}
