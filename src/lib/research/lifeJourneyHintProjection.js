import { gregorianDateToHebrewRepresentation } from "../timeFlow.js";

export const LIFE_JOURNEY_HINT_PROJECTION_VERSION = "life-journey-hint-references-v1";
const clean = value => typeof value === "string" ? value.trim() : "";

// Civil-day representation only. An instant/partial date needs confirmation;
// submission time never substitutes for the time of the reported observation.
export function projectLifeJourneyHintDate(occurredAt) {
  const value = clean(occurredAt);
  if (!value) return Object.freeze({ state: "unknown" });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Object.freeze({ state: "needs_review" });
  const representation = gregorianDateToHebrewRepresentation(value);
  if (!representation) return Object.freeze({ state: "invalid" });
  return Object.freeze({
    state: "dated", precision: "day", source: "occurred_at",
    dateIso: representation.input_iso,
    hebrewDate: representation.hebrew.pretty,
    calendar: representation.source_calendar,
    transform: representation.transform,
  });
}

/** Private read projection of already-owned hints, not a hint/event store or Finding. */
export function projectLifeJourneyHintReferences(state = null) {
  const seen = new Set();
  const ready = state?.loading === false && !state.error;
  const rows = ready ? (Array.isArray(state.rows) ? state.rows : []).slice(0, 500).flatMap(hint => {
    const id = clean(hint?.id);
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [Object.freeze({
      id,
      date: projectLifeJourneyHintDate(hint.occurred_at),
      personRef: null, // No implicit attribution from a number/name/family selection.
      verification: "user_observation",
      analysisState: "not_connected",
    })];
  }) : [];
  return Object.freeze({
    version: LIFE_JOURNEY_HINT_PROJECTION_VERSION,
    state: state?.error ? "error" : !ready ? "loading" : rows.length ? "references" : "no_references",
    rows: Object.freeze(rows),
    coverage: Object.freeze({
      referenceCount: rows.length,
      datedCount: rows.filter(row => row.date.state === "dated").length,
      unknownDateCount: rows.filter(row => row.date.state === "unknown").length,
      dateReviewCount: rows.filter(row => ["invalid", "needs_review"].includes(row.date.state)).length,
      unassignedCount: rows.length,
    }),
    evidenceWeight: 0,
  });
}
