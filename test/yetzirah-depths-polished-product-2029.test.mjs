import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DEPTHS_GUIDE,DEPTHS_SOURCE_LOCUS} from '../src/components/books2029/depthsLearningGuide2029.js';

const data=JSON.parse(readFileSync(new URL('../public/book-data/sefer-yetzirah.structures.json',import.meta.url)));
const spec=data.structures.find(s=>s.id==='sy-structure:ten-depths');

test('five companion stations follow the existing source pairs, without adding spatial axes',()=>{
 assert.equal(DEPTHS_GUIDE.length,5);
 assert.equal(spec.components.length,10);
 assert.equal(spec.source_relations.length,5);
 const names=spec.source_relations.map(r=>[r.from_id,r.to_id]);
 assert.deepEqual(names,[['beginning','end'],['good','evil'],['up','down'],['east','west'],['north','south']]);
 for(const [index,guide] of DEPTHS_GUIDE.entries()){
  assert.ok(guide.title&&guide.explanation.length>80&&guide.question);
  assert.equal(typeof guide.category,'string');
  assert.ok(!guide.explanation.includes('מאומת במנוע'));
  assert.equal(spec.source_relations[index].source.pdf_page,53);
 }
 for(const c of spec.components)assert.equal(c.source.pdf_page,DEPTHS_SOURCE_LOCUS.pdfPage);
});

test('the shared paragraph crop is bounded in the original page, not an invented word locator',()=>{
 const p=DEPTHS_SOURCE_LOCUS;
 assert.equal(p.pdfPage,53);
 assert.equal(p.imageWidth,1591);assert.equal(p.imageHeight,2250);
 assert.ok(p.x>0&&p.y>0&&p.width>0&&p.height>0);
 assert.ok(p.x+p.width<p.imageWidth&&p.y+p.height<p.imageHeight);
 assert.match(p.label,/פסקת עשרת העומקים/);
 assert.equal(p.sourceSha256,'2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a');
});

test('the reading image is the recorded source derivative, not a generated reconstruction',()=>{
 const bytes=readFileSync(new URL('../public/book-data/sefer-yetzirah-page53-reading.webp',import.meta.url));
 assert.equal(bytes.length,413076);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'2b7d6ab4c0f7d62878d4d9e4885347e59a639e70cde653cddd539256c3ff674c');
 assert.equal(bytes.subarray(8,12).toString(),'WEBP');
});
