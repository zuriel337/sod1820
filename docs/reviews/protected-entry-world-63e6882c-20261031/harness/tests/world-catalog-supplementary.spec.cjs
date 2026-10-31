// Additional current-data observation. Existing c2f2e994 World tests stay unchanged.
const {test,expect,origin}=require('./safe-preview-fixture.cjs');
const fs=require('node:fs');
test('Supplementary: current public World entry, real catalog search and expansion remain usable',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/world',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{name:'העולם',exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'כניסה לעולם'})).toBeVisible();
  const entries=page.getByRole('navigation',{name:'דרכים לגלות את העולם'});
  await entries.getByRole('button',{name:/^נושאים וחיבורים/}).click();
  await expect(page).toHaveURL(origin+'/world?view=connections');
  const catalog=page.locator('#world-all-convergences');
  const cards=catalog.locator('.sod29-world-catalog-card');
  await expect(cards.first()).toBeVisible({timeout:30000});
  const label=(await cards.first().locator('strong').innerText()).trim();
  const before=await cards.count();
  const search=catalog.getByRole('textbox',{name:'חיפוש בנושאים ובחיבורים'});
  await search.fill(label);await expect(cards.first()).toContainText(label,{timeout:30000});
  await search.fill('');await expect(cards.first()).toBeVisible({timeout:30000});
  const expand=catalog.getByRole('button',{name:/^(עוד נושאים וחיבורים|הצג פחות)$/});
  await expect(expand).toBeVisible({timeout:30000});await expand.click();await expect(expand).toHaveAttribute('aria-expanded','true');
  const after=await cards.count();expect(after).toBeGreaterThan(before);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(await page.evaluate(()=>document.documentElement.clientWidth));
  fs.writeFileSync(testInfo.outputPath('catalog-observation.json'),JSON.stringify({before,after,searchUsedRealPublicLabel:true,syntheticRows:false},null,2));
  await page.screenshot({path:'test-results/release-visual/world-current-public-catalog-390.png',fullPage:false});
});
