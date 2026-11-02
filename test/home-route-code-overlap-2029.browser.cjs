// Actual compiled public profile; ALL external responses are controlled fixtures.
// Verify code/data overlap, failure and cancellation, not live timings.
const {chromium,expect}=require('@playwright/test'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const dist=path.resolve('preview-deploy/dist'),out=process.env.SOD_HOME_OVERLAP_OUT||'/tmp/public-launch-useful-loading-20261102/home-overlap-controlled';fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(dist+'/2029.html','utf8'),entry=html.match(/await import\('([^']+)'\)/)[1];
const server=http.createServer((req,res)=>{let file=path.resolve(dist,'.'+new URL(req.url,'http://test').pathname);if(file!==dist&&!file.startsWith(dist+'/'))return res.writeHead(403).end();if(!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.setHeader('Content-Type','text/html');return res.end(html.replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/,`<script type="module" src="${entry}"></script>`));}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{let browser;const results=[];try{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const mode of['success','failed','cancel']){
 const context=await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block'}),page=await context.newPage();let releaseCode,releaseRead,seen;const codeGate=new Promise(r=>releaseCode=r),readGate=new Promise(r=>releaseRead=r),readSeen=new Promise(r=>seen=r);let primaryReads=0,codeReleased=false,canceled=false;const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',req=>{if(new URL(req.url()).searchParams.get('limit')==='9'&&new URL(req.url()).searchParams.get('select')?.includes('home_hidden'))canceled=true;});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin){if(/\/assets\/Home2029Page-[^/]+\.js$/.test(u.pathname))await codeGate;return route.continue();}
 if(u.hostname!=='linswmnnkjxvweumprav.supabase.co'||!u.pathname.startsWith('/rest/v1/'))return route.abort();
 const primary=u.pathname==='/rest/v1/posts'&&u.searchParams.get('select')?.includes('home_hidden')&&u.searchParams.get('limit')==='9';let body=[];
 if(primary){primaryReads++;assert.equal(codeReleased,false,'primary read must start before delayed Home component');seen();if(mode==='cancel')await readGate;if(mode==='failed')return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'controlled denied',code:'42501'})});body=[{id:1,slug:'synthetic-home',title:'תוכן ציבורי מבוקר',source:'site',date:'2026-11-01',modified:'2026-11-01',tags:[],categories:[]}];}
 try{await route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'0-0/0'},body:JSON.stringify(body)});}catch(e){if(mode!=='cancel')throw e;}
 });
 await page.goto(origin+'/?source=controlled-home',{waitUntil:'domcontentloaded'});await readSeen;assert.equal(primaryReads,1);await expect(page.locator('.h29-card-open')).toHaveCount(0);
 if(mode==='cancel'){await page.evaluate(()=>{history.pushState({},'', '/world');dispatchEvent(new PopStateEvent('popstate'));});await expect(page).toHaveURL(origin+'/world');await expect.poll(()=>canceled).toBe(true);}
 codeReleased=true;releaseCode();releaseRead();
 if(mode==='success'){await expect(page.locator('.h29-card-open')).toHaveCount(1);await expect(page.locator('.h29-hero')).toContainText('תוכן ציבורי מבוקר');}
 if(mode==='failed'){await expect(page.locator('.h29-hero')).toContainText('העדכונים אינם זמינים כרגע');await expect(page.locator('.h29-card-open')).toHaveCount(0);}
 if(mode==='cancel'){await page.waitForTimeout(300);await expect(page.locator('.h29-card-open')).toHaveCount(0);await expect(page).toHaveURL(origin+'/world');}
 assert.equal(primaryReads,1,'no duplicate composition read');assert.deepEqual(errors,[]);results.push({mode,primaryReads,readBeforeCode:true,canceled,remoteForwarded:0});await context.close();
 }fs.writeFileSync(out+'/results.json',JSON.stringify({ok:true,syntheticOnly:true,results},null,2)+'\n');console.log(JSON.stringify({ok:true,cases:results.length}));
}catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();server.close();}})();
