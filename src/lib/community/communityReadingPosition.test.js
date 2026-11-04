import test from 'node:test';
import assert from 'node:assert/strict';
import { communityReadingPrincipal, normalizeReadingPosition, rememberCommunityReading, loadCommunityReading, saveCommunityReading, communityReadingHref } from './communityReadingPosition.js';
import { fetchCommunityThreadUpdates } from './communityArchive.js';
const root='11111111-1111-4111-8111-111111111111', reply='22222222-2222-4222-8222-222222222222', next='33333333-3333-4333-8333-333333333333';
const position=(id=reply,time='2026-11-04T12:00:00.123456+00:00')=>({root_id:root,message_id:id,path:[root,id],created_at:time,top:124});
test('device cursors preserve database microseconds and advance seen monotonically while allowing backscroll',()=>{
 const now=Date.now();const first=rememberCommunityReading(null,position(),now);
 assert.equal(first.threads[0].created_at,'2026-11-04T12:00:00.123456Z');
 const advanced=rememberCommunityReading(first,position(next,'2026-11-04T12:00:00.123457Z'),now);
 const back=rememberCommunityReading(advanced,position(),now);
 assert.equal(back.last.message_id,reply);assert.equal(back.threads[0].message_id,next);
 assert.equal(back.threads.length,1);assert.equal(communityReadingHref(back.last),`/community/chat?thread=${root}&reply=${reply}&path=${root}%2C${reply}#message-${reply}`);
});
test('cache is bounded, expires, ignores forged ancestry and separates account/guest scopes',()=>{
 assert.equal(communityReadingPrincipal({loading:true}),null);
 assert.equal(communityReadingPrincipal({user:{id:root},verified:false}),null);
 const member=communityReadingPrincipal({user:{id:root},verified:true});assert.equal(member,'user:'+root);
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 saveCommunityReading(storage,member,rememberCommunityReading(null,position()));
 assert.equal(loadCommunityReading(storage,'guest').last,null);
 assert.equal(loadCommunityReading(storage,member).last.message_id,reply);
 assert.equal(normalizeReadingPosition({version:1,updatedAt:1,last:position(),threads:[]}).last,null);
 assert.equal(normalizeReadingPosition({version:1,updatedAt:Date.now(),last:{...position(),path:[reply,root]},threads:[]}).last,null);
 assert.equal(loadCommunityReading({getItem:()=>'{broken'},member).last,null);
 assert.equal(saveCommunityReading({setItem:()=>{throw Error('disabled');}},member,{}),false);
 assert.equal(communityReadingHref({...position(),path:[root,'https://evil.invalid']}),null);
});
test('public counts demand a complete valid projection and propagate outages instead of manufacturing zero',async()=>{
 const cursors=[{root_id:root,message_id:reply,created_at:position().created_at}];
 const client=(data,error=null)=>({rpc:(name,args)=>{assert.equal(name,'community_thread_updates');assert.deepEqual(args.p_cursors,cursors);return {select:()=>Promise.resolve({data,error})};}});
 const good=await fetchCommunityThreadUpdates(cursors,{client:client([{root_id:root,new_count:2,first_reply_id:next,first_path:[root,reply,next]}])});
 assert.equal(good[root].count,2);assert.deepEqual(good[root].path,[root,reply,next]);
 for(const rows of [[],[{root_id:reply,new_count:0}],[{root_id:root,new_count:-1}],[{root_id:root,new_count:1,first_reply_id:next,first_path:[reply,next]}]]) await assert.rejects(fetchCommunityThreadUpdates(cursors,{client:client(rows)}));
 await assert.rejects(fetchCommunityThreadUpdates(cursors,{client:client(null,Error('offline'))}),/offline/);
});
