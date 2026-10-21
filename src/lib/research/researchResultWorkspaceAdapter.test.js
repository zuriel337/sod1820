import test from "node:test";
import assert from "node:assert/strict";
import { makeUniversalFinding } from "./universalFinding.js";
import {
  ACCESS_CLASS,
  CAPABILITY_STATUS,
  capabilityResult,
  composeResearchResultBundle,
} from "./researchResultBundle.js";
import {
  researchEntitiesFromResultBundle,
  researchPathOutcomeFromResultBundle,
  selectResearchResultFindings,
} from "./researchResultWorkspaceAdapter.js";
import {
  buildResearchPathRepresentation,
  contextFromResearchPathSnapshot,
  continueResearchPathContext,
  researchPathPendingStepsAcknowledged,
  researchPathStepsForSave,
} from "./researchPathRuntime.js";

function finding(id, { tier = "public", label = id } = {}) {
  return makeUniversalFinding({
    id,
    kind: "gematria_relation",
    subject: { type: "phrase", key: id, label },
    source: { engine: "canonical-test", sourceRef: `source:${id}` },
    identity: { sourceIdentity: `source:${id}` },
    access: { tier },
    provenance: { createdBy: "TEST" },
  });
}

function bundleWithCapabilities(capabilities, extra = {}) {
  return composeResearchResultBundle({
    query: { raw_input: "bounded test" },
    capabilities,
    synthesis: { answer: "must not enter Workspace or Path" },
    ...extra,
  });
}

test("Workspace selection is explicit, stable and never defaults to every Finding", () => {
  const a = finding("uf:test:a");
  const b = finding("uf:test:b");
  const bundle = bundleWithCapabilities([capabilityResult({
    key: "gematria_relations",
    findings: [a, b, a],
    sourceRefs: ["source:a"],
    versionRefs: ["method:v1"],
  })]);

  assert.deepEqual(selectResearchResultFindings(bundle), {
    findings: [], selectedIds: [], missingIds: [],
  });

  const selected = selectResearchResultFindings(bundle, [b.id, "missing", b.id, a.id]);
  assert.deepEqual(selected.selectedIds, [a.id, b.id], "Bundle order is canonical");
  assert.deepEqual(selected.missingIds, ["missing"]);
  assert.deepEqual(selected.findings.map((item) => item.id), [a.id, b.id]);
});

test("Workspace selection reports an oversized request instead of silently treating it as complete", () => {
  const item = finding("uf:test:bounded-selection");
  const bundle = bundleWithCapabilities([capabilityResult({
    key: "gematria_relations",
    findings: [item],
  })]);
  const requested = [item.id, ...Array.from({ length: 200 }, (_, index) => `uf:missing:${index}`)];

  const selected = selectResearchResultFindings(bundle, requested);
  assert.equal(selected.truncated, true);
  assert.deepEqual(selected.selectedIds, [item.id]);
  assert.equal(selected.missingIds.length, 199);

  const unknownCapability = researchPathOutcomeFromResultBundle(bundle, {
    capabilityKey: "unknown",
    findingIds: requested,
  });
  assert.equal(unknownCapability.outcome, null);
  assert.equal(unknownCapability.truncated, true);
});

test("Workspace entities use only the canonical Universal Finding adapter", () => {
  const a = finding("uf:test:entity", { label: "ממצא" });
  const bundle = bundleWithCapabilities([capabilityResult({ key: "gematria", findings: [a] })]);
  const result = researchEntitiesFromResultBundle(bundle, [a.id]);

  assert.equal(result.entities.length, 1);
  assert.equal(result.entities[0].id, a.id);
  assert.equal(result.entities[0].type, "finding");
  assert.equal(result.entities[0].finding, a);
  assert.equal(result.entities[0].title, "ממצא");
  assert.equal("bundle" in result.entities[0], false);
  assert.equal("synthesis" in result.entities[0], false);
});

test("a Finding filtered at the Bundle access boundary cannot be selected later", () => {
  const privateFinding = finding("uf:test:private", { tier: "private" });
  const bundle = bundleWithCapabilities([capabilityResult({
    key: "research_objects",
    accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
    findings: [privateFinding],
  })]);

  assert.equal(bundle.findings.length, 0);
  assert.equal(bundle.capability_trace[0].access_filtered.count, 1);
  assert.deepEqual(selectResearchResultFindings(bundle, [privateFinding.id]), {
    findings: [], selectedIds: [], missingIds: [privateFinding.id],
  });
});

test("access-filtered trace refs never become durable Path provenance", () => {
  const visible = finding("uf:test:visible");
  const privateFinding = finding("uf:test:private-sibling", { tier: "private" });
  const bundle = bundleWithCapabilities([capabilityResult({
    key: "research_objects",
    accessClass: ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED,
    findings: [visible, privateFinding],
    reason: "private:secret-reason",
    sourceRefs: ["source:visible", "private:secret-row"],
    versionRefs: ["research:v1", "private:secret-version"],
  })]);

  assert.deepEqual(bundle.capability_trace[0].finding_ids, [visible.id]);
  assert.equal(bundle.capability_trace[0].access_filtered.count, 1);
  const result = researchPathOutcomeFromResultBundle(bundle, {
    capabilityKey: "research_objects",
    findingIds: [visible.id, privateFinding.id],
  });
  assert.deepEqual(result.selectedIds, [visible.id]);
  assert.deepEqual(result.missingIds, [privateFinding.id]);
  assert.deepEqual(result.outcome, {
    capability_key: "research_objects",
    outcome_status: "executed",
    finding_refs: [visible.id],
    source_refs: [],
    version_refs: [],
  });
  assert.doesNotMatch(JSON.stringify(result.outcome), /secret|private:/);
});

test("Path outcome selects Findings only from the requested capability", () => {
  const relation = finding("uf:test:relation");
  const numeric = finding("uf:test:numeric");
  const bundle = bundleWithCapabilities([
    capabilityResult({
      key: "gematria_relations",
      findings: [relation],
      sourceRefs: ["source:one", "source:one", "source:two"],
      versionRefs: ["method:v1", "method:v1"],
    }),
    capabilityResult({ key: "numeric", findings: [numeric] }),
  ]);

  const result = researchPathOutcomeFromResultBundle(bundle, {
    capabilityKey: "gematria_relations",
    findingIds: [numeric.id, relation.id],
  });

  assert.deepEqual(result.selectedIds, [relation.id]);
  assert.deepEqual(result.missingIds, [numeric.id]);
  assert.deepEqual(result.outcome, {
    capability_key: "gematria_relations",
    outcome_status: "executed",
    finding_refs: [relation.id],
    source_refs: ["source:one", "source:two"],
    version_refs: ["method:v1"],
  });
  assert.ok(new TextEncoder().encode(JSON.stringify(result.outcome)).byteLength <= 24_000);
  assert.doesNotMatch(JSON.stringify(result.outcome), /synthesis|authorization|bounded test/);

  const unselected = researchPathOutcomeFromResultBundle(bundle, {
    capabilityKey: "gematria_relations",
  });
  assert.equal(unselected.outcome, null, "unselected positive results are not executed-empty");
});

test("Bundle outcome survives Path build, save acknowledgement and resume", () => {
  const relation = finding("uf:test:path-round-trip");
  const bundle = bundleWithCapabilities([capabilityResult({
    key: "gematria_relations",
    findings: [relation],
    sourceRefs: ["source:pair"],
    versionRefs: ["relation:v1"],
  })]);
  const projected = researchPathOutcomeFromResultBundle(bundle, {
    capabilityKey: "gematria_relations",
    findingIds: [relation.id],
  });
  const context = {
    subject: { id: "358", type: "number", label: "358", href: "/2029/number/358" },
    selection: { entityId: "358", entityType: "number" },
  };
  const started = continueResearchPathContext(context, {
    surface: "number",
  });
  const enriched = continueResearchPathContext(started.context, {
    surface: "number",
    outcome: projected.outcome,
  });
  assert.equal(enriched.ok, true);
  assert.equal(enriched.changed, false, "same navigation step is enriched rather than duplicated");
  const steps = researchPathStepsForSave(enriched.context);
  assert.equal(steps.length, 1);
  assert.deepEqual(steps[0].finding_refs, [relation.id]);
  assert.equal(researchPathPendingStepsAcknowledged(steps, JSON.parse(JSON.stringify(steps))), true);

  const resumed = contextFromResearchPathSnapshot({
    ok: true,
    path_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    revision_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    revision_no: 1,
    steps,
    representation: buildResearchPathRepresentation(enriched.context),
  });
  assert.deepEqual(resumed.journey.lastSavedStep.finding_refs, [relation.id]);
  assert.deepEqual(resumed.journey.lastSavedStep.source_refs, ["source:pair"]);
  assert.equal(resumed.access, null);
});

test("negative and missing-adapter outcomes retain honest scope without positive Findings", () => {
  const negativeBundle = bundleWithCapabilities([capabilityResult({
    key: "gematria_relations",
    status: CAPABILITY_STATUS.NEGATIVE_RESULT,
    reason: "no relation in the bounded pair search",
    negativeScope: { pair_count: 1, operation: "direct_pair" },
    findings: [],
    sourceRefs: ["source:pair"],
    versionRefs: ["relation:v1"],
  })]);
  const negative = researchPathOutcomeFromResultBundle(negativeBundle, {
    capabilityKey: "gematria_relations",
    findingIds: ["uf:not-present"],
  });
  assert.deepEqual(negative.outcome, {
    capability_key: "gematria_relations",
    outcome_status: "negative_result",
    finding_refs: [],
    source_refs: ["source:pair"],
    version_refs: ["relation:v1"],
    reason: "no relation in the bounded pair search",
    negative_scope: { pair_count: 1, operation: "direct_pair" },
  });
  assert.deepEqual(negative.selectedIds, []);

  const missingBundle = bundleWithCapabilities([capabilityResult({
    key: "els",
    status: CAPABILITY_STATUS.MISSING_ADAPTER,
    reason: "adapter unavailable",
  })]);
  assert.deepEqual(
    researchPathOutcomeFromResultBundle(missingBundle, { capabilityKey: "els" }).outcome,
    {
      capability_key: "els",
      outcome_status: "missing_adapter",
      finding_refs: [],
      source_refs: [],
      version_refs: [],
      reason: "adapter unavailable",
    }
  );

  const executedEmpty = bundleWithCapabilities([capabilityResult({
    key: "numeric",
    status: CAPABILITY_STATUS.EXECUTED,
    findings: [],
    sourceRefs: ["number:999"],
  })]);
  assert.deepEqual(
    researchPathOutcomeFromResultBundle(executedEmpty, { capabilityKey: "numeric" }).outcome,
    {
      capability_key: "numeric",
      outcome_status: "executed",
      finding_refs: [],
      source_refs: ["number:999"],
      version_refs: [],
    },
    "genuine executed-empty remains representable"
  );
});

test("Path projection rejects truncated provenance and authorization-bearing negative scope", () => {
  const item = finding("uf:test:bounded");
  const refs = Array.from({ length: 250 }, (_, index) => `source:${index}`);
  const bundle = bundleWithCapabilities([capabilityResult({
    key: "numeric",
    findings: [item],
    sourceRefs: [...refs, `source:${"x".repeat(2_049)}`],
    versionRefs: refs.map((_, index) => `version:${index}`),
  })]);
  const bounded = researchPathOutcomeFromResultBundle(bundle, {
    capabilityKey: "numeric",
    findingIds: [item.id],
  });
  assert.equal(bounded.outcome, null, "partial provenance is never persisted silently");
  assert.equal(bounded.truncated, true);

  const malformedRefs = bundleWithCapabilities([capabilityResult({
    key: "numeric",
    findings: [item],
    sourceRefs: ["source:valid", { authorization_context: { token: "secret" } }],
  })]);
  const malformed = researchPathOutcomeFromResultBundle(malformedRefs, {
    capabilityKey: "numeric",
    findingIds: [item.id],
  });
  assert.equal(malformed.outcome, null, "unsupported refs fail closed instead of being omitted");
  assert.equal(malformed.truncated, true);

  const denseRefs = Array.from(
    { length: 200 },
    (_, index) => `source:${index}:${"x".repeat(120)}`
  );
  const oversizedOutcome = bundleWithCapabilities([capabilityResult({
    key: "numeric",
    findings: [item],
    sourceRefs: denseRefs,
    versionRefs: denseRefs.map((ref) => ref.replace("source:", "version:")),
  })]);
  const oversized = researchPathOutcomeFromResultBundle(oversizedOutcome, {
    capabilityKey: "numeric",
    findingIds: [item.id],
  });
  assert.equal(oversized.outcome, null, "a single outcome keeps headroom below the Path RPC budget");
  assert.equal(oversized.truncated, true);

  const unsafeNegative = bundleWithCapabilities([capabilityResult({
    key: "numeric",
    status: CAPABILITY_STATUS.NEGATIVE_RESULT,
    reason: "not found",
    negativeScope: { limit: 10, nested: { authorizationContext: { token: "secret" } } },
  })]);
  assert.deepEqual(
    researchPathOutcomeFromResultBundle(unsafeNegative, { capabilityKey: "numeric" }),
    { outcome: null, selectedIds: [], missingIds: [] }
  );
});

test("non-composed or unknown capability input fails closed", () => {
  const fake = { findings: [finding("uf:fake")], capability_trace: [] };
  assert.deepEqual(selectResearchResultFindings(fake, ["uf:fake"]), {
    findings: [], selectedIds: [], missingIds: ["uf:fake"],
  });
  assert.deepEqual(
    researchPathOutcomeFromResultBundle(fake, { capabilityKey: "gematria", findingIds: ["uf:fake"] }),
    { outcome: null, selectedIds: [], missingIds: ["uf:fake"] }
  );
});
