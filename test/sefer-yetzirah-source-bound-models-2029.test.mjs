import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {bindSourceModel,modelGeometry,selectedComponent,sourcePayload} from '../src/components/books2029/yetzirahModels/sourceModels.js';
const read=name=>JSON.parse(readFileSync(new URL(`../public/book-data/sefer-yetzirah.${name}.json`,import.meta.url)));
const bundle={structures:read('structures'),units:read('units')};
test('synoptic seals preserve source order, letters, stable IDs and PDF 73',()=>{
 const model=bindSourceModel(bundle,'six-seals-synoptic');
 assert.deepEqual(model.components.map(c=>c.seal_letters.join('')),['יהו','יוה','היו','הוי','ויה','והי']);
 assert.deepEqual(model.components.map(c=>c.id),['up','down','east','west','south','north']);
 assert.equal(modelGeometry(model).points.length,6);assert.equal(modelGeometry(model).edges.length,3);
 for(const c of model.components){assert.equal(selectedComponent(model,c.stable_id),c);const p=sourcePayload(model,c);assert.equal(p.source.pdf_page,73);assert.equal(p.componentId,c.stable_id);assert.equal(p.verification,'not_tested');}
 assert.equal(selectedComponent(model,'sy:another-voice:up'),null);
});
test('wrong edition, unit or page fails closed before model geometry exists',()=>{
 for(const mutate of [b=>b.structures.source_identity='other',b=>b.structures.structures.find(s=>s.id.endsWith(':six-seals-synoptic')).components[0].source.pdf_page=175,b=>b.structures.structures.find(s=>s.id.endsWith(':six-seals-synoptic')).components[0].source.unit_id='other']){
 const b=structuredClone(bundle);mutate(b);assert.throws(()=>bindSourceModel(b,'six-seals-synoptic'));
 }
});
