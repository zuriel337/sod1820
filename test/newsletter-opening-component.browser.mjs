import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const authFixture = `import React,{createContext,useContext,useState} from 'react';
const Context=createContext({user:null}); export const useAuth=()=>useContext(Context);
export function AuthFixture({children}) {const [user,setUser]=useState(null); window.changeAccount=id=>setUser(id?{id}:null); return React.createElement(Context.Provider,{value:{user}},children);}`;
const { outputFiles } = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {AuthFixture} from 'fixture-auth'; import {NewsletterSignup2029} from './src/components/StayUpdatedCTA.jsx'; createRoot(document.getElementById('root')).render(React.createElement(AuthFixture,null,React.createElement(NewsletterSignup2029)));`, resolveDir: process.cwd(), loader:'jsx' },
  bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'},
  plugins:[{name:'offline-owned-boundaries',setup(b){
    b.onResolve({filter:/(?:AuthContext\.jsx$|^fixture-auth$)/},()=>({path:'auth',namespace:'fixture'}));
    b.onResolve({filter:/(?:theme\.js|themeMode\.js|chromeTheme\.js|palette\.js|supabase\.js|marketing\.js|push\.js)$/},()=>({path:'unused-legacy',namespace:'fixture'}));
    b.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'jsx',resolveDir:process.cwd(),contents:args.path==='auth'?authFixture:`export const F={}; export const useThemeMode=()=>null,chromeColors=()=>({}),usePalette=()=>({}); export const SUPABASE_URL='https://mail.invalid'; export const subscribeEmail=()=>{throw Error('Legacy signup called');}; export const trackSubscribe=()=>{throw Error('marketing called');},trackConversion=trackSubscribe; export const PUSH_CONFIGURED=false,pushSupported=()=>false,enablePush=trackSubscribe;`}));
  }}]
});
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"],...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Deny every external request independently of the fixture fetch sink.
  await page.route('**/*',route=>route.abort());
  await page.setContent('<html lang="he" dir="rtl"><body><div id="root"></div></body></html>');
  await page.evaluate(()=>{window.requests=[];window.contractReady=true;window.responseStatus='new';window.holdProbe=false;
    window.fetch=async(url,options={})=>{
      window.requests.push({url,method:options.method,body:options.body});
      if(options.method==='OPTIONS') {
        if(window.holdProbe) await new Promise(resolve=>window.releaseProbe=resolve);
        return new Response(null,{headers:window.contractReady?{'x-newsletter-purpose-contract':'opening-parts-v1'}:{}});
      }
      if(options.method!=='POST')throw Error('unexpected request');
      const denied=window.responseStatus==='verification-required';
      return Response.json({ok:!denied,status:window.responseStatus,purpose:'site-openings',contract:'opening-parts-v1'},{status:denied?409:200});
    };
  });
  await page.addScriptTag({content:outputFiles[0].text});
  await page.getByRole('button',{name:'עדכנו אותי כשנפתח',exact:true}).waitFor();
  assert.equal(await page.locator('input').count(),0);assert.equal(await page.evaluate(()=>requests.length),0);
  await page.getByRole('button',{name:'עדכנו אותי כשנפתח',exact:true}).click();
  await page.locator('input[type=email]').waitFor();assert.equal(await page.evaluate(()=>requests.length),1);
  assert.equal(await page.locator('input[type=checkbox]').isChecked(),false);
  await page.locator('input[type=email]').fill('fixture@example.invalid');await page.locator('input[type=checkbox]').check();
  await page.getByRole('button',{name:'עדכנו אותי כשנפתח',exact:true}).click();
  await page.getByRole('status').filter({hasText:'נשמרה'}).waitFor();
  assert.deepEqual(await page.evaluate(()=>requests.map(x=>x.method)),['OPTIONS','OPTIONS','POST']);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(requests[2].body)),{email:'fixture@example.invalid',purpose:'site-openings',consent:true,source:'2029-opening-parts'});
  await page.evaluate(()=>{window.changeAccount('other');window.contractReady=false;});
  await page.getByRole('button',{name:'עדכנו אותי כשנפתח',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.equal(await page.locator('input').count(),0);
  assert.equal(await page.evaluate(()=>requests.filter(x=>x.method==='POST').length),1);
  await page.evaluate(()=>{window.contractReady=true;window.responseStatus='verification-required';});
  await page.getByRole('button',{name:'בדיקת זמינות מחדש'}).click();
  await page.locator('input[type=email]').fill('existing@example.invalid');await page.locator('input[type=checkbox]').check();
  await page.getByRole('button',{name:'עדכנו אותי כשנפתח',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'אימות בעלות'}).waitFor();
  assert.equal(await page.getByRole('status').count(),0);
  await page.evaluate(()=>{window.changeAccount('third');window.holdProbe=true;});
  await page.getByRole('button',{name:'עדכנו אותי כשנפתח',exact:true}).click();
  await page.getByRole('button',{name:'בודקים זמינות…'}).waitFor();
  await page.evaluate(()=>{window.changeAccount(null);});
  await page.getByRole('button',{name:'עדכנו אותי כשנפתח',exact:true}).waitFor();
  await page.evaluate(()=>{window.holdProbe=false;window.releaseProbe();});
  // A stale capability reply after account change must not reopen the old form.
  await page.waitForTimeout(50);
  assert.equal(await page.locator('input').count(),0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:6,mode:'actual React component, controlled browser, offline fetch; no live network',checks:['zero startup request/form','intent capability before form','purpose-only receipt and double check before POST','old contract rejected without POST','verification-required not success','account switch clears input and aborts stale capability'],liveWrites:0}));
} finally {await browser.close();}
