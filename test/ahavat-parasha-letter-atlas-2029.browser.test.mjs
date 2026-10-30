import { AHAVAT_PDF_BYTES, AHAVAT_PDF_URL, assertAhavatSourcePage, ahavatSourceHref } from "./fixtures/ahavat-controlled-source-2029.mjs";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS, ahavatLetterNumber } from "../src/data/ahavatTorahLetters2029.js";
import { ahavatLetterUnitId, ahavatReaderUnitHref } from "../src/data/ahavatTorahReaderUnits2029.js";
import { ahavatRetainedLetterRow, ahavatParashaLetterRows, ahavatParashaLettersCsv } from "../src/components/books2029/ahavatLetterJourney2029.js";
import { ahavatNativePdfPageAtStart } from "./fixtures/ahavat-native-pdf-page-2029.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const pdf = readFileSync("/workspace/artifacts/ahavat-book-completion-20261029/source-witness/original.pdf");
const out = "/workspace/artifacts/ahavat-parasha-atlas-20261029";
mkdirSync(out, { recursive: true });
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
async function native(page, physical) {
  return assertAhavatSourcePage(page, physical);
}
async function click(locator) {
  // Avoid a native focus-scroll followed by a second competing center-scroll.
  // Keep a real pointer click and prove its hit target; never force through chrome.
  await locator.evaluate(element => element.focus({ preventScroll: true }));
  await locator.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
  await settle(locator.page());
  const hit = await locator.evaluate(element => { const rect = element.getBoundingClientRect(), top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2); return { name: element.getAttribute("aria-label") || element.textContent, y: rect.y, height: rect.height, viewport: innerHeight, top: top?.outerHTML.slice(0, 200), uncovered: !!top && element.contains(top) }; });
  if (!hit.uncovered) { await locator.page().screenshot({ path: `${out}/atlas-click-failure.png` }); console.log(JSON.stringify({ atlasPointerFailure: hit })); }
  assert.equal(hit.uncovered, true, `real atlas control must be uncovered: ${JSON.stringify(hit)}`);
  await locator.click();
}
test("parasha atlas preserves 28 source forms, exact PDF, export, selection and lazy model in nine contexts", { timeout: 480_000 }, async () => {
  assert.equal(createHash("sha256").update(pdf).digest("hex"), "895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b");
  process.env.SOD_BUILD_TARGET = "2029"; process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true"; process.env.VITE_INTEGRATED_PREVIEW = "true";
  const server = await createServer({ root, configFile: false, cacheDir: `/tmp/ahavat-source-vite-${process.pid}`, plugins: [react()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen(); const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  try {
    for (const width of [320, 390, 1440]) for (const theme of ["light", "parchment", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.addInitScript(value => { if (location.hostname === "127.0.0.1") localStorage.setItem("sod-theme", value); }, theme);
      await context.route("**/*", async route => {
      if (route.request().url() === AHAVAT_PDF_URL) return route.fulfill({ contentType: "application/pdf", body: AHAVAT_PDF_BYTES });
        const url = new URL(route.request().url());
        if (url.origin === origin && route.request().isNavigationRequest() && url.pathname === "/2029/control") { const response = await context.request.get(`${origin}/2029.html`); return route.fulfill({ contentType: "text/html", body: await response.body() }); }
        if (url.pathname.endsWith(".pdf")) return route.fulfill({ contentType: "application/pdf", body: pdf, headers: { "content-disposition": "inline" } });
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ contentType: "application/json", body: url.pathname.startsWith("/auth/") ? "{}" : "[]" });
        if (/googleapis|gstatic/.test(url.hostname)) return route.abort();
        return route.continue();
      });
      const page = await context.newPage(), errors = [], modelRequests = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("request", request => { if (request.url().includes("AhavatTorahSpatialScene2029")) modelRequests.push(request.url()); });
      await page.goto(`${origin}${ahavatReaderUnitHref(ahavatLetterUnitId("ד","vayikra","צו"),"/2029/control?study=letters")}`,{waitUntil:"domcontentloaded"});
      const reader=page.locator("#ahavat29-letters"),source=page.locator("#ahavat29-source"),detail=reader.locator(".ahavat29-letter-parasha"),atlas=detail.locator(".ahavat29-parasha-letter-atlas");
      async function returnFocus() { const id=await detail.getAttribute("data-reader-unit"); await page.waitForFunction(unit=>document.activeElement?.closest("[data-reader-unit]")?.dataset.readerUnit===unit,id); await settle(page); }
      await detail.waitFor();await native(page,36);
      assert.equal(await atlas.locator(".ahavat29-parasha-atlas-grid article").count(),0);
      await click(atlas.locator("summary"));await atlas.locator(".ahavat29-parasha-atlas-grid article").first().waitFor();
      assert.equal(new URL(page.url()).searchParams.get("letterAtlas"),"parasha");
      const entries=ahavatParashaLetterRows(AHAVAT_LETTER_READINGS,AHAVAT_LETTER_FORMS,"צו");
      assert.equal(await atlas.locator(".ahavat29-parasha-atlas-grid article").count(),28);
      for(const {source:form,row} of entries){
        const card=atlas.locator(`article[data-letter-form="${form.form}"]`);
        assert.equal(await card.locator("dd").first().textContent(),row.printed==="?"?"לא נקרא":row.printed);
        assert.equal(await card.locator("dd").last().textContent(),row.count===null?"לא נקרא":ahavatLetterNumber(row.count));
        const numeral=await card.locator("dd").last().evaluate(element=>{const value=element.querySelector("bdi,span")||element,range=document.createRange();range.selectNodeContents(value);const lines=[...range.getClientRects()].map(rect=>({left:rect.left,right:rect.right,top:rect.top,height:rect.height})),box=element.closest("article").getBoundingClientRect();return {text:value.textContent,lines,card:{left:box.left,right:box.right},whiteSpace:getComputedStyle(value).whiteSpace};});
        assert.equal(numeral.lines.length===1&&numeral.lines.every(rect=>rect.left>=numeral.card.left&&rect.right<=numeral.card.right),true,`source numeral must remain one readable line inside its card: ${JSON.stringify(numeral)}`);
        assert.equal(await card.getByRole("button",{name:`מקור ${form.name} בפרשת צו · PDF ${row.page}`,exact:true}).count(),1);
      }
      assert.equal(await page.locator("canvas:not([data-book-pdf-canvas])").count(),0);assert.equal(modelRequests.length,0);
      const search=atlas.getByRole("searchbox",{name:"סינון אותיות בפרשה"});
      async function filter(value) { await click(search); await page.keyboard.press("ControlOrMeta+A"); await page.keyboard.insertText(value); }
      await filter("כף");assert.equal(await atlas.locator(".ahavat29-parasha-atlas-grid article").count(),2);
      const downloadPromise=page.waitForEvent("download");
      await click(atlas.getByRole("button",{name:"הורד את טבלת הפרשה",exact:true}));
      const download=await downloadPromise;
      assert.equal(readFileSync(await download.path(),"utf8"),ahavatParashaLettersCsv(entries,"https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/Book/Hebrewbooks_org_5635.pdf"));
      await page.evaluate(()=>{const url=new URL(location.href);url.hash="ahavat29-parasha-letter-atlas";history.replaceState(history.state,"",url);});
      await page.reload({waitUntil:"domcontentloaded"});await atlas.locator(".ahavat29-parasha-atlas-grid article").first().waitFor();
      await page.waitForFunction(()=>!!document.activeElement?.closest("#ahavat29-parasha-letter-atlas"));
      assert.ok((await atlas.boundingBox()).y>=80,"direct atlas entry must clear the fixed frame");
      assert.equal(await search.inputValue(),"כף");assert.equal(await atlas.locator(".ahavat29-parasha-atlas-grid article").count(),2);
      async function selected(form,parasha="צו"){
        const record=ahavatRetainedLetterRow(AHAVAT_LETTER_READINGS,form,parasha),id=ahavatLetterUnitId(form,record.bookId,parasha);
        assert.equal(await detail.getAttribute("data-reader-unit"),id);
        assert.equal(await reader.locator(`[data-reader-unit="${id}"]`).count(),1);
        assert.equal(new URL(page.url()).searchParams.get("readerUnit"),id);
        assert.equal(new URL(page.url()).searchParams.get("page"),String(record.row.page));
        assert.equal(await atlas.getByRole("button",{name:`בחר ${AHAVAT_LETTER_FORMS.find(item=>item.form===form).name} בפרשת ${parasha}`,exact:true}).getAttribute("aria-pressed"),"true");
        await native(page,record.row.page);
      }
      const chooseKaf=atlas.getByRole("button",{name:"בחר כף בפרשת צו",exact:true});
      await chooseKaf.focus();await page.keyboard.press("Enter");await selected("כ");
      await click(chooseKaf);await selected("כ");
      await click(atlas.getByRole("button",{name:"מקור כף בפרשת צו · PDF 37",exact:true}));await selected("כ");
      await click(source.getByRole("button",{name:"לעמוד הבא",exact:true}));await native(page,38);
      await click(source.getByRole("link",{name:"חזור ליחידת הקריאה",exact:true}));await returnFocus();await selected("כ");
      assert.equal(await search.inputValue(),"כף");
      await click(atlas.getByRole("button",{name:"בחר כף סופית בפרשת צו",exact:true}));await selected("ך");
      await click(atlas.getByRole("button",{name:"נקה סינון אותיות",exact:true}));
      assert.equal(await atlas.locator(".ahavat29-parasha-atlas-grid article").count(),28);
      await atlas.locator("summary").evaluate(element=>element.scrollIntoView({block:"start",behavior:"instant"}));await settle(page);
      assert.ok((await atlas.locator("summary").boundingBox()).y>=80,"atlas orientation must clear the fixed frame");
      await page.screenshot({path:`${out}/atlas-${width}-${theme}.png`});
      const toggle=reader.getByRole("button",{name:"פתח מבנה האות בתלת־ממד",exact:true});
      await click(toggle);const canvas=reader.locator('canvas[data-ahavat-context-guard="ready"]');await canvas.waitFor();
      await canvas.evaluate(element=>{window.__atlasCanvas=element;window.__atlasContext=element.getContext("webgl2")||element.getContext("webgl");});
      await click(atlas.getByRole("button",{name:"בחר תו בפרשת צו",exact:true}));await selected("ת");
      assert.equal(await canvas.evaluate(element=>element===window.__atlasCanvas),true);
      await click(atlas.getByRole("button",{name:"מקור תו בפרשת צו · PDF 41",exact:true}));await native(page,41);
      await click(source.getByRole("button",{name:"מסך מלא",exact:true}));await page.waitForFunction(()=>!!document.fullscreenElement);await native(page,41);
      await click(source.getByRole("button",{name:"יציאה ממסך מלא",exact:true}));await page.waitForFunction(()=>!document.fullscreenElement);await settle(page);
      await click(source.getByRole("link",{name:"חזור ליחידת הקריאה",exact:true}));await returnFocus();await selected("ת");
      assert.equal(await canvas.evaluate(element=>element===window.__atlasCanvas),true);
      await click(reader.getByRole("button",{name:"סגור מבנה האות בתלת־ממד",exact:true}));
      assert.equal(await toggle.evaluate(element=>document.activeElement===element),true);
      await page.waitForFunction(()=>window.__atlasContext?.isContextLost());
      if(width===390&&theme==="parchment"){
        for(const form of AHAVAT_LETTER_FORMS){
          await click(atlas.getByRole("button",{name:`מקור ${form.name} בפרשת צו · PDF ${entries.find(entry=>entry.source.form===form.form).row.page}`,exact:true}));
          await selected(form.form);await click(source.getByRole("link",{name:"חזור ליחידת הקריאה",exact:true}));await returnFocus();
        }
      }
      if(width===390&&theme==="dark"){
        await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);};});
        await page.goto(`${origin}${ahavatReaderUnitHref(ahavatLetterUnitId("ז","devarim","האזינו"),"/2029/control?study=letters&letterAtlas=parasha")}`,{waitUntil:"domcontentloaded"});
        await atlas.locator(".ahavat29-parasha-atlas-grid article").first().waitFor();await selected("ז","האזינו");
        assert.equal(await atlas.locator('article[data-letter-form="ז"] dd').last().textContent(),"לא נקרא");
        await click(toggle);await reader.getByRole("status").filter({hasText:"לא ניתן לפתוח את המבנה במכשיר הזה"}).waitFor();
        await filter("סופית");assert.equal(await atlas.locator(".ahavat29-parasha-atlas-grid article").count(),5);
        await filter("not-a-form");assert.equal(await atlas.locator(".ahavat29-parasha-atlas-grid article").count(),0);
        assert.match(await atlas.getByRole("status").textContent(),/לא נמצאה/);
        await click(atlas.getByRole("button",{name:"נקה סינון אותיות",exact:true}));
        await click(reader.getByRole("button",{name:"סגור מבנה האות בתלת־ממד",exact:true}));
      }
      const metrics=await atlas.evaluate(element=>({overflow:document.documentElement.scrollWidth>innerWidth+1,controls:[...element.querySelectorAll("button,input,summary")].map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height).every(r=>r.width>=43&&r.height>=43),body:parseFloat(getComputedStyle(element.querySelector("p")).fontSize),ui:parseFloat(getComputedStyle(element.querySelector("input")).fontSize),searchWidth:element.querySelector("input").getBoundingClientRect().width,atlasWidth:element.getBoundingClientRect().width}));
      assert.equal(metrics.overflow,false);assert.equal(metrics.controls,true);assert.ok(metrics.body>=18);assert.ok(metrics.ui>=16);
      if(width<=390)assert.ok(metrics.searchWidth>=metrics.atlasWidth*.75,"mobile search must not be squeezed beside its count");
      await click(atlas.getByRole("button",{name:"סגור את מפת הפרשה",exact:true}));
      assert.equal(await atlas.locator(".ahavat29-parasha-atlas-grid article").count(),0);
      assert.equal(await atlas.locator("summary").evaluate(element=>document.activeElement===element),true);
      assert.equal(new URL(page.url()).searchParams.has("letterAtlas"),false);
      if(width===390&&theme==="light"){
        await page.goto(`${origin}/2029/control?surface=ahavat-torah-system&study=letters&page=35#ahavat29-parasha-letter-atlas`,{waitUntil:"domcontentloaded"});
        await reader.locator(".ahavat29-letter-study").waitFor();await page.evaluate(()=>document.fonts.ready);await settle(page);await native(page,35);
        assert.equal(await atlas.count(),0,"an atlas fragment without a canonical parasha must not invent one");
        assert.equal(await reader.locator(".ahavat29-letter-alphabet button").count(),28);
      }
      assert.deepEqual(errors,[]);await context.close();console.log(`parasha atlas source/export/focus ${width}/${theme}: PASS`);
    }
  }finally{await browser.close();await server.close();}
});
