// Historical F03 scenario, current real React/router/reset. Loopback only.
// An observation probe: it reports delayed-content POP, not a passing acceptance.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=process.env.CLS_BUILD_ROOT,out=process.env.CLS_RESULTS;
if(!root||!out)throw Error('explicit roots required');
const require=createRequire(root+'/package.json'),{build}=require('esbuild'),{chromium}=require('playwright');
const results={source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),rows:[]};
for(const reset of [false,true]){
 const app=`import React,{useState,useEffect}from'react';import{createRoot}from'react-dom/client';import{BrowserRouter,useLocation,useNavigate}from'react-router-dom';import Reset from './src/components/experience2029/RouteScrollReset2029.jsx';
function Page({long}){const[ready,setReady]=useState(false);useEffect(()=>{const t=setTimeout(()=>setReady(true),900);return()=>clearTimeout(t)},[]);return <><h1>Page</h1><main style={{height:long&&ready?5000:600}}>Content</main><footer style={{height:400}}>Footer</footer></>}
function Routes(){const l=useLocation(),nav=useNavigate();window.nav=nav;return <Page key={l.pathname} long={l.pathname==='/long'}/>}
createRoot(document.getElementById('root')).render(<BrowserRouter>${reset?'<Reset/>':''}<Routes/></BrowserRouter>);`;
 const code=await build({stdin:{contents:app,resolveDir:root,loader:'jsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
 const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?code.outputFiles[0].contents:'<!doctype html><style>html,body{margin:0;scroll-behavior:auto}</style><div id="root"></div><script src="/app.js"></script>')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});
 try{for(const width of[390,1440]){const page=await browser.newPage({viewport:{width,height:844}});await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await page.goto('http://127.0.0.1:'+server.address().port+'/long');await page.waitForTimeout(1200);await page.evaluate(()=>scrollTo(0,4000));await page.waitForTimeout(150);await page.evaluate(()=>nav('/short'));await page.waitForTimeout(200);const forward=await page.evaluate(()=>scrollY);await page.goBack();await page.waitForTimeout(1800);const back=await page.evaluate(()=>scrollY);results.rows.push({reset,width,priorY:4000,forwardY:forward,backAfterLateContentY:back,restored:back===4000});await page.close();}}
 finally{await browser.close();await new Promise(r=>server.close(r));}
}
writeFileSync(out,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));
