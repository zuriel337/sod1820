// Real React/Router/Locked + the REAL supabase.js getSiteFlags; only the HTTP endpoint (site_flags) and auth are controlled. No live DB or user writes.
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
const server = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 4188, strictPort: true }, plugins: [{
  name: 'stage0-controlled-dependencies', enforce: 'pre',
  resolveId(source, importer) {
    if (source === '/__stage0_fixture.jsx') return source;
    if (!importer?.endsWith('/MaintenanceLock.jsx')) return;
    if (source.endsWith('/AuthContext.jsx')) return '\0stage0-auth';
  },
  load(id) {
    if (id === '/__stage0_fixture.jsx') return fixture;
    if (id === '\0stage0-auth') return 'export const useAuth=()=>window.auth;';
  },
  configureServer(s) { s.middlewares.use((req,res,next)=>{
    if (!req.url.startsWith('/__stage0_fixture.jsx') && !req.url.startsWith('/@') && !req.url.startsWith('/src/') && !req.url.startsWith('/node_modules/')) {
      s.transformIndexHtml(req.url,html).then(body=>{res.setHeader('Content-Type','text/html');res.end(body)});return;
    } next();
  }); },
}, react()] });
await server.listen();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const db = { rows: [], fail: false, requests: 0 };
const errors = [];
let page;
async function start(rows) {
  if (page) await page.close();
  db.rows = rows; db.fail = false; db.requests = 0;
  page = await browser.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https:\/\//, r => {
    const url = r.request().url();
    if (!url.includes('/rest/v1/site_flags')) return r.abort();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' };
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    db.requests++;
    if (db.fail) return r.fulfill({ status: 503, contentType: 'application/json', headers: cors, body: '{"message":"unavailable"}' });
    return r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(db.rows) });
  });
  await page.goto('http://127.0.0.1:4188/2029/number/1820');
  await page.waitForFunction(() => document.querySelector('#child') || document.querySelector('.mlock'));
}
const reads = () => page.evaluate(() => window.childReads);
async function nav(path) {
  await page.evaluate(p => window.navigate(p), path);
  await page.waitForFunction(() => document.querySelector('#child') || document.querySelector('.mlock') || document.querySelector('#public'));
  await page.waitForTimeout(150);
}
const row = (key, enabled, mode = 'all') => ({ key, enabled, message: null, mode });
let cases = 0;
try {
  await start([row('lock_number', false)]);
  assert.equal(await page.locator('#child').count(), 1);
  assert.equal(db.requests, 1, 'one request for the first check');cases++;
  db.rows = [row('lock_number', true)];
  await nav('/2029/number/42');
  await page.locator('.mlock').waitFor();
  assert.equal(await reads(), 1, 'open -> locked: the locked destination must not mount');
  assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'noindex, nofollow');
  assert.equal(db.requests, 2, 'exactly one read for that navigation');cases++;
  db.rows = [row('lock_number', false)];
  await nav('/2029/number/43'); await page.locator('#child').waitFor();
  assert.equal(await reads(), 2);cases++;
  db.fail = true;
  await nav('/2029/number/44'); await page.locator('.mlock').waitFor();
  assert.equal(await reads(), 2, 'a failed lock check must not reuse the earlier open result');cases++;
  db.fail = false;
  await nav('/2029/number/45'); await page.locator('#child').waitFor();
  assert.equal(await reads(), 3, 'the failure was not stored');cases++;
  db.fail = true;
  await nav('/books'); await page.locator('.mlock').waitFor();
  assert.equal(await reads(), 3);cases++;
  db.fail = false;
  await page.evaluate(() => window.navigate('/public')); await page.locator('#public').waitFor();
  assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'index, follow');cases++;
  assert.deepEqual(errors, []);
  console.log(`site_flags real getSiteFlags browser gate: PASS (${cases} scenarios; zero live DB calls)`);
} finally { await browser.close(); await server.close(); }
