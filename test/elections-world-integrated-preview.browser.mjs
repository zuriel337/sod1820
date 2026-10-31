// Actual static 2029 build + actual anonymous public data, without product writes.
// Local: build-integrated-preview first, then node this file.
// Hosted: PREVIEW_ORIGIN=https://exact-deployment.vercel.app; optional protected
// access URL arrives via stdin, is used only in memory, never printed or saved.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const output = process.env.PREVIEW_EVIDENCE_DIR || "/tmp/elections-world-preview-20261030";
await mkdir(output, { recursive: true });
const report = { widths: [], storySequence: [], methodDepth: [], galleryMethodDepth: [], nativeGalleries: [], reads: {}, blocked: [], errors: [], modelRequests: [] };
const publicHost = "linswmnnkjxvweumprav.supabase.co";
// fn_zero_scale is an existing anonymous STABLE/security-invoker read (live
// definition inspected); the unchanged Preview worker already admits it.
const readRpc = new Set(["fn_method_profile", "convergence_meter", "gematria_api", "world_group_source_arrivals_v2", "rd_is_admin", "fn_number_lookup", "fn_number_dossier", "fn_number_journey", "posts_by_number_strict", "fn_all_methods", "lang_links_list", "number_neighbors", "fn_verses_by_gematria", "gematria_method_trace", "fn_zero_scale"]);
let server;
let origin = process.env.PREVIEW_ORIGIN;
if (!origin) {
  const dist = resolve(root, "preview-deploy/dist");
  assert.ok(existsSync(resolve(dist, "preview-identity.json")), "build the isolated mock-only Preview first");
  const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
  server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
    let file = resolve(dist, "." + pathname);
    if (!file.startsWith(dist + sep) && file !== dist) { response.writeHead(403).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = resolve(dist, "index.html");
    response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    createReadStream(file).pipe(response);
  });
  await new Promise(done => server.listen(0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${server.address().port}`;
}
origin = new URL(origin).origin;
let accessUrl;
if (process.env.PREVIEW_ACCESS_STDIN === "true") {
  console.log("Waiting for protected access URL on stdin (not logged).");
  const input = createInterface({ input: process.stdin });
  for await (const line of input) { accessUrl = line.trim(); input.close(); break; }
  assert.equal(new URL(accessUrl).origin, origin, "protected access must match the exact deployment");
}
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "127.0.0.1,localhost" } : undefined;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium", headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"], ...(proxy ? { proxy } : {}) });
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: "he-IL", reducedMotion: "reduce" });
    await context.addInitScript(() => { localStorage.setItem("sod-theme", "dark"); });
    await context.route("**/*", route => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      if (url.origin === origin) return route.continue();
      if (/\/functions\/v1\/(ai-analyze|research-run|ask-raziel)/.test(url.pathname)) report.modelRequests.push(url.pathname);
      if (url.hostname === publicHost) {
        const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/([^/]+)$/)?.[1];
        if ((rpc && readRpc.has(rpc)) || (!rpc && !url.pathname.startsWith("/functions/") && ["GET", "HEAD", "OPTIONS"].includes(method))) {
          report.reads[url.pathname] = (report.reads[url.pathname] || 0) + 1;
          return route.continue();
        }
      } else if (["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname) && method === "GET") return route.continue();
      report.blocked.push(`${method} ${url.pathname}`);
      return route.fulfill({ status: 403, contentType: "application/json", body: '{"error":"preview_read_only"}' });
    });
    const page = await context.newPage();
    page.on("pageerror", error => report.errors.push(error.message));
    page.setDefaultTimeout(60000);
    if (accessUrl) {
      // Establish the existing protected cookie on a static JSON resource first.
      // Starting App2029 at / can race its known root reload and worker bootstrap
      // against the subsequent Topic navigation. This changes no site auth rule.
      const authenticationUrl = new URL(accessUrl);
      authenticationUrl.pathname = "/preview-identity.json";
      try { await page.goto(authenticationUrl.href); }
      catch { throw new Error("Protected Preview access failed; access URL withheld."); }
    }
    // Real default readers, real public source and existing edge. The fragment
    // selects a return target; it cannot admit a source or manufacture a link.
    const storyReturn = '/world#story-tree-78fe15e1-6fc5-4641-b1cd-831a75c5bab7--post-5112';
    await page.goto(origin + storyReturn);
    await page.locator('[data-story-source="posts:5112"]').waitFor();
    await page.getByText('פרטי הקשר המתועד', { exact: true }).click();
    assert.ok(await page.getByText('edge:20f3b1d0-78d2-474a-b481-85e078bc706f', { exact: true }).isVisible());
    await page.getByRole('link', { name: 'לקריאת הפוסט', exact: true }).click();
    await page.waitForURL(/\/post\/flydubai-fz1073-363-14000-remzei-geula/);
    await page.locator('.sod29-reading-source').waitFor();
    await page.goBack();
    await page.locator('[data-story-source="posts:5112"]').waitFor();
    assert.equal(new URL(page.url()).hash, storyReturn.slice(storyReturn.indexOf('#')));
    await page.reload();
    await page.locator('[data-story-source="posts:5112"]').waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: resolve(output, `story-sequence-${width}.png`), fullPage: true });
    report.storySequence.push({ width, sourceRef: 'posts:5112', edgeRef: 'edge:20f3b1d0-78d2-474a-b481-85e078bc706f', nativeBack: true, reload: true });
    if (process.env.PREVIEW_STORY_SEQUENCE_ONLY === 'true') {
      report.widths.push(width); await context.close(); continue;
    }
    await page.goto(origin + "/topic/1237");
    try { await page.locator(".rv [data-rv-hero]").waitFor(); }
    catch {
      const current = new URL(page.url());
      console.log(JSON.stringify({ boundary: "1237 gate render", width, host: current.host, path: current.pathname,
        errors: report.errors, modelRequests: report.modelRequests,
        text: current.origin === origin ? (await page.locator("body").innerText()).slice(0, 2000) : "outside deployment origin" }));
      throw new Error("The hosted 1237 gate did not render; see the bounded boundary report.");
    }
    await page.locator('.rv-method[data-status="confirmed"]').nth(1).waitFor();
    await page.locator(".rv-gallery .rv-source").first().waitFor();
    assert.equal(await page.locator(".sod29-topic-hero").count(), 0);
    assert.equal(await page.locator("h1").count(), 1);
    const missingMapTargets = await page.evaluate(() => [...document.querySelectorAll('.rv-nav a[href^="#"]')]
      .map(anchor => anchor.getAttribute("href").slice(1)).filter(id => !document.getElementById(id)));
    assert.deepEqual(missingMapTargets, [], "every gate chapter resolves to a real section");
    if (width === 1440) {
      await page.locator('[data-context-map-item="rv-center"]').first().waitFor();
      assert.deepEqual(await page.locator('[data-context-map-item]').evaluateAll(nodes => nodes
        .map(node => node.getAttribute("data-context-map-item")).filter(id => !document.getElementById(id))), [],
      "the actual shared Frame map uses existing gate anchors rather than generic Topic anchors");
    }
    assert.match(await page.locator("#rv-elections").innerText(), /סף צירי הוועידה, לא אלקטורים/);
    assert.equal(await page.locator('.rv-conn[data-status="tree"]').count(), 0);
    await page.getByRole("button", { name: "פתיחת קשרי העץ של הציר", exact: true }).click();
    await page.locator('[data-relation-status]:not([data-relation-status="loading"])').waitFor();
    const graphStatus = await page.locator('[data-relation-status]').getAttribute("data-relation-status");
    const graphRefs = await page.locator(".rv-edges code").allInnerTexts();
    assert.ok(["ok", "partial", "unavailable"].includes(graphStatus), "live graph read succeeds or explicitly reports an unavailable anchor");
    assert.ok(graphRefs.every(ref => /^edge:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref)));
    assert.equal(new Set(graphRefs).size, graphRefs.length);
    report.liveGraph = { status: graphStatus, edgeCount: graphRefs.length };
    const center = page.locator("#rv-center");
    assert.doesNotMatch(await center.innerText(), /adjacent_difference|base_additive|fn_method_profile|אומת מול מנוע/);
    for (const [slot, phrase, method, visual] of [
      ["hitgalut", "התגלות", "מסתתר", "adjacent-letter-tension"],
      ["vraita", "וראית את אחרי", "רגיל", "visible-letter-body"],
    ]) {
      await page.locator(`#rv-method-${slot}`).getByRole("button", { name: `פירוט החישוב של ${phrase} בשיטת ${method}`, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "מספר / ביטוי", exact: true });
      await dialog.locator('[data-number-core-root="1237"]').waitFor();
      assert.equal(new URL(page.url()).pathname, "/topic/1237");
      await dialog.locator(".sod29-number-v10-calculation-card").click();
      const inspector = dialog.locator(`[data-method-inspector="${method}"]`);
      await inspector.waitFor();
      await inspector.locator(`[data-method-visual="${visual}"]`).waitFor();
      await inspector.getByRole("tab", { name: "למד", exact: true }).click();
      await inspector.getByRole("heading", { name: "מה השיטה עושה", exact: true }).waitFor();
      await inspector.locator(".sod29-method-trace-groups li").first().waitFor();
      await page.screenshot({ path: resolve(output, `method-${slot}-${width}.png`) });
      await dialog.getByRole("button", { name: "סגור", exact: true }).click();
      if (width < 768) {
        await page.getByRole("button", { name: "פתח ניווט", exact: true }).click();
        await page.getByRole("dialog", { name: "ניווט SOD1820 2029", exact: true })
          .getByRole("button", { name: "חזרה מדויקת", exact: true }).click();
      } else {
        await page.locator('button[aria-label="חזרה מדויקת"]:visible').first().click();
      }
      await page.waitForURL(origin + `/topic/1237#rv-method-${slot}`);
      assert.equal(await page.locator(`#rv-method-${slot}`).count(), 1);
      report.methodDepth.push({ width, phrase, method, root: 1237, exactReturn: `#rv-method-${slot}`, traceVisual: visual });
    }
    const gallerySource = page.locator('#rv-source-gallery-81-288ee048-1e25-4b0e-9630-e3f59c5c3338');
    await gallerySource.waitFor();
    assert.match(await gallerySource.innerText(), /גימטריה · לפי הסיווג השמור/);
    assert.doesNotMatch(await gallerySource.innerText(), /זמן האירוע|תוצאה סופית/);
    await gallerySource.locator('.rv-source-history summary').click();
    assert.match(await gallerySource.innerText(), /2022-08/);
    assert.doesNotMatch(await gallerySource.innerText(), /01\.08\.2022/);
    await gallerySource.locator('.rv-source-research summary').click();
    await gallerySource.getByRole('textbox',{name:'טקסט שמור לבחירת ביטוי',exact:true}).evaluate(el=>{
      el.focus();const start=el.value.lastIndexOf('התגלות');
      if(start<0)throw Error('The live source no longer contains the exact expression');
      el.setSelectionRange(start,start+'התגלות'.length);
      document.dispatchEvent(new Event('selectionchange'));el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    });
    await gallerySource.getByRole('button',{name:'פתיחת שיטות לביטוי שנבחר',exact:true}).click();
    const triangular = gallerySource.getByRole('button',{name:'פתח התגלות בשיטת משולש: 3137',exact:true});
    await triangular.waitFor();
    await triangular.click();
    const sourceDialog = page.getByRole('dialog',{name:'מספר / ביטוי',exact:true});
    await sourceDialog.locator('[data-number-core-root="3137"]').waitFor();
    await sourceDialog.locator('.sod29-number-v10-calculation-card').click();
    const triangleVisual = sourceDialog.locator('[data-method-inspector="קדמי"] [data-method-visual="letter-potential-triangle"]');
    await triangleVisual.waitFor();
    await triangleVisual.scrollIntoViewIfNeeded();
    await page.screenshot({path:resolve(output,`gallery-triangular-${width}.png`)});
    await sourceDialog.getByRole('button',{name:'סגור',exact:true}).click();
    if(width<768){
      await page.getByRole('button',{name:'פתח ניווט',exact:true}).click();
      await page.getByRole('dialog',{name:'ניווט SOD1820 2029',exact:true}).getByRole('button',{name:'חזרה מדויקת',exact:true}).click();
    }else await page.locator('button[aria-label="חזרה מדויקת"]:visible').first().click();
    await page.waitForURL(origin+'/topic/1237#rv-source-gallery-81-288ee048-1e25-4b0e-9630-e3f59c5c3338');
    await gallerySource.locator('summary').filter({hasText:'מספרים שסומנו במקור'}).click();
    assert.equal(await gallerySource.locator('a[href="/2029/number/3137"]').count(),1,'stored tag uses the existing 2029 route helper without inventing an expression focus');
    await page.getByRole('navigation',{name:'פרקי השער',exact:true}).getByRole('link',{name:'גלריות',exact:true}).click();
    await gallerySource.locator('a[href="/2029/number/3137"]').click();
    await page.locator('.sod29-number-page[data-number-root="3137"],.mlock').waitFor();
    let genericNumberRouteStatus='ready';
    if(await page.locator('.mlock').count()){
      assert.match(await page.locator('.mlock').innerText(),/דף המספר נמצא בהכנה וייפתח בהמשך/);
      genericNumberRouteStatus='existing_capability_lock';
    }else assert.equal(await page.locator('.sod29-number-focus-ribbon').count(),0,'a stored tag does not assert an expression/method focus');
    await page.goBack();
    await page.waitForURL(origin+'/topic/1237#rv-source-gallery-81-288ee048-1e25-4b0e-9630-e3f59c5c3338');
    await gallerySource.waitFor();
    await page.waitForFunction(()=>{
      const rect=document.getElementById('rv-source-gallery-81-288ee048-1e25-4b0e-9630-e3f59c5c3338')?.getBoundingClientRect();
      return rect&&rect.top>=40&&rect.top<200;
    });
    report.galleryMethodDepth.push({width,sourceRef:'gallery_images:288ee048-1e25-4b0e-9630-e3f59c5c3338',
      expression:'התגלות',method:'קדמי',value:3137,exactReturn:true,sourceMethodPairing:'not_asserted',genericNumberRouteStatus});
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `1237 overflow at ${width}: ${overflow}`);
    await page.screenshot({ path: resolve(output, `1237-${width}.png`) });
    const nativeId='288ee048-1e25-4b0e-9630-e3f59c5c3338';
    const nativeHref=`/world?view=gallery&gallery=81&image=${nativeId}#gallery-source-${nativeId}`;
    await gallerySource.locator(`a[href="${nativeHref}"]`).click();
    await page.waitForURL(origin+nativeHref);
    const exhibit=page.locator(`[data-gallery-selected="${nativeId}"]`);await exhibit.waitFor();
    await exhibit.locator('.g29-canvas img').waitFor();
    await page.waitForFunction(()=>{const img=document.querySelector('.g29-canvas img');return img?.complete&&img.naturalWidth>0;});
    assert.equal(await exhibit.locator('.g29-canvas img').getAttribute('data-media-fit'),'preserve-whole-image');
    assert.doesNotMatch(await exhibit.innerText(),/זמן האירוע|תוצאה סופית/);
    assert.ok(await page.locator('.g29-flow .g29-exhibit').count()>1,'the public gallery shows a sequence of full images');
    assert.ok(await page.locator('.g29-flow .g29-exhibit').count()<=6);
    assert.equal(await page.locator('.g29-thumbnails').count(),0);
    assert.doesNotMatch(await page.locator('.g29-gallery').innerText(),/פיילוט|חלון|OCR|מיקום שמור|gallery_images:/);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:resolve(output,`gallery-81-${width}.png`)});
    await exhibit.locator('.g29-depth > summary').click();
    await exhibit.locator('.rv-source-research summary').click();
    await exhibit.getByRole('textbox',{name:'טקסט מהתמונה לבחירת ביטוי',exact:true}).evaluate(el=>{
      const start=el.value.lastIndexOf('התגלות');if(start<0)throw Error('Missing exact source expression');
      el.focus();el.setSelectionRange(start,start+6);document.dispatchEvent(new Event('selectionchange'));
      el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    });
    await exhibit.getByRole('button',{name:'פתיחת שיטות לביטוי שנבחר',exact:true}).click();
    await exhibit.getByRole('button',{name:'פתח התגלות בשיטת משולש: 3137',exact:true}).click();
    await page.waitForURL(/\/2029\/number\/3137\?focus=/);
    await page.locator('.sod29-number-page[data-number-root="3137"]').waitFor();
    assert.match(await page.locator('.sod29-number-focus-ribbon').innerText(),/התגלות/);
    if(width<768){
      await page.getByRole('button',{name:'פתח ניווט',exact:true}).click();
      await page.getByRole('dialog',{name:'ניווט SOD1820 2029',exact:true}).getByRole('button',{name:'חזרה מדויקת',exact:true}).click();
    }else await page.locator('button[aria-label="חזרה מדויקת"]:visible').first().click();
    await page.waitForURL(origin+nativeHref);await exhibit.waitFor();
    const nativeOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(nativeOverflow<=0,`Gallery overflow at ${width}: ${nativeOverflow}`);
    await page.goto(origin+'/world?view=gallery&gallery=29');
    await page.locator('.g29-exhibit').first().waitFor();
    await page.waitForFunction(()=>{const img=document.querySelector('.g29-canvas img');return img?.complete&&img.naturalWidth>0;});
    const historicalCard=page.locator('[data-gallery-image-id="d9842a5a-5313-4d32-8e58-5f07fa29b887"]');
    await historicalCard.waitFor();
    assert.doesNotMatch(await historicalCard.locator('.g29-caption').innerText(),/\\/);
    assert.match(await historicalCard.locator('.g29-caption').innerText(),/"וראית את אחרי"/);
    assert.equal(await historicalCard.locator('h3').count(),0,'historical update notice is not an image headline');
    await page.screenshot({path:resolve(output,`gallery-29-${width}.png`)});
    const galleryType=await page.locator('.g29-gallery').evaluate(root=>{
      const style=selector=>getComputedStyle(root.querySelector(selector));
      return {intro:parseFloat(style('.g29-intro').fontSize),caption:parseFloat(style('.g29-caption').fontSize),
        control:parseFloat(style('.g29-number').fontSize),kind:parseFloat(style('.g29-kind').fontSize),
        numberFamily:style('.g29-number bdi').fontFamily,labelFamily:style('.g29-number-label').fontFamily,
        gridColumns:style('.g29-flow').gridTemplateColumns.split(' ').length,
        cardColumns:style('.g29-exhibit').display==='grid'?style('.g29-exhibit').gridTemplateColumns.split(' ').length:1,
        controls:[...root.querySelectorAll('.g29-number,.g29-depth > summary')].map(el=>el.getBoundingClientRect().height)};
    });
    assert.ok(galleryType.caption>=18&&galleryType.control>=16&&galleryType.kind>=15);
    assert.ok(galleryType.controls.every(height=>height>=44));
    assert.equal(galleryType.gridColumns,1);
    assert.equal(galleryType.cardColumns,width<761?1:2);
    assert.notEqual(galleryType.numberFamily,galleryType.labelFamily,'Hebrew labels do not inherit the numeric typeface');
    for(const [preset,label] of [['light','יום'],['parchment','קלף'],['dark','לילה']]){
      const control=page.locator('.sod29-theme-presets.is-header-control');
      const option=control.getByRole('button',{name:label,exact:true});
      if(!await option.isVisible())await control.locator('.sod29-theme-trigger').click();
      await option.click();await page.waitForFunction(value=>document.documentElement.dataset.themePreset===value,preset);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
      await page.screenshot({path:resolve(output,`gallery-29-${preset}-${width}.png`)});
    }
    report.nativeGalleries.push({width,galleries:[29,81],sourceRef:`gallery_images:${nativeId}`,
      expression:'התגלות',method:'קדמי',value:3137,exactReturn:true,wholeImage:true,galleryType,presets:['light','parchment','dark']});
    // Explicit design-review subset, not a replacement for the full regression
    // default. The unrelated Topic1118/World check remains strict below.
    if(process.env.PREVIEW_GALLERY_REVIEW_ONLY==='true'){
      report.widths.push(width);await context.close();continue;
    }
    await page.goto(origin + "/topic/gapfill-1118#topic-number-research-1118");
    const through = page.getByRole("region", { name: "ממצאים דרך המספר", exact: true });
    await through.waitFor();
    assert.match(await through.innerText(), /ולא קשר ישיר מתועד/);
    const lens = page.locator("#topic-number-research-1118");
    await lens.getByRole("button", { name: "הצגת ממצאי צבי למספר", exact: true }).click();
    const finding = lens.locator('a[href^="/world?finding="]').first();
    await finding.waitFor();
    const findingHref = await finding.getAttribute("href");
    await finding.click();
    await page.waitForURL(origin + findingHref);
    assert.equal(await page.evaluate(() => history.state.usr?.returnTo), "/topic/gapfill-1118#topic-number-research-1118");
    await page.getByRole("region", { name: "ממצא ציבורי בעולם", exact: true }).waitFor();
    await page.goBack();
    await lens.getByRole("button", { name: "הצגת ממצאי צבי למספר", exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, `topic-1118-${width}.png`) });
    await page.goto(origin + "/world?view=sources&source=tzvi-opoc");
    await page.getByRole("region", { name: "ממצאים הקשורים למקורות צבי", exact: true }).waitFor();
    await page.screenshot({ path: resolve(output, `world-zvi-${width}.png`) });
    report.widths.push(width);
    await context.close();
  }
  assert.deepEqual(report.errors, [], "no page errors");
  assert.deepEqual(report.modelRequests, [], "no model request on navigation");
  console.log(JSON.stringify({ ...report, blocked: [...new Set(report.blocked)], origin, productWrites: false, data: "live public anonymous", coverage: process.env.PREVIEW_GALLERY_REVIEW_ONLY==='true'
    ? "Explicit gallery-design subset:1237 shared depth and exact source; galleries29/81, source->method Number->exact return, three presets and typography; excludes Topic1118/Zvi regression"
    : "1237 shared method depth; native galleries29/81, exact source -> canonical method Number -> exact return; Topic1118 -> World finding -> Back; World Zvi entry" }, null, 2));
} finally {
  await browser?.close();
  if (server) await new Promise(done => server.close(done));
}
