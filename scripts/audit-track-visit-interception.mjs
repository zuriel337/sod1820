// Offline control: real built service worker, real Chromium, all origins mapped to local fixtures.
// Run after the ordinary review build, never against the live database.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { startFixture } from '../test/helpers/authBrowserFixture.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const calls = [];
const fixture = await startFixture({supabase: ({url,method}) => {
  if (url.pathname === '/rest/v1/rpc/track_visit' && method === 'POST') {
    calls.push(url.pathname); return {status:204,body:''};
  }
  return null;
}});
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',args:fixture.chromiumArgs,env:fixture.browserEnv});
try {
  const context = await browser.newContext({ignoreHTTPSErrors:true});
  const page = await context.newPage();
  await page.goto(fixture.origin+'/world',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller),null,{timeout:20000});
  const request = () => page.evaluate(async()=> {
    const response = await fetch('https://linswmnnkjxvweumprav.supabase.co/rest/v1/rpc/track_visit',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_path:'/world',p_referrer:null,p_visitor:null,p_device:'desktop',p_is_bot:true})});
    return {status:response.status,body:await response.text()};
  });
  const before = calls.length;
  const normal = await request();
  assert.equal(normal.status,204); assert.equal(calls.length,before+1);
  let aborted=0;
  const pattern=/\/rest\/v1\/rpc\/track_/;
  await context.route(pattern,route=>{aborted++; return route.abort();});
  const prior=calls.length;
  const blocked = await request();
  assert.equal(blocked.status,403); assert.equal(calls.length,prior); assert.ok(aborted>0);
  await context.unroute(pattern);
  const restored = await request();
  assert.equal(restored.status,204); assert.equal(calls.length,prior+1);
  console.log(JSON.stringify({fixtureOnly:true,liveWrites:0,normal,withAuditAbort:blocked,restored,aborted,explanation:'Identical request and real built worker: audit abort becomes worker 403; removing abort restores delivery.'},null,2));
} finally {await browser.close();await fixture.close();}
