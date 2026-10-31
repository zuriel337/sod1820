import test from "node:test";
import assert from "node:assert/strict";
import { configuredAuthMethods, readAuthMethods } from "./authMethods.js";
import { providerOAuthRequest } from "./oauthReturn.js";

const context = { origin: "https://sod1820.co.il", integratedPreview: false };
test("one server list supplies every enabled federated method and email", () => {
  const methods = configuredAuthMethods({ external: { google: true, facebook: true, email: true, github: true, apple: false, phone: false } }, context);
  assert.equal(methods.email, true);
  assert.deepEqual(methods.oauth.map(x => x.id), ["google", "facebook", "github"]);
  assert.ok(methods.oauth.every(x => x.available));
  assert.equal(configuredAuthMethods({ external: { email: false } }, context).email, false);
});
test("Preview preserves enabled provider presence with a truthful unavailable state", () => {
  const result = configuredAuthMethods({ external: { google: true, facebook: true, email: true } }, { origin: "https://preview.vercel.app", integratedPreview: true });
  assert.deepEqual(result.oauth.map(x => [x.label, x.available]), [["Google", false], ["Facebook", false]]);
  assert.equal(result.email, true);
  assert.throws(() => configuredAuthMethods(null, context));
});

test("a centrally verified exact Preview origin is consumed by every provider", () => {
  const origin="https://approved.vercel.app";
  const settings={external:{google:true,facebook:true,email:true}};
  assert.ok(configuredAuthMethods(settings,{origin,integratedPreview:true,verifiedPreviewOrigins:[origin]}).oauth.every(x=>x.available));
  assert.ok(configuredAuthMethods(settings,{origin,integratedPreview:true,verifiedPreviewOrigins:['https://other.vercel.app']}).oauth.every(x=>!x.available));
  assert.ok(configuredAuthMethods(settings,{origin,integratedPreview:true,verifiedPreviewOrigins:['https://*.vercel.app']}).oauth.every(x=>!x.available));
});
test("settings are read from the existing public Auth endpoint, never an account or secret", async () => {
  let options;
  const result = await readAuthMethods({ ...context, fetchImpl: async (url, init) => { assert.ok(url.endsWith('/auth/v1/settings')); options=init;return { ok:true,json:async()=>({external:{google:true,email:true}}) }; } });
  assert.equal(result.oauth[0].id,'google');assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.ok(!options.headers.Authorization);
  await assert.rejects(readAuthMethods({ ...context,fetchImpl:async()=>({ok:false}) }));
});

test("Google, Facebook and future configured OAuth methods preserve the same safe return context",()=>{
  for(const provider of ['google','facebook','github']){
    const request=providerOAuthRequest({provider,...context,returnTo:'/community/chat?sort=liked&page=2'});
    assert.equal(request.provider,provider);assert.equal(request.options.redirectTo,'https://sod1820.co.il/community/chat?sort=liked&page=2');
    if(provider==='facebook')assert.equal(request.options.scopes,'email public_profile');
    assert.equal(providerOAuthRequest({provider,...context,returnTo:'//outside.invalid'}).options.redirectTo,'https://sod1820.co.il/');
  }
  for(const provider of ['email','phone','bad&provider'])assert.throws(()=>providerOAuthRequest({provider,...context}));
});
