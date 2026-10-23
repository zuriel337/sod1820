import test from "node:test";
import assert from "node:assert/strict";
import { SPATIAL_FRAMEWORK, SPATIAL_MODELS } from "./spatialModels.js";

const bySlug = Object.fromEntries(SPATIAL_MODELS.map((model) => [model.slug, model]));

test("spatial framework v3 curates twelve unique live-corpus model identities", () => {
  assert.equal(SPATIAL_FRAMEWORK.version, 3);
  assert.equal(SPATIAL_MODELS.length, 12);
  assert.equal(new Set(SPATIAL_MODELS.map((model) => model.slug)).size, 12);
  assert.deepEqual(SPATIAL_FRAMEWORK.sections.map((item) => item.key), ["selected", "solids", "complex", "series"]);
});

test("every model separates source claim, calculation, geometry, visual provenance and interpretation", () => {
  for (const model of SPATIAL_MODELS) {
    assert.ok(model.sourceClaims.length, `${model.slug}: source claim`);
    assert.ok(model.gematria.length, `${model.slug}: gematria inputs`);
    assert.ok(model.spatial.operations.length, `${model.slug}: deterministic operations`);
    assert.ok(model.spatial.structuralProperties.length, `${model.slug}: geometry`);
    assert.ok(model.spatial.provenance.refs.length, `${model.slug}: exact source refs`);
    assert.equal(typeof model.interpretation, "string", `${model.slug}: interpretation`);
  }
});

test("1254 keeps deterministic cube arithmetic separate from its unverified corpus-count claim", () => {
  const model = bySlug["matamim-cube-1254"];
  assert.deepEqual(model.spatial.operations[0], { operationKey: "multiply", expression: "6 × 209", factors: [6, 209], result: 1254 });
  assert.match(model.sourceClaims[0], /דורשת בדיקת קורפוס/);
});

test("3060 stays one compound cluster with five paths and preserved occurrences", () => {
  const model = bySlug["yesharim-3060-family"];
  assert.equal(model.spatial.operations.length, 5);
  assert.equal(model.spatial.provenance.refs.length, 6);
  assert.equal(model.spatial.provenance.duplicateRefs.length, 1);
});

test("exact duplicate occurrences remain in provenance instead of being deleted", () => {
  const model = bySlug["emunah-brit-cube-612"];
  assert.ok(model.spatial.provenance.refs.includes("channel_updates:710edaf6-440a-4e40-931c-b1626503d744"));
  assert.ok(model.spatial.provenance.duplicateRefs.includes("channel_updates:710edaf6-440a-4e40-931c-b1626503d744"));
});

test("pi is absent from spatial models and belongs to the separate constants series", () => {
  assert.equal(SPATIAL_MODELS.some((model) => /π|פאי/u.test(JSON.stringify(model))), false);
});
