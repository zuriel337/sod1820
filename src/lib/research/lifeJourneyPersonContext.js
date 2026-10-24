import { buildExactReturnPatch, normalizeResearchContext } from "./researchContext.js";

export const LIFE_JOURNEY_2029_HREF = "/2029/journey";
export const LIFE_JOURNEY_PERSON_CONTEXT_CONTRACT = "life_journey_person_context_v1";

const VIEWS = new Set(["person", "name", "els"]);
const clean = value => String(value || "").trim();

function personDimensions(context, personRef) {
  const dimensions = Object.fromEntries(
    Object.entries(context?.dimensions || {}).filter(([key]) => !key.startsWith("lifeJourney")),
  );
  return {
    ...dimensions,
    lifeJourneyContract: LIFE_JOURNEY_PERSON_CONTEXT_CONTRACT,
    lifeJourneyView: "person",
    lifeJourneyPersonRef: personRef,
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
  if (!safe || !rootRef || !selectedRef || !expression || !["name", "els"].includes(view)) return null;

  const origin = buildLifeJourneyPersonContext(rootRef, safe);
  if (!origin) return null;
  const subjectType = view === "name" ? "name" : "els";

  return normalizeResearchContext({
    ...safe,
    subject: {
      id: `${selectedRef}:${subjectType}`,
      type: subjectType,
      label: view === "name" ? "מסע שם פרטי" : "תוכנית ELS פרטית",
      href: LIFE_JOURNEY_2029_HREF,
    },
    selection: {
      entityId: selectedRef,
      entityType: "person",
      expression,
      focusKind: "expression",
    },
    lens: subjectType,
    dimensions: {
      ...safe.dimensions,
      lifeJourneyContract: LIFE_JOURNEY_PERSON_CONTEXT_CONTRACT,
      lifeJourneyView: view,
      lifeJourneyPersonRef: rootRef,
      lifeJourneyMemberRef: selectedRef,
      lifeJourneyElsVerified: false,
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

export function buildLifeJourneyExactReturnPatch(context) {
  return buildExactReturnPatch(context);
}
