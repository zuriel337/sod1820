import test from 'node:test';
import assert from 'node:assert/strict';
import { SPATIAL_FRAMEWORK, SPATIAL_MODELS } from './spatialModels.js';

const bySlug = Object.fromEntries(SPATIAL_MODELS.map(m => [m.slug, m]));

test('Spatial framework is v2 and model slugs are unique', () => {
  assert.equal(SPATIAL_FRAMEWORK.version, 2);
  assert.equal(new Set(SPATIAL_MODELS.map(m => m.slug)).size, SPATIAL_MODELS.length);
});

test('Zvi 1254 cube preserves geometry-derived quantity provenance', () => {
  const m = bySlug['matamim-cube-1254'];
  assert.equal(m.value, 1254);
  assert.equal(m.spatial.structuralProperties[0].key, 'faces');
  assert.equal(m.spatial.structuralProperties[0].value, 6);
  assert.deepEqual(m.spatial.operations[0], { operationKey: 'multiply', expression: '6 × 209', result: 1254 });
});

test('Zvi 3060 is one spatial model with five independent convergence paths', () => {
  const m = bySlug['yesharim-cube-3060'];
  assert.equal(m.value, 3060);
  assert.equal(m.spatial.operations.length, 5);
  assert.equal(m.spatial.convergences[0].independentPaths, 5);
  assert.deepEqual(m.spatial.regions.map(r => r.role), ['outer_pentagon', 'inner_pentagon', 'nested_triangles']);
});

test('Zvi 612 keeps source-declared six-direction orientation', () => {
  const m = bySlug['emunah-cube-612'];
  const directions = m.spatial.structuralProperties.find(p => p.key === 'directions');
  assert.equal(directions.value, 6);
  assert.deepEqual(directions.labels, ['צפון', 'דרום', 'מזרח', 'מערב', 'למעלה', 'למטה']);
  assert.equal(m.spatial.operations[0].result, 612);
});

test('all v2 models keep interpretation separate from spatial facts', () => {
  for (const m of SPATIAL_MODELS) {
    assert.ok(m.spatial, `${m.slug}: missing spatial contract`);
    assert.equal(typeof m.midrash, 'string', `${m.slug}: missing interpretation layer`);
    assert.ok(m.spatial.provenance, `${m.slug}: missing provenance`);
  }
});
