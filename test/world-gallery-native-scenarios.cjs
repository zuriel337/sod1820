// Same local/hosted actions. Transport is supplied by the independent read-only
// fixture; all examples below must come from real admitted public rows.
const {expect}=require('@playwright/test'),fs=require('node:fs');
async function preciseReturn(page,width){
 if(width<981){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();}
 else await page.locator('.sod29-sidebar').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();
}
async function followGallery(page,width,origin,link,sourceAddress,sourceSelector,capturePath){
 const href=await link.getAttribute('href'),u=new URL(href,origin);
 expect(u.pathname).toBe('/world');expect(u.searchParams.get('view')).toBe('gallery');
 const id=u.searchParams.get('image');expect(id).toMatch(/^[a-f0-9-]{36}$/i);expect(u.hash).toBe('#gallery-source-'+id);
 await link.click();await expect(page).toHaveURL(origin+href);
 const image=page.locator('.g29-gallery .g29-exhibit[data-gallery-image-id="'+id+'"]');await expect(image).toBeVisible({timeout:60000});
 await expect(image.locator('.g29-canvas img')).toBeVisible();
 await expect.poll(()=>image.locator('.g29-canvas img').evaluate(img=>img.complete&&img.naturalWidth>0),{timeout:30000}).toBe(true);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 if(capturePath)await page.screenshot({path:capturePath});
 const state=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')||'null'));
 expect(state?.returnTo?.href).toBe(sourceAddress);
 await page.reload();await expect(page).toHaveURL(origin+href);await expect(image).toBeVisible({timeout:60000});
 await page.goBack();await expect(page).toHaveURL(origin+sourceAddress);await expect(page.locator(sourceSelector)).toBeVisible({timeout:60000});
 await page.goForward();await expect(page).toHaveURL(origin+href);await expect(image).toBeVisible({timeout:60000});
 await preciseReturn(page,width);await expect(page).toHaveURL(origin+sourceAddress);await expect(page.locator(sourceSelector)).toBeVisible({timeout:60000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 return{sourceAddress,href,imageId:id,realPublic:true,imagePixelsLoaded:true,reloadBackForwardAndPreciseReturn:true};
}
async function worldGalleryStories(page,width,info,origin){
 page.setDefaultTimeout(30000);const visits=[],links=[];
 for(const [reading,witness]of[['wall','wall-clock'],['rails','david-rail-caption'],['wisdom-set','jerusalem-cable']]){
  const address='/world#world-discovery-'+reading+'--'+witness;
  await page.goto(origin+address);
  const history=page.locator('.sod29-discovery-history');await expect(history).toBeVisible({timeout:60000});
  await history.locator(':scope>summary').click();const gallery=history.getByRole('link',{name:'לתמונה המדויקת בגלריה ב־2029',exact:true});await expect(gallery.first()).toBeVisible();
  links.push(...await gallery.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))));
  visits.push(await followGallery(page,width,origin,gallery.first(),address,'.sod29-connected-discovery',info.outputPath('gallery-'+reading+'-'+width+'.png')));
 }
 fs.writeFileSync(info.outputPath('native-gallery-stories.json'),JSON.stringify({width,visits,allRenderedGalleryLinks:links,writesForwarded:0,modelsForwarded:0},null,2)+'\n');
}
async function worldGalleryConnections(page,width,info,origin){
 page.setDefaultTimeout(30000);const address='/world#world-source-water-train';await page.goto(origin+address);
 const source=page.locator('[data-witness="water-train"]');await expect(source).toBeVisible({timeout:90000});
 const allWorldGalleryLinks=await page.locator('.sod29-world-source-connections a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
 expect(allWorldGalleryLinks.some(href=>/\/archive\?|\/gallery\?/.test(href))).toBe(false);
 const history=source.locator('details').filter({has:page.locator('summary').filter({hasText:'הגלריות, הכיתובים והקרדיטים המקוריים'})});
 await history.locator(':scope>summary').click();const links=history.getByRole('link',{name:'לתמונה המדויקת בגלריה ב־2029',exact:true});await expect(links).toHaveCount(2);
 const hrefs=await links.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
 const second=links.nth(1);
 const visit=await followGallery(page,width,origin,second,address,'[data-witness="water-train"]',info.outputPath('gallery-second-appearance-'+width+'.png'));
 await page.screenshot({path:info.outputPath('world-gallery-return-'+width+'.png')});
 fs.writeFileSync(info.outputPath('native-gallery-connections.json'),JSON.stringify({width,visit,hrefs,allWorldGalleryLinks,sharedSourceAppearancesPreserved:2,writesForwarded:0,modelsForwarded:0},null,2)+'\n');
}
module.exports={worldGalleryStories,worldGalleryConnections};
