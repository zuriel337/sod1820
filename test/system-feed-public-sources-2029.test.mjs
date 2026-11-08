import test from 'node:test';import assert from 'node:assert/strict';
import {fetchSystemFeedPublicSources2029,publicChannelToSystemItem,publicGalleryToSystemItem,publicNowSourceHref,publicNowMediaHref} from '../src/lib/research/systemFeedPublicSources2029.js';
import {mergeSystemFeedItems,feedRows,feedSeenKey} from '../src/lib/systemFeed2029.js';
const id='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const row={id,channel:'or-geula',status:'live',page_only:false,expires_at:null,created_at:'2026-11-01T10:00:00Z',text:'מקור ציבורי 1820',link_url:null};
test('only explicit live non-page-only unexpired public channels enter Now; private metadata never enters DTO',()=>{
 const dto=publicChannelToSystemItem({...row,metadata:{email:'private@example.invalid'},credit:'+972501234567'});assert.equal(dto.publicState,'published_channel_update');assert.equal(dto.sourceRef,'channel_updates:'+id);assert.equal(dto.creator,'אור הגאולה');assert.equal('metadata' in dto,false);assert.equal('credit' in dto,false);assert.equal(dto.href,null);
 for(const x of[{status:'draft'},{status:'hidden'},{page_only:true},{page_only:null},{channel:'private-intake'},{channel:'torat-haremez'},{expires_at:'2020-01-01'},{expires_at:'invalid'},{id:'bad'},{text:'',image_url:null}])assert.equal(publicChannelToSystemItem({...row,...x}),null,JSON.stringify(x));
 const redacted=publicChannelToSystemItem({...row,text:'1820 user@example.invalid +972501234567 https://private.invalid/path'});assert.ok(!redacted.fullText.includes('@'));assert.ok(!redacted.fullText.includes('972'));assert.ok(!redacted.fullText.includes('https://'));assert.ok(redacted.fullText.includes('1820'));
});
test('real media-only updates remain represented, with public objects only and no fabricated link',()=>{
 const media='https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/clip.mp4';const dto=publicChannelToSystemItem({...row,text:'',image_url:media});assert.equal(dto.mediaHref,media);assert.match(dto.label,/סרטון/);assert.equal(dto.href,null);
 for(const url of['javascript:alert(1)','https://outside.invalid/image.jpg',media+'?token=private',media.replace('/public/','/authenticated/'),media.replace('/public/','/sign/')])assert.equal(publicNowMediaHref(url),null);
});
test('gallery activity preserves stream chronology, exact native image source and visibility',()=>{
 const g={id,wp_gallery_id:29,name:'עדכון ציבורי',description:'תיאור',source:'update',published:1,min_tier:0,curator_hidden:false,stream_at:'2026-11-01',created_at:'2026-10-01',occurred_at:'2020-01-01'};const dto=publicGalleryToSystemItem(g);assert.equal(dto.at,'2026-11-01T00:00:00.000Z');assert.equal(dto.occurredAt,'2020-01-01T00:00:00.000Z');assert.match(dto.href,/view=gallery&gallery=29&image=/);assert.ok(dto.href.endsWith('#gallery-source-'+id));
 for(const x of[{published:0},{min_tier:1},{curator_hidden:true},{source:'private'},{id:'bad'}])assert.equal(publicGalleryToSystemItem({...g,...x}),null);
 assert.equal(publicGalleryToSystemItem({...g,wp_gallery_id:null}).href,null);
});
test('Or HaGeula video pages open from Now by exact UUID only; the collection root, other paths and credentials stay closed',()=>{
 const id='7b0e6c1a-3f5d-4a52-9c2e-1d8f4b6a9e10';
 assert.equal(publicNowSourceHref(`https://sod1820.co.il/or-geula/video/${id}`),`/or-geula/video/${id}`);
 assert.equal(publicNowSourceHref(`/or-geula/video/${id.toUpperCase()}/#source`),`/or-geula/video/${id.toUpperCase()}/#source`);
 for(const href of['/or-geula','/or-geula/video','/or-geula/video/not-a-uuid',`/or-geula/video/${id}/extra`,`/or-geula/video/${id}?token=x`,`/or-geula/video/${id.slice(0,35)}`,`//outside.invalid/or-geula/video/${id}`,`https://user:pass@sod1820.co.il/or-geula/video/${id}`])assert.equal(publicNowSourceHref(href),null,href);
});
test('source URLs retain exact public parameters/anchors and reject private/Legacy landings or credentials',()=>{
 assert.equal(publicNowSourceHref('/?p=34200&part=2&part=7#source'),'/?p=34200&part=2&part=7#source');assert.equal(publicNowSourceHref('/post/public#source'),'/post/public#source');
 for(const href of['/admin','/broadcasts','/archive','/2029/me','/post/public?token=secret','//outside.invalid/post/public','https://user:pass@sod1820.co.il/post/x','/post/%2fprivate'])assert.equal(publicNowSourceHref(href),null,href);
});
test('Now and ticker retain one source identity and seen key; different numbers or wording cannot merge objects',()=>{
 const group={id:'group:'+id,kind:'source',sourceKind:'group_message',sourceRef:'channel_updates:'+id,sourceRefs:['channel_updates:'+id,'channel_updates:'+other],label:'אותו מקור'};const chan=publicChannelToSystemItem(row),otherChan=publicChannelToSystemItem({...row,id:other});
 const merged=mergeSystemFeedItems([group,group],[chan,otherChan,{...chan,id:'different',sourceRef:'channel_updates:third'}]);assert.equal(merged.length,2);assert.deepEqual(merged[0].sourceRefs,group.sourceRefs);
 const rendered=feedRows([chan],{now:Date.parse('2026-11-02'),limit:20,caps:{'channel:or-geula':12}});assert.equal(rendered.length,1);assert.equal(rendered[0].href,null);assert.equal(rendered[0].typeLabel,'עדכון ערוץ');assert.equal(feedSeenKey(chan),'feed:'+chan.id);
});
function fakeClient(results){const calls=[];return {calls,from(table){const ops=[];const q={};for(const name of['select','eq','or','not','order','limit','abortSignal'])q[name]=(...args)=>{ops.push([name,...args]);return q;};q.then=resolve=>{calls.push({table,ops});const channel=ops.find(x=>x[0]==='eq'&&x[1]==='channel')?.[2];return Promise.resolve(results[channel||table]||{data:[],error:null}).then(resolve);};return q;}};}
test('all added reads are bounded GET-style select queries; one failure cannot turn into measured empty or erase independent sources',async()=>{
 const api=fakeClient({'or-geula':{data:[row],error:null},'site-news':{data:null,error:{code:'42501'}},'reality-code':{data:null,error:{message:'offline'}}});const result=await fetchSystemFeedPublicSources2029({client:api});assert.equal(api.calls.length,12,'5 channels + gallery + the one Human-Gated approved series occurrence + the 5 series post previews (same reader as Home; reality-map joined the four earlier series)');assert.equal(result.items.length,1);assert.equal(result.sourceStates.find(s=>s.source==='site-news').status,'access_filtered');assert.equal(result.sourceStates.find(s=>s.source==='reality-code').status,'failed');assert.equal(result.sourceStates.find(s=>s.source==='gilui-yomi').status,'measured_empty');
 for(const c of api.calls){assert.equal(c.ops[0][0],'select');assert.ok(c.ops.some(x=>x[0]==='limit'&&x[1]<=12));if(c.table==='posts'){assert.ok(c.ops.some(x=>x[0]==='eq'&&x[1]==='home_hidden'&&x[2]===false),'series previews keep the Home visibility rule');continue;}assert.ok(c.ops.some(x=>x[0]==='eq'&&x[1]===(c.table==='channel_updates'?'status':'published')));assert.ok(!JSON.stringify(c.ops).includes('metadata'));}
});
test('canceling discards every partial result',async()=>{const api=fakeClient({'or-geula':{data:[row],error:null}}),ctl=new AbortController();ctl.abort();await assert.rejects(fetchSystemFeedPublicSources2029({client:api,signal:ctl.signal}),{name:'AbortError'});assert.ok(api.calls.every(c=>c.ops.some(x=>x[0]==='abortSignal'&&x[1]===ctl.signal)));});
