import test from 'node:test';import assert from 'node:assert/strict';
import vm from 'node:vm';import{readFileSync}from'node:fs';
import{persistExplicitIssueReport}from'./issue-persistence.proposal.js';
test('proposal awaits canonical commit acknowledgement and never invokes identity or marketing',async()=>{
 const calls=[];let ack;const wait=new Promise(r=>ack=r);let saved=false;
 const task=persistExplicitIssueReport({path:'/number/1820',message:'synthetic'}, {rpc:async(...args)=>{calls.push(args);await wait;return{error:null}}}).then(()=>{saved=true});
 await Promise.resolve();assert.equal(saved,false);assert.equal(calls.length,1);assert.equal(calls[0][0],'ingest_event');assert.equal(calls[0][1].p_sod_id,null);assert.equal(calls[0][1].p_is_bot,false);ack();await task;assert.equal(saved,true);
});
test('proposal rejects failure and does not retry or report saved',async()=>{
 let n=0;await assert.rejects(persistExplicitIssueReport({path:'/'},{rpc:async()=>{n++;return{error:Error('synthetic rejection')}}}));assert.equal(n,1);
});
const text=readFileSync(new URL('./transport.proposal.txt',import.meta.url),'utf8');
const fn=text.slice(text.indexOf('function installPublicReadingWorker('),text.indexOf('\nexport function buildPublicReadingWorker'));
function fixture(){let listener;const calls=[];vm.runInNewContext(fn+';installPublicReadingWorker({reads:[],getReads:[]})',{
 URL,Request,Response,Set,JSON,interceptPublicReadingAdminAuth:()=>false,interceptOpeningMail:()=>false,
 self:{location:{origin:'https://preview.invalid'},addEventListener:(name,fn)=>{if(name==='fetch')listener=fn}},
 fetch:async(req)=>{calls.push(req.url);return Response.json({ok:true})}});
 return{calls,send:async(path,body)=>{let pending;listener({request:new Request('https://linswmnnkjxvweumprav.supabase.co'+path,{method:'POST',body:JSON.stringify(body)}),respondWith:x=>pending=x});return await pending}};
}
test('proposal permits only bounded explicit canonical issue and existing contact insert, including Supabase array body',async()=>{
 const f=fixture();const issue={p_sod_id:null,p_surface:'issue_report',p_event_type:'issue_report',p_path:'/',p_props:{message:'synthetic'},p_is_bot:false};assert.equal((await f.send('/rest/v1/rpc/ingest_event',issue)).status,200);
 assert.equal((await f.send('/rest/v1/contact_messages',[{name:'synthetic',email:'owner@example.invalid',subject:'test',message:'synthetic'}])).status,200);
 for(const bad of [{...issue,p_sod_id:'spoofed'},{...issue,p_event_type:'share'},{...issue,p_props:{email:'private@example.invalid'}},{...issue,p_props:{message:'x'.repeat(501)}}])assert.equal((await f.send('/rest/v1/rpc/ingest_event',bad)).status,403);
 assert.equal(f.calls.length,2);
});
