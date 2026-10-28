import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {bindDepthsReadingDepth,DEPTHS_DEFAULT_READING} from '../src/components/books2029/tenDepthsReadingDepthData2029.js';

const read=name=>JSON.parse(readFileSync(new URL(`../public/book-data/sefer-yetzirah.${name}.json`,import.meta.url)));
const content=read('ten-depths-reading-depth'),bundle={units:read('units'),structures:read('structures')};

test('the depth-reading chunk extends the existing source identity without changing the 319 registered units',()=>{
 assert.equal(createHash('sha256').update(readFileSync(new URL('../public/book-data/sefer-yetzirah.units.json',import.meta.url))).digest('hex'),'8dbe743cebd22e2a25e8c0b05d8b460f7c041e63537b42dc8bc11cb9f422c312');
 assert.equal(bindDepthsReadingDepth(content,bundle),content);
 assert.equal(content.readings.length,4);assert.equal(content.component_explanations.length,10);assert.equal(content.reading_structures.length,2);
 assert.equal(content.readings[0].id,DEPTHS_DEFAULT_READING);
 for(const r of content.readings){assert.equal(r.source.pdf_page,53);assert.equal(r.verification.engine,'not_tested');assert.ok(r.companion_paragraphs_he.every(p=>p.length>100));}
});

test('primary words and the three printed voices remain separately attributed to their registered units',()=>{
 assert.deepEqual(content.readings.map(r=>r.source.unit_id),['sy:synoptic:text:ch1:depths','sy:synoptic:raavad:ch1:ten-depths','sy:synoptic:botril:ch1:depths','sy:synoptic:otzar:ch1:depths']);
 assert.equal(content.readings.filter(r=>r.source_layer==='book_text').length,1);
 assert.equal(content.readings.filter(r=>r.source_layer==='printed_commentary').length,3);
 assert.deepEqual(content.readings.map(r=>r.content.exact_short_quotes.length),[4,1,1,1]);
 assert.ok(content.readings.every(r=>r.unresolved.length));
});

test('all ten explanations preserve component identities and point to the primary paragraph',()=>{
 const model=bundle.structures.structures.find(s=>s.id===content.structure_id);
 assert.deepEqual(content.component_explanations.map(e=>e.component_id),model.source_order);
 for(const e of content.component_explanations){assert.equal(e.reading_id,DEPTHS_DEFAULT_READING);assert.ok(e.explanation_he.length>150);assert.ok(e.question_he);}
 for(const diagram of content.reading_structures){assert.match(diagram.representation_label,/נלווה/);assert.equal(diagram.steps_he.length,4);}
});

test('foreign witnesses, missing units, changed page/anchor/region, swapped voices and shifted crops fail closed',()=>{
 const changes=[
  d=>d.source_identity='book:other', d=>d.source_pdf_sha256='changed',
  d=>d.readings[1].source.unit_id='missing',d=>d.readings[1].source.pdf_page=54,
  d=>d.readings[1].source.source_anchor='#page=52&view=FitH',d=>d.readings[1].source.page_region='body',
  d=>d.readings[1].source={...d.readings[2].source},d=>d.readings[1].crop={...d.readings[0].crop},
  d=>d.readings[2].crop.x=-1,d=>d.readings[2].verification.engine='verified',
  d=>d.component_explanations[0].component_id='foreign-component',
  d=>d.reading_structures[0].reading_ids=['unknown'],d=>d.image='/other-image.webp',
  d=>d.readings[0].questions_he='not an array',d=>d.readings[0].content.exact_short_quotes='text',d=>d.readings[0].unresolved=null,
  d=>d.component_explanations[0].explanation_he={text:'unexpected object'},d=>d.reading_structures[0].steps_he='text',
 ];
 for(const change of changes){const bad=structuredClone(content);change(bad);assert.throws(()=>bindDepthsReadingDepth(bad,bundle),/DEPTHS_READING_/);}
});
