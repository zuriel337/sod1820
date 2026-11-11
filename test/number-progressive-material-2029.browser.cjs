// Controlled failure/admission integration over the actual compiled client.
// All remote I/O is synthetic and intercepted. These are NOT live-data timings.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const dist=path.resolve('preview-deploy/dist'),out=process.env.SOD_PROGRESSIVE_OUT||'/tmp/public-launch-useful-loading-20261102/controlled';
fs.mkdirSync(out,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml'};
const html=fs.readFileSync(path.join(dist,'2029.html'),'utf8');const entry=html.match(/await import\('([^']+)'\)/)[1];
const server=http.createServer((req,res)=>{let file=path.resolve(dist,'.'+new URL(req.url,'http://test').pathname);if(!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.setHeader('Content-Type','text/html');res.end(html.replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/,`<script type="module" src="${entry}"></script>`));return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{let browser;const results=[];try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const width of[390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage();let release,fail=false,profileReads=0;const gate=new Promise(r=>release=r),errors=[];page.on('pageerror',e=>errors.push(e.message));const reads=[];
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();
   reads.push({method:route.request().method(),path:u.pathname});
   if(u.hostname!=='linswmnnkjxvweumprav.supabase.co'||!u.pathname.startsWith('/rest/v1/'))return route.abort();
   const name=u.pathname.split('/').pop();let body=[];
   if(name==='nodes'){await gate;if(fail)return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'controlled access denial',code:'42501'})});}
   if(name==='fn_method_profile'){profileReads++;const phrase=u.searchParams.get('p_phrase')||route.request().postDataJSON()?.p_phrase;body=[{method_key:'רגיל',computed_value:phrase==='בראשית'?913:1820},{method_key:'מילוי',computed_value:phrase==='בראשית'?1819:3928}];}
   if(name==='gematria_methods')body=[{method_key:'רגיל',display_label:'רגיל',sort_order:1},{method_key:'מילוי',display_label:'מילוי',sort_order:2}];
   if(name==='is_number_indexable'||name==='is_phrase_indexable')body=false;
   await route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-0/0'},body:JSON.stringify(body)});
  });
  const address='/number/1820?focus='+encodeURIComponent('אחת ארבע שבע ושתיים')+'&method='+encodeURIComponent('רגיל')+'&source=controlled&part=2&part=7#number-essential';
  await page.goto(origin+address);const root=page.locator('.sod29-number-page');const method=page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first();
  await expect(root).toHaveAttribute('data-material-state','loading');await expect(method).toBeEnabled();await expect(method.locator('strong')).toHaveText('3928');
  await expect(page.locator('.sod29-number-v10-stage')).not.toContainText('אין כרגע');await expect(page.locator('.sod29-number-v10-life-seal')).not.toHaveAttribute('aria-label',/0 שכבות/);
  // Reject secondary material: the verified calculation stays usable, while
  // denied/failed material never appears as measured empty or up-to-date.
  fail=true;release();await expect(root).toHaveAttribute('data-material-state','failed');await expect(method).toBeEnabled();await expect(page.getByRole('button',{name:'ניסיון נוסף',exact:true})).toBeVisible();
  fail=false;await page.getByRole('button',{name:'ניסיון נוסף',exact:true}).click();await expect(root).toHaveAttribute('data-material-state','ready');
  await expect(page.locator('#number-content-live').getByRole('button',{name:'הצגת ממצאים למספר',exact:true})).toHaveCount(1);
  // Canonical reuse removes only the redundant Back read and preserves every
  // byte of the previous URL, including repeated parameters and its anchor.
  const before=profileReads;const input=page.getByRole('textbox',{name:'חפש מילה ביטוי או מספר',exact:true});await input.fill('בראשית');await input.press('Enter');await expect(root).toHaveAttribute('data-number-root','913');await expect(page.locator('.sod29-number-v10-expression-line>:is(h1,strong)')).toHaveText('בראשית');await expect(method).toBeEnabled();
  const afterPhrase=profileReads;assert.ok(afterPhrase>before);await page.goBack();await expect(page).toHaveURL(origin+address);await expect(method).toBeEnabled();assert.equal(profileReads,afterPhrase);
  assert.deepEqual(errors,[]);results.push({width,primaryWhileMaterialPending:true,failedNotEmpty:true,retry:true,inertSourceEntry:true,exactBack:true,backReusesCanonicalProfile:true,remoteRequestsForwarded:0,modelsForwarded:0,reads});await context.close();
 }
 fs.writeFileSync(out+'/controlled.json',JSON.stringify({ok:true,syntheticOnly:true,results},null,2)+'\n');console.log(JSON.stringify({ok:true,cases:results.length}));
}catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();server.close();}})();
