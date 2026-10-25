import test from "node:test";
import assert from "node:assert/strict";
import { mergeResearchContext, normalizeResearchContext } from "./researchContext.js";
import { continueResearchPathContext } from "./researchPathRuntime.js";
import {
  LIFE_JOURNEY_2029_HREF,
  buildLifeJourneyCapabilityPatch,
  buildLifeJourneyExactReturnPatch,
  buildLifeJourneyFindingTraversalPatch,
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

test("an explicit date-cross Finding opens the canonical Number page and exact-returns to Person", () => {
  const person = buildLifeJourneyPersonContext(PERSON_REF);
  const findingId = "uf1:date_cross:gregorian%3A1990-02-15:private-input";
  const finding = buildLifeJourneyFindingTraversalPatch(person, {
    personRef: PERSON_REF,
    memberRef: MEMBER_REF,
    findingId,
    value: 73,
    versionRef: "personal-date-representation-v1",
  });

  assert.equal(finding.subject.href, "/2029/number/73");
  assert.equal(finding.selection.findingId, findingId);
  assert.equal(finding.selection.resultValue, 73);
  assert.equal(finding.selection.focusKind, "life_journey_date_cross");
  assert.equal(finding.dimensions.lifeJourneyMemberRef, MEMBER_REF);
  assert.equal(finding.returnTo.subject.id, PERSON_REF);
  assert.equal(finding.subject.href.includes("1990-02-15"), false);
  assert.equal(lifeJourneyViewFromContext(finding, PERSON_REF), "finding");

  const started = continueResearchPathContext(finding, {
    kind: "person_life",
    mode: "organic",
    surface: "life_journey_2029",
    href: finding.subject.href,
    reason: "explicit_person_finding_traversal",
  }).context;
  assert.equal(started.dimensions.journey2029Kind, "person_life");
  assert.equal(started.journey.pendingSteps.length, 2);
  assert.equal(started.journey.pendingSteps[0].entity_ref, PERSON_REF);
  assert.equal(started.journey.pendingSteps[1].selection.findingId, findingId);

  const restored = mergeResearchContext(started, buildLifeJourneyExactReturnPatch(started));
  assert.equal(lifeJourneyViewFromContext(restored, PERSON_REF), "person");
  assert.equal(restored.subject.id, PERSON_REF);
  assert.equal(restored.dimensions.lifeJourneyMemberRef, undefined);
  assert.equal(restored.returnTo, null);
});

test("a canonical name Finding opens Number without putting the private name in the URL", () => {
  const person = buildLifeJourneyPersonContext(PERSON_REF);
  const name = buildLifeJourneyCapabilityPatch(person, {
    personRef: PERSON_REF,
    memberRef: MEMBER_REF,
    name: "שם בדיקה",
    view: "name",
  });
  const findingId = "uf1:gematria:private-normalized-name:method";
  const finding = buildLifeJourneyFindingTraversalPatch(name, {
    personRef: PERSON_REF,
    memberRef: MEMBER_REF,
    findingId,
    value: 337,
    sourceRef: "gematria",
    versionRef: "gematria-api-v1",
    focusKind: "life_journey_gematria",
  });

  assert.equal(finding.subject.href, "/2029/number/337");
  assert.equal(finding.subject.href.includes("שם"), false);
  assert.equal(finding.selection.findingId, findingId);
  assert.equal(finding.selection.focusKind, "life_journey_gematria");
  assert.equal(finding.returnTo.subject.id, PERSON_REF);

  const restored = mergeResearchContext(finding, buildLifeJourneyExactReturnPatch(finding));
  assert.equal(lifeJourneyViewFromContext(restored, PERSON_REF), "person");
  assert.equal(restored.subject.id, PERSON_REF);
});

test("Finding traversal rejects foreign family refs, missing Finding identity and blank values", () => {
  const person = buildLifeJourneyPersonContext(PERSON_REF);
  const base = { personRef: PERSON_REF, memberRef: MEMBER_REF, findingId: "finding-73", value: 73 };
  assert.equal(buildLifeJourneyFindingTraversalPatch(person, { ...base, memberRef: "person:other:self" }), null);
  assert.equal(buildLifeJourneyFindingTraversalPatch(person, { ...base, findingId: "" }), null);
  assert.equal(buildLifeJourneyFindingTraversalPatch(person, { ...base, value: "" }), null);
  assert.equal(buildLifeJourneyFindingTraversalPatch(person, { ...base, value: -1 }), null);
});
