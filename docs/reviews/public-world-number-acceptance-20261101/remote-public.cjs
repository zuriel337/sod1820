// Actual protected Preview assets/public data. Access grant arrives on stdin,
// never in evidence. Independent deny-default GET-only transport; no account
// writes, newsletters, external sharing, models or paid jobs are forwarded.
const {chromium,request,expect}=require('@playwright/test');
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const db='https://linswmnnkjxvweumprav.supabase.co';
const allowed=new Set(require('../public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(row=>row.proname));
for(const name of['convergence_meter','is_number_indexable','is_phrase_indexable'])allowed.add(name);
allowed.add('writer_public_contributions_page_v1'); // Reviewed existing STABLE public SELECT; actual client must send GET.
const scenarios=require('../../../test/public-world-scenarios.cjs');
const path=require('node:path');
const out=process.env.SOD_PUBLIC_REMOTE_EVIDENCE||'/tmp/public-world-number-acceptance-20261101/hosted';
fs.mkdirSync(out,{recursive:true});

const input=require('node:readline').createInterface({input:process.stdin});
input.once('line',async line=>{
 input.close();let browser,api,anonymous,stage='setup';
 const audit={actualDeployedClient:true,data:'real public material; synthetic cases identified separately',serviceWorker:'independent deny-default broker removes bootstrap only in test; exact deployed worker hash verified separately',cases:[],reads:[],blocked:[],errors:[],cleanupAborts:[],writesForwarded:0,modelCallsForwarded:0};
 try{
  const {origin,accessUrl,sha}=JSON.parse(line);assert.equal(new URL(accessUrl).origin,origin);
  const proxy=process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{};
  api=await request.newContext(proxy);anonymous=await request.newContext(proxy);await api.get(accessUrl);
  stage='runtime-identity';const identity=await api.get(origin+'/preview-identity.json');const actual=await identity.json();assert.equal(actual.sha,sha);assert.equal(actual.target,'preview');assert.equal(actual.production_flags_changed,false);audit.identity=actual;
  const worker=await api.get(origin+'/preview-readonly-sw.js');assert.equal(worker.status(),200);audit.workerSha256=crypto.createHash('sha256').update(await worker.body()).digest('hex');assert.equal(audit.workerSha256,'989e1cc315d8b42ae1cc01c57f44bbe6cd2ff4b90b6eb4e9453090008d57f2fb');
  audit.unauthenticatedRootStatus=(await anonymous.get(origin+'/',{maxRedirects:0})).status();assert.ok([302,401].includes(audit.unauthenticatedRootStatus));
  const capabilities=await api.get(origin+'/api/preview-capabilities');assert.equal(capabilities.status(),200);audit.capabilities=await capabilities.json();assert.equal(audit.capabilities.serverIdentityVerified,true);assert.equal(audit.capabilities.production,false);
  assert.equal((await api.get(origin+'/api/contributor-self')).status(),401);assert.equal((await api.get(origin+'/api/preview-raziel')).status(),405);
  const robots=await api.get(origin+'/robots.txt');assert.match(await robots.text(),/Disallow:\s*\//);
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const widths=process.env.SOD_REMOTE_WIDTHS?process.env.SOD_REMOTE_WIDTHS.split(',').map(Number):[390,1440];
  const caseNames=process.env.SOD_REMOTE_CASES?process.env.SOD_REMOTE_CASES.split(','):['numberFullPage','worldWriter','worldCorpus','riverGallery','postNumberReturn','directPublicAddresses','galleryPrivacyFault'];
  audit.runScope={widths,caseNames};
  for(const width of widths)for(const name of caseNames){
   stage=name+'-'+width;const thisStage=stage;let closing=false;
   const context=await browser.newContext({serviceWorkers:'block',locale:'he-IL',viewport:{width,height:900}});await context.routeWebSocket('**/*',socket=>socket.close());
   await context.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),method=req.method(),rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
    const same=url.origin===origin&&method==='GET';
    const read=url.origin===db&&((['GET','HEAD'].includes(method)&&url.pathname.startsWith('/rest/v1/')&&(!rpc||allowed.has(rpc)))||method==='POST'&&allowed.has(rpc)||method==='GET'&&url.pathname==='/auth/v1/settings'||method==='GET'&&url.pathname.startsWith('/storage/v1/object/public/'));
    const font=method==='GET'&&['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(url.origin);
    if(!same&&!read&&!font){audit.blocked.push({stage:thisStage,path:url.pathname,method});return route.abort();}
    try{
     const target=new URL(url),headers=req.headers();delete headers['content-length'];delete headers['content-type'];delete headers.cookie;
     if(method==='POST')for(const[key,value]of Object.entries(req.postDataJSON()||{}))if(value!=null)target.searchParams.set(key,Array.isArray(value)?'{'+value.map(v=>typeof v==='string'?'"'+v.replaceAll('"','\\"')+'"':String(v)).join(',')+'}':typeof value==='object'?JSON.stringify(value):String(value));
     const start=Date.now(),response=await api.fetch(target.href,{method:method==='HEAD'?'HEAD':'GET',headers,maxRedirects:0,timeout:30000});const h=response.headers();delete h['content-encoding'];delete h['content-length'];let body=await response.body();
     if(same&&(h['content-type']||'').includes('text/html')){const html=body.toString(),entry=html.match(/await import\('([^']+)'\)/)?.[1];if(entry)body=Buffer.from(html.replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/,`<script type="module" src="${entry}"></script>`));}
     audit.reads.push({stage:thisStage,path:url.pathname,status:response.status(),transport:method==='HEAD'?'HEAD':'GET',ms:Date.now()-start});await route.fulfill({status:response.status(),headers:h,body});
    }catch(error){(closing?audit.cleanupAborts:audit.errors).push({stage:thisStage,path:url.pathname,type:error.name});await route.abort().catch(()=>{});}
   });
   const page=await context.newPage();page.on('pageerror',error=>audit.errors.push({stage:thisStage,type:error.name,message:error.message.slice(0,250)}));
   const dir=path.join(out,thisStage);fs.mkdirSync(dir,{recursive:true});const start=Date.now();
   try{await scenarios[name](page,width,{outputPath:file=>path.join(dir,file)},origin);audit.cases.push({width,scenario:name,passed:true,elapsedMs:Date.now()-start,data:name==='galleryPrivacyFault'?'real public image plus explicitly synthetic privacy/failure/dedup controls':'actual public data'});console.log(JSON.stringify({scenario:name,width,passed:true}));}
   catch(error){
    const safe=String(error.message).replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT]').replace(/_vercel_share=[^\s"')&]+/g,'_vercel_share=[REDACTED]');
    audit.failure={stage:thisStage,name:error.name,message:safe.slice(0,4000),url:page.url(),stack:String(error.stack).split('\n').filter(line=>line.includes('/workspace/')).slice(0,4)};
    await page.screenshot({path:path.join(dir,'failure.png'),fullPage:false}).catch(()=>{});throw error;
   }
   finally{closing=true;await context.close();}
  }
  assert.deepEqual(audit.errors,[]);audit.ok=true;
 }catch(error){audit.ok=false;audit.failedStage=stage;audit.errorType=error.name;console.log(JSON.stringify({ok:false,stage,errorType:error.name}));}
 finally{await browser?.close();await api?.dispose();await anonymous?.dispose();fs.writeFileSync(path.join(out,'hosted-acceptance.json'),JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({ok:audit.ok,cases:audit.cases.length,reads:audit.reads.length,blocked:audit.blocked.length,failedStage:audit.failedStage,errorType:audit.errorType}));process.exitCode=audit.ok?0:1;}
});
