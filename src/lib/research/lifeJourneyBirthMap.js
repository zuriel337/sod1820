export const LIFE_JOURNEY_BIRTH_MAP_VERSION = "life-journey-birth-map-v2";

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
export function buildLifeJourneyBirthMap({
  members = [],
  selectedRefs = [],
  birthTimeline = [],
  creation = null,
  familyLinks = [],
  researchLinks = [],
  convergenceRows = [],
} = {}) {
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
  const indexByRef = new Map(people.map((person, index) => [person.memberRef, index]));
  const toEdge = (row, leftKey, rightKey, kind) => {
    const from = indexByRef.get(clean(row?.[leftKey]));
    const to = indexByRef.get(clean(row?.[rightKey]));
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from === to) return null;
    return Object.freeze({ from, to, kind, strength: Math.max(1, Number(row?.independentGroupCount) || 1) });
  };
  const spatialNodes = people.map((person, index) => Object.freeze({
    index,
    readinessScore: Number(person.readiness.hasDate) + Number(person.readiness.hasExactTime) + Number(person.readiness.hasPlace),
  }));
  const familyEdges = list(familyLinks).map(row => toEdge(row, "parentRef", "childRef", "family")).filter(Boolean);
  const researchEdges = list(researchLinks).filter(row => row?.hasResearchConnection)
    .map(row => toEdge(row, "leftRef", "rightRef", "research")).filter(Boolean);
  const convergencePoints = list(convergenceRows).flatMap(row => {
    const participantIndices = list(row?.participantRefs).map(ref => indexByRef.get(clean(ref))).filter(Number.isSafeInteger);
    const value = Number(row?.value);
    if (!Number.isSafeInteger(value) || participantIndices.length < 2) return [];
    return [Object.freeze({
      value,
      participantIndices: Object.freeze(participantIndices),
      methodGroupCount: Math.max(0, Number(row?.methodGroupCount) || 0),
    })];
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
    spatialModel: Object.freeze({
      nodes: Object.freeze(spatialNodes),
      familyEdges: Object.freeze(familyEdges),
      researchEdges: Object.freeze(researchEdges),
      convergencePoints: Object.freeze(convergencePoints),
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
      webgl_identity_free: true,
    }),
  });
}

export default buildLifeJourneyBirthMap;
