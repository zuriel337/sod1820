import test from 'node:test';
import assert from 'node:assert/strict';
import {providerOAuthRequest,rememberPreviewOAuthReturn,consumePreviewOAuthReturn,PREVIEW_OAUTH_RETURN_KEY} from '../src/lib/oauthReturn.js';
const origin='https://sod1820-functional-preview-20261031.vercel.app';
test('functional OAuth has one exact verified callback for both providers and preserves local research context separately',()=>{
 const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k),removeItem:k=>data.delete(k)};
 for(const provider of ['google','facebook']){
   const request=providerOAuthRequest({provider,origin,returnTo:'/world?focus=context#access_token=private',integratedPreview:true,functionalPreview:true,verifiedPreviewOrigins:[origin]});
   assert.equal(request.options.redirectTo,origin+'/auth/callback');
   if(provider==='facebook')assert.equal(request.options.scopes,'email public_profile');
   rememberPreviewOAuthReturn('/world?focus=context#access_token=private',storage,100);
   assert.equal(data.get(PREVIEW_OAUTH_RETURN_KEY).includes('private'),false);
   assert.equal(consumePreviewOAuthReturn(storage,200),'/world?focus=context');
   assert.equal(consumePreviewOAuthReturn(storage,300),'/2029');
 }
 for(const path of ['//evil.invalid','/\\evil.invalid','/auth/callback?code=bad']){
   rememberPreviewOAuthReturn(path,storage,100);assert.equal(consumePreviewOAuthReturn(storage,200),'/2029');
 }
 rememberPreviewOAuthReturn('/world',storage,100);assert.equal(consumePreviewOAuthReturn(storage,700000),'/2029');
 assert.throws(()=>providerOAuthRequest({origin,integratedPreview:true,functionalPreview:true,verifiedPreviewOrigins:[]}),{code:'OAUTH_PREVIEW_UNVERIFIED'});
});
