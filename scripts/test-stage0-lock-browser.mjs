// Real React/Router/Locked; controlled auth and flag reader, no live DB or user writes.
// PLAYWRIGHT_MODULE can point at an existing Playwright installation.
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const html = '<html><head><meta name="robots" content="index, follow"></head><body><div id="root"></div><script type="module" src="/__stage0_fixture.jsx"></script></body></html>';
const fixture = `
import React, {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useLocation,useNavigate} from 'react-router-dom';
import Locked from '/src/components/MaintenanceLock.jsx';
window.auth={user:null,isAdmin:false,loading:false};window.pending=[];window.childReads=0;
function Child(){useEffect(()=>{window.childReads++},[]);return <div id="child">Capability content</div>}
function Harness(){const l=useLocation();window.navigate=useNavigate();
return l.pathname==='/public'?<div id="public">Public content</div>:<Locked flag={l.pathname.startsWith('/books')?'lock_books':'lock_number'} requireFlag><Child key={l.key}/></Locked>}
const root=createRoot(document.getElementById('root'));let tick=0;
window.render=()=>root.render(<BrowserRouter><Harness tick={tick++}/></BrowserRouter>);window.render();
`;
const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 4186, strictPort: true }, plugins: [{
  name: 'stage0-controlled-dependencies', enforce: 'pre',
  resolveId(source, importer) {
    if (source === '/__stage0_fixture.jsx') return source;
    if (!importer?.endsWith('/MaintenanceLock.jsx')) return;
    if (source.endsWith('/AuthContext.jsx')) return '\0stage0-auth';
    if (source.endsWith('/supabase.js')) return '\0stage0-flags';
  },
  load(id) {
    if (id === '/__stage0_fixture.jsx') return fixture;
    if (id === '\0stage0-auth') return 'export const useAuth=()=>window.auth;';
    if (id === '\0stage0-flags') return 'export const getSiteFlags=()=>new Promise(resolve=>window.pending.push(resolve));';
  },
  configureServer(s) { s.middlewares.use((req,res,next)=>{
    if (!req.url.startsWith('/__stage0_fixture.jsx') && !req.url.startsWith('/@') && !req.url.startsWith('/src/') && !req.url.startsWith('/node_modules/')) {
      s.transformIndexHtml(req.url,html).then(body=>{res.setHeader('Content-Type','text/html');res.end(body)});return;
    } next();
  }); },
}, react()] });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.route('https://**', r => r.abort());
const errors=[];page.on('pageerror', e=>errors.push(e.message));
async function start(auth={user:null,isAdmin:false,loading:false}) {
  await page.goto('http://127.0.0.1:4186/number/1820');
  await page.waitForFunction(()=>window.pending?.length>0);
  await page.evaluate(a=>{window.auth=a;window.render()},auth);
  assert.equal(await page.locator('#child').count(),0,'no child before flag read');
}
async function settle(lock, key='lock_number') {
  await page.waitForFunction(()=>window.pending.length>0);
  await page.evaluate(({lock,key})=>window.pending.splice(0).forEach(resolve=>resolve(lock?{[key]:lock}:{})),{lock,key});
}
async function closed() {
  await page.locator('.mlock').waitFor();
  assert.equal(await page.locator('#child').count(),0);
  assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, nofollow');
}
let cases=0;
try {
  for (const lock of [{enabled:true,mode:'all'},null,{enabled:'false',mode:'all'},{enabled:false,mode:'invalid'}]) {
    await start();await settle(lock);await closed();
    assert.equal(await page.evaluate(()=>window.childReads),0);cases++;
  }
  await start();await settle({enabled:true,mode:'anon'});await closed();
  assert.ok(await page.locator('a[href="/login"]').count());cases++;
  for (const [auth,lock] of [
    [{user:{id:'registered-fixture'},isAdmin:false,loading:false},{enabled:true,mode:'all'}],
    [{user:{id:'admin-fixture'},isAdmin:true,loading:false},null],
  ]) {
    await start(auth);await settle(lock);await closed();
    assert.equal(await page.evaluate(()=>window.childReads),0);cases++;
  }
  for (const [auth,lock] of [
    [{user:{id:'registered-fixture'},isAdmin:false,loading:false},{enabled:true,mode:'anon'}],
    [{user:{id:'admin-fixture'},isAdmin:true,loading:false},{enabled:true,mode:'all'}],
    [{user:null,isAdmin:false,loading:false},{enabled:false,mode:'all'}],
  ]) {
    await start(auth);await settle(lock);await page.locator('#child').waitFor();
    assert.equal(await page.evaluate(()=>window.childReads),1);cases++;
  }
  await start({user:null,isAdmin:false,loading:true});await settle({enabled:false,mode:'all'});
  assert.equal(await page.locator('#child').count(),0);
  await page.evaluate(()=>{window.auth.loading=false;window.render()});await page.locator('#child').waitFor();cases++;
  for (const path of ['/books','/number/42']) {
    await start();await settle({enabled:false,mode:'all'});await page.locator('#child').waitFor();
    await page.evaluate(p=>window.navigate(p),path);await page.waitForFunction(()=>window.pending.length>0);
    assert.equal(await page.locator('#child').count(),0,'navigation must not reuse an open flag');
    await settle({enabled:true,mode:'all'},path==='/books'?'lock_books':'lock_number');await closed();
    assert.equal(await page.evaluate(()=>window.childReads),1,'blocked destination must never mount');
    await page.evaluate(()=>window.navigate('/public'));await page.locator('#public').waitFor();
    assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'index, follow');cases++;
  }
  assert.deepEqual(errors,[]);
  console.log(`Stage 0 browser gate: PASS (${cases} scenarios; zero live DB calls)`);
} finally { await browser.close(); await server.close(); }
