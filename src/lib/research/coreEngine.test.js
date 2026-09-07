import test from "node:test";
import assert from "node:assert/strict";
import { computeEntity, METHOD_KEYS, PRIMARY } from "./coreEngine.js";
import { calculateGematriaEnvelope, CLIENT_GEMATRIA_METHODS } from "./gematriaCalculationContract.js";

const SAMPLE = "התגלות";

test("coreEngine preserves the legacy primary/values projection from the canonical envelope", () => {
  const core = computeEntity(SAMPLE);
  const envelope = calculateGematriaEnvelope(SAMPLE);
  const expectedValues = Object.fromEntries(envelope.results.map(r => [r.methodKey, r.value || 0]));

  assert.deepEqual(core.values, expectedValues);
  assert.equal(core.primary, expectedValues[PRIMARY] || 0);
  assert.equal(core.calculation.contract, "gematria_calculation_projection_v1");
});

test("coreEngine method keys derive from the canonical client method projection", () => {
  assert.deepEqual(METHOD_KEYS, CLIENT_GEMATRIA_METHODS.map(m => m.key));
});

test("coreEngine carries supplied Registry state without changing numeric results", () => {
  const baseline = computeEntity(SAMPLE);
  const states = [{
    method_key: PRIMARY,
    registered: true,
    active: true,
    in_engine_declared: true,
    executable: true,
    engine_verified: true,
    scannable: true,
    method_version: 7,
    required_entitlement: "public",
  }];
  const withState = computeEntity(SAMPLE, states);

  assert.deepEqual(withState.values, baseline.values);
  const primaryResult = withState.calculation.results.find(r => r.methodKey === PRIMARY);
  assert.equal(primaryResult.methodVersion, 7);
  assert.equal(primaryResult.methodState.engineVerified, true);
});
