export const LIFE_JOURNEY_BIRTH_MAP_VERSION = "life-journey-birth-map-v1";

const clean = value => value == null ? "" : String(value).trim();
const list = value => Array.isArray(value) ? value : [];

function pendingState(anchor) {
  if (!anchor.dateIso) return "needs_date";
  if (!anchor.birthTime) return "needs_time";
  if (!anchor.birthPlace) return "needs_place";
  return "adapter_required";
}

/**
 * Read-only readiness projection for future astronomical and Human Design adapters.
 * No chart values are calculated here: absence is represented explicitly instead
 * of converting private birth details into an unverified personality claim.
 */
export function buildLifeJourneyBirthMap({ members = [], selectedRefs = [], birthTimeline = [], creation = null } = {}) {
  const selected = new Set(list(selectedRefs).map(clean).filter(Boolean));
  const events = new Map(list(birthTimeline).map(event => [clean(event?.memberRef), event]));
  const people = list(members).filter(member => selected.has(clean(member?.source_ref))).map(member => {
    const memberRef = clean(member?.source_ref);
    const event = events.get(memberRef) || {};
    const anchor = {
      memberRef,
      name: clean(member?.name) || "אדם ללא שם",
      dateIso: clean(event?.dateIso),
      hebrewDate: clean(event?.hebrewDate),
      birthTime: clean(event?.birthTime),
      birthPlace: clean(event?.birthPlace),
    };
    const state = pendingState(anchor);
    return Object.freeze({
      ...anchor,
      readiness: Object.freeze({
        hasDate: Boolean(anchor.dateIso),
        hasExactTime: Boolean(anchor.birthTime),
        hasPlace: Boolean(anchor.birthPlace),
        inputReady: state === "adapter_required",
      }),
      sky: Object.freeze({ state, output: null }),
      humanDesign: Object.freeze({ state, output: null }),
      seferYetzirah: Object.freeze({ state: creation?.people?.some(person => person.memberRef === memberRef) ? "source_ready" : "needs_name" }),
    });
  });

  return Object.freeze({
    version: LIFE_JOURNEY_BIRTH_MAP_VERSION,
    people: Object.freeze(people),
    readyInputCount: people.filter(person => person.readiness.inputReady).length,
    letterCounts: Object.freeze({
      mothers: creation?.letterGroups?.find(group => group.id === "mothers")?.letters?.length || 3,
      doubles: creation?.letterGroups?.find(group => group.id === "doubles")?.letters?.length || 7,
      simples: creation?.letterGroups?.find(group => group.id === "simples")?.letters?.length || 12,
    }),
    adapters: Object.freeze({
      sky: Object.freeze({ state: "not_connected", output: null }),
      humanDesign: Object.freeze({ state: "not_connected", output: null }),
      seferYetzirah: Object.freeze({ state: "source_ready", sourceCount: list(creation?.sources).length }),
    }),
    boundaries: Object.freeze({
      read_only_projection: true,
      no_external_birth_api: true,
      no_fabricated_traits: true,
      no_ephemeris_claim: true,
      no_new_store: true,
      no_telemetry_payload: true,
    }),
  });
}

export default buildLifeJourneyBirthMap;
