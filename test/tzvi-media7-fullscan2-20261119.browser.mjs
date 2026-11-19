// Opt-in live guest acceptance; run against a local reviewed public-reading build.
// SOD_ACCEPTANCE_BASE_URL=http://localhost:4173 node test/tzvi-media7-fullscan2-20261119.browser.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const base=process.env.SOD_ACCEPTANCE_BASE_URL;
if(!base) throw new Error('SOD_ACCEPTANCE_BASE_URL is required; never run against Production implicitly');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY ? {proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}} : {})});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const blocked=[],errors=[];
await context.route('**/*',async route=>{const r=route.request();if(!['GET','HEAD','OPTIONS'].includes(r.method())&&!/\/rpc\/world_gematria_lexical_lookup_v1(?:\?|$)/.test(r.url())){blocked.push({method:r.method(),path:new URL(r.url()).pathname});return route.abort();}return route.continue();});
const page=await context.newPage();page.on('pageerror', e=>errors.push(e.message));
page.on('requestfailed',r=>{if(r.method()==='GET')errors.push({url:r.url().split('?')[0],error:r.failure()?.errorText});});

try {
const results=[];
const ids=['94cab26c-02cb-4eb3-ae32-61fee950dfea','9fd28f82-5619-4161-9840-c957842d99fd','b0c9ae32-82ed-4845-8ac9-676c6010fe5d','a9386f4b-21c1-4369-9f3d-1d7f95c3c47c','a6da5b36-121a-4e93-b2be-b8a7a250373f','12ef341e-5c0e-4276-9680-6471dc569e18','b1d6c523-bb3d-459a-9db4-32037e8da2e7'];
const mediaKeys=['4259312b-b67d-5189-b5c5-d0576701211a','8b46b0ee-d4be-55f9-b876-7140488a746d','1ed0fd11-1d4f-5aaf-8be5-68779454a063','38af7cfe-9ada-53ad-8fe5-92120faa6b59','a2d0bbea-db2b-5166-b962-3e3cfdeb1214','688dd44d-eb39-5867-aa46-ffcef2d04aa7','b4b93721-eccf-57ee-8038-fb554101fa04'];
const sourceHref=id=>base+'/world?view=sources&source=tzvi-opoc&sourceRef='+encodeURIComponent('channel_updates:'+id)+'#source-occurrence-'+id;
const cards={'9fd28f82-5619-4161-9840-c957842d99fd':'3ead3207-5c23-41e6-ac28-89ae16bce6b5','b0c9ae32-82ed-4845-8ac9-676c6010fe5d':'f9e7b5e4-be17-40a6-892d-5efe32a63b03','a9386f4b-21c1-4369-9f3d-1d7f95c3c47c':'d1243b76-228f-4f8e-9c6c-672a2ec4c838','12ef341e-5c0e-4276-9680-6471dc569e18':'5868f2e0-248e-45b8-863b-0981c4f98b51'};
for(const id of ids){
 const card=cards[id]||id;
 await page.goto(sourceHref(card),{waitUntil:'domcontentloaded'});
 const img=page.locator('article[data-source-ref="channel_updates:'+card+'"] img');
 await img.waitFor({timeout:55000});await img.scrollIntoViewIfNeeded();
 await page.waitForFunction(id=>{const img=document.querySelector('article[data-source-ref="channel_updates:'+id+'"] img');return img?.complete&&img.naturalWidth>0;},card,{timeout:20000});
 if(await img.getAttribute('src') !== 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/11/'+mediaKeys[ids.indexOf(id)]+'/original.jpg') throw new Error('Unexpected public media '+id);
 results.push({kind:'media',id,card,loaded:true,url:await img.getAttribute('src')});console.log(JSON.stringify(results.at(-1)));
}
for (const [id,source] of [['73f034f7-3622-4f84-ae51-3da3ab626c47','98d127e6-f22c-4fc7-bce2-8ed5d8b61057'],['762cb2fb-c54f-4f4a-b5a1-50684d244c64','74adef58-8838-4cba-b13a-c03bb788d7f7']]){
 await page.goto(base+'/world?finding='+id,{waitUntil:'domcontentloaded'});
 const link=page.locator('a[href*="sourceRef=channel_updates%3A'+source+'"]').first();
 await link.waitFor({timeout:40000});
 const body=await page.locator('body').innerText();
 if(body.includes('לא ניתן לפתוח'))throw new Error('finding unavailable '+id);
 await page.goto(sourceHref(source),{waitUntil:'domcontentloaded'});
 const article=page.locator('article[data-source-ref="channel_updates:'+source+'"]');
 await article.waitFor({timeout:55000});
 await article.getByRole('button',{name:'ממצאים במקור',exact:true}).click();
 await article.locator('a[href^="/world?finding='+id+'"]').first().waitFor({timeout:30000});
 results.push({kind:'fullscan',id,source,detail:true,sourceList:true});console.log(JSON.stringify(results.at(-1)));
}
if(process.env.SOD_ACCEPTANCE_SCREENSHOT) await page.screenshot({path:process.env.SOD_ACCEPTANCE_SCREENSHOT});
console.log(JSON.stringify({summary:{media:results.filter(r=>r.kind==='media').length,fullscan:results.filter(r=>r.kind==='fullscan').length},errors,blocked}));
} finally { await browser.close(); }
