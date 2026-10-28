import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {bindSourceModel,modelGeometry} from '../src/components/books2029/yetzirahModels/sourceModels.js';
import {catalogFields} from '../src/components/books2029/yetzirahModels/catalogModels.js';
const read=name=>JSON.parse(readFileSync(new URL(`../public/book-data/sefer-yetzirah.${name}.json`,import.meta.url)));
const bundle={structures:read('structures'),units:read('units'),readings:read('source-readings')};
test('families preserve three source groups, 3/7/12 counts, all 22 letters, and no inferred adjacency',()=>{
 const m=bindSourceModel(bundle,'letter-families');assert.deepEqual(m.components.map(c=>c.source_count),[3,7,12]);assert.equal(new Set(m.components.flatMap(c=>c.letters)).size,22);assert.equal(m.relations.length,0);assert.equal(modelGeometry(m).edges.length,0);assert.equal(modelGeometry(m).points.length,3);
 for(const c of m.components){assert.equal(c.source.pdf_page,65);for(const f of catalogFields(m,c)){assert.equal(f.source,c.source);assert.equal(f.value,c[f.key]);}}
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
