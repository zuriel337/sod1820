// Native HTTP cache only: the browser opens robots.txt and FETCHES compiled
// bytes; it never executes the app, contacts Supabase or calls any mutation.
const {chromium}=require('@playwright/test'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const outDir=process.env.SOD_NATIVE_CACHE_EVIDENCE;fs.mkdirSync(outDir,{recursive:true});
const input=require('readline').createInterface({input:process.stdin});input.once('line',async line=>{input.close();let browser;const out={scope:'native browser cache for compiled bytes only, not app navigation/LCP',modelCalls:0,productWrites:0,results:[]};
 try{const cfg=JSON.parse(line);browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const variant of cfg.variants){const context=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block'});await context.request.get(variant.accessUrl);const page=await context.newPage();
  const audit=[];page.on('request',r=>audit.push({origin:new URL(r.url()).origin,path:new URL(r.url()).pathname,method:r.method()}));
  await page.goto(variant.origin+'/robots.txt');const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:200000});
  const rootResponse=await context.request.get(variant.origin+'/'),html=await rootResponse.text();
  const entry=html.match(/(?:src="|import\(')(\/assets\/[^"']+\.js)/)?.[1];assert.ok(entry);
  const files=new Map(),seen=new Set();
  async function visit(file){if(seen.has(file))return;seen.add(file);assert.ok(seen.size<70);assert.match(file,/^\/assets\/[^/]+\.js$/);
   const response=await context.request.get(variant.origin+file);assert.equal(response.status(),200);const body=await response.body(),code=body.toString();files.set(file,body.length);
   for(const match of code.matchAll(/(?:\bfrom\s*|\bimport\s*)["'](\.\/[^"']+\.js)["']/g))await visit(new URL(match[1],variant.origin+file).pathname);
  }
  await visit(entry);const assets=[...files.keys()].sort((a,b)=>files.get(b)-files.get(a)).slice(0,2);
  for(const file of assets){const readings=[];for(const visit of ['first','repeat']){
   const sample=await page.evaluate(async url=>{performance.clearResourceTimings();const start=performance.now(),r=await fetch(url,{cache:'default'}),body=await r.arrayBuffer();const timing=performance.getEntriesByName(url).at(-1);return {status:r.status,bytes:body.byteLength,ms:performance.now()-start,cacheControl:r.headers.get('cache-control'),transferSize:timing?.transferSize,encodedBodySize:timing?.encodedBodySize};},variant.origin+file);
   assert.equal(sample.status,200);assert.ok(sample.bytes>10000);readings.push({visit,...sample});
  }
  if(variant.name==='after'){assert.equal(readings[1].transferSize,0);assert.match(readings[1].cacheControl,/private.*immutable/);}else{assert.ok(readings[1].transferSize>0);assert.match(readings[1].cacheControl,/no-store/);}
  out.results.push({variant:variant.name,sha:variant.sha,path:file,readings});
  }
  assert.ok(audit.every(r=>r.method==='GET'&&r.origin===variant.origin));await context.close();
 }
 out.ok=true;
 }catch(e){out.ok=false;out.error={name:e.name,message:String(e.message).split('\n')[0].slice(0,300)};}
 finally{await browser?.close();fs.writeFileSync(outDir+'/native-static-cache.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));process.exitCode=out.ok?0:1;}
});
