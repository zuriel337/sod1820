import test from 'node:test';
import assert from 'node:assert/strict';
import { claimLegacyContributor } from './legacyClaim.js';
const id='e7581ab5-8c15-4832-b602-f361e41ff373',uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function fixture(user={id:uid,email_confirmed_at:'2026-10-31T00:00:00Z'},result={claimed:true,contributor_id:id,user_id:uid}) {
 const calls=[];return {calls,client:{auth:{getUser:async()=>({data:{user},error:null})},rpc:async(name,args)=>{calls.push({name,args});return {data:result,error:null};}}};
}
test('legacy claim uses verified caller and only the existing server ID argument',async()=>{
 const f=fixture();assert.equal((await claimLegacyContributor(id,f)).claimed,true);assert.deepEqual(f.calls,[{name:'contributors_claim_legacy',args:{p_contributor_id:id}}]);
});
test('invalid target, guest and unconfirmed caller never invoke a claim',async()=>{
 const invalid=fixture();await assert.rejects(claimLegacyContributor('אמילי',invalid),/invalid_contributor_id/);assert.equal(invalid.calls.length,0);
 for(const user of [null,{id:uid}]){const f=fixture(user);await assert.rejects(claimLegacyContributor(id,f),/not_authenticated|caller_email_not_confirmed/);assert.equal(f.calls.length,0);}
});
test('server denial and unexpected identities cannot become a claim success',async()=>{
 for(const result of [null,{claimed:false},{claimed:true,contributor_id:id,user_id:'other'},{claimed:true,contributor_id:'other',user_id:uid}])await assert.rejects(claimLegacyContributor(id,fixture(undefined,result)),/legacy_claim_not_eligible/);
 const f=fixture();f.client.rpc=async()=>({error:new Error('legacy_claim_not_eligible')});await assert.rejects(claimLegacyContributor(id,f),/legacy_claim_not_eligible/);
});
