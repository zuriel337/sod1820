import test from "node:test";
import assert from "node:assert/strict";
import { normalizeResearchContext } from "./researchContext.js";
import {
  buildResearchPathRepresentation, buildResearchPathIdentityMetadata, buildResearchPathStep,
  continueResearchPathContext, contextFromResearchPathSnapshot, contextFromResearchPathStep,
  researchPathStepsForSave, researchPathHref, getLatestResearchPath,
  researchPathPendingStepsAcknowledged, researchPathStepAcknowledgementKey, researchPathStepKey,
  researchPathAcknowledgedPrefixLength, researchPathStepsPayloadWithinLimit,
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

test("late Number trace preserves an existing Research Result outcome", () => {
  const selected = {
    ...number,
    selection: { ...number.selection, focusKind: "expression", findingId: null },
  };
  const outcome = {
    capability_key: "gematria_relations",
    outcome_status: "executed",
    finding_refs: ["uf:relation"],
    source_refs: ["source:pair"],
    version_refs: ["relation:v1"],
  };
  const initial = continueResearchPathContext(selected, { surface: "number", outcome });
  const withLateTrace = {
    ...initial.context,
    selection: { ...initial.context.selection, findingId: "trace:verified-method-v3" },
  };
  const expectedStepCount = initial.context.journey.pendingSteps.length;

  const saveSteps = researchPathStepsForSave(withLateTrace);
  assert.equal(saveSteps.length, expectedStepCount);
  assert.equal(saveSteps.at(-1).selection.findingId, "trace:verified-method-v3");
  assert.equal(saveSteps.at(-1).outcome_status, "executed");
  assert.deepEqual(saveSteps.at(-1).finding_refs, ["uf:relation"]);

  const continued = continueResearchPathContext(withLateTrace, { surface: "number" });
  assert.equal(continued.changed, false);
  assert.equal(continued.context.journey.pendingSteps.length, expectedStepCount);
  const latest = continued.context.journey.pendingSteps.at(-1);
  assert.equal(latest.selection.findingId, "trace:verified-method-v3");
  assert.equal(latest.outcome_status, "executed");
  assert.deepEqual(latest.source_refs, ["source:pair"]);
  assert.deepEqual(latest.version_refs, ["relation:v1"]);
});

test("first outcome enrichment preserves the user's planned-step reason only", () => {
  const planned = continueResearchPathContext(number, {
    surface: "number",
    reason: "user-selected-anchor",
  });
  const executed = {
    capability_key: "gematria_relations",
    outcome_status: "executed",
    finding_refs: ["uf:relation"],
    source_refs: ["source:pair"],
    version_refs: ["relation:v1"],
  };
  const enriched = continueResearchPathContext(planned.context, {
    surface: "number",
    outcome: executed,
  });
  assert.equal(enriched.context.journey.pendingSteps.at(-1).reason, "user-selected-anchor");

  const missing = continueResearchPathContext(number, {
    surface: "number",
    outcome: {
      capability_key: "gematria_relations",
      outcome_status: "missing_adapter",
      finding_refs: [],
      source_refs: [],
      version_refs: [],
      reason: "adapter unavailable",
    },
  });
  const resolved = continueResearchPathContext(missing.context, {
    surface: "number",
    outcome: executed,
  });
  assert.equal(resolved.context.journey.pendingSteps.at(-1).reason, null,
    "a resolved outcome never inherits the stale adapter reason");
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

test("Research Result outcome refs survive Path normalization and resume", () => {
  const step = normalizeResearchContext({
    ...number,
    journey: {
      kind: "research_path",
      pendingSteps: [{
        step_index: 2,
        entity_type: "number",
        entity_ref: "1237",
        label_key: "1237",
        href: "/number/1237",
        surface: "number",
        reason: "bounded relation completed",
        capability_key: "gematria_relations",
        outcome_status: "executed",
        finding_refs: ["uf:one", "uf:one", "uf:two"],
        source_refs: ["source:one", "source:one"],
        version_refs: ["relation:v1"],
        context: number,
      }],
    },
  }).journey.pendingSteps[0];

  assert.equal(step.capability_key, "gematria_relations");
  assert.equal(step.outcome_status, "executed");
  assert.deepEqual(step.finding_refs, ["uf:one", "uf:two"]);
  assert.deepEqual(step.source_refs, ["source:one"]);
  assert.deepEqual(step.version_refs, ["relation:v1"]);

  const snapshot = {
    ok: true,
    path_id: pathId,
    revision_id: revisionId,
    revision_no: 2,
    steps: [step],
    representation: buildResearchPathRepresentation(number),
  };
  const resumed = contextFromResearchPathSnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.equal(resumed.journey.lastSavedStep.capability_key, "gematria_relations");
  assert.deepEqual(resumed.journey.lastSavedStep.finding_refs, ["uf:one", "uf:two"]);
  assert.equal(resumed.access, null, "saved outcome never restores authorization state");
});

test("save acknowledgement never discards a newer outcome on the same navigation step", () => {
  const base = {
    step_index: 2,
    entity_type: "number",
    entity_ref: "1237",
    label_key: "1237",
    href: "/number/1237",
    capability_key: "gematria_relations",
    outcome_status: "executed",
    source_refs: ["source:one"],
    version_refs: ["relation:v1"],
    context: number,
  };
  const captured = { ...base, finding_refs: ["uf:old"] };
  const enrichedWhileSaving = { ...base, finding_refs: ["uf:new"] };

  assert.equal(researchPathStepKey(captured), researchPathStepKey(enrichedWhileSaving),
    "navigation identity stays unchanged");
  assert.notEqual(
    researchPathStepAcknowledgementKey(captured),
    researchPathStepAcknowledgementKey(enrichedWhileSaving),
    "durable outcome identity changes"
  );
  assert.equal(researchPathPendingStepsAcknowledged([captured], [enrichedWhileSaving]), false);
  assert.equal(researchPathPendingStepsAcknowledged([captured], [captured]), true);

  const origin = buildResearchPathStep(source, { surface: "post" });
  assert.equal(
    researchPathAcknowledgedPrefixLength(
      [origin, captured],
      [origin, enrichedWhileSaving]
    ),
    1,
    "an in-flight save drops only its already-saved common prefix"
  );
  assert.deepEqual(
    [origin, enrichedWhileSaving].slice(researchPathAcknowledgedPrefixLength(
      [origin, captured],
      [origin, enrichedWhileSaving]
    )),
    [enrichedWhileSaving],
    "the changed outcome remains pending without replaying the origin"
  );

  const oldMissing = {
    capability_key: "els",
    outcome_status: "missing_adapter",
    finding_refs: [],
    source_refs: [],
    version_refs: [],
    reason: "old adapter reason",
  };
  const correctedMissing = { ...oldMissing, reason: "corrected adapter reason" };
  const initial = continueResearchPathContext(number, { surface: "number", outcome: oldMissing });
  const corrected = continueResearchPathContext(initial.context, {
    surface: "number",
    outcome: correctedMissing,
  });
  assert.equal(corrected.changed, false, "reason correction enriches the pending step in place");
  assert.equal(corrected.context.journey.pendingSteps.at(-1).reason, "corrected adapter reason");
  assert.notEqual(
    researchPathStepAcknowledgementKey(initial.context.journey.pendingSteps.at(-1)),
    researchPathStepAcknowledgementKey(corrected.context.journey.pendingSteps.at(-1))
  );
  assert.equal(
    researchPathPendingStepsAcknowledged(
      initial.context.journey.pendingSteps,
      corrected.context.journey.pendingSteps
    ),
    false,
    "an in-flight save cannot acknowledge the stale reason"
  );
});

test("Research Path outcome validation accepts the DB vocabulary and applies client bounds", () => {
  const base = {
    step_index: 0,
    entity_type: "number",
    entity_ref: "358",
    label_key: "358",
    href: "/number/358",
    context: { subject: { id: "358", type: "number", href: "/number/358" } },
  };

  const normalizeStep = (patch) => normalizeResearchContext({
    subject: number.subject,
    journey: { kind: "research_path", pendingSteps: [{ ...base, ...patch }] },
  })?.journey?.pendingSteps?.[0] || null;

  assert.equal(normalizeStep({ outcome_status: "executed" }), null, "capability is required");
  const orphan = normalizeStep({ capability_key: "numeric" });
  assert.equal(orphan.outcome_status, undefined, "DB-compatible orphan fields are ignored, not promoted");
  assert.equal(orphan.capability_key, undefined);
  assert.equal(normalizeStep({ capability_key: "numeric", outcome_status: "invented" }), null);
  assert.equal(normalizeStep({ capability_key: "numeric", outcome_status: "executed", finding_refs: {} }), null);
  assert.equal(normalizeStep({
    capability_key: "numeric",
    outcome_status: "executed",
    source_refs: ["source:valid", { authorization_context: { token: "secret" } }],
  }), null, "malformed provenance arrays fail closed instead of being partially persisted");
  assert.equal(normalizeStep({
    capability_key: "numeric",
    outcome_status: "executed",
    source_refs: Array.from({ length: 200 }, (_, index) => `source:${index}:${"x".repeat(120)}`),
    version_refs: Array.from({ length: 200 }, (_, index) => `version:${index}:${"x".repeat(120)}`),
  }), null, "one outcome cannot consume the aggregate Path payload budget");
  assert.equal(normalizeStep({
    capability_key: "numeric",
    outcome_status: "negative_result",
    reason: "not found",
    finding_refs: ["uf:positive"],
    negative_scope: { limit: 10 },
  }), null);
  assert.equal(normalizeStep({
    capability_key: "numeric",
    outcome_status: "negative_result",
    reason: "not found",
  }), null);
  assert.equal(normalizeStep({ capability_key: "els", outcome_status: "missing_adapter" }), null);
  assert.equal(normalizeStep({
    capability_key: "numeric",
    outcome_status: "negative_result",
    reason: "not found",
    negative_scope: { nested: { authorization_context: { token: "secret" } } },
  }), null, "raw authorization context cannot become durable Path state");

  const negative = normalizeStep({
    capability_key: "numeric",
    outcome_status: "negative_result",
    reason: "not found",
    negative_scope: { limit: 10 },
    finding_refs: [],
  });
  assert.equal(negative.outcome_status, "negative_result");
  assert.deepEqual(negative.negative_scope, { limit: 10 });

  const planned = normalizeStep({ reason: "planned navigation" });
  assert.equal(planned.reason, "planned navigation");
  assert.equal(planned.outcome_status, undefined);
});

test("Research Path save payload is rejected locally before the server aggregate limit", () => {
  const modest = [{ step_index: 0, entity_type: "number", entity_ref: "358" }];
  const oversized = Array.from({ length: 100 }, (_, index) => ({
    step_index: index,
    entity_type: "number",
    entity_ref: String(index),
    context: { dimensions: { note: "א".repeat(1_500) } },
  }));
  const denseRefs = Array.from({ length: 100 }, (_, stepIndex) => ({
    step_index: stepIndex,
    entity_type: "number",
    entity_ref: String(stepIndex),
    capability_key: "numeric",
    outcome_status: "executed",
    finding_refs: Array.from({ length: 105 }, (_, index) => `f${stepIndex}:${index}`),
    source_refs: Array.from({ length: 105 }, (_, index) => `s${stepIndex}:${index}`),
    version_refs: Array.from({ length: 105 }, (_, index) => `v${stepIndex}:${index}`),
  }));
  const exponentHeavy = Array.from({ length: 100 }, (_, index) => ({
    step_index: index,
    entity_type: "number",
    entity_ref: String(index),
    context: { dimensions: { values: Array.from({ length: 100 }, () => 1e100) } },
  }));
  assert.equal(researchPathStepsPayloadWithinLimit(modest), true);
  assert.equal(researchPathStepsPayloadWithinLimit(oversized), false);
  assert.equal(researchPathStepsPayloadWithinLimit(denseRefs), false,
    "compact JSON cannot undercount PostgreSQL jsonb::text spacing");
  assert.equal(researchPathStepsPayloadWithinLimit(exponentHeavy), false,
    "PostgreSQL decimal expansion of exponent-form JSON numbers is budgeted");
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
