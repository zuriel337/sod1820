import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {startFixture,dist} from './helpers/authBrowserFixture.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const manifest=JSON.parse(readFileSync(dist+'/.vite/manifest.json'));
const sdk='/'+manifest['node_modules/@supabase/auth-js/dist/module/index.js'].file;
test('guest reading defers SDK; cross-tab sign-in wakes and verifies the same real client', {timeout:60000},async()=>{
 const fx=await startFixture();const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:fx.chromiumArgs,env:fx.browserEnv});
 try{
  const c=await browser.newContext({ignoreHTTPSErrors:true});const reader=await c.newPage();const requests=[];reader.on('request',r=>requests.push(r.url()));
  await reader.goto(fx.origin+'/world');await reader.locator('.sod29-root').first().waitFor();await reader.waitForTimeout(600);
  assert.equal(requests.some(u=>u.endsWith(sdk)),false,'reader must not fetch the SDK');
  const login=await c.newPage();const email='lazy.fixture@example.invalid';fx.auth.newUser(email,true);
  await login.goto(fx.origin+'/login');await login.getByRole('textbox',{name:'כתובת מייל'}).fill(email);await login.getByRole('button',{name:'שלחו לי קוד כניסה'}).click();
  await login.getByRole('textbox',{name:'קוד כניסה מהמייל'}).fill(fx.auth.lastCode(email));await login.getByRole('button',{name:/כניסה לחשבון/}).click();
  await reader.waitForFunction(sdk=>performance.getEntriesByType('resource').some(r=>r.name.endsWith(sdk)),sdk,{timeout:15000});
  await reader.goto(fx.origin+'/login');await reader.locator('[data-auth-state="signed-in"]').waitFor({timeout:15000});
  assert.ok(fx.auth.log.some(r=>r.path.includes('/user')&&r.status===200),'existing verification still owns identity');
 }finally{await browser.close();await fx.close();}
});
