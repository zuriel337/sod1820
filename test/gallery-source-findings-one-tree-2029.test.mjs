import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {galleryReadingHref2029,gallerySourceHref2029,isExactGalleryFindingReturn2029 as allowed} from '../src/lib/research/topicSourceContext.js';
const id='7287ad08-1c7b-4642-a5c4-cecbbaf35b81',ref='gallery_images:'+id;
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('exact gallery return preserves original/filtered locator only for this finding source',()=>{
  const native=gallerySourceHref2029(105,id),flow=galleryReadingHref2029('?sort=original&nums=363&layout=compact',{galleryId:105,imageId:id,take:24});
  for(const href of [native,flow]){
    assert.equal(allowed(href,[ref]),true);assert.equal(allowed(href,[ref+'#stored-ocr:10-20']),true);
    assert.equal(allowed(href,['gallery_images:00000000-0000-4000-8000-000000000001']),false);
    assert.equal(allowed(href,['posts:105']),false);
  }
  for(const href of ['https://bad.example'+native,'//bad.example'+native,native.replace('#gallery-source-','#other-'),
    native+'&private=1',native.replace('&image=','&admin=1&image='),'/world?view=gallery&gallery=105',native.replace('gallery=105','gallery=bad')])assert.equal(allowed(href,[ref]),false,href);
});
test('Gallery consumes existing source component and existing anonymous reader, not number matching or another corpus',()=>{
  const gallery=read('src/pages/Gallery2029Page.jsx'),source=read('src/components/research/WorldZviSourceFindings2029.jsx');
  assert.match(gallery,/<WorldZviSourceFindings2029[^>]*scope="all" sourceRef=\{item.sourceRef\}/);
  assert.match(gallery,/onFindingOpen=\{\(\)=>onRemember\(item\)\}/);
  assert.match(source,/scope = 'zvi'/);assert.match(source,/fetchWorldPublicFindingsPage : fetchZviSourceFindingsPage/);
  assert.match(source,/row.sourceRef === exactSource/);assert.match(source,/onClick=\{load\}/);
  assert.match(source,/restart \? null : state.cursor/);assert.match(source,/restart \? initial\(\) : previous/);
  assert.doesNotMatch(source,/\.insert\(|\.update\(|\.rpc\(|promote|fetchCanonicalGraph|value:|contributorId:/);
  assert.match(read('src/pages/World2029Page.jsx'),/isExactGalleryFindingReturn2029\(returnHref, sourceRefs\)/);
});
