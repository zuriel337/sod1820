import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {PerspectiveCamera,Vector3} from 'three';
import {bindSourceModel,modelGeometry,CAMERA,MODEL_KEYS,viewportFov} from '../src/components/books2029/yetzirahModels/sourceModels.js';
const req=createRequire(import.meta.url);let pw,vite,react;
try{pw=req('playwright');vite=await import(pathToFileURL(req.resolve('vite')).href);react=(await import(pathToFileURL(req.resolve('@vitejs/plugin-react')).href)).default;}catch{}
const root=fileURLToPath(new URL('..',import.meta.url));const available=Boolean(pw&&vite&&react&&existsSync('/usr/bin/chromium'));
const data=name=>JSON.parse(readFileSync(resolve(root,`public/book-data/sefer-yetzirah.${name}.json`)));
const bundle={structures:data('structures'),units:data('units')};
const keys=Object.values(MODEL_KEYS).filter(k=>!process.env.YETZIRAH_MODEL_FILTER||process.env.YETZIRAH_MODEL_FILTER===k);
const widths=process.env.YETZIRAH_MODELS_MATRIX?[320,390,1440]:[1440];const themes=process.env.YETZIRAH_MODELS_MATRIX?['light','parchment','dark']:['dark'];
const out=process.env.YETZIRAH_MODELS_OUT||'/tmp/yetzirah-models';
test('required source-bound model browser tooling is available',()=>{if(process.env.YETZIRAH_MODELS_REQUIRE_BROWSER)assert.ok(available);});
test('source-bound models: explicit GPU, selection/source, close/reopen and failure preserve reading identity',{skip:!available,timeout:600000},async()=>{
 mkdirSync(out,{recursive:true});const server=await vite.createServer({root,configFile:false,plugins:[react()],server:{host:'127.0.0.1',port:0}});await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 const browser=await pw.chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});const observations=[];
 try{for(const key of keys)for(const width of widths)for(const theme of themes){
  const model=bindSourceModel(bundle,key),context=await browser.newContext({viewport:{width,height:1100},reducedMotion:'no-preference',hasTouch:true});
  await context.addInitScript(theme=>{localStorage.setItem('sod-theme',theme);window.__modelContexts=[];window.__modelRaf=new Set();const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){const result=original.call(this,kind,...args);if(/webgl/i.test(kind)&&result&&!window.__modelContexts.includes(result))window.__modelContexts.push(result);return result;};const raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{let id=raf(time=>{window.__modelRaf.delete(id);fn(time);});window.__modelRaf.add(id);return id;};window.cancelAnimationFrame=id=>{window.__modelRaf.delete(id);return cancel(id);};},theme);
  const page=await context.newPage();const errors=[],heavy=[];page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/YetzirahModelCanvas|\/deps\/three/.test(r.url()))heavy.push(r.url());});
  const item={model:key,width,theme,sourcePage:model.page,host:'test-only fixture',engineCalls:0};
  await context.route('**/*',r=>{if(r.request().url().includes('/functions/')){item.engineCalls++;return r.abort();}return r.continue();});
  try{
   await page.goto(`${base}/test/fixtures/yetzirah-models/index.html?model=${key}`,{waitUntil:'domcontentloaded'});const card=page.locator(`[data-yetzirah-model="${key}"]`);await card.locator('[data-component-id]').first().waitFor();
   assert.equal(await card.locator('canvas').count(),0);assert.equal(heavy.length,0,'no GPU module before explicit start');
   for(const c of model.components){const button=card.locator(`[data-component-id="${c.stable_id}"]`);await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');assert.equal(await card.getAttribute('data-selected-id'),c.stable_id);await card.locator('.ym-selection').getByRole('button',{name:`פתח את עמוד המקור ${c.source.pdf_page}`,exact:true}).click();assert.equal(await page.locator('[data-opened-source]').getAttribute('data-opened-source'),String(c.source.pdf_page));assert.equal(await card.getAttribute('data-selected-id'),c.stable_id);await page.getByRole('button',{name:'חזור למודל',exact:true}).click();}
   if(key==='six-seals-gra-edition'){const before=await card.getAttribute('data-selected-id');const other=card.locator('[data-comparison-witness="sy-structure:six-seals-synoptic"]');assert.equal(await other.locator('li').count(),6);for(const button of await other.getByRole('button').all()){await button.click();assert.equal(await page.locator('[data-opened-source]').getAttribute('data-opened-source'),'73');assert.equal(await card.getAttribute('data-selected-id'),before);await page.getByRole('button',{name:'חזור למודל',exact:true}).click();}item.comparisonWitnessIndependence=true;}
   const first=card.locator('[data-component-id]').first();await first.tap();await first.focus();await page.keyboard.press('Space');assert.equal(await first.getAttribute('aria-pressed'),'true');
   const start=card.getByRole('button',{name:'פתח המחשה בתלת־ממד',exact:true});await start.focus();await page.keyboard.press('Enter');const canvas=card.locator('canvas[data-render-state="ready"]');await canvas.waitFor({timeout:20000});
   const geometry=modelGeometry(model);const targets=[...geometry.points,...(geometry.segments||[])];const point=targets.find(p=>p.localId==='east'||p.localId==='south-east')||targets[0];const box=await canvas.boundingBox();const camera=new PerspectiveCamera(viewportFov(box.width,box.height),box.width/box.height,.1,100);camera.position.set(...CAMERA.position);camera.lookAt(...CAMERA.target);camera.updateMatrixWorld();const projected=new Vector3(...point.position).project(camera);await page.mouse.click(box.x+(projected.x+1)*box.width/2,box.y+(1-projected.y)*box.height/2);await page.waitForFunction(id=>document.querySelector('[data-yetzirah-model]')?.getAttribute('data-selected-id')===id,point.id);item.meshPointerSelection=true;
   const retained=await card.getAttribute('data-selected-id');await card.getByRole('button',{name:'סיבוב עדין',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.ym-canvas canvas')?.dataset.rotation==='running');
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('[data-yetzirah-model]')?.dataset.motionReduced==='true');assert.equal(await card.getByRole('button',{name:'סיבוב עדין',exact:true}).isDisabled(),true);await page.waitForFunction(()=>document.querySelector('.ym-canvas canvas')?.dataset.rotation==='off');item.dynamicReducedMotion=true;
   await page.screenshot({path:resolve(out,`${key}-${width}-${theme}.png`),fullPage:true});
   await card.getByRole('button',{name:'סגור את ההמחשה',exact:true}).click();assert.equal(await card.locator('canvas').count(),0);await page.waitForFunction(()=>window.__modelContexts.every(c=>c.isContextLost())&&window.__modelRaf.size===0);assert.equal(await start.evaluate(e=>e===document.activeElement),true);assert.equal(await card.getAttribute('data-selected-id'),retained);
   await start.click();await canvas.waitFor();assert.equal(await card.getAttribute('data-selected-id'),retained);
   await page.evaluate(()=>window.__modelContexts.find(c=>!c.isContextLost()).getExtension('WEBGL_lose_context').loseContext());await card.locator('[data-gpu-state="unavailable"]').waitFor();assert.equal(await card.locator('canvas').count(),0);assert.equal(await card.locator('[data-component-id]').count(),model.components.length);assert.equal(await card.getAttribute('data-selected-id'),retained);item.contextLossFallback=true;
   await card.getByRole('button',{name:'סגור את ההמחשה',exact:true}).click();await start.click();await canvas.waitFor();await canvas.focus();await page.keyboard.press('Escape');assert.equal(await card.locator('canvas').count(),0);await page.waitForFunction(()=>window.__modelContexts.every(c=>c.isContextLost())&&window.__modelRaf.size===0);item.resourcesReleased=true;
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.equal(await page.getByText('מאומת במנוע',{exact:true}).count(),0);assert.equal(item.engineCalls,0);assert.deepEqual(errors,[]);
   item.componentsTested=model.components.length;item.normalPageErrors=errors;item.pass=true;
  }catch(e){item.error=String(e);throw e;}finally{observations.push(item);writeFileSync(resolve(out,'observations.json'),JSON.stringify({browser:await browser.version(),observations},null,2));await context.close();}
  console.log(`Yetzirah model checked: ${key} ${width}/${theme}`);
 }}finally{await browser.close();await server.close();}
});
