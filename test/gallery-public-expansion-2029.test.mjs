import test from 'node:test';
import assert from 'node:assert/strict';
import { getImagesByGallery } from '../src/lib/supabase.js';
import { loadPublicGallerySourceWindow, gallerySourceHref2029, buildGallerySourceContext, galleryOccurrenceItem } from '../src/lib/research/topicSourceContext.js';
import { worldMediaPublicShare } from '../src/lib/research/worldFindingShare.js';
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const row = (n, gallery=69) => ({ id:id(n),wp_gallery_id:gallery,ordering:n,published:1,min_tier:0,curator_hidden:false,
  image_url:`https://example.test/storage/v1/object/public/media/${n}.png`,name:`תמונה ${n}`,description:`כיתוב ${n}` });

test('every historical gallery uses the same bounded public occurrence reader, with original order', async () => {
  for (const gallery of [54,69,73,105,99999]) {
    const rows = Array.from({length:17},(_,i)=>row(i,gallery));
    const calls=[];
    const result=await loadPublicGallerySourceWindow({ wpGalleryId:gallery,imageId:id(13),
      listGalleryImages:async actual=>{assert.equal(actual,gallery);return [...rows].reverse();},
      fetchSourceContext:async({imageIds})=>{calls.push(imageIds);return {items:buildGallerySourceContext({images:rows.filter(r=>imageIds.includes(r.id))})};} });
    assert.equal(result.status,'ready');assert.equal(result.page.offset,12);
    assert.deepEqual(calls,[rows.slice(12,17).map(r=>r.id)]);
    const selected=galleryOccurrenceItem(result.selected);
    assert.equal(selected.legacyPlacement.wpGalleryId,gallery);
    assert.equal(selected.legacyPlacement.originalCaption,'כיתוב 13');
    assert.equal(worldMediaPublicShare(selected,{origin:'https://preview.example.test'}).url,
      'https://preview.example.test'+gallerySourceHref2029(gallery,id(13)));
  }
});
test('a valid new locator is not publication permission, exact membership or a sibling substitute', async () => {
  for (const patch of [{published:0},{min_tier:1},{curator_hidden:true},{wp_gallery_id:73}]) {
    const r=await loadPublicGallerySourceWindow({wpGalleryId:69,imageId:id(1),listGalleryImages:async()=>[row(1)],
      fetchSourceContext:async()=>({items:buildGallerySourceContext({images:[{...row(1),...patch}]})})});
    assert.equal(r.status,'unavailable');assert.equal(galleryOccurrenceItem(r.selected),null);
  }
});
test('invalid windows fail before any read, even with exact-image selection', async () => {
  let calls=0;
  for(const bad of [{limit:0},{limit:13},{limit:Infinity},{offset:-1},{offset:1.1},{wpGalleryId:Number.MAX_SAFE_INTEGER+1},{imageId:'bad'}]) {
    await assert.rejects(loadPublicGallerySourceWindow({wpGalleryId:69,imageId:id(1),listGalleryImages:async()=>{calls++;return[];},...bad}),RangeError);
  }
  assert.equal(calls,0);
});
test('empty public gallery is distinct from failed listing and from withdrawn selection', async () => {
  const options={wpGalleryId:102,listGalleryImages:async()=>[],fetchSourceContext:async()=>{throw Error('must not read');}};
  assert.equal((await loadPublicGallerySourceWindow(options)).status,'empty_window');
  assert.equal((await loadPublicGallerySourceWindow({...options,imageId:id(1)})).status,'unavailable');
  await assert.rejects(loadPublicGallerySourceWindow({...options,listGalleryImages:async()=>{throw Error('offline');}}),/offline/);
});
function client(result) {
  const calls=[];
  const query=Object.fromEntries(['select','eq','not','order'].map(key=>[key,(...args)=>{calls.push([key,...args]);return query;}]));
  query.then=resolve=>Promise.resolve(result).then(resolve);
  return {calls,from(table){calls.push(['from',table]);return query;}};
}
test('existing gallery list reader keeps Legacy behavior and offers opt-in public/error gates',async()=>{
  const legacy=client({data:[row(1)],error:null});
  assert.equal((await getImagesByGallery(69,{client:legacy})).length,1);
  assert.ok(!legacy.calls.some(c=>c[0]==='eq'&&c[1]==='published'));
  const current=client({data:[row(1)],error:null});
  await getImagesByGallery(69,{client:current,publicSourceOnly:true,throwOnError:true});
  assert.ok(current.calls.some(c=>c[0]==='eq'&&c[1]==='published'&&c[2]===1));
  assert.ok(current.calls.some(c=>c[0]==='eq'&&c[1]==='min_tier'&&c[2]===0));
  assert.ok(current.calls.some(c=>c[0]==='not'&&c[1]==='curator_hidden'));
  const failure=()=>client({data:null,error:Error('offline')});
  assert.deepEqual(await getImagesByGallery(69,{client:failure()}),[]);
  await assert.rejects(getImagesByGallery(69,{client:failure(),throwOnError:true}),/offline/);
});
