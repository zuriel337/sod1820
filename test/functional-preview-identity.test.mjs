import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT,jwtVerify} from 'jose';
import {FUNCTIONAL_PREVIEW_IDENTITY as policy,functionalPreviewJwtOptions,verifyFunctionalPreviewIdentity} from '../supabase/functions/_shared/functionalPreviewIdentity.js';
import {previewRazielHandler} from '../preview-deploy/api/preview-raziel.js';
import {previewCapabilitiesHandler} from '../preview-deploy/api/preview-capabilities.js';
import {runAiAnalyze,UID,USER_JWT} from './helpers/ai-analyze-handler.mjs';
import previewRazielEntrypoint from '../api/preview-raziel.js';

const {privateKey,publicKey}=await generateKeyPair('RS256');
const claims={iss:policy.issuers[0],aud:policy.audience,sub:policy.subject,project_id:policy.projectId,owner_id:policy.ownerId,environment:'preview'};
const sign=(overrides={})=>new SignJWT({...claims,...overrides}).setProtectedHeader({alg:'RS256'}).setIssuedAt().setExpirationTime('1h').sign(privateKey);
const verifyToken=token=>jwtVerify(token,publicKey,functionalPreviewJwtOptions(claims.iss));
test('actual RSA signatures bind authenticated users to this Vercel project and Preview environment',async()=>{
 const token=await sign();assert.equal(await verifyFunctionalPreviewIdentity(token,{userRef:UID,verifyToken}),true);
 for(const change of [{iss:'https://attacker.invalid'},{aud:'another-team'},{sub:claims.sub.replace('preview','production')},{project_id:'another-project'},{owner_id:'another-owner'},{environment:'production'}])
  assert.equal(await verifyFunctionalPreviewIdentity(await sign(change),{userRef:UID,verifyToken}),false);
 const expired=await new SignJWT(claims).setProtectedHeader({alg:'RS256'}).setIssuedAt(1).setExpirationTime(2).sign(privateKey);
 assert.equal(await verifyFunctionalPreviewIdentity(expired,{userRef:UID,verifyToken}),false);
 assert.equal(await verifyFunctionalPreviewIdentity(token,{userRef:null,verifyToken}),false);
 const parts=token.split('.');parts[1]=Buffer.from(JSON.stringify({...claims,environment:'production'})).toString('base64url');
 assert.equal(await verifyFunctionalPreviewIdentity(parts.join('.'),{userRef:UID,verifyToken}),false);
 assert.throws(()=>functionalPreviewJwtOptions('https://attacker.invalid'));
});
const previewBackend={VITE_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_abcdefghijklmnopqrstuvwxyz',VERCEL_OIDC_TOKEN:'signed.platform.proof'};
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'gpt/2029-functional-unified-preview-20261031',...previewBackend};
const membershipPreviewEnv={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'gpt/2029-membership-credit-meter-ui-20261101',...previewBackend};
const body={kind:'research',persona:'raziel',subject:'fixture',research_contract:'public-number-research-run-v1'};
assert.equal(typeof previewRazielEntrypoint,'function');
function response(){return {code:0,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(value){this.value=value;return this;}};}
test('server proof health exposes only signature-verification booleans, never a token or identity claims',async()=>{
 const token=await sign(),handler=previewCapabilitiesHandler({env,verifyToken:async raw=>{await verifyToken(raw);return true;}});
 const req={method:'GET',headers:{'x-vercel-oidc-token':token}},res=response();await handler(req,res);
 assert.equal(res.code,200);assert.equal(res.value.serverIdentityVerified,true);assert.equal(JSON.stringify(res.value).includes(token),false);assert.equal(res.headers['Cache-Control'],'private, no-store');
 const forged=response();await handler({...req,headers:{'x-vercel-oidc-token':'forged.platform.token'}},forged);assert.equal(forged.value.serverIdentityVerified,false);
 const production=response();await previewCapabilitiesHandler({env:{...env,VERCEL_ENV:'production'}})(req,production);assert.equal(production.code,404);
});
test('Preview proxy verifies the actual caller then forwards one unchanged canonical request and never retries',async()=>{
 const calls=[];const handler=previewRazielHandler({env,fetchImpl:async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify(url.endsWith('/user')?{id:UID}:{status:'ok'}));}});
 const req={method:'POST',headers:{host:'preview.vercel.app',origin:'https://preview.vercel.app',authorization:'Bearer a.b.c'},body};const res=response();await handler(req,res);
 assert.equal(res.code,200);assert.equal(calls.length,2);assert.equal(calls[1].init.headers.Authorization,req.headers.authorization);assert.equal(calls[1].init.body,JSON.stringify(body));assert.equal(calls[1].init.headers['x-sod-preview-identity'],'signed.platform.proof');assert.equal(JSON.stringify(res.value).includes('signed.platform.proof'),false);
 for(const change of [{headers:{...req.headers,origin:'https://foreign.invalid'}},{headers:{...req.headers,origin:'bad'}},{headers:{...req.headers,authorization:'Bearer service-key'}},{method:'GET'},{body:{...body,persona:'another'}}]){const count=calls.length;const out=response();await handler({...req,...change},out);assert.ok(out.code>=400);assert.equal(calls.length,count);}
 const noPlatformCalls=[];const noPlatform=response();await previewRazielHandler({env:{...env,VERCEL_OIDC_TOKEN:''},fetchImpl:async(url,init)=>{noPlatformCalls.push({url,init});return new Response(JSON.stringify(url.endsWith('/user')?{id:UID}:{status:'ok'}));}})(req,noPlatform);assert.equal(noPlatform.code,200);assert.equal(noPlatformCalls.length,2);assert.equal('x-sod-preview-identity' in noPlatformCalls[1].init.headers,false);
 const denied=response();await previewRazielHandler({env:{...env,VERCEL_ENV:'production'},fetchImpl:()=>{throw Error('must not fetch');}})(req,denied);assert.equal(denied.code,404);
 let count=0;const failed=response();await previewRazielHandler({env,fetchImpl:async()=>{count++;if(count===1)return new Response(JSON.stringify({id:UID}));throw Error('ambiguous provider response');}})(req,failed);assert.equal(failed.code,502);assert.equal(count,2);
});
test('membership credit Preview branch is explicitly allowed to use the signed Raziel proxy',async()=>{
 const calls=[];const handler=previewRazielHandler({env:membershipPreviewEnv,fetchImpl:async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify(url.endsWith('/user')?{id:UID}:{status:'ok'}));}});
 const req={method:'POST',headers:{host:'preview.vercel.app',origin:'https://preview.vercel.app',authorization:'Bearer a.b.c'},body};const res=response();await handler(req,res);
 assert.equal(res.code,200);assert.equal(calls.length,2);assert.equal(calls[1].init.headers['x-sod-preview-identity'],'signed.platform.proof');
});
test('complete Edge handler keeps user budget and cost gates when signed Preview availability is accepted',async()=>{
 const token=await sign();const previewVerifier=(raw,options)=>verifyFunctionalPreviewIdentity(raw,{...options,verifyToken});
 const result=await runAiAnalyze({answer:{capability_class:'general_synthesis',strategy:'fixture-plan-guidance',minimum_intelligence:'L2_FAST',availability:'available'},bearer:USER_JWT,verifiedUid:UID,siteAllowed:true,allowed:false,previewIdentity:{token,verified:true},previewVerifier,body:{subject:'הסבר את המושג חסד',kind:'research',research_contract:'public-number-research-run-v1'}});
 const gates=result.calls.filter(c=>c.name==='fn_capability_execution_gate_v1');assert.equal(gates[0].payload.p_flag_key,null);assert.ok(result.calls.some(g=>g.name==='ai_quota_check'));assert.equal(result.models.length,0);assert.equal(result.result.error,'quota');
 const denied=await runAiAnalyze({bearer:USER_JWT,verifiedUid:UID,siteAllowed:false,previewIdentity:{token:'forged.platform.token'},previewVerifier,body:{kind:'research',research_contract:'public-number-research-run-v1'}});
 assert.equal(denied.models.length,0);assert.equal(denied.calls.find(c=>c.name==='fn_capability_execution_gate_v1').payload.p_flag_key,'lock_raziel_site');
});
