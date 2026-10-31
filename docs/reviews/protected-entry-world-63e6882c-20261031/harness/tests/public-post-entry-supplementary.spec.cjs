// Supplemental hosted smoke, separate from the unchanged c2f2e994 Bennett acceptance.
// The Bennett source is currently a draft; this public post does not replace that test.
const {test,expect,origin}=require('./safe-preview-fixture.cjs');
test('Supplementary: public Flight Post has a readable entry and contextual orientation at 390px',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/post/flydubai-fz1073-363-14000-remzei-geula',{waitUntil:'networkidle'});
  const post=page.locator('[data-experience-surface="post-reading"]');
  await expect(post).toBeVisible({timeout:30000});
  await expect(post).toContainText('1073');
  const orientation=page.locator('.sod29-entry-orientation-slot .sod29-learn-mark');
  await expect(orientation).toBeVisible();
  await expect(orientation).toHaveClass(/is-prominent/);
  await expect(orientation.getByRole('button',{name:'חדש כאן? מה עושים בפוסט הזה?'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(await page.evaluate(()=>document.documentElement.clientWidth));
  await page.screenshot({path:'test-results/release-visual/public-flight-post-entry-390.png',fullPage:true});
});
