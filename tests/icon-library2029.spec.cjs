const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173';
test.use({launchOptions:{executablePath:process.env.KINGDOM_CHROMIUM||'/usr/bin/chromium'}});
for(const [width,preset] of [[1440,'light'],[1440,'dark'],[390,'parchment'],[320,'dark']])test(`${width} / ${preset}: complete family, optical bounds, search and keyboard`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:900});
 await page.addInitScript(p=>localStorage.setItem('sod-theme',p),preset);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(BASE+'/icon-library/');
 await expect(page.getByRole('heading',{name:'ספריית האייקונים',exact:true})).toBeVisible();
 await expect(page.locator('.icon-library-grid svg')).toHaveCount(44);
 await expect(page.locator('[data-icon-fallback]')).toHaveCount(0);
 const invalid=await page.locator('.icon-library-grid svg').evaluateAll(nodes=>nodes.filter(n=>{const b=n.getBBox();return !b.width||!b.height||b.x<.8||b.y<.8||b.x+b.width>23.2||b.y+b.height>23.2||n.getAttribute('stroke-width')!=='1.8';}).map(n=>n.dataset.iconName));
 expect(invalid).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByRole('searchbox',{name:'חיפוש אייקון'}).fill('מילוי');
 await expect(page.locator('.icon-library-grid li')).toHaveCount(1);
 const choice=page.locator('.icon-library-grid button');await choice.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('region',{name:'האייקון שנבחר'}).getByRole('heading')).toHaveText('מילוי');
 await expect(page.getByRole('link',{name:'הורדת SVG',exact:true})).toHaveAttribute('href','./svg/milui.svg');
 expect(errors).toEqual([]);
});
test('exported SVGs match the live catalogue and archive downloads',async({page,request})=>{
 await page.goto(BASE+'/icon-library/');
 const catalogue=await (await request.get(BASE+'/icon-library/catalog.json')).json();
 expect(catalogue.icons).toHaveLength(44);
 for(const item of catalogue.icons){const r=await request.get(`${BASE}/icon-library/svg/${item.name}.svg`);expect(r.status()).toBe(200);const svg=await r.text();expect(svg).toContain(`data-icon-name="${item.name}"`);expect(svg).toContain('<title>');expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');expect(svg).not.toContain('data-icon-fallback');}
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'הורדת הספרייה כולה'}).click();expect((await download).suggestedFilename()).toBe('sod1820-icons.zip');
});
