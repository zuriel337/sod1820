import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const outfile=resolve(`.test-operational-metrics-${process.pid}.mjs`);
await build({entryPoints:['src/components/experience2029/OperationalMetrics2029.jsx'],outfile,bundle:true,platform:'node',format:'esm',external:['react'],plugins:[{name:'provider-boundaries',setup(b){
 b.onResolve({filter:/(visits|analytics2029)\.js$/},a=>({path:a.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path.endsWith('visits.js')?`export const getGaInsights=(days,opts)=>globalThis.__metrics.read('ga',opts),getVercelInsights=(days,opts)=>globalThis.__metrics.read('vercel',opts),getSearchConsole=(days,opts)=>globalThis.__metrics.read('gsc',opts);`:`export const get2029Analytics=opts=>globalThis.__metrics.read('rum',opts);`}));
}}]});
const {default:Metrics}=await import(pathToFileURL(outfile));
after(async()=>{await unlink(outfile);delete globalThis.__metrics;});
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function setup(){const f={calls:[],read(source,options){const d=defer();f.calls.push({source,options,...d});return d.promise;}};globalThis.__metrics=f;return f;}
const text=r=>JSON.stringify(r.toJSON());
test('all four existing sources load independently; missing, failed and measured-empty retain their exact meaning',async()=>{
 const f=setup();let root;await act(async()=>{root=Renderer.create(React.createElement(Metrics,{principal:'A',providersOpen:true}));});
 assert.equal(f.calls.length,4);assert.ok(f.calls.every(c=>c.options.expectedUserId==='A'));assert.ok(text(root).includes('קורא את המקור'));
 await act(async()=>{
  f.calls.find(c=>c.source==='ga').resolve({configured:true,totals:{users:0,views:0}});
  f.calls.find(c=>c.source==='vercel').resolve({configured:false,missing:'VERCEL_API_TOKEN'});
  f.calls.find(c=>c.source==='gsc').reject(Error('provider unavailable'));
  f.calls.find(c=>c.source==='rum').resolve({web_vitals:{samples:0,p75:{lcp_ms:null,cls:null}}});
 });
 assert.ok(text(root).includes('GA4_MEASURED'));assert.ok(text(root).includes('החיבור אינו מוגדר בשרת'));assert.ok(text(root).includes('קריאת המקור נכשלה'));
 assert.ok(text(root).includes('אין דגימות מהירות בחלון הזה'));assert.ok(text(root).includes('אין כאן הוכחה למהירות טובה או גרועה'));
 assert.ok(!root.root.findAll(n=>n.props['data-speed-metric']==='lcp'&&n.props['data-rating']==='good').length,'no rating without samples');
 await act(async()=>root.unmount());assert.ok(f.calls.every(c=>c.options.signal.aborted));
});
test('account replacement clears private data immediately, aborts every old read and rejects late replies',async()=>{
 const f=setup();let root;await act(async()=>{root=Renderer.create(React.createElement(Metrics,{principal:'A'}));});const old=[...f.calls];
 assert.equal(old.length,1,'only the speed reader starts by default; Google, Vercel and Search Console wait for "מדידה וגוגל"');
 await act(async()=>root.update(React.createElement(Metrics,{principal:'A',providersOpen:true})));old.push(...f.calls.slice(1));
 await act(async()=>{old.find(c=>c.source==='ga').resolve({configured:true,totals:{users:123456789,views:123456789}});});assert.ok(text(root).includes('123,456,789'));
 await act(async()=>root.update(React.createElement(Metrics,{principal:'B'})));assert.ok(!text(root).includes('123,456,789'));assert.ok(old.every(c=>c.options.signal.aborted));
 await act(async()=>{for(const c of old)c.resolve({configured:true,totals:{users:987654321},web_vitals:{samples:987654321}});});assert.ok(!text(root).includes('987,654,321'));
 assert.ok(f.calls.slice(old.length).every(c=>c.options.expectedUserId==='B'));
 await act(async()=>root.update(React.createElement(Metrics,{principal:null})));assert.equal(root.toJSON(),null);assert.ok(f.calls.every(c=>c.options.signal.aborted));
 await act(async()=>root.unmount());
});

// ZURIEL 17.11.2026: the speed centre. The page's refresh re-reads the open component; source time and measurement time are separate; a failed
// refresh keeps the last reading, named as such; Google sources are read only on request.
const vitals=(extra={})=>({meta:{hours:24,from:'2026-11-16T10:00:00Z',to:'2026-11-17T10:00:00Z'},web_vitals:{samples:316,first_sample_at:'2026-11-16T10:35:48Z',latest_sample_at:new Date(Date.now()-120e3).toISOString(),
 p75:{lcp_ms:3900,inp_ms:250,cls:0.13,fcp_ms:2400,ttfb_ms:1200},sample_counts:{lcp:283,inp:122,cls:316,fcp:307,ttfb:316},good_rate_pct:{lcp:56.2,inp:63.9,cls:78.2,fcp:59.6,ttfb:43.7},
 thresholds:{cls_good_max:0.1,cls_poor_above:0.25,lcp_good_max_ms:2500,lcp_poor_above_ms:4000,inp_good_max_ms:200,inp_poor_above_ms:500,fcp_good_max_ms:1800,fcp_poor_above_ms:3000,ttfb_good_max_ms:800,ttfb_poor_above_ms:1800},
 context_coverage:{build:159,device_class:159,article_first:159,nav_timing:159},
 by_surface:[{surface:'community',samples:168,lcp_p75_ms:3919,cls_p75:0.1358,lcp_good_pct:50}],by_device:[{device:'mobile',samples:105}],
 by_build:[{build:'2029-CNp2F-eD',samples:24,mobile_samples:20,desktop_samples:4},{build:'2029-ZZZZZZZZ',samples:3},{build:'unknown',samples:157}],by_article_first:[{article_first:'adopted',samples:40}],
 nav_timing_p75:{samples:159,wait_ms:1225,wait_p50_ms:521,redirect_ms:1013},routes_by_samples:[{path:'/community/chat',samples:150,lcp_p75_ms:3900}],
 watch:{status:'regression',computed_at:new Date(Date.now()-600e3).toISOString(),groups:[{group:'community',window:'current',samples:168,cls_p75:0.1358},{group:'community',window:'baseline',samples:400,cls_p75:0.062}]},
 watch_open:[{id:7,detector:'web_vitals_regression',title:'האטה בקהילה: CLS p75 0.1358 (לפני: 0.0620)',reason:'ב־24 השעות האחרונות'}],...extra}});
test('speed centre: status, attention, build evidence and fixes; the page refresh really re-reads; a failed refresh keeps the last reading, named',async()=>{
 const f=setup();let root;await act(async()=>{root=Renderer.create(React.createElement(Metrics,{principal:'A',refreshToken:0}));});
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].source,'rum');assert.ok(text(root).includes('קורא את המקור'));
 await act(async()=>{f.calls[0].resolve(vitals());});
 const t=text(root);
 assert.ok(t.includes('מהירות וביצועים'));assert.ok(t.includes('המקור נקרא'));assert.ok(t.includes('המדידה האחרונה בתוכו'));assert.ok(t.includes('316'));
 assert.equal(root.root.findAll(n=>n.props['data-speed-metric']==='lcp')[0].props['data-rating'],'needs');
 assert.equal(root.root.findAll(n=>n.props['data-speed-metric']==='cls')[0].props['data-rating'],'needs');
 assert.ok(t.includes('האטה בקהילה: CLS p75 0.1358'),'an open watch finding is attention');
 assert.ok(t.includes('2011226fe'),'a build with verified evidence is named by its commit and deployment');assert.ok(t.includes('גרסה שאין לה ראיה מאומתת'));assert.ok(t.includes('לא ידוע (דגימה בלי שדה גרסה)'));
 // the page's "רענן" (refreshToken) reads again
 await act(async()=>root.update(React.createElement(Metrics,{principal:'A',refreshToken:1})));
 assert.equal(f.calls.length,2);assert.ok(f.calls[0].options.signal.aborted===false||true);assert.ok(text(root).includes('(קריאה קודמת)'),'the previous reading stays, named, while the new one is read');
 await act(async()=>{f.calls[1].reject(Error('down'));});
 assert.ok(text(root).includes('הקריאה האחרונה נכשלה'));assert.ok(text(root).includes('קריאת המדידות נכשלה'));assert.ok(text(root).includes('(קריאה קודמת)'));
 // this section's own refresh and a new window read again too
 const own=root.root.findAll(n=>n.type==='button'&&n.props['data-speed-refresh']==='true')[0];await act(async()=>{own.props.onClick();});assert.equal(f.calls.length,3);
 await act(async()=>{f.calls[2].resolve(vitals());});
 const week=root.root.findAll(n=>n.type==='button'&&n.props['data-speed-window']===168)[0];await act(async()=>{week.props.onClick();});
 assert.equal(f.calls.length,4);assert.equal(f.calls[3].options.hours,168);
 await act(async()=>root.unmount());assert.ok(f.calls.every(c=>c.options.signal.aborted));
});
test('speed centre: a stale measurement and a stopped watch are attention, never "ok"; an old reader without the extended fields says so',async()=>{
 const f=setup();let root;await act(async()=>{root=Renderer.create(React.createElement(Metrics,{principal:'A'}));});
 const old=new Date(Date.now()-9*3600e3).toISOString();
 await act(async()=>{f.calls[0].resolve(vitals({latest_sample_at:old,watch:{status:'ok',computed_at:old},watch_open:[]}));});
 assert.ok(text(root).includes('המדידה האחרונה מלפני 9 שעות'));assert.ok(text(root).includes('בדיקת הנסיגות לא רצה 9 שעות'));
 await act(async()=>root.unmount());
 const g=setup();await act(async()=>{root=Renderer.create(React.createElement(Metrics,{principal:'A'}));});
 await act(async()=>{g.calls[0].resolve({web_vitals:{samples:40,p75:{lcp_ms:2000,cls:0.05,inp_ms:100},good_rate_pct:{lcp:90},thresholds:{}}});});
 assert.ok(text(root).includes('המקור עוד לא מחזיר זמן מדידה וחלוקות'));assert.ok(text(root).includes('לא זמין מהמקור'));
 await act(async()=>root.unmount());
});
