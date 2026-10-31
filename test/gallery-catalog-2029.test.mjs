import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicGalleryCatalog2029, galleryImageDatePresentation } from '../src/lib/research/topicSourceContext.js';
import { getGalleriesOverview } from '../src/lib/supabase.js';
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const gallery=(n=69)=>({id:id(n),wp_gallery_id:n,name:`גלרית 14 - ${n===69?5:7}`,img_count:9999});
const image=(n,g=69,ordering=n)=>({id:id(n+1000),gallery_id:id(g),wp_gallery_id:g,published:1,min_tier:0,curator_hidden:false,
  ordering,image_url:`https://example.test/storage/v1/object/public/media/${n}.png`,thumb_url:`https://example.test/storage/v1/object/public/media/${n}-thumb.png`});

test('catalog preserves names/IDs, computes public-only counts and uses the first stored image',()=>{
  const input={gals:[gallery(),gallery(73)],imgs:[image(2,69,8),image(1,69,0),image(3,73),{...image(4),published:0},{...image(5),min_tier:1},{...image(6),curator_hidden:true}]};
  const snapshot=JSON.stringify(input),r=buildPublicGalleryCatalog2029(input);
  assert.deepEqual(r.items.map(x=>x.wpGalleryId),[73,69]);assert.equal(r.items[1].originalName,'גלרית 14 - 5');
  assert.equal(r.items[1].imageCount,2);assert.equal(r.items[1].cover.galleryImageId,id(1001));
  assert.equal(r.items[1].href,'/world?view=gallery&gallery=69');assert.equal(JSON.stringify(input),snapshot);
  assert.equal(r.coverage.partial,false);
});
test('private-only or empty metadata never creates a catalog card; legacy unqualified cache rows fail closed',()=>{
  for(const imgs of [[],[{...image(1),published:undefined}],[{...image(1),min_tier:undefined}],[{...image(1),published:0}]]) {
    assert.equal(buildPublicGalleryCatalog2029({gals:[gallery()],imgs}).items.length,0);
  }
});
test('mismatched membership and ambiguous gallery IDs are withheld; bounded coverage remains explicit',()=>{
  const wrong=buildPublicGalleryCatalog2029({gals:[gallery()],imgs:[{...image(1),gallery_id:id(73)}]});
  assert.equal(wrong.items.length,0);assert.equal(wrong.coverage.partial,true);
  const conflict=buildPublicGalleryCatalog2029({gals:[gallery(),{...gallery(),id:id(90)}],imgs:[image(1)]});
  assert.equal(conflict.items.length,0);assert.equal(conflict.coverage.partial,true);
  assert.equal(buildPublicGalleryCatalog2029({gals:[gallery()],imgs:[image(1)],coverage:{partial:true}}).coverage.partial,true);
});
test('same-source duplication is not another image; signed/private thumbnails are not exposed',()=>{
  const first={...image(1),thumb_url:'https://example.test/storage/v1/object/sign/x/y?token=private'};
  const r=buildPublicGalleryCatalog2029({gals:[gallery()],imgs:[first,first,image(2)]});
  assert.equal(r.items[0].imageCount,2);
  assert.ok(!JSON.stringify(r).includes('token='));
});
function client({gals=[gallery()],pages=[[image(1)]],errorTable=null,galleryCount=gals.length}={}) {
  const calls=[];
  return {calls,from(table){const bounds=[];
    const query=Object.fromEntries(['select','eq','not','order','range'].map(key=>[key,(...args)=>{calls.push([table,key,...args]);if(key==='range')bounds.push(args);return query;}]));
    query.then=resolve=>Promise.resolve({data:table==='galleries'?gals:pages[Math.floor((bounds.at(-1)?.[0]||0)/1000)]||[],
      count:table==='galleries'?galleryCount:null,error:table===errorTable?Error('offline'):null}).then(resolve);return query;}};
}
test('public overview is lightweight, strictly gated, stable paged, cache-isolated and error-explicit',async()=>{
  const c=client();const r=await getGalleriesOverview({client:c,publicSourceOnly:true});
  for(const [key,value] of [['published',1],['min_tier',0]])assert.ok(c.calls.some(x=>x[1]==='eq'&&x[2]===key&&x[3]===value));
  assert.ok(c.calls.some(x=>x[1]==='not'&&x[2]==='curator_hidden'));
  assert.ok(c.calls.filter(x=>x[1]==='select').every(x=>!String(x[2]).replace('date_derived:ocr_meta->>date_derived','').match(/description|ocr|img_count/)));
  assert.ok(c.calls.some(x=>x[1]==='select'&&String(x[2]).includes('occurred_at,created_at,date_derived:ocr_meta->>date_derived')));
  assert.ok(c.calls.filter(x=>x[1]==='order').every(x=>x[2]==='id'));
  assert.equal(r.coverage.partial,false);
  await assert.rejects(getGalleriesOverview({client:client({errorTable:'galleries'}),publicSourceOnly:true}),/offline/);
  await assert.rejects(getGalleriesOverview({client:client({errorTable:'gallery_images'}),publicSourceOnly:true}),/offline/);
  const replacement=client({gals:[gallery(73)],pages:[[image(2,73)]]});
  assert.equal((await getGalleriesOverview({client:replacement,publicSourceOnly:true})).gals[0].wp_gallery_id,73);
});
test('legacy overview defaults retain original fields, date order and error behavior',async()=>{
  const c=client({errorTable:'gallery_images'});await getGalleriesOverview({client:c});
  assert.ok(c.calls.find(x=>x[0]==='galleries'&&x[1]==='select')[2].includes('img_count'));
  assert.ok(c.calls.find(x=>x[0]==='gallery_images'&&x[1]==='select')[2].includes('description'));
  assert.deepEqual(c.calls.filter(x=>x[1]==='order').map(x=>x[2]),['occurred_at','created_at']);
  assert.equal(c.calls.filter(x=>x[1]==='eq').length,0);
});
test('public overview bounds corpus reads and reports truncation rather than complete totals',async()=>{
  const thousand=Array.from({length:1000},(_,n)=>image(n));
  const c=client({pages:Array(10).fill(thousand),galleryCount:2000});
  const r=await getGalleriesOverview({client:c,publicSourceOnly:true});
  assert.equal(c.calls.filter(x=>x[0]==='gallery_images'&&x[1]==='range').length,10);
  assert.equal(r.imgs.length,10000);assert.equal(r.coverage.partial,true);
});
test('photo date is provenance, preserves month precision, and never fabricates a day or event',()=>{
  const item = (occurredAt,createdAt,derivedFrom)=>({legacyPlacement:{occurredAt,createdAt,dateProvenance:{occurredAt:{derivedFrom}}}});
  assert.deepEqual(galleryImageDatePresentation(item('2021-05-05',null,'name')),{
    label:'05.05.2021',kind:'מקור',dateTime:'2021-05-05',description:'תאריך שנשמר עם התמונה; אינו תאריך אירוע מאומת'});
  assert.deepEqual(galleryImageDatePresentation(item('2021-05-01',null,'path')),{
    label:'05.2021',kind:'תיקייה',dateTime:'2021-05',description:'חודש תיקיית המקור; יום האירוע אינו ידוע'});
  assert.equal(galleryImageDatePresentation(item(null,'2026-06-12T23:02:06Z')).kind,'ארכיון');
  assert.equal(galleryImageDatePresentation(item('2021-02-31','2026-06-12T23:02:06Z')).kind,'ארכיון');
  assert.equal(galleryImageDatePresentation(item(null,null)),null);
  assert.equal(galleryImageDatePresentation(item('bad','bad')),null);
  assert.equal(galleryImageDatePresentation({occurredAt:'2021-05-05'}),null,'only exact placement dates');
});
test('catalog cover carries only selected public date provenance including the JSON date-derived leaf',()=>{
  const r=buildPublicGalleryCatalog2029({gals:[gallery()],imgs:[{...image(1),occurred_at:'2021-05-01',date_derived:'path',created_at:'2026-06-12T23:02:06Z'}]});
  assert.equal(galleryImageDatePresentation(r.items[0].cover).label,'05.2021');
  assert.equal(galleryImageDatePresentation(r.items[0].cover).kind,'תיקייה');
});
