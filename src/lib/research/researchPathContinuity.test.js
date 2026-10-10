import test from "node:test";
import assert from "node:assert/strict";
import { normalizeResearchContext } from "./researchContext.js";
import {
  buildResearchPathRepresentation, buildResearchPathIdentityMetadata, buildResearchPathStep,
  continueResearchPathContext, contextFromResearchPathSnapshot, contextFromResearchPathStep,
  researchPathStepsForSave, researchPathHref, getLatestResearchPath,
} from "./researchPathRuntime.js";

const source = {
  href: "/post/source#paragraph-7", label: "מקור",
  subject: { id: "post-source", type: "post", label: "מקור", href: "/post/source#paragraph-7" },
  selection: { entityId: "placement-7", entityType: "image", sourceRef: "gallery:source", locator: "image:7", versionRef: "edition-2" },
  lens: "source", dimensions: { galleryPlacementId: "placement-7" },
};
const number = {
  subject: { id: "1237", type: "number", label: "1237", href: "/2029/number/1237?focus=expression&method=regular" },
  selection: { entityId: "1237", entityType: "number", expression: "expression", method: "regular", methodVersion: "3", resultValue: 1237 },
  lens: "number", returnTo: source, access: { tier: "admin", scope: "private" },
};
const pathId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const revisionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const start = (c = number) => continueResearchPathContext(c, { kind: "number_expression", surface: "number" });

test("late Number trace enriches a pending choice without inventing another step", () => {
  const selected = { ...number, selection: { ...number.selection, focusKind: "expression" } };
  const initial = start(selected).context;
  const enriched = { ...initial, selection: { ...initial.selection, findingId: "trace:verified-method-v3" } };
  const steps = researchPathStepsForSave(enriched);
  assert.equal(steps.length, 2);
  assert.equal(steps.at(-1).selection.findingId, "trace:verified-method-v3");
  assert.equal(start(enriched).changed, false);
  const distinct = { ...enriched, journey: { ...initial.journey, pendingSteps: steps }, selection: { ...enriched.selection, findingId: "different-finding" } };
  assert.equal(researchPathStepsForSave(distinct).length, 3);
});

test("explicit start retains the exact source; another method/crossing continues the same root", () => {
  assert.equal(normalizeResearchContext(number).journey, null);
  const first = start();
  assert.equal(first.started, true);
  assert.equal(first.context.journey.pendingSteps.length, 2);
  assert.equal(first.context.journey.position, 1);
  assert.equal(first.context.journey.root.id, "post-source");
  assert.equal(start(first.context).changed, false, "repeat action must not add a step");
  const next = start({ ...first.context, subject: { ...number.subject, href: "/2029/number/1237?method=other" },
    selection: { ...number.selection, method: "other", crossingPartner: "partner", focusKind: "crossing", resultValue: 27 } });
  assert.equal(next.started, false);
  assert.equal(next.context.journey.pendingSteps.length, 3);
  assert.equal(next.context.journey.pendingSteps.at(-1).selection.resultValue, 27);
  assert.equal(next.context.journey.pendingSteps.at(-1).selection.crossingPartner, "partner");
  assert.equal(buildResearchPathIdentityMetadata(next.context).root_ref, "post-source");
});

test("save/reload restores private navigation and exact source, not access authority or duplicate pending steps", () => {
  const context = start().context;
  const steps = researchPathStepsForSave(context);
  const representation = buildResearchPathRepresentation(context);
  assert.equal(representation.context.access, undefined);
  assert.equal(representation.context.journey.pendingSteps, undefined);
  assert.ok(steps.every(s => !s.context.access && !s.context.journey));
  const snapshot = JSON.parse(JSON.stringify({ ok: true, path_id: pathId, revision_id: revisionId, revision_no: 1, steps, representation }));
  const restored = contextFromResearchPathSnapshot(snapshot);
  assert.equal(restored.access, null);
  assert.equal(restored.journey.id, pathId);
  assert.equal(restored.selection.methodVersion, "3");
  assert.equal(restored.returnTo.href, source.href);
  assert.deepEqual(researchPathStepsForSave(restored), []);
  const reopened = contextFromResearchPathStep(steps[0], restored);
  assert.equal(reopened.subject.href, source.href);
  assert.equal(reopened.selection.sourceRef, "gallery:source");
  assert.equal(reopened.selection.locator, "image:7");
  assert.equal(reopened.selection.versionRef, "edition-2");
  assert.equal(reopened.dimensions.galleryPlacementId, "placement-7");
  assert.equal(reopened.journey.id, pathId);
});

test("exact ELS replay intent and Raziel's same selection survive Path serialization without invented verification", () => {
  const selection = { entityType: "els", term: "משיח", corpus: "torah", corpusVersion: "v1", occurrenceId: "occurrence-1", start: 37, end: 1, skip: -12, dir: -1, locator: "els:exact", sourceRef: "source:verse", versionRef: "engine:1" };
  const step = buildResearchPathStep({ subject: { id: "משיח", type: "phrase", href: "/els?occurrence=occurrence-1" }, selection, lens: "els" });
  const reopened = contextFromResearchPathStep(JSON.parse(JSON.stringify(step)), start().context);
  for (const [key, value] of Object.entries(selection)) assert.equal(reopened.selection[key], value);
  assert.equal(reopened.selection.verified, undefined);
  assert.equal(reopened.access, null);
});

test("missing source keeps the ref but cannot open; unsafe destinations and invalid private IDs fail closed", async () => {
  const step = buildResearchPathStep({ subject: { id: "missing", type: "source" }, selection: { sourceRef: "source:missing" } });
  assert.equal(step.selection.sourceRef, "source:missing");
  assert.equal(contextFromResearchPathStep(step, number), null);
  for (const href of ["//host", "/\\host", "/\nhost", "https://host", "javascript:alert(1)"]) assert.equal(researchPathHref(href), null);
  assert.equal((await getLatestResearchPath("private-bad-id")).error, "invalid_path_id");
});

test("878 preset identity remains separate from durable Path identity; bounded draft never drops earlier steps", () => {
  const golden = start({ ...number, subject: { id: "878", type: "number", href: "/world" },
    dimensions: { journeySemanticId: "golden:878:v1", journeyVisitedValues: [878] } }).context;
  assert.equal(golden.dimensions.journeySemanticId, "golden:878:v1");
  assert.equal(golden.journey.kind, "research_path");
  const full = { ...golden, journey: { ...golden.journey, pendingSteps: Array.from({ length: 100 }, (_, i) => buildResearchPathStep({ subject: { id: String(i), type: "number", href: `/2029/number/${i}` } })) } };
  assert.equal(start(full).error, "save_required");
});
