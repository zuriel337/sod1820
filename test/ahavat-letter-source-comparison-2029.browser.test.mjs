import assert from "node:assert/strict";
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {createServer} from "vite";
import react from "@vitejs/plugin-react";
import {AHAVAT_LETTER_FORMS,AHAVAT_LETTER_READINGS,ahavatLetterNumber} from "../src/data/ahavatTorahLetters2029.js";
import {ahavatLetterUnitId,ahavatReaderUnitHref} from "../src/data/ahavatTorahReaderUnits2029.js";
import {ahavatLetterComparisonRows,ahavatParashaLettersCsv} from "../src/components/books2029/ahavatLetterJourney2029.js";
import {ahavatNativePdfPageAtStart} from "./fixtures/ahavat-native-pdf-page-2029.mjs";
const {chromium}=createRequire(import.meta.url)("playwright"),root=fileURLToPath(new URL("..",import.meta.url));
const out="/workspace/artifacts/ahavat-parasha-comparison-20261029";mkdirSync(out,{recursive:true});
const pdf=readFileSync("/workspace/artifacts/ahavat-book-completion-20261029/source-witness/original.pdf");
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
async function click(target){
  await target.evaluate(element=>element.focus({preventScroll:true}));let hit=false;
  for(let frame=0;frame<8;frame++){await target.evaluate(element=>element.scrollIntoView({block:"center",behavior:"instant"}));await settle(target.page());hit=await target.evaluate(element=>{const r=element.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return !!top&&element.contains(top);});if(hit)break;}
  assert.equal(hit,true,"real comparison control must be uncovered");await target.click();
}
async function native(page,physical){
  let observations=[];
  for(let attempt=0;attempt<120;attempt++){
    observations=[];
    for(const frame of page.frames())try{const snapshot=await frame.evaluate(n=>{const v=document.querySelector("pdf-viewer"),p=v?.viewport_;if(!p||!v.documentDimensions)return null;return{loadState:v.loadState_,documentPages:v.documentDimensions.pageDimensions.length,pageIndex:n-1,viewportHeight:p.size.height,requestedRect:p.getPageScreenRect(n-1),previousRect:n>1?p.getPageScreenRect(n-2):null};},physical);observations.push(snapshot);if(ahavatNativePdfPageAtStart(snapshot,physical))return;}catch(error){observations.push({error:error.message});}
    await page.waitForTimeout(150);
  }
  const geometry=await page.locator("#ahavat29-source").evaluate(element=>({source:element.getBoundingClientRect().toJSON(),iframe:element.querySelector("iframe").getBoundingClientRect().toJSON(),actions:element.querySelector(".ahavat29-source-actions").getBoundingClientRect().toJSON()}));
  writeFileSync(`${out}/native-failure-${physical}.json`,JSON.stringify({physical,viewport:page.viewportSize(),observations,geometry},null,2)+"\n");
  await page.screenshot({path:`${out}/native-failure-${physical}.png`});
  assert.fail(`comparison native PDF ${physical} did not reach its exact physical anchor`);
}
test("same-letter comparison preserves both source readings, exact return, CSV and one explicit model in nine contexts",{timeout:480_000},async()=>{
  assert.equal(createHash("sha256").update(pdf).digest("hex"),"895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  process.env.SOD_BUILD_TARGET="2029";process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW="true";process.env.VITE_INTEGRATED_PREVIEW="true";
  const server=await createServer({root,configFile:false,plugins:[react()],appType:"spa",server:{host:"127.0.0.1",port:0}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
  const browser=await chromium.launch({executablePath:"/usr/bin/chromium",headless:true,args:["--no-sandbox","--use-angle=swiftshader"]}),results=[];
  try{for(const width of [320,390,1440])for(const theme of ["light","parchment","dark"]){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:"reduce"});
    await context.addInitScript(value=>{if(location.hostname==="127.0.0.1")localStorage.setItem("sod-theme",value);},theme);
    await context.route("**/*",async route=>{const url=new URL(route.request().url());if(url.origin===origin&&route.request().isNavigationRequest()&&url.pathname==="/2029/control"){const r=await context.request.get(`${origin}/2029.html`);return route.fulfill({contentType:"text/html",body:await r.body()});}if(url.pathname.endsWith(".pdf"))return route.fulfill({contentType:"application/pdf",body:pdf,headers:{"content-disposition":"inline"}});if(url.hostname==="linswmnnkjxvweumprav.supabase.co")return route.fulfill({contentType:"application/json",body:url.pathname.startsWith("/auth/")?"{}":"[]"});if(/googleapis|gstatic/.test(url.hostname))return route.abort();return route.continue();});
    const page=await context.newPage(),errors=[],modelRequests=[];page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>{if(r.url().includes("AhavatTorahSpatialScene2029"))modelRequests.push(r.url());});
    const initialId=ahavatLetterUnitId("ד","vayikra","צו");await page.goto(`${origin}${ahavatReaderUnitHref(initialId,"/2029/control?study=letters")}`,{waitUntil:"domcontentloaded"});
    const reader=page.locator("#ahavat29-letters"),source=page.locator("#ahavat29-source"),detail=reader.locator(".ahavat29-letter-parasha"),comparison=detail.locator("#ahavat29-letter-comparison"),cards=comparison.locator("[data-ahavat-comparison-card]");
    await detail.waitFor();await native(page,36);assert.equal(await cards.count(),0);assert.equal(await page.locator("canvas").count(),0);assert.equal(modelRequests.length,0);
    await click(comparison.locator("summary"));const first=comparison.getByRole("combobox",{name:"פרשת הבסיס להשוואה"}),second=comparison.getByRole("combobox",{name:"פרשה נוספת להשוואה"});
    assert.equal(await first.inputValue(),"צו");assert.equal(await second.inputValue(),"");assert.equal(await cards.count(),0);assert.equal(await first.locator("option").count(),54);assert.equal(await second.locator("option").count(),55);
    await click(second);await second.selectOption("בראשית");await page.keyboard.press("Escape");assert.equal(await cards.count(),2);
    const pair=ahavatLetterComparisonRows(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,"ד","צו","בראשית");
    const button=entry=>comparison.locator(`[data-ahavat-comparison-unit="${ahavatLetterUnitId(entry.source.form,entry.bookId,entry.row.parasha)}"]`);
    async function selected(entry){const id=ahavatLetterUnitId(entry.source.form,entry.bookId,entry.row.parasha);assert.equal(await detail.getAttribute("data-reader-unit"),id);assert.equal(await reader.locator(`[data-reader-unit="${id}"]`).count(),1);assert.equal(new URL(page.url()).searchParams.get("readerUnit"),id);assert.equal(await button(entry).getAttribute("aria-pressed"),"true");await native(page,entry.row.page);}
    async function returned(entry){await click(source.getByRole("link",{name:"חזור ליחידת הקריאה",exact:true}));await page.waitForFunction(id=>document.activeElement?.dataset.ahavatComparisonUnit===id,ahavatLetterUnitId(entry.source.form,entry.bookId,entry.row.parasha));await selected(entry);assert.equal(await first.inputValue(),"צו");assert.equal(await second.inputValue(),"בראשית");assert.ok((await button(entry).locator("..").boundingBox()).y>=80,"return shows the selected source card, not just its button");}
    for(const [index,entry] of pair.entries()){const card=cards.nth(index);assert.equal(await card.locator("dd").first().textContent(),entry.row.printed==="?"?"לא נקרא":entry.row.printed);assert.equal(await card.locator("dd").last().textContent(),entry.row.count===null?"לא נקרא":ahavatLetterNumber(entry.row.count));}
    await click(button(pair[0]));await selected(pair[0]);await click(source.getByRole("button",{name:"לעמוד הבא",exact:true}));await native(page,37);
    await click(source.getByRole("button",{name:"מסך מלא",exact:true}));await page.waitForFunction(()=>!!document.fullscreenElement);await native(page,37);await click(source.getByRole("button",{name:"יציאה ממסך מלא",exact:true}));await page.waitForFunction(()=>!document.fullscreenElement);await returned(pair[0]);
    await click(button(pair[1]));await selected(pair[1]);await returned(pair[1]);
    await page.reload({waitUntil:"domcontentloaded"});await cards.first().waitFor();await page.waitForFunction(id=>document.activeElement?.dataset.ahavatComparisonUnit===id,ahavatLetterUnitId("ד","bereshit","בראשית"));await selected(pair[1]);assert.equal(await first.inputValue(),"צו");assert.equal(await second.inputValue(),"בראשית");
    const pending=page.waitForEvent("download");await click(comparison.getByRole("button",{name:"הורד את שתי קריאות המקור",exact:true}));const download=await pending;assert.equal(readFileSync(await download.path(),"utf8"),ahavatParashaLettersCsv(pair,"https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/Hebrewbooks_org_5635.pdf"));if(width===390&&theme==="parchment")await download.saveAs(`${out}/two-source-readings.csv`);
    await click(comparison.getByRole("button",{name:"החלף בין הפרשות",exact:true}));assert.equal(await first.inputValue(),"בראשית");assert.equal(await second.inputValue(),"צו");await selected(pair[1]);await click(comparison.getByRole("button",{name:"החלף בין הפרשות",exact:true}));
    await click(second);await second.selectOption("צו");await page.keyboard.press("Escape");assert.equal(await cards.count(),0);assert.match(await comparison.getByRole("status").textContent(),/שונות/);assert.equal(new URL(page.url()).searchParams.get("readerUnit"),ahavatLetterUnitId("ד","bereshit","בראשית"));await click(second);await second.selectOption("בראשית");await page.keyboard.press("Escape");
    await comparison.locator("summary").evaluate(e=>e.scrollIntoView({block:"start",behavior:"instant"}));await settle(page);await page.screenshot({path:`${out}/comparison-${width}-${theme}.png`});
    const toggle=reader.getByRole("button",{name:"פתח מבנה האות בתלת־ממד",exact:true});await click(toggle);const canvas=reader.locator('canvas[data-ahavat-context-guard="ready"]');await canvas.waitFor();await canvas.evaluate(e=>{window.__comparisonCanvas=e;window.__comparisonContext=e.getContext("webgl2")||e.getContext("webgl");});
    await click(button(pair[0]));await selected(pair[0]);await returned(pair[0]);assert.equal(await canvas.evaluate(e=>e===window.__comparisonCanvas),true);
    await click(reader.getByRole("button",{name:"סגור מבנה האות בתלת־ממד",exact:true}));await page.waitForFunction(()=>window.__comparisonContext?.isContextLost());assert.equal(await toggle.evaluate(e=>document.activeElement===e),true);
    if(width===390&&theme==="dark"){
      await click(first);await first.selectOption("האזינו");await page.keyboard.press("Escape");await click(reader.locator(".ahavat29-letter-alphabet").getByRole("button",{name:"זין",exact:true}));
      const missing=comparison.locator(`[data-ahavat-comparison-card="${ahavatLetterUnitId("ז","devarim","האזינו")}"]`);await missing.waitFor();assert.equal(await missing.locator("dd").last().textContent(),"לא נקרא");
      await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);};});await page.reload({waitUntil:"domcontentloaded"});await cards.first().waitFor();await click(toggle);await reader.getByRole("status").filter({hasText:"לא ניתן לפתוח את המבנה במכשיר הזה"}).waitFor();assert.equal(await cards.count(),2);
      await click(missing.locator("button"));await native(page,ahavatLetterComparisonRows(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,"ז","האזינו","בראשית")[0].row.page);await click(source.getByRole("link",{name:"חזור ליחידת הקריאה",exact:true}));await page.waitForFunction(id=>document.activeElement?.dataset.ahavatComparisonUnit===id,ahavatLetterUnitId("ז","devarim","האזינו"));await click(reader.getByRole("button",{name:"סגור מבנה האות בתלת־ממד",exact:true}));
    }
    const metrics=await comparison.evaluate(element=>({overflow:document.documentElement.scrollWidth>innerWidth+1,controls:[...element.querySelectorAll("button,select,summary")].map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height).every(r=>r.width>=43&&r.height>=43),body:parseFloat(getComputedStyle(element.querySelector("p")).fontSize),ui:parseFloat(getComputedStyle(element.querySelector("select")).fontSize)}));assert.equal(metrics.overflow,false);assert.equal(metrics.controls,true);assert.ok(metrics.body>=18);assert.ok(metrics.ui>=16);
    await click(comparison.getByRole("button",{name:"סגור את ההשוואה",exact:true}));assert.equal(await cards.count(),0);assert.equal(await comparison.locator("summary").evaluate(e=>document.activeElement===e),true);assert.equal(new URL(page.url()).searchParams.has("letterComparisonFocus"),false);assert.equal(new URL(page.url()).searchParams.has("letterComparison"),false);
    assert.deepEqual(errors,[]);await context.close();results.push({width,theme,status:"PASS",services:"local stubs; exact original native PDF",physicalDevice:false});writeFileSync(`${out}/browser-results.json`,JSON.stringify(results,null,2)+"\n");console.log(`comparison source/return/export ${width}/${theme}: PASS`);
  }}finally{await browser.close();await server.close();}
});
