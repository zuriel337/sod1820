import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWriterIndex, resolveWriter } from '../src/lib/writers.js';
const row=(id,slug,display_name,merged_into=null)=>({id,slug,display_name,merged_into,active:true});
const target=row('id-main','main-slug','Main'),alias=row('id-old','old-slug','Old','main-slug');
test('native slug pointer resolves the same canonical writer and retains original attribution',()=>{
 const original=[{...target},{...alias}],before=structuredClone(original);
 const found=resolveWriter('Old',buildWriterIndex(original));
 assert.equal(found.state,'matched');assert.equal(found.canonical.id,target.id);
 assert.equal(found.contributor.id,alias.id);assert.equal(found.mergedFrom.id,alias.id);
 assert.deepEqual(original,before,'reader never mutates identities');
});
test('historical UUID pointer still resolves; absence of bySlug in old caller index is compatible',()=>{
 const index=buildWriterIndex([target,{...alias,merged_into:target.id}]);delete index.bySlug;
 assert.equal(resolveWriter('Old',index).canonical.id,target.id);
});
test('missing and inactive merge targets never become canonical aliases',()=>{
 for(const rows of [[alias],[alias,{...target,active:false}]]) {
  const result=resolveWriter('Old',buildWriterIndex(rows));
  assert.equal(result.state,'unknown');assert.equal(result.canonical,null);assert.equal(result.raw,'Old');
 }
});
test('self-links and multi-row cycles fail closed instead of returning a member of the cycle',()=>{
 for(const rows of [[{...alias,merged_into:alias.slug}],
  [alias,{...target,merged_into:alias.slug}]]) assert.equal(resolveWriter('Old',buildWriterIndex(rows)).state,'unknown');
});
test('duplicate slug and UUID/slug pointer collisions remain unresolved',()=>{
 for(const extra of [row('id-duplicate',target.slug,'Other'),row(target.slug,'other-slug','Other')]) {
  const result=resolveWriter('Old',buildWriterIndex([alias,target,extra]));
  assert.equal(result.state,'unknown');assert.equal(result.canonical,null);
 }
});
test('a real alias chain follows explicit links; shared display names still need Human Gate',()=>{
 const middle=row('id-middle','middle-slug','Middle',target.slug);
 assert.equal(resolveWriter('Old',buildWriterIndex([target,middle,{...alias,merged_into:middle.slug}])).canonical.id,target.id);
 assert.equal(resolveWriter('Main',buildWriterIndex([target,{...alias,display_name:'Main'}])).state,'ambiguous');
});
