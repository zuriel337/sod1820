import test from 'node:test';
import assert from 'node:assert/strict';
import { contributorSelfHandler } from '../api/contributor-self.js';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const url=`https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/avatars/${uid}-1793440000000.png`;
const req=(body={},extra={})=>({method:'POST',headers:{authorization:'Bearer synthetic_verified_session_123',host:'preview.invalid',origin:'https://preview.invalid'},body:{action:'avatar',url,publish:true,ack:true,...body},...extra});
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
function setup({user=uid,rows=[{id:'own-source',slug:'own',code:'1',display_name:'שם'}],ack=true,published=true,avatarUpdates=true}={}){
 const writes=[],rpcs=[],reads=[];
 const client={auth:{getUser:async()=>user?{data:{user:{id:user}}}:{error:true}},from(table){let patch;const b={select(){return b;},eq(k,v){reads.push({table,k,v});return b;},limit:async()=>({data:rows}),update(value){patch=value;writes.push({table,patch});return b;},maybeSingle:async()=>({data:patch?(ack?{id:uid,...patch}:null):null,error:!ack})};return b;},rpc:async(name,args)=>{rpcs.push({name,args});return {data:{ok:published}};}};
 return {writes,rpcs,reads,handler:contributorSelfHandler({authenticatedClient:()=>client,previewReadOnly:true,avatarUpdates})};
}
test('explicit own-avatar update touches only caller avatar and existing public-photo setting',async()=>{
 const f=setup(),r=response();await f.handler(req(),r);assert.equal(r.code,200);assert.deepEqual(r.body,{state:'saved'});
 assert.deepEqual(f.writes,[{table:'users',patch:{avatar_url:url}}]);assert.ok(f.reads.some(x=>x.table==='users'&&x.k==='id'&&x.v===uid));
 assert.deepEqual(f.rpcs,[{name:'update_my_dossier',args:{p_settings:{public_avatar:{enabled:true,url}}}}]);
});
test('another avatar path, impersonation fields and missing public consent never write',async()=>{
 for(const body of [{url:url.replace(uid,other)},{user_id:other},{role:'admin'},{username:'changed'},{ack:false},{publish:false},{url:'https://evil.invalid/pic.png'}]){
  const f=setup(),r=response();await f.handler(req(body),r);assert.equal(r.code,400);assert.equal(f.writes.length,0);assert.equal(f.rpcs.length,0);
 }
});
test('guest, cross-origin, ambiguous and unavailable callers cannot update a picture',async()=>{
 const guest=setup({user:null}),g=response();await guest.handler(req(),g);assert.equal(g.code,401);assert.equal(guest.writes.length,0);
 const cross=setup(),c=response();const q=req();q.headers.origin='https://evil.invalid';await cross.handler(q,c);assert.equal(c.code,403);assert.equal(cross.writes.length,0);
 for(const rows of [[{id:'one'},{id:'two'}]]){const f=setup({rows}),r=response();await f.handler(req(),r);assert.equal(r.code,409);assert.equal(f.writes.length,0);}
});
test('unlinked caller uses only the existing canonical self-dossier primitive after explicit photo consent',async()=>{
 const f=setup({rows:[]}),r=response();await f.handler(req(),r);assert.deepEqual(r.body,{state:'saved'});assert.equal(f.rpcs[0].name,'update_my_dossier');
});
test('account save acknowledgment and public publication remain separate',async()=>{
 const f=setup({ack:false}),r=response();await f.handler(req(),r);assert.equal(r.code,503);assert.equal(f.rpcs.length,0);
 const p=setup({published:false}),s=response();await p.handler(req(),s);assert.equal(s.code,200);assert.deepEqual(s.body,{state:'account_saved'});
});
test('Preview exception does not permit general profile/page writes or an unenabled avatar action',async()=>{
 for(const action of ['create','portrait','other']){const f=setup(),r=response();await f.handler(req({action}),r);assert.equal(r.code,403);assert.equal(f.writes.length,0);}
 const f=setup({avatarUpdates:false}),r=response();await f.handler(req(),r);assert.equal(r.code,403);assert.equal(f.writes.length,0);
});
