import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import ga, { gaInsightsHandler } from "../api/ga-insights.js";
import gsc from "../api/search-console.js";
import vercel from "../api/vercel-insights.js";
import { publicReadingAdminApi } from "../public-reading-deploy/read-only-api.js";
import { SUPABASE_ANON } from "../src/lib/supabase.js";

const SITE="https://sod1820.co.il", UID="11111111-1111-4111-8111-111111111111";
const token=Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({role:'authenticated',sub:UID,user_metadata:{role:'admin'}})).toString('base64url')+'.fixture-signature';
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
function res(){return {headers:{},code:null,setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(v){this.code=v;return this;},json(v){this.body=v;return this;}};}
const req=()=>({url:'/api/provider?days=30',method:'GET',headers:{host:'sod1820.co.il',authorization:'Bearer '+token},query:{days:'30'}});
const keys=['GSC_SERVICE_ACCOUNT','GA_PROPERTY_ID','VERCEL_API_TOKEN'];
async function fixture(options,run){
  const previous=globalThis.fetch,env=Object.fromEntries(keys.map(k=>[k,process.env[k]])),calls=[];
  const {privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:1024});
  process.env.GSC_SERVICE_ACCOUNT=JSON.stringify({client_email:'fixture@example.invalid',private_key:privateKey.export({format:'pem',type:'pkcs8'})});process.env.GA_PROPERTY_ID='123';process.env.VERCEL_API_TOKEN='isolated-provider-fixture';
  globalThis.fetch=async(input,init={})=>{
    const u=new URL(input),path=u.pathname;calls.push({host:u.hostname,path,method:init.method||'GET'});
    if(path==='/auth/v1/user'){assert.equal(init.headers.apikey,SUPABASE_ANON);return options.authFailure?new Response('',{status:401}):json({id:options.mismatch?'22222222-2222-4222-8222-222222222222':UID});}
    if(path==='/rest/v1/users'){assert.equal(init.headers.apikey,SUPABASE_ANON);return json([{id:UID,role:options.role||'admin'}]);}
    if(u.hostname==='oauth2.googleapis.com')return json({access_token:'isolated-google-token'});
    if(u.hostname==='analyticsdata.googleapis.com')return json({rows:[]});
    if(path==='/rest/v1/rpc/ingest_ga_country_daily')return json(0);
    if(u.hostname==='searchconsole.googleapis.com'){
      if(path.endsWith('/sitemaps'))return json({sitemap:[{path:SITE+'/sitemap.xml',lastDownloaded:'2026-11-04T00:00:00Z',errors:'0',warnings:'0'}]});
      if(path==='/v1/urlInspection/index:inspect'){
        const body=JSON.parse(init.body);assert.ok([SITE+'/',SITE+'/gematria',SITE+'/number/1820'].includes(body.inspectionUrl));
        if(options.inspectionFailure)return new Response('',{status:403});
        return json({inspectionResult:{indexStatusResult:{verdict:'PASS',coverageState:'Submitted and indexed',googleCanonical:body.inspectionUrl}}});
      }
      return json({rows:[]});
    }
    if(u.hostname==='api.vercel.com')return json({data:path.endsWith('/count')?{visitors:2,pageviews:5}:[]});
    throw Error('Unapproved fixture IO: '+u.hostname+path);
  };
  try{await run(calls);}finally{globalThis.fetch=previous;for(const k of keys)if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k];}
}
test('three deployed adapters reuse actual existing provider handlers with canonical verified-admin reads and no public authority',async()=>{
  await fixture({},async calls=>{
    for(const handler of [ga,gsc,vercel]){
      const r=res();await publicReadingAdminApi(handler,{authorized:()=>true,originOf:()=>SITE})(req(),r);
      assert.equal(r.code,200);assert.equal(r.body.configured,true);assert.equal(r.body.error,undefined);assert.equal(r.headers.vary,'Authorization');
      if(handler===gsc){assert.equal(r.body.indexing.sitemaps.state,'measured');assert.equal(r.body.indexing.inspections.length,3);assert.ok(r.body.indexing.inspections.every(x=>x.state==='measured'&&x.verdict==='PASS'));}
      if(handler===vercel)assert.equal(r.body.totals.visitors,2);
    }
    const writes=calls.filter(x=>x.host.endsWith('supabase.co')&&x.method==='POST');
    assert.deepEqual(writes.map(x=>x.path),['/rest/v1/rpc/ingest_ga_country_daily'],'Only the existing GA history refresh is preserved; fixture-only IO');
  });
});
test('member, JWT mismatch and Auth failure never reach provider credentials or refresh history',async()=>{
  for(const options of [{role:'member'},{mismatch:true},{authFailure:true}])await fixture(options,async calls=>{
    for(const handler of [ga,gsc,vercel]){const r=res();await publicReadingAdminApi(handler,{authorized:()=>true,originOf:()=>SITE})(req(),r);assert.equal(r.code,403);}
    assert.ok(calls.every(x=>x.host.endsWith('supabase.co')&&x.method==='GET'));
  });
});
test('missing provider configuration remains unavailable, never measured-zero',async()=>{
  await fixture({},async()=>{
    delete process.env.VERCEL_API_TOKEN;const r=res();await publicReadingAdminApi(vercel,{authorized:()=>true,originOf:()=>SITE})(req(),r);
    assert.equal(r.body.configured,false);assert.equal(r.body.missing,'VERCEL_API_TOKEN');assert.equal(r.body.totals,undefined);
  });
});
test('the 2029 GA reader is actually read-only while Legacy retains its bounded history refresh',async()=>{
  await fixture({},async calls=>{
    const handler=(req,res)=>gaInsightsHandler(req,res,{refreshCountryHistory:false});
    const r=res();await publicReadingAdminApi(handler,{authorized:()=>true,originOf:()=>SITE})(req(),r);
    assert.equal(r.code,200);assert.equal(r.body.configured,true);assert.equal(r.body.countryHistory.state,'not_requested');assert.equal(r.body.countryHistory.written,null);
    assert.equal(calls.filter(x=>x.host.endsWith('supabase.co')&&x.method==='POST').length,0);
  });
});
test('URL-inspection permission failure remains failed independently of measured search data',async()=>{
  await fixture({inspectionFailure:true},async()=>{
    const r=res();await publicReadingAdminApi(gsc,{authorized:()=>true,originOf:()=>SITE})(req(),r);
    assert.equal(r.body.configured,true);assert.ok(r.body.indexing.inspections.every(x=>x.state==='failed'&&x.error==='provider_status_403'));
    assert.equal(r.body.indexing.sitemaps.state,'measured');
  });
});
