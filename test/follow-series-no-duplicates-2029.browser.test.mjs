import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,readFileSync,rmSync,existsSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {build,transformWithOxc} from 'vite';
import react from '@vitejs/plugin-react';
const require=createRequire(import.meta.url);let playwright;try{playwright=require('playwright');}catch{}
const root=fileURLToPath(new URL('..',import.meta.url)),executablePath='/usr/bin/chromium';
const modules={
  auth:`export const useAuth=()=>({user:{id:window.__account},loading:false});`,
  io:`export const followCenterIO={};`,
  backend:`export const supabase=null;`,
  entry:`
    import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
    import Center from '/src/components/followCenter2029/FollowCenterController2029.jsx';
    window.__account='one';window.__prefs={one:['cat:מימד חמש','series:dimension-five','number:1820'],two:['number:337']};
    window.__calls=[];window.__failTopic=null;window.__holdTopic=null;window.__failRead=false;
    const io={readUpdates:async()=>[],readFollows:async id=>{if(window.__failRead)throw Error('read failed');return {topics:[...window.__prefs[id]],links:{},channels:[],channelState:'ready'};},
      unfollow:async(id,topic)=>{window.__calls.push({id,topic});if(window.__failTopic===topic)throw Error('cancel failed');
        if(window.__holdTopic===topic)await new Promise(resolve=>{window.__release=resolve;});
        window.__prefs[id]=window.__prefs[id].filter(item=>item!==topic);return null;}};
    function App(){const [,render]=useState(0);window.__switch=id=>{window.__account=id;render(x=>x+1);};
      return <main dir='rtl' className='sod29-root' style={{padding:16,minHeight:'100vh',background:'#100e16',color:'#f7f2e8','--s29-ink':'#f7f2e8','--s29-muted':'#b9b3c4','--s29-panel':'#1b1822','--s29-line':'#665b75','--s29-accent-text':'#c8bcf6','--s29-font-ui':'Arial,sans-serif','--s29-type-ui':'16px','--s29-type-micro':'14px','--s29-type-lead':'21px'}}><Center io={io}/></main>;}
    const style=document.createElement('style');style.textContent='html,body{margin:0;padding:0}*{box-sizing:border-box}';document.head.append(style);
    createRoot(document.getElementById('root')).render(<App/>);`,
};
const fixture={name:'follow-series-no-duplicates',enforce:'pre',resolveId(source){
  if(source==='virtual:follow-dedup.jsx')return '\0follow-dedup:entry';
  for(const [suffix,name]of [['/AuthContext.jsx','auth'],['/userCenter/followCenter2029.js','io'],['/supabase.js','backend']])if(source.endsWith(suffix))return '\0follow-dedup:'+name;
},async load(id){if(!id.startsWith('\0follow-dedup:'))return;return transformWithOxc(modules[id.slice(14)],'fixture.jsx',{lang:'jsx',jsx:{runtime:'automatic'}});}};

test('one visible series target: explicit dual cancellation, partial failure and account switch',{skip:!playwright||!existsSync(executablePath),timeout:60000},async()=>{
  const output=mkdtempSync(join(tmpdir(),'follow-dedup-'));let server,browser;
  const artifacts='/workspace/shared/downloads/follow-series-release-20261031';mkdirSync(artifacts,{recursive:true});
  try{
    const result=await build({root,configFile:false,publicDir:false,logLevel:'error',plugins:[fixture,react()],build:{outDir:output,rollupOptions:{input:'virtual:follow-dedup.jsx'}}});
    const entry=result.output.find(item=>item.isEntry),css=result.output.filter(item=>item.fileName.endsWith('.css'));
    const html=`<!doctype html><html lang='he' dir='rtl'><head><meta name='viewport' content='width=device-width,initial-scale=1'>${css.map(item=>`<link rel='stylesheet' href='/${item.fileName}'>`).join('')}</head><body><div id='root'></div><script type='module' src='/${entry.fileName}'></script></body></html>`;
    server=createServer((req,res)=>{const file=result.output.find(item=>'/'+item.fileName===new URL(req.url,'http://test').pathname);res.setHeader('Content-Type',file?(extname(file.fileName)==='.css'?'text/css':'text/javascript'):'text/html; charset=utf-8');res.end(file?readFileSync(join(output,file.fileName)):html);});
    await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin='http://127.0.0.1:'+server.address().port;
    browser=await playwright.chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const width of [390,1440]){
      const page=await browser.newPage({viewport:{width,height:1000}});await page.goto(origin);
      await page.getByRole('button',{name:'ביטול כל המעקבים: מימד חמש',exact:true}).waitFor();
      assert.equal(await page.locator('.fc-name').filter({hasText:'מימד חמש'}).count(),1);
      assert.equal(await page.getByRole('heading',{name:'קטגוריות',exact:true}).count(),0);
      assert.equal(await page.locator('.fc-follow-row').count(),2);
      assert.deepEqual(await page.evaluate(()=>window.__calls),[],'Grouping never writes or converts stored choices');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:join(artifacts,`follow-one-target-${width}.png`),fullPage:true});
      await page.getByRole('button',{name:'ביטול כל המעקבים: מימד חמש',exact:true}).click();
      await page.waitForFunction(()=>document.querySelectorAll('.fc-follow-row').length===1);
      assert.deepEqual(await page.evaluate(()=>window.__calls),[{id:'one',topic:'cat:מימד חמש'},{id:'one',topic:'series:dimension-five'}]);
      assert.deepEqual(await page.evaluate(()=>window.__prefs.one),['number:1820']);await page.close();
    }
    const page=await browser.newPage({viewport:{width:390,height:1000}});await page.goto(origin);
    await page.getByRole('button',{name:'ביטול כל המעקבים: מימד חמש',exact:true}).waitFor();
    await page.evaluate(()=>{window.__failTopic='cat:מימד חמש';});
    await page.getByRole('button',{name:'ביטול כל המעקבים: מימד חמש',exact:true}).click();
    await page.getByRole('alert').waitFor();
    assert.deepEqual(await page.evaluate(()=>window.__prefs.one),['cat:מימד חמש','number:1820']);
    assert.equal(await page.locator('.fc-name').filter({hasText:'מימד חמש'}).count(),1);
    await page.evaluate(()=>{window.__failTopic=null;});
    await page.getByRole('button',{name:'ביטול מעקב: מימד חמש',exact:true}).click();
    await page.waitForFunction(()=>document.querySelectorAll('.fc-follow-row').length===1);
    assert.equal(await page.evaluate(()=>window.__calls.length),3,'Retry cancels only the still-existing legacy intent');

    await page.reload();await page.getByRole('button',{name:'ביטול כל המעקבים: מימד חמש',exact:true}).waitFor();
    await page.evaluate(()=>{window.__holdTopic='cat:מימד חמש';});
    await page.getByRole('button',{name:'ביטול כל המעקבים: מימד חמש',exact:true}).click();
    await page.waitForFunction(()=>typeof window.__release==='function');await page.evaluate(()=>window.__switch('two'));
    await page.getByRole('button',{name:'ביטול מעקב: 337',exact:true}).waitFor();
    await page.evaluate(()=>window.__release());await page.waitForTimeout(50);
    assert.deepEqual(await page.evaluate(()=>window.__calls),[{id:'one',topic:'cat:מימד חמש'}],'Account switch stops the second grouped mutation');
    assert.equal(await page.locator('.fc-name').filter({hasText:'מימד חמש'}).count(),0);
    assert.deepEqual(await page.evaluate(()=>window.__prefs.two),['number:337']);await page.close();
  }finally{await browser?.close();if(server)await new Promise(done=>server.close(done));rmSync(output,{recursive:true,force:true});}
});
