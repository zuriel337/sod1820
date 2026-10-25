import { buildExactReturnPatch, normalizeResearchContext } from "./researchContext.js";

export const LIFE_JOURNEY_2029_HREF = "/2029/journey";
export const LIFE_JOURNEY_PERSON_CONTEXT_CONTRACT = "life_journey_person_context_v1";

const VIEWS = new Set(["person", "name", "date", "finding"]);
const clean = value => String(value || "").trim();

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

function personDimensions(context, personRef) {
  const dimensions = Object.fromEntries(
    Object.entries(context?.dimensions || {}).filter(([key]) => !key.startsWith("lifeJourney")),
  );
  return {
    ...dimensions,
    lifeJourneyContract: LIFE_JOURNEY_PERSON_CONTEXT_CONTRACT,
    lifeJourneyView: "person",
    lifeJourneyPersonRef: personRef,
    lifeJourneySelectedMemberRefs: lifeJourneySelectedMemberRefs(context, personRef),
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
      expression,
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
  return normalizeResearchContext({
    ...safe,
    dimensions: {
      ...safe.dimensions,
      lifeJourneySelectedMemberRefs: selectedRefs,
    },
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
  if ((typeof value !== "number" && typeof value !== "string")
    || (typeof value === "string" && !value.trim())) return null;
  const number = Number(value);
  const view = lifeJourneyViewFromContext(safe, rootRef);
  const resolvedFocusKind = clean(focusKind)
    || (view === "name" ? "life_journey_gematria" : "life_journey_date_cross");
  if (!safe || !rootRef || !isLifeJourneyMemberRef(rootRef, selectedRef)
    || !exactFindingId || !Number.isSafeInteger(number) || number < 0
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
      findingId: exactFindingId,
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
