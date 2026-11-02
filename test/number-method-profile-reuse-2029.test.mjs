import test from 'node:test';
import assert from 'node:assert/strict';
import {createNumberMethodProfileReuse} from '../src/lib/research/numberMethodProfileReuse.js';

test('Back reuses the exact canonical rows only inside the fixed freshness window; reads do not extend it',()=>{
 let time=0;const cache=createNumberMethodProfileReuse({now:()=>time});const reader=cache.forReader('A');
 const rows=[{methodKey:'מילוי',computedValue:3928,definitionVersion:3}];reader.remember('אחת ארבע שבע ושתיים',rows);
 time=29_999;assert.strictEqual(reader.get('אחת ארבע שבע ושתיים'),rows);
 time=30_000;assert.equal(reader.get('אחת ארבע שבע ושתיים'),null);
});
test('switching accounts, logout, and returning to the same uid invalidate both rows and late response handles',()=>{
 const cache=createNumberMethodProfileReuse();const a=cache.forReader('A');a.remember('x',[1]);
 const b=cache.forReader('B');assert.equal(b.get('x'),null);a.remember('x',['late A']);assert.equal(b.get('x'),null);
 b.remember('x',[2]);cache.forReader(null);b.remember('x',['late B']);
 const aAgain=cache.forReader('A');assert.equal(aAgain.get('x'),null);a.remember('x',['old session']);assert.equal(aAgain.get('x'),null);
});
test('retry invalidates a previous success; failed/non-array reads cannot become measured empty or cached success',()=>{
 const reader=createNumberMethodProfileReuse().forReader('guest');reader.remember('x',[1]);reader.invalidate('x');
 assert.equal(reader.get('x'),null);reader.remember('x',null);assert.equal(reader.get('x'),null);
 reader.remember('x',[]);assert.deepEqual(reader.get('x'),[]);
});
test('reuse is expression-exact, bounded and fails closed after a backwards clock jump',()=>{
 let time=10;const reader=createNumberMethodProfileReuse({now:()=>time,limit:2}).forReader('A');
 reader.remember('א',[1]);reader.remember('ב',[2]);reader.remember('ג',[3]);assert.equal(reader.get('א'),null);assert.deepEqual(reader.get('ב'),[2]);assert.equal(reader.get(' ב'),null);
 time=9;assert.equal(reader.get('ג'),null);
});
