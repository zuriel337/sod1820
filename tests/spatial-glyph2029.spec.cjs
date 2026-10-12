const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const BASE='http://127.0.0.1:4173';
const OUT=process.env.KINGDOM_ARTIFACTS||'test-results/spatial';
test.use({launchOptions:{executablePath:process.env.KINGDOM_CHROMIUM||'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']}});
async function open(page,preset='dark'){
  await page.route('**/*',route=>new URL(route.request().url()).origin===BASE?route.continue():route.abort());
  await page.addInitScript(p=>localStorage.setItem('sod-theme',p),preset);
  await page.goto(BASE+'/2029/kingdom');
  await page.getByRole('button',{name:'כניסה לממלכה',exact:true}).click();
  await page.getByRole('button',{name:'מבט מקרוב באותיות'}).click();
  await expect(page.getByRole('region',{name:'אותיות הגילוי'})).toBeVisible();
}
for(const preset of ['light','parchment','dark']) test(`GPU topology, selection and context-loss fallback / ${preset}`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1440,height:1000});await open(page,preset);
  const scene=page.getByRole('region',{name:'אותיות הגילוי'});
  await expect(scene).toHaveAttribute('data-renderer','outline');
  await scene.getByRole('button',{name:'הפעלת תלת־ממד'}).click();
  await expect(scene).toHaveAttribute('data-renderer','gpu',{timeout:20000});
  await scene.getByRole('button',{name:'אות ב, מיקום 2',exact:true}).click();
  await expect(scene).toHaveAttribute('data-occurrence','glyph:1:ב');
  await expect(scene).toHaveAttribute('data-renderer','gpu');
  await scene.getByRole('button',{name:'מבט חזית'}).click();
  await expect(scene.locator('canvas')).toHaveCount(1);
  await page.getByLabel('התשובה שלכם',{exact:true}).fill('3');
  await page.getByRole('button',{name:'בדיקת התשובה'}).click();
  await page.getByRole('button',{name:'המשך הגילוי',exact:true}).click();
  await page.getByLabel('התשובה שלכם',{exact:true}).fill('32');
  await page.getByRole('button',{name:'בדיקת התשובה'}).click();
  await page.getByRole('button',{name:'שדרוג שביל האותיות — 20 אור',exact:true}).click();
  await page.getByRole('button',{name:/מכרה המספרים.*רמה/}).click();
  await expect(page.locator('.sod29-glyph-scene')).toHaveCount(0);
  await page.getByRole('button',{name:'מבט מקרוב באותיות'}).click();
  await scene.getByRole('button',{name:'הפעלת תלת־ממד'}).click();
  await expect(scene).toHaveAttribute('data-renderer','gpu',{timeout:20000});
  await scene.getByRole('button',{name:'מבט חזית'}).click();
  await scene.getByRole('button',{name:'אות ם, מיקום 4',exact:true}).click();
  await expect(scene).toHaveAttribute('data-renderer','gpu');
  if(preset==='light') {
    const canvas=scene.locator('canvas');
    const before=await canvas.screenshot();
    const box=await canvas.boundingBox();
    const cx=box.x+box.width/2,cy=box.y+box.height/2;
    await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+40,cy);await page.mouse.up();
    expect((await canvas.screenshot()).equals(before)).toBe(true); // empty hole is not draggable ink
    await page.mouse.move(cx+85,cy);await page.mouse.down();await page.mouse.move(cx+130,cy+15);await page.mouse.up();
    expect((await canvas.screenshot()).equals(before)).toBe(false); // actual contour mesh is draggable
  }
  fs.mkdirSync(OUT,{recursive:true});await scene.screenshot({path:`${OUT}/mem-gpu-${preset}.png`});
  await page.setViewportSize({width:390,height:844});
  await expect(scene).toHaveAttribute('data-renderer','gpu');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await scene.screenshot({path:`${OUT}/mem-gpu-mobile-${preset}.png`});
  await scene.locator('canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await expect(scene).toHaveAttribute('data-renderer','outline');
  await expect(scene.getByRole('status')).toContainText('אינה זמינה');
  await expect(scene.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('keyboard selection, frame reduced-motion and GPU initialization failure preserve identity',async({page})=>{
  await open(page);
  const scene=page.getByRole('region',{name:'אותיות הגילוי'});
  await scene.getByRole('button',{name:'אות ב, מיקום 2',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(scene).toHaveAttribute('data-occurrence','glyph:1:ב');
  await page.evaluate(()=>document.documentElement.setAttribute('data-frame-reduced-motion','true'));
  await expect(scene.getByRole('button',{name:'הפעלת תלת־ממד'})).toHaveCount(0);
  await page.evaluate(()=>document.documentElement.removeAttribute('data-frame-reduced-motion'));
  await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...rest){return kind.startsWith('webgl')?null:original.call(this,kind,...rest);};});
  await scene.getByRole('button',{name:'הפעלת תלת־ממד'}).click();
  await expect(scene.getByRole('status')).toContainText('אינה זמינה');
  await expect(scene).toHaveAttribute('data-occurrence','glyph:1:ב');
  await expect(scene.locator('canvas')).toHaveCount(0);
});

test('shared Milui consumes captured canonical trace, repeated occurrences, expansion and truthful marked-text fallback',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/*',route=>new URL(route.request().url()).origin===BASE?route.continue():route.abort());
 await page.goto(BASE+'/spatial-review/');
 const milui=page.getByRole('region',{name:'המילוי במרחב'});
 await expect(milui).toBeVisible();
 await milui.getByRole('button',{name:'אות א, מיקום 3',exact:true}).click();
 await expect(milui).toHaveAttribute('data-occurrence','glyph:2:א');
 await milui.getByRole('button',{name:'פתיחת המילוי'}).click();
 await expect(milui.locator('.sod29-glyph-expansion')).toContainText('אלף');
 await expect(milui.locator('.sod29-glyph-expansion')).toContainText('302');
 await expect(milui.locator('.sod29-glyph-expansion')).toHaveAttribute('data-anchor',/\d/);
 await milui.getByRole('button',{name:'הפעלת תלת־ממד'}).click();
 await expect(milui).toHaveAttribute('data-renderer','gpu');
 await milui.getByRole('button',{name:'אות מ, מיקום 2',exact:true}).click();
 await milui.getByRole('button',{name:'פתיחת המילוי'}).click();
 await expect(milui.locator('.sod29-glyph-expansion')).toContainText('מם');
 await expect(milui.locator('.sod29-glyph-expansion')).toContainText('191');
 await page.getByRole('combobox').selectOption('א א אָ ך');
 const shapes=page.getByRole('region',{name:'בדיקת גבולות האות'});
 await shapes.getByRole('button',{name:'אות אָ, מיקום 3',exact:true}).click();
 await expect(shapes.locator('.sod29-glyph-native')).toHaveText('אָ');
 await expect(shapes.getByRole('button',{name:'הפעלת תלת־ממד'})).toHaveCount(0);
 await shapes.getByRole('button',{name:'אות ך, מיקום 4',exact:true}).click();
 await shapes.getByRole('button',{name:'הפעלת תלת־ממד'}).click();
 await expect(shapes).toHaveAttribute('data-renderer','gpu');
 await expect(milui).toHaveAttribute('data-renderer','outline');
 await expect(page.locator('canvas')).toHaveCount(1);
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.locator('canvas')).toHaveCount(0);
 await expect(milui.locator('.sod29-glyph-expansion')).toContainText('191');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 fs.mkdirSync(OUT,{recursive:true});await page.screenshot({path:`${OUT}/milui-mobile.png`,fullPage:true});
});
