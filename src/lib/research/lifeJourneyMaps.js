export const LIFE_JOURNEY_MAPS_VERSION = "life-journey-maps-v1";

const clean = value => value == null ? "" : String(value).trim();
const list = value => Array.isArray(value) ? value : [];
const integer = value => (typeof value === "number" || (typeof value === "string" && value.trim()))
  && Number.isSafeInteger(Number(value)) ? Number(value) : null;

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
      participantNames: Object.freeze([...participantRefs].map(ref => names.get(ref)).filter(Boolean)),
      personCount: integer(item?.count) ?? participantRefs.size,
      expressionCount: integer(item?.distinctExpressionCount) ?? 0,
      methodGroupCount: integer(item?.methodGroupCount) ?? 0,
      classification: clean(item?.classification),
    });
  }).filter(item => item.value != null);

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
  const pathSteps = [
    { id: "person", label: "זהות ומשפחה", state: selectedMembers.length ? "ready" : "waiting" },
    { id: "matrix", label: "שם ותאריך", state: researchReady ? "ready" : "waiting" },
    { id: "convergence", label: "התכנסויות", state: convergences.length ? "ready" : researchReady ? "empty" : "waiting" },
    { id: "sources", label: "מקורות ופסוקים", state: memberSources.length || numberSources.length ? "ready" : researchReady ? "empty" : "waiting" },
    { id: "finding", label: "ממצא ודף המספר", state: context?.journey ? "ready" : "available" },
  ].map(step => Object.freeze(step));

  return Object.freeze({
    version: LIFE_JOURNEY_MAPS_VERSION,
    overview: Object.freeze({
      selectedPeople: selectedMembers.length,
      datedPeople: list(birthTimeline).length,
      matrixPeople: matrix.filter(row => row.state === "ready").length,
      convergenceCount: convergences.length,
      sourceCount: memberSources.reduce((sum, row) => sum + row.verses.length, 0) + numberSources.length,
      connectionCount: list(research?.connections).length,
      researchReady,
    }),
    matrix: Object.freeze(matrix),
    generations: Object.freeze({ links: Object.freeze(generationLinks), unlinkedPeople: Object.freeze(unlinkedPeople) }),
    convergences: Object.freeze(convergences),
    timeline: Object.freeze(list(birthTimeline)),
    timelineMissing: Object.freeze(timelineMissing),
    sources: Object.freeze({ members: Object.freeze(memberSources), numbers: Object.freeze(numberSources) }),
    path: Object.freeze({
      steps: Object.freeze(pathSteps),
      saved: Boolean(context?.journey?.id),
      position: integer(context?.journey?.position),
    }),
    boundaries: Object.freeze({ read_only_projection: true, no_els: true, no_new_store: true, no_graph_write: true }),
  });
}

export default buildLifeJourneyMaps;
