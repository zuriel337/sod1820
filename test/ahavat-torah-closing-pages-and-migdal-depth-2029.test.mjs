import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ahavatCompanionReadingUnits} from '../src/data/ahavatTorahSystem2029.js';
import {AHAVAT_READER_UNITS,ahavatReaderUnit,ahavatReaderUnitHref} from '../src/data/ahavatTorahReaderUnits2029.js';

const bundle=JSON.parse(readFileSync(new URL('../public/book-data/ahavat-torah.commentary.json',import.meta.url)));
const closing=bundle.pages.filter(p=>p.pdf_page>=93);
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('all seven closing pages add 21 source-bound companion units without changing the preceding 141',()=>{
 assert.equal(bundle.pages.length,99);assert.equal(AHAVAT_READER_UNITS.length,287);
 assert.equal(digest(bundle.pages.filter(p=>p.pdf_page>=46&&p.pdf_page<=92)),'10c1a39da457442dd5bb5519f0315ccc6a42e0cdb9e457ae2a84d1886d113f45');
 assert.deepEqual(closing.map(p=>p.pdf_page),[93,94,95,96,97,98,99]);
 for(const page of closing){
  const units=ahavatCompanionReadingUnits(bundle,page.pdf_page);assert.equal(units.length,3);
  assert.equal(page.work_id,`ahavat-torah-pdf-${page.pdf_page}`);
  assert.ok(page.companion_explanation.length>180);
  for(const [i,u] of page.companion_units.entries()){
   assert.equal(u.id,`ahavat-novellae-p${String(page.pdf_page).padStart(3,'0')}-0${i+1}`);
   assert.equal(u.pdf_page,page.pdf_page);assert.equal(u.source_anchor,`#page=${page.pdf_page}&view=FitH`);
   assert.equal(u.display_label,'הסבר נלווה');assert.equal(u.source_basis,'embedded_text_and_visual_page_review');
   assert.equal(u.scope,'selected_passage_not_exhaustive');
   assert.ok(u.question.length>20&&u.explanation.length>200&&u.takeaway.length>35);
   assert.ok(!('quote' in u)&&!('engine_verified' in u)&&!('count' in u));
   const identity=ahavatReaderUnit(u.id);assert.equal(identity.page,page.pdf_page);assert.equal(identity.layer,'companion');
   const link=new URL(ahavatReaderUnitHref(u.id,'/2029/control?dataset=DS-01&finding=stale'),'https://books.invalid');
   assert.equal(link.searchParams.get('readerUnit'),u.id);assert.equal(link.searchParams.get('page'),String(page.pdf_page));
   assert.equal(link.searchParams.get('dataset'),null);assert.equal(link.searchParams.get('finding'),null);
  }
 }
});

test('authorial closing remarks and editor notes retain attribution and an unanswered question',()=>{
 const last=closing.at(-1);
 assert.match(last.companion_units[0].explanation,/כלי יקר/);
 assert.match(last.companion_units[1].explanation,/ר׳ יהושע ברי״צ ליימן/);
 assert.match(last.companion_units[1].explanation,/לא המשך בלתי מסומן של דברי המחבר/);
 assert.match(last.companion_units[2].explanation,/בצריך עיון ואינה מציעה פתרון/);
 assert.match(closing[1].companion_explanation,/נקודת מעבר בתוך אותו עמוד PDF/);
 assert.match(closing[5].companion_explanation,/אינו טבלת מניינים/);
 assert.doesNotMatch(JSON.stringify(closing),/מאומת במנוע/);
});

test('wrong closing-page source, mistaken layer, duplicate identities and empty explanation fail closed',()=>{
 for(const mutate of [
  b=>b.source_pdf_sha256='foreign',b=>b.pages[98].companion_units[1].source_anchor='#page=87&view=FitH',
  b=>b.pages[98].companion_units[1].display_label='דברי הספר',b=>b.pages[98].companion_units[1].explanation='',
  b=>b.pages[98].companion_units[1].id=b.pages[98].companion_units[0].id,
 ]){const bad=structuredClone(bundle);mutate(bad);assert.deepEqual(ahavatCompanionReadingUnits(bad,99),[]);}
 for(const id of ['ahavat-novellae-p100-01','ahavat-novellae-p099-04','ahavat-novellae-p99-01'])assert.equal(ahavatReaderUnit(id),null);
});
