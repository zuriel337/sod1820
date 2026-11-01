// Protected deployment, real public data, independent GET-only egress barrier.
// No real account session, publication, upload, notification write or model call.
// A Vercel access URL is read from stdin only, never recorded in evidence.
const {chromium,request,expect}=require('@playwright/test');
const fs=require('node:fs'),assert=require('node:assert/strict');
const db='https://linswmnnkjxvweumprav.supabase.co';
const fields='id,parent_id,author_name,author_user_id,author_contributor_id,title,body,reactions,origin,created_at,edited_at,is_deleted,total_count';
const rpcs=new Set(['community_feed_page','community_message_context','community_replies_page']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const root='f495ccca-9e08-423f-a1ee-652238a1cf13';
const out=process.env.SOD_COMMUNITY_REMOTE_EVIDENCE||'/tmp/community1187-unified-20261101/remote-community.json';
const input=require('node:readline').createInterface({input:process.stdin});
input.once('line',async line=>{
 input.close();let browser,api,stage='setup';
 const audit={actualDeployedClient:true,data:'real existing approved public Community messages',serviceWorkers:'blocked only for independent read-only browser barrier; deployed worker verified separately',cases:[],publicReads:[],blocked:[],writesForwarded:0,modelCallsForwarded:0};
 try{
  const {origin,accessUrl,sha}=JSON.parse(line);assert.equal(new URL(accessUrl).origin,origin);
  api=await request.newContext(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{});
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({serviceWorkers:'block',locale:'he-IL'});
  await context.routeWebSocket('**/*',socket=>socket.close());
  const parentReadable=async(parent,headers)=>{
   const target=new URL(db+'/rest/v1/rpc/community_message_context');target.searchParams.set('select',fields);target.searchParams.set('p_id',parent);
   const response=await api.get(target.href,{headers,maxRedirects:0,timeout:30000});
   audit.publicReads.push({rpc:'community_message_context',purpose:'public-parent-verification',status:response.status()});
   if(!response.ok())return false;
   const chain=await response.json();return Array.isArray(chain)&&chain.some(row=>row.id===parent);
  };
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url()),method=req.method(),rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1];
   const same=url.origin===origin&&method==='GET';
   const community=url.origin===db&&method==='POST'&&rpcs.has(rpc)&&url.searchParams.size===1&&url.searchParams.get('select')===fields;
   const settings=url.origin===db&&method==='GET'&&url.pathname==='/auth/v1/settings';
   const image=url.origin===db&&method==='GET'&&url.pathname.startsWith('/storage/v1/object/public/');
   const font=method==='GET'&&['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(url.origin);
   if(!same&&!community&&!settings&&!image&&!font){audit.blocked.push({path:url.pathname,method});return route.abort();}
   try{
    const headers=req.headers();delete headers['content-length'];delete headers['content-type'];delete headers.cookie;
    const target=new URL(url);
    if(community){
     const body=req.postDataJSON()||{};
     if(rpc==='community_replies_page'){
      if(Object.keys(body).sort().join(',')!=='p_limit,p_offset,p_parent'||!uuid.test(body.p_parent)||!Number.isSafeInteger(body.p_limit)||body.p_limit<1||body.p_limit>100||!Number.isSafeInteger(body.p_offset)||body.p_offset<0)throw Error('invalid reply request');
      if(!await parentReadable(body.p_parent,headers))return route.fulfill({contentType:'application/json',body:'[]'});
     }
     for(const [key,value]of Object.entries(body))if(value!=null)target.searchParams.set(key,String(value));
    }
    // PostgREST STABLE RPCs execute via GET/read-only transaction. No POST is
    // forwarded by this independent harness, including ancestor validation.
    const response=await api.get(target.href,{headers,maxRedirects:0,timeout:30000});
    const h=response.headers();delete h['content-encoding'];delete h['content-length'];let body=await response.body();
    if(same&&(h['content-type']||'').includes('text/html')){
     const html=body.toString(),entry=html.match(/await import\('([^']+)'\)/)?.[1];
     if(entry)body=Buffer.from(html.replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/,`<script type="module" src="${entry}"></script>`));
    }
    if(community){
     const args=req.postDataJSON();const record={rpc,status:response.status(),bytes:body.length,offset:args.p_offset,limit:args.p_limit};
     if(rpc==='community_replies_page'&&response.ok()){const rows=JSON.parse(body.toString());record.rows=rows.length;record.ids=rows.map(row=>row.id);}
     audit.publicReads.push(record);
    }
    await route.fulfill({status:response.status(),headers:h,body});
   }catch{audit.blocked.push({path:url.pathname,reason:'read transport unavailable or request denied'});await route.abort();}
  });
  const page=await context.newPage();stage='protected-entry';await page.goto(accessUrl,{waitUntil:'domcontentloaded',timeout:45000});
  for(const width of[390,1440]){
   stage='community-'+width;await page.setViewportSize({width,height:900});const start=audit.publicReads.length;
   await page.goto(origin+'/community/chat?thread='+root,{waitUntil:'domcontentloaded',timeout:45000});
   await expect(page.locator('#message-'+root)).toBeVisible({timeout:30000});
   await expect.poll(()=>audit.publicReads.slice(start).find(row=>row.rpc==='community_replies_page'&&row.status===200&&row.limit===2)?.rows,{timeout:30000}).toBe(2);
   const replies=audit.publicReads.slice(start).find(row=>row.rpc==='community_replies_page'&&row.status===200&&row.limit===2);
   for(const id of replies.ids)await expect(page.locator('#message-'+id)).toBeAttached();
   await expect(page.getByText('כבר הייתם חלק מהשיחה? הירשמו עם המייל שלכם, ונעזור לכם לחבר את הפרופיל מהצ׳אט הישן לחשבון החדש.',{exact:true})).toBeVisible();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1),false);
   await expect(page.locator('.sod29-companion')).toHaveCount(0);
   await expect(page.locator('.sod29-command-island')).toBeVisible();
   const box=await page.locator('.sod29-command-island').boundingBox();assert.ok(Math.abs(box.x+box.width/2-width/2)<1);assert.ok(box.width<=331);
   audit.cases.push({width,passed:true,root,automaticDirectReplies:2,rawCountsAllowed:false});
  }
  stage='identity';const identity=await api.get(origin+'/preview-identity.json');assert.equal((await identity.json()).sha,sha);audit.verifiedSha=sha;audit.ok=true;
 }catch(error){audit.ok=false;audit.failedStage=stage;audit.errorType=error.name;}
 finally{await browser?.close();await api?.dispose();fs.writeFileSync(out,JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify({ok:audit.ok,cases:audit.cases.length,publicReads:audit.publicReads.length,blocked:audit.blocked.length,failedStage:audit.failedStage}));process.exit(audit.ok?0:1);}
});
