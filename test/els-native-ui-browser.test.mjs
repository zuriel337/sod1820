// The actual native React surface and canonical tool run together. Only the host adapter and
// server verification are test doubles; the oracle checks every candidate against the real corpus.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ELS_GOLDENS, ELS_GOLDEN_CORPUS_ID } from './fixtures/els-runtime-goldens.mjs';
import { libraryFixturePlugin } from './fixtures/els-library-browser-fixture.mjs';
import { captureElsResearchReturn, elsResearchReturnLoad } from '../src/lib/research/elsResearchReturnSnapshot.js';
import { groupElsLexiconDiscoveries } from '../src/lib/research/elsStructureInspection.js';
import { readElsMatrixShare } from '../src/lib/elsMatrixShare.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const req = createRequire(import.meta.url);
const golden = ELS_GOLDENS.find((item) => item.id === 'torah-kedosha-10065-fwd');
const letters = readFileSync(join(root, 'tools/els/data/tk-letters.txt'), 'utf8');
const TORAH_LEN = 304805;
let pw, vite, react;
try {
  pw = req('playwright');
  vite = await import(pathToFileURL(req.resolve('vite')).href);
  react = (await import(pathToFileURL(req.resolve('@vitejs/plugin-react')).href)).default;
} catch { /* Optional local browser tooling; CI can require it explicitly. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : pw?.chromium.executablePath());
const canRun = Boolean(pw && vite && react && executablePath && existsSync(executablePath));

test('Research tools have their own full-width entry below the matrix without adding side actions or automatic work',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 for(const width of [320,360,390,1440])await withNative({width,height:900},async page=>{
  const area=page.getByRole('region',{name:'כלי מחקר במטריצה',exact:true});
  const entry=area.getByRole('button',{name:'כלי מחקר',exact:true});
  const panel=area.getByRole('region',{name:'גילוי וקשרים במטריצה',exact:true});
  const before=await identity(page);
  const sideLabels=()=>page.locator('.els29-native-toolstrip > button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
  const expected=['סריקה וממצאים','תוצאות','שמירה','גילוי עם AI'];
  assert.deepEqual(await sideLabels(),expected);
  assert.equal(await entry.getAttribute('aria-expanded'),'false');
  assert.equal(await panel.count(),0,'heavy component remains unmounted until explicit opening');
  const requests=await page.evaluate(()=>window.__log.filter(m=>m.type==='engine-request').length);
  const geometry=await area.evaluate(el=>{
   const r=el.getBoundingClientRect(),stage=el.parentElement.querySelector('.els29-native-stage-column').getBoundingClientRect(),root=el.parentElement.getBoundingClientRect();
   return {top:r.top,bottom:stage.bottom,width:r.width,rootWidth:root.width,insideInspector:!!el.closest('.els29-native-panel-wrap'),insideStage:!!el.closest('.els29-native-stage-column')};
  });
  assert.equal(geometry.insideInspector,false,'research must not occupy the pinned inspector column');
  assert.equal(geometry.insideStage,false,'research is not constrained to the matrix column');
  assert.ok(geometry.top>=geometry.bottom-1,'entry follows the matrix');
  assert.ok(geometry.width>=geometry.rootWidth-40,JSON.stringify(geometry));
  await entry.press('Enter');await panel.waitFor();
  assert.equal(await entry.getAttribute('aria-expanded'),'true');
  assert.deepEqual(await sideLabels(),expected,'no fifth side action and no repurposed existing action');
  await panel.getByLabel('מסלול הגילוי').selectOption('language');
  await panel.getByText('בדיקת הסימונים והשוואת מופעים',{exact:true}).click();
  for(const theme of ['light','parchment','dark']){
   await page.evaluate(t=>window.__setThemePreset(t),theme);
   await entry.scrollIntoViewIfNeeded();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}/${theme}: no overflow`);
   const box=await entry.boundingBox();assert.ok(box.width>=44&&box.height>=44);
   assert.equal(await entry.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'entry remains reachable above frame overlays');
   assert.ok(await entry.locator('span,strong').evaluateAll(nodes=>nodes.every(el=>parseFloat(getComputedStyle(el).fontSize)>=16)));
   if(process.env.ELS_RESEARCH_AREA_SCREENSHOTS){mkdirSync(process.env.ELS_RESEARCH_AREA_SCREENSHOTS,{recursive:true});await page.screenshot({path:join(process.env.ELS_RESEARCH_AREA_SCREENSHOTS,`research-area-${width}-${theme}.png`)});}
  }
  await entry.press('Space');assert.equal(await panel.isVisible(),false);
  assert.equal(await entry.evaluate(el=>el===document.activeElement),true);
  await entry.press('Enter');
  assert.equal(await panel.getByLabel('מסלול הגילוי').inputValue(),'language','folding preserves the current tool settings');
  assert.equal(await panel.locator('.els29-discovery-inspection').getAttribute('open'),'');
  await page.evaluate(()=>{window.__fixtureResearchProfile=false;window.__forceParentRender();});
  assert.equal(await area.isVisible(),false,'Classic never acquires the research area');
  if(width<981)assert.equal(await page.locator('.els29-native-panel-wrap').evaluate(el=>getComputedStyle(el).gridRowStart),'3','Classic keeps its original panel row, without an empty research track');
  assert.deepEqual(await sideLabels(),expected);
  await page.evaluate(()=>{window.__fixtureResearchProfile=true;window.__forceParentRender();});
  assert.equal(await panel.getByLabel('מסלול הגילוי').inputValue(),'language');
  assert.deepEqual(await identity(page),before);
  assert.equal(await page.evaluate(()=>window.__log.filter(m=>m.type==='engine-request').length),requests);
  assert.equal(await page.evaluate(()=>window.__hostLog.filter(m=>m.type==='request-lens'&&m.lens==='matrix-lexicon').length),0);
  assert.equal(page.__elsDynamicLexiconRequests.length,0);
  assert.equal(await page.evaluate(()=>(window.__matrixSubmits||[]).length),0);
 },{realHost:true,fullFrame:true,matrixAnalysis:true,mobile:width<981});
});

test('matrix toolbar is compact, preserves every display action and clears the real dock in all presets',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 for(const width of [320,360,390,768,1440])await withNative({width,height:900},async page=>{
  const controls=page.getByRole('group',{name:'תצוגת המטריצה',exact:true});
  const before=await identity(page),requests=await page.evaluate(()=>window.__log.filter(m=>m.type==='engine-request').length);
  const more=page.getByRole('button',{name:'עוד אפשרויות תצוגה',exact:true});
  const options=page.getByRole('group',{name:'אפשרויות תצוגת המטריצה',exact:true});
  assert.equal(await more.getAttribute('aria-expanded'),'false');
  assert.equal(await options.isVisible(),false);
  assert.equal(await controls.locator(':scope > button').count(),4);
  const boxes=await controls.locator(':scope > button').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,font:parseFloat(getComputedStyle(el).fontSize)};}));
  assert.ok(boxes.every(b=>Math.abs(b.y-boxes[0].y)<1&&Math.abs(b.width-boxes[0].width)<1&&b.width>=44&&b.height>=44&&b.font>=16),'one equal-width row, readable and touch-sized');
  assert.ok(boxes.slice(1).every(b=>boxes[0].x>b.x),'height is the rightmost action in the RTL row');
  const grow=controls.getByRole('button',{name:'הגדל גובה ב־50%',exact:true});
  assert.equal(await controls.locator(':scope > button').first().getAttribute('aria-label'),'הגדל גובה ב־50%');
  assert.equal(await grow.isVisible(),true,'height is visible without opening More');
  assert.equal(await controls.getByRole('button',{name:'התאם מטריצה למסך',exact:true,includeHidden:true}).count(),1,'fit remains a single action');
  const regularHeight=await stageHeight(page);
  await grow.click();
  assert.ok(Math.abs(await stageHeight(page)-regularHeight*1.5)<=1,'one explicit click enlarges height by exactly 50%');
  assert.equal(await more.getAttribute('aria-expanded'),'false','height does not open the disclosure');
  const restore=controls.getByRole('button',{name:'חזור לגובה הרגיל',exact:true});
  assert.equal(await restore.getAttribute('aria-pressed'),'true');
  await restore.press('Enter');assert.ok(Math.abs(await stageHeight(page)-regularHeight)<=1,'keyboard restores regular height');
  assert.ok((await controls.boundingBox()).height<90,'closed controls are not a wall of buttons');
  await more.click();assert.equal(await more.getAttribute('aria-expanded'),'true');
  for(const name of ['התאם מטריצה למסך','מפת חום','סימון הציר הראשי','אותיות קלאסיות','הדגש פסוק במטריצה','מצב מצלמה'])
   assert.equal(await options.getByRole('button',{name,exact:true}).isVisible(),true,name+' remains available');
  const wasFit=await options.getByRole('button',{name:'התאם מטריצה למסך',exact:true}).getAttribute('aria-pressed');
  await options.getByRole('button',{name:'התאם מטריצה למסך',exact:true}).click();
  await page.waitForFunction(v=>String(!!window.__state.ui.fit)!==v,wasFit);
  await options.getByRole('button',{name:'התאם מטריצה למסך',exact:true}).click();
  await page.waitForFunction(v=>String(!!window.__state.ui.fit)===v,wasFit);
  await options.getByRole('button',{name:'מפת חום',exact:true}).click();await page.waitForFunction(()=>window.__state.ui.heat);
  await options.getByRole('button',{name:'מפת חום',exact:true}).press('Escape');
  assert.equal(await more.getAttribute('aria-expanded'),'false');assert.equal(await more.evaluate(el=>el===document.activeElement),true);
  await more.press('Enter');await options.getByRole('button',{name:'מפת חום',exact:true}).click();await page.waitForFunction(()=>!window.__state.ui.heat);await more.click();
  await page.getByRole('button',{name:'סימון חופשי',exact:true}).click();await page.waitForFunction(()=>window.__state.ui.selMode);
  const indices=await page.evaluate(()=>window.__state.matrix.marks.filter(m=>m.type==='main').slice(0,3).map(m=>m.i));
  for(const index of indices)await page.locator(`[data-els-index="${index}"]`).press('Enter');
  await page.waitForFunction(()=>window.__state.ui.selCells.length===3);
  const selection=page.getByRole('region',{name:'סימון חופשי במטריצה',exact:true});
  assert.ok((await selection.boundingBox()).height<190,'selection stays compact with three letters');
  const help=selection.getByText('?',{exact:true});await help.click();
  await selection.getByText(/פותח חיפוש חדש/).waitFor();await help.click();
  for(const theme of ['light','parchment','dark']){
   await page.evaluate(t=>window.__setThemePreset(t),theme);
   assert.equal(await grow.isVisible(),true);
   assert.equal(await grow.evaluate(el=>getComputedStyle(el).borderTopColor===getComputedStyle(el).backgroundColor),false,'height stays prominent in every theme');
   await selection.evaluate(el=>el.scrollIntoView({block:'end',behavior:'instant'}));
   const overlays=await page.locator('.sod29-command-island,.sod29-feed-chip,.sod29-selection-cue').evaluateAll(nodes=>nodes.filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect().top));
   const mark=await selection.boundingBox();
   assert.ok(mark.y+mark.height<=Math.min(...overlays)-8,`${width}/${theme}: the entire selection clears the dock AND update/selection cues`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   for(const name of ['חפש את הבחירה כציר','נקה סימונים']){
    const target=selection.getByRole('button',{name,exact:true}),b=await target.boundingBox();assert.ok(b.width>=44&&b.height>=44);
    assert.equal(await target.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'control not obscured');
   }
   if(process.env.ELS_TOOLBAR_SCREENSHOTS){mkdirSync(process.env.ELS_TOOLBAR_SCREENSHOTS,{recursive:true});await page.screenshot({path:`${process.env.ELS_TOOLBAR_SCREENSHOTS}/toolbar-${width}-${theme}.png`});}
  }
  assert.deepEqual(await identity(page),before);
  assert.equal(await page.evaluate(()=>window.__log.filter(m=>m.type==='engine-request').length),requests);
  assert.equal(page.__elsDynamicLexiconRequests.length,0);assert.equal(await page.evaluate(()=>(window.__matrixSubmits||[]).length),0);
 },{realHost:true,fullFrame:true,loadGolden:true,mobile:width<981});
});

test('manual letter selection uses canonical UI state, survives profiles, rejects stale controls and never scans',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 for(const width of [320,390,1440])await withNative({width,height:900},async page=>{
  const before=await identity(page), initial=await page.evaluate(()=>window.__state);
  const indices=initial.matrix.marks.filter(m=>m.type==='main').slice(0,3).map(m=>m.i);
  const baseline=await page.evaluate(()=>window.__log.filter(m=>m.type==='engine-request').length);
  const mode=page.getByRole('button',{name:'סימון חופשי',exact:true});
  await mode.click();await page.waitForFunction(()=>window.__state?.ui?.selMode===true);
  for(const index of indices){
   const cell=page.locator(`[data-els-index="${index}"]`);await cell.scrollIntoViewIfNeeded();
   const bounds=await cell.boundingBox();assert.ok(bounds.width>=44&&bounds.height>=44);
   if(width===1440)await cell.press('Enter');else await cell.tap();
   await page.waitForFunction(i=>window.__state.ui.selCells.includes(i),index);
  }
  assert.deepEqual(await page.evaluate(()=>window.__state.ui.selCells),indices);
  assert.equal(await page.evaluate(()=>window.__state.ui.selText),indices.map(i=>letters[i]).join(''));
  assert.equal(await page.locator('.is-manually-marked').count(),3);
  assert.equal(await page.locator('.els29-native-inline-inspection:visible').count(),0,'marking never opens source');
  for(const theme of ['light','parchment','dark']){
   await page.evaluate(t=>window.__setThemePreset(t),theme);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(process.env.ELS_MANUAL_SCREENSHOTS){mkdirSync(process.env.ELS_MANUAL_SCREENSHOTS,{recursive:true});await page.getByRole('region',{name:'סימון חופשי במטריצה'}).scrollIntoViewIfNeeded();await page.screenshot({path:`${process.env.ELS_MANUAL_SCREENSHOTS}/selection-${width}-${theme}.png`});}
  }
  await page.evaluate(()=>{window.__fixtureResearchProfile=false;window.__forceParentRender();});
  assert.equal(await mode.getAttribute('aria-pressed'),'true');
  await mode.click();await page.waitForFunction(()=>!window.__state.ui.selMode);
  assert.equal(await page.locator('.is-manually-marked').count(),3,'turning the tool off keeps marks');
  await page.evaluate(()=>{window.__fixtureResearchProfile=true;window.__forceParentRender();});
  assert.deepEqual(await page.evaluate(()=>window.__state.ui.selCells),indices);
  await mode.click();await page.waitForFunction(()=>window.__state.ui.selMode);
  await page.locator(`[data-els-index="${indices[1]}"]`).press('Space');
  await page.waitForFunction(()=>window.__state.ui.selCells.length===2);
  const post=async(action,value)=>page.locator('iframe').evaluate((frame,payload)=>frame.contentWindow.postMessage({source:'sod-host',type:'native-control',...payload},location.origin),{action,value});
  for(const value of [{axisHitId:'stale',scope:initial.scope,index:indices[1]}, {axisHitId:initial.axis.hitId,scope:'wrong',index:indices[1]}, {axisHitId:initial.axis.hitId,scope:initial.scope,index:-1}, {axisHitId:initial.axis.hitId,scope:initial.scope,index:1.5}])await post('selection-toggle',value);
  await page.getByRole('button',{name:'הגדל מטריצה',exact:true}).click();
  await page.waitForFunction(z=>window.__state.ui.zoom!==z,initial.ui.zoom);
  assert.deepEqual(await page.evaluate(()=>window.__state.ui.selCells),[indices[0],indices[2]]);
  assert.deepEqual(await identity(page),before,'marks, zoom and profiles do not change evidence');
  assert.equal(await page.evaluate(()=>window.__log.filter(m=>m.type==='engine-request').length),baseline);
  assert.equal(page.__elsDynamicLexiconRequests.length,0);
  assert.equal(await page.evaluate(()=>(window.__matrixSubmits||[]).length),0);
  await page.getByRole('button',{name:'נקה סימונים',exact:true}).click();
  await page.waitForFunction(()=>window.__state.ui.selCells.length===0);
  assert.equal(await page.locator('.is-manually-marked').count(),0);
  assert.equal(await page.getByRole('button',{name:'חפש את הבחירה כציר',exact:true}).isDisabled(),true);
  const visible=await page.locator('.els29-native-cell[data-els-index]').evaluateAll(nodes=>nodes.filter(n=>n.textContent.trim()).slice(0,70).map(n=>Number(n.dataset.elsIndex)));
  for(const index of visible)await post('selection-toggle',{axisHitId:initial.axis.hitId,scope:initial.scope,index});
  await page.waitForFunction(()=>window.__state.ui.selCells.length===64);
  assert.equal(await page.evaluate(()=>window.__state.ui.selText.length),64);
  await page.getByRole('button',{name:'נקה סימונים',exact:true}).click();await page.waitForFunction(()=>!window.__state.ui.selCells.length);
  // The explicit search is a normal search, not a claim that an arbitrary manual path is ELS.
  for(const index of indices.slice(0,2)){await page.locator(`[data-els-index="${index}"]`).press('Enter');await page.waitForFunction(i=>window.__state.ui.selCells.includes(i),index);}
  const term=await page.evaluate(()=>window.__state.ui.selText);
  await page.getByRole('button',{name:'חפש את הבחירה כציר',exact:true}).click();
  await page.waitForFunction(()=>['done','empty'].includes(window.__operation?.status),null,{timeout:60000});
  assert.equal(await page.evaluate(()=>window.__state.term),term);
  assert.equal(await page.locator('.is-manually-marked').count(),0);
 },{realHost:true,loadGolden:true,matrixAnalysis:true,mobile:width<1000});
});

test('letter occurrence actions choose the same verified scan target and open its exact matrix',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 await withNative({width:1440,height:1000},async page=>{
  await addSecondary(page,'התורה');
  const state=await page.evaluate(()=>window.__state),finding=state.findings.find(f=>f.t==='התורה'),hit=finding.hits.find(h=>h.verified&&h.shown);
  assert.ok(hit);
  const index=state.matrix.marks.find(m=>m.type==='finding')?.i;assert.ok(Number.isInteger(index));
  await page.locator(`[data-els-index="${index}"]`).click();
  const choices=page.getByLabel('צירים שעוברים באות',{exact:true});await choices.waitFor();
  const chosen=await page.evaluate(()=>window.__lens.occurrences.find(o=>!o.primary));assert.ok(chosen);
  await choices.getByRole('button',{name:'בחר כציר לסריקה',exact:true}).last().click();
  assert.equal(await page.getByRole('button',{name:`בחר ציר לסריקה: ${chosen.term}`,exact:true}).getAttribute('aria-pressed'),'true');
  await page.locator(`[data-els-index="${index}"]`).click();await choices.waitFor();
  await choices.getByRole('button',{name:'פתח מטריצה של המופע',exact:true}).last().click();
  await page.waitForFunction(id=>window.__state?.axis?.hitId===id,chosen.hitId,{timeout:60000});
  assert.equal(await page.evaluate(()=>window.__state.term),chosen.term);
  assert.equal(await page.evaluate(()=>window.__state.verification.state),'MATCH');
  const promoted=await page.evaluate(()=>window.__hostLog.filter(m=>m.type==='load-matrix').at(-1).item);
  assert.equal(promoted.journey,true);
  assert.deepEqual(promoted.words.find(w=>w.t===state.term).sh,[state.axis.hitId],'carry the exact old anchor through the existing Journey contract');
  const after=await page.evaluate(()=>window.__state),carried=after.findings.find(f=>f.t===state.term);
  assert.ok(carried,'previous term remains in the findings list');
  const b=after.geometry;
  assert.ok(golden.positions.some(i=>Math.floor(i/b.S)<b.r0||Math.floor(i/b.S)>b.r1||i%b.S<b.c0||i%b.S>=b.c0+b.cw),'fixture: old axis lies partly outside the new-width window');
  assert.equal(carried.shown.includes(state.axis.hitId),false,'never pretend an out-of-window old axis is visible');
  assert.equal(await page.locator('iframe').count(),1);
  assert.equal(await page.evaluate(()=>window.__state.ui.selCells.length),0);
  assert.equal(await page.evaluate(()=>(window.__matrixSubmits||[]).length),0);
 },{realHost:true,loadGolden:true,matrixAnalysis:true});
});

test('matrix share: explicit, private-safe and exact canonical replay across all profiles',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 for(const profile of [{researchProfile:false},{researchProfile:true},{researchProfile:true,guided:true}])
  await withNative({width:320,height:900},async page=>{
   if(profile.guided) await page.getByRole('button',{name:'פתח מטריצה מדויקת'}).click();
   const before=await identity(page),share=page.locator('.els29-matrix-share'),trigger=page.getByRole('button',{name:'שתף מטריצה',exact:true});
   assert.equal(await share.count(),0);assert.equal(await trigger.getAttribute('aria-expanded'),'false');
   await page.evaluate(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copiedMatrix=value;}}});
    Object.defineProperty(navigator,'share',{configurable:true,value:async value=>{window.__sharedMatrix=value;}});
   });
   await trigger.click();
   const url=await share.getByRole('textbox',{name:'קישור למטריצה'}).inputValue();
   const restored=readElsMatrixShare(new URL(url).hash).loadItem;
   assert.ok(restored);assert.equal(restored.hitId,before.axis.hitId);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await share.getByRole('button',{name:'העתק קישור',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.__copiedMatrix),url);
   await share.getByRole('button',{name:'שתף דרך המכשיר',exact:true}).click();
   assert.equal(await page.evaluate(()=>window.__sharedMatrix.url),url);
   assert.equal(await page.evaluate(()=>window.__saveCalls?.length||0),0,'no record save or publication');
   assert.equal(await page.evaluate(()=>(window.__matrixSubmits||[]).length),0,'no AI submission');
   assert.equal(page.__elsDynamicLexiconRequests.length,0);
   const send=item=>page.locator('iframe').evaluate((frame,item)=>frame.contentWindow.postMessage({source:'sod-host',type:'load-matrix',item},location.origin),item);
   await send({...restored,start:restored.start+1,hitId:`${restored.skip}_${restored.dir}_${restored.start+1}`});
   await page.waitForFunction(()=>window.__log.some(m=>m.type==='load-error'));
   await share.getByText('בחרו מופע מאומת והמתינו לסיום החיפוש כדי לשתף את המטריצה.',{exact:true}).waitFor();
   await send(restored);
   await page.waitForFunction(hitId=>window.__state?.status==='ok'&&window.__state?.axis?.hitId===hitId,restored.hitId);
   assert.equal(await page.evaluate(()=>window.__state.verification.state),'MATCH','shared coordinates must reverify');
   assert.deepEqual((await identity(page)).axis,before.axis);
   assert.equal(await page.evaluate(()=>window.__saveCalls?.length||0),0);
  },{realHost:true,loadGolden:true,matrixAnalysis:true,...profile});
});

test('Research has one regular/cross/advanced search surface with preserved drafts and no automatic work',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  for(const width of [320,390,1440])await withNative({width,height:900},async page=>{
    const ai=[];page.on('request',request=>{if(/ai-analyze/.test(request.url()))ai.push(request.url());});
    const box=page.locator('#els29-query');
    assert.equal(await box.getByRole('button',{name:'חיפוש רגיל',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await box.getByLabel('מונח לחיפוש מתקדם').isVisible(),false);
    await box.getByRole('textbox',{name:'מונח',exact:true}).fill('יום משיח בא');
    const count=await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='native-search').length);
    const frame=await page.locator('iframe').elementHandle();
    await box.getByRole('button',{name:'חיפוש מתקדם',exact:true}).click();
    await box.getByRole('button',{name:'השתמש בביטוי שהקלדתי: יום משיח בא',exact:true}).click();
    assert.equal(await box.getByLabel('מונח לחיפוש מתקדם').inputValue(),'יום משיח בא');
    await box.getByLabel('מונח לחיפוש מתקדם').fill('סוד החשמל');
    assert.equal(await box.locator('form form').count(),0);
    assert.equal(await box.getByRole('button',{name:'חפש',exact:true}).isVisible(),false);
    assert.match(await box.innerText(),/בוחרים ביטוי והיקף בדיקה/);
    assert.match(await box.getByLabel('מה ייבדק בלחיצה').innerText(),/2–80/);
    assert.equal(await box.locator('button[type=submit]:visible').count(),1);
    for(const theme of ['light','parchment','dark']){
      await page.evaluate(theme=>window.__setThemePreset(theme),theme);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}:${theme}`);
      assert.ok((await box.locator('button:visible').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height))).every(h=>h>=44));
      if(process.env.ELS_SEARCH_ORDER_SCREENSHOTS){mkdirSync(process.env.ELS_SEARCH_ORDER_SCREENSHOTS,{recursive:true});await box.scrollIntoViewIfNeeded();await page.screenshot({path:`${process.env.ELS_SEARCH_ORDER_SCREENSHOTS}/advanced-${width}-${theme}.png`});}
    }
    await box.getByRole('button',{name:'חיפוש רגיל',exact:true}).click();
    assert.equal(await box.getByRole('textbox',{name:'מונח',exact:true}).inputValue(),'יום משיח בא');
    await box.getByRole('button',{name:'חיפוש מתקדם',exact:true}).click();
    assert.equal(await box.getByLabel('מונח לחיפוש מתקדם').inputValue(),'סוד החשמל');
    await page.evaluate(()=>{window.__fixtureResearchProfile=false;window.__forceParentRender();});
    assert.equal(await box.getByRole('button',{name:'חיפוש מתקדם',exact:true}).count(),0);
    assert.equal(await box.getByLabel('מונח לחיפוש מתקדם').isVisible(),false);
    assert.equal(await box.getByRole('button',{name:'כל הכלים',exact:true}).isVisible(),true);
    await box.getByRole('button',{name:'כל הכלים',exact:true}).click();
    await page.evaluate(()=>{window.__fixtureResearchProfile=true;window.__forceParentRender();});
    assert.equal(await page.locator('.els29-classic-fallback.is-open').count(),0,'Research cannot remain trapped in the full Classic tool');
    assert.equal(await frame.evaluate(node=>node===document.querySelector('iframe')),true,'one unchanged canonical engine');
    assert.equal(await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='native-search').length),count);
    assert.equal(page.__elsDynamicLexiconRequests.length,0);assert.deepEqual(ai,[]);
  },{realHost:true});
 });

test('unchecked third term preserves pairs, checked third requires three, and verified optional matches reach the matrix',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:240000},async()=>{
  await withNative({width:320,height:900},async page=>{
    const form=page.locator('#els29-query');await form.getByRole('button',{name:'הצלבה בין צירים',exact:true}).click();
    await form.getByRole('textbox',{name:'מונח ראשון'}).fill('תורהקדשה');
    await form.getByRole('textbox',{name:'מונח שני'}).fill('בחשרתע');
    const third=form.getByRole('textbox',{name:'מונח שלישי',exact:true}),required=form.getByRole('checkbox',{name:'חובה למצוא גם את המונח השלישי'});
    assert.equal(await required.isChecked(),false);
    await third.fill('תתתתתתתתתתתת');
    const search=async()=>{const before=await page.evaluate(()=>window.__operation?.requestId||0);await form.getByRole('button',{name:'חפש הצלבה'}).click();
      await page.waitForFunction(id=>window.__operation?.requestId>id&&['done','empty','error'].includes(window.__operation.status),before,{timeout:90000});
      return page.evaluate(()=>({op:window.__operation,state:window.__state}));};
    const pair=await search();assert.equal(pair.op.status,'done',JSON.stringify(pair.op));
    assert.equal(pair.op.progress.thirdRequired,false);
    assert.ok(pair.state.search.results.items.some(x=>x.available&&x.terms.length===1&&x.optionalThird.status==='NOT_FOUND_IN_WINDOW'));
    assert.equal(await page.evaluate(()=>window.__log.some(x=>x.type==='engine-request'&&x.payload?.term==='תתתתתתתתתתתת')),false,'no independent scan of optional third');
    await required.check();const strict=await search();assert.equal(strict.op.status,'empty');assert.equal(strict.op.progress.thirdRequired,true);
    await third.fill('כויזלת');await required.uncheck();const optional=await search();assert.equal(optional.op.status,'done');
    const found=optional.state.search.results.items.find(x=>x.available&&x.optionalThird?.status==='VERIFIED');assert.ok(found);
    await page.getByRole('button',{name:`פתח מפגש ${found.index+1}`,exact:true}).click();
    await page.waitForFunction(()=>window.__state?.findings?.some(x=>x.t==='כויזלת'&&x.shown?.length));
    assert.ok(await page.getByText('כויזלת: נמצא ואומת גם המונח השלישי',{exact:true}).count());
    await form.getByRole('textbox',{name:'מונח ראשון'}).fill('משיח טבת');
    await form.getByRole('textbox',{name:'מונח שני'}).fill('ישלח מלאכו');
    await third.fill('תתתתתתתתתתתת');
    const sourcePair=await search();assert.equal(sourcePair.op.status,'done',JSON.stringify(sourcePair.op));
    assert.ok(sourcePair.state.search.results.items.some(x=>x.available&&x.sourceSequence&&x.optionalThird.status==='NOT_FOUND_IN_WINDOW'),'optional third must retain literal-source pairs too');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  },{realHost:true,loadGolden:false});
 });

test('Research pair preparation is explicit, uses canonical crossed search and leaves Classic clean',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  for(const width of [320,390,1440])await withNative({width,height:900},async page=>{
    const ai=[];page.on('request',request=>{if(/ai-analyze/.test(request.url()))ai.push(request.url());});
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('קולומביה');
    await page.getByText('הכנת זוגות לחיפוש',{exact:true}).click();
    const planner=page.getByRole('region',{name:'הכנת זוגות לחיפוש',exact:true});
    await planner.getByRole('textbox').fill('ספינת\nיכל אש\nספינת');
    const before=await page.evaluate(()=>window.__hostLog?.filter(x=>x.type==='native-search').length||0);
    await planner.getByRole('button',{name:'הכן זוגות לחיפוש',exact:true}).click();
    assert.equal(await planner.getByRole('radio').count(),2);
    assert.equal(await page.evaluate(()=>window.__hostLog?.filter(x=>x.type==='native-search').length||0),before);
    assert.equal(page.__elsDynamicLexiconRequests.length,0);
    // Changing the primary makes the old plan unusable rather than silently running it.
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('שלום');
    assert.equal(await planner.getByRole('button',{name:'חפש את הזוג שנבחר',exact:true}).count(),0);
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('קולומביה');
    await page.getByRole('button',{name:'הצלבה בין צירים',exact:true}).click();
    await page.getByLabel('מרחק מרבי מהציר בהצלבה',{exact:true}).fill('7');
    await page.getByLabel('מרווח מרבי בין אותיות הממצא בהצלבה',{exact:true}).fill('2');
    await planner.getByRole('button',{name:'הכן זוגות לחיפוש',exact:true}).click();
    for(const theme of ['light','parchment','dark']){
      await page.evaluate(theme=>window.__setThemePreset(theme),theme);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}:${theme}`);
      assert.ok((await planner.locator('button:visible,label.els29-planner-choice').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height))).every(h=>h>=44));
      if(process.env.ELS_PLANNER_SCREENSHOTS)await page.screenshot({path:`${process.env.ELS_PLANNER_SCREENSHOTS}/pairs-${width}-${theme}.png`});
    }
    await planner.getByRole('button',{name:'חפש את הזוג שנבחר',exact:true}).click();
    await page.waitForFunction(count=>(window.__hostLog?.filter(x=>x.type==='native-search').length||0)>count,before);
    const calls=await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='native-search'));
    assert.equal(calls.length,before+1);assert.equal(calls.at(-1).request.kind,'cross');
    assert.equal(calls.at(-1).request.axis,'קולומביה');assert.equal(calls.at(-1).request.term,'ספינת');
    assert.equal(calls.at(-1).request.radius,7);assert.equal(calls.at(-1).request.maxLetterGap,2);
    await page.evaluate(()=>{window.__fixtureResearchProfile=false;window.__forceParentRender();});
    assert.equal(await page.getByText('הכנת זוגות לחיפוש',{exact:true}).count(),0);
    assert.equal(page.__elsDynamicLexiconRequests.length,0);assert.deepEqual(ai,[]);
  },{realHost:true});
 });

test('Research occurrence inspection uses exact loaded axes, is explicit and preserves the matrix',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:320,height:900},async page=>{
    const ai=[];page.on('request',request=>{if(/ai-analyze/.test(request.url()))ai.push(request.url());});
    await activate(page,'תוצאות');
    await page.getByText('בחירת מופעים להעמקה · עד שלושה',{exact:true}).click();
    const planner=page.getByRole('region',{name:'בחירת מופעים להעמקה',exact:true});
    await planner.getByRole('checkbox').first().check();
    assert.equal(page.__elsDynamicLexiconRequests.length,0,'no heavy load on opening or selection');
    const before=await page.evaluate(()=>window.__state);
    await planner.getByRole('button',{name:'בדוק את המופעים שנבחרו',exact:true}).click();
    await planner.getByText(/הבדיקה המבוקשת הסתיימה/).waitFor({timeout:60000});
    const lens=await page.evaluate(()=>window.__lens);
    assert.equal(lens.ok,true);assert.equal(lens.target.hitId,before.search.occurrences.items[0].hitId);
    assert.equal(page.__elsDynamicLexiconRequests.length,1);
    assert.deepEqual((await page.evaluate(()=>window.__state)).axis,before.axis);
    assert.deepEqual((await page.evaluate(()=>window.__state)).findings,before.findings);
    for(const theme of ['light','parchment','dark']){
      await page.evaluate(theme=>window.__setThemePreset(theme),theme);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,theme);
      if(process.env.ELS_PLANNER_SCREENSHOTS)await page.screenshot({path:`${process.env.ELS_PLANNER_SCREENSHOTS}/inspection-320-${theme}.png`});
    }
    await planner.getByRole('button',{name:/פתח מופע .* להעמקה/}).first().click();
    assert.equal(await page.evaluate(()=>window.__state.axis.hitId),lens.target.hitId);
    assert.deepEqual(ai,[]);
  },{realHost:true});
 });

test('Research occurrence queue caps selection, cancels late work and resets on a new results page',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:390,height:900},async page=>{
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('יהוה');await activate(page,'חפש');
    await page.waitForFunction(()=>window.__operation?.status==='done'&&window.__state.search.occurrences.items.length===80,null,{timeout:60000});
    await page.getByText('בחירת מופעים להעמקה · עד שלושה',{exact:true}).click();
    const planner=page.getByRole('region',{name:'בחירת מופעים להעמקה',exact:true});
    for(let i=0;i<3;i++)await planner.getByRole('checkbox').nth(i).check();
    assert.equal(await planner.getByRole('checkbox').nth(3).isDisabled(),true);
    let release,intercepted;
    const held=new Promise(resolve=>{release=resolve;});const requested=new Promise(resolve=>{intercepted=resolve;});
    await page.route('**/els-dynamic-lexicon-v1.gz64.txt*',async route=>{intercepted();await held;await route.continue();});
    await planner.getByRole('button',{name:'בדוק את המופעים שנבחרו',exact:true}).click();await requested;
    await planner.getByRole('button',{name:'בטל פעולה',exact:true}).click();
    await page.waitForFunction(()=>window.__hostLog.some(x=>x.type==='request-lens'&&x.target?.researchOccurrenceInspection&&x.target.cancel));
    release();
    await planner.getByText(/הבדיקה הופסקה/).waitFor();
    assert.equal(await planner.locator('article').count(),0);
    await page.unroute('**/els-dynamic-lexicon-v1.gz64.txt*');
    await planner.getByRole('button',{name:'בדוק את המופעים שנבחרו',exact:true}).click();
    await planner.getByText(/הבדיקה המבוקשת הסתיימה/).waitFor({timeout:60000});
    assert.equal(await planner.locator('article').count(),3);
    const requests=await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='request-lens'&&x.target?.researchOccurrenceInspection&&!x.target.cancel));
    assert.equal(requests.length,4,'one cancelled occurrence plus exactly three explicit inspections');
    assert.equal(new Set(requests.slice(1).map(x=>x.target.hitId)).size,3);
    await page.getByRole('button',{name:'עמוד הבא',exact:true}).click();
    await page.waitForFunction(()=>window.__state.search.occurrences.page===1);
    assert.equal(await planner.locator('article').count(),0,'old reports cannot be reused for a new page');
    assert.equal(await planner.getByRole('checkbox',{checked:true}).count(),0);
    assert.equal(await planner.getByRole('button',{name:'בדוק את המופעים שנבחרו',exact:true}).isDisabled(),true);
    assert.equal(await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='request-lens'&&x.target?.researchOccurrenceInspection&&!x.target.cancel).length),4);
  },{realHost:true});
 });

test('CI: native UI browser regression must not be skipped when required', () => {
  if (process.env.ELS_REQUIRE_EXECUTABLE) {
    assert.ok(canRun, 'ELS_REQUIRE_EXECUTABLE=1 requires Playwright, Vite/plugin-react and Chromium');
  }
});

test('background return restores verified manual findings and view through the existing engine load',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:90000},async()=>{
  await withNative({width:390,height:844},async page=>{
    await addSecondary(page,'תורה');
    for(const [action,value] of [['zoom-set',1.6],['heat-toggle'],['niqqud-toggle'],['axis-visibility']]){
      await page.locator('iframe').evaluate((el,payload)=>el.contentWindow.postMessage({source:'sod-host',type:'native-control',action:payload[0],value:payload[1]},location.origin),[action,value]);
    }
    await page.waitForFunction(()=>window.__state?.ui?.zoom===1.6&&window.__state.ui.heat&&window.__state.ui.niqqud&&window.__state.ui.hideMain);
    const before=await page.evaluate(()=>window.__state),snapshot=captureElsResearchReturn(before);
    assert.ok(snapshot);
    const origin={term:before.term,corpus:before.scope,corpusId:before.verification.corpus_id,start:before.axis.start,skip:before.axis.skip,dir:before.axis.direction==='back'?-1:1};
    await page.evaluate(item=>window.__loadResearch({...item,words:[],researchNonce:'different'}),ELS_GOLDENS[2]);
    await page.waitForFunction(()=>window.__state?.term==='אליהו'&&window.__state?.status==='ok');
    const load=elsResearchReturnLoad({origin,returnSnapshot:snapshot});
    await page.evaluate(item=>window.__loadResearch({...item,researchNonce:'restore'}),load);
    await page.waitForFunction(()=>window.__state?.term==='תורהקדשה'&&window.__state?.status==='ok'&&window.__state.findings?.some(f=>f.t==='תורה'&&f.shown?.length));
    const after=await page.evaluate(()=>window.__state);
    assert.deepEqual(after.axis,before.axis);
    for(const key of ['zoom','fit','heat','niqqud','hideMain','ctxR','showN','findingRadius'])assert.equal(after.ui[key],before.ui[key],key);
    assert.deepEqual(after.geometry,before.geometry);
    assert.deepEqual(after.findings.map(f=>({t:f.t,color:f.color,shown:f.shown})),before.findings.map(f=>({t:f.t,color:f.color,shown:f.shown})));
  },{realHost:true});
});

test('research structures are explicit, preserve Classic and compare exact snapshots without lexicon or AI',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  for(const width of [320,390,1440])await withNative({width,height:900},async page=>{
    const heavy=[];page.on('request',req=>{if(/ai-analyze|els-dynamic-lexicon|tanakh-verses/.test(req.url()))heavy.push(req.url());});
    await page.evaluate(()=>{window.__fixtureResearchProfile=false;window.__forceParentRender();});
    assert.equal(await page.getByText('גילוי וקשרים במטריצה · ללא AI',{exact:true}).isVisible(),false);
    await page.evaluate(()=>{window.__fixtureResearchProfile=true;window.__forceParentRender();});
    await addSecondary(page,'תורה');
    const before=await page.evaluate(()=>window.__state);
    await page.getByText('גילוי וקשרים במטריצה · ללא AI',{exact:true}).click();
    await page.getByText('בדיקת הסימונים והשוואת מופעים',{exact:true}).click();
    const panel=page.getByRole('region',{name:'מבנים והשוואת מופעים',exact:true});
    await panel.waitFor();
    assert.equal(await panel.getByLabel('תוצאת בדיקת המבנים').count(),0);
    await panel.getByRole('button',{name:'בדוק מבנים בממצאים שנבחרו',exact:true}).click();
    await panel.getByLabel('תוצאת בדיקת המבנים').waitFor();
    await panel.getByRole('button',{name:'הוסף את המופע להשוואה',exact:true}).click();
    await page.evaluate(item=>window.__loadResearch({...item,words:[],researchNonce:'structure-second'}),ELS_GOLDENS[2]);
    await page.waitForFunction(()=>window.__state?.term==='אליהו'&&window.__state.status==='ok');
    await panel.getByRole('button',{name:'הוסף את המופע להשוואה',exact:true}).click();
    assert.equal(await panel.getByRole('button',{name:/פתח תמונת מצב/}).count(),2);
    await page.evaluate(()=>{window.__fixtureResearchProfile=false;window.__forceParentRender();});
    assert.equal(await panel.isVisible(),false);
    await page.evaluate(()=>{window.__fixtureResearchProfile=true;window.__forceParentRender();});
    await panel.getByRole('button',{name:'פתח תמונת מצב 1',exact:true}).click();
    await page.waitForFunction(()=>window.__state?.term==='תורהקדשה'&&window.__state.status==='ok'&&window.__state.findings?.some(f=>f.t==='תורה'&&f.shown.length));
    assert.deepEqual((await page.evaluate(()=>window.__state)).axis,before.axis);
    for(const theme of ['light','parchment','dark']){
      await page.evaluate(theme=>window.__setThemePreset(theme),theme);
      const size=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
      assert.ok(size.s<=size.w+1,JSON.stringify({width,theme,size}));
      const targets=await panel.locator('button:visible').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height));
      assert.ok(targets.every(h=>h>=44));
      assert.ok(await panel.locator('p').evaluateAll(nodes=>nodes.every(n=>parseFloat(getComputedStyle(n).fontSize)>=18)));
      assert.ok(await panel.locator('button').evaluateAll(nodes=>nodes.every(n=>parseFloat(getComputedStyle(n).fontSize)>=16)));
      if(process.env.ELS_STRUCTURE_SCREENSHOTS){await panel.scrollIntoViewIfNeeded();await page.screenshot({path:`${process.env.ELS_STRUCTURE_SCREENSHOTS}/structures-${width}-${theme}.png`});}
    }
    await page.evaluate(()=>{window.__fixtureTier='anon';window.__forceParentRender();});
    await page.waitForFunction(()=>!document.querySelector('[aria-label="תוצאת בדיקת המבנים"]'));
    assert.equal(await panel.getByRole('button',{name:/פתח תמונת מצב/}).count(),0,'principal change clears temporary comparisons');
    assert.deepEqual(heavy,[]);
  },{realHost:true});
 });

test('discovery plans and source-direction filtering stay explicit on the actual canonical scan',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:390,height:900},async page=>{
    await page.getByText('גילוי וקשרים במטריצה · ללא AI',{exact:true}).click();
    const panel=page.getByRole('region',{name:'גילוי וקשרים במטריצה',exact:true});
    await panel.getByText('תכנית סריקה · מהיר, רחב או עמוק',{exact:true}).click();
    await panel.getByRole('button',{name:'מהיר',exact:true}).click();
    assert.equal(await panel.getByLabel('מינימום אותיות בגילוי').inputValue(),'4');
    assert.equal(await panel.getByLabel('מרחק מהציר בגילוי').inputValue(),'12');
    assert.equal(page.__elsDynamicLexiconRequests.length,0,'settings never load dictionary');
    await panel.getByRole('button',{name:'גלה מילים ומבנים',exact:true}).click();
    await panel.getByLabel('תוצאות הסריקה המילונית').waitFor({timeout:30000});
    const scan=await page.evaluate(()=>window.__lens);
    assert.equal(scan.plan.minLength,4);assert.equal(scan.plan.maxLength,8);assert.equal(scan.plan.maxDistance,12);
    assert.ok(scan.items.some(item=>item.term.length===4),'requested short tokens are reachable');
    assert.ok(scan.items.every(item=>item.distance<=12));
    const starts=await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='request-lens'&&x.lens==='matrix-lexicon').length);
    await panel.getByLabel('סוג התוצאות',{exact:true}).selectOption('source');
    const countBefore=await panel.locator('[data-lexicon-hit]').count();assert.ok(countBefore>0);
    await panel.getByLabel('הסתר טקסט רגיל קדימה — דילוג 1',{exact:true}).check();
    assert.equal(await panel.locator('[data-lexicon-hit^="1_1_"]').count(),0);
    assert.equal(await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='request-lens'&&x.lens==='matrix-lexicon').length),starts);
    assert.deepEqual(await page.evaluate(()=>window.__lens.items),scan.items,'raw result remains intact');
    await panel.getByLabel('הסתר טקסט רגיל קדימה — דילוג 1',{exact:true}).uncheck();
    assert.equal(await panel.locator('[data-lexicon-hit]').count(),countBefore);
    await panel.getByRole('button',{name:'הרחב עוד טבעת · סרוק מחדש עד 30 תאים',exact:true}).click();
    await page.waitForFunction(()=>window.__lens?.ok&&!window.__lens.pending&&window.__lens.plan?.maxDistance===30);
    assert.equal(page.__elsDynamicLexiconRequests.length,1,'explicit rerun reuses the same fingerprinted lexicon');
    for(const width of [320,390,1440])for(const theme of ['light','parchment','dark']) {
      await page.setViewportSize({width,height:900});await page.evaluate(theme=>window.__setThemePreset(theme),theme);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}/${theme}`);
      assert.ok(await panel.locator('button:visible,select:visible').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44)));
      if(process.env.ELS_SCREENSHOT_DIR){mkdirSync(process.env.ELS_SCREENSHOT_DIR,{recursive:true});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`discovery-plan-${width}-${theme}.png`)});}
    }
    assert.equal(await page.evaluate(()=>(window.__matrixSubmits||[]).length),0);
  },{realHost:true,loadGolden:true});
 });

test('Research language wizard reuses the canonical reader and admits exact phrases without auto work',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:390,height:900},async page=>{
    const ai=[];page.on('request',request=>{if(/ai-analyze/.test(request.url()))ai.push(request.url());});
    await page.evaluate(()=>{window.__fixtureResearchProfile=true;window.__forceParentRender();});
    await page.getByText('גילוי וקשרים במטריצה · ללא AI',{exact:true}).click();
    const panel=page.getByRole('region',{name:'גילוי וקשרים במטריצה',exact:true});
    await panel.getByLabel('מסלול הגילוי').selectOption('language');
    assert.equal(page.__elsDynamicLexiconRequests.length,0,'choice/opening is not a scan');
    assert.equal(await panel.getByLabel('תוצאות הסריקה המילונית').count(),0);
    const before=await page.evaluate(()=>window.__state);
    await panel.getByRole('button',{name:'בדוק ביטויים וחלוקת רצפים',exact:true}).evaluate(button=>{button.click();button.click();});
    await panel.getByLabel('תוצאות הסריקה המילונית').waitFor({timeout:30000});
    const scan=await page.evaluate(()=>window.__lens);
    assert.equal(scan.plan.mode,'language');assert.equal(scan.coverage.complete,false);assert.equal(scan.modelCalls,0);
    assert.equal(scan.languageInspection.contract,'els_matrix_language_inspection_v1');
    assert.equal(page.__elsDynamicLexiconRequests.length,1);
    const requests=await page.evaluate(()=>window.__hostLog.filter(m=>m.type==='request-lens'&&m.lens==='matrix-lexicon').length);
    assert.equal(requests,1,'one existing operation even after double click');
    assert.deepEqual((await page.evaluate(()=>window.__state)).findings,before.findings);
    const candidates=scan.items.filter(item=>item.kind==='els'),phrase=candidates.slice(0,20).find(item=>item.language.tokens.length===2);
    assert.ok(phrase,'actual bounded reader returns an exact two-token proposal');
    const row=panel.locator(`[data-lexicon-hit="${phrase.hitId}"]`).filter({has:page.getByRole('button',{name:`בדוק והוסף ${phrase.label}`,exact:true})});
    await row.getByText('האותיות והחלוקה המוצעת',{exact:true}).click();
    assert.match(await row.innerText(),new RegExp(phrase.term));
    await row.getByRole('button',{name:`בדוק והוסף ${phrase.label}`,exact:true}).click();
    await page.waitForFunction(item=>window.__state?.status==='ok'&&window.__state.findings?.some(f=>f.t===item.term&&f.hits.some(h=>h.hitId===item.hitId&&h.selected&&h.verified)),phrase,{timeout:30000});
    assert.deepEqual((await page.evaluate(()=>window.__state)).axis,before.axis);
    assert.equal((await page.evaluate(()=>window.__state)).verification.state,'MATCH');
    await panel.getByLabel('הסתר טקסט רגיל קדימה — דילוג 1',{exact:true}).check();
    await panel.getByLabel('סוג התוצאות',{exact:true}).selectOption('source');
    assert.equal(await panel.locator('[data-lexicon-hit^="1_1_"]').count(),0);
    assert.deepEqual(await page.evaluate(()=>window.__lens.items),scan.items);
    await panel.getByLabel('סוג התוצאות',{exact:true}).selectOption('els');
    await panel.getByText('מתקדם · קווים גולמיים והשערות חלוקה',{exact:true}).click();
    await panel.getByText('הקווים שנבדקו',{exact:true}).click();
    for(const width of [320,390,1440])for(const theme of ['light','parchment','dark']){
      await page.setViewportSize({width,height:900});await page.evaluate(theme=>window.__setThemePreset(theme),theme);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}/${theme}`);
      assert.ok(await panel.locator('button:visible,select:visible,summary:visible').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44)));
      if(process.env.ELS_SCREENSHOT_DIR){mkdirSync(process.env.ELS_SCREENSHOT_DIR,{recursive:true});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`language-${width}-${theme}.png`)});}
    }
    await page.evaluate(()=>{window.__fixtureResearchProfile=false;window.__forceParentRender();});
    assert.equal(await panel.isVisible(),false,'Classic stays clean');
    await page.evaluate(()=>{window.__fixtureResearchProfile=true;window.__forceParentRender();});
    assert.equal(await panel.getByLabel('מסלול הגילוי').inputValue(),'language');
    assert.equal(await page.evaluate(()=>window.__hostLog.filter(m=>m.type==='request-lens'&&m.lens==='matrix-lexicon').length),requests,'profile round trip never rescans');
    await page.evaluate(item=>window.__loadResearch({...item,words:[],researchNonce:'language-new-axis'}),ELS_GOLDENS[2]);
    await page.waitForFunction(()=>window.__state?.term==='אליהו'&&window.__state.status==='ok');
    assert.ok(await panel.getByRole('button',{name:/בדוק והוסף/}).first().isDisabled(),'previous-axis candidates cannot leak into new matrix');
    assert.deepEqual(ai,[]);assert.equal(await page.evaluate(()=>(window.__matrixSubmits||[]).length),0);
  },{realHost:true});
 });

test('explicit Research lexicon is lazy, exact, cancellable and responsive without AI',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  for(const width of [320,390,1440])await withNative({width,height:900},async page=>{
    const ai=[];page.on('request',req=>{if(/ai-analyze/.test(req.url()))ai.push(req.url());});
    assert.equal(page.__elsDynamicLexiconRequests.length,0);
    await page.evaluate(()=>{window.__fixtureResearchProfile=true;window.__forceParentRender();});
    await page.getByText('גילוי וקשרים במטריצה · ללא AI',{exact:true}).click();
    const panel=page.getByRole('region',{name:'גילוי וקשרים במטריצה',exact:true});await panel.waitFor();
    assert.equal(page.__elsDynamicLexiconRequests.length,0,'opening does not fetch lexicon');
    const before=await page.evaluate(()=>window.__state);
    await panel.getByRole('button',{name:'גלה מילים ומבנים',exact:true}).evaluate(button=>{button.click();button.click();});
    await panel.getByLabel('תוצאות הסריקה המילונית').waitFor({timeout:30000});
    const scan=await page.evaluate(()=>window.__lens);
    assert.equal(scan.lens,'matrix-lexicon');assert.equal(scan.ok,true);assert.ok(scan.items.length>0);
    assert.equal(scan.modelCalls,0);assert.equal(page.__elsDynamicLexiconRequests.length,1);
    assert.deepEqual((await page.evaluate(()=>window.__state)).findings,before.findings,'scan does not add findings');
    assert.equal(await page.locator('.els29-native-structure-entry').count(),1,'one research entry, no competing panels');
    assert.equal(await panel.getByLabel('סוג התוצאות',{exact:true}).inputValue(),'groups');
    assert.ok(await panel.getByRole('button',{name:'אמת והצג קבוצה',exact:true}).count()>0,'the same real scan discovers structures');
    const expectedGroup=groupElsLexiconDiscoveries(before,scan).groups[0];assert.ok(expectedGroup);
    // One group goes through the existing replay admission and selects real occurrences.
    await panel.getByRole('button',{name:'אמת והצג קבוצה',exact:true}).first().click();
    await page.waitForFunction(items=>window.__state?.status==='ok'&&items.every(item=>window.__state.findings?.some(f=>f.t===item.term&&[...(f.hits||[]),...(f.sourceHits||[])].some(h=>h.hitId===item.hitId&&h.selected&&(item.kind==='source'||h.verified)))),expectedGroup.items,{timeout:30000});
    const grouped=await page.evaluate(()=>window.__state);
    assert.deepEqual(grouped.axis,before.axis);assert.equal(grouped.verification.state,'MATCH');
    assert.ok(grouped.findings.flatMap(f=>[...(f.hits||[]),...(f.sourceHits||[])]).filter(h=>h.selected).length>=1);
    await panel.getByLabel('סוג התוצאות',{exact:true}).selectOption('els');
    const first=scan.items.find(item=>item.kind==='els'&&!expectedGroup.items.some(member=>member.term===item.term&&member.hitId===item.hitId));assert.ok(first);
    await panel.getByRole('button',{name:`בדוק והוסף ${first.label}`,exact:true}).first().click();
    await page.waitForFunction(item=>window.__state?.status==='ok'&&window.__state.findings?.some(f=>f.t===item.term&&f.hits.some(h=>h.hitId===item.hitId&&h.selected&&h.verified)),first,{timeout:30000});
    assert.deepEqual((await page.evaluate(()=>window.__state)).axis,before.axis);
    for(const theme of ['light','parchment','dark']){
      await page.evaluate(theme=>window.__setThemePreset(theme),theme);
      const size=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
      assert.ok(size.s<=size.w+1,JSON.stringify({width,theme,size}));
      assert.ok(await panel.locator('p:visible').evaluateAll(nodes=>nodes.every(n=>parseFloat(getComputedStyle(n).fontSize)>=18)));
      assert.ok(await panel.locator('button:visible,select:visible').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().height>=44)));
      if(process.env.ELS_LEXICON_SCREENSHOTS){await panel.scrollIntoViewIfNeeded();await page.screenshot({path:`${process.env.ELS_LEXICON_SCREENSHOTS}/lexicon-${width}-${theme}.png`});}
      await panel.getByLabel('סוג התוצאות',{exact:true}).selectOption('groups');
      assert.ok(await panel.getByRole('button',{name:'אמת והצג קבוצה',exact:true}).count()>0);
      const groupSize=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
      assert.ok(groupSize.s<=groupSize.w+1,JSON.stringify({width,theme,groupSize}));
      if(process.env.ELS_LEXICON_SCREENSHOTS){await panel.locator('ol > li').first().scrollIntoViewIfNeeded();await page.screenshot({path:`${process.env.ELS_LEXICON_SCREENSHOTS}/groups-${width}-${theme}.png`});}
      await panel.getByLabel('סוג התוצאות',{exact:true}).selectOption('els');
    }
    await page.evaluate(()=>{window.__fixtureResearchProfile=false;window.__forceParentRender();});
    assert.equal(await panel.isVisible(),false);
    await page.evaluate(()=>{window.__fixtureResearchProfile=true;window.__forceParentRender();});
    assert.equal(await panel.getByLabel('תוצאות הסריקה המילונית').isVisible(),true);
    await page.evaluate(item=>window.__loadResearch({...item,words:[],researchNonce:'lexicon-second'}),ELS_GOLDENS[2]);
    await page.waitForFunction(()=>window.__state?.term==='אליהו'&&window.__state.status==='ok');
    assert.ok(await panel.getByRole('button',{name:/בדוק והוסף/}).first().isDisabled(),'old axis cannot be admitted');
    await page.evaluate(()=>{window.__fixtureTier='anon';window.__forceParentRender();});
    await page.waitForFunction(()=>!document.querySelector('[aria-label="תוצאות הסריקה המילונית"]'));
    assert.deepEqual(ai,[]);
  },{realHost:true});
 });

test('explicit lexicon cancellation discards late download and permits a fresh explicit run',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:90000},async()=>{
  await withNative({width:390,height:900},async page=>{
    let release,intercepted;
    const held=new Promise(resolve=>{release=resolve;});const requested=new Promise(resolve=>{intercepted=resolve;});
    await page.route('**/els-dynamic-lexicon-v1.gz64.txt*',async route=>{intercepted();await held;await route.continue();});
    await page.evaluate(()=>{window.__fixtureResearchProfile=true;window.__forceParentRender();});
    await page.getByText('גילוי וקשרים במטריצה · ללא AI',{exact:true}).click();
    const panel=page.getByRole('region',{name:'גילוי וקשרים במטריצה',exact:true});
    await panel.getByRole('button',{name:'גלה מילים ומבנים',exact:true}).click();await requested;
    await panel.getByRole('button',{name:'בטל פעולה',exact:true}).click();release();
    await page.waitForFunction(()=>window.__lens?.target?.cancel!==true);
    assert.equal(await panel.getByLabel('תוצאות הסריקה המילונית').count(),0);
    await panel.getByRole('button',{name:'גלה מילים ומבנים',exact:true}).click();
    await panel.getByLabel('תוצאות הסריקה המילונית').waitFor({timeout:30000});
    assert.equal(page.__elsDynamicLexiconRequests.length,1,'shared checked cache reused');
  },{realHost:true});
 });

test('completed phrase has no redundant skip continuation in Classic or Research; a lone axis explains pairs',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  for(const width of [320,1440])await withNative({width,height:900},async page=>{
    const heavy=[];page.on('request',req=>{if(/ai-analyze|els-dynamic-lexicon|tanakh-verses/.test(req.url()))heavy.push(req.url());});
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('יום משיח בא');
    await activate(page,'חפש');
    await page.waitForFunction(()=>window.__operation?.status==='done'&&window.__state?.term==='יוממשיחבא');
    const result=await page.evaluate(()=>window.__state.search.occurrences);
    assert.equal(result.total,1);assert.equal(result.discoveryComplete,true);assert.equal(result.continuation,null);
    assert.equal(result.items[0].hitId,'583_-1_239480');
    for(const research of [false,true]){
      await page.evaluate(value=>{window.__fixtureResearchProfile=value;window.__forceParentRender();},research);
      assert.equal(await page.getByRole('button',{name:/המשך.*(?:סריקה|מופעים).*דילוג|נסה שוב סריקת דילוגים/}).count(),0);
    }
    await page.getByText('גילוי וקשרים במטריצה · ללא AI',{exact:true}).click();
    await page.getByText('בדיקת הסימונים והשוואת מופעים',{exact:true}).click();
    const panel=page.getByRole('region',{name:'מבנים והשוואת מופעים',exact:true});await panel.waitFor();
    await panel.getByRole('button',{name:'בדוק מבנים בממצאים שנבחרו',exact:true}).click();
    assert.ok(await panel.getByText(/מסומן כרגע רק הציר הראשי — עדיין אין זוג לבדיקה/).isVisible());
    assert.equal(await panel.locator('summary').filter({hasText:'קווים מקבילים וקווים משותפים (0)'}).count(),0);
    assert.ok(await panel.getByText(/עדיין לא הוספתם תמונות מצב להשוואה/).isVisible());
    await panel.getByRole('button',{name:'חזור לגילוי מילים ומבנים',exact:true}).click();
    await page.getByRole('region',{name:'גילוי וקשרים במטריצה',exact:true}).waitFor();
    assert.equal(page.__elsDynamicLexiconRequests.length,0);
    await panel.getByRole('button',{name:'חפש והוסף מילה למטריצה',exact:true}).click();
    await page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true}).waitFor();
    await addSecondary(page,'ישלח');
    await panel.getByRole('button',{name:'בדוק מבנים בממצאים שנבחרו',exact:true}).click();
    assert.equal(await panel.getByText(/מסומן כרגע רק הציר הראשי — עדיין אין זוג לבדיקה/).count(),0);
    assert.ok(await panel.locator('summary').filter({hasText:'קווים מקבילים וקווים משותפים'}).isVisible());
    for(const theme of ['light','parchment','dark']){
      await page.evaluate(theme=>window.__setThemePreset(theme),theme);
      const size=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
      assert.ok(size.s<=size.w+1,JSON.stringify({width,theme,size}));
      if(process.env.ELS_CLARITY_SCREENSHOTS){mkdirSync(process.env.ELS_CLARITY_SCREENSHOTS,{recursive:true});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:`${process.env.ELS_CLARITY_SCREENSHOTS}/clarity-${width}-${theme}.png`});}
    }
    assert.deepEqual(heavy,[]);
  },{realHost:true});
 });

const host = `import React,{useRef,useEffect} from 'react';
export default function Host(props){
 const frame=useRef(null),latest=useRef(props),ready=useRef(false);latest.current=props;
 const send=message=>{window.__hostLog.push(message);frame.current?.contentWindow?.postMessage({source:'sod-host',...message},location.origin);};
 useEffect(()=>{
  window.__mounts=(window.__mounts||0)+1;
  const receive=async event=>{
   const message=event.data;
   if(event.source!==frame.current?.contentWindow||message?.source!=='tzofen')return;
   window.__log.push(message);
   if(message.type==='ready'){ready.current=true;send({type:'tier',tier:'admin'});if(window.__fixtureLoadGolden)send({type:'load-matrix',item:${JSON.stringify(golden)}});}
   if(message.type==='engine-request'){
    if(window.__fixtureHoldVerification)await new Promise(resolve=>{(window.__fixtureHeld||=[]).push(resolve);window.__fixtureReleaseVerification=()=>window.__fixtureHeld.splice(0).forEach(done=>done());});
    const result=await fetch('/oracle',{method:'POST',body:JSON.stringify({op:message.op,payload:message.payload,denied:window.__fixtureVerificationDenied})}).then(response=>response.json());
    send({type:'engine-result',requestId:message.requestId,...result});
   }
   if(message.type==='state'){window.__state=message;latest.current.onState?.(message);}
   if(message.type==='lens'){window.__lens=message;latest.current.onLens?.(message);}
   if(message.type==='gate')latest.current.onGate?.(message);
   if(message.type==='onboarding-required')latest.current.onOnboardingRequired?.(message);
   if(message.type==='operation'){window.__operation=message;latest.current.onOperation?.(message);}
  };
  addEventListener('message',receive);return()=>removeEventListener('message',receive);
 },[]);
 useEffect(()=>{if(ready.current&&props.lensRequest)send({type:'request-lens',...props.lensRequest});},[props.lensRequest]);
 useEffect(()=>{if(ready.current&&props.findingsRequest)send({type:'update-findings',findings:props.findingsRequest.findings,requestId:props.findingsRequest.seq});},[props.findingsRequest]);
 useEffect(()=>{if(ready.current&&props.controlRequest)send({type:'native-control',...props.controlRequest});},[props.controlRequest]);
 useEffect(()=>{if(ready.current&&props.findingControlRequest)send({type:'native-finding-control',...props.findingControlRequest});},[props.findingControlRequest]);
 useEffect(()=>{if(ready.current&&props.searchRequest)send({type:'native-search',request:props.searchRequest,requestId:props.searchRequest.seq});},[props.searchRequest]);
 return React.createElement('iframe',{ref:frame,src:'/tzofen.html?embed=1&bridge=hidden'+(props.experience2029?'&experience=2029':''),title:'canonical engine fixture',style:{position:'absolute',width:1,height:1,clipPath:'inset(100%)'}});
}`;

const entry = `import React from 'react';import {flushSync} from 'react-dom';import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import Native from '/src/components/experience2029/ElsNativeClassic2029.jsx';
import Advanced from '/src/components/experience2029/ElsAdvancedSearch2029.jsx';
import '/src/components/experience2029/els2029-research.css';
import {resolve2029Palette,usePalette} from '/src/lib/palette.js';
import {useThemePreset,setThemePreset} from '/src/lib/themeMode.js';
import {findingColorChoices,projectFindingColor,nextFindingColor} from '/src/components/experience2029/elsFindingColors2029.js';
import '/src/components/experience2029/sod2029.css';
import '/src/components/experience2029/sod2029-closed.css';
import '/src/components/experience2029/systemFrame2029.css';
window.__log=[];window.__hostLog=[];
window.__setThemePreset=setThemePreset;
window.__findingColors={findingColorChoices,projectFindingColor,nextFindingColor,resolve2029Palette};
function Fixture(){
const [,forceRender]=React.useState(0);window.__forceParentRender=()=>flushSync(()=>forceRender(n=>n+1));
const [matrix,setMatrix]=React.useState(null);window.__openSavedMatrix=setMatrix;window.__fixtureMatrix=matrix;
const [matrixReading,setMatrixReading]=React.useState(null);window.__setMatrixReading=setMatrixReading;
const [researchLoad,setResearchLoad]=React.useState(null);window.__loadResearch=setResearchLoad;
const restoreResearch=item=>setResearchLoad({...item,researchNonce:crypto.randomUUID()});
const [researchProbe,setResearchProbe]=React.useState(window.__fixtureInitialProbe||null),pendingProbe=React.useRef(window.__fixtureInitialProbe?.requestId??null);
window.__probeResearch=request=>{pendingProbe.current=request?.requestId??null;setResearchProbe(request);};
const palette=resolve2029Palette(useThemePreset(),'research_lab');
const fields={page:'pageBg',panel:'card','panel-soft':'cardSoft',line:'border','line-strong':'borderStrong',accent:'accent','accent-text':'accentText','accent-secondary':'accentSecondary',ink:'ink',muted:'inkSoft','focus-ring':'focusRing','on-accent':'onAccent','accent-btn':'accentBtn','warm-accent':'warmAccent'};
const style={fontFamily:'Arial',color:palette.ink,background:palette.pageBg,minHeight:'100vh',padding:12};
for(const [key,value] of Object.entries(fields))style['--s29-'+key]=palette[value];
for(const [key,value] of Object.entries({micro:14,small:15,body:16,ui:15,lead:20,title:24}))style['--s29-type-'+key]=value+'px';
for(const key of ['body','ui','display','numeric'])style['--s29-font-'+key]='Arial';
const dock=React.createElement('div',{className:'sod29-command-island',role:'toolbar','aria-label':'מסלול המחקר והפעולות הזמינות עכשיו'},
 ...['חיפוש','פעולה','רזיאל','עכשיו','כלים','אישי'].map(label=>React.createElement('button',{type:'button',key:label,onClick:()=>window.__dockAction=label},label)));
return React.createElement('div',{style,className:'sod29-root closed-shell native-frame surface-els'},
 React.createElement('aside',{className:'sod29-sidebar','aria-label':'fixture sidebar'}),
 React.createElement('div',{className:'sod29-main'},
  React.createElement('div',{className:'sod29-main-stage'},
   React.createElement('main',{className:'sod29-content wide'},
    React.createElement('section',{className:'sod29-focus-stage','data-els-2029-surface':'v1'},
     React.createElement('section',{className:'sod29-section','data-els-classic-2029':'native-v1'},React.createElement(Native,{matrix,matrixReading,researchLoad,researchProbe,advancedSearch:React.createElement(Advanced,{onLoad:setResearchLoad}),onResearchRestore:restoreResearch,researchProfile:window.__fixtureResearchProfile!==false,guidedProfile:!!window.__fixtureGuided,onRazielMatrix:window.__fixtureMatrixAnalysis?async context=>{(window.__matrixSubmits||=[]).push(context);return {ok:true};}:undefined,onResearchProbeResult:result=>{(window.__probeHistory||=[]).push(result);if(result.requestId!==pendingProbe.current)return;pendingProbe.current=null;window.__probeResult=result;if(result.ok)setResearchLoad({term:result.term,scope:result.scope,skip:result.skip,dir:result.dir,start:result.start,hitId:result.hitId,corpusId:result.corpusId,words:[],researchNonce:result.requestId});}})))))),dock);
}
if(window.__fixtureFullFrame){
 const [{default:Frame},{BrowserRouter}]=await Promise.all([import('/src/components/experience2029/Sod2029Shell.jsx'),import('react-router-dom')]);
 function PaletteProbe(){const p=usePalette();return React.createElement('span',{'data-palette-probe':JSON.stringify({accent:p.accent,panel:p.card}),hidden:true});}
 function FullFrameFixture(){
  const [visible,setVisible]=React.useState(true);window.__setNativeVisible=setVisible;
  const [,forceRender]=React.useState(0);window.__forceParentRender=()=>flushSync(()=>forceRender(n=>n+1));
  return React.createElement(BrowserRouter,null,React.createElement(Frame,{surface:'els',title:'צופן התנ״ך',wide:true,introVariant:'compact'},React.createElement(PaletteProbe),
   React.createElement('section',{'data-els-classic-2029':'native-v1',className:'sod29-section'},visible?React.createElement(Native,{researchProfile:window.__fixtureResearchProfile!==false,onRazielMatrix:window.__fixtureMatrixAnalysis?async context=>{(window.__matrixSubmits||=[]).push(context);return {ok:true};}:undefined}):React.createElement('p',null,'Library fixture'))));
 }
 createRoot(document.getElementById('root')).render(React.createElement(FullFrameFixture));
}else createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,null,React.createElement(Fixture)));
`;

function verify({ op, payload, denied }) {
  if (denied) return { ok: false, error: 'bridge_unavailable' };

  const hi = payload.scope === 'tanakh' ? letters.length : TORAH_LEN;
  const corpusId = payload.scope === 'tanakh'
    ? '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b'
    : ELS_GOLDEN_CORPUS_ID;
  if(op==='page'){
    const term=payload.term.replace(/[^א-ת]/g,'').replace(/[ךםןףץ]/g,c=>({'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'}[c]));
    const hits=[],size=payload.page_size||500;
    for(let skip=payload.skip_min;skip<=payload.skip_max;skip++){
      for(let start=letters.indexOf(term[0]);start>=0&&start<hi;start=letters.indexOf(term[0],start+1))for(const dir of [1,-1]){
        if(payload.after_skip!=null&&(skip<payload.after_skip||skip===payload.after_skip&&(start<payload.after_start||start===payload.after_start&&dir>=payload.after_dir)))continue;
        const end=start+dir*skip*(term.length-1);if(end<0||end>=hi)continue;
        let ok=true;for(let k=1;k<term.length;k++)if(letters[start+dir*skip*k]!==term[k]){ok=false;break;}
        if(ok)hits.push({skip,dir,start,positions:Array.from(term,(_,k)=>start+dir*skip*k)});
        if(hits.length>size)break;
      }
      if(hits.length>size)break;
    }
    const hasMore=hits.length>size,rows=hits.slice(0,size),last=rows.at(-1);
    return {ok:true,result:{contract:'els_search_page_v1',status:rows.length?'OK':'EXECUTED_EMPTY',scope:payload.scope,corpus_id:corpusId,input:{normalized:term},hits:rows,
      completion:{executed:true,has_more:hasMore,continuation:hasMore?{after:{skip:last.skip,start:last.start,dir:last.dir}}:null}},trace_id:'ordered-page-oracle'};
  }
  if(op!=='verify_batch')return {ok:false,error:'unsupported_test_operation'};
  if (payload.corpus_id !== corpusId) return { ok: true, result: { status: 'CORPUS_MISMATCH' } };
  const term = payload.term.replace(/[^א-ת]/g, '');
  if (payload.candidates.length > 4000 || payload.candidates.length * term.length > 64000) {
    return { ok: false, error: 'budget_exceeded' };
  }
  const verified = [];
  const seen = new Set();
  payload.candidates.forEach((candidate, ordinal) => {
    const id = `${candidate.skip}/${candidate.dir}/${candidate.start}`;
    if (seen.has(id)) return;
    seen.add(id);
    let matches = Number.isInteger(candidate.skip) && candidate.skip >= 2 &&
      [1, -1].includes(candidate.dir) && Number.isInteger(candidate.start);
    for (let offset = 0; matches && offset < term.length; offset++) {
      const index = candidate.start + candidate.dir * candidate.skip * offset;
      matches = index >= 0 && index < hi && letters[index] === term[offset];
    }
    if (matches) verified.push({ ...candidate, input_ordinal: ordinal });
  });
  return { ok: true, result: { status: 'OK', corpus_id: corpusId, verified }, trace_id: 'native-ui-oracle' };
}

// These read-only stubs let first-search acceptance exercise the real TzofenEmbed adapter and
// its gate portal, while keeping auth, saved matrices, tracking and workspace writes out of tests.
const realHostStubs = {
  '../lib/AuthContext.jsx': `export const useAuth=()=>({isAdmin:window.__fixtureTier==='admin',verified:window.__fixtureTier!=='anon',user:window.__fixtureTier==='anon'?null:{id:'fixture-owner'},loading:false});`,
  '../lib/tracking.js': `export const track=()=>{};export const getVisitorId=()=>'native-ui-fixture';`,
  '../lib/elsMatrices.js': `export const getSavedMatrices=async()=>[];
    export const getMatrixById=async id=>{
      (window.__readCalls||=[]).push(id);
      if(window.__readFails)throw new Error('fixture read failure');
      if(window.__holdRead)await new Promise(resolve=>window.__releaseRead=resolve);
      const row=(window.__savedRows||[]).find(row=>row.id===id);
      const allowed=row&&(row.visibility==='public'||row.self_published||window.__fixtureTier==='admin'||(window.__fixtureTier!=='anon'&&row.owner_user_id==='fixture-owner'));
      return structuredClone(allowed?row:null);
    };
    export const saveMatrix=async payload=>{
      (window.__saveCalls||=[]).push(structuredClone(payload));
      if(window.__saveFails)throw new Error('fixture save failure');
      const rows=window.__savedRows||=[];
      const old=rows.find(row=>row.search_term===payload.term&&row.skip_distance===payload.skip&&row.direction===payload.direction&&row.start_index===payload.startIndex&&
        (payload.isPublic?(row.self_published||row.visibility==='public')&&(window.__fixtureTier==='admin'||row.owner_user_id==='fixture-owner'&&row.status!=='published'):row.owner_user_id==='fixture-owner'&&row.visibility==='private'&&!row.self_published&&row.status!=='published'));
      const row={id:old?.id||'saved-'+(rows.length+1),slug:old?.slug||'native-save-'+(rows.length+1),search_term:payload.term,title:payload.title,
        scope:payload.scope,skip_distance:payload.skip,direction:payload.direction,start_index:payload.startIndex,corpus_id:'${ELS_GOLDEN_CORPUS_ID}',
        owner_user_id:'fixture-owner',visibility:payload.isPublic&&window.__fixtureTier==='admin'?'public':'private',status:payload.isPublic?(window.__fixtureTier==='admin'?'published':'pending'):'draft',self_published:!!payload.isPublic,positions:payload.positions,description:payload.note,image_url:payload.imageUrl};
      if(old)Object.assign(old,row);else rows.push(row);return row.id;
    };
    export const saveMatrixAnon=async payload=>{window.__anonymousSaves=(window.__anonymousSaves||0)+1;
      if(!window.__allowAnonymousSave)throw new Error('unexpected anonymous save');
      (window.__anonymousSaveCalls||=[]).push(structuredClone(payload));return 'anonymous-pending';};export const moderateMatrix=async()=>{};`,
  '../lib/contributions.js': `export const addContribution=async()=>{};`,
  '../lib/supabase.js': `export const supabase={storage:{from:()=>({upload:async()=>{window.__publicUploads=(window.__publicUploads||0)+1;return {error:null};},getPublicUrl:name=>({data:{publicUrl:'https://fixture.invalid/gallery/'+name}})})},
    rpc:async(name,payload)=>{
      (window.__updateCalls||=[]).push({name,...structuredClone(payload)});
      const row=(window.__savedRows||[]).find(row=>row.id===payload.p_id);
      if(name!=='update_els_matrix'||window.__updateFails||!row||window.__fixtureTier==='anon'||(window.__fixtureTier!=='admin'&&(row.owner_user_id!=='fixture-owner'||row.status==='published')))return {error:{message:'update denied'}};
      row.positions=payload.p_positions;if(payload.p_image_url!=null)row.image_url=payload.p_image_url;
      row.description=payload.p_description;row.engine_detail=payload.p_engine_detail;return {error:null};
    },functions:{invoke:async(name,{body,signal})=>{const {op,...payload}=body;
    if(window.__fixtureHoldVerification)await new Promise(resolve=>{(window.__fixtureHeld||=[]).push(resolve);window.__fixtureReleaseVerification=()=>window.__fixtureHeld.splice(0).forEach(done=>done());signal?.addEventListener('abort',()=>{window.__fixtureAborts=(window.__fixtureAborts||0)+1;resolve();},{once:true});});
    if(signal?.aborted)return {data:null,error:{message:'aborted'}};
    const response=await fetch('/oracle',{method:'POST',body:JSON.stringify({op,payload,denied:window.__fixtureVerificationDenied})}).then(result=>result.json());return response.ok?{data:response,error:null}:{data:null,error:{message:response.error}};}}};`,
  '../lib/img.js': `export const thumb=(value)=>value;`,
  '../lib/research/useUniversalWorkspace.js': `const workspace={upsertFinding:()=>{}};export const useUniversalWorkspace=()=>workspace;`,
  './SubscribeGate.jsx': `import React from 'react';export default function Gate(){return React.createElement('div',{'data-fixture-subscribe-gate':'true'},'Test registration gate');}`,
  'react-router-dom': `export const useNavigate=()=>()=>{};`,
};

// Use the actual SystemFrame/Command Island for integration acceptance. Only unrelated
// domain projections and external reads are isolated; no dock/registration test double.
const frameStubs = {
 '../../lib/supabase.js': `export const askRaziel=async()=>({});export const getNotificationPrefs=async()=>({});`,
 '../../lib/notifications.js': `export const getMyNotifications=async()=>[];export const getUnreadCount=async()=>0;export const markNotificationRead=async()=>{};export const topicLabel=x=>x;`,
 '../../lib/commandCenter.js': `export const getMyProfile=async()=>null;export const watchToggle=async()=>{};`,
 '../../lib/tracking.js': `export const getVisitorId=()=>'frame-fixture';`,
 '../ShareActions.jsx': `export default function Share(){return null;}`,
 '../ContactGateway.jsx': `export default function Contact(){return null;}`,
 '../number2029/NumberDrawer2029.jsx': `export default function Number(){return null;}`,
 './SurfaceContextRail2029.jsx': `export default function Context(){return null;}`,
};

async function withNative(viewport, run, options = {}) {
  const { realHost = false, loadGolden = true, onboarded = true, tier = 'admin', mobile = false, fullFrame = false, leavesMatrix = false, reentrantRender = false, guided = false, matrixAnalysis = false, researchProfile = true, initialProbe = null } = options;
  const fixture = {
    name: 'els-native-browser-fixture', enforce: 'pre',
    resolveId(id, importer) {
      if (id === 'els-native-fixture') return '\0els-native-fixture';
      if (importer?.endsWith('/ElsAdvancedSearch2029.jsx') && id.endsWith('/ResearchProvider.jsx')) return '\0els-frame-research';
      if (importer?.endsWith('/ElsAdvancedSearch2029.jsx') && id.endsWith('/supabase.js')) return '\0els-host-stub:../lib/supabase.js';
      if (fullFrame && id.endsWith('/ResearchProvider.jsx')) return '\0els-frame-research';
      if (fullFrame && id.endsWith('/MaintenanceLock.jsx')) return '\0els-frame-open-flags';
      if (fullFrame && importer?.endsWith('/SystemFrame2029.jsx') && Object.hasOwn(frameStubs,id)) return '\0els-frame-stub:'+Object.keys(frameStubs).indexOf(id);
      if (id.endsWith('/AuthContext.jsx')) return '\0els-host-stub:../lib/AuthContext.jsx';
      if (!realHost && id === '../TzofenEmbed.jsx' && importer?.endsWith('/ElsNativeClassic2029.jsx')) return '\0els-native-host';
      if (realHost && importer?.endsWith('/TzofenEmbed.jsx') && Object.hasOwn(realHostStubs, id)) return '\0els-host-stub:' + id;
    },
    load(id) {
      if (id === '\0els-native-fixture') return entry;
      if (id === '\0els-frame-research') return 'const state={context:null,cart:[],saved:[],updateResearchContext:()=>{}};export const useResearch=()=>state;';
      if (id === '\0els-frame-open-flags') return 'export const useFeatureState=flag=>({flag,loading:false,blocked:false,allowed:true});';
      if (id.startsWith('\0els-frame-stub:')) return Object.values(frameStubs)[Number(id.slice('\0els-frame-stub:'.length))];
      if (id === '\0els-native-host') return host;
      if (id.startsWith('\0els-host-stub:')) return realHostStubs[id.slice('\0els-host-stub:'.length)];
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url === '/oracle' && request.method === 'POST') {
          let body = '';
          for await (const part of request) body += part;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify(verify(JSON.parse(body))));
          return;
        }
        if (request.url === '/fixture') {
          response.setHeader('content-type', 'text/html; charset=utf-8');
          response.end(await server.transformIndexHtml('/fixture', '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}</style><div id="root"></div><script type="module" src="/@id/els-native-fixture"></script></html>'));
          return;
        }
        next();
      });
    },
  };
  const server = await vite.createServer({ root, cacheDir: process.env.ELS_NATIVE_CACHE_DIR || undefined, configFile: false, plugins: [fixture, react()], server: { host: '127.0.0.1', port: 0 } });
  let browser;
  try {
    await server.listen();
    browser = await pw.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile });
    const errors = [];
    page.__elsDynamicLexiconRequests = [];
    page.__elsGuidedSnapshotRequests = [];
    page.on('request', request => {
      const pathname=new URL(request.url()).pathname;
      if (pathname.endsWith('/els-dynamic-lexicon-v1.gz64.txt')) {
        page.__elsDynamicLexiconRequests.push(request.url());
      }
      if(pathname.includes('ElsGuidedMatrixSnapshot2029'))page.__elsGuidedSnapshotRequests.push(request.url());
    });
    if(process.env.ELS_SAVE_DIAGNOSTICS)page.on('response',async response=>{if(response.status()>=400)console.error('HTTP',response.status(),response.url(),(await response.text()).slice(0,700));});
    page.on('pageerror', (error) => {errors.push(error.message);if(process.env.ELS_SAVE_DIAGNOSTICS)console.error('BROWSER',error.message);});
    await page.addInitScript(({ realHost, loadGolden, onboarded, tier, fullFrame, reentrantRender, guided, matrixAnalysis, researchProfile, initialProbe }) => {
      window.__fixtureInitialProbe=initialProbe;
      window.__fixtureFullFrame=fullFrame;
      window.__fixtureGuided=guided;
      window.__fixtureMatrixAnalysis=matrixAnalysis;
      window.__fixtureResearchProfile=researchProfile;
      if (onboarded) localStorage.setItem('tzofen_onboarded_v1', '1');
      window.__fixtureLoadGolden = loadGolden;
      window.__fixtureTier = tier;
      if (!realHost) return;
      if (window === window.parent) {
        window.__mounts = 0;
        const observer = new MutationObserver((records) => {
          for (const record of records) for (const node of record.addedNodes) {
            if (node instanceof Element) window.__mounts += node.matches('iframe') ? 1 : node.querySelectorAll('iframe').length;
          }
        });
        observer.observe(document, { childList: true, subtree: true });
        addEventListener('message', (event) => {
          const frame = document.querySelector('iframe');
          const message = event.data;
          if (event.source !== frame?.contentWindow || message?.source !== 'tzofen') return;
          (window.__log ||= []).push(message);
          if (message.type === 'state') { window.__state = message;if(reentrantRender){window.__reentrantCount=(window.__reentrantCount||0)+1;window.__forceParentRender?.();} }
          if (message.type === 'lens') window.__lens = message;
          if (message.type === 'operation') window.__operation = message;
          if (message.type === 'ready' && loadGolden && !window.__fixtureGoldenInjected) {
            window.__fixtureGoldenInjected = true;
            frame.contentWindow.postMessage({ source: 'sod-host', type: 'load-matrix', item: window.__fixtureGolden }, location.origin);
          }
        });
      }
      if (window !== window.parent) addEventListener('message', (event) => {
        if (event.source === window.parent && event.data?.source === 'sod-host') (window.parent.__hostLog ||= []).push(event.data);
      });
    }, { realHost, loadGolden, onboarded, tier, fullFrame, reentrantRender, guided, matrixAnalysis, researchProfile, initialProbe });
    if (realHost && loadGolden) await page.addInitScript((item) => { window.__fixtureGolden = item; }, golden);
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture`);
    if (loadGolden) {
      await page.waitForFunction((id) => window.__state?.provenance?.editId === id, golden.id, { timeout: 60000 });
      await page.waitForFunction(() => document.querySelector('.els29-native-cell.is-axis'));
    } else {
      await page.waitForFunction(() => window.__log?.some((message) => message.type === 'ready'), null, { timeout: 60000 });
    }
    await run(page);
    assert.equal(await page.locator('iframe').count(), leavesMatrix ? 0 : 1, 'one canonical engine while the matrix is mounted');
    assert.equal(await page.evaluate(() => window.__mounts), 1, 'panel actions never remount the engine');
    assert.deepEqual(errors, [], 'no uncaught React/tool errors');
  } finally {
    await browser?.close();
    await server.close();
  }
}

const button = (page, name) => page.getByRole('button', { name, exact: true }).filter({ visible: true });
// Dispatch actions directly so Playwright does not scroll an offscreen inspector button into view.
async function activate(page, name) {
  await revealMatrixOption(page,name);
  await button(page, name).dispatchEvent('click');
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function revealMatrixOption(page,name) {
  const candidate=page.getByRole('button',{name,exact:true,includeHidden:true});
  if(await candidate.count()===1&&await candidate.evaluate(el=>!!el.closest('.els29-matrix-display-options[hidden]')))
    await page.getByRole('button',{name:'עוד אפשרויות תצוגה',exact:true}).click();
}
const capture = (page) => page.evaluate(() => {
  const matrix = document.querySelector('.els29-native-matrix-scroll');
  const rect = matrix.getBoundingClientRect();
  return { x: rect.x, width: rect.width, left: matrix.scrollLeft, top: matrix.scrollTop, pageX: scrollX, pageY: scrollY };
});
async function expectStable(page, before, label) {
  const after = await capture(page);
  for (const key of Object.keys(before)) assert.ok(Math.abs(after[key] - before[key]) <= 1, `${label}: ${key} changed ${before[key]} → ${after[key]}`);
}
async function pan(page) {
  await page.locator('.els29-native-matrix-scroll').evaluate((matrix) => { matrix.scrollLeft = 120; matrix.scrollTop = 90; });
  return capture(page);
}
async function changeRange(page, label, value) {
  await page.getByRole('slider', { name: label, exact: true }).evaluate((input, number) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(number));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function inspectAndScanPrimary(page, before) {
  await openPanel(page);
  await selectAxis(page, golden.term);
  assert.equal(await button(page, 'סרוק לאורך הציר הנבחר').count(), 1, 'one shared scan action');
  const requests = await page.evaluate(() => window.__hostLog.filter((message) => message.type === 'request-lens').length);
  await button(page, 'סרוק לאורך הציר הנבחר').evaluate((element) => { element.click(); element.click(); element.click(); });
  await button(page, 'סמן את תורה ברצף').waitFor();
  assert.equal(await page.evaluate(() => window.__hostLog.filter((message) => message.type === 'request-lens').length), requests + 1, 'scan spam produces one pending lens request');
  await expectStable(page, before, 'scan primary line');
  await activate(page, 'סמן את תורה ברצף');
  assert.equal(await page.locator('[data-experience-capability="els-line-inspection"] .is-word').count(), 4);
  await expectStable(page, before, 'highlight line word');
}

async function openPanel(page) {
  if (await button(page, 'סריקה וממצאים').getAttribute('aria-expanded') !== 'true') await activate(page, 'סריקה וממצאים');
}
async function selectAxis(page, term) {
  await openPanel(page);
  await activate(page, `בחר ציר לסריקה: ${term}`);
}
async function addSecondary(page, term) {
  await openPanel(page);
  await page.getByRole('textbox', { name: 'חיפוש משני במטריצה', exact: true }).fill(term);
  await activate(page, 'חפש במטריצה');
  await page.waitForFunction((word) => window.__state?.findings?.some((finding) => finding.t === word && finding.hits?.some((hit) => hit.shown && hit.verified)), term);
}
async function radius(page, value) {
  const control = page.getByLabel('מרחק מרבי מהציר הראשי', { exact: true });
  if (await control.evaluate((element) => element.tagName) === 'SELECT') await control.selectOption(value === null ? 'all' : String(value));
  else {
    await control.fill(value === null ? '' : String(value));
    await control.dispatchEvent('change');
  }
}
async function alignedPanel(page, label) {
  const stage = await page.locator('.els29-native-stage').boundingBox();
  const panel = await page.locator('.els29-native-context-panel').boundingBox();
  assert.ok(Math.abs(stage.y - panel.y) <= 1, `${label}: panel top matches the matrix`);
  assert.ok(Math.abs(stage.y + stage.height - panel.y - panel.height) <= 1, `${label}: panel bottom matches the matrix`);
}
async function injectToolMessage(page, message) {
  const frame = page.frames().find((item) => item.parentFrame());
  assert.ok(frame, 'canonical iframe exists');
  await frame.evaluate((data) => parent.postMessage(data, location.origin), message);
}

const stageHeight = (page) => page.locator('.els29-native-stage').evaluate((stage) => stage.getBoundingClientRect().height);
const identity = (page) => page.evaluate(() => {
  const state = window.__state;
  return { term: state.term, scope: state.scope, axis: state.axis, geometry: state.geometry, occurrence: state.occurrence, findings: state.findings, verification: state.verification };
});
async function expectNative(page, url, label) {
  assert.equal(page.url(), url, `${label}: stays at the same URL`);
  assert.equal(await page.locator('.els29-native-stage').isVisible(), true, `${label}: native matrix is visible`);
  assert.equal(await page.locator('.els29-classic-fallback.is-open').count(), 0, `${label}: classic iframe does not cover the result`);
  assert.equal(await page.locator('iframe').count(), 1, `${label}: retains one canonical iframe`);
  assert.equal(await page.evaluate(() => window.__mounts), 1, `${label}: retains the same engine mount`);
}
async function expectHeightControl(page) {
  const baseline = await stageHeight(page);
  const engine = await identity(page);
  const footer = page.locator('.els29-native-bottom-controls');
  assert.equal(await footer.locator('.els29-native-stage').count(), 0, 'bottom controls are outside the fixed matrix stage');
  const bounds = await page.locator('.els29-native-stage').boundingBox();
  const footerBounds = await footer.boundingBox();
  assert.ok(footerBounds.y >= bounds.y + bounds.height - 1, 'controls sit below the matrix');
  await activate(page, 'הגדל גובה ב־50%');
  assert.ok(Math.abs(await stageHeight(page) - baseline * 1.5) <= 1, 'height toggle adds 50% of the regular stage height');
  await button(page, 'חזור לגובה הרגיל').scrollIntoViewIfNeeded();
  const control = await button(page, 'חזור לגובה הרגיל').boundingBox();
  const viewport = page.viewportSize();
  assert.ok(control.y >= 0 && control.y + control.height <= viewport.height + 1, 'height control remains reachable below the expanded matrix');
  await activate(page, 'חזור לגובה הרגיל');
  assert.ok(Math.abs(await stageHeight(page) - baseline) <= 1, 'height restores the regular stage');
  assert.deepEqual(await identity(page), engine, 'height changes presentation only');
}


test('Fable existing results project exact letters without search, AI, manual-finding mutation or axis loss',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   const baseline=await identity(page);
   const expected=await page.evaluate(()=>{
    const s=window.__state,m=s.matrix,axis={term:s.term,scope:s.scope,start:s.axis.start,skip:s.axis.skip,dir:s.axis.direction==='back'?-1:1,corpusId:s.verification.corpus_id};
    const make=(start,skip,dir,length)=>{
     const positions=Array.from({length},(_,i)=>start+skip*dir*i);
     const text=positions.map(p=>m.rows[Math.floor(p/m.S)-m.r0][p%m.S-m.c0]).join('');
     const key='els:'+axis.corpusId+':'+text+':'+skip+':'+dir+':'+start;
     return {id:key,text,parts:[text],occurrence:{start,skip,dir,length},verification:{state:'ENGINE_VERIFIED',letters_match:true,occurrences_verified:1,engine:{contract:'els_occurrence_replay_v1',verification_state:'MATCH',corpus_id:axis.corpusId,occurrence_id:key}}};
    };
    const findings=Array.from({length:24},(_,i)=>make((m.r0+3)*m.S+m.c0+i,m.S,1,5));
    findings.push(make(axis.start+axis.dir*axis.skip,axis.skip,axis.dir,3));
    const result={contract:'els_matrix_reading_v1',state:'COMPLETE',is_test_fixture:true,provider:{kind:'test_double'},axis:{...axis,corpus_id:axis.corpusId},findings};
    const reading={mode:'on',isAdmin:true,session:{busy:false,thread:[{role:'raziel',elsMatrixReading:result,continuation:{contextSnapshot:{elsMatrixContext:{axis}}}}]}};
    window.__readingFixture=reading;window.__setMatrixReading(reading);
    return {selected:findings[0].verification.engine.occurrence_id,positions:Array.from({length:5},(_,i)=>findings[0].occurrence.start+i*m.S)};
   });
   assert.equal(await page.locator('.els29-matrix-ai-card').count(),1,'one persistent card, not a duplicate chat');
   await page.locator('.els29-native-toolstrip').getByRole('button',{name:'גילוי עם AI',exact:true}).click();
   await page.getByRole('heading',{name:'ממצאים שאומתו במנוע · 25',exact:true}).waitFor();
   await page.getByText('חלק מהציר הראשי — לא הצלבה חדשה',{exact:true}).waitFor();
   assert.equal(await page.locator('.els29-matrix-reading-result li').count(),25,'not limited to the 12 manual findings');
   assert.ok(await page.locator('.els29-native-cell.is-ai-reading').count()>100);
   const hostCount=await page.evaluate(()=>window.__hostLog.length);
   for(const width of [320,390,1440])for(const theme of ['dark','light','parchment']){
    await page.setViewportSize({width,height:900});await page.evaluate(preset=>window.__setThemePreset(preset),theme);
    await page.locator('.els29-matrix-reading-result li').first().getByRole('button').click();
    await page.waitForFunction(()=>document.querySelectorAll('.is-ai-reading-selected').length===5);
    assert.deepEqual(await page.locator('.is-ai-reading-selected').evaluateAll(cells=>cells.map(c=>Number(c.dataset.elsIndex))),expected.positions);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width} ${theme}: no page overflow`);
    assert.equal(await page.locator('.els29-native-cell.is-axis').count(),baseline.axis.length,'main axis preserved');
    if(process.env.ELS_SCREENSHOT_DIR){mkdirSync(process.env.ELS_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`reading-matrix-${width}-${theme}.png`)});}
   }
   assert.deepEqual(await identity(page),baseline,'projection does not mutate canonical findings or geometry');
   assert.equal(await page.evaluate(()=>window.__hostLog.length),hostCount,'selection and themes send no engine requests');
   assert.equal(await page.evaluate(()=>window.__matrixSubmits?.length||0),0,'zero AI submits');
   await page.getByRole('button',{name:'הסתר סימוני AI מהמטריצה',exact:true}).click();
   assert.equal(await page.locator('.is-ai-reading').count(),0);assert.equal(await page.locator('.is-axis').count(),baseline.axis.length);
   await page.getByRole('button',{name:'הצג ממצאי AI במטריצה',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('.is-ai-reading'));
   await page.evaluate(()=>{const changed=structuredClone(window.__readingFixture);changed.session.thread[0].continuation.contextSnapshot.elsMatrixContext.axis.start++;window.__setMatrixReading(changed);});
   await page.waitForFunction(()=>!document.querySelector('.is-ai-reading'));
   assert.equal(await page.getByRole('heading',{name:/ממצאים שאומתו במנוע/}).count(),0,'different occurrence cannot attach');
  },{matrixAnalysis:true});
 });

test('Classic opens on unmarked Genesis letters, right aligned, with no sample cipher',
 {skip:!canRun,timeout:90000},async()=>{
  for(const width of [390,1440]) await withNative({width,height:900},async page=>{
    await page.waitForFunction(()=>window.__state?.status==='ready');
    const state=await page.evaluate(()=>window.__state);
    assert.equal(state.matrix.rows[0].slice(0,6),'בראשית');
    assert.equal(state.axis,undefined);
    assert.deepEqual(state.matrix.marks,[]);
    assert.equal(await page.locator('.els29-native-cell.is-axis').count(),0);
    assert.equal(await page.locator('.els29-native-cell').first().textContent(),'ב');
    const region=await page.getByRole('region',{name:'טקסט התורה מבראשית, ללא צופן נבחר'}).boundingBox();
    const first=await page.locator('.els29-native-cell').first().boundingBox();
    assert.ok(first.x+first.width<=region.x+region.width+2&&first.x+first.width>=region.x+region.width-55,'בראשית starts at the visible right edge');
    assert.equal(await page.locator('.els29-native-stage-head h3').textContent(),'הצופן הקלאסי');
    assert.equal(page.__elsDynamicLexiconRequests.length,0,'opening Classic never downloads the guided language asset');
    const requestId=await page.evaluate(()=>window.__operation?.requestId||0);
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('משה');
    await activate(page,'חפש');
    await page.waitForFunction(id=>window.__operation?.kind==='search'&&window.__operation.requestId>id&&window.__operation.status==='done',requestId,{timeout:90000});
    assert.equal(page.__elsDynamicLexiconRequests.length,0,'a regular Classic search never downloads the guided language asset');
    assert.equal(page.__elsGuidedSnapshotRequests.length,0,'Classic never downloads the Guided snapshot component');
    assert.equal(await page.locator('[data-els-smart-matrix-snapshot="v1"]').count(),0,'Classic never renders the Guided snapshot');
  },{realHost:true,loadGolden:false,mobile:width===390});
});

test('native UI: one unified rail scans exact primary and secondary targets without moving the matrix',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   const url=page.url(),initial=await identity(page),before=await pan(page);
   await alignedPanel(page,'initial pinned rail');
   await activate(page,'סגור כלי מטריצה');await expectStable(page,before,'close unified rail');
   await openPanel(page);await expectStable(page,before,'reopen unified rail');
   await inspectAndScanPrimary(page,before);
   assert.deepEqual(await identity(page),initial,'primary scan preserves verified identity');
   const primary=await page.evaluate(()=>window.__lens);
   await addSecondary(page,'התורה');
   const state=await page.evaluate(()=>window.__state);
   const hit=state.findings.find(f=>f.t==='התורה').hits.find(h=>h.shown&&h.verified);
   const input=page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true});
   await input.fill('דוד');const draft=await input.inputValue(),secondaryPan=await pan(page);
   await selectAxis(page,'התורה');await activate(page,'סרוק לאורך הציר הנבחר');
   await page.waitForFunction(id=>window.__lens?.lens==='line-context'&&window.__lens?.hitId===id&&window.__lens?.target?.term==='התורה'&&window.__lens?.scan,hit.hitId);
   await expectStable(page,secondaryPan,'secondary scan');await expectNative(page,url,'secondary scan');
   assert.equal(await input.inputValue(),draft,'scan retains the secondary input');
   assert.equal(await button(page,'בחר ציר לסריקה: התורה').isVisible(),true,'scan retains the finding list');
   assert.equal(await button(page,'סרוק לאורך הציר הנבחר').count(),1,'still one shared scan action');
   assert.deepEqual(await identity(page),{term:state.term,scope:state.scope,axis:state.axis,geometry:state.geometry,occurrence:state.occurrence,findings:state.findings,verification:state.verification});
   // Append a dictionary candidate from a selected secondary line, without losing that line.
   await activate(page,'סמן את תורה ברצף');
   const retained=await page.locator('.els29-native-line-cells').textContent();
   await page.evaluate(()=>window.__fixtureHoldVerification=true);
   await activate(page,'הוסף את תורה לממצאים');
   await page.waitForFunction(()=>typeof window.__fixtureReleaseVerification==='function');
   assert.equal(await button(page,'בחר ציר לסריקה: התורה').getAttribute('aria-pressed'),'true','secondary target is retained while its candidates are reverified');
   assert.equal(await page.locator('.els29-native-line-cells').textContent(),retained,'secondary scan stays open through verification');
   assert.equal(await page.locator('.els29-native-line-cells .is-word').count(),4,'candidate highlight survives verification');
   assert.equal(await input.inputValue(),draft,'candidate append retains the secondary draft');
   for(const label of ['סרוק לאורך הציר הנבחר','מקור הממצא הנבחר','הוסף את תורה לממצאים'])assert.equal(await button(page,label).isDisabled(),true,label+' is disabled during candidate verification');
   await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification()});
   await page.waitForFunction(()=>window.__state?.findings?.find(f=>f.t==='תורה')?.hits?.some(hit=>hit.shown&&hit.verified));
   await page.waitForFunction(()=>!document.querySelector('[aria-label="סרוק לאורך הציר הנבחר"]').disabled);
   assert.equal(await button(page,'בחר ציר לסריקה: התורה').getAttribute('aria-pressed'),'true','original secondary target is revalidated after completion');
   assert.equal(await input.inputValue(),draft);
   assert.equal(await page.locator('.els29-native-line-cells').textContent(),retained);
   assert.equal(await page.locator('.els29-native-line-cells .is-word').count(),4);
   assert.equal(await page.locator('[data-experience-capability="els-line-inspection"]').innerText().then(text=>text.includes('לאורך הציר · התורה')),true);
   await activate(page,'מקור הממצא הנבחר');
   await page.waitForFunction(id=>window.__lens?.lens==='verse-context'&&window.__lens?.hitId===id&&window.__lens?.target?.term==='התורה',hit.hitId);
   await expectStable(page,secondaryPan,'inline source');assert.equal(await input.isVisible(),true);
   assert.equal(await button(page,'בחר ציר לסריקה: התורה').isVisible(),true);
   // A delayed old primary completion must not replace the selected secondary result.
   await injectToolMessage(page,primary);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal(await page.locator('[data-experience-capability="els-line-inspection"]').count(),0,'stale primary scan cannot replace the newer inline source');
   const body=page.locator('.els29-native-rail-scroll').filter({visible:true});
   await body.evaluate(element=>element.scrollTop=element.scrollHeight);
   await alignedPanel(page,'scrolled rail');
   for(const label of ['סרוק לאורך הציר הנבחר','מקור הממצא הנבחר']){
    const action=await button(page,label).boundingBox(),panel=await page.locator('.els29-native-context-panel').boundingBox();
    assert.ok(action.height>=44&&action.y>=panel.y&&action.y+action.height<=panel.y+panel.height+1,label+' stays reachable in the persistent footer');
   }
   await expectStable(page,secondaryPan,'internal rail scroll');
  });
 });

test('native UI: selected targets are invalidated by radius, hiding, removal and a new main axis',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   await addSecondary(page,'תורה');await selectAxis(page,'תורה');
   const initial=await page.evaluate(()=>window.__state),old=initial.findings.find(f=>f.t==='תורה').hits.find(h=>h.shown&&h.verified);
   assert.ok(old.axisDistance>1,'fixture has a secondary hit outside the narrow radius');
   await radius(page,1);
   await page.waitForFunction(()=>window.__state?.findings?.find(f=>f.t==='תורה')?.hits?.every(hit=>!hit.shown||hit.axisDistance<=1));
   assert.notEqual(await button(page,'בחר ציר לסריקה: תורה').getAttribute('aria-pressed'),'true','radius invalidates the unavailable selected hit');
   assert.equal(await page.locator('[data-experience-capability="els-line-inspection"]').count(),0);
   await radius(page,null);await page.waitForFunction(()=>window.__state?.findings?.find(f=>f.t==='תורה')?.hits?.some(hit=>hit.shown&&hit.verified));
   await selectAxis(page,'תורה');
   await activate(page,'מופעים וצבע של תורה');
   const group=page.locator('.els29-native-finding-group').filter({has:page.getByRole('button',{name:'בחר ציר לסריקה: תורה',exact:true})});
   await group.locator('input[type="checkbox"]:checked').first().dispatchEvent('click');
   await page.waitForFunction(id=>!window.__state?.findings?.find(f=>f.t==='תורה')?.hits?.some(hit=>hit.hitId===id&&hit.shown),old.hitId);
   assert.notEqual(await button(page,'בחר ציר לסריקה: תורה').getAttribute('aria-pressed'),'true','hiding invalidates the selected hit');
   await activate(page,'מחק את המילה תורה וכל מופעיה');
   await page.waitForFunction(()=>!window.__state?.findings?.some(f=>f.t==='תורה'));
   assert.equal(await button(page,'בחר ציר לסריקה: תורה').count(),0);
   await selectAxis(page,golden.term);
   await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('אליהו');await activate(page,'חפש');
   await page.waitForFunction(()=>window.__state?.term==='אליהו'&&window.__state?.status==='ok');
   assert.equal(await button(page,'בחר ציר לסריקה: '+golden.term).count(),0,'old primary target disappears after main-axis replacement');
   await selectAxis(page,'אליהו');await activate(page,'סרוק לאורך הציר הנבחר');
   await page.waitForFunction(()=>window.__lens?.lens==='line-context'&&window.__lens?.word==='אליהו'&&window.__lens?.scan);
   // Exhaustive low-skip discovery changes the first Elijah matrix. Use a fixed,
   // known window for the cancellation race so a secondary candidate must exist.
   await page.locator('iframe').evaluate((element,item)=>element.contentWindow.postMessage({source:'sod-host',type:'load-matrix',item},location.origin),golden);
   await page.waitForFunction(id=>window.__state?.axis?.hitId===id,`${golden.skip}_${golden.dir}_${golden.start}`);
   const reloadItem=await page.evaluate(()=>{const state=window.__state;return{term:state.term,scope:state.scope,skip:state.axis.skip,start:state.axis.start,dir:state.axis.direction==='back'?-1:1}});
   const restoredAxis=await page.evaluate(()=>window.__state.axis.hitId);
   // A same-axis reload must terminate pending operations even without an axis identity change.
   for(const kind of ['findings','search']){
    await page.evaluate(()=>{window.__fixtureHoldVerification=true;delete window.__fixtureReleaseVerification});
    if(kind==='findings'){
     await page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true}).fill('תורה');await activate(page,'חפש במטריצה');
    }else{
     await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('משיח');await activate(page,'חפש');
    }
    await page.waitForFunction(()=>typeof window.__fixtureReleaseVerification==='function');
    const requestId=await page.evaluate(currentKind=>window.__hostLog.findLast(message=>message.type===(currentKind==='search'?'native-search':'update-findings')).requestId,kind);
    await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureHeldRelease=window.__fixtureReleaseVerification});
    await page.locator('iframe').evaluate((element,item)=>element.contentWindow.postMessage({source:'sod-host',type:'load-matrix',item},location.origin),{...reloadItem,id:'same-axis-'+kind+'-cancel'});
    await page.waitForFunction(({kind,requestId})=>window.__log.some(message=>message.type==='operation'&&message.kind===kind&&message.requestId===requestId&&message.status==='cancelled'),{kind,requestId});
    await page.waitForFunction(id=>window.__state?.provenance?.editId===id,'same-axis-'+kind+'-cancel');
    await page.waitForFunction(()=>!document.querySelector('.els29-native-search').disabled&&!document.querySelector('[aria-label="חיפוש משני במטריצה"]').disabled);
    assert.equal(await page.evaluate(()=>window.__state.axis.hitId),restoredAxis,'reload retains the same main axis');
    await page.evaluate(()=>window.__fixtureHeldRelease());
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(()=>window.__state.axis.hitId),restoredAxis,'late cancelled verification cannot replace the restored axis');
   }
  });
 });

test('native UI: inline mobile tools and wide 90% panels preserve geometry, pan and reachable height controls',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:2560,height:1000},async page=>{
   const margins=await page.evaluate(()=>{const frame=document.querySelector('.sod29-main').getBoundingClientRect(),content=document.querySelector('.sod29-content').getBoundingClientRect();return{ratio:content.width/frame.width,left:content.left-frame.left,right:frame.right-content.right}});
   assert.ok(Math.abs(margins.ratio-.9)<=.001&&Math.abs(margins.left-margins.right)<=1);
   assert.ok((await capture(page)).width>1450);await alignedPanel(page,'wide pinned rail');
   const pinned=await pan(page);await activate(page,'בטל הצמדה');const overlay=await pan(page);assert.ok(overlay.width>pinned.width);
   await activate(page,'סגור כלי מטריצה');await expectStable(page,overlay,'overlay close');await openPanel(page);await expectStable(page,overlay,'overlay reopen');
   await activate(page,'הצמד');const repinned=await pan(page);assert.ok(Math.abs(repinned.width-pinned.width)<=1);
   const baseline=await stageHeight(page);await activate(page,'הגדל גובה ב־50%');assert.ok(Math.abs(await stageHeight(page)-baseline*1.5)<=1);await alignedPanel(page,'expanded pinned rail');
   await activate(page,'חזור לגובה הרגיל');await alignedPanel(page,'restored pinned rail');
   await activate(page,'סגור כלי מטריצה');await expectHeightControl(page);
   await page.setViewportSize({width:390,height:844});await openPanel(page);
   const before=await pan(page),sheet=page.getByRole('complementary',{name:'כלי ELS והקשר המטריצה',exact:true});
   const bounds=await sheet.boundingBox();assert.ok(bounds.height<=844-200&&bounds.x>=0&&bounds.x+bounds.width<=390);
   assert.equal(await page.locator('.els29-native-panel-wrap').evaluate(el=>getComputedStyle(el).position),'relative');
   await inspectAndScanPrimary(page,before);
   await activate(page,'סגור כלי מטריצה');await expectHeightControl(page);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  });
 });

test('native UI: mobile scan is inline below the matrix and supports native clipboard paste',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  for(const width of [320,360,390])await withNative({width,height:844},async page=>{
   const panel=page.getByRole('complementary',{name:'כלי ELS והקשר המטריצה',exact:true});
   const dock=page.getByRole('toolbar',{name:'מסלול המחקר והפעולות הזמינות עכשיו',exact:true});
   await button(page,'סריקה וממצאים').tap();
   const before=await identity(page);
   const unobscured=async(label)=>{
    const bounds=await panel.boundingBox(),bar=await dock.boundingBox();
    assert.ok(bounds.y>=0&&bounds.y+bounds.height<=bar.y-1,`${width} ${label}: inline panel ${JSON.stringify(bounds)} clears dock ${JSON.stringify(bar)}`);
    const layout=await page.evaluate(()=>({
      position:getComputedStyle(document.querySelector('.els29-native-panel-wrap')).position,
      matrixEnd:document.querySelector('.els29-native-stage-column').getBoundingClientRect().bottom,
      panelStart:document.querySelector('.els29-native-panel-wrap').getBoundingClientRect().top,
      overflow:document.documentElement.scrollWidth>innerWidth,
    }));
    assert.equal(layout.position,'relative');assert.ok(layout.panelStart>=layout.matrixEnd);
    assert.equal(layout.overflow,false,`${width} ${label}: no horizontal overflow`);
    assert.equal(await button(page,'בטל הצמדה').count(),0,'mobile region is always in the page flow');
    for(const name of ['סגור כלי מטריצה','סרוק לאורך הציר הנבחר']){
     const target=button(page,name),rect=await target.boundingBox();
     assert.ok(rect.width>=44&&rect.height>=44,`${width} ${name}: touch target`);
     assert.ok(await target.evaluate(element=>{const r=element.getBoundingClientRect();return element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),`${width} ${name}: no overlay intercepts the control`);
    }
   };
   await unobscured('open');
   await page.setViewportSize({width,height:568});await unobscured('short viewport');
   await page.setViewportSize({width,height:844});
   await page.context().grantPermissions(['clipboard-read','clipboard-write']);
   await page.evaluate(()=>navigator.clipboard.writeText('תורה'));
   const input=page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true});
   await input.tap();await input.press('Control+V');
   assert.equal(await input.inputValue(),'תורה',`${width}: browser paste reaches the controlled input`);
   await button(page,'חפש במטריצה').tap();
   await page.waitForFunction(()=>window.__state?.findings?.some(f=>f.t==='תורה'));
   // Inline content follows page scroll; it is not pinned to viewport coordinates.
   await panel.evaluate(el=>el.scrollIntoView({block:'start'}));
   await unobscured('after pasted search');
   await dock.getByRole('button',{name:'רזיאל',exact:true}).tap();
   assert.equal(await page.evaluate(()=>window.__dockAction),'רזיאל');
   assert.equal(await panel.isVisible(),true,'an inline region does not compete with the global dock');
   await button(page,'סרוק לאורך הציר הנבחר').tap();
   await button(page,'סמן את תורה ברצף').waitFor();
   await unobscured('after scan');
   assert.deepEqual((await identity(page)).axis,before.axis,`${width}: tools preserve the axis`);
   await button(page,'סגור כלי מטריצה').tap();
   assert.equal(await panel.isVisible(),false);
  },{mobile:true});
 });

test('native UI: actual SystemFrame dock owns search, tools, Raziel and registration cleanup',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  for(const width of [320,390,1440])await withNative({width,height:900},async page=>{
   const dock=page.getByRole('toolbar',{name:'מסלול המחקר והפעולות הזמינות עכשיו',exact:true});
   await page.waitForFunction(()=>document.querySelector('.sod29-command-island')?.dataset.commandMode==='tool');
   assert.equal(await dock.count(),1);assert.equal(await page.locator('.els29-native-toolstrip:visible').count(),1);
   const before=await identity(page),commands=await page.evaluate(()=>window.__hostLog.length);
   const orb=()=>dock.locator('.sod29-raziel-orb');
   const orbX=(await orb().boundingBox()).x;
   for(const item of await dock.locator('button').all()){
    const box=await item.boundingBox();assert.ok(box.width>=44&&box.height>=44,`${width}: dock target ${JSON.stringify(box)}`);
    const label=item.locator('small');if(await label.count())assert.ok(await label.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=14),'dock labels remain readable');
   }
   await dock.getByRole('button',{name:'חיפוש בצופן',exact:true}).click();
   assert.equal(await page.getByRole('dialog').count(),0,'local Search focuses the inline form');
   assert.equal(await page.locator('#els29-query input').first().evaluate(el=>el===document.activeElement),true);
   const panel=page.locator('#els29-context-panel');
   for(const [label,title] of [['שמירה','שמירה והמשך מחקר'],['תוצאות','תוצאות החיפוש'],['סריקה וממצאים','סריקה וממצאים']]){
    await dock.getByRole('button',{name:label,exact:true}).click();
    assert.equal(await panel.locator('header strong').innerText(),title);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
    assert.equal(await page.getByRole('dialog').count(),0,'native tool stays in its page region');
   }
   const localTools=page.getByRole('group',{name:'כלי המטריצה'});
   for(const [label,title] of [['שמירה','שמירה והמשך מחקר'],['תוצאות','תוצאות החיפוש'],['סריקה וממצאים','סריקה וממצאים']]){
    await localTools.getByRole('button',{name:label,exact:true}).click();
    assert.equal(await panel.locator('header strong').innerText(),title,'the local launchers open the same panel as the dock');
    assert.equal(await dock.getByRole('button',{name:label,exact:true}).getAttribute('aria-expanded'),'true');
   }
   if(width<981){
    const position=await page.locator('.els29-native-panel-wrap').evaluate(el=>getComputedStyle(el).position);assert.equal(position,'relative');
    const bounds=await panel.boundingBox(),bar=await dock.boundingBox();assert.ok(bounds.y+bounds.height<bar.y,'inline tools clear the one dock');
   }
   await orb().click();
   if(width<981){
    await page.getByRole('dialog',{name:'רזיאל',exact:true}).waitFor();
    assert.equal(await page.getByRole('dialog').count(),1);
   }else{
    const raziel=page.locator('.sod29-companion-raziel');
    await raziel.waitFor({state:'visible'});
    await page.waitForFunction(()=>document.querySelector('.sod29-companion-raziel input')===document.activeElement);
    assert.equal(await page.getByRole('dialog').count(),0,'desktop Raziel uses the existing companion without a second dialog');
   }
   assert.ok(await dock.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),'Raziel keeps the dock reachable');
   await dock.getByRole('button',{name:'שמירה',exact:true}).click();
   assert.equal(await page.getByRole('dialog').count(),0,'a native action dismisses the shared transient');
   await dock.getByRole('button',{name:'פעולות המערכת',exact:true}).click();
   assert.equal(await dock.getAttribute('data-command-mode'),'global');
   assert.ok(Math.abs((await orb().boundingBox()).x-orbX)<1,'Raziel keeps its stable slot');
   // The central single command bar keeps global search and return-to-tool in More.
   await dock.getByRole('button',{name:'עוד · פעולות וכלים',exact:true}).click();
   const more=page.getByRole('dialog',{name:'פעולות וכלים',exact:true});
   await more.getByRole('button',{name:'חיפוש',exact:true}).click();
   await page.getByRole('dialog',{name:'חיפוש',exact:true}).waitFor();
   await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
   await dock.getByRole('button',{name:'עוד · פעולות וכלים',exact:true}).click();
   await more.getByRole('button',{name:'חזור לכלי הצופן',exact:true}).click();
   assert.equal(await dock.getAttribute('data-command-mode'),'tool');
   assert.deepEqual((await identity(page)).axis,before.axis);
   assert.equal(await page.evaluate(()=>window.__hostLog.length),commands,'changing panels never executes an engine search');
   assert.equal(await page.locator('iframe').count(),1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(process.env.ELS_SCREENSHOT_DIR){await dock.getByRole('button',{name:'סריקה וממצאים',exact:true}).click();await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`dock-frame-${width}.png`)});}
   await page.evaluate(()=>window.__setNativeVisible(false));
   await page.waitForFunction(()=>!document.querySelector('.sod29-command-island')?.dataset.toolOwner);
   assert.equal(await dock.getAttribute('data-command-mode'),'global');
   assert.equal(await dock.locator('[data-tool-action]').count(),0,'leaving the matrix removes its tool registration');
   assert.equal(await dock.getByRole('button',{name:/^עכשיו(?: · \d+ חדשים)?$/}).count(),1);
   await dock.getByRole('button',{name:/^עכשיו(?: · \d+ חדשים)?$/}).click();
   assert.equal(await page.getByRole('dialog',{name:'עכשיו',exact:true}).getByRole('button',{name:'עכשיו · בשבילי',exact:true}).count(),1);
   await page.keyboard.press('Escape');
  },{fullFrame:true,leavesMatrix:true,mobile:width<981});
 });

test('native UI: vivid colors and exact finding focus stay readable in every theme without changing research',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   await addSecondary(page,'תורה');await addSecondary(page,'התורה');
   const baseline=await identity(page);
   const requests=await page.evaluate(()=>window.__hostLog.length);
   const contrast=(a,b)=>{
    const lum=color=>{
     const channels=color.startsWith('#')?color.slice(1).match(/../g).map(x=>parseInt(x,16)):color.match(/[\d.]+/g).slice(0,3).map(x=>Number(x)*(color.startsWith('color(srgb')?255:1));
     const linear=channels.map(x=>{const c=x/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
     return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
    };
    const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
   };
   const activeIndices=()=>page.locator('.els29-native-cell.is-active-finding').evaluateAll(cells=>cells.map(c=>Number(c.dataset.elsIndex)).sort((a,b)=>a-b));
   const sourceIndices=await page.evaluate(()=>{
    const f=window.__state.findings.find(f=>f.t==='תורה');
    const h=[...f.hits,...f.sourceHits].find(h=>h.shown&&h.withinRadius!==false&&(h.verified||h.kind==='source-sequence'));
    const [skip,dir,start]=h.hitId.split('_').map(Number);
    const visible=new Set([...document.querySelectorAll('.els29-native-cell')].map(c=>Number(c.dataset.elsIndex)));
    return Array.from(f.t,(_,i)=>start+Math.abs(skip)*dir*i).filter(i=>visible.has(i)).sort((a,b)=>a-b);
   });
   assert.ok(sourceIndices.length>0);
   const surfaces=[];
   for(const preset of ['dark','light','parchment']){
    await page.evaluate(preset=>window.__setThemePreset(preset),preset);
    await selectAxis(page,'תורה');
    assert.deepEqual(await activeIndices(),sourceIndices,`${preset}: highlight only the selected exact occurrence`);
    const colors=await page.evaluate(()=>{
     const cell=document.querySelector('.els29-native-cell.is-active-finding');
     const plain=document.querySelector('.els29-native-cell:not(.is-axis):not(.is-finding):not(.is-source-text)');
     const matrix=document.querySelector('.els29-native-matrix-scroll');
     const row=document.querySelector('.els29-native-finding-group.is-selected .els29-native-color-dot');
     const selectedRow=row.closest('.els29-native-finding-group');
     const {findingColorChoices,projectFindingColor,nextFindingColor,resolve2029Palette}=window.__findingColors;
     const palette=resolve2029Palette(document.documentElement.dataset.themePreset,'research_lab');
     const choices=findingColorChoices(palette),assigned=[];
     for(let i=0;i<12;i++)assigned.push({color:nextFindingColor(assigned,palette)});
     return {fill:getComputedStyle(cell).backgroundColor,ink:getComputedStyle(cell).color,swatch:getComputedStyle(row).backgroundColor,rowInk:getComputedStyle(selectedRow.querySelector('small')).color,rowFill:getComputedStyle(selectedRow).backgroundColor,plain:getComputedStyle(plain).color,canvas:getComputedStyle(matrix).backgroundColor,panel:palette.card,onMark:palette.matrix.onMark,axis:palette.matrix.axis,choices,assigned:assigned.map(f=>projectFindingColor(f.color,palette))};
    });
    assert.equal(colors.fill,colors.swatch,`${preset}: selected row and matrix share a color`);
    assert.notEqual(colors.canvas,colors.panel);
    assert.ok(contrast(colors.fill,colors.ink)>=4.5,`${preset}: selected letters meet readable contrast`);
    assert.ok(contrast(colors.rowFill,colors.rowInk)>=4.5,`${preset}: selected finding details meet readable contrast`);
    assert.ok(contrast(colors.canvas,colors.plain)>=4.5,`${preset}: source letters meet readable contrast`);
    assert.ok(contrast(colors.axis,colors.onMark)>=4.5,`${preset}: yellow axis contrast`);
    assert.equal(new Set(colors.assigned).size,12,'automatic colors remain distinct up to the finding limit');
    assert.equal(colors.choices[0].label,'אדום');
    for(const choice of colors.choices)assert.ok(contrast(choice.color,colors.onMark)>=4.5,`${preset} ${choice.label}: mark contrast`);
    surfaces.push(colors.canvas);
    await selectAxis(page,golden.term);
    const axis=await page.locator('.els29-native-cell.is-axis').evaluateAll(cells=>cells.map(c=>Number(c.dataset.elsIndex)).sort((a,b)=>a-b));
    assert.deepEqual(await activeIndices(),axis,`${preset}: primary selection returns to the yellow axis`);
    await selectAxis(page,'תורה');
    assert.deepEqual(await activeIndices(),sourceIndices,`${preset}: repeated selection stays on the same occurrence`);
    if(process.env.ELS_SCREENSHOT_DIR){
     mkdirSync(process.env.ELS_SCREENSHOT_DIR,{recursive:true});
     await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`matrix-${preset}-desktop.png`),fullPage:true});
    }
    await page.setViewportSize({width:390,height:844});
    await activate(page,'סגור כלי מטריצה');
    await page.locator('.els29-native-matrix-scroll').evaluate(el=>el.scrollIntoView({block:'start'}));
    assert.deepEqual(await activeIndices(),sourceIndices,`${preset}: closing mobile panel retains the selected finding`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(process.env.ELS_SCREENSHOT_DIR)await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`matrix-${preset}-mobile.png`)});
    await page.setViewportSize({width:1440,height:1000});
   }
   assert.equal(new Set(surfaces).size,3,'each theme has a distinct matrix surface');
   assert.deepEqual(await identity(page),baseline,'colors, selection and theme never alter canonical research');
   assert.equal(await page.evaluate(()=>window.__hostLog.length),requests,'selecting and changing theme never reruns or recolors the engine');
  });
 });

test('native UI: unified scan recovers from Classic; heat paints only unmarked cells without changing research state',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   const url=page.url();await selectAxis(page,golden.term);await activate(page,'כל הכלים');
   assert.equal(await page.locator('.els29-classic-fallback.is-open').count(),1);
   await page.getByRole('button',{name:'סרוק לאורך הציר הנבחר',exact:true,includeHidden:true}).dispatchEvent('click');
   await button(page,'סמן את תורה ברצף').waitFor();await expectNative(page,url,'scan after Classic');
   await activate(page,'סגור כלי מטריצה');await revealMatrixOption(page,'מפת חום');await button(page,'מפת חום').scrollIntoViewIfNeeded();
   const initial=await identity(page),before=await pan(page);
   const marked=()=>page.locator('.els29-native-cell.is-axis,.els29-native-cell.is-finding').evaluateAll(cells=>cells.map(cell=>({index:cell.dataset.elsIndex,background:getComputedStyle(cell).backgroundColor,color:getComputedStyle(cell).color})));
   const backgrounds=()=>page.locator('.els29-native-cell:not(.is-axis):not(.is-finding)').evaluateAll(cells=>cells.map(cell=>getComputedStyle(cell).backgroundColor));
   const originalMarks=await marked(),originalBackgrounds=await backgrounds();
   await activate(page,'מפת חום');await page.waitForFunction(()=>window.__state?.ui?.heat===true);
   assert.deepEqual(await marked(),originalMarks);assert.notDeepEqual(await backgrounds(),originalBackgrounds);assert.deepEqual(await identity(page),initial);await expectStable(page,before,'heat on');
   await activate(page,'מפת חום');await page.waitForFunction(()=>window.__state?.ui?.heat===false);
   assert.deepEqual(await marked(),originalMarks);assert.deepEqual(await backgrounds(),originalBackgrounds);await expectStable(page,before,'heat off');
  },{researchProfile:false});
 });

test('native UI: fresh anonymous 2029 searches bypass legacy demo gates while canonical verification remains required',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   const url=page.url();assert.equal(await page.evaluate(()=>localStorage.getItem('tzofen_onboarded_v1')),null);
   assert.ok((await page.locator('iframe').getAttribute('src')).includes('experience=2029'));
   for(const [index,term] of ['תורה','אליהו','דוד','משיח'].entries()){
    const oldOperation=await page.evaluate(()=>window.__operation);
    if(index===3)await page.evaluate(()=>window.__fixtureHoldVerification=true);
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill(term);await activate(page,'חפש');
    if(index===3){
     await page.waitForFunction(()=>typeof window.__fixtureReleaseVerification==='function');
     assert.equal(await page.locator('.els29-native-search').isDisabled(),true,'primary search stays disabled while verification is pending');
     await openPanel(page);
     await revealMatrixOption(page,'התאם מטריצה למסך');
     for(const label of ['סרוק לאורך הציר הנבחר','מקור הממצא הנבחר','חפש במטריצה','הגדל מטריצה','התאם מטריצה למסך'])assert.equal(await button(page,label).isDisabled(),true,label+' is disabled during main verification');
     assert.equal(await page.getByLabel('גודל חלון החיפוש',{exact:true}).isDisabled(),true);
     assert.equal(await page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true}).isDisabled(),true);
     assert.equal(await page.getByLabel('מרחק מרבי מהציר הראשי',{exact:true}).isDisabled(),true);
     const requests=await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='native-search').length);
     await page.locator('.els29-native-search').evaluate(element=>{element.click();element.click();element.click()});
     assert.equal(await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='native-search').length),requests,'disabled search ignores repeated clicks');
     await injectToolMessage(page,{...oldOperation,status:'done'});
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     assert.equal(await page.locator('.els29-native-search').isDisabled(),true,'stale completion cannot clear the current pending search');
     await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification()});
    }
    await page.waitForFunction(word=>window.__state?.term===word&&window.__state?.status==='ok'&&window.__state?.verification?.state==='MATCH',term,{timeout:60000});
    await page.waitForFunction(()=>!document.querySelector('.els29-native-search').disabled);
    await expectNative(page,url,'fresh anonymous '+term);
   }
   await activate(page,'כל התנ״ך');await page.waitForFunction(()=>window.__state?.scope==='tanakh'&&window.__state?.status==='ok');
   assert.equal(await page.evaluate(()=>window.__log.some(message=>message.type==='gate'||message.type==='onboarding-required')),false,'no local demo or scope signup gates');
   assert.equal(await page.locator('[data-fixture-subscribe-gate]').count(),0);
   assert.equal(await page.evaluate(()=>localStorage.getItem('tzofen_onboarded_v1')),null);
   await page.evaluate(()=>window.__fixtureVerificationDenied=true);
   await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('גאולה');await activate(page,'חפש');
   await page.waitForFunction(()=>window.__state?.term==='גאולה'&&window.__state?.status==='candidate');
   assert.notEqual(await page.evaluate(()=>window.__state.verification.state),'MATCH','server verification denial still fails closed');
   assert.equal(await page.locator('.els29-native-cell.is-axis').count(),0);
   await expectNative(page,url,'canonical verification denial');
  },{realHost:true,loadGolden:false,onboarded:false,tier:'anon'});
 });

test('native UI: compact findings, vowels and classic letters retain exact base letters and source indices',
  { skip: !canRun && 'Native browser tooling unavailable', timeout: 180000 }, async () => {
    await withNative({ width: 1440, height: 1000 }, async (page) => {
      await addSecondary(page, 'תורה');
      const finding = page.locator('.els29-native-finding-group').filter({ has: page.getByRole('button', { name: 'בחר ציר לסריקה: תורה', exact: true }) });
      assert.equal(await finding.count(), 1);
      for (const name of ['בחר ציר לסריקה: תורה', 'מופעים וצבע של תורה']) {
        const target = finding.getByRole('button', { name, exact: true });
        const bounds = await target.boundingBox();
        assert.ok(bounds.width >= 44 && bounds.height >= 44, `${name}: compact action retains a usable hit target`);
      }
      const disclosure = finding.getByRole('button', { name: 'מופעים וצבע של תורה', exact: true });
      assert.equal(await disclosure.getAttribute('aria-expanded'), 'false', 'extra controls start collapsed');
      const extraId = await disclosure.getAttribute('aria-controls');
      const extra = page.locator(`[id="${extraId}"]`);
      assert.equal(await extra.isVisible(), false, 'occurrence and color controls stay out of the compact row');
      const row = await finding.boundingBox();
      assert.ok(row.height < 200, 'finding uses two compact rows at rest');
      await disclosure.dispatchEvent('click');
      assert.equal(await disclosure.getAttribute('aria-expanded'), 'true');
      assert.equal(await extra.isVisible(), true, 'one disclosure reveals the occurrence and color controls');
      for(const name of ['העלה את תורה','הורד את תורה','מחק את המילה תורה וכל מופעיה']){const bounds=await finding.getByRole('button',{name,exact:true}).boundingBox();assert.ok(bounds.width>=44&&bounds.height>=44,name+' remains touch accessible inside the disclosure');}
      await disclosure.dispatchEvent('click');
      await activate(page, 'סגור כלי מטריצה');
      const url = page.url();
      const baseline = await identity(page);
      const baseCells = () => page.locator('.els29-native-cell').evaluateAll((cells) => cells.map((cell) => ({ index: cell.dataset.elsIndex, text: cell.textContent.replace(/[\u0591-\u05C7]/g, '') })));
      const original = await baseCells();
      const engineRows = await page.evaluate(() => window.__state.matrix.rows);
      const mainIndex = baseline.axis.start;
      const showSource = async (label) => {
        // A real pointer click also checks that the transformed/vowel cell remains reachable.
        await page.locator(`[data-els-index="${mainIndex}"]`).click();
        await page.waitForFunction((index) => window.__lens?.lens === 'letter-context' && window.__lens?.index === index, mainIndex);
        assert.equal(await page.evaluate(() => window.__lens.letter), original.find((cell) => Number(cell.index) === mainIndex).text, `${label}: exact base letter source`);
        await expectNative(page, url, label);
        await activate(page, 'סגור כלי מטריצה');
      };

      await activate(page, 'ניקוד');
      await page.waitForFunction(() => window.__state?.ui?.niqqud === true && window.__state?.matrix?.niqqud?.cells?.length > 0);
      assert.ok(await page.locator('.els29-native-cell').evaluateAll((cells) => cells.some((cell) => /[\u0591-\u05C7]/.test(cell.textContent))), 'canonical Torah vowels appear on the same cells');
      assert.deepEqual(await baseCells(), original, 'vowels keep every base letter and index');
      assert.deepEqual(await page.evaluate(() => window.__state.matrix.rows), engineRows, 'vowels do not alter canonical matrix rows');
      assert.deepEqual(await identity(page), baseline);
      await showSource('vowel cell inspection');
      await activate(page, 'ניקוד');
      await page.waitForFunction(() => window.__state?.ui?.niqqud === false);
      assert.equal(await page.locator('.els29-native-cell').evaluateAll((cells) => cells.some((cell) => /[\u0591-\u05C7]/.test(cell.textContent))), false, 'vowels off restores the original text');

      for (const [label, className] of [['אותיות קלאסיות', 'is-classic-glyphs']]) {
        const originalFont = await page.locator('.els29-native-cell').first().evaluate((cell) => getComputedStyle(cell).fontFamily);
        await activate(page, label);
        assert.equal(await button(page, label).getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator(`.els29-native-matrix.${className}`).count(), 1);
        assert.deepEqual(await baseCells(), original, `${label}: unchanged letters and indices`);
        assert.deepEqual(await identity(page), baseline, `${label}: unchanged verified identity`);
        assert.notEqual(await page.locator('.els29-native-cell').first().evaluate((cell) => getComputedStyle(cell).fontFamily), originalFont, 'classic mode changes the displayed letter font');
        await showSource(`${label} cell inspection`);
        await activate(page, label);
        assert.equal(await button(page, label).getAttribute('aria-pressed'), 'false');
        assert.equal(await page.locator(`.els29-native-matrix.${className}`).count(), 0);
        assert.deepEqual(await baseCells(), original, `${label}: reversible presentation`);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      for (const label of ['אותיות קלאסיות']) {
        const target = await button(page, label).boundingBox();
        assert.ok(target.width >= 44 && target.height >= 44, `${label}: mobile touch control stays usable`);
        await activate(page, label);
        assert.deepEqual(await baseCells(), original, `${label}: mobile preserves letters and indices`);
        await showSource(`mobile ${label}`);
        await activate(page, label);
      }
      await activate(page, 'ניקוד');
      await page.waitForFunction(() => window.__state?.ui?.niqqud === true);
      assert.deepEqual(await baseCells(), original, 'mobile vowels preserve base letters');
      await showSource('mobile vowel source');
      await activate(page, 'ניקוד');
      await page.waitForFunction(() => window.__state?.ui?.niqqud === false);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'presentation modes do not create mobile page overflow');
    });
  });

test('native UI: cross meetings have exact numbered navigation, real compact bounds and adaptive expansion',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:240000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
   const searchCross=async(axis,term,radius=18)=>{
    const seq=await page.evaluate(()=>window.__operation?.requestId||0);
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill(axis);
    if(!(await page.locator('.els29-native-cross-row').count()))await activate(page,'הצלבה בין צירים');
    await page.getByRole('textbox',{name:'מונח שני',exact:true}).fill(term);
    await changeRange(page,'מרחק מרבי מהציר בהצלבה',radius);await activate(page,'חפש הצלבה');
    await page.waitForFunction(n=>window.__operation?.kind==='search'&&window.__operation.requestId>n&&window.__operation.status==='done',seq,{timeout:90000});
   };
   const resize=async(size)=>{
    const seq=await page.evaluate(()=>window.__operation.requestId);
    await page.getByLabel('גודל חלון החיפוש',{exact:true}).selectOption(size);
    await page.waitForFunction(n=>window.__operation?.kind==='search'&&window.__operation.requestId>n&&window.__operation.status==='done',seq,{timeout:90000});
   };
   await searchCross('משיח טבת','ישלח מלאכו');
   const compact=await page.evaluate(()=>window.__state);
   assert.equal(compact.ui.windowSize,'small');assert.equal(compact.geometry.cw,40);assert.equal(compact.ui.ctxR,1);
   assert.equal(compact.search.zones,1);assert.equal(compact.occurrence.count,7);
   assert.equal(await button(page,'מפגש הבא').isDisabled(),true,'one meeting is not seven main-axis occurrences');
   assert.equal(await button(page,'מופע הבא').count(),0,'cross controls do not clear findings by navigating unrelated occurrences');
   assert.equal(await button(page,'פתח מפגש 1').getAttribute('aria-pressed'),'true');
   assert.equal(compact.search.results.items[0].sourceSequence,true,'literal source sequence is distinguished from a verified ELS');
   assert.equal(await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).inputValue(),'משיח טבת');
   const matrix=page.locator('.els29-native-matrix-scroll');await matrix.scrollIntoViewIfNeeded();
   await matrix.evaluate(el=>el.scrollLeft=(el.scrollWidth-el.clientWidth)/2);
   const box=await matrix.boundingBox(),before=await capture(page);
   await page.mouse.move(box.x+box.width/2,box.y+80);await page.mouse.down();
   await page.mouse.move(box.x+box.width/2+80,box.y+80,{steps:8});await page.mouse.up();
   assert.ok((await capture(page)).left<before.left-60,'real mouse drag pans horizontally');
   await matrix.focus();const left=await matrix.evaluate(el=>el.scrollLeft);await page.keyboard.press('ArrowRight');
   assert.ok((await matrix.evaluate(el=>el.scrollLeft))>left,'keyboard can pan the same matrix');
   const oldSet=compact.search.results.id;
   await resize('large');const large=await page.evaluate(()=>window.__state);
   assert.equal(large.geometry.cw,80);assert.equal(large.ui.ctxR,8);
   assert.ok(large.matrix.rows.length*large.geometry.cw>compact.matrix.rows.length*compact.geometry.cw,'larger selection changes canonical search geometry');
   assert.equal(large.search.crossA,'משיח טבת');assert.equal(large.search.crossB,'ישלח מלאכו');
   await resize('small');await searchCross('משיח טבת','ישלח מלאכו',20);
   const expanded=await page.evaluate(()=>window.__state);
   assert.equal(expanded.ui.windowRequested,'small');assert.equal(expanded.ui.windowSize,'medium');assert.equal(expanded.geometry.cw,60);
   assert.equal(await page.getByText('החלון הורחב כדי להכיל את הציר והמרחק',{exact:true}).count(),1);
   await searchCross('משיח','גאולה',18);
   const multi=await page.evaluate(()=>window.__state);
   assert.ok(multi.search.zones>1,'fixture has multiple canonical meetings');
   await activate(page,'מפגש הבא');await page.waitForFunction(()=>window.__state.search.zoneIndex===1);
   assert.equal((await page.evaluate(()=>window.__state)).axis.hitId,multi.search.results.items[1].hitId);
   assert.ok((await page.evaluate(()=>window.__state)).findings.length>0,'meeting navigation retains the secondary terms');
   await page.evaluate(setId=>document.querySelector('iframe').contentWindow.postMessage({source:'sod-host',type:'native-control',action:'meeting-select',value:{setId,index:0}},location.origin),oldSet);
   await page.waitForFunction(setId=>window.__hostLog.some(message=>message.action==='meeting-select'&&message.value?.setId===setId),oldSet);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert.equal((await page.evaluate(()=>window.__state)).search.zoneIndex,1,'stale result-list selection cannot open a different meeting in the current list');
   await page.locator('.els29-native-results summary').click();
   await page.getByLabel('מיון מפגשי ההצלבה',{exact:true}).selectOption('skip');
   const skips=await page.locator('.els29-native-result b').allTextContents();
   const numbers=skips.map(s=>Number(s.match(/דילוג (\d+)/)[1]));assert.deepEqual(numbers,[...numbers].sort((a,b)=>a-b));
   const visibleLabel=await page.locator('.els29-native-result').first().getAttribute('aria-label');
   const sortedIndex=Number(visibleLabel.match(/\d+/)[0])-1;
   const third=multi.search.results.items.find(item=>item.available&&item.index===sortedIndex);
   assert.ok(third);await activate(page,visibleLabel);await page.waitForFunction(index=>window.__state.search.zoneIndex===index,sortedIndex);
   assert.equal((await page.evaluate(()=>window.__state)).axis.hitId,third.hitId,'sorting retains original exact meeting identity');
   const skipFilter=page.getByLabel('דילוג מינימלי בתוצאות',{exact:true});
   // Browser focus may reveal the field after the taller search controls. Measure
   // filtering itself only after focus, so its no-pan assertion stays meaningful.
   await skipFilter.focus();const panBefore=await capture(page);
   await skipFilter.fill('999999');
   assert.equal(await page.locator('.els29-native-result').count(),0);await expectStable(page,panBefore,'local results filter');
   await page.getByLabel('דילוג מינימלי בתוצאות',{exact:true}).fill('');
   // A saved compact matrix restores its search geometry, and cannot retain the previous cross list.
   const item={term:compact.termRaw,scope:compact.scope,skip:compact.axis.skip,start:compact.axis.start,dir:1,hitId:compact.axis.hitId,words:[],searchWindow:{ctxR:1,windowColumns:40,windowSize:'small',windowRequested:'small'}};
   await page.evaluate(item=>document.querySelector('iframe').contentWindow.postMessage({source:'sod-host',type:'load-matrix',item},location.origin),item);
   await page.waitForFunction(id=>window.__state?.axis?.hitId===id&&window.__state?.search?.mode==='regular',compact.axis.hitId);
   const restored=await page.evaluate(()=>window.__state);assert.equal(restored.search.results,null);assert.equal(restored.geometry.cw,40);assert.equal(restored.ui.ctxR,1);
   await page.evaluate(item=>document.querySelector('iframe').contentWindow.postMessage({source:'sod-host',type:'load-matrix',item},location.origin),{...item,searchWindow:{ctxR:8,windowColumns:80,windowSize:'large',windowRequested:'large'}});
   await page.waitForFunction(()=>window.__state?.ui?.windowRequested==='large');
   assert.equal(await page.getByLabel('גודל חלון החיפוש',{exact:true}).inputValue(),'large','saved search size is reflected by the native control');
   await page.evaluate(item=>document.querySelector('iframe').contentWindow.postMessage({source:'sod-host',type:'load-matrix',item},location.origin),{...item,searchWindow:null});
   await page.waitForFunction(()=>window.__state?.ui?.windowRequested==='legacy');
   assert.equal((await page.evaluate(()=>window.__state)).geometry.cw,80,'older saves retain their original window');
   assert.equal(await page.getByText('מוצג החלון המקורי',{exact:true}).count(),1);
   await activate(page,'חיפוש רגיל');
   await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('תורהקדשה');await activate(page,'חפש');
   await page.waitForFunction(()=>window.__state?.term==='תורהקדשה'&&window.__operation?.status==='done');
   assert.equal((await page.evaluate(()=>window.__state)).search.mode,'regular','fresh regular search clears cross identity');
  },{realHost:true,loadGolden:false,tier:'anon'});
 });

async function reliabilityCross(page, axis, term) {
  const seq=await page.evaluate(()=>window.__operation?.requestId||0);
  await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill(axis);
  if(!(await page.locator('.els29-native-cross-row').count()))await activate(page,'הצלבה בין צירים');
  await page.getByRole('textbox',{name:'מונח שני',exact:true}).fill(term);
  // Historical exact-result goldens exercise the formerly broad search explicitly; default zero-gap is tested separately.
  await page.getByRole('slider',{name:'מרווח מרבי בין אותיות הממצא בהצלבה'}).fill('20');
  await activate(page,'חפש הצלבה');
  await page.waitForFunction(n=>window.__operation?.kind==='search'&&window.__operation.requestId>n&&window.__operation.status==='done',seq,{timeout:90000});
  return page.evaluate(()=>window.__state);
}

test('native transition: minus-two reading layout preserves exact cells and opens names cross without refresh',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    const url=page.url();
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('בעל משבר מאים בעקירה');await activate(page,'חפש');
    await page.waitForFunction(()=>window.__state?.axis?.hitId==='2_-1_49435'&&window.__operation?.status==='done');
    const original=await identity(page);
    const cells=()=>page.locator('.els29-native-cell').evaluateAll(nodes=>nodes.map(n=>({i:Number(n.dataset.elsIndex),text:n.textContent,axis:n.classList.contains('is-axis')})));
    const originalCells=await cells();
    assert.equal(original.geometry.S,2);assert.equal(original.geometry.cw,2);
    assert.equal(originalCells.filter(c=>c.axis).reverse().map(c=>c.text).join(''),'בעלמשברמאימבעקירה');
    assert.equal(await page.locator('.els29-native-matrix.is-reading').count(),1,'short skip defaults to a broad reading layout');
    const rowWidth=()=>page.locator('.els29-native-cell').evaluateAll(nodes=>{const first=nodes[0].getBoundingClientRect();return nodes.filter(n=>Math.abs(n.getBoundingClientRect().top-first.top)<1).length;});
    assert.ok(await rowWidth()>8,'source cells actually reflow into broader rows');
    const beforeMessages=await page.evaluate(()=>window.__hostLog.filter(m=>['native-search','request-lens','native-control'].includes(m.type)).length);
    await page.getByLabel('תצוגת דילוג קטן',{exact:true}).selectOption('columns');
    assert.equal(await rowWidth(),2,'original skip columns remain available');
    assert.deepEqual(await cells(),originalCells);assert.deepEqual(await identity(page),original);
    await page.getByLabel('תצוגת דילוג קטן',{exact:true}).selectOption('reading');
    assert.equal(await page.evaluate(()=>window.__hostLog.filter(m=>['native-search','request-lens','native-control'].includes(m.type)).length),beforeMessages,'changing layout never searches or changes engine geometry');
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:900});
      assert.deepEqual(await cells(),originalCells,'responsive wrapping preserves each exact source index');
      assert.ok(await rowWidth()>2);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-els-index="49435"]').dispatchEvent('click');
    await page.waitForFunction(()=>window.__lens?.lens==='letter-context'&&window.__lens.target?.i===49435);
    assert.equal(await page.evaluate(()=>window.__lens.ok),true,'reading view uses the same exact verse inspection');
    assert.equal(await page.evaluate(()=>window.__lens.letter),'ב');
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('צוריאל');await activate(page,'הצלבה בין צירים');
    await page.getByRole('textbox',{name:'מונח שני',exact:true}).fill('פולייס');
    await page.getByRole('slider',{name:'מרווח מרבי בין אותיות הממצא בהצלבה'}).fill('20');
    assert.equal(await button(page,'חפש הצלבה').count(),1,'one submission control for the active search mode');
    assert.equal(await button(page,'חפש').count(),0);
    // Enter in the PRIMARY input must honor the open cross mode as well.
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).press('Enter');
    await page.waitForFunction(()=>window.__state?.search?.mode==='cross-simple'&&window.__operation?.status==='done');
    const names=await page.evaluate(()=>window.__state);
    assert.equal(names.axis.hitId,'14870_-1_251278');assert.equal(names.search.zones,3);
    assert.equal(names.geometry.cw,40);assert.equal(names.ui.windowSize,'small');
    assert.equal(await page.locator('.els29-native-stage h3').textContent(),'פולייס');
    assert.equal(await page.locator('.els29-native-matrix.is-reading').count(),0,'cross displays its canonical matrix geometry');
    assert.equal(await page.locator('.els29-native-matrix-status').textContent(),'מטריצה פעילה');
    assert.equal(await page.locator('.els29-native-progress').count(),0);
    assert.equal(await page.locator('.els29-native-result').count(),3);
    await activate(page,'מפגש הבא');await page.waitForFunction(()=>window.__state.axis.hitId==='17529_-1_139194');
    assert.equal(await page.locator('.els29-native-stage h3').textContent(),'פולייס');
    await expectNative(page,url,'minus-two to names cross');
  },{realHost:true,loadGolden:false,tier:'anon'});
 });

test('native transition: a failed cross labels the retained result and retry replaces it in the same tab',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('בעל משבר מאים בעקירה');await activate(page,'חפש');
    await page.waitForFunction(()=>window.__state?.axis?.hitId==='2_-1_49435'&&window.__operation?.status==='done');
    const original=await identity(page);
    await page.evaluate(()=>window.__fixtureVerificationDenied=true);
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('צוריאל');await activate(page,'הצלבה בין צירים');
    await page.getByRole('textbox',{name:'מונח שני',exact:true}).fill('פולייס');await activate(page,'חפש הצלבה');
    await page.waitForFunction(()=>window.__operation?.kind==='search'&&window.__operation.status==='error');
    assert.deepEqual(await identity(page),original,'failed verification preserves the last successful matrix');
    assert.match(await page.locator('.els29-native-matrix-status').textContent(),/הממצא הקודם.*לא הושלם/);
    assert.equal(await page.locator('.els29-native-progress').count(),0);
    await page.evaluate(()=>window.__fixtureVerificationDenied=false);
    // Enter in the secondary input follows the SAME form submission and is a real retry.
    await page.getByRole('textbox',{name:'מונח שני',exact:true}).press('Enter');
    await page.waitForFunction(()=>window.__state?.search?.mode==='cross-simple'&&window.__operation?.status==='done');
    assert.equal((await identity(page)).axis.hitId,'14870_-1_251278');
    assert.equal(await page.locator('.els29-native-matrix-status').textContent(),'מטריצה פעילה');
    assert.equal(await page.locator('.els29-native-notice').count(),0);
  },{realHost:true,loadGolden:false,tier:'anon'});
 });

test('native reliability: both user examples, reversed roles, literal source inspection and compact cross geometry',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    const first=await reliabilityCross(page,'משיח טבת עשירי','ישלח מלאכו');
    assert.equal(first.axis.hitId,'1820_1_15170');
    assert.equal(first.geometry.cw,40);assert.equal(first.ui.ctxR,2);assert.equal(first.ui.windowSize,'small');
    const source=first.findings.find(w=>w.t==='ישלחמלאכו');
    assert.deepEqual(source.shown,[],'source is not promoted to canonical ELS');
    assert.equal(source.sourceHits[0].kind,'source-sequence');assert.equal(source.sourceHits[0].shown,true);
    assert.equal(source.sourceHits[0].hitId,'1_1_29729');
    assert.deepEqual(first.matrix.sourceMarks.map(m=>m.i),Array.from({length:9},(_,k)=>29729+k));
    assert.equal(first.matrix.sourceMarks.map(m=>letters[m.i]).join(''),'ישלחמלאכו');
    assert.equal(first.matrix.marks.filter(m=>m.type==='finding').length,0,'canonical marks remain MATCH-only');
    assert.equal(await page.locator('.els29-native-cell.is-source-text').count(),9);
    await selectAxis(page,'ישלחמלאכו');await activate(page,'מקור הממצא הנבחר');
    await page.waitForFunction(()=>window.__lens?.lens==='verse-context'&&window.__lens?.target?.kind==='source-sequence');
    assert.equal(await page.evaluate(()=>window.__lens.hitId),'1_1_29729');
    await activate(page,'סרוק לאורך הציר הנבחר');
    await page.waitForFunction(()=>window.__lens?.lens==='line-context'&&window.__lens?.target?.kind==='source-sequence');
    assert.equal(await page.evaluate(()=>window.__lens.skip),1);
    await activate(page,'מופעים וצבע של ישלחמלאכו');
    const checkbox=page.locator('.els29-native-finding-extra:visible input[type="checkbox"]').first();
    await checkbox.dispatchEvent('click');await page.waitForFunction(()=>window.__state.matrix.sourceMarks.length===0);
    await checkbox.dispatchEvent('click');await page.waitForFunction(()=>window.__state.matrix.sourceMarks.length===9);
    const reverse=await reliabilityCross(page,'ישלח מלאכו','משיח טבת עשירי');
    assert.deepEqual(reverse.search.results.items,first.search.results.items,'input order preserves the exact meeting');
    const names=await reliabilityCross(page,'צוריאל','פולייס');
    assert.equal(names.geometry.cw,40);assert.equal(names.ui.windowSize,'small');
    assert.deepEqual(names.search.results.items.filter(m=>m.sourceSequence).map(m=>m.hitId),['14870_-1_251278','17529_-1_139194']);
    assert.ok(names.search.results.items.some(m=>m.axis==='צוריאל'&&m.hitId==='1418_-1_69122'),'both axis perspectives survive merging');
    assert.ok(!names.search.results.items.some(m=>m.hitId==='23174_-1_216135'),'secondary outside Torah cannot create a meeting');
    assert.equal(names.search.coverage.truncated,true,'bounded coverage is disclosed');
    assert.ok(names.search.coverage.scanned<names.search.coverage.available);
    await activate(page,'מפגש הבא');await page.waitForFunction(()=>window.__state.search.zoneIndex===1);
    assert.equal((await page.evaluate(()=>window.__state)).axis.hitId,'17529_-1_139194');
    await selectAxis(page,'צוריאל');await radius(page,5);
    await page.waitForFunction(()=>window.__state.findings[0].sourceHits[0].withinRadius===false);
    assert.equal(await page.locator('.els29-native-cell.is-source-text').count(),0);
    await radius(page,null);await page.waitForFunction(()=>window.__state.matrix.sourceMarks.length===6);
    const otherOrder=await reliabilityCross(page,'פולייס','צוריאל');
    assert.deepEqual(otherOrder.search.results.items,names.search.results.items);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'source findings preserve mobile bounds');
  },{realHost:true,loadGolden:false,tier:'anon'});
 });

test('native reliability: cancel aborts verification, rolls back secondary edits and rejects late progress after replacement',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    const original=await identity(page);
    await page.evaluate(()=>window.__fixtureHoldVerification=true);
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('ישראל');await activate(page,'חפש');
    await page.waitForFunction(()=>window.__operation?.kind==='search'&&window.__operation.status==='verifying'&&window.__fixtureReleaseVerification);
    const old=await page.evaluate(()=>window.__operation);
    assert.equal(await button(page,'בטל חיפוש').count(),1);
    assert.match(await page.locator('.els29-native-progress').textContent(),/זמן הסיום עדיין לא ידוע/);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'pending progress fits mobile');
    await activate(page,'בטל חיפוש');
    await page.waitForFunction(()=>window.__fixtureAborts>=1);
    assert.equal(await page.locator('.els29-native-progress').count(),0);
    assert.deepEqual(await identity(page),original,'cancel retains the last successful matrix');
    await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification?.();});
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('תורהקדשה');await activate(page,'חפש');
    await page.waitForFunction(()=>window.__state?.term==='תורהקדשה'&&window.__operation.status==='done');
    await injectToolMessage(page,{source:'tzofen',type:'operation',kind:'search',requestId:old.requestId,status:'verifying'});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.locator('.els29-native-progress').count(),0,'late progress cannot reopen loading UI');
    const after=await identity(page), aborts=await page.evaluate(()=>window.__fixtureAborts);
    await page.evaluate(()=>{window.__fixtureHoldVerification=true;window.__fixtureReleaseVerification=null;});
    await openPanel(page);await page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true}).fill('התורה');await activate(page,'חפש במטריצה');
    await page.waitForFunction(()=>window.__operation.kind==='findings'&&window.__operation.status==='verifying'&&window.__fixtureReleaseVerification);
    await activate(page,'בטל חיפוש משני');await page.waitForFunction(n=>window.__fixtureAborts>n,aborts);
    await page.waitForFunction(()=>window.__state.findings.length===0);
    assert.equal(await page.locator('.els29-native-progress').count(),0);
    assert.deepEqual(await identity(page),after,'secondary cancel restores the previous findings');
    await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification?.();});
    const frame=page.frames().find(frame=>frame.parentFrame());
    assert.equal(await frame.locator('#searchLoad.show').count(),0,'native searches do not leave the legacy loader open');
  },{realHost:true});
 });

test('native save: private retry, same-record update and exact restore preserve findings without legacy dialogs or public uploads',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:150000},async()=>{
  await withNative({width:390,height:844},async page=>{
    await openPanel(page);
    await page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true}).fill('התורה');await activate(page,'חפש במטריצה');
    await page.waitForFunction(()=>window.__state?.findings?.some(f=>f.t==='התורה'&&f.shown.length));
    await radius(page,5);
    await activate(page,'שמירה');
    await page.getByRole('textbox',{name:'שם הצופן',exact:true}).fill('מחקר שמור לבדיקה');
    const note='מצאתי הצטלבות מעניינת, ואחזור לבדוק את הפסוקים בהמשך.';
    await page.getByRole('textbox',{name:'מה רואים בצופן?',exact:true}).fill(note);
    await activate(page,'סריקה וממצאים');await activate(page,'שמירה');
    assert.equal(await page.getByRole('textbox',{name:'מה רואים בצופן?',exact:true}).inputValue(),note,'switching tabs preserves the unsaved explanation');
    await page.evaluate(()=>window.__saveFails=true);await activate(page,'שמור אצלי');
    await page.waitForFunction(()=>document.querySelector('.els29-native-save-result')?.textContent.includes('לא הושלמה'));
    assert.equal(await page.getByRole('textbox',{name:'מה רואים בצופן?',exact:true}).inputValue(),note);
    await page.evaluate(()=>window.__saveFails=false);await activate(page,'שמור אצלי');
    await page.waitForFunction(()=>document.querySelector('.els29-native-save-result')?.textContent.includes('נשמר אצלך'));
    if(process.env.ELS_SCREENSHOT_DIR)await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,'save-mobile.png')});
    const saved=await page.evaluate(()=>window.__savedRows[0]);
    const state=await page.evaluate(()=>window.__state);
    assert.equal(saved.start_index,state.axis.start);assert.equal(saved.direction,state.axis.direction);
    assert.equal(saved.title,'מחקר שמור לבדיקה');assert.equal(saved.description,note);
    assert.equal(saved.positions.view.findingRadius,5);
    assert.equal(saved.positions.findings[0].color,state.findings[0].color);
    assert.ok(saved.positions.findings[0].sh.length>0);
    assert.equal(await page.evaluate(()=>window.__saveCalls.every(call=>call.isPublic===false)),true);
    assert.equal(await page.evaluate(()=>window.__publicUploads||0),0);
    assert.equal(await page.locator('.els29-classic-fallback.is-open').count(),0);
    const frame=page.frames().find(f=>f.parentFrame());
    assert.equal(await frame.locator('.shareov').count(),0,'saving never opens the legacy description dialog');
    await page.getByRole('textbox',{name:'שם הצופן',exact:true}).fill('כותרת מעודכנת');await activate(page,'שמור אצלי');
    await page.waitForFunction(()=>window.__savedRows?.[0]?.title==='כותרת מעודכנת');
    assert.equal(await page.evaluate(()=>window.__savedRows.length),1,'repeat saving updates the same exact private record');
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('בעל משבר מאים בעקירה');await activate(page,'חפש');
    await page.waitForFunction(()=>window.__state.axis?.hitId==='2_-1_49435');
    await page.evaluate(row=>window.__openSavedMatrix(row),saved);
    await page.waitForFunction(id=>window.__state?.axis?.hitId===id&&window.__state?.findings?.[0]?.hits?.some(hit=>hit.verified),state.axis.hitId);
    const restored=await page.evaluate(()=>window.__state);
    assert.deepEqual(restored.geometry,state.geometry);
    assert.equal(restored.ui.findingRadius,5);
    assert.deepEqual(restored.findings.map(f=>({t:f.t,color:f.color,shown:f.shown})),state.findings.map(f=>({t:f.t,color:f.color,shown:f.shown})));
    assert.equal(restored.provenance.desc,note);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(row=>window.__openSavedMatrix({...row,id:'bad-skip',skip_distance:row.skip_distance+1}),saved);
    await page.waitForFunction(()=>window.__state?.status==='empty');
    assert.equal(await page.locator('.els29-native-cell.is-axis').count(),0,'another valid skip at the same start is not the saved occurrence');
    // Explicit bad coordinates must not silently fall back to another hit of the same word.
    await page.evaluate(row=>window.__openSavedMatrix({...row,id:'bad-anchor',start_index:row.start_index+1}),saved);
    await page.waitForFunction(()=>window.__state?.status==='empty');
    assert.equal(await page.locator('.els29-native-cell.is-axis').count(),0);
    assert.match(await page.locator('.els29-native-notice').textContent(),/לשחזר/);
  },{realHost:true,mobile:true});
 });

async function privacyRecord(page, overrides = {}) {
  return page.evaluate(overrides => {
    const s=window.__state;
    const row={id:'privacy-record',slug:'privacy-record',search_term:s.term,title:s.term,scope:s.scope,
      skip_distance:s.axis.skip,direction:s.axis.direction,start_index:s.axis.start,corpus_id:s.verification.corpus_id,
      owner_user_id:'fixture-owner',visibility:'private',status:'draft',self_published:false,
      positions:{findings:[],privateMarker:'preserve'},description:'private original',...overrides};
    (window.__savedRows||=[]).push(row);return structuredClone(row);
  },overrides);
}
async function unsavedPrivacyAxis(page) {
  await page.evaluate(item=>document.querySelector('iframe').contentWindow.postMessage({source:'sod-host',type:'load-matrix',item:{...item,id:null}},location.origin),golden);
  await page.waitForFunction(()=>window.__state?.verification?.state==='MATCH'&&!window.__state?.provenance?.editId);
}

test('native fixture handshake loads its Golden once and never replays it over a user-selected axis',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:60000},async()=>{
  await withNative({width:390,height:844},async page=>{
    await unsavedPrivacyAxis(page);
    const before=await page.evaluate(id=>({
      ready:window.__log.filter(message=>message.type==='ready').length,
      goldenLoads:window.__hostLog.filter(message=>message.type==='load-matrix'&&message.item?.id===id).length,
    }),golden.id);
    const frame=page.frames().find(candidate=>candidate.parentFrame());
    await frame.evaluate(()=>parent.postMessage({source:'tzofen',type:'ready'},location.origin));
    await page.waitForFunction(count=>window.__log.filter(message=>message.type==='ready').length>count,before.ready);
    const after=await page.evaluate(id=>({
      goldenLoads:window.__hostLog.filter(message=>message.type==='load-matrix'&&message.item?.id===id).length,
      editId:window.__state?.provenance?.editId||null,
    }),golden.id);
    assert.equal(after.goldenLoads,before.goldenLoads,'a repeated ready handshake must not inject the fixture Golden again');
    assert.equal(after.editId,null,'the user-selected unsaved axis remains active');
  },{realHost:true,mobile:true});
 });
async function classicPrivacySave(page, overrides = null) {
  const before=await page.evaluate(()=>window.__hostLog.filter(m=>m.type==='saved').length);
  const frame=page.frames().find(f=>f.parentFrame());
  if(overrides===null){
    // Real Classic UI -> description dialog -> canonical engine -> real host save handler.
    if(await button(page,'כל הכלים').count())await activate(page,'כל הכלים');
    await frame.locator('.save-act').first().dispatchEvent('click');
    await frame.locator('.sh-desc').fill('בדיקת שמירה פרטית במסלול הקלאסי ללא פרסום תמונות');
    await frame.locator('.sh-save').dispatchEvent('click');
  }else{
    const payload=await page.evaluate(overrides=>{
      const s=window.__state;
      return {source:'tzofen',type:'save',term:s.term,scope:s.scope,skip:s.axis.skip,direction:s.axis.direction,start:s.axis.start,
        findings:[],desc:'changed privately',image:'data:image/png;base64,aGVsbG8=',shape:'data:image/png;base64,aGVsbG8=',...overrides};
    },overrides);
    // Adversarial target/error cases enter through the real source-checked message listener.
    await frame.evaluate(payload=>parent.postMessage(payload,location.origin),payload);
  }
  await page.waitForFunction(n=>window.__hostLog.filter(m=>m.type==='saved').length>n,before);
  return page.evaluate(()=>window.__hostLog.filter(m=>m.type==='saved').at(-1));
}

test('an opened personal cipher updates its exact saved record after findings change',
 {skip:!canRun,timeout:120000},async()=>{
 await withNative({width:390,height:844},async page=>{
  const row=await privacyRecord(page);
  await page.evaluate(value=>window.__openSavedMatrix(value),row);
  await page.waitForFunction(()=>window.__state?.provenance?.editId==='privacy-record'&&window.__state?.verification?.state==='MATCH');
  await openPanel(page);
  await page.getByRole('textbox',{name:'חיפוש משני במטריצה',exact:true}).fill('התורה');
  await activate(page,'חפש במטריצה');
  await page.waitForFunction(()=>window.__state?.findings?.some(item=>item.t==='התורה'&&item.shown.length));
  await activate(page,'שמירה');
  assert.equal(await button(page,'עדכן ממצא').count(),1);
  assert.equal(await page.getByRole('textbox',{name:'שם הצופן',exact:true}).isDisabled(),true);
  await page.getByRole('textbox',{name:'מה רואים בצופן?',exact:true}).fill('הוספתי את התורה כממצא נוסף על הציר השמור.');
  await activate(page,'עדכן ממצא');
  await page.waitForFunction(()=>document.querySelector('.els29-native-save-result')?.textContent.includes('עודכן'));
  assert.equal(await page.evaluate(()=>window.__updateCalls.at(-1).p_id),'privacy-record');
  assert.equal(await page.evaluate(()=>window.__savedRows.length),1);
  assert.equal(await page.evaluate(()=>window.__savedRows[0].positions.findings[0].t),'התורה');
  await activate(page,'סריקה וממצאים');
  await activate(page,'מופעים וצבע של התורה');
  await activate(page,'מחק את המילה התורה וכל מופעיה');
  await page.waitForFunction(()=>window.__state?.findings?.length===0);
  await activate(page,'שמירה');
  await activate(page,'עדכן ממצא');
  await page.waitForFunction(()=>window.__savedRows[0].positions.findings.length===0);
  assert.equal(await page.evaluate(()=>window.__updateCalls.at(-1).p_id),'privacy-record');
  assert.equal(await page.evaluate(()=>window.__savedRows.length),1);
  assert.equal(await page.evaluate(()=>window.__publicUploads||0),0);
 },{realHost:true,mobile:true});
});

test('privacy F4: real Classic save of opened private row and native-to-Classic keep images private; failed update never publishes',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:390,height:844},async page=>{
    const row=await privacyRecord(page);
    await page.evaluate(row=>window.__openSavedMatrix(row),row);
    await page.waitForFunction(()=>window.__state?.provenance?.editId==='privacy-record'&&window.__state?.verification?.state==='MATCH');
    assert.equal((await classicPrivacySave(page)).ok,true);
    assert.equal(await page.evaluate(()=>window.__publicUploads||0),0);
    assert.equal(await page.evaluate(()=>window.__updateCalls.at(-1).p_id),row.id);
    assert.equal(await page.evaluate(()=>window.__savedRows[0].positions.privateMarker),'preserve');
    assert.equal(await page.evaluate(()=>window.__saveCalls?.length||0),0);
    await page.evaluate(()=>window.__updateFails=true);
    assert.equal((await classicPrivacySave(page,{})).ok,false);
    assert.equal(await page.evaluate(()=>window.__publicUploads||0),0);
    assert.equal(await page.evaluate(()=>window.__saveCalls?.length||0),0,'failed heuristic private update cannot create public copy');
    assert.equal(await page.evaluate(()=>window.__anonymousSaves||0),0);
    await page.evaluate(()=>window.__updateFails=false);
    const publicRow=await privacyRecord(page,{id:'public-target',visibility:'public',status:'published',self_published:true,positions:{publicMarker:'untouched'}});
    assert.equal((await classicPrivacySave(page,{editId:publicRow.id})).ok,false,'private context cannot be copied into a different public edit target');
    assert.deepEqual(await page.evaluate(()=>window.__savedRows.find(row=>row.id==='public-target').positions),{publicMarker:'untouched'});
    assert.equal(await page.evaluate(()=>window.__publicUploads||0),0);
    assert.equal((await classicPrivacySave(page,{term:'ציר אחר',editId:null})).ok,true,'new axis under private context stays private');
    assert.equal(await page.evaluate(()=>window.__saveCalls.at(-1).isPublic),false);
    assert.equal(await page.evaluate(()=>window.__publicUploads||0),0);
  },{realHost:true,mobile:true});
  await withNative({width:1440,height:1000},async page=>{
    await unsavedPrivacyAxis(page);
    await activate(page,'שמירה');
    await page.getByRole('textbox',{name:'מה רואים בצופן?',exact:true}).fill('מחקר פרטי שנשמר לפני המעבר לכלים הקלאסיים');
    await activate(page,'שמור אצלי');
    await page.waitForFunction(()=>window.__savedRows?.length===1);
    assert.equal(await page.evaluate(()=>window.__fixtureMatrix),null,'fresh native save has no opened matrix prop');
    assert.equal((await classicPrivacySave(page)).ok,true);
    assert.equal(await page.evaluate(()=>window.__publicUploads||0),0);
    assert.equal(await page.evaluate(()=>window.__savedRows.length),1);
    assert.equal(await page.evaluate(()=>window.__savedRows[0].visibility),'private');
    assert.equal(await page.evaluate(()=>window.__saveCalls.length),1,'Classic updates the same native private record');
  },{realHost:true});
 });

test('privacy F4: explicit private targets, missing access, lookup failures and account changes fail before public uploads',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    const row=await privacyRecord(page);
    assert.equal((await classicPrivacySave(page,{editId:row.id})).ok,true,'private edit target resolved even without route context');
    assert.equal(await page.evaluate(()=>window.__publicUploads||0),0);
    const calls=await page.evaluate(()=>window.__updateCalls.length);
    assert.equal((await classicPrivacySave(page,{editId:'missing'})).ok,false);
    await page.evaluate(()=>window.__readFails=true);
    assert.equal((await classicPrivacySave(page,{editId:row.id})).ok,false);
    await page.evaluate(()=>{window.__readFails=false;window.__savedRows[0].visibility=null;});
    assert.equal((await classicPrivacySave(page,{editId:row.id})).ok,false,'unknown privacy fails closed');
    await page.evaluate(()=>{window.__savedRows[0].visibility='private';window.__savedRows[0].owner_user_id='another-owner';window.__fixtureTier='registered';window.__forceParentRender();});
    assert.equal((await classicPrivacySave(page,{editId:row.id})).ok,false,'foreign private target unavailable to member');
    await page.evaluate(()=>{window.__savedRows[0].owner_user_id='fixture-owner';window.__fixtureTier='anon';window.__forceParentRender();});
    assert.equal((await classicPrivacySave(page,{editId:row.id})).ok,false,'signed out private update fails');
    assert.equal(await page.evaluate(()=>window.__updateCalls.length),calls);
    assert.equal(await page.evaluate(()=>window.__publicUploads||0),0);
    assert.equal(await page.evaluate(()=>window.__saveCalls?.length||0),0);
    assert.equal(await page.evaluate(()=>window.__anonymousSaves||0),0);
    await page.evaluate(()=>{window.__fixtureTier='admin';window.__forceParentRender();window.__holdRead=true;});
    const publicRow=await privacyRecord(page,{id:'public-race',visibility:'public',status:'published',self_published:true});
    const saving=classicPrivacySave(page,{editId:publicRow.id});
    await page.waitForFunction(()=>typeof window.__releaseRead==='function');
    await page.evaluate(()=>{window.__fixtureTier='anon';window.__forceParentRender();window.__holdRead=false;window.__releaseRead();});
    assert.equal((await saving).ok,false,'account change while reading public edit target aborts before upload');
    assert.equal(await page.evaluate(()=>window.__publicUploads||0),0);
  },{realHost:true});
 });

test('privacy F4: public heuristic re-save by another member or guest keeps the existing pending-variant path',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  for(const tier of ['registered','anon'])await withNative({width:1440,height:1000},async page=>{
    const row=await privacyRecord(page,{owner_user_id:'public-author',visibility:'public',status:'published',self_published:true});
    await page.evaluate(row=>{window.__allowAnonymousSave=true;window.__openSavedMatrix(row);},row);
    await page.waitForFunction(()=>window.__state?.provenance?.editId==='privacy-record'&&window.__state?.verification?.state==='MATCH');
    assert.equal((await classicPrivacySave(page,{editId:null})).ok,true);
    const payload=await page.evaluate(()=>window.__saveCalls?.at(-1)||window.__anonymousSaveCalls?.at(-1));
    assert.equal(payload.positions.variantOf,row.id);
    assert.equal(await page.evaluate(()=>window.__savedRows[0].description),'private original','public source remains unchanged');
    assert.equal(await page.evaluate(()=>window.__publicUploads),2);
    if(tier==='registered')assert.equal(payload.isPublic,true);
    else assert.equal(await page.evaluate(()=>window.__anonymousSaves),1);
  },{realHost:true,tier});
 });

test('privacy F4: new and existing public Classic saves retain permitted uploads and update flow',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    await unsavedPrivacyAxis(page);
    assert.equal((await classicPrivacySave(page)).ok,true);
    assert.equal(await page.evaluate(()=>window.__publicUploads),2,'real engine card and grid upload for explicit public Classic save');
    assert.equal(await page.evaluate(()=>window.__saveCalls[0].isPublic),true);
    const row=await page.evaluate(()=>window.__savedRows[0]);
    assert.equal(row.visibility,'public');assert.equal(row.status,'published');
    await page.evaluate(row=>window.__openSavedMatrix(row),row);
    await page.waitForFunction(id=>window.__state?.provenance?.editId===id&&window.__state?.verification?.state==='MATCH',row.id);
    assert.equal((await classicPrivacySave(page,{editId:row.id})).ok,true);
    assert.equal(await page.evaluate(()=>window.__publicUploads),4);
    assert.equal(await page.evaluate(()=>window.__updateCalls.at(-1).p_id),row.id);
    assert.equal(await page.evaluate(()=>window.__savedRows.length),1);
  },{realHost:true});
 });

test('native reliability: cancellation terminates discovery and cross workers; partial progress belongs only to its request',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
  await withNative({width:1440,height:1000},async page=>{
    const baseline=await identity(page), frame=page.frames().find(frame=>frame.parentFrame());
    await frame.evaluate(()=>{
      const send=Worker.prototype.postMessage, stop=Worker.prototype.terminate;
      window.__fixtureHoldWorker='routed-discover';window.__fixtureHeldWorkers=0;window.__fixtureStoppedWorkers=0;window.__fixtureCrossChunks=0;
      Worker.prototype.postMessage=function(message,...rest){
        if(message.type===window.__fixtureHoldWorker){
          if(message.type!=='hitchunk'||++window.__fixtureCrossChunks>1){window.__fixtureHeldWorkers++;return;}
        }
        return send.call(this,message,...rest);
      };
      Worker.prototype.terminate=function(){window.__fixtureStoppedWorkers++;return stop.call(this);};
    });
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('צוריאל');await activate(page,'כל התנ״ך');
    await frame.waitForFunction(()=>window.__fixtureHeldWorkers>0);
    await activate(page,'בטל חיפוש');await frame.waitForFunction(()=>window.__fixtureStoppedWorkers>0);
    await activate(page,'מפת חום');await page.waitForFunction(()=>window.__state.ui.heat===true);
    assert.deepEqual(await identity(page),baseline);
    await frame.evaluate(()=>{window.__fixtureHoldWorker='hitchunk';window.__fixtureHeldWorkers=0;});
    await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('צוריאל');await activate(page,'הצלבה בין צירים');
    await page.getByRole('textbox',{name:'מונח שני',exact:true}).fill('פולייס');await activate(page,'חפש הצלבה');
    await page.waitForFunction(()=>window.__operation?.progress?.completed===8);
    const progress=await page.evaluate(()=>window.__operation.progress);
    assert.ok(progress.total>progress.completed);assert.equal(progress.phase,'cross');
    assert.equal(await page.getByRole('progressbar',{name:'מיקומי ציר שנבדקו'}).getAttribute('value'),'8');
    const terminated=await frame.evaluate(()=>window.__fixtureStoppedWorkers);
    await activate(page,'בטל חיפוש');await frame.waitForFunction(n=>window.__fixtureStoppedWorkers>n,terminated);
    assert.equal(await page.locator('.els29-native-progress').count(),0);
    assert.deepEqual(await identity(page),baseline,'cancelled scan never commits its pending geometry or results');
    await frame.evaluate(()=>window.__fixtureHoldWorker=null);
    const complete=await reliabilityCross(page,'צוריאל','פולייס');
    assert.equal(complete.search.zones,3,'new workers complete the replacement search');
  },{realHost:true});
 });

test('native library: paginated existing records, legacy disclosure and account changes remain scoped',
  { skip: !canRun, timeout: 120000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [libraryFixturePlugin(), react()], server: { host: '127.0.0.1', port: 0 } });
  let browser;
  try {
    await server.listen();
    browser = await pw.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture?library=mine`);
    await page.waitForFunction(() => window.__switchLibraryUser && window.__libraryCalls?.length);
    await page.evaluate(corpus => {
      const row = (id, owner = 'owner-a', extra = {}) => ({ id, owner_user_id: owner, search_term: 'תורהקדשה', title: 'צופן '+id,
        status: 'draft', visibility: 'private', scope: 'torah', skip_distance: 10065, direction: 'fwd', start_index: 32836,
        corpus_id: corpus, positions: { findings: [{ t: 'התורה', c: '#FF3C61' }] }, description: 'הסבר על הצופן השמור', ...extra });
      window.__libraryRows = [
        ...Array.from({length:25},(_,i)=>row('mine-'+i)),
        row('legacy','owner-a',{start_index:null,direction:null,image_url:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='}),
        row('other','owner-b'),
        row('public','owner-b',{status:'published',visibility:'public'}),
        row('research','owner-b',{status:'published',visibility:'public',source:'research'}),
      ];
    }, ELS_GOLDEN_CORPUS_ID);
    await button(page,'צפנים שפורסמו').click();
    await page.waitForFunction(()=>document.querySelectorAll('.els29-library-card').length===1);
    assert.match(await page.locator('.els29-library-card').textContent(), /צופן public/);
    await button(page,'הצפנים שלי').click();
    await page.waitForFunction(()=>document.querySelectorAll('.els29-library-card').length===24);
    await button(page,'טען צפנים נוספים').click();
    await page.waitForFunction(()=>document.querySelectorAll('.els29-library-card').length===26);
    assert.deepEqual(await page.evaluate(()=>window.__libraryCalls.filter(c=>c.eq.some(([key])=>key==='owner_user_id')).slice(-2).map(c=>c.range)),[[0,24],[24,48]]);
    assert.equal(await button(page,'טען צפנים נוספים').count(),0);
    assert.equal(await page.locator('.els29-library-card').filter({hasText:'צופן other'}).count(),0);
    await page.getByLabel('חיפוש בצפנים').fill('legacy');await button(page,'חפש בספרייה').click();
    await page.waitForFunction(()=>document.querySelectorAll('.els29-library-card').length===1);
    await page.locator('.els29-library-card a').click();
    await page.waitForFunction(()=>window.__libraryMatrix?.id==='legacy');
    assert.match(await page.locator('.els29-saved-record').textContent(),/אינה שחזור מדויק/);
    assert.equal(await page.evaluate(()=>window.__libraryMatrix.start_index),null,'old anchors are never synthesized by the library');
    await page.getByText('התמונה המקורית שנשמרה',{exact:true}).click();
    assert.equal(await page.locator('.els29-saved-record img').isVisible(),true);
    await button(page,'לכל הצפנים').click();
    await page.waitForFunction(()=>document.querySelectorAll('.els29-library-card').length===24);
    await page.locator('.els29-library-card a').first().click();
    await page.waitForFunction(()=>window.__libraryMatrix?.id==='mine-0');
    assert.equal(await page.locator('.els29-saved-record').getByText(/אינה שחזור מדויק/).count(),0);
    assert.equal(await page.evaluate(()=>window.__libraryMatrix.positions.findings[0].t),'התורה');
    await page.evaluate(()=>window.__switchLibraryUser(null));
    await page.getByRole('heading',{name:'הצופן אינו זמין'}).waitFor();
    assert.equal(await page.locator('[data-fixture-matrix="mine-0"]').count(),0,'sign-out removes the private matrix');
    await button(page,'הצפנים שלי').click();
    await page.getByText('כדי לראות את הצפנים שלך,',{exact:false}).waitFor();
    await page.evaluate(()=>{window.__libraryHold=true;window.__switchLibraryUser('owner-a');});
    await page.waitForFunction(()=>window.__releaseLibrary);
    await page.evaluate(()=>window.__switchLibraryUser('owner-b'));
    await page.waitForFunction(()=>document.querySelectorAll('.els29-library-card').length===3);
    await page.evaluate(()=>window.__releaseLibrary());
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await page.locator('.els29-library-card').filter({hasText:'mine-0'}).count(),0,'late old-account responses are discarded');
    await page.evaluate(()=>window.__libraryFailure=true);
    await button(page,'צפנים שפורסמו').click();
    await page.getByRole('alert').waitFor();
    await page.evaluate(()=>window.__libraryFailure=false);await button(page,'נסה שוב').click();
    await page.waitForFunction(()=>document.querySelectorAll('.els29-library-card').length===1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'library fits mobile width');
    assert.deepEqual(errors,[]);
    if(process.env.ELS_SCREENSHOT_DIR)await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,'library-mobile.png'),fullPage:true});
  } finally {
    await browser?.close();await server.close();
  }
});

test('native presentation: verse words alternate from either entry and camera reveals admitted findings without engine changes',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async()=>{
 await withNative({width:1440,height:1000},async page=>{
  await addSecondary(page,'תורה');
  const before=await identity(page);
  assert.equal(await page.getByRole('button',{name:'תצוגת עומק',exact:true}).count(),0);
  const cell=page.locator('.els29-native-cell.is-axis').first();
  const index=Number(await cell.getAttribute('data-els-index'));
  await activate(page,'הדגש פסוק במטריצה');
  await cell.dispatchEvent('click');
  await page.waitForFunction(()=>document.querySelectorAll('.is-verse-word').length>0);
  const verse=await page.evaluate(()=>window.__lens.verse);
  const expected=new Map();let pos=verse.from;
  verse.text.split(/[\s־–-]+/u).map(w=>(w.match(/[א-ת]/gu)||[]).length).filter(Boolean).forEach((count,word)=>{for(let n=0;n<count;n++)expected.set(pos++,word%2);});
  const highlighted=await page.locator('.is-verse-word').evaluateAll(cells=>cells.map(c=>({i:Number(c.dataset.elsIndex),word:Number(c.dataset.verseWord)})));
  for(const c of highlighted)assert.equal(c.word,expected.get(c.i));
  if(process.env.ELS_SCREENSHOT_DIR)await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,'verse-words-1440.png')});
  assert.ok(highlighted.some(c=>c.word===0)&&highlighted.some(c=>c.word===1));
  assert.equal(await page.locator(`[data-els-index="${index}"]`).evaluate(c=>c.classList.contains('is-axis')),true,'verse preserves primary mark');
  await activate(page,'הדגש פסוק במטריצה');assert.equal(await page.locator('.is-verse-word').count(),0);
  await activate(page,'הדגש פסוק');assert.ok(await page.locator('.is-verse-word').count()>0,'source card highlights the same verse');
  await activate(page,'הדגש פסוק במטריצה');
  await activate(page,'מקור הממצא הנבחר');
  await page.waitForFunction(()=>window.__lens?.lens==='verse-context');
  await page.locator('.els29-native-source-list button').first().dispatchEvent('click');
  assert.ok(await page.locator('.is-verse-word').count()>0,'verse list supports exact highlighting');
  await activate(page,'הדגש פסוק במטריצה');
  const commands=await page.evaluate(()=>window.__hostLog.length);
  const originalMarks=await page.locator('.els29-native-cell.is-axis,.els29-native-cell.is-finding,.els29-native-cell.is-source-text').count();
  await activate(page,'מצב מצלמה');
  const presenter=page.getByRole('region',{name:'מצב מצלמה',exact:true});
  assert.equal(await page.locator('.els29-native-cell.is-axis,.els29-native-cell.is-finding,.els29-native-cell.is-source-text').count(),0);
  await presenter.getByRole('button',{name:'מסך מלא',exact:true}).click();
  await page.waitForFunction(()=>document.fullscreenElement?.classList.contains('els29-native-stage-column'));
  assert.ok((await page.locator('.els29-native-matrix-scroll').boundingBox()).height>200);
  assert.ok((await presenter.boundingBox()).y+(await presenter.boundingBox()).height<=1000);
  await presenter.getByRole('button',{name:'צא ממסך מלא',exact:true}).click();
  await page.waitForFunction(()=>!document.fullscreenElement);

  await presenter.getByRole('button',{name:'הבא',exact:true}).click();
  assert.ok(await page.locator('.els29-native-cell.is-axis').count()>0);
  assert.ok(await page.locator('[data-present-concealed="true"]').count()>0);
  await presenter.getByRole('button',{name:'הבא',exact:true}).click();
  assert.equal(await page.locator('[data-present-concealed="true"]').count(),0);
  assert.equal(await page.locator('.els29-native-cell.is-axis,.els29-native-cell.is-finding,.els29-native-cell.is-source-text').count(),originalMarks);
  await presenter.getByRole('button',{name:'הקודם',exact:true}).click();
  await presenter.getByRole('combobox',{name:'שניות לכל ממצא'}).selectOption('1');
  await presenter.getByRole('button',{name:'הצגה אוטומטית',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('[data-present-concealed="true"]'));
  assert.equal(await presenter.getByRole('button',{name:'הצגה אוטומטית',exact:true}).getAttribute('aria-pressed'),'false','auto stops at the last word');
  assert.deepEqual(await identity(page),before);
  assert.equal(await page.evaluate(()=>window.__hostLog.length),commands,'presentation never searches or mutates engine');
  await activate(page,'סיים הצגה');
  await page.setViewportSize({width:390,height:844});
  await activate(page,'מצב מצלמה');

  await presenter.getByRole('button',{name:'מסך מלא',exact:true}).click();
  await page.waitForFunction(()=>document.fullscreenElement);
  if(process.env.ELS_SCREENSHOT_DIR)await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,'camera-390.png')});

  await presenter.getByRole('combobox',{name:'שניות לכל ממצא'}).selectOption('1');
  await presenter.getByRole('button',{name:'הצגה אוטומטית',exact:true}).dispatchEvent('click');
  await activate(page,'סיים הצגה');
  await page.waitForTimeout(1200);
  assert.equal(await presenter.count(),0);assert.equal(await page.locator('[data-present-concealed="true"]').count(),0);
  assert.equal(await page.evaluate(()=>document.fullscreenElement),null,'exit leaves the camera fullscreen');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await activate(page,'הדגש פסוק במטריצה');await cell.dispatchEvent('click');
  await page.waitForFunction(()=>document.querySelector('.is-verse-word'));
  await activate(page,'מצב מצלמה');
  await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('משה');
  await activate(page,'חפש');
  assert.equal(await page.locator('.is-verse-word').count(),0);assert.equal(await presenter.count(),0,'new search clears presentation and its timer');
 });
});

test('guided discovery inspects at most four exact occurrences, keeps raw runs advanced and fits 320px',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:240000},async()=>{
  for(const width of [320,1440])await withNative({width,height:900},async page=>{
    assert.equal(page.__elsDynamicLexiconRequests.length,0,'opening Guided does not download the language asset before explicit discovery');
    assert.equal(page.__elsGuidedSnapshotRequests.length,0,'opening Guided does not download snapshot presentation before explicit discovery');
    await page.evaluate(()=>window.__loadResearch({
      contract:'els_anchor_context_request_v1',researchCommand:true,guidedDiscovery:true,researchNonce:1,
      term:'יהוה',scope:'torah',contextTerms:[{term:'משה'},{term:'תורה'},{term:'ישראל'},{term:'אש'}],
      discoveryGoal:{primaryAxes:1,connectedSupports:2,sourceSequence:'WHEN_AVAILABLE',resultPolicy:'ONE_BEST_STRUCTURE'},
    }));
    await page.waitForFunction(()=>window.__operation?.kind==='search'&&window.__operation.status==='done',null,{timeout:90000});
    const coverage=page.locator('[data-els-guided-occurrence-coverage="v1"]');
    await coverage.waitFor({timeout:120000});
    await page.waitForFunction(()=>{
      const node=document.querySelector('[data-els-guided-occurrence-coverage="v1"]');
      return node&&(/נבדקו [1-4] מתוך/.test(node.textContent)||node.textContent.includes('הבדיקה הראשונה הושלמה')||node.textContent.includes('נמצא חיבור חזק'));
    },null,{timeout:120000});
    const requests=await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='request-lens'&&message.lens==='matrix-discovery'));
    assert.ok(requests.length>=1&&requests.length<=4,'the automatic first wave stays within four occurrences');
    assert.ok(requests.every(message=>message.target.guidedOccurrenceCoverage===true&&message.target.setId&&message.target.hitId));
    assert.ok(requests.every(message=>message.target.contextTerms.includes('אש')),'short story context reaches the canonical local discovery lens');
    const reports=await page.evaluate(()=>window.__log.filter(message=>message.type==='lens'&&message.lens==='matrix-discovery'&&message.ok));
    assert.equal(page.__elsDynamicLexiconRequests.length,1,'one lazy language asset request serves every inspected occurrence');
    assert.ok(reports.length>=1&&reports.every(report=>report.languageInspection?.contract==='els_matrix_language_inspection_v1'));
    assert.ok(reports.every(report=>report.searchRule==='lazy-bounded-dynamic-lexicon'&&report.defaultLexiconLoaded===false&&report.dynamicLexiconLoaded===true));
    assert.ok(reports.every(report=>report.languageInspection.modelCallsTriggered===0&&report.languageInspection.coverage.returnedRays<=24&&report.languageInspection.coverage.maxLetters===24&&report.languageInspection.coverage.maxCandidateWindows===9216&&report.languageInspection.coverage.candidatesExamined<=9216&&report.languageInspection.coverage.maxLexiconLookups===196608&&report.languageInspection.coverage.lexiconLookups<=196608&&report.languageInspection.coverage.returnedReadings<=24&&report.languageInspection.coverage.returnedSegmentations<=24&&report.languageInspection.coverage.returnedRelations<=3&&Number(report.languageInspection.coverage.relationReplayCalls||0)<=2&&Number(report.languageInspection.canonicalReplayCalls||0)<=2));
    assert.ok(reports.every(report=>report.languageInspection.dynamicLexicon?.contract==='els_dynamic_lexicon_profile_v1'&&report.languageInspection.dynamicLexicon.entryCount>40000&&report.languageInspection.dynamicLexicon.coreEntryCount>4000&&report.languageInspection.dynamicLexicon.lazyLoaded===true&&report.languageInspection.dynamicLexicon.vocabularyScanned===false&&report.languageInspection.dynamicLexicon.modelCallsTriggered===0));
    assert.ok(reports.every(report=>report.languageInspection.dynamicLexicon.asset?.path==='els-dynamic-lexicon-v1.gz64.txt'&&report.languageInspection.dynamicLexicon.asset.loadTrigger==='VERIFIED_MATRIX_DISCOVERY'&&report.languageInspection.dynamicLexicon.asset.cachePolicy==='force-cache'&&report.languageInspection.dynamicLexicon.asset.requestCount===1));
    assert.ok(reports.every(report=>(report.languageInspection.readings||[]).every(reading=>reading.status==='UNVERIFIED_READING'&&reading.truthPromotion===false)));
    assert.ok(reports.every(report=>(report.languageInspection.relations||[]).every(relation=>['UNVERIFIED_RELATION','VERIFIED_RELATION'].includes(relation.status)&&relation.truthPromotion===false)));
    assert.ok(reports.every(report=>report.languageInspection.boundaryProfile?.contract==='torah_language_boundary_profile_v1'&&report.languageInspection.boundaryProfile.vocabularyRetained===false&&report.languageInspection.boundaryProfile.modelCallsTriggered===0));
    assert.ok(reports.every(report=>report.languageInspection.coverage.returnedBoundaries<=480&&report.languageInspection.coverage.boundaryProfileComparisons<=816));
    assert.ok(reports.every(report=>(report.languageInspection.boundaries||[]).every(boundary=>boundary.status==='UNVERIFIED_BOUNDARY'&&boundary.interpretationRequired===true&&boundary.truthPromotion===false)));
    assert.equal(await page.evaluate(()=>window.__hostLog.some(message=>message.type==='update-findings')),false,'inspection never adds findings without the explicit button');
    const guidedMatrix=page.locator('[data-els-guided-matrix="exact-v1"]');
    assert.equal(await page.locator('[data-els-guided-result-surface="results-first-v1"]').count(),1,'Guided owns a distinct results-first surface');
    assert.equal(await page.locator('.els29-native-query').isVisible(),false,'Classic search and cross controls never appear inside Guided');
    assert.equal(await guidedMatrix.isVisible(),false,'the exact matrix does not dominate the Guided result surface');
    const searchRequestCount=await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='native-search').length);
    await page.getByRole('button',{name:'פתח מטריצה מדויקת',exact:true}).dispatchEvent('click');
    assert.equal(await guidedMatrix.isVisible(),true,'the matrix opens only after an explicit inspection action');
    assert.equal(await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='native-search').length),searchRequestCount,'opening the matrix does not start another search');
    await page.getByRole('button',{name:'סגור מטריצה',exact:true}).dispatchEvent('click');
    assert.equal(await guidedMatrix.isVisible(),false);
    assert.ok((await coverage.innerText()).includes('מופעים מאומתים'),'exact axis count is separate from local discoveries');
    assert.equal(await coverage.getByText(/דפוסים גולמיים/).count()<=1,true,'raw patterns have one advanced disclosure only');
    assert.equal(await coverage.locator('[data-els-language-inspection="candidate-only"]').count(),1,'language candidates stay in one Advanced disclosure');
    const dynamicLexicon=coverage.locator('[data-els-dynamic-lexicon="lazy-bounded"]');
    assert.equal(await dynamicLexicon.count(),1,'the lazy broad lexicon is disclosed once under Advanced');
    const dynamicCopy=await dynamicLexicon.textContent();assert.match(dynamicCopy,/לא נסרקו/);assert.match(dynamicCopy,/בדיקות אינדקס ישירות/);assert.match(dynamicCopy,/ללא קריאת AI/);
    const boundaryPanel=coverage.locator('[data-els-language-boundaries="unverified"]');
    assert.ok(await boundaryPanel.count()<=1,'unverified boundary candidates have one Advanced section only');
    if(await boundaryPanel.count()){
      const boundaryCopy=await boundaryPanel.textContent();
      assert.match(boundaryCopy,/אינו מחזיק מילון/);assert.match(boundaryCopy,/אינו קובע שאלה מילים/);assert.match(boundaryCopy,/לא מאומת/);
    }
    const smartSnapshot=coverage.locator('[data-els-smart-matrix-snapshot="v1"]');
    assert.ok(await smartSnapshot.count()<=1,'one quiet matrix snapshot owns the verified visible findings');
    assert.ok(page.__elsGuidedSnapshotRequests.length>=1,'the snapshot presentation is loaded only after Guided has verified material');
    if(await smartSnapshot.count()){
      const cards=smartSnapshot.locator('[data-snapshot-kind]'),copy=await smartSnapshot.innerText(),count=await cards.count();
      assert.ok(count>=1&&count<=5,'the attention budget exposes at most five verified items');
      assert.ok((await cards.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-snapshot-kind')))).every(kind=>['verified-pair','verified-language-relation','verified-finding'].includes(kind)));
      assert.match(copy,/אימות קנוני/);assert.match(copy,/מספר דילוג לבדו/);assert.match(copy,/הקשר ומשמעות נשארים פרשנות לבדיקה/);
      assert.ok(await smartSnapshot.getByRole('button',{name:'פתח את מופע הציר'}).count()>=1);
      assert.equal(await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='request-lens'&&message.lens==='verse-context'&&message.target?.guidedSnapshotSource===true).length),0,
        'source context stays on-demand after the snapshot appears');
      const firstCard=cards.first(),itemId=await firstCard.getAttribute('data-snapshot-item-id');
      await firstCard.getByRole('button',{name:'מקור ופסוקים',exact:true}).dispatchEvent('click');
      if(process.env.ELS_SAVE_DIAGNOSTICS){await page.waitForTimeout(600);console.error('GUIDED-SOURCE-DIAG',width,JSON.stringify(await page.evaluate(()=>({state:window.__state?.axis,requests:window.__hostLog.filter(message=>message.type==='request-lens').slice(-4).map(message=>({lens:message.lens,target:message.target})),responses:window.__log.filter(message=>message.type==='lens').slice(-4).map(message=>({lens:message.lens,ok:message.ok,target:message.target})),sourceNodes:[...document.querySelectorAll('[data-els-guided-source-context]')].map(node=>node.getAttribute('data-els-guided-source-context'))}))));}
      await page.waitForFunction(id=>window.__log.some(message=>message.type==='lens'&&message.lens==='verse-context'&&message.target?.guidedSnapshotItemId===id),itemId,{timeout:30000});
      const source=smartSnapshot.locator('[data-els-guided-source-context="ready"]');await source.waitFor({timeout:30000});
      const sourceCard=source.locator('xpath=ancestor::article[@data-snapshot-item-id][1]');
      assert.equal(await sourceCard.getAttribute('data-snapshot-item-id'),itemId,'background ranking may move but never mix the opened source item');
      assert.ok(await source.locator('.els29-smart-source-verses>article').count()<=3,'source attention stays bounded');
      assert.equal(await source.getAttribute('data-source-hit-id'),await page.evaluate(()=>window.__state.axis.hitId));
      assert.equal(await guidedMatrix.isVisible(),false,'opening canonical source does not reveal the matrix implicitly');
      if(process.env.ELS_SCREENSHOT_DIR){mkdirSync(process.env.ELS_SCREENSHOT_DIR,{recursive:true});await source.scrollIntoViewIfNeeded();await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`guided-source-context-${width}.png`),fullPage:true});}
      await source.getByRole('button',{name:'חזור לממצא המדורג',exact:true}).dispatchEvent('click');
      assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-snapshot-item-id')),itemId,'exact return restores the ranked item');
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'guided package has no horizontal page overflow');
    if(process.env.ELS_SCREENSHOT_DIR){mkdirSync(process.env.ELS_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`guided-smart-snapshot-${width}.png`),fullPage:true});}
  },{realHost:true,loadGolden:false,mobile:width===320,guided:true});
 });

test('guided golden: מקדש ירד keeps two exact axes and recognizes the general defective spelling ירושלם',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
  await withNative({width:390,height:844},async page=>{
    await page.evaluate(()=>window.__loadResearch({
      contract:'els_anchor_context_request_v1',researchCommand:true,guidedDiscovery:true,researchNonce:2,
      term:'מקדש ירד',scope:'torah',contextTerms:[],
      discoveryGoal:{primaryAxes:1,connectedSupports:2,sourceSequence:'WHEN_AVAILABLE',resultPolicy:'ONE_BEST_STRUCTURE'},
    }));
    await page.waitForFunction(()=>window.__operation?.kind==='search'&&window.__operation.status==='done',null,{timeout:90000});
    assert.equal(await page.evaluate(()=>window.__state.search.occurrences.total),2,'the exact axis count remains two');
    await page.waitForFunction(()=>window.__log?.filter(message=>message.type==='lens'&&message.lens==='matrix-discovery'&&message.ok).length===2,null,{timeout:90000});
    const reports=await page.evaluate(()=>window.__log.filter(message=>message.type==='lens'&&message.lens==='matrix-discovery'&&message.ok));
    const recognized=reports.flatMap(report=>report.items||[]).find(item=>item.term==='ירושלמ');
    assert.ok(recognized,`the general plene/defective recognizer sees the exact matrix letters; reports=${JSON.stringify(reports.map(report=>({axis:report.axis,items:report.items,raw:report.rawPatterns?.slice(0,8),failure:report.discoveryBundle?.failureCause,budget:report.budget})))}`);
    assert.ok(recognized.occurrenceCount>=2,'the recognized form repeats twice in the bounded matrix');
    assert.equal(recognized.readingLabel,'ירושלים','the fuller reading stays annotation, not replacement text');
    const packageNode=page.locator('[data-els-guided-occurrence-coverage="v1"]'),packageText=await packageNode.innerText();
    assert.match(packageText,/ירושלם/,'the recognized exact form is visible in the guided research package');
    const snapshot=packageNode.locator('[data-els-smart-matrix-snapshot="v1"]');
    assert.equal(await snapshot.count(),1,'the verified local finding is consolidated into one smart snapshot');
    assert.ok(await snapshot.locator('[data-snapshot-kind]').count()<=5);
    assert.equal(await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='request-lens'&&message.lens==='verse-context'&&message.target?.guidedSnapshotSource===true).length),0,
      'Guided does not load source text before an explicit source action');
    const rankedItem=snapshot.locator('[data-snapshot-item-id]').first(),rankedItemId=await rankedItem.getAttribute('data-snapshot-item-id');
    await rankedItem.getByRole('button',{name:'מקור ופסוקים',exact:true}).dispatchEvent('click');
    if(process.env.ELS_SAVE_DIAGNOSTICS){await page.waitForTimeout(600);console.error('GUIDED-SOURCE-DIAG',JSON.stringify(await page.evaluate(()=>({state:window.__state?.axis,requests:window.__hostLog.filter(message=>message.type==='request-lens').slice(-4).map(message=>({lens:message.lens,target:message.target})),responses:window.__log.filter(message=>message.type==='lens').slice(-4).map(message=>({lens:message.lens,ok:message.ok,target:message.target})),sourceNodes:[...document.querySelectorAll('[data-els-guided-source-context]')].map(node=>node.getAttribute('data-els-guided-source-context'))}))));}
    await page.waitForFunction(id=>window.__log.some(message=>message.type==='lens'&&message.lens==='verse-context'&&message.target?.guidedSnapshotItemId===id),rankedItemId,{timeout:30000});
    const sourceContext=rankedItem.locator('[data-els-guided-source-context="ready"]');
    await sourceContext.waitFor({timeout:30000});
    const sourceRequests=await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='request-lens'&&message.lens==='verse-context'&&message.target?.guidedSnapshotSource===true));
    assert.equal(sourceRequests.length,1,'one explicit action uses the existing canonical verse lens once');
    assert.equal(sourceRequests[0].target.guidedSnapshotItemId,rankedItemId);
    assert.ok(sourceRequests[0].target.resultSetId&&Number.isInteger(sourceRequests[0].target.index)&&sourceRequests[0].target.hitId&&sourceRequests[0].target.occurrenceRef);
    assert.equal(await sourceContext.getAttribute('data-source-hit-id'),await page.evaluate(()=>window.__state.axis.hitId),'source text belongs to the exact active occurrence');
    const visibleVerses=sourceContext.locator('.els29-smart-source-verses>article');
    assert.ok(await visibleVerses.count()>=1&&await visibleVerses.count()<=3,'the quiet source package shows at most three canonical verses');
    assert.match(await sourceContext.innerText(),/עדשת המקור הקנונית/);
    await sourceContext.getByRole('button',{name:'הדגש פסוק במטריצה'}).first().dispatchEvent('click');
    assert.equal(await page.locator('[data-els-guided-matrix="exact-v1"]').isVisible(),true,'verse inspection reveals the exact matrix explicitly');
    assert.ok(await page.locator('.is-verse-word').count()>0,'the package reuses the existing exact verse highlight');
    await sourceContext.getByRole('button',{name:'חזור לממצא המדורג',exact:true}).dispatchEvent('click');
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-snapshot-item-id')),rankedItemId,'return focuses the exact ranked item');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'source package keeps the 390px page within bounds');
  },{realHost:true,loadGolden:false,mobile:true,guided:true});
 });

test('guided three-term cross stays bounded and never promotes a partial result',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:240000},async()=>{
 for(const width of [320,1440])await withNative({width,height:900},async page=>{
   await page.evaluate(()=>window.__loadResearch({contract:'els_anchor_context_request_v1',researchCommand:true,guidedDiscovery:true,
     term:'קולומביה',axes:['קולומביה','ספינת','זזזזזז'],searchMode:'crossed_three',scope:'torah',researchNonce:901}));
   await page.waitForFunction(()=>window.__operation?.requestId&&['done','empty','error'].includes(window.__operation.status),null,{timeout:90000});
   const operation=await page.evaluate(()=>window.__operation);
   assert.equal(operation.status,'empty','a nonexistent third term cannot become a full triple');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.evaluate(()=>{window.__fixtureVerificationDenied=true;window.__loadResearch({contract:'els_anchor_context_request_v1',researchCommand:true,guidedDiscovery:true,
     term:'תורהקדשה',axes:['תורהקדשה','בחשרתע','כויזלת'],searchMode:'crossed_three',scope:'torah',researchNonce:903});});
   await page.waitForFunction(id=>window.__operation?.requestId>id&&['done','empty','error'].includes(window.__operation.status),operation.requestId,{timeout:90000});
   assert.equal(await page.evaluate(()=>window.__operation.status),'error','an unavailable verifier must not produce a result or negative claim');
 },{realHost:true,loadGolden:false,mobile:width===320,guided:true});
});

test('guided three-term cross displays only canonically replayed complete meetings',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 await withNative({width:390,height:844},async page=>{
   await page.evaluate(()=>window.__loadResearch({contract:'els_anchor_context_request_v1',researchCommand:true,guidedDiscovery:true,
     term:'תורהקדשה',axes:['תורהקדשה','בחשרתע','כויזלת'],searchMode:'crossed_three',scope:'torah',researchNonce:902}));
   await page.waitForFunction(()=>window.__operation?.requestId&&['done','empty','error'].includes(window.__operation.status),null,{timeout:120000});
   const state=await page.evaluate(()=>({operation:window.__operation,state:window.__state,requests:window.__log.filter(x=>x.type==='engine-request')}));
   assert.equal(state.operation.status,'done',JSON.stringify(state.operation));
   assert.equal(state.state.verification.state,'MATCH');
   assert.ok(state.state.search.results.items.every(item=>!item.available||item.terms.length===2));
   assert.ok(state.requests.filter(request=>request.op==='verify_batch'&&request.payload?.strategy?.policy==='GUIDED_THREE_TERM_REPLAY_V1').length>=2);
 },{realHost:true,loadGolden:false,mobile:true,guided:true});
});

test('native results: regular and crossed searches expose selectable results in Torah and Tanakh, with terminal recovery',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:240000},async()=>{
 await withNative({width:390,height:844},async page=>{
  let stale;
  for(const [scope,label] of [['torah','תורה'],['tanakh','כל התנ״ך']]){
   await activate(page,'חיפוש רגיל');
   await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('יהוה');
   const request=await page.evaluate(()=>window.__operation?.requestId||0);
   if(scope==='torah')await activate(page,'חפש');else await activate(page,label);
   await page.waitForFunction(({scope,request})=>window.__operation?.requestId>request&&window.__operation.status==='done'&&window.__state?.scope===scope,{scope,request},{timeout:90000});
   const state=await page.evaluate(()=>window.__state),results=state.search.occurrences;
   assert.equal(state.term,'יהוה');assert.equal(state.verification.state,'MATCH');assert.ok(results.total>80);
   assert.equal(results.items.length,80);assert.equal(results.total,state.verification.verified_hits);
   assert.equal(await page.locator('.els29-native-panel-head strong').innerText(),'תוצאות החיפוש');
   const list=page.locator('[aria-label="רשימת תוצאות החיפוש"]');
   await page.waitForFunction(()=>document.querySelectorAll('[aria-label="רשימת תוצאות החיפוש"] .els29-native-result').length===80);
   assert.equal(await list.isVisible(),true);assert.equal(await list.locator('.els29-native-result').count(),80);
   const bounds=await page.locator('.els29-native-panel-wrap').boundingBox();assert.ok(bounds.y>=0&&bounds.y<844,'completed mobile results come into view');
   assert.equal(await page.getByRole('dialog').count(),0);
   assert.ok(results.items.every(item=>item.skip>=2&&item.ref&&['fwd','back'].includes(item.direction)));
   await activate(page,'מופע קודם');
   await page.waitForFunction(()=>window.__state.search.occurrences.selectedOrdinal===window.__state.search.occurrences.total);
   assert.equal(await page.evaluate(()=>window.__state.status),'ok','previous wraps across verified ELS only, never literal hits');
   await activate(page,'מופע הבא');await page.waitForFunction(()=>window.__state.search.occurrences.selectedOrdinal===1);
   await activate(page,'עמוד הבא');await page.waitForFunction(()=>window.__state.search.occurrences.page===1);
   const next=await page.evaluate(()=>window.__state.search.occurrences.items[0]);
   assert.equal(next.ordinal,81);
   await activate(page,'פתח מופע 81');await page.waitForFunction(id=>window.__state.axis.hitId===id,next.hitId);
   assert.ok((await page.locator('.els29-native-stage-column').boundingBox()).y<844,'choosing a mobile result reveals the matrix');
   const selected=await identity(page);
   if(stale){await page.locator('iframe').evaluate((frame,value)=>frame.contentWindow.postMessage({source:'sod-host',type:'native-control',action:'occurrence-select',value},location.origin),stale);await page.waitForTimeout(100);assert.deepEqual(await identity(page),selected,'stale set cannot change the active corpus/result');}
   stale={setId:results.id,index:results.items[0].index,hitId:results.items[0].hitId};
   if(process.env.ELS_SCREENSHOT_DIR){await page.locator('.els29-native-panel-wrap').scrollIntoViewIfNeeded();await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`regular-results-${scope}-390.png`)});}
   const crossed=await reliabilityCross(page,'צוריאל','פולייס');
   assert.equal(crossed.scope,scope);assert.ok(crossed.search.results.items.some(item=>item.available));
   assert.equal(crossed.search.occurrences,null);
   assert.equal(await page.locator('.els29-native-panel-head strong').innerText(),'תוצאות הצלבה');
   assert.ok(await page.locator('.els29-native-results:visible .els29-native-result').count()>0);
   const meeting=crossed.search.results.items.find(item=>item.available&&item.index!==crossed.search.zoneIndex);
   if(meeting){await activate(page,`פתח מפגש ${meeting.index+1}`);await page.waitForFunction(id=>window.__state.axis.hitId===id,meeting.hitId);}
  }
  await activate(page,'חיפוש רגיל');
  await page.evaluate(()=>window.__fixtureVerificationDenied=true);
  await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('תורה');await activate(page,'חפש');
  await page.waitForFunction(()=>window.__operation?.status==='error');
  assert.equal(await page.locator('.els29-native-results:visible .els29-native-result').count(),0,'failure never displays the previous list as a new result');
  assert.ok((await page.locator('.els29-native-results:visible').innerText()).includes('האימות'));
  await page.evaluate(()=>window.__fixtureVerificationDenied=false);
  await activate(page,'נסה שוב');await page.waitForFunction(()=>window.__operation?.status==='done');
  assert.ok(await page.locator('.els29-native-results:visible .els29-native-result').count()>0);
  await page.evaluate(()=>window.__fixtureHoldVerification=true);
  await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('משה');await activate(page,'חפש');
  await page.waitForFunction(()=>typeof window.__fixtureReleaseVerification==='function');
  await activate(page,'בטל חיפוש');
  assert.ok((await page.locator('.els29-native-results:visible').innerText()).includes('בוטל'));
  await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification();});
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.els29-native-results:visible .els29-native-result').count(),0);
 },{realHost:true,loadGolden:false,onboarded:false,tier:'anon',mobile:true});
});

 test('native bridge: parent research updates during a state message cannot discard the completed result',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:45000},async()=>{
 await withNative({width:390,height:844},async page=>{
  await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('יהוה');await activate(page,'חפש');
  await page.waitForFunction(()=>window.__operation?.status==='done');
  assert.ok(await page.evaluate(()=>window.__reentrantCount>0));
  assert.equal(await page.locator('.els29-native-stage-head h3').innerText(),'יהוה','native matrix receives the exact state despite synchronous parent updates');
  assert.equal(await page.locator('.els29-native-results:visible .els29-native-result').count(),80);
 },{realHost:true,loadGolden:false,reentrantRender:true});
 });

test('native form: crossing terms stay adjacent before the shared submit on mobile and desktop',
 {skip:!canRun,timeout:90000},async()=>{
 for(const width of [390,1440]) await withNative({width,height:1000},async page=>{
  const form=page.locator('#els29-query');
  await form.getByRole('button',{name:'הצלבה בין צירים',exact:true}).click();
  const first=form.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}),second=form.getByRole('textbox',{name:'מונח שני',exact:true});
  await first.fill('צוריאל');await second.fill('פולייס');
  const a=await first.boundingBox(),b=await second.boundingBox();
  assert.ok(b.y>=a.y+a.height&&b.y-(a.y+a.height)<55,'second term follows the first, with no controls between');
  assert.ok(Math.abs(a.x-b.x)<2&&Math.abs(a.width-b.width)<2,'terms share the same column');
  const submit=form.locator('button[type=submit]:visible');
  assert.equal(await submit.count(),1);
  assert.equal(await submit.textContent(),'חפש הצלבה');
  assert.ok(await submit.evaluate(button=>Boolean(document.querySelector('[data-els-native-cross] input').compareDocumentPosition(button)&Node.DOCUMENT_POSITION_FOLLOWING)));
  await form.getByRole('button',{name:'חיפוש רגיל',exact:true}).click();
  assert.equal(await first.inputValue(),'צוריאל');assert.equal(await second.count(),0);
  await form.getByRole('button',{name:'הצלבה בין צירים',exact:true}).click();
  assert.equal(await second.inputValue(),'פולייס','mode switch retains the draft');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(process.env.ELS_SCREENSHOT_DIR)await form.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`cross-form-${width}.png`)});
 });
});

test('matrix analysis submits only on explicit action and keeps successive axis identities separate',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 for(const width of [320,1440])await withNative({width,height:900},async page=>{
  assert.equal(await page.evaluate(()=>(window.__matrixSubmits||[]).length),0);
  await page.locator('.els29-ai-entry').click();
  assert.equal(await page.evaluate(()=>(window.__matrixSubmits||[]).length),0,'opening AI panel never submits');
  await page.getByRole('button',{name:'בקש מרזיאל לבדוק את המטריצה'}).click();
  const first=await page.evaluate(()=>window.__matrixSubmits[0]);
  assert.equal(first.trust.matrix,'unverified_presentation');
  const form=page.locator('#els29-query');await form.getByRole('textbox',{name:'מונח',exact:true}).fill('משיח טבת עשירי');
  await form.getByRole('button',{name:'חפש',exact:true}).click();
  await page.waitForFunction(()=>window.__operation?.status==='done',null,{timeout:90000});
  assert.equal(await page.evaluate(()=>window.__matrixSubmits.length),1,'search does not submit AI');
  await page.locator('.els29-ai-entry').click();
  await page.getByRole('button',{name:'בקש מרזיאל לבדוק את המטריצה'}).click();
  const items=await page.evaluate(()=>window.__matrixSubmits);
  assert.equal(items.length,2);assert.notEqual(items[0].axis.hitId,items[1].axis.hitId);
  assert.equal(items[1].axis.term,'משיחטבתעשירי');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 },{realHost:true,loadGolden:true,matrixAnalysis:true});
});

test('shared matrix AI card is available across profiles without automatic submission',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 for(const profile of [{researchProfile:false},{researchProfile:true},{researchProfile:true,guided:true}])
  for(const width of [320,1440]) await withNative({width,height:900},async page=>{
   if(profile.guided) await page.getByRole('button',{name:'פתח מטריצה מדויקת'}).click();
   const card=page.locator('.els29-matrix-ai-card');
   assert.equal(await card.count(),1,JSON.stringify(profile));
   assert.equal(await card.isVisible(),false,'card is quiet until explicit opening');
   await page.locator('.els29-ai-entry').click();
   assert.equal(await card.isVisible(),true);
   assert.equal(await page.getByRole('textbox',{name:'חיפוש משני במטריצה'}).count(),0,'AI inspector does not mix in the secondary search rail');
   assert.equal(await page.locator('.els29-native-unified-rail').isVisible(),false);
   assert.match(await card.innerText(),/סריקת Fable המורחבת עדיין אינה מחוברת/);
   assert.equal(await page.evaluate(()=>(window.__matrixSubmits||[]).length),0);
   assert.equal(page.__elsDynamicLexiconRequests.length,0,'opening a profile with the AI card does not load the broad language asset');
   assert.equal(page.__elsGuidedSnapshotRequests.length,0,'opening a profile does not load discovery results');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  },{realHost:true,loadGolden:true,matrixAnalysis:true,...profile});
});

test('Research removes the redundant unified button but regular search still accepts the complete phrase',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 for(const width of [320,1440])await withNative({width,height:900},async page=>{
  const form=page.locator('#els29-query');
  await form.getByRole('button',{name:'הצלבה בין צירים',exact:true}).click();
  await form.getByRole('textbox',{name:'מונח ראשון'}).fill('משיח');
  await form.getByRole('textbox',{name:'מונח שני'}).fill('טבת');
  assert.equal(await form.getByRole('button',{name:'חפש את המילים כציר מאוחד'}).count(),0);
  assert.equal(await form.getByRole('button',{name:'כל הכלים',exact:true}).count(),0);
  await form.getByRole('button',{name:'חיפוש רגיל',exact:true}).click();
  await form.getByRole('textbox',{name:'מונח',exact:true}).fill('משיח טבת עשירי');
  await form.getByRole('button',{name:'חפש',exact:true}).click();
  await page.waitForFunction(()=>['done','empty','error'].includes(window.__operation?.status),null,{timeout:90000});
  const result=await page.evaluate(()=>({request:window.__hostLog.filter(x=>x.type==='native-search').at(-1)?.request,operation:window.__operation,state:window.__state}));
  assert.equal(result.request.kind,'regular');assert.equal(result.request.term,'משיח טבת עשירי');
  assert.equal(result.operation.status,'done',JSON.stringify(result.operation));
  assert.equal(result.state.verification.state,'MATCH');
  assert.ok(result.state.search.occurrences.items.some(item=>item.skip===1820), 'verified 1820 occurrence appears');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 },{realHost:true,loadGolden:false});
});

test('research form: optional third axis uses the existing verified triple or the original pair path',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:240000},async()=>{
 for(const width of [320,1440])await withNative({width,height:900},async page=>{
  const form=page.locator('#els29-query');
  await form.getByRole('button',{name:'הצלבה בין צירים',exact:true}).click();
  const first=form.getByRole('textbox',{name:'מונח ראשון'}), second=form.getByRole('textbox',{name:'מונח שני'}), third=form.getByRole('textbox',{name:'מונח שלישי',exact:true});
  const required=form.getByRole('checkbox',{name:'חובה למצוא גם את המונח השלישי'});
  assert.equal(await required.isChecked(),false);
  const gap=form.getByRole('slider',{name:'מרווח מרבי בין אותיות הממצא בהצלבה'});
  assert.equal(await gap.inputValue(),'0');
  await first.fill('תורהקדשה');await second.fill('בחשרתע');await third.fill('כויזלת');
  await required.check();
  const before=await page.evaluate(()=>window.__operation?.requestId||0);
  await form.getByRole('button',{name:'חפש הצלבה'}).click();
  await page.waitForFunction(id=>window.__operation?.requestId>id&&['done','empty','error'].includes(window.__operation.status),before,{timeout:120000});
  const triple=await page.evaluate(()=>({operation:window.__operation,state:window.__state,requests:window.__log.filter(x=>x.type==='engine-request')}));
  assert.equal(await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='native-search').at(-1)?.request?.kind),'cross-three');
  assert.equal(await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='native-search').at(-1)?.request?.maxLetterGap),0);
  assert.equal(triple.operation.status,'done',JSON.stringify(triple.operation));
  assert.equal(triple.state.verification.state,'MATCH');
  assert.ok(triple.state.search.results.items.every(item=>!item.available||item.terms.length===2));
  assert.ok(triple.requests.filter(request=>request.op==='verify_batch'&&request.payload?.strategy?.policy==='GUIDED_THREE_TERM_REPLAY_V1').length>=2);
  assert.equal(await first.inputValue(),'תורהקדשה');assert.equal(await second.inputValue(),'בחשרתע');assert.equal(await third.inputValue(),'כויזלת');
  assert.ok((await page.locator('[aria-label="רשימת מפגשי ההצלבה"]').innerText()).includes('תורהקדשה × בחשרתע × כויזלת'));
  assert.ok((await page.locator('[aria-label="רשימת מפגשי ההצלבה"]').innerText()).includes('זו אינה סריקה מלאה של כל הטקסט'));
  await third.clear();await gap.fill('1');await form.getByRole('button',{name:'חפש הצלבה'}).click();
  await page.waitForFunction(id=>window.__operation?.requestId>id&&['done','empty','error'].includes(window.__operation.status),triple.operation.requestId,{timeout:120000});
  assert.equal((await page.evaluate(()=>window.__operation)).status,'done');
  assert.equal(await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='native-search').at(-1)?.request?.kind),'cross');
  assert.equal(await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='native-search').at(-1)?.request?.maxLetterGap),1);
  const count=await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='native-search').length);
  await third.fill('בחשרתע');await form.getByRole('button',{name:'חפש הצלבה'}).click();
  assert.ok(await page.getByText('להצלבה משולשת נדרשים שלושה מונחים שונים, בני 2–12 אותיות כל אחד.').isVisible());
  assert.equal(await page.evaluate(()=>window.__hostLog.filter(x=>x.type==='native-search').length),count,'invalid triple never starts a search');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 },{realHost:true,loadGolden:false});
});

test('three-term research can continue the available axes after a bounded first wave',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:300000},async t=>{
 await withNative({width:320,height:900},async page=>{
  const form=page.locator('#els29-query');await form.getByRole('button',{name:'הצלבה בין צירים',exact:true}).click();
  await form.getByRole('textbox',{name:'מונח ראשון'}).fill('משיח');
  await form.getByRole('textbox',{name:'מונח שני'}).fill('טבת');
  await form.getByRole('textbox',{name:'מונח שלישי',exact:true}).fill('עשירי');
  await form.getByRole('checkbox',{name:'חובה למצוא גם את המונח השלישי'}).check();
  await form.getByRole('button',{name:'חפש הצלבה'}).click();
  await page.waitForFunction(()=>['done','empty','error'].includes(window.__operation?.status),null,{timeout:180000});
  const first=await page.evaluate(()=>window.__operation);
  assert.equal(first.status,'empty','the no-hit first wave still offers continuation');
  assert.equal(first.progress.phase,'cross-three-wave');
  assert.ok(first.progress.canContinue,JSON.stringify(first.progress));
  await page.getByRole('button',{name:'המשך לגל הבא'}).click();
  await page.waitForFunction(id=>window.__operation?.requestId>id&&['done','empty','error'].includes(window.__operation.status),first.requestId,{timeout:180000});
  const next=await page.evaluate(()=>window.__operation);
  t.diagnostic(JSON.stringify({first:first.status,second:next.status,firstScanned:first.progress.scanned,secondScanned:next.progress.scanned,available:next.progress.available}));
  assert.ok(['done','empty'].includes(next.status),JSON.stringify(next));
  assert.equal(next.progress.token,first.progress.token);
  assert.ok(next.progress.scanned>first.progress.scanned,JSON.stringify(next.progress));
  assert.equal(next.progress.available,first.progress.available);
  assert.ok((await page.locator('[aria-label="רשימת מפגשי ההצלבה"]').innerText()).includes('זו אינה סריקה מלאה של כל הטקסט'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await form.getByRole('button',{name:'חיפוש רגיל',exact:true}).click();
  await form.getByRole('textbox',{name:'מונח',exact:true}).fill('מקדש ירד');
  await form.getByRole('button',{name:'חפש',exact:true}).click();
  await page.waitForFunction(id=>window.__operation?.requestId>id&&window.__operation.status==='done',next.requestId,{timeout:90000});
  const current=await page.evaluate(()=>window.__state.axis.hitId);
  await page.locator('iframe').evaluate((frame,token)=>frame.contentWindow.postMessage({source:'sod-host',type:'native-search',request:{kind:'cross-three-continue',token,scope:'torah'},requestId:999999},location.origin),first.progress.token);
  await page.waitForFunction(()=>window.__operation?.requestId===999999&&window.__operation.status==='error',null,{timeout:15000});
  assert.equal(await page.evaluate(()=>window.__state.axis.hitId),current,'stale continuation cannot replace the new axis');
 },{realHost:true,loadGolden:false});
});

test('research keeps the additional third-axis tool hidden while its engine contract stays verified',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 await withNative({width:320,height:900},async page=>{
  const form=page.locator('#els29-query');await form.getByRole('button',{name:'הצלבה בין צירים',exact:true}).click();
  await form.getByRole('textbox',{name:'מונח ראשון'}).fill('תורהקדשה');await form.getByRole('textbox',{name:'מונח שני'}).fill('בחשרתע');
  await form.getByRole('button',{name:'חפש הצלבה'}).click();
  await page.waitForFunction(()=>window.__operation?.status==='done',null,{timeout:90000});
  const original=await page.evaluate(()=>({id:window.__state.search.results.id,axis:window.__state.axis.hitId,count:window.__hostLog.filter(x=>x.type==='native-search').length}));
  assert.equal(await page.getByRole('region',{name:'חיפוש ציר שלישי בתוך מפגשי ההצלבה'}).count(),0);
  const request={setId:original.id,term:'כויזלת',meetingScope:'selected',meetingIndex:0,maxDistance:18,nativeSeq:999};
  await page.locator('iframe').evaluate((frame,target)=>frame.contentWindow.postMessage({source:'sod-host',type:'request-lens',lens:'cross-third-axis',target},location.origin),request);
  await page.waitForFunction(()=>window.__lens?.lens==='cross-third-axis',null,{timeout:90000});
  const result=await page.evaluate(()=>({lens:window.__lens,state:window.__state,count:window.__hostLog.filter(x=>x.type==='native-search').length}));
  assert.equal(result.lens.ok,true,JSON.stringify(result.lens));
  assert.equal(result.lens.target.setId,original.id);assert.equal(result.state.axis.hitId,original.axis);assert.equal(result.count,original.count);
  assert.ok(result.lens.items.length>0,'a known third axis is returned, not merely an empty successful response');
  assert.ok(result.lens.items.every(item=>['VERIFIED','SOURCE_EXACT'].includes(item.status)));
  await page.evaluate(()=>{window.__fixtureVerificationDenied=true;window.__lens=null;});
  await page.locator('iframe').evaluate((frame,target)=>frame.contentWindow.postMessage({source:'sod-host',type:'request-lens',lens:'cross-third-axis',target},location.origin),request);
  await page.waitForFunction(()=>window.__lens?.lens==='cross-third-axis',null,{timeout:90000});
  assert.equal((await page.evaluate(()=>window.__lens)).ok,false,'verification outage cannot be reported as no-hit or a verified third axis');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 },{realHost:true,loadGolden:false});
});

test('matrix pinch zoom changes only presentation on mobile',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:90000},async()=>{
 for(const width of [320,390])await withNative({width,height:844},async page=>{
  const matrix=page.locator('.els29-native-matrix-scroll');await matrix.scrollIntoViewIfNeeded();
  const before=await identity(page), zoom=await page.evaluate(()=>window.__state.ui.zoom), rect=await matrix.boundingBox();
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  const x=rect.x+rect.width/2,y=rect.y+Math.min(rect.height/2,120);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-24,y},{x:x+24,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-48,y},{x:x+48,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(z=>window.__state?.ui?.zoom>z,zoom,{timeout:15000});
  assert.deepEqual(await identity(page),before,'pinch must not alter the selected occurrence, geometry or findings');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await cdp.detach();
 },{realHost:true,mobile:true});
});

test('connected cross results expose only adjacent letters',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:120000},async(t)=>{
 for(const width of [320,1440])for(const scope of ['torah','tanakh'])await withNative({width,height:900},async page=>{
  const form=page.locator('#els29-query');await form.getByRole('button',{name:'הצלבה בין צירים',exact:true}).click();
  await form.getByRole('textbox',{name:'מונח ראשון'}).fill('צוריאל');await form.getByRole('textbox',{name:'מונח שני'}).fill('פולייס');
  await form.getByRole('button',{name:scope==='torah'?'חפש הצלבה':'כל התנ״ך'}).click();
  await page.waitForFunction(()=>['done','empty','error'].includes(window.__operation?.status),null,{timeout:90000});
  const observed=await page.evaluate(()=>({operation:window.__operation,state:window.__state}));
  t.diagnostic(JSON.stringify({width,scope,status:observed.operation.status,items:observed.state?.search?.results?.items?.length||0}));
  assert.notEqual(observed.operation.status,'error');
  if(observed.operation.status==='done'){
   for(const finding of observed.state.findings)for(const hit of finding.hits.filter(hit=>hit.shown&&hit.verified)){
    const S=observed.state.geometry.S,positions=Array.from(finding.t,(_,i)=>hit.start+hit.dir*hit.skip*i);
    assert.ok(positions.slice(1).every((p,i)=>Math.abs(Math.floor(p/S)-Math.floor(positions[i]/S))<=1&&Math.abs(p%S-positions[i]%S)<=1));
   }
  }
  await form.getByRole('slider',{name:'מרווח מרבי בין אותיות הממצא בהצלבה'}).fill('20');
  await form.getByRole('button',{name:'חפש הצלבה'}).click();
  await page.waitForFunction(id=>window.__operation?.requestId>id&&['done','empty','error'].includes(window.__operation.status),observed.operation.requestId,{timeout:90000});
  const wide=await page.evaluate(()=>({status:window.__operation.status,items:window.__state?.search?.results?.items?.length||0}));
  assert.notEqual(wide.status,'error');t.diagnostic(JSON.stringify({width,scope,gap:20,...wide}));
 },{realHost:true,loadGolden:false});
});

test('native form: a phrase and its split-and-cross action stay in one centered search bundle',
 {skip:!canRun,timeout:90000},async()=>{
 for(const width of [390,1440]) await withNative({width,height:1000},async page=>{
  const form=page.locator('#els29-query');
  const term=form.getByRole('textbox',{name:'מונח',exact:true});
  await term.fill('תורת אמת');
  const coach=form.locator('.els29-native-search-coach');
  const split=coach.getByRole('button',{name:'פצל והצלב',exact:true});
  assert.equal(await coach.evaluate(node=>node.parentElement.className),'els29-native-query-terms');
  const field=await term.boundingBox(),note=await coach.boundingBox(),outer=await form.boundingBox();
  const region=await page.locator('.sod29-content.wide').boundingBox();
  assert.ok(note.y>=field.y+field.height&&note.y-(field.y+field.height)<24,'split action follows its term without an intervening panel');
  assert.ok(Math.abs(note.x-field.x)<2&&Math.abs(note.width-field.width)<2,'term and split action share one column');
  assert.ok(Math.abs((outer.x+outer.width/2)-(region.x+region.width/2))<8,'search bundle is centered within the content area');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await split.click();
  assert.equal(await form.getByRole('textbox',{name:'מונח ראשון',exact:true}).inputValue(),'תורת');
  assert.equal(await form.getByRole('textbox',{name:'מונח שני',exact:true}).inputValue(),'אמת');
  assert.equal(await form.locator('button[type=submit]:visible').textContent(),'חפש הצלבה');
 });
});

test('Research exact probe is one-shot across repeated ready before and after verification',
 {skip:!canRun,timeout:90000},async()=>{
 await withNative({width:390,height:844},async page=>{
  await page.evaluate(()=>{
   window.__fixtureHoldVerification=true;
   window.__probeResearch({term:'תורה קדשה',scope:'torah',skip:10065,requestId:101});
  });
  await page.waitForFunction(()=>window.__fixtureHeld?.length===1);
  const frame=page.frames().find(candidate=>candidate.url().includes('tzofen.html'));
  const tiersBefore=await page.evaluate(()=>window.__hostLog.filter(message=>message.type==='tier').length);
  await frame.evaluate(()=>parent.postMessage({source:'tzofen',type:'ready'},location.origin));
  // A tier acknowledgement is the barrier: the host processed repeat readiness.
  await page.waitForFunction(before=>window.__hostLog.filter(message=>message.type==='tier').length>before,tiersBefore);
  await page.evaluate(()=>{
   window.__fixtureHoldVerification=false;
   // Release ONLY the original probe. Opening its verified matrix used to
   // cancel a second probe that the ready replay had unnecessarily started.
   window.__fixtureHeld.shift()();
  });
  await page.waitForFunction(()=>window.__state?.status==='ok'&&window.__state?.axis?.hitId==='10065_1_50890');
  const evidence=await page.evaluate(()=>({
   history:window.__probeHistory.filter(result=>result.requestId===101).map(result=>({ok:result.ok,reason:result.reason})),
   requests:window.__hostLog.filter(message=>message.type==='probe-exact-skip'&&message.request.requestId===101).length,
   cancelled:window.__log.filter(message=>message.type==='engine-cancel').length,
  }));
  assert.deepEqual(evidence.history,[{ok:true,reason:null}],JSON.stringify(evidence));
  assert.equal(evidence.requests,1,'one explicit probe, no replay on a duplicate ready');
  const before=await page.evaluate(()=>({tiers:window.__hostLog.filter(m=>m.type==='tier').length,
   probes:window.__hostLog.filter(m=>m.type==='probe-exact-skip').length,
   loads:window.__hostLog.filter(m=>m.type==='load-matrix').length}));
  await frame.evaluate(()=>parent.postMessage({source:'tzofen',type:'ready'},location.origin));
  await page.waitForFunction(n=>window.__hostLog.filter(m=>m.type==='tier').length>n,before.tiers);
  const after=await page.evaluate(()=>({probes:window.__hostLog.filter(m=>m.type==='probe-exact-skip').length,
   loads:window.__hostLog.filter(m=>m.type==='load-matrix').length}));
  assert.equal(after.probes,before.probes,'completed probes do not repeat');
  assert.equal(after.loads,before.loads,'repeat readiness must not reload the current matrix');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 },{realHost:true,loadGolden:false});
});

test('Research exact probe ignores delayed success after a newer no-hit request and allows explicit retry',
 {skip:!canRun,timeout:90000},async()=>{
 await withNative({width:320,height:844},async page=>{
  await page.evaluate(()=>{
   window.__fixtureHoldVerification=true;
   window.__probeResearch({term:'תורה קדשה',scope:'torah',skip:10065,requestId:201});
  });
  await page.waitForFunction(()=>window.__fixtureHeld?.length===1);
  await page.evaluate(()=>window.__probeResearch({term:'תורה קדשה',scope:'torah',skip:400000,requestId:202}));
  await page.waitForFunction(()=>window.__probeResult?.requestId===202);
  assert.equal(await page.evaluate(()=>window.__probeResult.ok),false);
  await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification();});
  await page.waitForFunction(()=>window.__log.some(m=>m.type==='exact-skip-probe-result'&&m.requestId===201&&m.ok));
  // Real verification of the old request succeeds, but must never reach the
  // consumer for the new request or load the old axis into its empty matrix.
  assert.deepEqual(await page.evaluate(()=>window.__probeHistory.map(m=>[m.requestId,m.ok])),[[202,false]]);
  assert.equal(await page.evaluate(()=>window.__state?.status==='ok'),false);
  await page.evaluate(()=>window.__probeResearch({term:'תורה קדשה',scope:'torah',skip:400000,requestId:203}));
  await page.waitForFunction(()=>window.__probeResult?.requestId===203);
  assert.deepEqual(await page.evaluate(()=>window.__probeHistory.map(m=>[m.requestId,m.ok])),[[202,false],[203,false]]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 },{realHost:true,loadGolden:false});
});

test('Research exact probe queued before iframe readiness survives load without duplicate work on iframe reload',
 {skip:!canRun,timeout:90000},async()=>{
 await withNative({width:1440,height:1000},async page=>{
  await page.waitForFunction(()=>window.__probeResult?.requestId===301&&window.__state?.status==='ok');
  assert.equal(await page.evaluate(()=>window.__probeResult.ok),true);
  assert.equal(await page.evaluate(()=>window.__hostLog.filter(m=>m.type==='probe-exact-skip').length),1);
  const frame=page.frames().find(candidate=>candidate.url().includes('tzofen.html'));
  const readyBefore=await page.evaluate(()=>window.__log.filter(m=>m.type==='ready').length);
  await frame.evaluate(()=>location.reload());
  await page.waitForFunction(n=>window.__log.filter(m=>m.type==='ready').length>n,readyBefore);
  await page.waitForFunction(()=>window.__hostLog.filter(m=>m.type==='load-matrix').length>=2);
  await page.waitForFunction(()=>window.__state?.status==='ok'&&window.__state?.axis?.hitId==='10065_1_50890');
  assert.equal(await page.evaluate(()=>window.__hostLog.filter(m=>m.type==='probe-exact-skip').length),1,'reload restores the exact matrix but does not repeat a completed probe');
  assert.deepEqual(await page.evaluate(()=>window.__probeHistory.map(m=>[m.requestId,m.ok])),[[301,true]]);
 },{realHost:true,loadGolden:false,initialProbe:{term:'תורה קדשה',scope:'torah',skip:10065,requestId:301}});
});

test('Research exact skip above the page ceiling loads a canonical verified axis without remounting Classic',
 {skip:!canRun,timeout:90000},async()=>{
 await withNative({width:1440,height:1000},async page=>{
  await page.evaluate(()=>window.__probeResearch({term:'תורה קדשה',scope:'torah',skip:10065,requestId:1}));
  await page.waitForFunction(()=>window.__probeResult?.requestId===1,null,{timeout:60000});
  await page.waitForFunction(()=>window.__state?.status==='ok'&&window.__state?.axis?.skip===10065,null,{timeout:60000});
  assert.equal(await page.evaluate(()=>window.__probeResult?.ok),true);
  assert.equal(await page.evaluate(()=>window.__state.axis.hitId),'10065_1_50890');
  assert.equal(await page.evaluate(()=>window.__state.verification.state),'MATCH');
  await page.evaluate(()=>window.__probeResearch({term:'תורה קדשה',scope:'torah',skip:400000,requestId:2}));
  await page.waitForFunction(()=>window.__probeResult?.requestId===2);
  assert.equal(await page.evaluate(()=>window.__probeResult.ok),false,'no-hit probe does not claim success');
  assert.equal(await page.evaluate(()=>window.__state.axis.hitId),'10065_1_50890','no-hit probe preserves the current matrix');
  await page.evaluate(()=>window.__probeResearch({term:'תורה קדשה',scope:'torah',skip:400000,requestId:3}));
  await page.waitForFunction(()=>window.__probeResult?.requestId===3);
  assert.equal(await page.evaluate(()=>window.__probeResult.ok),false,'retry of same skip remains a new failed request');
  const probeHistory=await page.evaluate(()=>window.__probeHistory.map(result=>({requestId:result.requestId,ok:result.ok})));
  assert.ok(probeHistory.filter(result=>result.requestId===1).every(result=>result.ok===true),'verified probe responses remain attached to request 1');
  assert.ok(probeHistory.filter(result=>result.requestId===2).every(result=>result.ok===false),'no-hit responses remain attached to request 2');
  assert.ok(probeHistory.filter(result=>result.requestId===3).every(result=>result.ok===false),'no-hit retry responses remain attached to request 3');
 },{realHost:true,loadGolden:false});
});

test('native folder: bounded recent cards, collapse, save refresh and library return preserve the workspace',
 {skip:!canRun,timeout:60000},async()=>{
 const server=await vite.createServer({root,configFile:false,plugins:[libraryFixturePlugin(),react()],server:{host:'127.0.0.1',port:0}});let browser;
 try{
  await server.listen();browser=await pw.chromium.launch({headless:true,executablePath});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture?mode=classic`);
  await page.waitForFunction(()=>window.__libraryEngineMounts===1);
  const folder=page.getByRole('region',{name:'תיקיית הצפנים'});
  const toggle=folder.getByRole('button',{name:/תיקיית הצפנים/});
  assert.equal(await toggle.getAttribute('aria-expanded'),'false','mobile starts with a compact folder');
  assert.equal(await page.evaluate(()=>window.__libraryCalls.length),0,'collapsed folder does not fetch');
  await page.evaluate(corpus=>{window.__libraryRows=Array.from({length:7},(_,i)=>({id:'recent-'+i,owner_user_id:'owner-a',title:'צופן שמור '+i,search_term:'תורה',scope:'torah',skip_distance:50,direction:i?'fwd':null,start_index:5,corpus_id:corpus,status:'draft',visibility:'private',created_at:'2026-10-09T12:00:00Z',positions:{findings:[]}}));},ELS_GOLDEN_CORPUS_ID);
  await toggle.click();await folder.locator('.els29-library-card').nth(3).waitFor();
  assert.equal(await folder.locator('.els29-library-card').count(),4);
  const call=await page.evaluate(()=>window.__libraryCalls.at(-1));assert.deepEqual(call.range,[0,4]);
  assert.ok(!call.columns.split(',').includes('positions'),'card fetch excludes heavy saved geometry');
  assert.match(await folder.textContent(),/נשמר ב־/);
  assert.equal(await folder.getByText('צופן ותיק · חיפוש מחדש',{exact:true}).isVisible(),true,'legacy restore disclosure stays visible in compact mobile cards');
  await page.getByLabel('טיוטת חיפוש').fill('צוריאל');
  await button(page,'חיפוש לדוגמה').click();await page.waitForFunction(()=>document.querySelector('.els29-recent-toggle')?.getAttribute('aria-expanded')==='false');
  await toggle.click();await folder.locator('.els29-library-card').nth(3).waitFor();
  await button(page,'לכל הצפנים').click();
  await page.getByRole('region',{name:'ספריית הצפנים'}).locator('.els29-library-card').nth(6).waitFor();
  await button(page,'חזור לחיפוש').click();
  assert.equal(await page.getByLabel('טיוטת חיפוש').inputValue(),'צוריאל');
  assert.equal(await page.evaluate(()=>window.__libraryEngineMounts),1,'library round-trip keeps the same engine');
  await page.evaluate(()=>window.__libraryRows.unshift({...window.__libraryRows[0],id:'new-save',title:'שמירה חדשה'}));
  await button(page,'שמירה לדוגמה').click();await folder.getByRole('heading',{name:'שמירה חדשה'}).waitFor();
  await page.evaluate(()=>window.__switchLibraryUser(null));
  await page.waitForFunction(()=>!document.body.textContent.includes('שמירה חדשה'));
  assert.equal(await folder.locator('.els29-library-card').count(),0,'private recent cards leave immediately on sign-out');
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await server.close();}
});

test('historical search repairs: pending identity, saved skip, ordered continuation and finding pages',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 await withNative({width:1440,height:1000},async page=>{
  const send=message=>page.locator('iframe').evaluate((frame,message)=>frame.contentWindow.postMessage({source:'sod-host',...message},location.origin),message);
  const before=await identity(page);
  await page.evaluate(()=>window.__fixtureHoldVerification=true);
  await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('משיח');
  await activate(page,'כל התנ״ך');
  await page.waitForFunction(()=>window.__fixtureReleaseVerification&&['searching','verifying'].includes(window.__operation?.status));
  await send({type:'native-control',action:'heat-toggle'});
  await send({type:'tier',tier:'admin'});
  await page.waitForTimeout(100);
  assert.deepEqual(await identity(page),before,'pending scope never relabels the committed matrix');
  await activate(page,'בטל חיפוש');
  await page.evaluate(()=>{window.__fixtureHoldVerification=false;window.__fixtureReleaseVerification?.();});
  await page.waitForTimeout(120);
  assert.deepEqual(await identity(page),before,'cancel keeps the committed scope and axis');

  await send({type:'load-matrix',item:{term:'אחרית',scope:'torah',skip:15,words:[]}});
  await page.waitForFunction(()=>window.__state?.term==='אחרית'&&window.__state.status==='ok');
  assert.equal(await page.evaluate(()=>window.__state.axis.skip),15,'never substitute skip 12 for legacy skip 15');

  await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('משיח');await activate(page,'חפש');
  await page.waitForFunction(()=>window.__operation?.status==='done'&&window.__state?.term==='משיח');
  const first=await page.evaluate(()=>window.__state.search.occurrences);
  assert.equal(first.ordered.completeThrough,50);
  assert.equal(first.items.filter(h=>h.skip===2).length,31,'every skip-2 occurrence is exposed, not only the sampled two');
  const axis=await identity(page);
  await activate(page,'המשך סריקה בדילוגים 51–100');
  await page.waitForFunction(()=>window.__operation?.status==='done'&&window.__state.search.occurrences.ordered.completeThrough===100);
  const continued=await identity(page);assert.deepEqual([continued.axis,continued.scope,continued.geometry],[axis.axis,axis.scope,axis.geometry],'continuation preserves the selected occurrence');

  await send({type:'load-matrix',item:{term:'תורה',scope:'torah',skip:50,start:5,dir:1,words:['משה']}});
  await page.waitForFunction(()=>window.__state?.axis?.hitId==='50_1_5'&&window.__state.findings[0]?.hits.some(h=>h.verified));
  await openPanel(page);
  await activate(page,'מופעים וצבע של משה');
  const old=await page.evaluate(()=>window.__state.findings[0]);
  assert.ok(old.total>40&&old.pageTotal>1,'late findings stay in the full retained set');
  await activate(page,'מופעים נוספים');
  await page.waitForFunction(()=>window.__state.findings[0].page===1);
  const second=await page.evaluate(()=>window.__state.findings[0]);
  assert.ok(second.hits.some(h=>h.candidateIndex>=40));
  const pick=second.hits.find(h=>!h.selectedOnly&&!h.selected);
  await send({type:'native-finding-control',term:'משה',action:'toggle-hit',axisHitId:'50_1_5',candidateIndex:pick.candidateIndex,revision:pick.revision});
  await page.waitForFunction(index=>window.__state.findings[0].hits.some(h=>h.candidateIndex===index&&h.verified&&h.shown),pick.candidateIndex);

  await page.getByRole('textbox',{name:/^מונח(?: ראשון)?$/}).fill('צוריאל פולייס');
  await activate(page,'פצל והצלב');
  assert.equal(await page.getByRole('textbox',{name:'מונח ראשון',exact:true}).inputValue(),'צוריאל');
  assert.equal(await page.getByRole('textbox',{name:'מונח שני',exact:true}).inputValue(),'פולייס');
 },{realHost:true});
});

test('historical cross repairs: every found meeting is pageable and continuation advances the unscanned tail',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:180000},async()=>{
 await withNative({width:390,height:844},async page=>{
  const first=await reliabilityCross(page,'ישראל','משה');
  assert.ok(first.search.results.items.length>24,'no top-24 deletion');
  const list=page.locator('[aria-label="רשימת מפגשי ההצלבה"]');
  assert.ok(await list.locator('.els29-native-result').count()<=40,'DOM remains bounded');
  if(first.search.results.items.length>40){await activate(page,'מפגשים נוספים');assert.equal(await button(page,'פתח מפגש 41').count(),1);}
  const oldKeys=first.search.results.items.filter(x=>x.available).map(x=>`${x.axis}:${x.hitId}`);
  await activate(page,'המשך סריקת צירים');
  await page.waitForFunction(scanned=>window.__operation?.status==='done'&&window.__state.search.coverage.scanned>scanned,first.search.coverage.scanned,{timeout:90000});
  const next=await page.evaluate(()=>window.__state);
  assert.equal(next.search.coverage.scanned,Math.min(first.search.coverage.scanned+300,first.search.coverage.available));
  assert.equal(next.axis.hitId,first.axis.hitId,'continuation does not switch the selected matrix');
  const keys=new Set(next.search.results.items.filter(x=>x.available).map(x=>`${x.axis}:${x.hitId}`));
  assert.ok(oldKeys.every(key=>keys.has(key)),'new wave retains every previously found meeting');
  assert.ok(await list.locator('.els29-native-result').count()<=40);
 },{realHost:true,loadGolden:false});
});

test('design integration: royal controls preserve matrix identity and stable touch targets in all presets and widths',
 {skip:!canRun&&'Native browser tooling unavailable',timeout:240000},async()=>{
  for(const width of [320,390,1440]) await withNative({width,height:1000},async page=>{
   const baseline=await identity(page);
   const dock=page.locator('.sod29-command-island');
   await page.waitForFunction(()=>document.querySelector('.sod29-command-island')?.dataset.commandMode==='tool');
   for(const preset of ['light','parchment','dark']){
    await page.evaluate(preset=>window.__setThemePreset(preset),preset);
    await dock.getByRole('button',{name:'חיפוש בצופן',exact:true}).click();
    const submit=page.locator('.els29-native-search');
    const primary=await submit.evaluate(el=>({background:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color,font:getComputedStyle(el).fontFamily}));
    // The primary action role is royal blue in every preset (Design V2 section 4); Night keeps the approved
    // warm black-brown surfaces and Crown gold as identity atmosphere, not as the action color.
    // Interaction tests below still enforce the same matrix identity and touch geometry in all presets.
    assert.match(primary.background,/49, 93, 213/,`${preset}: shared primary palette`);
    assert.equal(primary.color,'rgb(255, 255, 255)');
    assert.match(primary.font,/Rubik/);
    assert.ok(await page.locator('[data-palette-probe]').evaluate(el=>{const p=JSON.parse(el.dataset.paletteProbe),root=getComputedStyle(el.closest('.sod29-root'));return p.accent===root.getPropertyValue('--s29-accent').trim()&&p.panel===root.getPropertyValue('--s29-panel').trim();}),'frame children inherit the same preset/environment palette as its CSS');
    const mode=page.locator('.els29-native-search-mode button').last();
    await mode.scrollIntoViewIfNeeded();
    const before=await mode.boundingBox();
    if(width<981){
     const cdp=await page.context().newCDPSession(page);
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:before.x+3,y:before.y+before.height/2}]});
     assert.deepEqual(await mode.boundingBox(),before,`${width}/${preset}: pressure keeps the entire target stable`);
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     await cdp.detach();
    }else{
     await page.mouse.move(before.x+3,before.y+before.height/2);await page.mouse.down();
     assert.deepEqual(await mode.boundingBox(),before,'mouse pressure keeps the target stable');
     await page.mouse.up();
    }
    await page.waitForFunction(()=>document.querySelector('.els29-native-search-mode button:last-child')?.getAttribute('aria-pressed')==='true');
    await page.locator('.els29-native-search-mode button').first().click();
    if(await page.locator('#els29-context-panel').isVisible())await page.getByRole('button',{name:'סגור כלי מטריצה',exact:true}).click();
    await page.evaluate(()=>{
      window.__elsIconPressObserved=0;
      window.__elsOriginalAnimate=Element.prototype.animate;
      Element.prototype.animate=function(frames,options){
        if(options?.id==='sod29-icon-press')window.__elsIconPressObserved++;
        return window.__elsOriginalAnimate.call(this,frames,options);
      };
    });
    await dock.getByRole('button',{name:'סריקה וממצאים',exact:true}).focus();
    await page.keyboard.press('Enter');
    assert.ok(await page.evaluate(()=>window.__elsIconPressObserved>0),'shared SVG reacts to keyboard activation');
    await page.evaluate(()=>{Element.prototype.animate=window.__elsOriginalAnimate;});
    await page.locator('#els29-context-panel').waitFor();
    const controls=await page.locator('.els29-native-query button,.els29-native-context-panel button,.els29-native-context-panel select').evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>({name:el.textContent.trim().slice(0,50),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)})));
    for(const c of controls)assert.ok(c.width>=43.9&&c.height>=43.9,`${width}/${preset}: 44px ${JSON.stringify(c)}`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}/${preset}: no document overflow`);
    assert.deepEqual((await identity(page)).axis,baseline.axis,'presentation does not replace the axis');
    const matrix=await page.locator('.els29-native-matrix-scroll').evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.equal(matrix,{light:'rgb(255, 254, 249)',parchment:'rgb(255, 244, 212)',dark:'rgb(23, 18, 14)'}[preset]);
    if(process.env.ELS_SCREENSHOT_DIR){mkdirSync(process.env.ELS_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`integrated-${preset}-${width}.png`),fullPage:true});}
   }
   for(const setting of ['os','frame']){
    if(setting==='os')await page.emulateMedia({reducedMotion:'reduce'});
    else{await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.sod29-root').evaluate(el=>el.dataset.frameReducedMotion='true');}
    const action=dock.getByRole('button',{name:'שמירה',exact:true});
    if(await page.locator('#els29-context-panel').isVisible())await activate(page,'סגור כלי מטריצה');
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await action.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#els29-context-panel header strong')?.textContent==='שמירה והמשך מחקר');
    assert.equal(await page.locator('#els29-context-panel header strong').innerText(),'שמירה והמשך מחקר');
    assert.equal(await action.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.id==='sod29-icon-press').length),0,`${setting}: no decorative pulse`);
   }
  },{fullFrame:true,mobile:width<981});
 });
