import { buildExactReturnPatch, normalizeResearchContext } from "./researchContext.js";
import { stableIdentityDigest } from "./researchRepresentations.js";
import { buildResearchPathStep } from "./researchPathRuntime.js";
import { LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION } from "./lifeJourneyFamilyResearchSnapshot.js";

export const LIFE_JOURNEY_2029_HREF = "/2029/journey";
export const LIFE_JOURNEY_PERSON_CONTEXT_CONTRACT = "life_journey_person_context_v1";

const VIEWS = new Set(["person", "name", "date", "finding"]);
const MAP_TABS = new Set(["summary", "overview", "matrix", "generations", "relationships", "convergences", "evidence", "timeline", "time", "creation", "sources", "coverage", "hints", "path"]);
const MAP_LENSES = new Set(["spatial", "human", "sky", "sefer"]);
const PATH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = value => String(value || "").trim();

export function lifeJourneyPrivateFindingRef(findingId) {
  const id = clean(findingId);
  return id ? `life-journey-finding:${stableIdentityDigest(id)}` : null;
}

function isLifeJourneyMemberRef(personRef, value) {
  const ref = clean(value);
  if (!ref || !personRef) return false;
  if (ref === personRef) return true;
  if (!personRef.endsWith(":self")) return false;
  return ref.startsWith(`${personRef.slice(0, -5)}:p:`);
}

export function lifeJourneySelectedMemberRefs(context, personRef) {
  const rootRef = clean(personRef);
  if (!rootRef) return [];
  const raw = context?.dimensions?.lifeJourneySelectedMemberRefs;
  if (!Array.isArray(raw)) return [rootRef];
  return [...new Set(raw.map(clean).filter(ref => isLifeJourneyMemberRef(rootRef, ref)))];
}

export function lifeJourneyMapPosition(context, personRef, availableRefs = null) {
  const dimensions = context?.dimensions || {};
  const selected = lifeJourneySelectedMemberRefs(context, personRef)
    .filter(ref => !Array.isArray(availableRefs) || availableRefs.includes(ref));
  return {
    tab: MAP_TABS.has(dimensions.lifeJourneyMapTab) ? dimensions.lifeJourneyMapTab : "summary",
    lens: MAP_LENSES.has(dimensions.lifeJourneyMapLens) ? dimensions.lifeJourneyMapLens : "spatial",
    memberRef: selected.includes(dimensions.lifeJourneyMapMemberRef) ? dimensions.lifeJourneyMapMemberRef : selected[0] || null,
  };
}

export function buildLifeJourneyMapPositionPatch(context, { personRef, tab, lens, memberRef } = {}) {
  const safe = normalizeResearchContext(context);
  if (lifeJourneyViewFromContext(safe, personRef) !== "person") return null;
  const current = lifeJourneyMapPosition(safe, personRef);
  const next = { ...current, ...(tab != null ? { tab } : {}), ...(lens != null ? { lens } : {}), ...(memberRef != null ? { memberRef } : {}) };
  if (!MAP_TABS.has(next.tab) || !MAP_LENSES.has(next.lens)
    || (next.memberRef && !lifeJourneySelectedMemberRefs(safe, personRef).includes(next.memberRef))) return null;
  return { dimensions: {
    lifeJourneyMapTab: next.tab,
    lifeJourneyMapLens: next.lens,
    lifeJourneyMapMemberRef: next.memberRef,
  } };
}

// Server authorization and destination reads remain mandatory; this only validates
// the receipt's identity/scope before the consumer announces a successful save.
export function isLifeJourneyPathReceipt(snapshot, personRef, expectedContext = null) {
  const context = normalizeResearchContext(snapshot?.representation?.context);
  const href = snapshot?.representation?.href;
  const view = lifeJourneyViewFromContext(context, personRef);
  return Boolean(snapshot?.ok && PATH_UUID.test(snapshot.path_id) && PATH_UUID.test(snapshot.revision_id)
    && Number.isSafeInteger(snapshot.revision_no) && snapshot.revision_no >= 1
    && (!snapshot.access_scope || snapshot.access_scope === "private")
    && context?.dimensions?.lifeJourneyPersonRef === personRef && view
    && context.subject?.href === href
    && (!context.dimensions.lifeJourneyMemberRef || isLifeJourneyMemberRef(personRef, context.dimensions.lifeJourneyMemberRef))
    && (!Array.isArray(context.dimensions.lifeJourneySelectedMemberRefs) || context.dimensions.lifeJourneySelectedMemberRefs.every(ref => isLifeJourneyMemberRef(personRef, ref)))
    && (href === LIFE_JOURNEY_2029_HREF || (view === "finding" && /^\/2029\/number\/\d+$/.test(href)))
    && (!expectedContext || JSON.stringify(lifeJourneyCheckpointState(context, personRef))
      === JSON.stringify(lifeJourneyCheckpointState(expectedContext, personRef))));
}

function lifeJourneyCheckpointState(context, personRef) {
  return {
    selectedRefs: lifeJourneySelectedMemberRefs(context, personRef),
    position: lifeJourneyMapPosition(context, personRef),
    findings: context?.dimensions?.[LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION] || null,
  };
}

export function canSaveLifeJourneyContext(context, personRef) {
  const safe = normalizeResearchContext(context);
  const root = safe?.journey?.root;
  return lifeJourneyViewFromContext(safe, personRef) === "person"
    && (!root || (root.type === "person" && root.id === personRef));
}

// A deliberate checkpoint can change the representation without changing the
// navigation-step identity. Queue one bounded step in the existing Path draft
// so the canonical saver does not return the previous, unchanged revision.
export function buildLifeJourneySaveCheckpointPatch(context, personRef) {
  const safe = normalizeResearchContext(context);
  if (!canSaveLifeJourneyContext(safe, personRef) || safe.journey?.kind !== "research_path"
    || safe.journey.pendingSteps?.length) return null;
  const step = buildResearchPathStep(safe, {
    href: LIFE_JOURNEY_2029_HREF, label: "מסע חיים פרטי",
    surface: "life_journey_2029", reason: "explicit_person_checkpoint",
  });
  if (!step) return null;
  step.step_index = (safe.journey.lastSavedStep?.step_index ?? -1) + 1;
  return { journey: { ...safe.journey, position: step.step_index, pendingSteps: [step] } };
}

function personDimensions(context, personRef) {
  const familySnapshot = context?.dimensions?.[LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION];
  const dimensions = Object.fromEntries(
    Object.entries(context?.dimensions || {}).filter(([key]) => !key.startsWith("lifeJourney")),
  );
  return {
    ...dimensions,
    lifeJourneyContract: LIFE_JOURNEY_PERSON_CONTEXT_CONTRACT,
    lifeJourneyView: "person",
    lifeJourneyPersonRef: personRef,
    lifeJourneySelectedMemberRefs: lifeJourneySelectedMemberRefs(context, personRef),
    lifeJourneyMapTab: lifeJourneyMapPosition(context, personRef).tab,
    lifeJourneyMapLens: lifeJourneyMapPosition(context, personRef).lens,
    lifeJourneyMapMemberRef: lifeJourneyMapPosition(context, personRef).memberRef,
    ...(typeof familySnapshot === "string" && familySnapshot
      ? { [LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION]: familySnapshot }
      : {}),
  };
}

function personSubject(personRef) {
  return {
    id: personRef,
    type: "person",
    label: "מסע חיים פרטי",
    href: LIFE_JOURNEY_2029_HREF,
  };
}

export function buildLifeJourneyPersonContext(personRef, current = null) {
  const ref = clean(personRef);
  if (!ref) return null;
  return normalizeResearchContext({
    subject: personSubject(ref),
    selection: { entityId: ref, entityType: "person" },
    lens: "person",
    dimensions: personDimensions(current, ref),
    journey: current?.journey || null,
    access: { tier: "authenticated", scope: "private" },
    returnTo: null,
  });
}

export function lifeJourneyViewFromContext(context, personRef) {
  const safe = normalizeResearchContext(context);
  const ref = clean(personRef);
  const view = clean(safe?.dimensions?.lifeJourneyView);
  if (!safe || !ref || !VIEWS.has(view) || safe.dimensions.lifeJourneyPersonRef !== ref) return null;
  if (view === "person") {
    return safe.subject?.type === "person" && safe.subject.id === ref ? view : null;
  }
  return safe.returnTo?.href === LIFE_JOURNEY_2029_HREF
    && safe.returnTo?.subject?.type === "person"
    && safe.returnTo.subject.id === ref
    ? view
    : null;
}

export function buildLifeJourneyCapabilityPatch(context, { personRef, memberRef, name, view } = {}) {
  const safe = normalizeResearchContext(context);
  const rootRef = clean(personRef);
  const selectedRef = clean(memberRef);
  const expression = clean(name);
  if (!safe || !rootRef || !selectedRef || !expression || !["name", "date"].includes(view)) return null;

  const origin = buildLifeJourneyPersonContext(rootRef, safe);
  if (!origin) return null;
  const subjectType = view;
  const label = view === "name" ? "מסע שם פרטי" : "תחנת שם ותאריך פרטית";

  return normalizeResearchContext({
    ...safe,
    subject: {
      id: `${selectedRef}:${subjectType}`,
      type: subjectType,
      label,
      href: LIFE_JOURNEY_2029_HREF,
    },
    selection: {
      entityId: selectedRef,
      entityType: "person",
      focusKind: view === "date" ? "identity_review" : "expression",
    },
    lens: subjectType,
    dimensions: {
      ...safe.dimensions,
      lifeJourneyContract: LIFE_JOURNEY_PERSON_CONTEXT_CONTRACT,
      lifeJourneyView: view,
      lifeJourneyPersonRef: rootRef,
      lifeJourneyMemberRef: selectedRef,
    },
    access: { tier: "authenticated", scope: "private" },
    returnTo: {
      href: LIFE_JOURNEY_2029_HREF,
      label: "חזרה למסע החיים",
      subject: origin.subject,
      selection: origin.selection,
      lens: origin.lens,
      dimensions: origin.dimensions,
      journey: origin.journey,
    },
  });
}

export function buildLifeJourneyFamilySelectionPatch(context, { personRef, memberRefs } = {}) {
  const safe = normalizeResearchContext(context);
  const rootRef = clean(personRef);
  if (!safe || !rootRef || !Array.isArray(memberRefs)
    || lifeJourneyViewFromContext(safe, rootRef) !== "person") return null;
  const selectedRefs = [...new Set(memberRefs
    .map(clean)
    .filter(ref => isLifeJourneyMemberRef(rootRef, ref)))];
  const currentRefs = lifeJourneySelectedMemberRefs(safe, rootRef);
  const selectionChanged = selectedRefs.length !== currentRefs.length
    || selectedRefs.some((ref, index) => ref !== currentRefs[index]);
  const dimensions = { ...safe.dimensions, lifeJourneySelectedMemberRefs: selectedRefs };
  if (!selectedRefs.includes(dimensions.lifeJourneyMapMemberRef)) dimensions.lifeJourneyMapMemberRef = selectedRefs[0] || null;
  if (selectionChanged) delete dimensions[LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION];
  return normalizeResearchContext({
    ...safe,
    dimensions,
  });
}

export function buildLifeJourneyVerifiedElsPatch(context, selection) {
  const safe = normalizeResearchContext(context);
  const exact = normalizeResearchContext({ selection })?.selection;
  if (!safe?.returnTo || exact?.entityType !== "els" || !exact.term || !exact.corpus
    || exact.skip == null || exact.dir == null || exact.start == null) return null;
  return normalizeResearchContext({
    ...safe,
    subject: {
      id: exact.occurrenceId || `${safe.dimensions?.lifeJourneyMemberRef || "person"}:els-occurrence`,
      type: "els",
      label: "מופע ELS מאומת",
      href: LIFE_JOURNEY_2029_HREF,
    },
    selection: {
      ...exact,
      expression: safe.selection?.expression,
      focusKind: safe.selection?.focusKind || "expression",
    },
    lens: "els",
    dimensions: {
      ...safe.dimensions,
      lifeJourneyView: "els",
      lifeJourneyElsVerified: true,
    },
  });
}

export function buildLifeJourneyHintReferencePatch(context, number) {
  const safe = normalizeResearchContext(context);
  const rootRef = clean(safe?.dimensions?.lifeJourneyPersonRef);
  if ((typeof number !== "number" && typeof number !== "string")
    || (typeof number === "string" && !number.trim())) return null;
  const value = Number(number);
  if (!safe || !rootRef || !Number.isSafeInteger(value) || value < 0
    || lifeJourneyViewFromContext(safe, rootRef) !== "person") return null;

  const origin = buildLifeJourneyPersonContext(rootRef, safe);
  if (!origin) return null;
  const href = `/2029/number/${value}`;
  return normalizeResearchContext({
    ...safe,
    subject: { id: String(value), type: "number", label: String(value), href },
    selection: { entityId: String(value), entityType: "number", focusKind: "hint_reference" },
    lens: "number",
    returnTo: {
      href: LIFE_JOURNEY_2029_HREF,
      label: "חזרה למסע החיים",
      subject: origin.subject,
      selection: origin.selection,
      lens: origin.lens,
      dimensions: origin.dimensions,
      journey: origin.journey,
    },
  });
}

export function buildLifeJourneyFindingTraversalPatch(context, {
  personRef,
  memberRef,
  findingId,
  value,
  sourceRef = null,
  versionRef = null,
  focusKind = null,
} = {}) {
  const safe = normalizeResearchContext(context);
  const rootRef = clean(personRef);
  const selectedRef = clean(memberRef);
  const exactFindingId = clean(findingId);
  const privateFindingRef = lifeJourneyPrivateFindingRef(exactFindingId);
  if ((typeof value !== "number" && typeof value !== "string")
    || (typeof value === "string" && !value.trim())) return null;
  const number = Number(value);
  const view = lifeJourneyViewFromContext(safe, rootRef);
  const resolvedFocusKind = clean(focusKind)
    || (view === "name" ? "life_journey_gematria" : "life_journey_date_cross");
  if (!safe || !rootRef || !isLifeJourneyMemberRef(rootRef, selectedRef)
    || !privateFindingRef || !Number.isSafeInteger(number) || number < 0
    || !["person", "name", "date"].includes(view)
    || !["life_journey_date_cross", "life_journey_gematria"].includes(resolvedFocusKind)) return null;

  const origin = buildLifeJourneyPersonContext(rootRef, safe);
  if (!origin) return null;
  const href = `/2029/number/${number}`;
  return normalizeResearchContext({
    ...safe,
    subject: { id: String(number), type: "number", label: String(number), href },
    selection: {
      entityId: String(number),
      entityType: "number",
      findingId: privateFindingRef,
      sourceRef: clean(sourceRef),
      versionRef: clean(versionRef),
      resultValue: number,
      focusKind: resolvedFocusKind,
    },
    lens: "number",
    dimensions: {
      ...safe.dimensions,
      lifeJourneyContract: LIFE_JOURNEY_PERSON_CONTEXT_CONTRACT,
      lifeJourneyView: "finding",
      lifeJourneyPersonRef: rootRef,
      lifeJourneyMemberRef: selectedRef,
    },
    access: { tier: "authenticated", scope: "private" },
    returnTo: {
      href: LIFE_JOURNEY_2029_HREF,
      label: "חזרה למסע החיים",
      subject: origin.subject,
      selection: origin.selection,
      lens: origin.lens,
      dimensions: origin.dimensions,
      journey: origin.journey,
    },
  });
}

export function buildLifeJourneyExactReturnPatch(context) {
  return buildExactReturnPatch(context);
}
