import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ahavatCompanionReadingUnits,ahavatCompanionUnitId} from '../src/data/ahavatTorahSystem2029.js';
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
 const reader=readFileSync(new URL('../src/pages/AhavatTorahSystem2029Page.jsx',import.meta.url),'utf8');
 assert.match(reader,/<b>מהלך הקריאה:<\/b>/);
 assert.doesNotMatch(reader,/מהלך המחבר/,'a shared companion heading must not misattribute printed editor notes to the author');
});

test('wrong closing-page source, mistaken layer, duplicate identities and empty explanation fail closed',()=>{
 for(const mutate of [
  b=>b.source_pdf_sha256='foreign',b=>b.pages[98].companion_units[1].source_anchor='#page=87&view=FitH',
  b=>b.pages[98].companion_units[1].display_label='דברי הספר',b=>b.pages[98].companion_units[1].explanation='',
  b=>b.pages[98].companion_units[1].id=b.pages[98].companion_units[0].id,
 ]){const bad=structuredClone(bundle);mutate(bad);assert.deepEqual(ahavatCompanionReadingUnits(bad,99),[]);}
 for(const id of ['ahavat-novellae-p100-01','ahavat-novellae-p099-04','ahavat-novellae-p99-01'])assert.equal(ahavatReaderUnit(id),null);
});

test('nine Migdal pages add 27 distinct identities while all unrelated page records stay byte-equivalent',()=>{
 const migdal=bundle.pages.filter(p=>p.pdf_page>=16&&p.pdf_page<=24);
 assert.equal(digest(bundle.pages.filter(p=>p.pdf_page<93&&(p.pdf_page<16||p.pdf_page>24))),'d7c7a5eab4fe3a3f26a66f1230b6c48a020920df1832b947781d5f8fad2909eb');
 assert.equal(digest(closing),'e73fabf341440c6024ec0585aaf85b7ee3eab91fddef4dd16d9d60aee1503dd6','the accepted closing-page checkpoint is preserved during Migdal continuation');
 assert.equal(migdal.length,9);const ids=[];
 for(const page of migdal){
  const units=ahavatCompanionReadingUnits(bundle,page.pdf_page);assert.equal(units.length,3);
  assert.equal(page.work_id,`ahavat-torah-pdf-${page.pdf_page}`);assert.ok(page.companion_explanation.length>180);
  assert.deepEqual(page.reading_points,page.companion_units.map(u=>u.title));
  for(const [i,u] of page.companion_units.entries()){
   assert.equal(u.id,`ahavat-migdal-p${String(page.pdf_page).padStart(3,'0')}-0${i+1}`);
   assert.equal(u.id,ahavatCompanionUnitId(page.pdf_page,i+1));assert.equal(u.source_anchor,`#page=${page.pdf_page}&view=FitH`);
   assert.equal(u.pdf_page,page.pdf_page);assert.equal(u.display_label,'הסבר נלווה');assert.equal(u.scope,'selected_passage_not_exhaustive');
   assert.equal(u.source_basis,'embedded_text_and_visual_page_review');assert.ok(u.explanation.length>200&&u.question.length>20&&u.takeaway.length>35);
   assert.ok(!('quote' in u)&&!('count' in u)&&!('engine_verified' in u));
   const identity=ahavatReaderUnit(u.id);assert.equal(identity.page,page.pdf_page);assert.equal(identity.layer,'companion');
   const link=new URL(ahavatReaderUnitHref(u.id),'https://books.invalid');assert.equal(link.searchParams.get('page'),String(page.pdf_page));
   assert.equal(link.searchParams.get('readerUnit'),u.id);ids.push(u.id);
  }
 }
 assert.equal(new Set(ids).size,27);
 const expanded=bundle.pages.filter(p=>p.companion_units);assert.equal(expanded.length,63);
 assert.equal(expanded.flatMap(p=>p.companion_units).length,189);
 assert.equal(new Set(expanded.flatMap(p=>p.companion_units.map(u=>u.id))).size,189);
 assert.equal(bundle.coverage.deep_research_pages,15,'historical exact-source coverage is not overwritten by companion page coverage');
});

test('Migdal explanations retain source-specific operations and do not invent cross-book geometry or verification',()=>{
 const units=page=>bundle.pages[page-1].companion_units;
 assert.match(units(17)[0].explanation,/הנחה בתוך דרשתו/);
 assert.match(units(17)[2].explanation,/מתוך חכמת הטבע בזמנו/);
 assert.match(units(18)[0].explanation,/אי־התאמות/);
 assert.match(units(18)[1].explanation,/חופפים/);
 assert.match(units(19)[2].explanation,/אין כאן טבלה המצמידה כל אות לשנה/);
 assert.match(units(20)[1].explanation,/אין להשלים ממדים/);
 assert.match(units(23)[1].explanation,/פער מן היעד/);
 assert.match(units(24)[1].explanation,/לא להחיל בלי בירור מילון שורשים מודרני/);
 assert.doesNotMatch(JSON.stringify(bundle.pages.filter(p=>p.pdf_page>=16&&p.pdf_page<=24)),/מאומת במנוע/);
});

test('Migdal page namespaces and source mismatches fail closed, with old novellae identities unchanged',()=>{
 for(const id of ['ahavat-novellae-p016-01','ahavat-migdal-p046-01','ahavat-migdal-p025-01','ahavat-migdal-p016-04','ahavat-migdal-p16-01'])assert.equal(ahavatReaderUnit(id),null);
 for(const [page,position] of [[15,1],[25,1],[45,1],[100,1],[16,0],[16,4],['16',1],[16,'1']])assert.equal(ahavatCompanionUnitId(page,position),'');
 for(const mutate of [b=>b.pages[15].companion_units[0].id='ahavat-novellae-p016-01',b=>b.pages[15].companion_units[0].pdf_page=17,b=>b.pages[15].companion_units[0].source_anchor='#page=17&view=FitH',b=>b.pages[15].companion_units[0].display_label='דברי הספר']){
  const bad=structuredClone(bundle);mutate(bad);assert.deepEqual(ahavatCompanionReadingUnits(bad,16),[]);
 }
 assert.equal(ahavatReaderUnit('ahavat-novellae-p046-01').page,46);
 assert.equal(ahavatReaderUnit('ahavat-novellae-p099-03').page,99);
});
