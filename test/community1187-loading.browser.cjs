// Controlled built-client workload. Synthetic public threads and 120ms read
// latency; no request, upload, account operation or model reaches a live server.
const {chromium,expect}=require('@playwright/test');
const assert=require('node:assert/strict'),fs=require('node:fs');
const before=process.env.SOD_COMMUNITY_BEFORE||'http://127.0.0.1:4196';
const after=process.env.SOD_COMMUNITY_AFTER||'http://127.0.0.1:4197';
const output=process.env.SOD_COMMUNITY_METRICS||'/tmp/community1187-unified-20261101/loading.json';
const countsMode=process.env.SOD_COMMUNITY_COUNTS_MODE||'preview-denied';
const uuid=(prefix,index)=>`${prefix}0000000-0000-4000-8000-${String(index).padStart(12,'0')}`;
const roots=Array.from({length:40},(_,i)=>({id:uuid('2',i+1),parent_id:null,author_name:'קורא מדומה',author_user_id:null,author_contributor_id:null,body:'שרשור בדיקה '+(i+1)+' — מקום לשיחה ותמונה.',origin:'community_2029',created_at:new Date(Date.UTC(2026,9,31,12,0)-i*1000).toISOString(),status:'approved',reactions:{}}));
const children=new Map(roots.map((root,i)=>[root.id,Array.from({length:3},(_,j)=>({...root,id:uuid('3',i*10+j+1),parent_id:root.id,body:'תגובה מדומה '+(j+1)+' לשרשור '+(i+1)}))]));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(browser,origin,width){
 const context=await browser.newContext({viewport:{width,height:900},locale:'he-IL',serviceWorkers:'block'});
 const page=await context.newPage(),session=await context.newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:4});await session.send('Performance.enable');
 const audit={reads:[],writes:[],models:[],errors:[]};let phase='initial';
 await page.addInitScript(()=>{window.__benchCLS=0;new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.__benchCLS+=entry.value;}).observe({type:'layout-shift',buffered:true});});
 page.on('pageerror',error=>audit.errors.push(error.name));await context.routeWebSocket('**/*',ws=>ws.close());
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),method=request.method(),name=url.pathname.split('/').pop();
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(url.origin===origin&&method==='GET'){
   if(url.pathname.startsWith('/api/'))return reply({state:'login_required'},401);
   return route.continue();
  }
  if(url.origin!=='https://linswmnnkjxvweumprav.supabase.co')return route.abort();
  if(/ai-analyze|research-run|els-search-bridge/.test(url.pathname)){audit.models.push(url.pathname);return route.abort();}
  if(url.pathname==='/auth/v1/settings')return reply({external:{email:true,google:true,facebook:true}});
  const args=method==='POST'?request.postDataJSON()||{}:{};
  if(name==='community_feed_page'){
   await delay(120);return reply(roots.slice(args.p_offset||0,(args.p_offset||0)+(args.p_limit||40)).map(row=>({...row,total_count:40})));
  }
  // Mirrors the accepted Preview worker: no raw counts allowance is added.
  if(name==='community_reply_counts')return countsMode==='ready'?reply((args.p_ids||[]).map(id=>({parent_id:id,reply_count:children.get(id)?.length||0}))):reply({error:'preview_read_only'},403);
  if(name==='community_replies_page'){
   const record={phase,parent:args.p_parent,offset:args.p_offset,limit:args.p_limit};audit.reads.push(record);
   await delay(120);const rows=children.get(args.p_parent)||[];const result=rows.slice(args.p_offset,args.p_offset+args.p_limit).map(row=>({...row,total_count:rows.length}));record.rows=result.length;record.bytes=Buffer.byteLength(JSON.stringify(result));return reply(result);
  }
  if(name==='community_message_context')return reply(roots.filter(row=>row.id===args.p_id));
  if(['ingest_event','track_visit','link_identity'].includes(name))return route.abort();
  if(['GET','HEAD'].includes(method))return reply([]);
  if(['rd_is_admin','world_group_source_arrivals_v2','fn_list_family','notification_prefs_guest_get_v1'].includes(name))return reply([]);
  audit.writes.push(url.pathname);return reply({error:'fixture_denied'},403);
 });
 const start=Date.now();await page.goto(origin+'/community/chat',{waitUntil:'domcontentloaded'});await expect(page.locator('#message-'+roots[0].id)).toBeVisible({timeout:30000});const firstRootMs=Date.now()-start;
 await page.waitForTimeout(2000);const initialReads=audit.reads.length,initialCLS=await page.evaluate(()=>window.__benchCLS);
 const initialMetrics=(await session.send('Performance.getMetrics')).metrics;
 phase='scroll';for(const index of [0,2,4,6,8,10,12]){await page.locator('#message-'+roots[index].id).scrollIntoViewIfNeeded();await page.waitForTimeout(300);}
 await page.waitForTimeout(1200);const beforeRefresh=audit.reads.length;
 if(origin===after){assert.ok(beforeRefresh>0,'automatic previews must actually use the public reply reader');await expect(page.locator('#message-'+children.get(roots[0].id)[0].id)).toBeAttached();await expect(page.locator('#message-'+children.get(roots[0].id)[2].id)).toHaveCount(0);}
 const near=await page.locator('.sod29-community-feed>.sod29-community-thread-group').evaluateAll(groups=>groups.filter(el=>{const r=el.getBoundingClientRect();return r.bottom>=-200&&r.top<=innerHeight+200;}).map(el=>el.querySelector(':scope>article')?.id.replace(/^message-/,'')));
 phase='refresh';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(2200);
 const refreshed=audit.reads.slice(beforeRefresh),offscreen=refreshed.filter(read=>!near.includes(read.parent));
 if(origin===after)assert.ok(refreshed.length>0,'visible previews must refresh even when raw counts are unavailable');
 const allMetrics=(await session.send('Performance.getMetrics')).metrics;
 const get=(values,name)=>values.find(value=>value.name===name)?.value??null;
 const result={origin,width,countsMode,cpuThrottle:4,syntheticReadLatencyMs:120,syntheticRootCount:40,firstRootMs,initialCLS,initialReplyReads:initialReads,initialTaskDurationSeconds:get(initialMetrics,'TaskDuration'),afterScrollReplyReads:beforeRefresh,refreshReplyReads:refreshed.length,offscreenRefreshReplyReads:offscreen.length,nearRootCount:near.length,totalReplyBytes:audit.reads.reduce((sum,row)=>sum+(row.bytes||0),0),taskDurationSeconds:get(allMetrics,'TaskDuration'),requests:audit.reads,errors:audit.errors,productWritesForwarded:0,modelCallsForwarded:0};
 assert.deepEqual(audit.writes,[]);assert.deepEqual(audit.models,[]);assert.deepEqual(audit.errors,[]);
 assert.ok(initialCLS<=0.1,'the existing CLS ceiling stays 0.1');
 for(const read of audit.reads)assert.equal(read.limit,2,'automatic reads remain two direct replies, no implicit third or nested expansion');
 await context.close();return result;
}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];
 try{
  for(const width of process.env.SOD_COMMUNITY_BENCH_SMOKE==='1'?[390]:[390,1440]){
   const pairs=process.env.SOD_COMMUNITY_BENCH_SMOKE==='1'?1:4;
   for(let pair=1;pair<=pairs;pair++){
    const order=process.env.SOD_COMMUNITY_BENCH_SMOKE==='1'?[['after',after]]:pair%2?[['before',before],['after',after]]:[['after',after],['before',before]];
    for(const [version,origin]of order){const row={version,pair,...await run(browser,origin,width)};results.push(row);fs.writeFileSync(output,JSON.stringify({fixture:'synthetic 40-thread public workload; independent deny-default transport; actual compiled clients; SW validated separately',baselineSha:'6df07087eabd78f7d1b56438b147e2d957ff0ac8',results},null,2));console.log(JSON.stringify({version,width,pair,firstRootMs:row.firstRootMs,initialReplyReads:row.initialReplyReads,refreshReplyReads:row.refreshReplyReads,offscreenRefreshReplyReads:row.offscreenRefreshReplyReads,initialCLS:row.initialCLS}));}
   }
  }
  assert.ok(results.every(row=>row.offscreenRefreshReplyReads===0),'automatic two-reply previews must not refresh roots outside the reading range');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.name+': '+error.message);process.exitCode=1;});
