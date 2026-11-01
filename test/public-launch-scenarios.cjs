const {expect}=require('@playwright/test');
module.exports={...require('./public-world-scenarios.cjs'),...require('./world-gallery-native-scenarios.cjs'),...require('../docs/reviews/public-launch-candidate-20261101/world-gallery-audit.cjs'),
 async launchScope(page,width,info,origin){
  await page.setViewportSize({width,height:900});
  await page.goto(origin+'/login?returnTo=%2Fworld%3Fview%3Dwisdom%23world-source-homes');
  await expect(page.getByRole('heading',{name:'החשבון ייפתח בהמשך',exact:true})).toBeVisible();
  await expect(page.locator('input[type=email],input[type=password]')).toHaveCount(0);
  const returnLinks=page.getByRole('link',{name:'חזרה לגלישה ←',exact:true});
  for(const link of await returnLinks.all())expect(await link.getAttribute('href')).toBe('/world?view=wisdom#world-source-homes');
  await page.locator('.sod29-account-entry').getByRole('link',{name:'חזרה לגלישה ←',exact:true}).click();
  await expect(page).toHaveURL(origin+'/world?view=wisdom#world-source-homes');
  await page.goto(origin+'/2029/me/profile');
  await expect(page.getByText('האזור האישי ייפתח בהמשך',{exact:true}).first()).toBeVisible();
  await expect(page.locator('input[type=file],button[type=submit]')).toHaveCount(0);
  await page.goto(origin+'/community/chat');
  await expect(page.getByRole('heading',{name:'הקהילה תיפתח בהמשך',exact:true})).toBeVisible();
  await expect(page.locator('textarea')).toHaveCount(0);
  for(const route of ['/updates','/unsubscribe?e=synthetic-fixture&t=synthetic-fixture']){
   await page.goto(origin+route);await expect(page.getByText('פעולות הדיוור אינן פעילות בגרסה זו.',{exact:false})).toBeVisible();
   await expect(page.locator('input[type=email],button[type=submit]')).toHaveCount(0);
  }
  await page.goto(origin+'/map');await expect(page.getByRole('navigation',{name:'דפי האתר',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('public-map.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
};
