// Built public artifact + real worker/CSP, with local-only Auth/profile fixtures.
// Build with VITE_ELS_MATRIX_READING_MODE=on first. No model request is allowed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

for (const width of [390,1440]) for (const role of ['guest','member','admin']) {
  test(`public Fable enabled build: ${role} at ${width}, explicit options and zero AI calls`, {timeout:60000}, async () => {
    let user;
    const fixture = await startFixture({deploymentCsp:true,supabase:async ({url}) => {
      if(url.pathname==='/rest/v1/users' && user) return {body:[{id:user.id,role,username:'fixture',display_name:'Fixture',tier:role}]};
      return null;
    }});
    const browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:fixture.chromiumArgs,env:fixture.browserEnv});
    const context = await browser.newContext({viewport:{width,height:900},ignoreHTTPSErrors:true,locale:'he-IL'});
    try {
      if(role!=='guest') {
        user=fixture.auth.newUser(`${role}@example.invalid`,true,'fixture-password');
        const response=await fixture.auth.handle(new Request('https://linswmnnkjxvweumprav.supabase.co/auth/v1/token?grant_type=password',{
          method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:user.email,password:'fixture-password'})}));
        assert.equal(response.status,200);
        const session=await response.json();
        await context.addInitScript(session=>localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token',JSON.stringify(session)),session);
      }
      const page=await context.newPage(), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      if(role!=='guest') {
        await page.goto('https://sod1820.co.il/login',{waitUntil:'domcontentloaded'});
        await page.locator('[data-auth-state="signed-in"]').waitFor({timeout:20000});
      }
      await page.goto('https://sod1820.co.il/code',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>navigator.serviceWorker.controller && document.querySelector('[data-els-classic-2029="native-v1"]'),null,{timeout:30000});
      const fable=page.getByRole('button',{name:'הרחב עם Fable',exact:true});
      if(role==='admin') {
        await fable.waitFor({state:'visible',timeout:20000});
        const options=page.getByRole('region',{name:'אפשרויות Fable',exact:true});
        assert.equal(await options.isVisible(),false);
        await fable.click();
        await options.waitFor({state:'visible'});
        await fable.click();
        assert.equal(await options.isVisible(),false);
      } else {
        assert.equal(await fable.count(),0,'public visitors cannot open the administrator scan');
      }
      assert.equal(fixture.state.functions.filter(x=>x.path==='/functions/v1/ai-analyze').length,0,'opening the page or scan options never invokes AI');
      assert.deepEqual(errors,[]);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    } finally {await context.close();await browser.close();await fixture.close();}
  });
}
