import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryEditorialUpdate2029 as date,buildPublicGalleryCatalog2029 as catalog,galleryReadingFilters2029 as filters,
  projectGalleryReading2029 as project,loadPublicGalleryReading2029 as read,buildGallerySourceContext,resolvePublicGallerySelection,galleryReadingHref2029,galleryEntryActivity2029 as activity} from '../src/lib/research/topicSourceContext.js';
import {searchArchiveOcrIds} from '../src/lib/supabase.js';
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const gals=[{id:id(69),wp_gallery_id:69,name:'גלרית 14 - 5'},{id:id(73),wp_gallery_id:73,name:'גלרית 14 - 7'}];
const row=(n,g=69)=>({id:id(n+1000),gallery_id:id(g),wp_gallery_id:g,ordering:n,published:1,min_tier:0,curator_hidden:false,
  name:`עדכון ${String(n%28+1)}/8/2022 נוספה תמונה חדשה`,image_url:`https://example.test/public/${n}.png`,image_type:'gematria',primary_value:14,all_values:n%2?[14,45]:[14],description:'כיתוב מקור'});
test('authored dates validate calendars, exact offsets and ambiguity; no caption or missing-year inference',()=>{
  for(const name of ['עדכון 31/2/2022','עדכון תשפב','עדכון 5/13/2022','עדכון 1/1/22 וגם 2/1/22','תאריך 1/1/22','עדכון 1/1'])assert.equal(date(name),null,name);
  for(const [heading,iso] of [['עדכון מוצש 17-9-22 נוספה תמונה','2022-09-17'],['עדכון 13.5.2021','2021-05-13'],['עדכון 29/2/2024','2024-02-29']]){
    const r=date(heading);assert.equal(r.dateTime,iso);assert.equal(heading.slice(r.locator.start,r.locator.end),r.locator.quote);
  }
});
test('chronology is authored updates, unknown last; original order remains byte-preserved',()=>{
  const raw=[row(1),row(4,73),{...row(2),name:'בלי תאריך',occurred_at:'2099-01-01'}],snapshot=JSON.stringify(raw),c=catalog({gals,imgs:raw});
  const result=project(c,filters());assert.deepEqual(result.items.map(g=>g.wpGalleryId),[73,69]);
  assert.equal(result.items[1].entries.at(-1).name,'בלי תאריך');assert.equal(JSON.stringify(raw),snapshot);
  assert.deepEqual(project(c,filters('?sort=original')).items[1].entries.map(r=>r.ordering),[1,2]);
  assert.equal(c.items[0].originalName,'גלרית 14 - 7');
});
test('default activity includes stream additions across the full catalog, keeping authored/original lenses separate',()=>{
  const rows=[...Array.from({length:14},(_,i)=>row(i+1)),
    {...row(20,73),name:'בלי תאריך מקור',source:'update',stream_at:'2026-10-04T14:41:48.678998+00:00',
      occurred_at:'2000-01-01',created_at:'2099-01-01'}];
  const snapshot=JSON.stringify(rows),c=catalog({gals,imgs:rows}),r=project(c,filters());
  assert.equal(filters().order,'activity');assert.equal(filters('?sort=bad').order,'activity');
  assert.equal(r.items[0].wpGalleryId,73);assert.equal(r.items[0].updatedAt,null);
  assert.equal(r.items[0].latestActivity.basis,'gallery_images.stream_at');
  assert.equal(r.items[0].latestActivity.dateTime,rows.at(-1).stream_at);
  assert.equal(project(c,filters('?sort=date')).items[0].wpGalleryId,69);
  assert.equal(project(c,filters('?sort=oldest')).items[0].wpGalleryId,69);
  assert.deepEqual(project(c,filters('?sort=original')).items.map(g=>g.wpGalleryId),[73,69]);
  assert.equal(JSON.stringify(rows),snapshot,'activity never rewrites source dates or memberships');
  const href=galleryReadingHref2029('?sort=activity',{galleryId:73});
  assert.equal(new URL(href,'https://example.test').searchParams.get('sort'),'activity');
});
test('only public source=update stream timestamps rank; archive/event dates and invalid timestamps do not',()=>{
  const stamp='2026-10-04T14:41:48Z';
  for(const patch of [{source:'manual',stream_at:stamp},{stream_at:stamp},{source:'update',stream_at:'2099-02-31T00:00:00Z'},
    {source:'update',stream_at:'tomorrow'},{source:'update',stream_at:'2026-10-04'},{occurred_at:stamp,created_at:stamp}]){
    assert.equal(activity({...row(1),name:'בלי תאריך',...patch}),null);
  }
  const updated={...row(1),source:'update',stream_at:'2020-01-01T00:00:00Z'};
  assert.equal(activity(updated).basis,'original_update_heading');
  const c=catalog({gals,imgs:[row(1),{...row(2,73),name:'בלי תאריך',source:'update',stream_at:stamp,published:0},
    {...row(3,73),name:'בלי תאריך',source:'update',stream_at:stamp,min_tier:1},
    {...row(4,73),name:'בלי תאריך',source:'update',stream_at:stamp,curator_hidden:true}]});
  assert.deepEqual(project(c,filters()).items.map(g=>g.wpGalleryId),[69]);
});
test('activity is derived from matching rows only; equal/unknown dates have stable ordering without image reorder',()=>{
  const rows=[row(2),row(1),{...row(3,73),name:'בלי תאריך',source:'update',stream_at:'2026-10-04T14:41:48Z',primary_value:99,all_values:[99]},row(4,73)];
  const c=catalog({gals,imgs:rows}),filtered=project(c,filters('?nums=14'));
  assert.equal(filtered.items[0].latestActivity.basis,'original_update_heading');
  assert.equal(filtered.items[0].latestActivity.galleryImageId,row(4,73).id);
  assert.equal(project(c,filters('?year=2026')).total,0,'date filtering remains authored dates only');
  assert.deepEqual(project(c,filters()).items.find(g=>g.wpGalleryId===69).entries.map(r=>r.id),
    project(c,filters('?sort=date')).items.find(g=>g.wpGalleryId===69).entries.map(r=>r.id));
  const equal=catalog({gals,imgs:[{...row(1),name:'בלי תאריך'},{...row(2,73),name:'בלי תאריך'}]});
  assert.deepEqual(project(equal,filters()).items.map(g=>g.wpGalleryId),[69,73]);
  for(const r of equal.items)for(const entry of r.entries)Object.assign(entry,{source:'update',stream_at:'2026-10-04T14:41:48Z'});
  assert.deepEqual(project(equal,filters()).items.map(g=>g.wpGalleryId),[69,73]);
});
test('AND/OR means the same image, dominant-only, year/range/type/text/OCR and partial coverage',()=>{
  const c=catalog({gals,imgs:[row(1),row(2),{...row(3,73),primary_value:45,all_values:[45]}]});
  assert.equal(project(c,filters('?nums=14,45&mode=and')).total,1);
  assert.equal(project(c,filters('?nums=14,45')).total,3);
  assert.equal(project(c,filters('?nums=14,45&mode=and&primary=1')).total,0);
  assert.equal(project(c,filters('?year=2021')).total,0);
  assert.equal(project(c,filters('?from=2022-08-03&to=2022-08-03')).total,1);
  assert.equal(project(c,filters('?kind=event')).total,0);
  assert.equal(project(c,filters('?q=כיתוב')).total,3);
  assert.equal(project(c,filters('?q=מחט&ocr=1'),{ocrIds:[id(1001)],ocrPartial:true}).total,1);
  assert.equal(project(c,filters('?q=מחט&ocr=1'),{ocrIds:[id(1001)],ocrPartial:true}).coverage.partial,true);
  assert.equal(filters('?from=2022-02-31').from,null);
});
test('progressive reading uses existing 12-row public gates; whole prefix is refreshed on append/withdrawal',async()=>{
  const rows=Array.from({length:29},(_,i)=>row(i+1)),c=catalog({gals,imgs:rows}),g=project(c,filters('?sort=original')).items[0];
  const calls=[];let withdrawn=false;
  const fetchSourceContext=async({imageIds})=>{calls.push(imageIds);return {items:buildGallerySourceContext({images:rows.filter(r=>imageIds.includes(r.id)&&!(withdrawn&&r.id===rows[0].id)),galleries:gals})};};
  const first=await read({gallery:g,fetchSourceContext});assert.equal(first.page.scannedIds.length,12);assert.equal(first.page.totalListed,29);assert.equal(calls.length,1);
  withdrawn=true;calls.length=0;const more=await read({gallery:g,take:24,fetchSourceContext});assert.deepEqual(calls.map(x=>x.length),[12,12]);assert.equal(more.page.withheld,1);
  assert.equal(more.page.scannedIds.filter(id=>resolvePublicGallerySelection(more.page,id).status==='ready').length,23);
  assert.equal((await read({gallery:g,imageId:id(9999),fetchSourceContext})).status,'unavailable');
  await assert.rejects(read({gallery:g,take:121,fetchSourceContext}),RangeError);
});
test('shared source across two batches retains each exact occurrence once',async()=>{
  const rows=Array.from({length:24},(_,i)=>({...row(i+1),image_url:`https://example.test/storage/v1/object/public/media/${i}.png`}));rows[12].image_url=rows[0].image_url;
  const g=project(catalog({gals,imgs:rows}),filters('?sort=original')).items[0];
  const result=await read({gallery:g,take:24,fetchSourceContext:async({imageIds})=>({items:buildGallerySourceContext({images:rows.filter(r=>imageIds.includes(r.id)),occurrences:rows,galleries:gals})})});
  assert.equal(result.page.items.length,23);for(const r of rows)assert.equal(resolvePublicGallerySelection(result.page,r.id).status,'ready');
  assert.equal(result.page.withheld,0);
});
test('reading links preserve only public filters and exact locator, never share credential or private return parameters',()=>{
  const href=galleryReadingHref2029('?q=דוד&sort=date&nums=14,45&_vercel_share=secret&private=secret',{galleryId:69,imageId:id(1001),take:24});
  assert.ok(!href.includes('secret'));const url=new URL(href,'https://example.test');assert.equal(url.searchParams.get('take'),'24');assert.equal(url.searchParams.get('nums'),'14,45');assert.equal(url.hash,'#gallery-source-'+id(1001));
});
test('public OCR lookup gates publication/access, caps results, throws errors, never fetches text',async()=>{
  const calls=[];const query={};for(const k of ['select','eq','not','ilike','order','limit'])query[k]=(...a)=>{calls.push([k,...a]);return query;};
  query.then=f=>Promise.resolve({data:[{id:id(1)},{id:id(2)},{id:id(3)}],error:null}).then(f);
  const r=await searchArchiveOcrIds('מחט',{publicSourceOnly:true,limit:2,client:{from:()=>query}});
  assert.equal(r.rows.length,2);assert.equal(r.partial,true);assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='published'&&c[2]===1));
  assert.equal(calls.find(c=>c[0]==='select')[1],'id,gallery_id');assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='min_tier'&&c[2]===0));
  query.then=f=>Promise.resolve({error:Error('offline')}).then(f);await assert.rejects(searchArchiveOcrIds('מחט',{publicSourceOnly:true,client:{from:()=>query}}),/offline/);
});
