import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const data = read('public/book-data/sefer-yetzirah.units.json');
const structures = read('public/book-data/sefer-yetzirah.structures.json');
const pages = read('public/book-data/sefer-yetzirah.page-text.json');
const units = new Map(data.units.map(unit => [unit.id, unit]));
const structure = key => structures.structures.find(item => item.id === `sy-structure:${key}`);
const unit = (work, voice, chapter, key) => units.get(`sy:${work}:${voice}:${chapter}:${key}`);

test('source identity reuses the existing witness and every unit has an exact anchor', () => {
  assert.equal(data.source_identity, pages.source_identity);
  assert.equal(data.source_pdf_sha256, pages.source_pdf_sha256);
  assert.equal(data.source_pdf_url, pages.source_pdf_url);
  assert.equal(units.size, data.units.length);
  const works = new Map(data.works.map(item => [item.id, item]));
  const chapters = new Map(data.chapters.map(item => [item.id, item]));
  for (const item of data.units) {
    assert.ok(item.pdf_page >= 1 && item.pdf_page <= 220);
    assert.equal(item.source_anchor, `#page=${item.pdf_page}&view=FitH`);
    assert.ok(item.source_ref.startsWith(`${data.source_identity}#p${item.pdf_page}:`));
    assert.ok(works.get(item.work_id)?.pdf_pages.includes(item.pdf_page), item.id);
    assert.ok(chapters.get(item.chapter_id)?.pdf_pages.includes(item.pdf_page), item.id);
    assert.ok(works.get(item.work_id).unit_ids.includes(item.id));
    assert.ok(chapters.get(item.chapter_id).unit_ids.includes(item.id));
    assert.ok(item.source_content.summary && item.companion_explanation);
    assert.equal(item.source_content.kind, 'bounded_source_summary');
    assert.equal(item.book_structure.kind, 'editorial_map_of_printed_structure');
    for (const relation of item.source_connections) assert.ok(units.has(relation.target_unit_id));
    const context = item.book_structure.local_printed_context;
    if (context) {
      assert.ok(units.has(context.unit_id));
      assert.equal(context.semantic_relation_asserted, false);
    }
  }
  for (const work of works.values()) for (const id of work.unit_ids) assert.equal(units.get(id)?.work_id, work.id);
  for (const chapter of chapters.values()) for (const id of chapter.unit_ids) assert.equal(units.get(id)?.chapter_id, chapter.id);
});

test('chapter boundaries and source boxes do not inherit older wrong locators', () => {
  for (const [work, chapter, key, page] of [
    ['synoptic','ch1','six-seals',73], ['synoptic','ch1','recap',76],
    ['synoptic','ch2','gates-wheel',83], ['synoptic','ch3','shin',99],
    ['synoptic','ch4','seven-doubles',100], ['synoptic','ch4','khaf',109],
    ['gra-edition','ch1','fingers',164], ['gra-edition','ch1','exact-ten',166],
    ['gra-edition','ch1','depths',168], ['gra-edition','ch1','lightning',170],
    ['gra-edition','ch1','water-spirit',173], ['gra-edition','ch1','fire-water',174],
    ['gra-edition','ch1','six-seals',175], ['gra-edition','ch6','abraham',195],
  ]) assert.equal(unit(work, 'text', chapter, key)?.pdf_page, page, `${work}:${key}`);
  assert.ok(unit('synoptic','text','ch2','carve-hewn').source_content.exact_quote.includes('חקקן'));
  assert.equal(unit('gra-edition','text','ch6','mothers-process').pdf_page, 191);
  assert.ok(unit('gra-edition','text','ch6','mothers-process').source_content.summary.includes('אש, מים ורוח'));
  for (const correction of data.corrections) {
    assert.equal(correction.relationship, 'CORRECTS');
    for (const id of correction.evidence_unit_ids) assert.ok(units.has(id));
  }
});

test('thirteen empty-OCR pages are classified visually without fabricated transcription', () => {
  assert.deepEqual(data.visual_inspections.map(item => item.pdf_page), [1,2,3,27,33,110,114,115,202,217,218,219,220]);
  for (const item of data.visual_inspections) {
    assert.ok(item.classification && item.observation);
    assert.equal(item.machine_text, '');
    assert.equal(item.transcription, null);
    assert.equal(item.inferred_missing_text, false);
    assert.equal(item.is_diagram, false);
  }
  assert.equal(structure('small-grid-110').sources[0].pdf_page, 110);
  assert.equal(structure('relations-grid-123').sources[0].unit_id, 'sy:synoptic:wormser:ch6:relations-table');
});

test('each structure component, relation and order points to its printed source', () => {
  assert.equal(new Set(structures.structures.map(item => item.id)).size, structures.structures.length);
  function witness(source) {
    const item = units.get(source.unit_id);
    assert.ok(item, source.unit_id);
    assert.equal(source.pdf_page, item.pdf_page);
    assert.equal(source.source_ref, item.source_ref);
    assert.ok(source.page_region);
  }
  for (const item of structures.structures) {
    const ids = new Set(item.components.map(component => component.id));
    assert.equal(ids.size, item.components.length);
    item.sources.forEach(witness);
    item.components.forEach(component => witness(component.source));
    for (const id of item.source_order) assert.ok(ids.has(id), `${item.id}:${id}`);
    for (const relation of item.source_relations) {
      assert.ok(ids.has(relation.from_id), `${item.id}:${relation.from_id}`);
      assert.ok(ids.has(relation.to_id), `${item.id}:${relation.to_id}`);
      witness(relation.source);
    }
    assert.equal(item.illustration.status, 'specification_only_no_integration');
    assert.ok(item.illustration.editorial_choices.length && item.illustration.acceptance.length);
  }
});

test('recension differences, seal directions and unknown correspondences stay explicit', () => {
  assert.equal(structure('doubles-synoptic').components[0].world_planet, 'שבתאי');
  assert.equal(structure('doubles-gra-distinction').components[0].world_planet, 'לבנה');
  for (const key of ['six-seals-synoptic','six-seals-gra-edition']) {
    const seals = structure(key).components;
    assert.deepEqual(seals.map(item => item.id), ['up','down','east','west','south','north']);
    assert.deepEqual(seals.map(item => item.seal_letters.join('')), ['יהו','יוה','היו','הוי','ויה','והי']);
  }
  for (const item of structure('doubles-synoptic').components.filter(item => ['resh','tav'].includes(item.id))) {
    assert.equal(item.world_planet, null);
    assert.equal(item.week_day, null);
    assert.equal(item.soul_gate, null);
  }
  assert.equal(structure('ten-depths').components.length, 10);
  assert.equal(structure('five-mouth-groups').components.length, 5);
  assert.equal(structure('twelve-boundaries-gra').components.length, 12);
});

test('appendix appearances, eight tables and thirty-two paths retain their own identities', () => {
  const ids = ['amash-v1','amash-v2','bagad-v1','bagad-v2'];
  assert.equal(new Set(ids.map(id => data.works.find(item => item.id === id)?.id)).size, 4);
  const tables = structure('peri-eight-gate-tables').components;
  assert.equal(tables.length, 8);
  assert.deepEqual([...new Set(tables.map(item => item.partzuf))], ['כתר','חכמה','בינה','דעת']);
  assert.deepEqual(tables.map(item => item.source.pdf_page), [205,205,205,205,206,206,206,206]);
  assert.ok(tables.every(item => item.cells === null));
  const paths = structure('peri-thirtytwo-paths').components;
  assert.equal(paths.length, 32);
  assert.equal(paths.filter(item => item.source.pdf_page === 207).length, 19);
  assert.equal(paths.filter(item => item.source.pdf_page === 208).length, 13);
  assert.equal(structure('letter-lines-204').source_relations.length, 24);
});

test('content checks never certify engine results or imply runtime integration', () => {
  assert.ok(data.units.every(item => item.verification.engine === 'not_tested'));
  assert.ok(structures.structures.every(item => item.engine_verification === 'not_tested'));
  assert.equal(structures.coverage.engine_runs, 0);
  assert.equal(structures.coverage.integration_performed, false);
  assert.equal(data.coverage.exhaustive_transcription, false);
  assert.equal(data.coverage.content_units, data.units.length);
  assert.equal(structures.coverage.structures, structures.structures.length);
  assert.equal(structures.scene_connection_specification.status, 'future_connection_only');
  assert.equal(data.coverage.by_commentator.length, 9);
  for (const coverage of data.coverage.by_commentator) {
    assert.equal(coverage.units, data.units.filter(item => item.commentator_id === coverage.commentator_id).length);
  }
  for (const prior of data.provenance) {
    const bytes = readFileSync(new URL(`../${prior.path}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), prior.sha256, prior.path);
  }
});
