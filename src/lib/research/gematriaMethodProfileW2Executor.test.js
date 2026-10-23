import test from "node:test";
import assert from "node:assert/strict";

import {
  createGematriaMethodProfileW2Executor,
  GEMATRIA_METHOD_PROFILE_ADAPTER_VERSION,
  GEMATRIA_METHOD_PROFILE_MAX_METHODS,
} from "./gematriaMethodProfileW2Executor.js";
import { ACCESS_CLASS, CAPABILITY_STATUS } from "./researchResultBundle.js";

function rows(count = 15) {
  return Array.from({ length: count }, (_, index) => ({
    method_key: index === 0 ? "ragil" : `method_${index + 1}`,
    display_label: index === 0 ? "רגיל" : `שיטה ${index + 1}`,
    computed_value: index === 0 ? 73 : 100 + index,
    category: index < 5 ? "יסוד" : "מורחב",
    mathematical_family: index === 0 ? "regular" : `family_${index + 1}`,
    atomic_or_composite: index % 2 ? "composite" : "atomic",
    definition_version: 6,
  }));
}

function identityResolution(label = "חכמה") {
  return {
    text_calculation_allowed: true,
    identities: [{ type: "phrase", key: `phrase:${label}`, label }],
  };
}

test("method-profile adapter reads the complete calculator map in one caller-scoped RPC", async () => {
  const calls = [];
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: rows(15), error: null };
    },
  };
  const result = await createGematriaMethodProfileW2Executor({ supabase })({
    identityResolution: identityResolution(),
  });

  assert.deepEqual(calls, [{ name: "fn_method_profile", args: { p_phrase: "חכמה", p_depth: "value" } }]);
  assert.equal(result.status, CAPABILITY_STATUS.EXECUTED);
  assert.equal(result.accessClass, ACCESS_CLASS.PUBLIC_SOURCE);
  assert.equal(result.findings.length, 15);
  assert.equal(result.cost.ai_calls, 0);
  assert.equal(result.cost.rpc_calls, 1);
  assert.equal(result.bounded.truncated, false);
  assert.equal(result.versionRefs.includes(GEMATRIA_METHOD_PROFILE_ADAPTER_VERSION), true);
  assert.deepEqual(result.findings[0].evidence.facts[0], {
    type: "gematria-method-profile-value",
    method: "ragil",
    label: "רגיל",
    value: 73,
    category: "יסוד",
    mathematical_family: "regular",
    atomic_or_composite: "atomic",
    method_version: 6,
    derived_from: [],
    dependency_rules: [],
    dependency_version: null,
  });
  assert.ok(result.findings.every((finding) => finding.kind === "gematria-method-value"));
  assert.ok(result.findings.every((finding) => finding.provenance.createdBy === "ENGINE:fn_method_profile"));
});

test("method-profile adapter attaches canonical dependency metadata without making it calculation truth", async () => {
  const calls = [];
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: rows(2), error: null };
    },
  };
  const result = await createGematriaMethodProfileW2Executor({
    supabase,
    readMethodRegistry: async () => ({
      status: "available",
      rows: [{
        method_key: "ragil",
        derived_from: [],
        dependency_rules: [{ to: "gadol", type: "conditional_equivalence", condition: "no_final_letters", note: "must not cross" }],
        dependency_version: 2,
      }],
    }),
  })({ identityResolution: identityResolution() });

  assert.equal(calls.length, 1);
  assert.equal(result.cost.rpc_calls, 1);
  assert.equal(result.cost.rest_calls, 1);
  assert.equal(result.trace.registry_status, "available");
  assert.deepEqual(result.findings[0].evidence.facts[0].dependency_rules, [{
    type: "conditional_equivalence",
    to: "gadol",
    condition: "no_final_letters",
    operator: null,
    components: [],
  }]);
  assert.equal(result.findings[0].evidence.facts[0].dependency_version, 2);
  assert.doesNotMatch(JSON.stringify(result), /must not cross/);
});

test("method-profile adapter is explicitly bounded and reports truncation", async () => {
  const supabase = { rpc: async () => ({ data: rows(40), error: null }) };
  const result = await createGematriaMethodProfileW2Executor({ supabase })({
    identityResolution: identityResolution(),
  });

  assert.equal(result.findings.length, GEMATRIA_METHOD_PROFILE_MAX_METHODS);
  assert.deepEqual(result.bounded, {
    total_count: 40,
    returned_count: GEMATRIA_METHOD_PROFILE_MAX_METHODS,
    truncated: true,
    ordering: "fn_method_profile_registry_order",
    continuation: null,
  });
});

test("method-profile adapter fails closed before I/O without an eligible expression", async () => {
  let calls = 0;
  const supabase = { rpc: async () => { calls += 1; return { data: rows(), error: null }; } };
  const result = await createGematriaMethodProfileW2Executor({ supabase })({
    identityResolution: { text_calculation_allowed: false, identities: [] },
  });

  assert.equal(result.status, CAPABILITY_STATUS.SKIPPED);
  assert.equal(result.findings.length, 0);
  assert.equal(result.cost.rpc_calls, 0);
  assert.equal(calls, 0);
});
