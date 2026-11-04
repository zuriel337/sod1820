import test from "node:test";
import assert from "node:assert/strict";
import { mergeResearchContext, normalizeResearchContext } from "./researchContext.js";
import {
  buildResearchPathRepresentation,
  contextFromResearchPathSnapshot,
  continueResearchPathContext,
} from "./researchPathRuntime.js";
import {
  LIFE_JOURNEY_2029_HREF,
  buildLifeJourneyCapabilityPatch,
  buildLifeJourneyExactReturnPatch,
  buildLifeJourneyFamilySelectionPatch,
  buildLifeJourneyFindingTraversalPatch,
  buildLifeJourneyEntryContext,
  buildLifeJourneyPersonContext,
  buildLifeJourneyMapPositionPatch,
  buildLifeJourneySaveCheckpointPatch,
  lifeJourneyMapPosition,
  isLifeJourneyPathReceipt,
  canSaveLifeJourneyContext,
  lifeJourneyPrivateFindingRef,
  lifeJourneyEntryFocus,
  lifeJourneyViewFromContext,
} from "./lifeJourneyPersonContext.js";
import { LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION } from "./lifeJourneyFamilyResearchSnapshot.js";

const PERSON_REF = "person:11111111-1111-4111-8111-111111111111:self";
const MEMBER_REF = "person:11111111-1111-4111-8111-111111111111:p:child-1";

test("map position survives Context and Path round trips using only allowed references", () => {
  const initial = buildLifeJourneyPersonContext(PERSON_REF);
  const selected = buildLifeJourneyFamilySelectionPatch(initial, { personRef: PERSON_REF, memberRefs: [PERSON_REF, MEMBER_REF] });
  const patch = buildLifeJourneyMapPositionPatch(selected, { personRef: PERSON_REF, memberRef: MEMBER_REF, tab: "creation", lens: "sky" });
  const positioned = mergeResearchContext(selected, patch);
  const representation = buildResearchPathRepresentation(positioned);
  const receipt = { ok: true, path_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", revision_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", revision_no: 1, access_scope: "private", representation, steps: [] };
  assert.equal(isLifeJourneyPathReceipt(receipt, PERSON_REF), true);
  const restored = contextFromResearchPathSnapshot(receipt);
  assert.deepEqual(lifeJourneyMapPosition(restored, PERSON_REF), { tab: "creation", lens: "sky", memberRef: MEMBER_REF });
  assert.deepEqual(lifeJourneyMapPosition(buildLifeJourneyPersonContext(PERSON_REF, restored), PERSON_REF), lifeJourneyMapPosition(restored, PERSON_REF));
  assert.deepEqual(Object.keys(patch.dimensions).sort(), ["lifeJourneyMapLens", "lifeJourneyMapMemberRef", "lifeJourneyMapTab"]);
});

test("the private-hint branch is an allowed map position and carries no hint payload", () => {
  const context = buildLifeJourneyPersonContext(PERSON_REF);
  const patch = buildLifeJourneyMapPositionPatch(context, { personRef: PERSON_REF, tab: "hints" });
  const positioned = mergeResearchContext(context, patch);
  assert.deepEqual(lifeJourneyMapPosition(positioned, PERSON_REF), { tab: "hints", lens: "spatial", memberRef: PERSON_REF });
  assert.equal(JSON.stringify(positioned).includes("occurred_at"), false);
  assert.equal(JSON.stringify(positioned).includes("hint-"), false);
});

test("the 2029 hints entry accepts only a fixed focus and carries no private payload", () => {
  assert.equal(lifeJourneyEntryFocus("?focus=hints&hint=private-value"), "hints");
  assert.equal(lifeJourneyEntryFocus("?focus=research"), null);
  assert.equal(lifeJourneyEntryFocus(`?focus=hints&x=${"a".repeat(600)}`), null);
  const entered = buildLifeJourneyEntryContext(PERSON_REF, null, lifeJourneyEntryFocus("?focus=hints"));
  assert.equal(lifeJourneyMapPosition(entered, PERSON_REF).tab, "hints");
  assert.equal(JSON.stringify(entered).includes("private-value"), false);
});

test("map position rejects foreign/deselected people and unknown views", () => {
  const context = buildLifeJourneyPersonContext(PERSON_REF);
  assert.equal(buildLifeJourneyMapPositionPatch(context, { personRef: PERSON_REF, memberRef: MEMBER_REF }), null);
  assert.equal(buildLifeJourneyMapPositionPatch(context, { personRef: PERSON_REF, memberRef: "person:other:self" }), null);
  assert.equal(buildLifeJourneyMapPositionPatch(context, { personRef: PERSON_REF, tab: "els" }), null);
  assert.equal(buildLifeJourneyMapPositionPatch(context, { personRef: PERSON_REF, lens: "private name" }), null);
  assert.equal(lifeJourneyMapPosition(context, PERSON_REF, []).memberRef, null);
});

test("save success requires an exact private Path receipt for this person", () => {
  const context = buildLifeJourneyPersonContext(PERSON_REF);
  const receipt = { ok: true, path_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", revision_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", revision_no: 1, representation: buildResearchPathRepresentation(context) };
  assert.equal(isLifeJourneyPathReceipt({ ok: true }, PERSON_REF), false);
  assert.equal(isLifeJourneyPathReceipt({ ...receipt, revision_id: null }, PERSON_REF), false);
  assert.equal(isLifeJourneyPathReceipt({ ...receipt, revision_no: 0 }, PERSON_REF), false);
  assert.equal(isLifeJourneyPathReceipt({ ...receipt, access_scope: "public" }, PERSON_REF), false);
  assert.equal(isLifeJourneyPathReceipt(receipt, "person:other:self"), false);
  assert.equal(isLifeJourneyPathReceipt({ ...receipt, representation: { ...receipt.representation, href: "https://example.test" } }, PERSON_REF), false);
  assert.equal(canSaveLifeJourneyContext(context, PERSON_REF), true);
  assert.equal(canSaveLifeJourneyContext(normalizeResearchContext({ ...context, journey: { root: { type: "number", id: "73" } } }), PERSON_REF), false);
  const moved = mergeResearchContext(context, buildLifeJourneyMapPositionPatch(context, { personRef: PERSON_REF, tab: "time" }));
  assert.equal(isLifeJourneyPathReceipt(receipt, PERSON_REF, moved), false, "a stale receipt does not confirm a different map checkpoint");
});

test("a repeated explicit save queues a bounded checkpoint through the existing Path draft", () => {
  const started = continueResearchPathContext(buildLifeJourneyPersonContext(PERSON_REF), { kind: "person_life" }).context;
  assert.equal(buildLifeJourneySaveCheckpointPatch(started, PERSON_REF), null, "an existing pending step is not duplicated");
  const saved = normalizeResearchContext({ ...started, journey: { ...started.journey, pendingSteps: [], lastSavedStep: { ...started.journey.pendingSteps[0], step_index: 3 } } });
  const patch = buildLifeJourneySaveCheckpointPatch(saved, PERSON_REF);
  assert.equal(patch.journey.pendingSteps.length, 1);
  assert.equal(patch.journey.pendingSteps[0].step_index, 4);
  assert.equal(patch.journey.pendingSteps[0].reason, "explicit_person_checkpoint");
  assert.equal(patch.journey.pendingSteps[0].href, LIFE_JOURNEY_2029_HREF);
});

test("person context preserves one opaque person-ref through a refresh round trip", () => {
  const context = buildLifeJourneyPersonContext(PERSON_REF);
  const reloaded = normalizeResearchContext(JSON.parse(JSON.stringify(context)));
  assert.equal(reloaded.subject.id, PERSON_REF);
  assert.equal(reloaded.selection.entityId, PERSON_REF);
  assert.equal(reloaded.dimensions.lifeJourneyPersonRef, PERSON_REF);
  assert.equal(lifeJourneyViewFromContext(reloaded, PERSON_REF), "person");
});

test("person exact return preserves a matching family snapshot and a changed selection clears it", () => {
  const snapshot = "{\"private\":\"family-work-snapshot\"}";
  const person = buildLifeJourneyPersonContext(PERSON_REF, normalizeResearchContext({
    subject: { id: PERSON_REF, type: "person" },
    selection: { entityId: PERSON_REF, entityType: "person" },
    lens: "person",
    dimensions: {
      lifeJourneyContract: "life_journey_person_context_v1",
      lifeJourneyView: "person",
      lifeJourneyPersonRef: PERSON_REF,
      lifeJourneySelectedMemberRefs: [PERSON_REF, MEMBER_REF],
      [LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION]: snapshot,
    },
  }));
  assert.equal(person.dimensions[LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION], snapshot);
  const unchanged = buildLifeJourneyFamilySelectionPatch(person, { personRef: PERSON_REF, memberRefs: [PERSON_REF, MEMBER_REF] });
  assert.equal(unchanged.dimensions[LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION], snapshot);
  const changed = buildLifeJourneyFamilySelectionPatch(person, { personRef: PERSON_REF, memberRefs: [PERSON_REF] });
  assert.equal(changed.dimensions[LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION], undefined);
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
  assert.equal(started.selection.expression, null);
  assert.equal(started.subject.href, LIFE_JOURNEY_2029_HREF);
  assert.equal(started.returnTo.href, LIFE_JOURNEY_2029_HREF);
  assert.equal(JSON.stringify([started.subject.href, started.returnTo.href]).includes("שם בדיקה"), false);
  assert.equal(JSON.stringify(started).includes("שם בדיקה"), false);

  const restored = mergeResearchContext(started, buildLifeJourneyExactReturnPatch(started));
  assert.equal(lifeJourneyViewFromContext(restored, PERSON_REF), "person");
  assert.equal(restored.subject.id, PERSON_REF);
  assert.equal(restored.returnTo, null);
  assert.equal(restored.journey.kind, "research_path");
});

test("Life Journey save/resume projection is reference-only and restores the selected member", () => {
  const person = buildLifeJourneyPersonContext(PERSON_REF);
  const name = buildLifeJourneyCapabilityPatch(person, {
    personRef: PERSON_REF,
    memberRef: MEMBER_REF,
    name: "שם בדיקה פרטי",
    view: "name",
  });
  const active = continueResearchPathContext(name, {
    kind: "person_life",
    surface: "life_journey_2029",
    href: LIFE_JOURNEY_2029_HREF,
  }).context;
  const representation = buildResearchPathRepresentation(active, {
    href: LIFE_JOURNEY_2029_HREF,
    label: "מסע חיים פרטי",
    surface: "journey",
  });

  assert.equal(JSON.stringify(representation).includes("שם בדיקה פרטי"), false);
  assert.equal(representation.context.dimensions.lifeJourneyMemberRef, MEMBER_REF);

  const restored = contextFromResearchPathSnapshot({
    ok: true,
    path_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    revision_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    revision_no: 1,
    representation,
    steps: [],
  });
  assert.equal(restored.dimensions.lifeJourneyMemberRef, MEMBER_REF);
  assert.equal(lifeJourneyViewFromContext(restored, PERSON_REF), "name");
  assert.equal(JSON.stringify(restored).includes("שם בדיקה פרטי"), false);
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
  assert.equal(finding.selection.findingId, lifeJourneyPrivateFindingRef(findingId));
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
  assert.equal(started.journey.pendingSteps[1].selection.findingId, lifeJourneyPrivateFindingRef(findingId));

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
  assert.equal(finding.selection.findingId, lifeJourneyPrivateFindingRef(findingId));
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
