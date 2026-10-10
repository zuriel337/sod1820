// Real public readers on the integrated Home/World/Post/Number surfaces.
// No production account writes, synthetic source positives, or implicit Path start.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.FLIGHT_PREVIEW_BASE || 'http://127.0.0.1:4174';
const out=process.env.FLIGHT_PREVIEW_ARTIFACTS || '/workspace/artifacts/unified-world-preview/browser';
const share=process.env.FLIGHT_SHARE_FILE ? (await fs.readFile(process.env.FLIGHT_SHARE_FILE,'utf8')).trim() : null;
const widths=(process.env.FLIGHT_WIDTHS || '1440,390').split(',').map(Number);
const themes=(process.env.FLIGHT_THEMES || 'dark').split(',');
const reads=new Set(['gematria_api','fn_method_value','fn_method_profile','gematria_method_trace','fn_zero_scale','posts_by_number_strict','fn_number_lookup','fn_number_dossier','fn_number_journey','number_neighbors','fn_all_methods','world_group_source_arrivals_v2']);
const receipt={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base,at:new Date().toISOString(),cases:[],errors:[],ownerGaps:[]};
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
let page;
try {
for(const theme of themes) for(const width of widths){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 await context.addInitScript(theme=>localStorage.setItem('sod-theme',theme),theme);
 await context.route('**/*',async route=>{const r=route.request(),u=new URL(r.url()),rpc=u.pathname.match(/^\/rest\/v1\/rpc\/(.+)$/)?.[1];
  if(process.env.LOCAL_VITE==='1'&&u.origin===base&&r.isNavigationRequest()&&/^\/(2029|world|post|topic)/.test(u.pathname)){const res=await context.request.get(`${base}/2029.html`);return route.fulfill({contentType:'text/html',body:await res.body()});}
  if(u.pathname.startsWith('/auth/v1/')||(!['GET','HEAD','OPTIONS'].includes(r.method())&&!(u.hostname==='linswmnnkjxvweumprav.supabase.co'&&reads.has(rpc))))return route.fulfill({status:403,contentType:'application/json',body:'{"error":"read-only review"}'});
  return route.continue();
 });
 page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>receipt.errors.push(e.message));
 const capture=async name=>{console.log(`${theme} ${width} ${name}`);return page.screenshot({path:`${out}/${theme}-${width}-${name}.png`});};
 const current=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')));
 const fit=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 if(share){await page.goto(share,{waitUntil:'domcontentloaded'});await page.waitForURL(u=>u.origin===base&&!u.searchParams.has('_vercel_share'));}
 await page.goto(`${base}/2029`,{waitUntil:'domcontentloaded'});
 await page.locator('[data-flight-story=home]').waitFor({timeout:90000});
 const arrivals=page.locator('.sod29-source-arrivals');await arrivals.locator('[data-source-arrival]').first().waitFor({timeout:90000});
 await page.locator('.sod29-flight-media img').evaluate(img => img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise((resolve,reject) => { img.addEventListener('load',resolve,{once:true}); img.addEventListener('error',() => reject(Error('Source image unavailable')),{once:true}); }));
 await fit();await capture('home');assert.equal((await current())?.journey || null,null);
 const group=arrivals.locator('details[data-source-arrival]').first();
 if(await group.count()){await group.locator('summary').click();await group.locator('.sod29-source-arrival-body').waitFor();assert.match(await group.innerText(),/טרם נבדק/);assert.ok((await group.locator('.sod29-source-arrival-body').innerText()).length>50);await capture('source-before-research');await group.locator('summary').click();}
 await arrivals.getByRole('button',{name:'פוסטים אחרונים',exact:true}).click();
 await arrivals.locator('article[data-source-arrival]').first().waitFor();assert.match(await arrivals.innerText(),/פרסום המקור/);
 const refs=await arrivals.locator('[data-source-arrival]').evaluateAll(es=>es.map(e=>e.dataset.sourceArrival));assert.equal(new Set(refs).size,refs.length);
 await capture('recent-posts');
 await page.getByRole('button',{name:'לגלות את החיבורים ב־World'}).click();
 await page.locator('[data-flight-story=world]').waitFor({timeout:90000});await fit();await capture('world');
 assert.equal(await page.locator('.sod29-flight-directions>button').count(),3);
 await page.locator('.sod29-flight-time>summary').click();assert.match(await page.locator('.sod29-flight-time').innerText(),/מועד גילוי החיבורים לא תועד/);await page.locator('.sod29-flight-time>summary').click();
 if(process.env.FLIGHT_VISUAL_ONLY==='1'){receipt.cases.push({width,theme,homeWorld:true,publicSources:true,noOverflow:true});await context.close();continue;}
 // Real full-source reader, not a thumbnail standing in for the original.
 await page.locator('.sod29-flight-directions>button').filter({hasText:'האנשים והמקומות'}).click();
 const source=page.locator('#world-plane-india');await source.waitFor({timeout:90000});
 const identity=await source.getAttribute('data-world-source-identity');assert.ok(identity);
 await source.getByRole('button',{name:'פתח את תמונת המקור של הקפטן'}).click();
 const [original]=await Promise.all([context.waitForEvent('page'),page.getByRole('link',{name:'פתח מקור',exact:true}).click()]);
 await original.waitForLoadState('domcontentloaded');assert.match(original.url(),/smit-machchhar-source/);await original.screenshot({path:`${out}/${theme}-${width}-original.png`});await original.close();await page.keyboard.press('Escape');
 await capture('world-source');
 await page.getByRole('button',{name:'לקריאת פוסט המטוס',exact:true}).filter({visible:true}).click();
 await page.locator('[data-post-slug]').waitFor({timeout:90000});await capture('post');
 assert.match(page.url(),/\/post\/flydubai/);assert.equal((await current()).journey,null);
 await page.getByRole('button',{name:'בדוק את מספר 1073',exact:true}).click();
 await page.getByRole('button',{name:/מה אנחנו חוקרים עכשיו/}).click();
 await page.getByRole('button',{name:'פתח בדף המספר',exact:true}).click();
 await page.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).waitFor({timeout:90000});
 await page.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();
 await page.waitForURL(/\/2029\/number\/1073/);
 const journey=page.locator('[data-number-path-continuation]');await journey.waitFor({timeout:90000});
 await page.getByRole('button',{name:'התחל מסע מהבחירה',exact:true}).click();
 await page.waitForFunction(()=>!!JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest'))?.journey);
 const active=await current();const root=active.journey.root.id;const returnHref=active.returnTo?.href;
 assert.match(returnHref,/\/post\/flydubai/);await capture('number-journey');
 await page.getByRole('button',{name:'חזרה מדויקת',exact:true}).filter({visible:true}).first().click();
 await page.waitForURL(u=>u.pathname.startsWith('/post/'));await page.locator('[data-post-slug]').waitFor({timeout:90000});
 assert.equal((await current()).journey.root.id,root);
 const returned=await current();
 if(returned.selection?.locator !== '#source-region-flight-1073') receipt.ownerGaps.push({width,owner:'Posts',gap:'Post mount resets the returned flight-1073 selection',actualLocator:returned.selection?.locator});
 const nativeRegion=await page.locator('#source-region-flight-1073').count();
 if(!nativeRegion) receipt.ownerGaps.push({width,owner:'Posts',gap:'Stored post_region locator has no native rendered anchor; exact source-region/video return pending.'});
 await capture('return-post');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-post-slug]').waitFor({timeout:90000});assert.equal((await current()).journey.root.id,root);
 receipt.cases.push({width,theme,homeWorldPost:true,sourceIdentity:identity,originalImage:true,publicSources:true,explicitJourney:true,returnHref,actualReturn:page.url(),journeySurvivesReload:true});
 await context.close();
}
assert.deepEqual(receipt.errors,[]);
}catch(error){receipt.failure=error.stack;if(page){await page.screenshot({path:out+'/failure.png'}).catch(()=>{});await fs.writeFile(out+'/failure-body.txt',await page.locator('body').innerText().catch(()=>''));receipt.context=await page.evaluate(()=>sessionStorage.getItem('sod_research_context_v2:guest')).catch(()=>null);}throw error;
}finally{await fs.writeFile(out+'/receipt.json',JSON.stringify(receipt,null,2));await browser.close();}
console.log(JSON.stringify({cases:receipt.cases,errors:receipt.errors}));
