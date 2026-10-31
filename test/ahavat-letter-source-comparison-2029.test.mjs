import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS} from "../src/data/ahavatTorahLetters2029.js";
import {ahavatReaderUnit, ahavatLetterUnitId, ahavatReaderUnitHref} from "../src/data/ahavatTorahReaderUnits2029.js";
import {AHAVAT_LETTER_COMPARISON_ANCHOR, ahavatLetterParashaEntries, ahavatLetterComparisonRows, ahavatLetterComparisonTarget, ahavatLetterComparisonHref, ahavatParashaLettersCsv} from "../src/components/books2029/ahavatLetterJourney2029.js";
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const entries=form=>ahavatLetterParashaEntries(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,form);
const pair=(form,from,to)=>ahavatLetterComparisonRows(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,form,from,to);
const id=entry=>ahavatLetterUnitId(entry.source.form,entry.bookId,entry.row.parasha);
test("comparison reuses all 1512 source references in printed book/parasha order, keeping 24 null values",()=>{
  let rows=0,missing=0;
  for(const source of AHAVAT_LETTER_FORMS){
    const projected=entries(source.form);assert.equal(projected.length,54);
    assert.deepEqual(projected.map(entry=>entry.row),AHAVAT_LETTER_READINGS[source.form].flatMap(book=>book.rows));
    for(const entry of projected){const book=AHAVAT_LETTER_READINGS[source.form].find(book=>book.id===entry.bookId);assert.equal(entry.source,source);assert.equal(entry.row,book.rows.find(row=>row.parasha===entry.row.parasha));assert.equal(entry.book,book.title);assert.equal(ahavatReaderUnit(id(entry)).page,entry.row.page);if(entry.row.count===null)missing++;rows++;}
  }
  assert.equal(rows,1512);assert.equal(missing,24);assert.deepEqual(entries("unknown"),[]);
});
test("every ordered two-parasha choice preserves the exact original pair, including cross-book choices and reversal",()=>{
  let choices=0;
  for(const source of AHAVAT_LETTER_FORMS){const rows=entries(source.form);for(const first of rows)for(const second of rows){const result=pair(source.form,first.row.parasha,second.row.parasha);if(first===second){assert.deepEqual(result,[]);continue;}assert.equal(result.length,2);assert.equal(result[0].row,first.row);assert.equal(result[1].row,second.row);assert.equal(id(result[0]),id(first));assert.equal(id(result[1]),id(second));choices++;}}
  assert.equal(choices,80136);assert.deepEqual(pair("ד","צו","unknown"),[]);assert.deepEqual(pair("ד","","בראשית"),[]);assert.deepEqual(pair("unknown","צו","בראשית"),[]);
});
test("comparison CSV copies two readings only, retaining null blanks, source pages and canonical IDs",()=>{
  const rows=pair("ז","האזינו","בראשית"),csv=ahavatParashaLettersCsv(rows,"https://source.invalid/book.pdf");
  assert.equal(rows[0].row.count,null);assert.ok(csv.startsWith("\uFEFF"));const lines=csv.slice(1).trimEnd().split("\r\n");assert.equal(lines.length,3);
  rows.forEach((entry,index)=>{const cells=lines[index+1].slice(1,-1).split('","').map(s=>s.replaceAll('""','"'));assert.equal(cells[3],entry.row.parasha);assert.equal(cells[5],entry.row.printed);assert.equal(cells[6],entry.row.count===null?"":String(entry.row.count));assert.equal(cells[7],String(entry.row.page));assert.equal(cells[8],`https://source.invalid/book.pdf#page=${entry.row.page}&view=FitH`);assert.equal(cells[9],id(entry));});
  assert.doesNotMatch(lines[0],/סכום|פער|אחוז|דירוג|מאומת/);
});
test("comparison return accepts only an open focused-letter pair containing the exact canonical unit",()=>{
  const rows=pair("ד","צו","בראשית"),unitId=id(rows[1]);
  const params=new URLSearchParams({study:"letters",letterComparison:"open",letterComparisonFrom:"צו",letterComparisonTo:"בראשית",letterComparisonFocus:unitId});
  const target=p=>ahavatLetterComparisonTarget(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,p,unitId);
  assert.equal(target(params),unitId);
  for(const [key,value] of [["study","all"],["letterComparison","closed"],["letterComparisonFrom","בראשית"],["letterComparisonTo","forged"],["letterComparisonFocus",id(rows[0])]]){const bad=new URLSearchParams(params);bad.set(key,value);assert.equal(target(bad),null);}
  assert.equal(ahavatLetterComparisonTarget(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,params,"letter-page:ד:35"),null);
  assert.equal(ahavatLetterComparisonTarget(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,params,"forged"),null);
});
test("presentation return changes only the canonical href fragment and preserves identity, physical page and pair",()=>{
  const row=pair("ד","צו","בראשית")[1],unitId=id(row),url=new URL("https://preview.invalid/2029/control");
  for(const [key,value] of Object.entries({study:"letters",letterComparison:"open",letterComparisonFrom:"צו",letterComparisonTo:"בראשית",letterComparisonFocus:unitId,page:"99",readerUnit:unitId}))url.searchParams.set(key,value);
  const canonical=ahavatReaderUnitHref(unitId,url.href),result=ahavatLetterComparisonHref(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,unitId,url.href);
  assert.equal(result,canonical.replace(/#.*$/,`#${AHAVAT_LETTER_COMPARISON_ANCHOR}`));
  const parsed=new URL(result,url);assert.equal(parsed.searchParams.get("page"),String(row.row.page));assert.equal(parsed.searchParams.get("readerUnit"),unitId);
  url.searchParams.delete("letterComparison");assert.equal(ahavatLetterComparisonHref(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,unitId,url.href),ahavatReaderUnitHref(unitId,url.href));
  assert.equal(ahavatLetterComparisonHref(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,"forged",url.href),"");
});
test("comparison stays explicit depth in the same reader, never creates a source identity, numeric result or GPU",()=>{
  const component=read("src/components/books2029/AhavatLetterComparison2029.jsx"),page=read("src/pages/AhavatTorahSystem2029Page.jsx"),parent=read("src/components/books2029/AhavatLetterParasha2029.jsx");
  assert.match(parent,/ownsSourceAnchor && selected \? <AhavatLetterComparison2029/);assert.match(component,/open \? <>/);assert.match(component,/entry\.row\.count === null/);assert.match(component,/ahavatParashaLettersCsv\(pair,/);assert.match(component,/data-ahavat-comparison-unit/);
  assert.doesNotMatch(component,/data-reader-unit|fetch\(|localStorage|Canvas|webgl|three|מאומת במנוע|\.reduce\(|\.sort\(/);
  assert.match(page,/comparisonSourceControl\(readerUnit\.id\) \|\| document\.getElementById/);assert.match(page,/sourceReturnHref\(readerUnit\.id\)/);assert.match(page,/readingPlace\.getBoundingClientRect\(\)\.top - 84/);
});
