import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AHAVAT_COMPANION_PAGE_COUNTS, ahavatCompanionReadingUnits, ahavatCompanionUnitId } from '../src/data/ahavatTorahSystem2029.js';
import { AHAVAT_READER_UNITS, ahavatReaderUnit, ahavatReaderUnitHref } from '../src/data/ahavatTorahReaderUnits2029.js';
import { AHAVAT_ERRATA_LINKS } from '../src/data/ahavatTorahContentDepth2029.js';
import { ahavatNativePdfFinalPageAtEnd } from './fixtures/ahavat-native-pdf-page-2029.mjs';
import { AHAVAT_BOOK_COMPLETION_PAGES, ahavatBeforeBookCompletion } from './fixtures/ahavat-book-completion-baseline-2029.mjs';
const bundle = JSON.parse(readFileSync(new URL('../public/book-data/ahavat-torah.commentary.json', import.meta.url)));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('terminal native PDF geometry accepts only the actual last page fully visible at the clamped document end', () => {
  const actual={loadState:'success',documentPages:99,pageIndex:98,viewportHeight:640,requestedRect:{x:24,y:380.6379310344819,width:203.8448275862069,height:256.3448275862069},previousRect:{y:119.22413793103624,height:256.3448275862069}};
  assert.equal(ahavatNativePdfFinalPageAtEnd(actual),true);
  for(const change of [{loadState:'loading'},{documentPages:98},{pageIndex:97},{requestedRect:{...actual.requestedRect,y:-1}},{requestedRect:{...actual.requestedRect,y:250}},{requestedRect:{...actual.requestedRect,height:400}},{requestedRect:{...actual.requestedRect,width:0}},{previousRect:null},{previousRect:{y:380,height:20}}]) assert.equal(ahavatNativePdfFinalPageAtEnd({...actual,...change}),false);
});

test('historical page digest and 189 units remain pinned apart from the one explicit source-backed colophon correction', () => {
  assert.equal(digest(bundle.pages.map(ahavatBeforeBookCompletion)), '76beb9680f36af8fc3dc3ad91475ab6678f2c6c4c812a4f472056deb60071c70');
  assert.equal(AHAVAT_READER_UNITS.length, 287);
  assert.equal(bundle.coverage.deep_research_pages, 15);
  assert.deepEqual(bundle.coverage.visual_or_blank_pages, [45]);
  assert.equal(bundle.pages[44].companion_units, undefined);
});

test('nine existing editorial identities gain source return without replacing source rows or any of the other eight notes', () => {
  assert.equal(digest(AHAVAT_ERRATA_LINKS.slice(1)), 'b6e388924333fff1ce90e0d957d8577ffa673796995d847c17c5231007f1e0c5');
  for (const note of AHAVAT_ERRATA_LINKS) {
    const unit = ahavatReaderUnit(note.id);
    assert.equal(unit.page, 99); assert.equal(unit.layer, 'printed-note');
    assert.equal(unit.datasetId, 'DS-12');
    const url = new URL(ahavatReaderUnitHref(note.id), 'https://books.invalid');
    assert.equal(url.searchParams.get('readerUnit'), note.id);
    assert.equal(url.searchParams.get('page'), '99');
    assert.equal(url.searchParams.get('scroll'), null);
    assert.equal(url.searchParams.get('scrollKind'), null);
  }
  for (const id of ['ds12:unknown', 'ds12:migdaloz-amor:14', 'migdaloz-amor']) assert.equal(ahavatReaderUnit(id), null);
  assert.equal(AHAVAT_READER_UNITS.length, 287);
});

test('all thirty-five completion pages have source-bound explanations and all 98 readable pages are covered', () => {
  const ids = new Set();
  for (const physical of AHAVAT_BOOK_COMPLETION_PAGES) {
    const expected = physical <= 3 || physical === 44 ? 1 : physical < 25 ? 3 : 2;
    const units = bundle.pages[physical - 1].companion_units;
    assert.equal(units.length, expected);
    assert.equal(ahavatCompanionReadingUnits(bundle, physical).length, expected);
    assert.equal(AHAVAT_COMPANION_PAGE_COUNTS[physical], expected);
    for (const [i, unit] of units.entries()) {
      assert.equal(unit.id, ahavatCompanionUnitId(physical, i + 1));
      assert.equal(unit.pdf_page, physical);
      assert.equal(unit.source_anchor, `#page=${physical}&view=FitH`);
      assert.equal(unit.display_label, 'הסבר נלווה');
      assert.equal(unit.scope, 'selected_passage_not_exhaustive');
      assert.equal(unit.source_basis, 'embedded_text_and_visual_page_review');
      assert.ok(unit.explanation.length > 200 && unit.question.length > 20 && unit.takeaway.length > 35, unit.id);
      assert.ok(!('quote' in unit) && !('engine_verified' in unit) && !('count' in unit));
      const projection = ahavatReaderUnit(unit.id);
      assert.equal(projection.page, physical); assert.equal(projection.layer, 'companion');
      const url = new URL(ahavatReaderUnitHref(unit.id), 'https://books.invalid');
      assert.equal(url.searchParams.get('page'), String(physical));
      assert.equal(url.searchParams.get('readerUnit'), unit.id);
      assert.ok(!ids.has(unit.id)); ids.add(unit.id);
    }
  }
  assert.equal(ids.size, 78);
  assert.equal(bundle.pages.filter(p => p.companion_units).length, 98);
  assert.equal(bundle.pages.flatMap(p => p.companion_units || []).length, 267);
  assert.deepEqual(bundle.pages.filter(p => ahavatCompanionReadingUnits(bundle, p.pdf_page).length).map(p => p.pdf_page), Array.from({length:99},(_,i)=>i+1).filter(p=>p!==45));
});

test('new namespaces, variable lengths and source-layer constraints fail closed', () => {
  for (const id of ['ahavat-migdal-p001-01', 'ahavat-front-p006-01', 'ahavat-front-p001-02', 'ahavat-migdal-p006-04', 'ahavat-front-p01-01']) assert.equal(ahavatReaderUnit(id), null);
  for (const physical of [1, 4, 6, 15, 25, 31, 35, 42, 43, 44]) for (const mutate of [
    b => b.pages[physical - 1].companion_units.push(b.pages[physical - 1].companion_units[0]),
    b => b.pages[physical - 1].companion_units[0].source_anchor = '#page=45&view=FitH',
    b => b.pages[physical - 1].companion_units[0].display_label = 'דברי הספר',
    b => b.pages[physical - 1].companion_units[0].explanation = '',
  ]) { const bad = structuredClone(bundle); mutate(bad); assert.deepEqual(ahavatCompanionReadingUnits(bad, physical), []); }
});

test('source-specific distinctions remain attributed and do not turn symbolic readings into measured geometry', () => {
  const text = n => JSON.stringify(bundle.pages[n - 1].companion_units);
  assert.match(text(3), /תשס״ג/); assert.match(bundle.pages[2].companion_explanation, /מהדורת תשס״ג/);
  assert.doesNotMatch(bundle.pages[2].companion_explanation, /תשמ״ג/);
  assert.match(text(4), /המהדיר/); assert.match(text(5), /לא בדיקה עצמאית/);
  assert.match(text(7), /הנחת הדרשה/); assert.match(text(9), /הדיבור המשותף/);
  assert.match(text(10), /לא להציג נפח אדריכלי מדוד/);
  assert.match(text(12), /מנהג אשכנז/); assert.match(text(13), /אין זו הוראה לדלג/);
  assert.match(text(15), /אין מנסכים יין מזוג/);
  assert.match(text(25), /קרוב לשליש/); assert.match(text(31), /אוריין תליתאי/);
  assert.match(text(35), /מצטבר/); assert.match(text(42), /304,812/);
  assert.match(text(43), /מולד/); assert.match(text(44), /חלק ב׳/);
  assert.doesNotMatch(AHAVAT_BOOK_COMPLETION_PAGES.map(text).join(''), /מאומת במנוע/);
});
