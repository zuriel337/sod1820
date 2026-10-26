import { buildLifeJourneySeferYetzirahMap } from "./lifeJourneySeferYetzirahMap.js";
import { buildLifeJourneyBirthMap } from "./lifeJourneyBirthMap.js";
import { buildLifeJourneyTimeMap } from "./lifeJourneyTimeMap.js";
import { buildLifeJourneySynthesisPack } from "./lifeJourneySynthesisPack.js";

export const LIFE_JOURNEY_MAPS_VERSION = "life-journey-maps-v7";

const clean = value => value == null ? "" : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const integer = value => (typeof value === "number" || (typeof value === "string" && value.trim()))
  && Number.isSafeInteger(Number(value)) ? Number(value) : null;
const pairKey = (left, right) => [clean(left), clean(right)].sort().join("|");

function evidenceBand(independentGroupCount, expressionConnectionCount) {
  if ((independentGroupCount ?? 0) >= 3) return "three_plus_groups";
  if (independentGroupCount === 2) return "two_groups";
  if (independentGroupCount === 1) return "one_group";
  if ((expressionConnectionCount ?? 0) > 0) return "engine_connection";
  return "not_found";
}

function uniqueValues(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = `${clean(row?.label)}:${integer(row?.value)}`;
    if (!clean(row?.label) || integer(row?.value) == null || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Read-only projection over the private Ledger + existing family Research Context.
 * It creates no graph, event store, engine, search, or persistence path.
 */
export function buildLifeJourneyMaps({
  members = [],
  relations = [],
  selectedRefs = [],
  research = null,
  analysis = null,
  birthReflections = null,
  context = null,
  birthTimeline = [],
} = {}) {
  const selected = new Set(list(selectedRefs).map(clean).filter(Boolean));
  const selectedMembers = list(members).filter(member => selected.has(clean(member?.source_ref)));
  const names = new Map(selectedMembers.map(member => [clean(member?.source_ref), clean(member?.name) || "אדם ללא שם"]));
  const rows = list(research?.rows).filter(row => selected.has(clean(row?.memberRef)));
  const methodFindings = list(research?.methodFindings);

  const matrix = rows.map(row => {
    const memberRef = clean(row?.memberRef);
    const methods = uniqueValues([
      ...list(row?.data?.methodFindings).map(finding => ({ label: finding?.methodLabel, value: finding?.value })),
      ...methodFindings.filter(finding => clean(finding?.memberRef) === memberRef)
        .map(finding => ({ label: finding?.methodLabel, value: finding?.value })),
    ]).slice(0, 12);
    return Object.freeze({
      memberRef,
      name: clean(row?.name) || names.get(memberRef) || "אדם ללא שם",
      state: row?.state === "ready" ? "ready" : "error",
      nameValue: integer(row?.data?.fullValue),
      hebrewDate: clean(row?.data?.hebrewDate),
      methods: Object.freeze(methods),
      crossValues: Object.freeze([...new Set(list(row?.data?.crossValues).map(integer).filter(value => value != null))]),
    });
  });

  const generationLinks = list(relations).flatMap(relation => {
    const parentRef = clean(relation?.parent_ref);
    const childRef = clean(relation?.child_ref);
    if (!selected.has(parentRef) || !selected.has(childRef)) return [];
    return [Object.freeze({
      id: clean(relation?.source_ref) || `${parentRef}:${childRef}`,
      parentRef,
      parentName: names.get(parentRef) || "אדם ללא שם",
      childRef,
      childName: names.get(childRef) || "אדם ללא שם",
    })];
  });
  const linkedRefs = new Set(generationLinks.flatMap(link => [link.parentRef, link.childRef]));
  const unlinkedPeople = selectedMembers
    .filter(member => !linkedRefs.has(clean(member?.source_ref)))
    .map(member => Object.freeze({ memberRef: clean(member?.source_ref), name: clean(member?.name) || "אדם ללא שם" }));

  const convergences = list(research?.sharedValues).map(item => {
    const value = integer(item?.value);
    const participantRefs = new Set();
    for (const finding of methodFindings) {
      if (integer(finding?.value) === value && selected.has(clean(finding?.memberRef))) participantRefs.add(clean(finding?.memberRef));
    }
    for (const row of rows) {
      const rowValues = [
        ...list(row?.data?.methodFindings).map(finding => integer(finding?.value)),
        ...list(row?.data?.crossValues).map(integer),
      ];
      if (rowValues.includes(value)) participantRefs.add(clean(row?.memberRef));
    }
    return Object.freeze({
      value,
      participantRefs: Object.freeze([...participantRefs]),
      participantNames: Object.freeze([...participantRefs].map(ref => names.get(ref)).filter(Boolean)),
      personCount: integer(item?.count) ?? participantRefs.size,
      expressionCount: integer(item?.distinctExpressionCount) ?? 0,
      methodGroupCount: integer(item?.methodGroupCount) ?? 0,
      classification: clean(item?.classification),
    });
  }).filter(item => item.value != null);

  const generationByPair = new Map(generationLinks.map(link => [pairKey(link.parentRef, link.childRef), link]));
  const connectionByPair = new Map();
  for (const connection of list(research?.connections)) {
    const leftRef = clean(connection?.left?.memberRef);
    const rightRef = clean(connection?.right?.memberRef);
    if (!leftRef || !rightRef || leftRef === rightRef || !selected.has(leftRef) || !selected.has(rightRef)) continue;
    connectionByPair.set(pairKey(leftRef, rightRef), connection);
  }
  const relationships = [];
  for (let leftIndex = 0; leftIndex < selectedMembers.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < selectedMembers.length; rightIndex += 1) {
      const leftRef = clean(selectedMembers[leftIndex]?.source_ref);
      const rightRef = clean(selectedMembers[rightIndex]?.source_ref);
      const key = pairKey(leftRef, rightRef);
      const generation = generationByPair.get(key) || null;
      const connection = connectionByPair.get(key) || null;
      const independentGroupCount = integer(connection?.independentGroupCount);
      const expressionConnectionCount = integer(connection?.expressionConnectionCount) ?? (connection ? 1 : 0);
      relationships.push(Object.freeze({
        id: `life-map-pair:${key}`,
        leftRef,
        leftName: names.get(leftRef) || "אדם ללא שם",
        rightRef,
        rightName: names.get(rightRef) || "אדם ללא שם",
        generation: generation ? Object.freeze({
          parentRef: generation.parentRef,
          parentName: generation.parentName,
          childRef: generation.childRef,
          childName: generation.childName,
        }) : null,
        hasResearchConnection: Boolean(connection),
        independentGroupCount,
        expressionConnectionCount,
        engineSignal: integer(connection?.engineSignal),
        leftExpressionLabel: clean(connection?.left?.expressionLabel),
        rightExpressionLabel: clean(connection?.right?.expressionLabel),
        evidenceBand: evidenceBand(independentGroupCount, expressionConnectionCount),
      }));
    }
  }

  const evidenceSignals = relationships.filter(row => row.hasResearchConnection);
  const evidenceGaps = relationships.filter(row => !row.hasResearchConnection);

  const memberSources = list(research?.sourceResearch?.memberSources).flatMap(source => {
    const memberRef = clean(source?.memberRef);
    if (!selected.has(memberRef)) return [];
    return [Object.freeze({
      memberRef,
      name: names.get(memberRef) || "אדם ללא שם",
      verses: Object.freeze(list(source?.verses).map(verse => Object.freeze({
        id: clean(verse?.id),
        ref: clean(verse?.verseDisplayRef || verse?.ref),
        verseIdentity: clean(verse?.verseIdentity),
      })).filter(verse => verse.ref)),
      trackCount: integer(source?.tracksWithResults) ?? 0,
    })];
  });
  const numberSources = list(research?.sourceResearch?.numberSources).map(source => Object.freeze({
    value: integer(source?.value),
    phrases: Object.freeze(list(source?.phrases).map(item => clean(item?.phrase)).filter(Boolean).slice(0, 6)),
  })).filter(source => source.value != null && source.phrases.length);

  const researchReady = research?.state === "ready";
  const datedRefs = new Set(list(birthTimeline).map(event => clean(event?.memberRef)).filter(Boolean));
  const timelineMissing = selectedMembers
    .filter(member => !datedRefs.has(clean(member?.source_ref)))
    .map(member => clean(member?.name) || "אדם ללא שם");
  const sourceByMember = new Map(memberSources.map(source => [source.memberRef, source]));
  const coverage = selectedMembers.map(member => {
    const memberRef = clean(member?.source_ref);
    const matrixRow = matrix.find(row => row.memberRef === memberRef) || null;
    const source = sourceByMember.get(memberRef) || null;
    return Object.freeze({
      memberRef,
      name: names.get(memberRef) || "אדם ללא שם",
      hasBirthdate: datedRefs.has(memberRef),
      researchReady: matrixRow?.state === "ready",
      methodCount: matrixRow?.methods?.length || 0,
      convergenceCount: convergences.filter(item => item.participantRefs.includes(memberRef)).length,
      verseCount: source?.verses?.length || 0,
      sourceTrackCount: source?.trackCount || 0,
      relationshipCount: relationships.filter(item => item.leftRef === memberRef || item.rightRef === memberRef).length,
      researchedRelationshipCount: relationships.filter(item => item.hasResearchConnection
        && (item.leftRef === memberRef || item.rightRef === memberRef)).length,
    });
  });
  const analysisData = analysis?.state === "ready" && analysis?.data ? analysis.data : null;
  const synthesisPack = buildLifeJourneySynthesisPack({
    research,
    analysis,
    birthReflections,
    selectedRefs,
  });
  const combinedSummary = Object.freeze({
    state: analysis?.state === "loading" ? "loading" : analysisData ? "ready" : researchReady ? "research_ready" : "waiting",
    message: clean(analysisData?.message) || clean(research?.message),
    claims: Object.freeze(list(analysisData?.claims).map(claim => clean(claim?.text)).filter(Boolean).slice(0, 12)),
    connectionCount: integer(analysisData?.coverage?.connectionCount) ?? list(research?.connections).length,
    searchedPairCount: integer(analysisData?.coverage?.searchedPairCount) ?? integer(research?.coverage?.searchedPairCount) ?? 0,
    verseCount: integer(analysisData?.coverage?.verseCount) ?? integer(research?.sourceResearch?.coverage?.verseCount) ?? 0,
    normalized: Boolean(analysisData),
    error: analysis?.state === "error" ? clean(analysis?.error) : "",
    synthesisPack,
  });
  const creation = buildLifeJourneySeferYetzirahMap({ members, relations, selectedRefs, birthTimeline });
  const pathSteps = [
    { id: "identity", label: "זהות", tab: "overview", state: selectedMembers.length ? "ready" : "waiting" },
    { id: "time", label: "זמן", tab: "time", state: birthTimeline.length ? "ready" : "waiting" },
    { id: "letters", label: "אותיות", tab: "creation", state: creation.people.some(person => person.sequence.length) ? "ready" : "waiting" },
    { id: "family", label: "משפחה", tab: "generations", state: selectedMembers.length >= 2 ? "ready" : "available" },
    { id: "research", label: "חיבורים", tab: "matrix", state: researchReady ? "ready" : "available" },
    { id: "convergence", label: "התכנסויות", tab: "convergences", state: convergences.length ? "ready" : researchReady ? "empty" : "waiting" },
    { id: "sources", label: "מקורות", tab: "sources", state: memberSources.length || numberSources.length ? "ready" : researchReady ? "empty" : "waiting" },
    { id: "summary", label: "סיכום", tab: "summary", state: combinedSummary.message ? "ready" : researchReady ? "available" : "waiting" },
  ].map(step => Object.freeze(step));
  const completedPathSteps = pathSteps.filter(step => step.state === "ready" || step.state === "empty");
  const nextPathStep = pathSteps.find(step => step.state !== "ready" && step.state !== "empty") || null;
  const reflections = birthReflections instanceof Map ? birthReflections : new Map(Object.entries(birthReflections || {}));
  // Private view projection only. Never serialize this into the anonymized synthesis pack.
  const picturePeople = selectedMembers.map(member => {
    const memberRef = clean(member.source_ref);
    const event = list(birthTimeline).find(row => row.memberRef === memberRef);
    const row = matrix.find(item => item.memberRef === memberRef);
    const result = reflections.get(memberRef);
    const personCoverage = coverage.find(item => item.memberRef === memberRef);
    return Object.freeze({
      memberRef,
      name: names.get(memberRef),
      dateDisplay: clean(event?.dateDisplay),
      hebrewDate: clean(event?.hebrewDate),
      researchState: row?.state || "waiting",
      nameValue: row?.nameValue ?? null,
      methodCount: row?.methods.length || 0,
      verseCount: personCoverage?.verseCount || 0,
      sourceReady: sourceByMember.has(memberRef),
      human: result?.humanDesign ? Object.freeze({
        type: clean(result.humanDesign.typeLabel) || clean(result.humanDesign.type),
        profile: clean(result.humanDesign.profileLabel) || clean(result.humanDesign.profile),
        authority: clean(result.humanDesign.authorityLabel) || clean(result.humanDesign.authority),
      }) : null,
      sky: result?.sky ? Object.freeze({
        sun: clean(result.sky.bodies?.find(body => body.key === "sun")?.signLabel),
        ascendant: clean(result.sky.angles?.ascendant?.signLabel),
        bodyCount: list(result.sky.bodies).length,
      }) : null,
    });
  });
  return Object.freeze({
    version: LIFE_JOURNEY_MAPS_VERSION,
    picture: Object.freeze({ people: Object.freeze(picturePeople), researchReady, connectionCount: combinedSummary.connectionCount, convergenceCount: convergences.length }),
    overview: Object.freeze({
      selectedPeople: selectedMembers.length,
      datedPeople: list(birthTimeline).length,
      matrixPeople: matrix.filter(row => row.state === "ready").length,
      convergenceCount: convergences.length,
      sourceCount: memberSources.reduce((sum, row) => sum + row.verses.length, 0) + numberSources.length,
      connectionCount: list(research?.connections).length,
      relationshipPairCount: relationships.length,
      evidenceGapCount: evidenceGaps.length,
      researchReady,
    }),
    matrix: Object.freeze(matrix),
    generations: Object.freeze({ links: Object.freeze(generationLinks), unlinkedPeople: Object.freeze(unlinkedPeople) }),
    convergences: Object.freeze(convergences),
    relationships: Object.freeze(relationships),
    evidence: Object.freeze({ signals: Object.freeze(evidenceSignals), gaps: Object.freeze(evidenceGaps) }),
    coverage: Object.freeze(coverage),
    summary: combinedSummary,
    synthesisPack,
    timeline: Object.freeze(list(birthTimeline)),
    timelineMissing: Object.freeze(timelineMissing),
    timeMap: buildLifeJourneyTimeMap({ birthTimeline, methodFindings, researchReady }),
    sources: Object.freeze({ members: Object.freeze(memberSources), numbers: Object.freeze(numberSources) }),
    creation,
    birthMap: buildLifeJourneyBirthMap({
      members,
      selectedRefs,
      birthTimeline,
      creation,
      familyLinks: generationLinks,
      researchLinks: relationships,
      convergenceRows: convergences,
    }),
    path: Object.freeze({
      steps: Object.freeze(pathSteps),
      completedCount: completedPathSteps.length,
      progressPercent: Math.round((completedPathSteps.length / pathSteps.length) * 100),
      nextStep: nextPathStep,
      saved: Boolean(context?.journey?.id),
      position: integer(context?.journey?.position),
    }),
    boundaries: Object.freeze({ read_only_projection: true, no_els: true, no_new_store: true, no_graph_write: true }),
  });
}

export default buildLifeJourneyMaps;
