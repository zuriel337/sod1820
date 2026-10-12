import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExactReturnPatch, mergeResearchContext, normalizeResearchContext, researchContextNumber } from './researchContext.js';
import { continueResearchPathContext } from './researchPathRuntime.js';
const origin = { href: '/world#world-discovery-wall--wall-clock', subject: { id: 'gallery:wall', type: 'source' }, selection: { entityType: 'image', sourceRef: 'gallery:wall', locator: '#wall' }, dimensions: { viewport: 'wall', surfaceFocus: { type: 'source', number: null } } };
const number = { subject: { id: '424', type: 'number' }, selection: { expression: 'דונלד טראמפ', method: 'רגיל', resultValue: 424 }, dimensions: { numberPanel: true }, returnTo: origin };
const start = context => continueResearchPathContext(context, { surface: 'number' }).context;
const back = context => mergeResearchContext(context, buildExactReturnPatch(context));
test('no start does not create a Path; exact source/viewport replaces destination state', () => {
 const result = back(number); assert.equal(result.journey, null); assert.equal(result.returnTo, null);
 assert.equal(result.selection.sourceRef, 'gallery:wall'); assert.equal(result.dimensions.viewport, 'wall'); assert.equal(result.dimensions.numberPanel, undefined);
});
test('Path started after departure survives return and JSON reload with both chosen steps', () => {
 const active = start(number), result = back(active);
 assert.deepEqual(result.journey, active.journey); assert.equal(result.journey.pendingSteps.length, 2);
 assert.equal(result.dimensions.journey2029Active, true);
 assert.deepEqual(normalizeResearchContext(JSON.parse(JSON.stringify(result))), result);
});
test('same Path uses current revision and pending choices, not captured revision', () => {
 const active = start(number); const old = { ...active.journey, id: 'path-A', revisionId: 'r1', revisionNo: 1, position: 0 };
 const current = { ...active, journey: { ...old, revisionId: 'r3', revisionNo: 3, position: 2 }, returnTo: { ...origin, journey: old, dimensions: { ...origin.dimensions, journey2029Mode: 'old' } } };
 const result = back(current); assert.deepEqual(result.journey, normalizeResearchContext(current).journey); assert.equal(result.journey.revisionNo, 3);
 assert.equal(result.dimensions.journey2029Mode, active.dimensions.journey2029Mode);
});
test('explicit replacement/fork keeps current identity without mixing old Path fields', () => {
 const active = start(number), current = { ...active, journey: { ...active.journey, id: 'path-B', revisionNo: 1 }, returnTo: { ...origin, journey: { id: 'path-A', kind: 'research_path', revisionNo: 9, findingId: 'old-finding' } } };
 const result = back(current); assert.equal(result.journey.id, 'path-B'); assert.equal(result.journey.revisionNo, 1); assert.equal(result.journey.findingId, null);
});
test('explicit null or inactive Path must not be resurrected by return snapshot', () => {
 const active = start(number), target = { ...origin, journey: active.journey, dimensions: { ...origin.dimensions, journey2029Active: true, journey2029Mode: 'organic' } };
 for (const current of [{...active, journey:null, returnTo:target}, {...active, dimensions:{...active.dimensions,journey2029Active:false},returnTo:target}]) {
  const result=back(current); assert.equal(result.journey,null); assert.notEqual(result.dimensions.journey2029Active,true); assert.equal(result.dimensions.journey2029Mode,undefined);
 }
});
test('non-Path exact-return retains original snapshot semantics', () => {
 const current={...number,journey:{id:'current',kind:'golden',position:9},returnTo:{...origin,journey:{id:'source',kind:'source-path',position:4}}};
 assert.equal(back(current).journey.id,'source'); assert.equal(back(current).journey.position,4);
});
test('numeric admission rejects empty/coerced identities while preserving real zero', () => {
 for(const raw of [null,undefined,'','  ',false,true,[],{},NaN,Infinity,'image-id']) assert.equal(researchContextNumber(raw),null,`${String(raw)} is not a number`);
 for(const raw of [0,'0',' 0 ']) assert.equal(researchContextNumber(raw),0);
 assert.equal(researchContextNumber('424'),424);
 for(const raw of [null,'',' ',false]) {
  const context=normalizeResearchContext({subject:number.subject,selection:{resultValue:raw},dimensions:{surfaceFocus:{id:'source',number:raw,resultValue:raw},readingFocus:{id:'source',number:raw}}});
  assert.equal(context.dimensions.surfaceFocus.number,undefined); assert.equal(context.dimensions.readingFocus.number,undefined); assert.equal(context.selection?.resultValue ?? null,null);
 }
 assert.equal(normalizeResearchContext({dimensions:{surfaceFocus:{id:'zero',number:0}}}).dimensions.surfaceFocus.number,0);
});
