import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';
const read = name => JSON.parse(readFileSync(new URL(`../public/book-data/sefer-yetzirah.${name}.json`,import.meta.url),'utf8'));
const data=read('units'), bundle=read('structures'), readings=read('source-readings');
const units=new Map(data.units.map(u=>[u.id,u]));
const structures=new Map(bundle.structures.map(s=>[s.id,s]));
const records=new Map(readings.readings.map(r=>[r.id,r]));
const structure=id=>structures.get(`sy-structure:${id}`);
function locator(source) {
  const unit=units.get(source?.unit_id);
  assert.ok(unit,'declared source unit must exist');
  assert.equal(source.pdf_page,unit.pdf_page);
  assert.equal(source.source_ref,unit.source_ref);
  assert.ok(source.page_region);
  assert.equal(source.source_anchor,`#page=${unit.pdf_page}&view=FitH`);
}

test('all 319 delivered units and the thirteen visual inspections remain byte-preserved',()=>{
  const hash=createHash('sha256').update(readFileSync(new URL('../public/book-data/sefer-yetzirah.units.json',import.meta.url))).digest('hex');
  assert.equal(hash,'8dbe743cebd22e2a25e8c0b05d8b460f7c041e63537b42dc8bc11cb9f422c312');
  assert.equal(hash,readings.baseline_units_sha256);
  assert.equal(data.units.length,319);
  assert.equal(data.visual_inspections.length,13);
  assert.equal(readings.source_identity,data.source_identity);
  assert.equal(readings.source_pdf_sha256,data.source_pdf_sha256);
});

test('all 33 source specifications have individual readiness, Hebrew legends and explicit nonimplementation',()=>{
  assert.equal(structures.size,33);
  const expected=new Set(['ten-depths','five-against-five','letter-families','five-mouth-groups','six-seals-synoptic','six-seals-gra-edition','mothers-world-year-soul','doubles-synoptic','doubles-gra-distinction','stones-houses','twelve-boundaries-gra','three-kings','concentric-39','element-rings-40','opposites-41','name-wheel-42','name-grid-44','botril-pairs-85','botril-pairs-86','botril-pairs-87','circle-102','otzar-seven-105','botril-seven-105','small-grid-106','small-grid-110','relations-grid-123','chachmoni-pairs-139','chachmoni-arrangements-142','gra-gates-203','letter-lines-204','peri-eight-gate-tables','peri-thirtytwo-paths','inline-figures-31'].map(id=>`sy-structure:${id}`));
  assert.deepEqual(new Set(structures.keys()),expected);
  for(const s of structures.values()) {
    const a=s.source_acceptance;
    for(const key of ['source_supported_he','requires_completion_he','legend_he']) assert.match(a[key],/[א-ת]/);
    assert.ok(['P1','P2','P3'].includes(a.implementation_priority));
    assert.ok(['ready_bounded','partial','needs_reading'].includes(a.source_readiness));
    assert.equal(a.renderer_binding,'not_implemented');
    assert.equal(a.component_source_interaction,'not_implemented');
    assert.equal(a.per_model_browser_acceptance,'not_tested');
    assert.equal(a.model_count_claimed,0);
    assert.equal(a.engine_verification,'not_tested');
    for(const key of ['color','height','size','position','direction','selection']) assert.match(a.encoding_legend_he[key],/[א-ת]/);
  }
  assert.equal([...structures.values()].filter(s=>s.source_acceptance.preferred_representation==='spatial_candidate').length,5);
  assert.equal(bundle.acceptance_continuation.implemented_models,0);
  assert.equal(bundle.acceptance_continuation.browser_accepted_models,0);
});

test('components and relations have scoped stable identities, Hebrew meanings and exact independent locators',()=>{
  const ids=new Set();
  for(const s of structures.values()) {
    const componentIds=new Set(s.components.map(c=>c.id));
    s.sources.forEach(locator);
    for(const c of s.components) {
      assert.equal(c.stable_id,`${s.id}:component:${c.id}`);
      assert.ok(!ids.has(c.stable_id));ids.add(c.stable_id);
      assert.match(c.label_he,/[א-ת]/);assert.match(c.explanation_he,/[א-ת]/);
      locator(c.source);
      if(c.source_reading_id)assert.ok(records.has(c.source_reading_id));
    }
    for(const r of s.source_relations) {
      assert.equal(r.stable_id,`${s.id}:relation:${r.from_id}:${r.type}:${r.to_id}`);
      assert.ok(!ids.has(r.stable_id));ids.add(r.stable_id);
      assert.ok(componentIds.has(r.from_id)&&componentIds.has(r.to_id));
      assert.match(r.explanation_he,/[א-ת]/);locator(r.source);
    }
  }
});

test('wrong edition, page, unit or missing anchor cannot pass the content acceptance check',()=>{
  const original=structure('doubles-gra-distinction').components.at(-1).source;
  locator(original);
  for(const change of [{pdf_page:110},{unit_id:'sy:synoptic:text:ch4:tav'},{source_ref:'book:another-witness#p185'},{source_anchor:'#page=184&view=FitH'}]) {
    assert.throws(()=>locator({...original,...change}));
  }
});

test('new Resh/Tav fields and five Gra crowns carry direct reading evidence without recension merging',()=>{
  const synoptic=structure('doubles-synoptic'),gra=structure('doubles-gra-distinction');
  assert.equal(synoptic.components.length,7);assert.equal(gra.components.length,7);
  assert.equal(synoptic.components[0].world_planet,'שבתאי');
  assert.equal(gra.components[0].world_planet,'לבנה');
  for(const id of ['resh','tav']) {
    const c=synoptic.components.find(c=>c.id===id),r=records.get(c.source_reading_id);
    assert.equal(c.source.pdf_page,110);assert.equal(r.source.pdf_page,110);
    for(const key of ['world_planet','week_day','soul_gate'])assert.equal(c[key],r.content[key]);
    assert.ok(readings.source_field_completions.some(d=>d.component_id===id&&Object.values(d.before).every(v=>v===null)));
  }
  for(const id of ['dalet','khaf','pe','resh','tav']) {
    const c=gra.components.find(c=>c.id===id),r=records.get(c.source_reading_id);
    assert.equal(c.source.pdf_page,185);assert.equal(r.source.pdf_page,185);
    assert.equal(r.source_layer,'book_text');
  }
});

test('all thirty-two definitions retain their printed order and never supply the 204 graph topology',()=>{
  const paths=structure('peri-thirtytwo-paths');
  assert.equal(paths.components.length,32);
  for(const [index,c]of paths.components.entries()) {
    assert.equal(c.id,`path-${index+1}`);assert.equal(c.source_ordinal,index+1);
    assert.equal(c.source.pdf_page,index<19?207:208);
    assert.equal(c.definition_kind,'bounded_source_summary');
    const r=records.get(c.source_reading_id);assert.equal(r.kind,'bounded_source_definition');
    assert.equal(c.definition,r.content.summary);assert.equal(c.printed_name,r.content.exact_short_quote);
    assert.equal(r.source_layer,'printed_commentary');
    assert.match(r.content.summary_label,/אינו תעתיק/);
  }
  assert.equal(paths.source_relations.length,0);
  for(const c of structure('letter-lines-204').components) {
    assert.equal(c.semantic_name,null);
    assert.equal(c.source_support,'visible_shape_editorial_segmentation');
  }
  assert.deepEqual(structure('letter-lines-204').source_relations.map(r=>r.id),Array.from({length:24},(_,i)=>`segment-${i+1}`),'retain original segment identities');
  assert.ok(structure('letter-lines-204').source_relations.every(r=>r.source_support==='visible_line_editorial_segmentation_not_semantic_path'));
});

test('partial table transcriptions expose observed cells and preserve unread rows as missing',()=>{
  let cells=0;
  for(const r of records.values()) {
    locator(r.source);assert.equal(r.verification.engine,'not_tested');
    if(r.kind!=='printed_table_partial_cells')continue;
    assert.equal(r.content.full_table_transcription,false);
    assert.equal(r.content.unread_rows,'not_filled');
    for(const row of r.content.rows) {
      locator(row.source);
      for(const [index,c]of row.cells.entries()) {
        locator(c.source);assert.equal(c.printed_column_from_right,index+1);cells++;
        assert.ok(c.text===null||typeof c.text==='string');
      }
    }
  }
  assert.equal(cells,260);
  assert.equal(cells,readings.coverage.table_cells);
  for(const c of structure('peri-eight-gate-tables').components) {
    assert.equal(c.cells,null,'partial opening rows never masquerade as a complete matrix');
    const rows=records.get(c.source_reading_ids[0]).content.rows;
    assert.equal(rows.length,2);assert.ok(rows.every(r=>r.cells.length===11));
  }
  const gra=readings.readings.find(r=>r.id.endsWith(':reading:observed-rows'));
  assert.deepEqual(gra.content.rows.at(-1).cells.slice(0,3).map(c=>c.text),['תא','שא','רא']);
});

test('zodiac labels have their own row/column locators while name inscriptions stay unknown',()=>{
  const cells=structure('name-grid-44').components.filter(c=>c.id.startsWith('zodiac-'));
  assert.equal(cells.length,12);
  assert.deepEqual(cells.map(c=>c.label),['טלה','שור','תאומים','סרטן','אריה','בתולה','מאזנים','עקרב','קשת','גדי','דלי','דגים']);
  for(const [index,c]of cells.entries()) {
    assert.equal(c.source.pdf_page,44);assert.equal(c.printed_row,Math.floor(index/3)+1);
    assert.equal(c.printed_column_from_right,index%3+1);assert.equal(c.name_inscription,null);
  }
});


test('the printed path definitions supersede unsupported familiar-recension wording explicitly',()=>{
  const paths=structure('peri-thirtytwo-paths').components;
  assert.doesNotMatch(paths[1].definition,/כתר הבריאה/);
  assert.doesNotMatch(paths[2].definition,/יסוד החכמה הקדומה|אמון/);
  assert.match(paths[3].definition,/חסד של החכמה/);
  assert.doesNotMatch(paths[3].definition,/כתר המחשבה/);
  assert.equal(readings.source_summary_adjudications.length,6);
  for(const a of readings.source_summary_adjudications){
    assert.equal(a.relationship,'CORRECTS');locator(a.source);
    assert.equal(paths.find(c=>c.id===a.component_id).definition,a.corrected_summary);
    assert.notEqual(a.previous_summary,a.corrected_summary);
  }
});
