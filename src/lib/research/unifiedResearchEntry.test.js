import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUnifiedResearchEntry,
  classifyUnifiedResearchInput,
  INPUT_KIND,
} from "./unifiedResearchEntry.js";
import {
  RESEARCH_PROFILE,
  resolveResearchProfile,
} from "./researchProfiles.js";
import { RESEARCH_CAPABILITY } from "./researchPlanV2.js";

test("one front door classifies core input kinds without executing domain truth", () => {
  assert.equal(classifyUnifiedResearchInput({ text: "1426" }), INPUT_KIND.NUMBER);
  assert.equal(classifyUnifiedResearchInput({ text: "אוראל" }), INPUT_KIND.EXPRESSION);
  assert.equal(classifyUnifiedResearchInput({ text: "האם יש קשר בין 1426 לאסתר?" }), INPUT_KIND.QUESTION);
  assert.equal(classifyUnifiedResearchInput({ text: "2008-08-28" }), INPUT_KIND.DATE);
  assert.equal(classifyUnifiedResearchInput({ personRef: "person:abc:self" }), INPUT_KIND.PERSON_REF);
  assert.equal(classifyUnifiedResearchInput({ mediaRef: "asset:1" }), INPUT_KIND.MEDIA);
  assert.equal(classifyUnifiedResearchInput({ mediaRef: "asset:1", text: "בדוק את זה" }), INPUT_KIND.MIXED);
});

test("number input resolves to Number research + Quick Inspect/full page projection", () => {
  const out = buildUnifiedResearchEntry({ input: { text: "1426" } });
  assert.equal(out.input_kind, INPUT_KIND.NUMBER);
  assert.equal(out.identity_resolution.primary.type, "number");
  assert.ok(out.plan.requested_capabilities.includes(RESEARCH_CAPABILITY.NUMERIC));
  assert.equal(out.projection.default_destination, "inspect");
  assert.equal(out.projection.destinations.full, true);
  assert.equal(out.projection.destinations.full_href, "/2029/number/1426");
  assert.equal(out.invariants.no_super_engine, true);
});

test("expression input routes to expression/name + sources, not to a second legacy NameLab authority", () => {
  const out = buildUnifiedResearchEntry({ input: { text: "אוראל" } });
  assert.equal(out.input_kind, INPUT_KIND.EXPRESSION);
  assert.equal(out.identity_resolution.primary.type, "phrase");
  assert.ok(out.plan.requested_capabilities.includes(RESEARCH_CAPABILITY.NAME));
  assert.ok(out.plan.requested_capabilities.includes(RESEARCH_CAPABILITY.SOURCES));
  assert.ok(out.plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA));
  assert.equal(out.invariants.legacy_namelab_is_not_architecture_authority, true);
});

test("free-form question does not automatically calculate the whole question as Gematria", () => {
  const out = buildUnifiedResearchEntry({
    input: { text: "האם יש קשר בין 1426 לאסתר?" },
  });
  assert.equal(out.input_kind, INPUT_KIND.QUESTION);
  assert.equal(out.identity_resolution.explicit_text_computation, false);
  assert.equal(out.plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA), false);
  assert.equal(out.projection.destinations.raziel, true);
});

test("media goes to Intake first; extracted material is required to re-enter the same chain", () => {
  const out = buildUnifiedResearchEntry({ input: { mediaRef: "asset:abc" } });
  assert.equal(out.input_kind, INPUT_KIND.MEDIA);
  assert.equal(out.plan, null);
  assert.equal(out.intake.required, true);
  assert.equal(out.projection.default_destination, "intake");
  assert.match(out.intake.boundary, /re-enters the same resolver\/plan chain/);
});

test("person ref stays semantic Person identity and does not become free-text calculation", () => {
  const out = buildUnifiedResearchEntry({
    input: { personRef: "person:123:self", personLabel: "דוד" },
  });
  assert.equal(out.identity_resolution.primary.type, "person");
  assert.equal(out.identity_resolution.text_calculation_allowed, false);
  assert.ok(out.plan.requested_capabilities.includes(RESEARCH_CAPABILITY.PERSON));
  assert.equal(out.plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA), false);
});

test("Research Profiles constrain retrieval/depth only and never truth/access authority", () => {
  const quick = resolveResearchProfile(RESEARCH_PROFILE.QUICK);
  const deep = resolveResearchProfile(RESEARCH_PROFILE.DEEP);
  const research = resolveResearchProfile(RESEARCH_PROFILE.RESEARCH);

  assert.equal(quick.depth, "quick");
  assert.equal(quick.secondary_hints, false);
  assert.ok(deep.capabilities.length >= quick.capabilities.length);
  assert.equal(research.els, "plan_gated_with_controls");
  for (const profile of [quick, deep, research]) {
    assert.equal(profile.invariants.profile_changes_retrieval_not_truth, true);
    assert.equal(profile.invariants.profile_cannot_canonicalize_or_publish, true);
    assert.equal(profile.invariants.entitlement_is_external_to_profile, true);
  }
});

test("Custom profile is allowlist-only and cannot invent unknown capabilities", () => {
  const custom = resolveResearchProfile(RESEARCH_PROFILE.CUSTOM, {
    depth: "research",
    capabilities: [RESEARCH_CAPABILITY.GEMATRIA, "fake_super_engine", RESEARCH_CAPABILITY.ELS],
    reflection: true,
  });
  assert.deepEqual([...custom.capabilities].sort(), [RESEARCH_CAPABILITY.ELS, RESEARCH_CAPABILITY.GEMATRIA].sort());
  assert.equal(custom.reflection, true);
});

test("projection boundaries preserve shell semantics: sidebar navigation, bottom context/action, Raziel optional", () => {
  const out = buildUnifiedResearchEntry({ input: { text: "358" } });
  assert.equal(out.projection.boundaries.sidebar_is_navigation_not_research_router, true);
  assert.equal(out.projection.boundaries.bottom_surface_is_context_path_action_not_second_navigation, true);
  assert.equal(out.projection.boundaries.raziel_is_optional_consumer_not_engine, true);
  assert.equal(out.projection.boundaries.heichal_is_deep_mode_not_tool_owner, true);
  assert.equal(out.projection.boundaries.journey_is_path_not_truth_store, true);
});

test("unpunctuated commands/questions do not become whole-text Gematria expressions", () => {
  for (const text of ["לאן הולכים", "תבדוק את זה", "כמה זה שווה"]) {
    const out = buildUnifiedResearchEntry({ input: { text } });
    assert.equal(out.identity_resolution.explicit_text_computation, false, text);
    assert.equal(out.plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA), false, text);
  }
  const expression = buildUnifiedResearchEntry({ input: { text: "חרבות ברזל" } });
  assert.equal(expression.identity_resolution.explicit_text_computation, true);
  assert.equal(expression.plan.requested_capabilities.includes(RESEARCH_CAPABILITY.GEMATRIA), true);
});

test("number literals are canonical safe integers only", () => {
  assert.equal(classifyUnifiedResearchInput({ text: "007" }), INPUT_KIND.EXPRESSION);
  assert.equal(classifyUnifiedResearchInput({ text: "-5" }), INPUT_KIND.EXPRESSION);
  assert.equal(classifyUnifiedResearchInput({ text: "99999999999999999999999" }), INPUT_KIND.EXPRESSION);
  const safe = buildUnifiedResearchEntry({ input: { text: "1820" } });
  assert.equal(safe.projection.destinations.full_href, "/2029/number/1820");
});

test("mixed media+text is strictly Intake-first and does not build an evidence plan before extraction", () => {
  const out = buildUnifiedResearchEntry({
    input: { mediaRef: "asset:abc", text: "חרבות ברזל" },
  });
  assert.equal(out.input_kind, INPUT_KIND.MIXED);
  assert.equal(out.intake.required, true);
  assert.equal(out.plan, null);
  assert.equal(out.projection.default_destination, "intake");
});
