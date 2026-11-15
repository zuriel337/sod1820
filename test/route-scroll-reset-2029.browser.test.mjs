import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";
const { chromium } = createRequire(import.meta.url)("playwright");

// Real React/BrowserRouter and the production reset component. Static long and
// short pages isolate history behaviour from data, ads and personal research.
const app = `import React,{useState,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useLocation,useNavigate} from 'react-router-dom';
import Reset from './src/components/experience2029/RouteScrollReset2029.jsx';
function Pages(){const loc=useLocation(),nav=useNavigate(),[account,setAccount]=useState(0);
 window.fixture={nav,remount:()=>setAccount(x=>x+1)};
 useLayoutEffect(()=>{if(loc.hash)document.getElementById(loc.hash.slice(1))?.scrollIntoView();},[loc.pathname,loc.hash]);
 return <div key={account}><h1>{loc.pathname}</h1><div style={{height:loc.pathname==='/short'?600:5000}}>
 <div id="anchor" style={{position:'relative',top:2200}}>Exact source anchor</div></div><footer style={{height:400}}>Footer</footer></div>;}
createRoot(document.getElementById('root')).render(<BrowserRouter><Reset/><Pages/></BrowserRouter>);`;
const compiled = await build({ stdin: { contents: app, resolveDir: process.cwd(), loader: "jsx" }, bundle: true, write: false,
  format: "iife", define: { "process.env.NODE_ENV": '"production"' } });
const html = '<!doctype html><style>html,body{margin:0;scroll-behavior:auto}</style><div id="root"></div><script src="/app.js"></script>';

test("forward navigation resets; browser history, anchors and same-page edits retain their owners", async t => {
  const server = createServer((req, res) => {
    res.setHeader("Content-Type", req.url === "/app.js" ? "text/javascript" : "text/html");
    res.end(req.url === "/app.js" ? compiled.outputFiles[0].contents : html);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true });
  t.after(async () => { await browser.close(); await new Promise(resolve => server.close(resolve)); });
  for (const width of [390, 1440]) {
    await t.test(`${width}px`, async t => {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      await page.route("**/*", route => new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort());
      await page.goto(`http://127.0.0.1:${server.address().port}/long`);
      await page.waitForFunction(() => window.fixture);
      t.after(() => page.close());
      const scroll = async y => { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(100); };
      const nav = async (path, options) => {
        await page.evaluate(({ path, options }) => fixture.nav(path, options), { path, options });
        await page.waitForFunction(path => location.pathname + location.search + location.hash === path, path);
        await page.waitForTimeout(100);
      };
      const y = () => page.evaluate(() => scrollY);
      await scroll(4000);
      await nav('/short');
      assert.equal(await y(), 0, 'PUSH from a long page must not land in the short-page footer');
      await page.goBack();
      await page.waitForFunction(() => location.pathname === '/long' && scrollY === 4000);
      assert.equal(await y(), 4000, 'POP restores the previous reading position');
      await nav('/short', { replace: true });
      assert.equal(await y(), 0, 'path-changing REPLACE starts the destination at the top');
      await nav('/long#anchor');
      assert.ok(await y() > 2000, 'explicit page anchor is retained');
      await nav('/long');
      await scroll(900);
      await nav('/long?filter=one');
      assert.equal(await y(), 900, 'same-page query changes retain reading position');
      await nav('/long?filter=two', { replace: true });
      assert.equal(await y(), 900, 'same-page replacement retains reading position');
      await page.evaluate(() => fixture.remount());
      await page.waitForTimeout(100);
      assert.equal(await y(), 900, 'account-keyed child remount is not navigation');
    });
  }
});

test("the reset is mounted once outside the account-keyed research subtree", () => {
  const source = readFileSync('src/App2029.jsx', 'utf8');
  assert.equal((source.match(/<RouteScrollReset2029\s*\/>/g) || []).length, 1);
  assert.ok(source.indexOf('<RouteScrollReset2029 />') < source.indexOf('<ResearchProvider>'));
});
