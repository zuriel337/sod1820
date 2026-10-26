import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLifeJourneyCapabilityPatch,
  buildLifeJourneyExactReturnPatch,
  buildLifeJourneyFamilySelectionPatch,
  buildLifeJourneyHintReferencePatch,
  buildLifeJourneyPersonContext,
} from "../src/lib/research/lifeJourneyPersonContext.js";

test("a numeric personal hint opens the canonical Number surface with exact Person return", () => {
  const personRef = "person:11111111-1111-4111-8111-111111111111:self";
  const context = buildLifeJourneyPersonContext(personRef);
  const next = buildLifeJourneyHintReferencePatch(context, 73);

  assert.equal(next.subject.id, "73");
  assert.equal(next.subject.type, "number");
  assert.equal(next.subject.href, "/2029/number/73");
  assert.equal(next.selection.focusKind, "hint_reference");
  assert.equal(next.returnTo.href, "/2029/journey");
  assert.equal(next.returnTo.subject.id, personRef);
  assert.equal(next.returnTo.selection.entityId, personRef);
  assert.equal(next.returnTo.dimensions.lifeJourneyView, "person");
});

test("Name advances through the private date bridge and returns to the selected family context", () => {
  const personRef = "person:11111111-1111-4111-8111-111111111111:self";
  const childRef = "person:11111111-1111-4111-8111-111111111111:p:child-1";
  const context = buildLifeJourneyPersonContext(personRef);
  const family = buildLifeJourneyFamilySelectionPatch(context, {
    personRef,
    memberRefs: [personRef, childRef, childRef, "person:another-owner:p:no"],
  });
  const name = buildLifeJourneyCapabilityPatch(family, {
    personRef,
    memberRef: childRef,
    name: "שם בדיקה מלא",
    view: "name",
  });
  const date = buildLifeJourneyCapabilityPatch(name, {
    personRef,
    memberRef: childRef,
    name: "שם בדיקה מלא",
    view: "date",
  });
  const parkedEls = buildLifeJourneyCapabilityPatch(date, {
    personRef,
    memberRef: childRef,
    name: "שם",
    view: "els",
  });
  const returned = buildLifeJourneyExactReturnPatch(date);

  assert.deepEqual(family.dimensions.lifeJourneySelectedMemberRefs, [personRef, childRef]);
  assert.equal(date.dimensions.lifeJourneyView, "date");
  assert.equal(date.subject.type, "date");
  assert.equal(date.selection.focusKind, "identity_review");
  assert.equal(date.returnTo.href, "/2029/journey");
  assert.deepEqual(date.returnTo.dimensions.lifeJourneySelectedMemberRefs, [personRef, childRef]);
  assert.deepEqual(returned.dimensions.lifeJourneySelectedMemberRefs, [personRef, childRef]);
  assert.equal(parkedEls, null);
});

test("hint references reject missing Person context and invalid numbers", () => {
  const personRef = "person:11111111-1111-4111-8111-111111111111:self";
  const context = buildLifeJourneyPersonContext(personRef);
  assert.equal(buildLifeJourneyHintReferencePatch(null, 73), null);
  assert.equal(buildLifeJourneyHintReferencePatch(context, null), null);
  assert.equal(buildLifeJourneyHintReferencePatch(context, ""), null);
  assert.equal(buildLifeJourneyHintReferencePatch(context, "not-a-number"), null);
  assert.equal(buildLifeJourneyHintReferencePatch(context, -1), null);
});
