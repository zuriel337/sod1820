import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plan, verify, NATIVE_FILE } from '../scripts/els-browser-shards.mjs';

const manifest = plan(readFileSync(NATIVE_FILE, 'utf8'));
const reports = () => manifest.groups.map((passed, i) => ({ shard: i + 1, sourceHash: manifest.sourceHash, ok: true, passed: [...passed] }));
test('the real native suite is partitioned completely, disjointly and evenly', () => {
  verify(manifest, reports());
  assert.ok(Math.max(...manifest.groups.map(g => g.length)) - Math.min(...manifest.groups.map(g => g.length)) <= 1);
});
test('aggregation rejects missing, duplicate, stale, failed, skipped and extra coverage', () => {
  for (const mutate of [r => r.pop(), r => { r[1] = r[0]; }, r => { r[0].sourceHash = 'old'; },
    r => { r[0].ok = false; }, r => r[0].passed.pop(), r => r[0].passed.push(r[0].passed[0]),
    r => r[0].passed.push('unassigned')]) {
    const result = reports(); mutate(result); assert.throws(() => verify(manifest, result));
  }
});
test('new dynamic, duplicate or focused registrations fail closed', () => {
  for (const source of ["test.only('new', () => {});", "for (const name of ['new']) test(name, () => {});", "test(`dynamic`, () => {});",
    "const alias = test; alias('hidden', () => {});", "const { test: alias } = await import('node:test'); alias('hidden', () => {});"])
    assert.throws(() => plan(readFileSync(NATIVE_FILE, 'utf8') + '\n' + source));
  assert.throws(() => plan("import test from 'node:test'; test('same',()=>{}); test('same',()=>{}); test('third',()=>{});"));
});
