import test from "node:test";
import assert from "node:assert/strict";
import { CLIENT_GEMATRIA_METHODS, calculateGematriaEnvelope } from "./gematriaCalculationContract.js";

const SAMPLE = "התגלות";

test("projection contract preserves every existing client calculation exactly", () => {
  const envelope = calculateGematriaEnvelope(SAMPLE);
  assert.equal(envelope.results.length, CLIENT_GEMATRIA_METHODS.length);

  for (const method of CLIENT_GEMATRIA_METHODS) {
    const projected = envelope.results.find(row => row.methodKey === method.key);
    assert.ok(projected, `missing method ${method.key}`);
    assert.equal(projected.value, method.fn(SAMPLE), `value drift for ${method.key}`);
    assert.equal(projected.key, method.key);
  }
});

test("registry unavailable remains UNKNOWN rather than fabricating false state", () => {
  const [result] = calculateGematriaEnvelope("א").results;
  assert.equal(result.methodState.registryAvailable, false);
  assert.equal(result.methodState.registered, null);
  assert.equal(result.methodState.active, null);
  assert.equal(result.methodState.engineVerified, null);
  assert.equal(result.methodState.scannable, null);
  assert.equal(result.access.requiredEntitlement, null);
  assert.equal(result.access.accessible, null);
});

test("registry axes stay separate and method identity/version are preserved", () => {
  const method = CLIENT_GEMATRIA_METHODS[0];
  const states = [{
    method_key: method.key,
    registered: true,
    active: true,
    in_engine_declared: false,
    executable: true,
    engine_verified: true,
    scannable: false,
    method_version: 7,
    required_entitlement: "public",
    execution_kind: "sql_function",
    operator: null,
  }];

  const result = calculateGematriaEnvelope("א", states).results.find(row => row.methodKey === method.key);
  assert.equal(result.methodVersion, 7);
  assert.equal(result.methodState.registered, true);
  assert.equal(result.methodState.active, true);
  assert.equal(result.methodState.inEngineDeclared, false);
  assert.equal(result.methodState.executable, true);
  assert.equal(result.methodState.engineVerified, true);
  assert.equal(result.methodState.scannable, false);
  assert.equal(result.access.requiredEntitlement, "public");
  assert.equal(result.access.accessible, null);
  assert.equal(result.projection.displayed, true);
});

test("storage capability never fabricates that this particular result is stored", () => {
  const methodWithColumn = CLIENT_GEMATRIA_METHODS.find(method => method.col);
  assert.ok(methodWithColumn, "expected at least one client method with a storage column hint");
  const result = calculateGematriaEnvelope("א").results.find(row => row.methodKey === methodWithColumn.key);
  assert.equal(result.storage.storageCapable, true);
  assert.equal(result.storage.dbColumnHint, methodWithColumn.col);
  assert.equal(result.storage.stored, null);
});

test("representation keeps raw input separate from canonical normalization", () => {
  const envelope = calculateGematriaEnvelope("  הִתְגַּלּוּת,  ");
  assert.equal(envelope.input.raw, "  הִתְגַּלּוּת,  ");
  assert.equal(envelope.input.normalized, "התגלות");
  assert.notEqual(envelope.input.raw, envelope.input.normalized);
});
