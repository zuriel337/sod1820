import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {bindSourceModel} from '../src/components/books2029/yetzirahModels/sourceModels.js';
import {catalogFields} from '../src/components/books2029/yetzirahModels/catalogModels.js';
import {graSealsCorrectedReading} from '../src/components/books2029/yetzirahModels/sourceCorrections2029.js';
import {allLetterGates,letterGateRows,gateSelection,gateSelectionUrl,GATE_LETTERS} from '../src/components/books2029/letterGateExploration2029.js';
const read=name=>JSON.parse(readFileSync(new URL(`../public/book-data/sefer-yetzirah.${name}.json`,import.meta.url)));
const bundle={units:read('units'),structures:read('structures'),readings:read('source-readings')};
test('family count and letter fields resolve independently to their actual printed source units',()=>{
 const model=bindSourceModel(bundle,'letter-families');
 for(const [i,c] of model.components.entries()){
  const fields=catalogFields(model,c),letters=fields.find(f=>f.key==='letters'),count=fields.find(f=>f.key==='source_count');
  assert.equal(count.source.pdf_page,65);assert.equal(letters.source.pdf_page,[91,100,113][i]);
  assert.notEqual(letters.source.unit_id,count.source.unit_id);
  for(const f of fields){const u=bundle.units.units.find(u=>u.id===f.source.unit_id);assert.equal(u.source_ref,f.source.source_ref);assert.equal(u.source_anchor,f.source.source_anchor);}
 }
});
test('Gra correction is additive, pinned to the original reading and source hash, without rewriting the frozen units',()=>{
 const before=JSON.stringify(bundle),reading=graSealsCorrectedReading(bundle.units);
 assert.equal(reading.quote,'בירר שלש אותיות מן הפשוטות');assert.equal(reading.source.pdf_page,175);assert.equal(reading.engine,'not_tested');assert.equal(JSON.stringify(bundle),before);
 assert.equal(createHash('sha256').update(readFileSync(new URL('../public/book-data/sefer-yetzirah.units.json',import.meta.url))).digest('hex'),'8dbe743cebd22e2a25e8c0b05d8b460f7c041e63537b42dc8bc11cb9f422c312');
});
test('wrong family list, count, missing unit, moved page/anchor/hash and changed correction base fail closed',()=>{
 for(const mutate of [b=>b.units.source_pdf_sha256='other',b=>b.units.units.find(u=>u.id==='sy:synoptic:text:ch3:balance').pdf_page=65,b=>b.units.units.find(u=>u.id==='sy:synoptic:text:ch4:seven-doubles').source_anchor='#page=65&view=FitH',b=>b.units.units.find(u=>u.id==='sy:synoptic:text:ch3:balance').source_ref='book:sefer-yetzirah-9perushim#p91:gra_commentary:text:gra-edition:ch3:balance',b=>b.units.units.find(u=>u.id==='sy:synoptic:text:ch3:balance').source_layer='printed_commentary',b=>b.units.units=b.units.units.filter(u=>u.id!=='sy:synoptic:text:ch5:twelve-faculties'),b=>b.structures.structures.find(s=>s.id==='sy-structure:letter-families').components[0].letters=['א','ב','ג'],b=>b.structures.structures.find(s=>s.id==='sy-structure:letter-families').components[1].source_count=8]){const b=structuredClone(bundle);mutate(b);assert.throws(()=>bindSourceModel(b,'letter-families'),/SOURCE_/);}
 const units=structuredClone(bundle.units);units.units.find(u=>u.id==='sy:gra-edition:text:ch1:six-seals').source_content.exact_quote='unknown';assert.throws(()=>graSealsCorrectedReading(units),/BASE_MISMATCH/);
});
test('existing lab enumeration gives 21 partners per letter and all 231 unique unordered pairs without asserting printed-cell positions',()=>{
 const all=allLetterGates();assert.equal(all.length,231);assert.equal(new Set(all.map(r=>r.id)).size,231);assert.deepEqual(all.map(r=>r.id),Array.from({length:231},(_,i)=>i+1));
 for(const letter of GATE_LETTERS){const rows=letterGateRows(letter);assert.equal(rows.length,21);assert.ok(rows.every(r=>r.first===letter&&r.first!==r.second&&r.reverse===r.second+r.first));for(const row of rows)assert.equal(all.find(r=>r.id===row.id).forward.split('').sort().join(''),row.forward.split('').sort().join(''));}
 assert.deepEqual(letterGateRows('ך'),[]);
});
test('pair deep links reject invalid letters and preserve source, structure, share access and selection context',()=>{
 assert.deepEqual(gateSelection('?letter=ש&partner=ת'),{first:'ש',second:'ת'});assert.deepEqual(gateSelection('?letter=ש&partner=ש'),{first:'ש',second:''});assert.deepEqual(gateSelection('?letter=invalid'),{first:'א',second:'ב'});
 const href='https://example.test/2029/control?surface=sefer-yetzirah-world&structure=sy-structure:stones-houses&page=203&_vercel_share=test';const result=new URL(gateSelectionUrl(href,'מ','ת',true),'https://example.test');
 assert.equal(result.searchParams.get('page'),'203');assert.equal(result.searchParams.get('structure'),'sy-structure:stones-houses');assert.equal(result.searchParams.get('_vercel_share'),'test');assert.equal(result.searchParams.get('pairs'),'open');assert.deepEqual(gateSelection(result.search),{first:'מ',second:'ת'});
});
