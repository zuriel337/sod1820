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
test('Gra seals bind PDF 175 independently and preserve each comparison witness sequence',()=>{
 const syn=bindSourceModel(bundle,'six-seals-synoptic'),gra=bindSourceModel(bundle,'six-seals-gra-edition');
 assert.equal(gra.components.length,6);for(const c of gra.components){assert.equal(sourcePayload(gra,c).source.pdf_page,175);assert.ok(c.stable_id.startsWith(gra.id));}
 const different=structuredClone(bundle);different.structures.structures.find(s=>s.id===gra.id).components[0].seal_letters.reverse();
 assert.notDeepEqual(bindSourceModel(different,'six-seals-gra-edition').components[0].seal_letters,syn.components[0].seal_letters,'synthetic witness differences must never be copied from the other witness');
 assert.deepEqual(bindSourceModel(different,'six-seals-synoptic').components.map(c=>c.seal_letters),syn.components.map(c=>c.seal_letters));
});
test('twelve boundaries preserve the printed direction pairs and use cube edges only as an embedding',()=>{
 const m=bindSourceModel(bundle,'twelve-boundaries-gra'),g=modelGeometry(m);assert.equal(m.components.length,12);assert.equal(m.relations.length,0);assert.equal(g.points.length,0);assert.equal(g.segments.length,12);
 assert.equal(new Set(g.segments.map(s=>JSON.stringify([s.from,s.to].sort()))).size,12);
 for(const c of m.components){assert.equal(c.source.pdf_page,187);assert.equal(c.letters,undefined);const line=g.segments.find(s=>s.id===c.stable_id);assert.deepEqual(line.directions,c.directions);assert.equal(line.from.filter((v,i)=>v!==line.to[i]).length,1);assert.equal(line.letter,undefined);}
 assert.deepEqual(m.components.slice(0,3).map(c=>c.directions),[['east','up'],['east','north'],['east','down']]);
});
