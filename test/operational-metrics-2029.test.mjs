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
 const f=setup();let root;await act(async()=>{root=Renderer.create(React.createElement(Metrics,{principal:'A'}));});
 assert.equal(f.calls.length,4);assert.ok(f.calls.every(c=>c.options.expectedUserId==='A'));assert.ok(text(root).includes('קורא את המקור'));
 await act(async()=>{
  f.calls.find(c=>c.source==='ga').resolve({configured:true,totals:{users:0,views:0}});
  f.calls.find(c=>c.source==='vercel').resolve({configured:false,missing:'VERCEL_API_TOKEN'});
  f.calls.find(c=>c.source==='gsc').reject(Error('provider unavailable'));
  f.calls.find(c=>c.source==='rum').resolve({web_vitals:{samples:0,p75:{lcp_ms:null,cls:null}}});
 });
 assert.ok(text(root).includes('GA4_MEASURED'));assert.ok(text(root).includes('החיבור אינו מוגדר בשרת'));assert.ok(text(root).includes('קריאת המקור נכשלה'));
 assert.ok(text(root).includes('טרם התקבלו דגימות'));assert.ok(!text(root).includes('LCP p75'));
 await act(async()=>root.unmount());assert.ok(f.calls.every(c=>c.options.signal.aborted));
});
test('account replacement clears private data immediately, aborts every old read and rejects late replies',async()=>{
 const f=setup();let root;await act(async()=>{root=Renderer.create(React.createElement(Metrics,{principal:'A'}));});const old=[...f.calls];
 await act(async()=>{old.find(c=>c.source==='ga').resolve({configured:true,totals:{users:123456789,views:123456789}});});assert.ok(text(root).includes('123,456,789'));
 await act(async()=>root.update(React.createElement(Metrics,{principal:'B'})));assert.ok(!text(root).includes('123,456,789'));assert.ok(old.every(c=>c.options.signal.aborted));
 await act(async()=>{for(const c of old)c.resolve({configured:true,totals:{users:987654321},web_vitals:{samples:987654321}});});assert.ok(!text(root).includes('987,654,321'));
 assert.ok(f.calls.slice(4).every(c=>c.options.expectedUserId==='B'));
 await act(async()=>root.update(React.createElement(Metrics,{principal:null})));assert.equal(root.toJSON(),null);assert.ok(f.calls.every(c=>c.options.signal.aborted));
 await act(async()=>root.unmount());
});
