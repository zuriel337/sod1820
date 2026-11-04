import { projectLifeJourneyHintReferences } from "./lifeJourneyHintProjection.js";

export const LIFE_JOURNEY_SYNTHESIS_PACK_VERSION = "life-journey-synthesis-pack-v2";

const clean = value => value == null ? "" : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const integer = value => (typeof value === "number" || (typeof value === "string" && value.trim()))
  && Number.isSafeInteger(Number(value)) ? Number(value) : null;

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)));
}

function reflectionEntries(birthReflections, selectedRefs) {
  const reflections = birthReflections instanceof Map
    ? birthReflections
    : new Map(Object.entries(birthReflections && typeof birthReflections === "object" ? birthReflections : {}));
  const selected = list(selectedRefs).map(clean).filter(Boolean);
  return selected.flatMap((memberRef, index) => {
    const result = reflections.get(memberRef);
    if (!result || typeof result !== "object" || Array.isArray(result)) return [];
    const human = result.humanDesign && typeof result.humanDesign === "object" ? result.humanDesign : null;
    const sky = result.sky && typeof result.sky === "object" ? result.sky : null;
    if (!human && !sky) return [];
    return [{
      participant: `participant-${index + 1}`,
      engine: clean(result?.trace?.engine) || null,
      engineVersion: clean(result?.trace?.engineVersion) || null,
      humanDesign: human ? Object.freeze({
        state: "observed_auxiliary",
        type: clean(human.type) || null,
        authority: clean(human.authority) || null,
        profile: clean(human.profile) || null,
        definition: clean(human.definition) || null,
        definedCenterCount: list(human.definedCenters).length,
        definedChannelCount: list(human.definedChannels).length,
        activatedGateCount: list(human.activatedGates).length,
        evidenceWeight: 0,
      }) : null,
      sky: sky ? Object.freeze({
        state: "observed_auxiliary",
        coordinateFrame: "tropical_geocentric",
        bodyCount: list(sky.bodies).length,
        aspectCount: list(sky.aspects).length,
        ascendantSign: clean(sky?.angles?.ascendant?.sign) || null,
        midheavenSign: clean(sky?.angles?.midheaven?.sign) || null,
        evidenceWeight: 0,
      }) : null,
    }];
  });
}

/**
 * One private, in-memory composition envelope for the Life Journey projection.
 * Canonical engine/source results are the only synthesis evidence. Birth lenses and
 * the post-freeze Tarot check remain auxiliary observations with zero evidence weight.
 * The projection deliberately emits no name, person-ref, date, time, place or coordinates.
 */
export function buildLifeJourneySynthesisPack({
  research = null,
  analysis = null,
  birthReflections = null,
  selectedRefs = [],
  interpreterFacts = null,
  hintState = null,
  includeProgramBranches = true,
} = {}) {
  const researchReady = research?.state === "ready";
  const analysisData = analysis?.state === "ready" && analysis?.data ? analysis.data : null;
  const birthRows = reflectionEntries(birthReflections, selectedRefs);
  const humanCount = birthRows.filter(row => row.humanDesign).length;
  const skyCount = birthRows.filter(row => row.sky).length;
  const hints = projectLifeJourneyHintReferences(hintState);
  const verseCount = integer(research?.sourceResearch?.coverage?.verseCount) ?? 0;
  const equalPhraseCount = integer(research?.sourceResearch?.coverage?.equalPhraseCount) ?? 0;
  const methodValueCount = integer(research?.coverage?.methodValueCount)
    ?? list(research?.methodFindings).length;
  const relationCount = integer(research?.coverage?.relationCount)
    ?? list(research?.relationRows).length;
  const connectionCount = integer(research?.coverage?.connectionCount)
    ?? list(research?.connections).length;
  const sharedValueCount = list(research?.sharedValues).length;
  const normalizedGroupCount = list(research?.connections).reduce((sum, row) => (
    sum + Math.max(0, integer(row?.independentGroupCount) ?? 0)
  ), 0);

  const layers = [
    { id: "gematria", label: "גימטריה מנורמלת", state: methodValueCount ? "ready" : researchReady ? "empty" : "waiting", evidenceWeight: 1 },
    { id: "date", label: "שם ותאריך", state: integer(research?.coverage?.expressionCount) ? "ready" : researchReady ? "empty" : "waiting", evidenceWeight: 1 },
    { id: "family", label: "התכנסות משפחתית", state: connectionCount || sharedValueCount ? "ready" : researchReady ? "empty" : "waiting", evidenceWeight: 1 },
    { id: "sources", label: "מקורות", state: verseCount || equalPhraseCount ? "ready" : researchReady ? "empty" : "waiting", evidenceWeight: 1 },
    ...(includeProgramBranches ? [
      { id: "els", label: "ELS", state: "not_connected", evidenceWeight: 1 },
      { id: "hints", label: "רמזים ואירועי חיים", state: hints.state, evidenceWeight: 0 },
    ] : []),
    { id: "human_design", label: "Human Design", state: humanCount ? "auxiliary" : "waiting", evidenceWeight: 0 },
    { id: "sky", label: "מפת שמיים", state: skyCount ? "auxiliary" : "waiting", evidenceWeight: 0 },
    { id: "tarot", label: "בדיקת השתקפות פנימית", state: analysisData ? "internal" : "waiting", evidenceWeight: 0 },
  ];

  return Object.freeze({
    version: LIFE_JOURNEY_SYNTHESIS_PACK_VERSION,
    state: analysisData ? "synthesized" : researchReady ? "evidence_ready" : "waiting",
    evidence: Object.freeze({
      methodValueCount,
      relationCount,
      connectionCount,
      sharedValueCount,
      normalizedIndependentGroupCount: normalizedGroupCount,
      verseCount,
      equalPhraseCount,
      negativeOrEmpty: Object.freeze({
        noNormalizedConnection: researchReady && connectionCount === 0,
        noCanonicalSource: researchReady && verseCount === 0 && equalPhraseCount === 0,
      }),
    }),
    // Coverage is not execution or evidence. No term, hint ID/narrative or event
    // date enters this anonymized pack or the current family interpreter facts.
    els: Object.freeze({
      state: "not_connected", central: true, runnable: false,
      planContract: "els_automatic_research_plan_v1",
      canonicalOccurrenceRequired: true,
      includedAsEvidence: false,
    }),
    observations: Object.freeze({
      hints: Object.freeze({ ...hints.coverage, state: hints.state, analysisState: "not_connected", evidenceWeight: 0 }),
    }),
    auxiliary: Object.freeze({
      birthLenses: freezeRows(birthRows),
      humanDesignCount: humanCount,
      skyCount,
      tarot: Object.freeze({
        state: analysisData ? "internal_post_freeze" : "not_run",
        exposed: false,
        evidenceWeight: 0,
        canModifyMessage: false,
      }),
    }),
    synthesis: Object.freeze({
      state: analysisData ? "frozen" : "not_frozen",
      messageAvailable: Boolean(clean(analysisData?.message)),
      claimCount: list(analysisData?.claims).length,
      evidenceOnly: true,
      auxiliaryCanModifyMessage: false,
    }),
    interpreter: Object.freeze({
      facts: clean(interpreterFacts) || null,
      privateIdentityIncluded: false,
      birthLensDetailsIncluded: false,
      auxiliaryIncludedAsEvidence: false,
      hintNarrativesIncluded: false,
    }),
    coverage: Object.freeze({
      layers: freezeRows(layers),
      readyEvidenceLayerCount: layers.filter(layer => layer.evidenceWeight > 0 && layer.state === "ready").length,
      auxiliaryLayerCount: layers.filter(layer => layer.evidenceWeight === 0 && ["auxiliary", "internal"].includes(layer.state)).length,
    }),
    boundaries: Object.freeze({
      private_memory_only: true,
      no_name: true,
      no_person_ref: true,
      no_birth_date_or_time: true,
      no_place_or_coordinates: true,
      no_url_or_telemetry: true,
      no_new_store: true,
      no_graph_write: true,
      no_els_execution: true,
      no_hint_investigation: true,
      auxiliary_zero_evidence_weight: true,
      cards_internal_only: true,
      message_from_verified_evidence_only: true,
    }),
  });
}

export default buildLifeJourneySynthesisPack;
