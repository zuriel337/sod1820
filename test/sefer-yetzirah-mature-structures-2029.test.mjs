import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {bindSourceModel,modelGeometry} from '../src/components/books2029/yetzirahModels/sourceModels.js';
import {catalogFields} from '../src/components/books2029/yetzirahModels/catalogModels.js';
const read=name=>JSON.parse(readFileSync(new URL(`../public/book-data/sefer-yetzirah.${name}.json`,import.meta.url)));
const bundle={structures:read('structures'),units:read('units'),readings:read('source-readings')};
test('families preserve three source groups, 3/7/12 counts, all 22 letters, and no inferred adjacency',()=>{
 const m=bindSourceModel(bundle,'letter-families');assert.deepEqual(m.components.map(c=>c.source_count),[3,7,12]);assert.equal(new Set(m.components.flatMap(c=>c.letters)).size,22);assert.equal(m.relations.length,0);assert.equal(modelGeometry(m).edges.length,0);assert.equal(modelGeometry(m).points.length,3);
 for(const [i,c] of m.components.entries()){assert.equal(c.source.pdf_page,65);for(const f of catalogFields(m,c)){assert.equal(f.source.pdf_page,f.key==='letters'?[91,100,113][i]:65);assert.equal(f.value,c[f.key]);assert.equal(f.source.source_anchor,`#page=${f.source.pdf_page}&view=FitH`);}}
});
test('articulation keeps five source groups and never introduces anatomical coordinates or variant letters',()=>{
 const m=bindSourceModel(bundle,'five-mouth-groups');assert.deepEqual(m.components.map(c=>c.id),['throat','lips','palate','tongue','teeth']);assert.deepEqual(m.components.map(c=>c.letters.join('')),['אחהע','בומפ','גיכק','דטלנת','זסשרצ']);assert.equal(new Set(m.components.flatMap(c=>c.letters)).size,22);assert.equal(modelGeometry(m).edges.length,0);assert.equal(m.spec.open_readings.length,1);for(const c of m.components)assert.equal(c.source.pdf_page,80);
});
test('mothers keep separate component pages, correspondence fields and PDF94 mediation anchors',()=>{
 const m=bindSourceModel(bundle,'mothers-world-year-soul');assert.deepEqual(m.components.map(c=>c.source.pdf_page),[97,98,99]);assert.deepEqual(m.components.map(c=>[c.world,c.year,c.soul]),[['אוויר','רוויה','גוויה'],['ארץ','קור','בטן'],['שמיים','חום','ראש']]);assert.deepEqual(m.contextUnits.map(c=>c.source.pdf_page),[94,95]);assert.equal(m.relations.length,2);for(const r of m.relations)assert.equal(r.source.pdf_page,94);const g=modelGeometry(m);assert.equal(g.edges.length,2);assert.equal(g.points.length,3);assert.equal(g.orientationCenter,false);for(const c of m.components)for(const f of catalogFields(m,c))assert.equal(f.source.pdf_page,c.source.pdf_page);
});
test('synoptic doubles retain exact distinct source pages and direct-reading regions for Resh/Tav',()=>{
 const m=bindSourceModel(bundle,'doubles-synoptic');assert.deepEqual(m.components.map(c=>c.source.pdf_page),[106,107,108,109,109,110,110]);assert.deepEqual(m.components.map(c=>c.world_planet),['שבתאי','צדק','מאדים','חמה','נוגה','כוכב','לבנה']);assert.equal(modelGeometry(m).edges.length,0);for(const c of m.components.slice(5)){for(const f of catalogFields(m,c)){assert.equal(f.source.pdf_page,110);assert.match(f.source.page_region,/central mishnah box/);assert.equal(f.value,c[f.key]);}}
 const bad=structuredClone(bundle);bad.readings.readings.find(r=>r.id.endsWith('doubles-synoptic:reading:resh')).content.world_planet='שבתאי';assert.throws(()=>bindSourceModel(bad,'doubles-synoptic'),/SOURCE_READING_CONTENT_MISMATCH/);assert.throws(()=>bindSourceModel({...bundle,readings:null},'doubles-synoptic'),/SOURCE_READING_MISMATCH/);
});
test('Gra doubles retain all seven independent assignments and direct five-crown locators',()=>{
 const syn=bindSourceModel(bundle,'doubles-synoptic'),gra=bindSourceModel(bundle,'doubles-gra-distinction');assert.deepEqual(gra.components.map(c=>c.source.pdf_page),[184,184,185,185,185,185,185]);assert.deepEqual(gra.components.map(c=>c.world_planet),['לבנה','מאדים','חמה','נוגה','כוכב','שבתאי','צדק']);assert.equal(syn.components[0].world_planet,'שבתאי');assert.equal(syn.components[0].quality,undefined);assert.equal(gra.components[0].quality,'חכמה');assert.equal(gra.components[1].soul_gate,'אוזן ימין');assert.equal(syn.components[1].soul_gate,'עין שמאל');
 for(const c of gra.components.slice(2))for(const f of catalogFields(gra,c))assert.match(f.source.page_region,/central crown box/);
 const variant=structuredClone(bundle);variant.structures.structures.find(s=>s.id===gra.id).components[0].world_planet='ערך ניסוי';assert.equal(bindSourceModel(variant,'doubles-synoptic').components[0].world_planet,'שבתאי');assert.equal(bindSourceModel(variant,'doubles-gra-distinction').components[0].world_planet,'ערך ניסוי');
 const swapped=structuredClone(bundle);swapped.structures.structures.find(s=>s.id===gra.id).components[2].source_reading_id='sy-structure:doubles-gra-distinction:reading:khaf';assert.throws(()=>bindSourceModel(swapped,'doubles-gra-distinction'),/SOURCE_READING_MISMATCH/);
});
test('stones/houses display the six printed counts without generating or verifying permutations',()=>{
 const m=bindSourceModel(bundle,'stones-houses');assert.deepEqual(m.components.map(c=>[c.source_stones,c.source_houses]),[[2,2],[3,6],[4,24],[5,120],[6,720],[7,5040]]);assert.equal(modelGeometry(m).points.length,6);assert.equal(modelGeometry(m).edges.length,0);assert.equal(m.spec.engine_verification,'not_tested');for(const c of m.components){assert.equal(c.source.pdf_page,111);assert.equal(c.permutations,undefined);}
});
test('three kings use only the synoptic component claims while other witnesses remain unit-level context',()=>{
 const m=bindSourceModel(bundle,'three-kings');assert.deepEqual(m.components.map(c=>c.simile),['מלך על כסאו','מלך במדינה','מלך במלחמה']);assert.deepEqual(m.components.map(c=>c.source.pdf_page),[122,122,122]);assert.deepEqual(m.contextUnits.map(c=>c.source.pdf_page),[151,192]);assert.equal(m.relations.length,0);assert.equal(modelGeometry(m).edges.length,0);assert.ok(m.contextUnits[0].unit.source_content.summary);assert.notEqual(m.contextUnits[0].unit.id,m.components[0].source.unit_id);
});
test('multi-page components reject borrowed same-edition locators even when the borrowed page is allowed',()=>{
 for(const key of ['mothers-world-year-soul','doubles-synoptic','doubles-gra-distinction']){const b=structuredClone(bundle),spec=b.structures.structures.find(s=>s.id==='sy-structure:'+key);spec.components[0].source=structuredClone(spec.components.at(-1).source);assert.throws(()=>bindSourceModel(b,key),/SOURCE_COMPONENT_LOCUS_MISMATCH/);}
});
test('catalogue summaries and companion layers are preserved from the owning original units',()=>{
 for(const key of ['letter-families','five-mouth-groups','mothers-world-year-soul','doubles-synoptic','doubles-gra-distinction','stones-houses','three-kings']){const m=bindSourceModel(bundle,key);for(const c of m.components){const u=bundle.units.units.find(u=>u.id===c.source.unit_id);assert.equal(m.sourceSummaries[c.id],u.source_content.summary);assert.equal(m.sourceCompanions[c.id],u.companion_explanation);assert.equal(u.source_content.kind,'bounded_source_summary');assert.equal(u.source_content.quotation_status,'not_transcribed');}}
});
