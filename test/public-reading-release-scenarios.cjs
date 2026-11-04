const {expect}=require('@playwright/test');
const fs=require('node:fs');
async function calculator(page,width,info,origin){
 await page.setViewportSize({width,height:900});
 await page.goto(origin+'/map');await page.getByRole('link',{name:'מחשבון גימטריה',exact:true}).click();
 await expect(page.locator('#calculator-pro-input')).toBeVisible();
 const address='/gematria?w='+encodeURIComponent('דוד')+'&n=999999&source=map&part=2&part=7#calc-result';
 await page.goto(origin+address);await expect(page.locator('#calculator-pro-input')).toHaveValue('דוד');
 await expect(page.locator('.sod29-calcpro-hero-value')).toHaveText('14',{timeout:60000});
 await expect(page.locator('[data-calculation-selection]')).toHaveAttribute('data-calculation-selection','רגיל');
 const here=new URL(page.url());expect(here.searchParams.getAll('part')).toEqual(['2','7']);expect(here.hash).toBe('#calc-result');expect(here.searchParams.get('n')).toBeNull();
 await expect(page.getByRole('button',{name:'✦ שאל את רזיאל',exact:true})).toBeDisabled();
 const share=await page.locator('[data-share-url]').getAttribute('data-share-url');const shared=new URL(share);expect(shared.pathname).toBe('/gematria');expect(shared.searchParams.get('v')).toBe('14');expect(shared.searchParams.get('m')).toBe('רגיל');
 await page.getByRole('button',{name:'גלה הכל על 14 ←',exact:true}).click();
 await expect(page.locator('[data-experience-surface="number"]')).toBeVisible({timeout:60000});
 expect(new URL(page.url()).pathname).toBe('/number/14');expect(new URL(page.url()).searchParams.get('focus')).toBe('דוד');
 const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')||'null'));
 expect(saved.returnTo.href).toBe(here.pathname+here.search+here.hash);
 await page.getByRole('region',{name:'מיקוד ביטוי פעיל',exact:true}).getByRole('button',{name:'↩ מחשבון גימטריה',exact:true}).click();
 await expect(page.locator('#calculator-pro-input')).toHaveValue('דוד');expect(new URL(page.url()).hash).toBe('#calc-result');
 await page.goto(share);await expect(page.locator('[data-experience-surface="calculator-2029"]')).toBeVisible();
 await expect(page.locator('[data-share-url]')).toHaveAttribute('data-share-url',/v=14/,{timeout:60000});
 await page.reload();await expect(page.locator('[data-share-url]')).toHaveAttribute('data-share-url',/v=14/,{timeout:60000});await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://sod1820.co.il/gematria');
 await page.goto(origin+'/gematria?calc='+encodeURIComponent('דוד')+'&source=legacy');await expect(page.locator('.sod29-calcpro-hero-value')).toHaveText('14',{timeout:60000});
 await page.locator('#calculator-pro-input').fill('משיח');await expect(page.locator('.sod29-calcpro-hero-value')).toHaveText('358',{timeout:60000});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);expect(overflow).toBeLessThanOrEqual(1);
 await page.screenshot({path:info.outputPath('calculator-'+width+'.png')});
 fs.writeFileSync(info.outputPath('calculator-'+width+'.json'),JSON.stringify({width,data:'real canonical public engine responses; old n=999999 deliberately untrusted',regular:14,calculation:358,share,return:saved.returnTo.href,overflow,postedOrModelCallsForwarded:0},null,2));
}
async function desktopPostCenter(page,width,info,origin){
 await page.setViewportSize({width,height:1000});const path='/post/flydubai-fz1073-363-14000-remzei-geula';await page.goto(origin+path);
 await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});
 const geometry=await page.locator('.sod29-reading-source').evaluate(el=>{const content=el.getBoundingClientRect(),main=el.closest('main')?.getBoundingClientRect();return {content:content.toJSON(),main:main?.toJSON(),viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth};});
 expect(geometry.main).toBeTruthy();expect(Math.abs(geometry.content.x+geometry.content.width/2-geometry.main.x-geometry.main.width/2)).toBeLessThan(2);expect(geometry.overflow).toBeLessThanOrEqual(1);
 await page.screenshot({path:info.outputPath('plane-'+width+'.png')});fs.writeFileSync(info.outputPath('plane-'+width+'.json'),JSON.stringify({data:'actual public Plane Post',path,width,...geometry},null,2));
}
async function closedScope(page,width,info,origin){
 await page.setViewportSize({width,height:900});for(const path of ['/code','/journey','/raziel','/login','/2029/me','/heichal']){await page.goto(origin+path);await expect(page.getByRole('heading',{name:'האזור ייפתח בהמשך',exact:true})).toBeVisible();}
 fs.writeFileSync(info.outputPath('closures-'+width+'.json'),JSON.stringify({width,closed:['ELS','Journey','Raziel','Login','Personal','Heichal'],data:'actual compiled release profile; no live model or product-write forwarded'},null,2));
}
async function bennettFixtureCenter(page,width,info,origin){
 const fixture={id:-1185,slug:'bennett-melach-631-78',title:'בנט והמלח — דוגמת בדיקה לפריסה בלבד',content:'<p>תוכן בדיקה מבוקר למדידת מרכז הקריאה. אין כאן פרסום טיוטה או תוצאה שנבדקה בציבור.</p>',source:'ai',link:'/post/bennett-melach-631-78',date:'2026-11-01T00:00:00Z',tags:[],categories:[]};
 await page.route('**/rest/v1/posts?*',async route=>{const u=new URL(route.request().url());if((u.searchParams.get('slug')||'').includes(fixture.slug))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([fixture])});return route.fallback();});
 await page.setViewportSize({width,height:1000});await page.goto(origin+fixture.link);await expect(page.locator('.sod29-reading-source')).toContainText('תוכן בדיקה מבוקר');
 const geometry=await page.locator('.sod29-reading-source').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('main').getBoundingClientRect();return{content:a.toJSON(),main:b.toJSON(),overflow:document.documentElement.scrollWidth-innerWidth};});
 expect(Math.abs(geometry.content.x+geometry.content.width/2-geometry.main.x-geometry.main.width/2)).toBeLessThan(2);expect(geometry.overflow).toBeLessThanOrEqual(1);await page.screenshot({path:info.outputPath('bennett-fixture-'+width+'.png')});fs.writeFileSync(info.outputPath('bennett-fixture-'+width+'.json'),JSON.stringify({width,data:'synthetic Bennett layout fixture; real post 5113 remains draft, not published, not claimed publicly accepted',...geometry},null,2));
}
module.exports={calculator,desktopPostCenter,closedScope,bennettFixtureCenter};
