// Real principal-scoped ResearchProvider and execution adapter; auth and transport are
// explicit fixtures. No external network, model, production database or timer sleep.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { libraryAuth } from './fixtures/els-library-browser-fixture.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const react = (await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))).default;
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import ResearchProvider,{useResearch} from '/src/lib/research/ResearchProvider.jsx';
const input={axis:'אמת',related:'חסד',scope:'torah',skipMin:2,skipMax:80,pageSize:20};
const origin={entityType:'els',term:'תורה',corpus:'torah',corpusId:'fixture',skip:50,dir:1,start:5};
function Probe(){const {elsResearchOperation:op}=useResearch();window.__task=op.task;
return React.createElement(React.Fragment,null,
 React.createElement('button',{onClick:()=>op.start(input,origin)},'start'),
 React.createElement('button',{onClick:()=>{void op.start(input,origin);void op.start(input,origin);}},'double'),
 React.createElement('button',{onClick:op.cancel},'cancel'),React.createElement('button',{onClick:op.clear},'clear'),
 React.createElement('output',null,op.task?.status||'IDLE'));}
createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(ResearchProvider,null,React.createElement(Probe))));`;
const transport = `export const signalAiBehavior=()=>{};
window.__calls=[];window.__pending=[];window.__aborts=0;
export const supabase={functions:{async invoke(name,{body,signal}){
 window.__calls.push({name,body});signal?.addEventListener('abort',()=>window.__aborts++,{once:true});
 if(body.op==='verify')return {data:{result:{contract:'els_occurrence_replay_v1',status:'OK',verification_state:'MATCH',corpus_id:'fixture'}}};
 await new Promise(resolve=>window.__pending.push(resolve));
 return {data:{result:{contract:'els_search_page_v1',status:'EXECUTED_EMPTY',corpus_id:'fixture',input:{normalized:body.term},hits:[],completion:{executed:true,truncated:false,has_more:false}}}};
}}};`;

test('real ResearchProvider isolates principals, reserves once, rejects late results and times out honestly', { timeout: 60000 }, async () => {
  const modules = {
    'principal-entry.jsx': entry,
    'AuthContext.jsx': libraryAuth,
    'supabase.js': transport,
    'tracking.js': 'export const trackResearch=()=>{};',
    'auth.js': `import {emptyResearchState} from '/src/lib/research/researchSyncState.js';
      export const getCloudResearch=async()=>({...emptyResearchState(),revision:0});
      export const applyCloudResearchOps=async()=>{throw new Error('unexpected write in read-only fixture');};`,
  };
  const plugin = { name: 'principal-fixtures', enforce: 'pre',
    resolveId(id) { const name=id.split('/').at(-1);if(Object.hasOwn(modules,name))return '\0principal:'+name; },
    load(id) { if(id.startsWith('\0principal:'))return modules[id.slice(11)]; },
    configureServer(server) { server.middlewares.use(async(req,res,next)=>{
      if(req.url!=='/fixture')return next();res.setHeader('content-type','text/html');
      res.end(await server.transformIndexHtml('/fixture','<div id="root"></div><script type="module" src="/@id/principal-entry.jsx"></script>'));
    }); },
  };
  const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),cacheDir:mkdtempSync(join(tmpdir(),'els-principal-')),configFile:false,plugins:[plugin,react()],server:{host:'127.0.0.1',port:0}});
  let browser;
  try {
    await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
    browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'});
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    await page.goto(origin+'/fixture');
    await page.getByRole('button',{name:'double',exact:true}).click();
    await page.waitForFunction(()=>window.__pending.length===1);
    assert.deepEqual(await page.evaluate(()=>window.__calls.map(x=>x.body.op)),['verify','page']);
    const oldId=await page.evaluate(()=>window.__task.id);
    await page.evaluate(()=>window.__setLibraryUser('owner-b'));
    await page.waitForFunction(()=>window.__task===null);
    assert.ok(await page.evaluate(()=>window.__aborts>0));
    await page.getByRole('button',{name:'start',exact:true}).click();
    await page.waitForFunction(()=>window.__pending.length===2);
    const newId=await page.evaluate(()=>window.__task.id);assert.notEqual(newId,oldId);
    await page.evaluate(()=>window.__pending[0]());
    await page.getByRole('button',{name:'cancel',exact:true}).click();
    await page.waitForFunction(()=>window.__task.status==='CANCELLED');
    assert.equal(await page.evaluate(()=>window.__task.rows.length),0);
    assert.equal(await page.evaluate(()=>window.__task.id),newId);
    await page.getByRole('button',{name:'clear',exact:true}).click();
    await page.clock.install();
    await page.getByRole('button',{name:'start',exact:true}).click();
    await page.waitForFunction(()=>window.__pending.length===3);
    const thirdId=await page.evaluate(()=>window.__task.id);
    await page.evaluate(()=>window.__pending[1]());
    await page.clock.fastForward(60001);
    await page.waitForFunction(()=>window.__task.status==='PARTIAL');
    assert.equal(await page.evaluate(()=>window.__task.id),thirdId);
    await page.evaluate(()=>window.__pending[2]());
    await page.evaluate(()=>new Promise(resolve=>queueMicrotask(resolve)));
    assert.equal(await page.evaluate(()=>window.__task.status),'PARTIAL');
    assert.equal(await page.evaluate(()=>window.__task.rows.length),0);
    assert.deepEqual(await page.evaluate(()=>window.__calls.map(x=>x.name)),Array(6).fill('els-search-bridge'));
    assert.deepEqual(errors,[]);
  } finally {await browser?.close();await server.close();}
});
