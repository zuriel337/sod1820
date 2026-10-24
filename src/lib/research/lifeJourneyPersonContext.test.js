import test from "node:test";
import assert from "node:assert/strict";
import { mergeResearchContext, normalizeResearchContext } from "./researchContext.js";
import { continueResearchPathContext } from "./researchPathRuntime.js";
import {
  LIFE_JOURNEY_2029_HREF,
  buildLifeJourneyCapabilityPatch,
  buildLifeJourneyExactReturnPatch,
  buildLifeJourneyPersonContext,
  lifeJourneyViewFromContext,
} from "./lifeJourneyPersonContext.js";

const PERSON_REF = "person:11111111-1111-4111-8111-111111111111:self";
const MEMBER_REF = "person:11111111-1111-4111-8111-111111111111:p:child-1";

test("person context preserves one opaque person-ref through a refresh round trip", () => {
  const context = buildLifeJourneyPersonContext(PERSON_REF);
  const reloaded = normalizeResearchContext(JSON.parse(JSON.stringify(context)));
  assert.equal(reloaded.subject.id, PERSON_REF);
  assert.equal(reloaded.selection.entityId, PERSON_REF);
  assert.equal(reloaded.dimensions.lifeJourneyPersonRef, PERSON_REF);
  assert.equal(lifeJourneyViewFromContext(reloaded, PERSON_REF), "person");
});

test("an explicit Name Journey keeps private input in Context and exact-returns to Person", () => {
  const person = buildLifeJourneyPersonContext(PERSON_REF);
  const entered = buildLifeJourneyCapabilityPatch(person, {
    personRef: PERSON_REF,
    memberRef: MEMBER_REF,
    name: "שם בדיקה",
    view: "name",
  });
  const started = continueResearchPathContext(entered, {
    kind: "name",
    surface: "life_journey_2029",
    href: LIFE_JOURNEY_2029_HREF,
  }).context;

  assert.equal(lifeJourneyViewFromContext(started, PERSON_REF), "name");
  assert.equal(started.selection.expression, "שם בדיקה");
  assert.equal(started.subject.href, LIFE_JOURNEY_2029_HREF);
  assert.equal(started.returnTo.href, LIFE_JOURNEY_2029_HREF);
  assert.equal(JSON.stringify([started.subject.href, started.returnTo.href]).includes("שם בדיקה"), false);

  const restored = mergeResearchContext(started, buildLifeJourneyExactReturnPatch(started));
  assert.equal(lifeJourneyViewFromContext(restored, PERSON_REF), "person");
  assert.equal(restored.subject.id, PERSON_REF);
  assert.equal(restored.returnTo, null);
  assert.equal(restored.journey.kind, "research_path");
});

test("ELS stays parked outside the active Person journey", () => {
  const person = buildLifeJourneyPersonContext(PERSON_REF);
  const els = buildLifeJourneyCapabilityPatch(person, {
    personRef: PERSON_REF,
    memberRef: MEMBER_REF,
    name: "שם בדיקה",
    view: "els",
  });
  assert.equal(els, null);
  assert.equal(person.subject.id, PERSON_REF);
  assert.equal(lifeJourneyViewFromContext(person, PERSON_REF), "person");
});
