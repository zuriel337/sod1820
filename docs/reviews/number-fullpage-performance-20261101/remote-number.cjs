// Actual protected Preview assets/public data. Access grant arrives on stdin,
// never in evidence. Independent deny-default GET-only transport; no account
// writes, newsletters, external sharing, models or paid jobs are forwarded.
const {chromium,request,expect}=require('@playwright/test');
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const db='https://linswmnnkjxvweumprav.supabase.co';
const allowed=new Set(require('../public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(row=>row.proname));
for(const name of['convergence_meter','is_number_indexable','is_phrase_indexable'])allowed.add(name);
const out=process.env.SOD_NUMBER_REMOTE_EVIDENCE||'/tmp/number-fullpage-performance-20261101/remote-number.json';
const input=require('node:readline').createInterface({input:process.stdin});
input.once('line',async line=>{
 input.close();let browser,api,anonymous,stage='setup',closing=false;
 const audit={actualDeployedClient:true,data:'existing public data, no synthetic rows',serviceWorker:'independent browser barrier replaces bootstrap only in test; deployed worker hash checked separately',cases:[],reads:[],blocked:[],errors:[],cleanupAborts:[],writesForwarded:0,modelCallsForwarded:0};
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
  const context=await browser.newContext({serviceWorkers:'block',locale:'he-IL'});await context.routeWebSocket('**/*',socket=>socket.close());
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url()),method=req.method(),rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
   const same=url.origin===origin&&method==='GET';
   const read=url.origin===db&&((['GET','HEAD'].includes(method)&&url.pathname.startsWith('/rest/v1/')&&(!rpc||allowed.has(rpc)))||method==='POST'&&allowed.has(rpc)||method==='GET'&&url.pathname==='/auth/v1/settings'||method==='GET'&&url.pathname.startsWith('/storage/v1/object/public/'));
   const font=method==='GET'&&['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(url.origin);
   if(!same&&!read&&!font){audit.blocked.push({stage,path:url.pathname,method});return route.abort();}
   try{
    const target=new URL(url),headers=req.headers();delete headers['content-length'];delete headers['content-type'];delete headers.cookie;
    if(method==='POST')for(const[key,value]of Object.entries(req.postDataJSON()||{}))if(value!=null)target.searchParams.set(key,Array.isArray(value)?'{'+value.map(v=>typeof v==='string'?'"'+v.replaceAll('"','\\"')+'"':String(v)).join(',')+'}':typeof value==='object'?JSON.stringify(value):String(value));
    const response=await api.fetch(target.href,{method:method==='HEAD'?'HEAD':'GET',headers,maxRedirects:0,timeout:30000});const h=response.headers();delete h['content-encoding'];delete h['content-length'];let body=await response.body();
    if(same&&(h['content-type']||'').includes('text/html')){const html=body.toString(),entry=html.match(/await import\('([^']+)'\)/)?.[1];if(entry)body=Buffer.from(html.replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/,`<script type="module" src="${entry}"></script>`));}
    audit.reads.push({stage,path:url.pathname,status:response.status(),transport:method==='HEAD'?'HEAD':'GET'});await route.fulfill({status:response.status(),headers:h,body});
   }catch(error){(closing?audit.cleanupAborts:audit.errors).push({stage,path:url.pathname,type:error.name});await route.abort();}
  });
  // The API context already holds the protected-access cookie. Proxy the
  // application directly; do not load the unrelated Vercel login UI in-browser.
  const page=await context.newPage();page.on('pageerror',error=>audit.errors.push({stage,type:error.name}));
  for(const width of[390,1440]){
   stage='number-'+width;await page.setViewportSize({width,height:900});const original=origin+'/number/1820?source=post&part=2&part=7#number-essential';await page.goto(original);
   const milui=page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first();await expect(milui).toBeEnabled({timeout:60000});expect(await milui.locator('strong').textContent()).toMatch(/3,?928/);
   await milui.click();await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','3928',{timeout:60000});await expect(page.locator('.sod29-number-core2029.is-page')).toHaveAttribute('data-number-core-root','3928');assert.equal(new URL(page.url()).searchParams.get('method'),'מילוי');await expect(page.getByRole('dialog')).toHaveCount(0);
   await page.goBack();await expect(page).toHaveURL(original);const list=page.locator('.sod29-lw-source-list');await list.scrollIntoViewIfNeeded();await expect(list.locator(':scope>article').first()).toBeVisible({timeout:60000});await expect(list.getByRole('alert')).toHaveCount(0);await expect(list.locator('button')).toHaveCount(0);
   const source=await list.locator('a').first().getAttribute('href');assert.ok(source?.startsWith('/world?'));await list.locator('a').first().click();await expect(page).toHaveURL(origin+source);const anchor=new URL(page.url()).hash.slice(1);await expect(page.locator('[id="'+anchor+'"]')).toBeVisible({timeout:60000});await page.goBack();await expect(page).toHaveURL(origin+'/number/1820?source=post&part=2&part=7#number-content-live');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:out.replace(/\.json$/,'-'+width+'.png')});audit.cases.push({width,method:'מילוי',result:3928,fullPageNoDrawer:true,publicSourceHref:source,sourceReturn:true,overflow:false});
  }
  assert.deepEqual(audit.errors,[]);audit.ok=true;
 }catch(error){audit.ok=false;audit.failedStage=stage;audit.errorType=error.name;}
 finally{closing=true;await browser?.close();await api?.dispose();await anonymous?.dispose();fs.writeFileSync(out,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({ok:audit.ok,cases:audit.cases.length,reads:audit.reads.length,blocked:audit.blocked.length,errors:audit.errors.length,cleanupAborts:audit.cleanupAborts.length,failedStage:audit.failedStage,errorType:audit.errorType}));process.exitCode=audit.ok?0:1;}
});
