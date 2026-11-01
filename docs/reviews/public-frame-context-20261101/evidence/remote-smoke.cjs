const pw=require('@playwright/test'),fs=require('node:fs');
const db='https://linswmnnkjxvweumprav.supabase.co';
const allow=new Set(require('../../public-foundation-20261101/evidence/rpc-read-inventory.json').functions.map(x=>x.proname));for(const n of ['convergence_meter','is_number_indexable','is_phrase_indexable'])allow.add(n);
const line=require('node:readline').createInterface({input:process.stdin});line.once('line',async input=>{line.close();let browser,api;const audit={actualDeployedClient:true,serviceWorkers:'blocked for independent read-only egress barrier; deployed worker tested separately',reads:0,blocked:[],cases:[]};
 try{const {origin,accessUrl,sha}=JSON.parse(input);api=await pw.request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{});browser=await pw.chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const context=await browser.newContext({serviceWorkers:'block',locale:'he-IL'});await context.routeWebSocket('**/*',w=>w.close());
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url()),m=req.method(),rpc=u.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
  const same=u.origin===origin&&m==='GET',read=u.origin===db&&(['GET','HEAD'].includes(m)&&u.pathname.startsWith('/rest/v1/')&&(!rpc||allow.has(rpc))||m==='POST'&&allow.has(rpc)||m==='GET'&&u.pathname==='/auth/v1/settings'||m==='GET'&&u.pathname.startsWith('/storage/v1/object/public/'));
  const font=['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(u.origin)&&m==='GET';if(!same&&!read&&!font){audit.blocked.push({path:u.pathname,method:m});return route.abort();}
  try{const target=new URL(u);if(m==='POST')for(const[k,v]of Object.entries(req.postDataJSON()||{})){if(v==null)continue;target.searchParams.set(k,Array.isArray(v)?'{'+v.map(x=>typeof x==='string'?'"'+x.replaceAll('"','\\"')+'"':String(x)).join(',')+'}':typeof v==='object'?JSON.stringify(v):String(v));}
   const headers=req.headers();delete headers['content-length'];delete headers['content-type'];const r=await api.fetch(target.href,{method:m==='HEAD'?'HEAD':'GET',headers,maxRedirects:0,timeout:30000});const h=r.headers();delete h['content-encoding'];delete h['content-length'];let body=await r.body();
   if(same&&(h['content-type']||'').includes('text/html')){const html=body.toString(),entry=html.match(/await import\('([^']+)'\)/)?.[1];if(entry)body=Buffer.from(html.replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/,`<script type="module" src="${entry}"></script>`));}
   audit.reads++;await route.fulfill({status:r.status(),headers:h,body});
  }catch{audit.blocked.push({path:u.pathname,reason:'read transport unavailable'});await route.abort();}
 });
 const page=await context.newPage();await page.goto(accessUrl,{waitUntil:'domcontentloaded',timeout:45000});
 for(const width of[390,1440]){await page.setViewportSize({width,height:900});for(const [path,selector,attribute,expected]of[
  ['/','.h29-hero',null,null],['/post/flydubai-fz1073-363-14000-remzei-geula','[data-experience-surface="post-reading"]','data-post-slug','flydubai-fz1073-363-14000-remzei-geula'],['/number/'+encodeURIComponent('בראשית')+'?method='+encodeURIComponent('רגיל'),'.sod29-number-page','data-number-root','913']]){
   const r=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:45000});pw.expect(r.status()).toBe(200);await pw.expect(page.locator(selector)).toBeVisible({timeout:30000});if(attribute)await pw.expect(page.locator(selector)).toHaveAttribute(attribute,expected);else await pw.expect(page.locator(selector)).not.toContainText('טוען',{timeout:30000});pw.expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
   const island=page.locator('.sod29-command-island');await pw.expect(island).toBeVisible();const box=await island.boundingBox();pw.expect(Math.abs(box.x+box.width/2-width/2)).toBeLessThan(1);pw.expect(box.width).toBeLessThanOrEqual(331);await pw.expect(page.locator('.sod29-companion')).toHaveCount(0);
   if(path==='/'){
    await page.locator('.sod29-header-workspace').click();const personal=page.locator('[data-panel-kind="workspace"]');await pw.expect(personal).toBeVisible();
    const layout=await personal.locator('.sod29-workspace-raziel-copy').boundingBox();pw.expect(layout.width).toBeGreaterThanOrEqual(170);
    const grids=await personal.evaluate(e=>[...e.querySelectorAll('.sod29-workspace-core-grid,.sod29-workspace-secondary-grid,.sod29-workspace-raziel-actions')].map(g=>({columns:getComputedStyle(g).gridTemplateColumns.split(' ').map(Number.parseFloat),items:[...g.children].map(x=>{const r=x.getBoundingClientRect();return {w:r.width,h:r.height,overflow:x.scrollWidth>x.clientWidth+1};})})));
    for(const grid of grids){for(const item of grid.items){pw.expect(item.w).toBeGreaterThanOrEqual(44);pw.expect(item.h).toBeGreaterThanOrEqual(44);pw.expect(item.overflow).toBe(false);}if(grid.columns.length===2)pw.expect(Math.abs(grid.columns[0]-grid.columns[1])).toBeLessThan(1);}
    await personal.locator('.sod29-workspace-core-grid').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/public-frame-context-20261101/remote-personal-'+width+'.png'});await page.keyboard.press('Escape');audit.cases.push({path:'personal-modal',width,passed:true,grids});
   }
   if(path.startsWith('/post/')){
    await island.getByRole('button',{name:/^עוד/}).click();let panel=page.getByRole('dialog',{name:'עוד',exact:true});await pw.expect(panel.locator('[data-share-owner="ShareActions"]')).toBeVisible();await panel.getByRole('button',{name:'כלים',exact:true}).click();await pw.expect(page.getByRole('dialog',{name:'כלים',exact:true}).getByRole('button',{name:/ELS.*למנהל בלבד/})).toBeDisabled();await page.keyboard.press('Escape');
    audit.cases.push({path:'more-tools-share',width,passed:true});
   }
   audit.cases.push({path,width,passed:true});}}

 for(const path of ['/code?library=mine','/2029/journey']){await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:45000});await pw.expect(page.getByText('סגור · בבנייה')).toBeVisible({timeout:30000});await pw.expect(page.locator('.sod29-command-island')).toBeVisible();audit.cases.push({path,width:1440,passed:true});}
 pw.expect(audit.blocked.filter(x=>/ai-analyze|preview-raziel/.test(x.path))).toEqual([]);
 const identity=await api.get(origin+'/preview-identity.json');pw.expect((await identity.json()).sha).toBe(sha);audit.verifiedSha=sha;audit.ok=true;
 }catch(e){audit.ok=false;audit.errorType=e.name||'Error';audit.error='protected smoke did not complete; no raw error/URL/cookie is retained';}
 finally{await browser?.close();await api?.dispose();fs.writeFileSync('/tmp/public-frame-context-20261101/final-remote-browser.json',JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({ok:audit.ok,cases:audit.cases.length,reads:audit.reads,blocked:audit.blocked.length,errorType:audit.errorType}));process.exit(audit.ok?0:1);}
});
