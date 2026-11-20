import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { chromium }=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const dir=mkdtempSync(join(tmpdir(),'sod-activity-'));
const shots=process.env.STATISTICS_SCREENSHOTS || join(dir,'screenshots');mkdirSync(shots,{recursive:true});
const source=`
import React from 'react';import {createRoot} from 'react-dom/client';
import Pulse from './src/components/experience2029/ActivityPulse2029.jsx';
import Admin from './src/components/experience2029/SiteActivity2029.jsx';
import './src/components/experience2029/royal2029.css';
const fixture={version:1,state:'measured',computed_at:'2026-11-20T15:00:00Z',numbers:[{n:1820,events:24},{n:358,events:18}],phrases:[{phrase:'סליחות',events:12}],activity:[{surface:'activity_2029',event_type:'compute',events:36}]};
const reader=async h=>{window.reads.push(h);await new Promise(r=>setTimeout(r,100));return h===168?{...fixture,state:'no_data',numbers:[],phrases:[],activity:[]}:fixture;};
const data={version:1,from:'2026-11-19T15:00:00Z',to:'2026-11-20T15:00:00Z',summary:{entrances:12,views:24,browsers:9,accounts:3,active_accounts_5m:1,new_observed_browsers:7,returning_observed_browsers:2,single_page_unengaged_sessions:4},traffic_classes:[{traffic_class:'human',sessions:5},{traffic_class:'unknown',sessions:7}],sections:[{section:'home',views:12,actions:2}],daily:[{day:'2026-11-20',views:24,computes:36,searches:4}],actions:[],methods:[]};
window.reads=[];createRoot(document.getElementById('root')).render(<main className="sod29-root" dir="rtl" style={{maxWidth:1100,margin:'auto',padding:12,color:'#f6eddc'}}><p>תצוגת קבלה · נתונים סינתטיים</p><div style={{height:216}}><Pulse reader={reader}/></div><h1>תוכן העמוד</h1><Admin data={data} principal="fixture"/></main>);
`;
await build({stdin:{contents:source,resolveDir:process.cwd(),loader:'jsx'},bundle:true,outfile:join(dir,'app.js'),format:'esm',loader:{'.woff2':'file','.woff':'file','.ttf':'file','.svg':'file'},plugins:[{name:'offline',setup(b){b.onLoad({filter:/\/supabase.js$/},()=>({contents:'export const supabase={auth:{getSession:async()=>({data:{session:{user:{id:"fixture"}}}})},from(){throw Error("Archive not opened in public acceptance")}};'}));}}]});
writeFileSync(join(dir,'index.html'),'<!doctype html><html lang="he" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><body style="margin:0;background:#17130f"><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
const server=createServer((req,res)=>{try{const path=req.url==='/'?'index.html':req.url.slice(1);res.setHeader('content-type',path.endsWith('.js')?'application/javascript':path.endsWith('.css')?'text/css':'text/html');res.end(readFileSync(join(dir,path)));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await page.goto(origin);await page.getByText('24 פתיחות בטווח').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal document overflow');
  const before=await page.getByRole('heading',{name:'תוכן העמוד'}).boundingBox();
  await page.getByRole('button',{name:'שבוע',exact:true}).click();
  await page.getByText('עדיין אין מספיק פעילות').waitFor();
  const after=await page.getByRole('heading',{name:'תוכן העמוד'}).boundingBox();
  assert.equal(before.y,after.y,'data/empty state does not move the article');
  assert.deepEqual(await page.evaluate(()=>window.reads),[24,168]);
  await page.getByRole('button',{name:'יממה',exact:true}).click();await page.getByText('24 פתיחות בטווח').waitFor();
  await page.screenshot({path:join(shots,'activity-'+width+'.png'),fullPage:true});
  assert.deepEqual(errors,[]);await page.close();console.log('PASS browser',width,'public/admin/empty/window/navigation/overflow');
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
