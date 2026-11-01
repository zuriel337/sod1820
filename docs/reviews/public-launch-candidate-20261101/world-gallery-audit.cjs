const {expect}=require('@playwright/test'),fs=require('node:fs');
async function worldGalleryLinkAudit(page,width,info,origin){
 const pages=[];
 const routes=[...['india','wisdom','october'].map(id=>({href:'/world#world-direction-'+id,ready:'.sod29-world-direction-content [data-witness]'})),
  {href:'/world?view=explore&kind=media',ready:'.sod29-world-media-shelf>article'},
  {href:'/world?view=sources&source=tzvi-opoc',ready:'.sod29-world-public-material-grid>article'},
  {href:'/world?view=sources&source=sod-hashmal&subjectSource=hashmal&q='+encodeURIComponent('ירושלים'),ready:'[data-experience-capability="corpus-full-source"]'}];
 for(const {href,ready} of routes){
  await page.goto(origin+href);await expect(page.locator(ready).first()).toBeVisible({timeout:90000});
  const links=await page.locator('main a[href]').evaluateAll(nodes=>nodes.map(node=>({href:node.getAttribute('href'),text:node.textContent.trim().slice(0,120)})));
  const legacy=links.filter(link=>{const u=new URL(link.href,origin);return [new URL(origin).hostname,'sod1820.co.il','www.sod1820.co.il','sod1820.vercel.app'].includes(u.hostname)
   &&(u.pathname==='/archive'&&(u.searchParams.has('gal')||u.searchParams.get('tab')==='galleries')||u.pathname==='/gallery'&&u.searchParams.has('gal'));});
  expect(legacy).toEqual([]);
  const native=links.filter(link=>{const u=new URL(link.href,origin);return u.pathname==='/world'&&u.searchParams.get('view')==='gallery';});
  pages.push({href,linksExamined:links.length,nativeGalleryLinks:native,legacyGalleryLinks:legacy,realPublicData:true});
 }
 fs.writeFileSync(info.outputPath('world-gallery-link-audit.json'),JSON.stringify({width,pages,scope:'rendered links in six populated public World views, not every historical database row or admin-only view',writes:0,models:0},null,2)+'\n');
}
module.exports={worldGalleryLinkAudit};
