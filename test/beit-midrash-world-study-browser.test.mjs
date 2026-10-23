import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright;
let vite;
let reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional local browser tooling. */ }

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : playwright?.chromium.executablePath());
const available = Boolean(playwright && vite && reactPlugin && executablePath && existsSync(executablePath));

const projection = {
  rows: [
    {
      id: "research:f-public",
      sourceId: "f-public",
      canonicalFindingHref: "/world?finding=f-public#finding-f-public",
      family: "research_object",
      statement: "שתי דרכי חישוב נפגשות באותו ערך",
      secondary: "הממצא נשמר עם המקור והיעד המדויק.",
      kind: "relation",
      values: [1820],
      sourceLabel: "מקור מחקר",
      sourceRef: "channel_updates:source-1#a2",
      sourceRefs: ["channel_updates:source-1#a2", "channel_updates:source-1#a7"],
      contributor: "צבי (OPOC)",
      createdAt: "2026-10-22T10:00:00.000Z",
      verification: "match",
      status: "approved",
      access: "public",
      confidence: 88,
      treeMatches: [{ type: "topic", key: "topic-1820", label: "1820" }],
      linkedTopicRating: { title: "1820", meterScore: 91, quality: 8, numbers: [1820], highlightNumbers: [1820], href: "/topic/1820" },
      occurrences: [
        { sourceId: "f-public", sourceRef: "channel_updates:source-1#a2" },
        { sourceId: "f-public-2", sourceRef: "channel_updates:source-1#a7" },
      ],
    },
    {
      id: "research:f-unmatched",
      sourceId: "f-unmatched",
      family: "research_object",
      statement: "ממצא ציבורי שממתין לחיבור בעץ",
      kind: "observation",
      values: [73],
      sourceLabel: "מקור מחקר",
      sourceRef: "posts:73#section-2",
      sourceRefs: ["posts:73#section-2"],
      contributor: "חוקר",
      createdAt: "2026-10-21T10:00:00.000Z",
      verification: "not_tested",
      status: "canonical",
      access: "public",
      confidence: null,
      treeMatches: [],
      linkedTopicRating: null,
      occurrences: [],
    },
    {
      id: "research:f-private",
      sourceId: "f-private",
      family: "research_object",
      statement: "חומר פרטי שאסור שיופיע",
      kind: "question",
      values: [],
      sourceRef: "private:1",
      sourceRefs: ["private:1"],
      status: "candidate",
      access: "private",
      treeMatches: [],
      linkedTopicRating: null,
      occurrences: [],
      triage: {
        rank: 3,
        strength: "weak",
        recommendation: "review",
        evidenceReason: "נדרשת בדיקת מקור נוספת",
      },
    },
  ],
  duplicateProjection: { nonDestructive: true },
};

const CATALOG_DIAMONDS = [
  { id: "d-1", label: "אור", value: 207, kind: "diamond_core", description: "חתימה ראשונה" },
  { id: "d-2", label: "סוד", value: 70, kind: "diamond_core", description: null },
  { id: "d-3", label: "יהוה", value: 26, kind: "diamond_core", description: "השם המפורש" },
  { id: "d-4", label: "תכלית", value: 850, kind: "diamond_core", description: null },
  { id: "d-5", label: "אדני", value: 65, kind: "diamond_core", description: "שם נוסף" },
  { id: "d-6", label: "צבאות", value: 499, kind: "diamond_core", description: null },
  { id: "d-7", label: "קדוש", value: 410, kind: "diamond_core", description: null },
];

function fixturePlugin() {
  const modules = new Map([
    ["virtual:bm-auth.jsx", `export const useAuth=()=>({isAdmin:new URLSearchParams(window.location.search).get("fixtureAdmin")==="1",loading:false});`],
    ["virtual:bm-shell.jsx", `import React from "react";export function FrameState({kind,title,children,action}){return React.createElement("section",{"data-frame-state":kind},React.createElement("h3",null,title),children,action)}export const use2029Shell=()=>({openIssueReport:()=>{window.__issueReportOpened=true;},go:(href,options)=>{window.__shellGo={href,options};}});export default function Shell({children,title}){return React.createElement("div",{className:"sod29-root surface-beit-midrash"},React.createElement("header",{hidden:true},title),children)}`],
    ["virtual:bm-research.jsx", `export const useResearch=()=>({updateResearchContext:(context)=>{window.__researchContext=context;}});`],
    ["virtual:bm-icon.jsx", `import React from "react";export default function Icon(){return React.createElement("span",{"aria-hidden":true},"◇")}`],
    ["virtual:bm-ratings.jsx", `import React from "react";export default function Ratings({quality,meterScore}){return React.createElement("div",{className:"k29-rate","data-quality":quality??"missing","data-meter":meterScore??"missing"},"איכות ",quality??"לא דורג"," · חוזק ",meterScore??"אין נתון")}`],
    ["virtual:bm-trace-component.jsx", `export default function Trace(){return null}`],
    ["virtual:bm-spatial-stage.jsx", `import React from "react";export default function Stage({methodKey}){return React.createElement("div",{"data-experience-capability":"spatial-method-stage","data-method-key":methodKey},"המחשת שיטה")}`],
    ["virtual:bm-registry.js", `const m=(method_key,display_label,category)=>({method_key,display_label,category,active:true,registered:true,executable:true,engine_verified:true,scannable:true});export const fetchGematriaMethodStates=async()=>{await new Promise((resolve)=>setTimeout(resolve,Number(new URLSearchParams(window.location.search).get("delay")||0)));return [m("standard","רגיל","base"),m("gadol","גדול","base"),m("katan","קטן","base"),m("kolel","כולל","composite"),m("milui","מילוי","depth"),m("atbash","אתב״ש","context")];};`],
    ["virtual:bm-number.js", `export const fetchNumberMethodProfile=async()=>[["standard","רגיל","base",73],["gadol","גדול","base",613],["katan","קטן","base",10],["kolel","כולל","composite",77],["milui","מילוי","depth",613],["atbash","אתב״ש","context",null]].map(([methodKey,displayLabel,category,computedValue])=>({methodKey,displayLabel,category,computedValue}));`],
    ["virtual:bm-trace.js", `export const fetchGematriaMethodTrace=async(method,input)=>({id:"trace-1",projection:{dimensions:{trace:{method_key:method,input,result:73,verification:{status:"verified"},steps:[]}}}});`],
    ["virtual:bm-definition.js", `export const methodMechanicalDefinition=()=>({what:"סוכמת את ערכי האותיות",structure:null,dependencies:[],interpretation:null});`],
    ["virtual:bm-world.js", `
      export const fetchWorldAllResearchProjection=async()=>window.__projection;
      export function filterWorldAllResearchRows(rows,filters={}){return (rows||[]).filter(row=>(filters.family==null||row.family===filters.family)&&(!filters.tree||filters.tree==="all"||filters.tree==="matched"&&row.treeMatches?.length||filters.tree==="unmatched"&&!row.treeMatches?.length)&&(!filters.meter||filters.meter==="all"||filters.meter==="metered"&&row.linkedTopicRating?.meterScore!=null||filters.meter==="unmetered"&&row.linkedTopicRating?.meterScore==null));}
    `],
    ["virtual:bm-review.js", `export const fetchWorldFindingReviewPage=async()=>({projection:window.__projection});`],
    ["virtual:bm-mode.js", `export const isPublishedScope=value=>String(value||"").trim().toLowerCase()==="public";`],
    ["virtual:bm-seo.js", `export const applySeo=()=>{};`],
    ["virtual:bm-curation.js", `export const fetchCurationCatalog2029=async()=>{window.__curationCalls=(window.__curationCalls||0)+1;const mode=window.__curationMode||{};await new Promise((resolve)=>setTimeout(resolve,mode.delay||0));if(mode.error==="always"||(mode.error==="once"&&window.__curationCalls===1))throw new Error("curation unavailable");return {diamonds:window.__catalogDiamonds};};`],
  ]);
  const aliases = new Map([
    ["AuthContext.jsx", "virtual:bm-auth.jsx"],
    ["Sod2029Shell.jsx", "virtual:bm-shell.jsx"],
    ["ResearchProvider.jsx", "virtual:bm-research.jsx"],
    ["NavigationIcon2029.jsx", "virtual:bm-icon.jsx"],
    ["ConvergenceRatings2029.jsx", "virtual:bm-ratings.jsx"],
    ["MethodTraceExplanation2029.jsx", "virtual:bm-trace-component.jsx"],
    ["SpatialMethodStage2029.jsx", "virtual:bm-spatial-stage.jsx"],
    ["gematriaMethodRegistry.js", "virtual:bm-registry.js"],
    ["numberCoreProjection.js", "virtual:bm-number.js"],
    ["gematriaTrace.js", "virtual:bm-trace.js"],
    ["beitMidrashMethodDefinition.js", "virtual:bm-definition.js"],
    ["worldAllResearchProjection.js", "virtual:bm-world.js"],
    ["worldFindingReviewClient.js", "virtual:bm-review.js"],
    ["researchViewMode.js", "virtual:bm-mode.js"],
    ["seo.js", "virtual:bm-seo.js"],
    ["curationProjection2029.js", "virtual:bm-curation.js"],
  ]);
  return {
    name: "beit-midrash-browser-fixture",
    enforce: "pre",
    resolveId(source) {
      for (const [suffix, id] of aliases) if (source.endsWith(suffix)) return `\0${id}`;
      return null;
    },
    load(id) {
      const key = id.replace(/^\0/, "");
      return modules.get(key) ?? null;
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith("/beit-midrash")) return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        const html = `<div id="root"></div><script>window.__projection=${JSON.stringify(projection)};window.__catalogDiamonds=${JSON.stringify(CATALOG_DIAMONDS)}</script><script type="module" src="/test/fixtures/beit-midrash-browser-entry.jsx"></script>`;
        response.end(await server.transformIndexHtml(request.url, html));
      });
    },
  };
}

test("Beit Midrash hall fits 320/390/desktop in day, card and night", { skip: !available, timeout: 90_000 }, async () => {
  const server = await vite.createServer({
    root,
    configFile: false,
    plugins: [fixturePlugin(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 },
  });
  let browser;
  try {
    await server.listen();
    const address = server.httpServer.address();
    const origin = `http://127.0.0.1:${address.port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage();
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      // Failed resources are checked per response below so the headless favicon probe is the only exemption.
      if (message.type() === "error" && !/Failed to load resource/.test(message.text())) browserErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && !/\/favicon\.ico$/.test(response.url())) browserErrors.push(`${response.status()} ${response.url()}`);
    });
    const shots = process.env.BM_SHOTS_DIR;

    for (const theme of ["day", "card", "night"]) {
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${origin}/beit-midrash?section=guided&kind=crossing&finding=f-public`);
        try {
          await page.waitForSelector('[data-finding-id="f-public"]', { timeout: 8_000 });
        } catch {
          const body = (await page.locator("body").innerText()).slice(0, 600);
          assert.fail(`example did not render; browser errors=${browserErrors.join(" | ")}; body=${body}`);
        }
        await page.evaluate((nextTheme) => window.__setTheme(nextTheme), theme);
        await page.waitForFunction((nextTheme) => document.querySelector("[data-fixture-theme]")?.dataset.fixtureTheme === nextTheme, theme);

        const layout = await page.evaluate(() => {
          const pillars = document.querySelector(".bm-pillars");
          const small = [...document.querySelectorAll(".sod29-midrash a, .sod29-midrash button")]
            .filter((el) => el.getBoundingClientRect().width && el.getBoundingClientRect().height < 40)
            .map((el) => el.textContent.trim().slice(0, 30));
          return {
            viewport: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            pillarColumns: getComputedStyle(pillars).gridTemplateColumns.split(" ").filter(Boolean).length,
            background: getComputedStyle(document.querySelector("[data-fixture-theme]")).backgroundColor,
            heroBorder: getComputedStyle(document.querySelector(".bm-hero-frame")).borderTopColor,
            small,
            fonts: {
              body: getComputedStyle(document.querySelector(".sod29-midrash")).fontFamily,
              h1: getComputedStyle(document.querySelector(".bm-hero h1")).fontFamily,
              button: getComputedStyle(document.querySelector(".bm-example-card .bm-button")).fontFamily,
              statement: getComputedStyle(document.querySelector(".bm-statement")).fontFamily,
              locator: getComputedStyle(document.querySelector(".bm-source code")).fontFamily,
              section: getComputedStyle(document.querySelector(".bm-section-head h3")).fontFamily,
            },
          };
        });
        assert.ok(layout.scrollWidth <= layout.viewport + 1, `${theme} ${width}px must not overflow horizontally`);
        assert.equal(layout.pillarColumns, width <= 620 ? 1 : 3, `${theme} ${width}px pillar layout`);
        assert.notEqual(layout.background, "rgba(0, 0, 0, 0)");
        assert.notEqual(layout.heroBorder, "rgba(0, 0, 0, 0)", "thin gold frame is drawn");
        assert.deepEqual(layout.small, [], `${theme} ${width}px touch targets`);
        const first = (family) => family.split(",")[0].replace(/["']/g, "").trim();
        assert.equal(first(layout.fonts.body), "Noto Sans Hebrew", "body");
        assert.equal(first(layout.fonts.statement), "Noto Sans Hebrew", "reading text");
        assert.equal(first(layout.fonts.h1), "Rubik", "main title");
        assert.equal(first(layout.fonts.section), "Rubik", "section title");
        assert.equal(first(layout.fonts.button), "Rubik", "button");
        assert.equal(first(layout.fonts.locator), "IBM Plex Mono", "locator/code");
        for (const family of Object.values(layout.fonts)) assert.doesNotMatch(family, /Georgia|Times/, "no legacy serif");
        if (shots) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(350); // let theme transitions settle before the capture
          await page.screenshot({ path: `${shots}/${theme}-${width}-top.png` });
        }
      }
    }

    assert.deepEqual(browserErrors, [], "no browser errors");
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${origin}/beit-midrash`);
    await page.waitForSelector('[data-finding-id="f-public"]');
    // Public only: private/candidate rows never render; no admin mode, scores or search terms.
    const text = await page.locator("body").innerText();
    for (const hidden of ["חומר פרטי שאסור שיופיע", "תצוגת מנהל", "איכות ראיות", "מצב אימות", "ביטחון", "סקירת מנהל"]) {
      assert.ok(!text.includes(hidden), `public page must not show ${hidden}`);
    }
    assert.equal(await page.locator('[data-finding-id="f-private"]').count(), 0);
    assert.equal(await page.locator('[data-guided-concept="crossing"][data-finding-id="f-public"] .bm-occurrences').count(), 1);
    const publicZviHref = "/world?view=sources&source=tzvi-opoc#world-contributor-material";
    const guidedCard = page.locator('[data-guided-concept="crossing"][data-finding-id="f-public"]');
    assert.equal(await guidedCard.locator(`a[href="${publicZviHref}"]`).count(), 2, "author and discovery open the same public source home");
    assert.equal(await guidedCard.locator('a[href*="admin=1"]').count(), 0);
    // The discovery opens its exact World finding; the source home stays a separate, working route.
    const exactHref = "/world?finding=f-public#finding-f-public";
    assert.equal(await guidedCard.locator("[data-world-finding-link]").getAttribute("href"), exactHref);
    assert.equal(await guidedCard.locator("[data-world-source-link]").getAttribute("href"), publicZviHref);
    assert.equal(await guidedCard.locator('a[href*="admin"]').count(), 0);
    const unmatched = page.locator('[data-guided-concept="crossing"][data-finding-id="f-unmatched"]');
    assert.equal(await unmatched.locator("[data-world-finding-link]").count(), 0, "no verified route, no invented finding link");

    // Contributor identity records the same source context, but its Link owns navigation.
    // It must never be intercepted and redirected through the separate World source action.
    await page.evaluate(() => { delete window.__researchContext; delete window.__shellGo; });
    await guidedCard.locator(".bm-contributor-link").click();
    assert.equal(new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash, publicZviHref);
    let contributorHandoff = await page.evaluate(() => ({ context: window.__researchContext, navigation: window.__shellGo }));
    assert.equal(contributorHandoff.navigation, undefined, "contributor Link must not call shell.go");
    assert.equal(contributorHandoff.context.selection.findingId, "f-public");
    await page.goto(`${origin}/beit-midrash?section=guided&kind=crossing&finding=f-public`);
    await page.waitForSelector('[data-finding-id="f-public"]');

    await guidedCard.getByRole("link", { name: "לפתיחת הגילוי המלא בעולם" }).click();
    let handoff = await page.evaluate(() => ({ context: window.__researchContext, navigation: window.__shellGo }));
    assert.equal(handoff.navigation.href, exactHref);
    assert.equal(handoff.context.selection.findingId, "f-public");
    await guidedCard.getByRole("link", { name: "לעמוד המקור בעולם" }).click();
    handoff = await page.evaluate(() => ({ context: window.__researchContext, navigation: window.__shellGo }));
    assert.equal(handoff.navigation.href, publicZviHref);
    assert.equal(handoff.context.selection.findingId, "f-public");
    assert.equal(handoff.context.selection.sourceRef, "channel_updates:source-1#a2");
    assert.equal(handoff.context.returnTo.href, "/beit-midrash?section=guided&kind=crossing&finding=f-public#finding-f-public");
    assert.equal(await page.getByText("כשהתמונה מתחברת").count() > 0, true);
    assert.equal(await page.getByRole("link", { name: "למפת הידע בעולם" }).getAttribute("href"), "/world#world-connections");
    assert.equal(await page.locator('.bm-pillars a').count(), 3);

    if (shots) {
      await page.evaluate(() => window.__setTheme("night"));
      await page.waitForTimeout(350);
      await page.locator("#guided").screenshot({ path: `${shots}/night-390-guided.png` });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${origin}/beit-midrash/standard`);
      await page.waitForSelector(".bm-lesson");
      await page.evaluate(() => window.__setTheme("night"));
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${shots}/night-1280-full.png`, fullPage: true });
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(`${origin}/beit-midrash`);
    }

    // Exact method deep link selects exactly that method; unknown method is an error, never a redirect.
    await page.goto(`${origin}/beit-midrash/standard`);
    await page.waitForSelector('.bm-lesson[data-method-key="standard"]');
    const lessonFonts = await page.evaluate(() => ({
      title: getComputedStyle(document.querySelector(".bm-lesson h4")).fontFamily,
      result: getComputedStyle(document.querySelector(".bm-example-line b")).fontFamily,
    }));
    assert.match(lessonFonts.title, /^"?Rubik/, "lesson title");
    assert.match(lessonFonts.result, /^"?IBM Plex Mono|^'?IBM Plex Mono/, "numeric result");
    await page.getByRole("button", { name: "איך הגענו לתוצאה?" }).click();
    await page.waitForSelector('[data-experience-capability="spatial-method-stage"][data-method-key="standard"]');
    const numberExample = page.locator('[data-number-example-link="true"]');
    assert.equal(await numberExample.getAttribute("href"), "/2029/number/73?focus=%D7%97%D7%9B%D7%9E%D7%94&method=standard");
    await numberExample.click();
    const numberHandoff = await page.evaluate(() => ({ context: window.__researchContext, navigation: window.__shellGo }));
    assert.equal(numberHandoff.navigation.href, "/2029/number/73?focus=%D7%97%D7%9B%D7%9E%D7%94&method=standard");
    assert.equal(numberHandoff.context.returnTo.href, "/beit-midrash/standard");
    assert.equal(numberHandoff.context.returnTo.lens, "beit-midrash");
    if (shots) await page.locator("#methods").screenshot({ path: `${shots}/night-390-method.png` });
    await page.goto(`${origin}/beit-midrash/nope`);
    await page.waitForSelector('[data-frame-state="error"]');
    assert.match(page.url(), /\/beit-midrash\/nope$/);

    // tab=searches stays a quiet admin-only compatibility signal: no catalogue, no search terms.
    await page.goto(`${origin}/beit-midrash?tab=searches`);
    await page.waitForSelector("#start");
    assert.equal(await page.locator("body").innerText().then((t) => /מונחי חיפוש/.test(t)), false);
    // tab=verified teaches source reading and shows no feed.
    await page.goto(`${origin}/beit-midrash?tab=verified`);
    await page.waitForSelector("#sources");
    assert.equal(await page.getByText("מאומתים").count(), 0);

    // Number lessons and paths resume at the exact teaching step without creating progress state.
    await page.goto(`${origin}/beit-midrash?section=numbers&concept=fibonacci#number-concept-fibonacci`);
    await page.waitForSelector('#number-concept-fibonacci.bm-number-lesson');
    assert.match(await page.locator('#number-concept-fibonacci').innerText(), /F1=1, F2=1/);
    assert.equal(await page.locator('.bm-number-lesson').count(), 1);
    assert.equal(await page.locator('[data-number-concept-option]').count(), 14);
    assert.equal(await page.locator('#numbers a[href^="/2029/number/"]').count(), 0);
    await page.goto(`${origin}/beit-midrash?section=paths&path=sod1820#path-sod1820`);
    await page.waitForSelector('#path-sod1820.is-focused');
    assert.equal(await page.locator('#path-sod1820 .bm-path-steps>li').count(), 7);
    assert.equal(await page.locator('#path-sod1820 a[href*="concept=math-profile"]').count(), 1);
    assert.equal(await page.locator('#path-sod1820 a[href^="/2029/number/"]').count(), 0);

    // Contribution uses the existing shell gateway; the game stays visibly gated without its Preview flag.
    await page.getByRole("button", { name: "לשתף רמז" }).click();
    assert.equal(await page.evaluate(() => window.__issueReportOpened), true);
    assert.equal(await page.locator('[data-destination-status="preview_only"][aria-disabled="true"]').count(), 1);

    // Keyboard: first link reachable and focus ring visible.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const focusOutline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    assert.equal(focusOutline, "solid");
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("lesson pages are centred, enriched and calm in nine theme/width combinations", { skip: !available, timeout: 120_000 }, async () => {
  const server = await vite.createServer({
    root,
    configFile: false,
    plugins: [fixturePlugin(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 },
  });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath });
    const context = await browser.newContext({ reducedMotion: "no-preference" });
    const page = await context.newPage();
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !/Failed to load resource/.test(message.text())) browserErrors.push(message.text());
    });
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) {
          window.__cls += entry.value;
          (window.__shifts ||= []).push({ v: entry.value, t: Math.round(entry.startTime), src: entry.sources.map((s) => `${s.node?.nodeName}.${s.node?.className || s.node?.id}`).join("|") });
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    const shots = process.env.BM_SHOTS_DIR;

    for (const theme of ["day", "card", "night"]) {
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${origin}/beit-midrash/kolel`);
        await page.waitForSelector('.bm-lesson[data-method-key="kolel"]');
        await page.evaluate((nextTheme) => window.__setTheme(nextTheme), theme);
        await page.waitForTimeout(900);
        const tag = `${theme} ${width}px`;
        const m = await page.evaluate(() => {
          const box = (selector) => {
            const el = document.querySelector(selector);
            const r = el?.getBoundingClientRect();
            return r ? { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right, width: r.width, height: r.height } : null;
          };
          const rail = document.querySelector(".bm-method-nav");
          const chips = [...rail.querySelectorAll("a")].map((a) => a.getBoundingClientRect().height);
          return {
            viewport: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            main: box(".sod29-midrash"),
            lesson: box(".bm-lesson"),
            rail: box(".bm-method-nav"),
            flow: box(".bm-flow"),
            railOverflowX: getComputedStyle(rail).overflowX,
            chipHeights: chips,
            tiles: document.querySelectorAll(".bm-flow-letters li").length,
            result: document.querySelector(".bm-flow-result")?.textContent,
            cls: window.__cls,
            sideColumn: getComputedStyle(document.querySelector(".bm-methods-layout")).gridTemplateColumns.split(" ").length,
          };
        });
        assert.ok(m.scrollWidth <= m.viewport + 1, `${tag} overflow`);
        const mainCenter = (m.main.left + m.main.right) / 2;
        const lessonCenter = (m.lesson.left + m.lesson.right) / 2;
        assert.ok(Math.abs(mainCenter - lessonCenter) <= 2, `${tag} lesson centred (${mainCenter} vs ${lessonCenter})`);
        assert.ok(Math.abs(m.viewport / 2 - lessonCenter) <= 12, `${tag} lesson centred in viewport`);
        assert.equal(m.sideColumn, 1, `${tag} no side column`);
        assert.ok(m.rail.bottom <= m.lesson.top + 1, `${tag} methods rail sits above the lesson`);
        assert.ok(m.rail.width >= m.lesson.width * 0.9, `${tag} rail spans the lesson width`);
        assert.ok(m.flow.left >= m.lesson.left && m.flow.right <= m.lesson.right, `${tag} illustration inside lesson`);
        assert.equal(m.tiles, 4, `${tag} four letter tiles`);
        assert.equal(m.result, "77", `${tag} result comes from the registry value`);
        assert.ok(m.chipHeights.every((h) => h >= 44), `${tag} rail touch targets`);
        assert.ok(m.cls < 0.05, `${tag} layout shift ${m.cls} ${JSON.stringify(await page.evaluate(() => window.__shifts))}`);
        if (shots) {
          await page.evaluate(() => window.scrollTo(0, document.querySelector("#methods").getBoundingClientRect().top + scrollY - 20));
          await page.screenshot({ path: `${shots}/lesson-${theme}-${width}.png` });
        }
      }
    }

    // Reduced motion removes every lesson animation; the illustration is still fully visible.
    const animated = () => page.evaluate(() => [".bm-flow-letters li", ".bm-flow-method", ".bm-flow-result", ".bm-flow-line", ".bm-lesson"]
      .map((selector) => getComputedStyle(document.querySelector(selector)).animationName));
    assert.ok((await animated()).some((name) => name !== "none"), "motion is an enhancement when allowed");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.deepEqual([...new Set(await animated())], ["none"], "reduced motion disables lesson animation");
    assert.equal(await page.locator(".bm-flow-result").evaluate((el) => getComputedStyle(el).opacity), "1");
    await page.emulateMedia({ reducedMotion: "no-preference" });

    // Keyboard and semantics.
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${origin}/beit-midrash/kolel`);
    await page.waitForSelector(".bm-lesson");
    const chip = page.locator('.bm-method-nav a:not([aria-current])').first();
    await chip.focus();
    const ring = await chip.evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }));
    assert.equal(ring.style, "solid");
    assert.ok(ring.width >= 2);
    assert.equal(await page.locator('.bm-method-nav a[aria-current="page"]').count(), 1);
    assert.equal(await page.getByRole("navigation", { name: "שיטות הגימטריה" }).count(), 1);
    assert.equal(await page.locator(".bm-flow").getAttribute("aria-label").then((v) => v.includes("כולל")), true);

    // Learning headings use discovery language; research-room vocabulary stays out.
    await page.goto(`${origin}/beit-midrash`);
    await page.waitForSelector('[data-finding-id="f-public"]');
    const headings = await page.locator(".bm-section-head h3").allInnerTexts();
    for (const title of ["איך מתחילים לגלות?", "שיטות הגימטריה", "לומדים לקרוא מקור", "מסלולי לימוד", "נקודות מפגש", "מתרגלים ומשתתפים"]) {
      assert.ok(headings.includes(title), `heading ${title}`);
    }
    for (const bad of ["הצלבה", "ממצא מחקר", "איכות ראיות", "ביטחון", "מצב אימות", "סקירת מנהל", "מאגר ממצאים"]) {
      assert.ok(!headings.some((title) => title.includes(bad)), `no public heading ${bad}`);
    }
    assert.equal(await page.locator(".bm-tag", { hasText: "הצלבה" }).count() > 0, true, "crossing stays a small tag");
    assert.deepEqual(browserErrors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("loading skeleton keeps the lesson stable even when the registry is slow", { skip: !available, timeout: 120_000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [fixturePlugin(), reactPlugin()], server: { host: "127.0.0.1", port: 0 } });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath });
    const page = await (await browser.newContext({ reducedMotion: "no-preference" })).newPage();
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    for (const theme of ["day", "card", "night"]) {
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${origin}/beit-midrash/kolel?delay=600`);
        await page.waitForSelector(".bm-skeleton");
        const skeleton = await page.evaluate(() => ({
          status: document.querySelector(".bm-skeleton").getAttribute("role"),
          busy: document.querySelector(".bm-skeleton").getAttribute("aria-busy"),
          text: document.querySelector(".bm-skeleton .bm-sr").textContent,
          hidden: [...document.querySelectorAll(".bm-skeleton .bm-lesson, .bm-skeleton .bm-method-nav")].every((el) => el.getAttribute("aria-hidden") === "true"),
          top: Math.round(document.querySelector(".bm-skeleton .bm-lesson").getBoundingClientRect().top + scrollY),
          height: Math.round(document.querySelector(".bm-skeleton .bm-lesson").getBoundingClientRect().height),
        }));
        assert.equal(skeleton.status, "status");
        assert.equal(skeleton.busy, "true");
        assert.match(skeleton.text, /פותח/);
        assert.equal(skeleton.hidden, true);
        await page.evaluate((next) => window.__setTheme(next), theme);
        await page.waitForSelector('.bm-lesson[data-method-key="kolel"]');
        await page.waitForTimeout(700);
        const real = await page.evaluate(() => ({
          top: Math.round(document.querySelector(".bm-lesson").getBoundingClientRect().top + scrollY),
          height: Math.round(document.querySelector(".bm-lesson").getBoundingClientRect().height),
          cls: window.__cls,
        }));
        assert.ok(Math.abs(real.top - skeleton.top) <= 60, `${theme} ${width}px lesson stays where the skeleton was (${skeleton.top} → ${real.top})`);
        assert.ok(real.height >= skeleton.height - 2 && real.height - skeleton.height <= 140, `${theme} ${width}px skeleton height ${skeleton.height} vs lesson ${real.height}`);
        assert.ok(real.cls < 0.05, `${theme} ${width}px slow-registry layout shift ${real.cls}`);
      }
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("teaching illustrations are presentational, bounded, quiet and motion-safe", { skip: !available, timeout: 120_000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [fixturePlugin(), reactPlugin()], server: { host: "127.0.0.1", port: 0 } });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath });
    const context = await browser.newContext({ reducedMotion: "no-preference" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
    const shots = process.env.BM_SHOTS_DIR;
    let requests = 0;
    page.on("request", (request) => { if (/supabase|\/rest\/v1|\/rpc\//.test(request.url())) requests += 1; });

    for (const theme of ["day", "card", "night"]) {
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${origin}/beit-midrash?section=numbers&concept=fibonacci#number-concept-fibonacci`);
        await page.waitForSelector('#number-concept-fibonacci [data-illustration="fibonacci-spiral"]');
        await page.waitForSelector('[data-guided-concept="crossing"]');
        await page.evaluate((next) => window.__setTheme(next), theme);
        await page.waitForTimeout(900);
        const tag = `${theme} ${width}px`;
        const r = await page.evaluate(() => {
          const rect = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
          const within = (el, box) => { const a = rect(el), c = rect(box); return a.l >= c.l - 1 && a.r <= c.r + 1; };
          const borders = (el) => parseFloat(getComputedStyle(el).borderTopWidth) + parseFloat(getComputedStyle(el).borderLeftWidth);
          const spiral = document.querySelector('[data-illustration="fibonacci-spiral"]');
          const lesson = document.querySelector(".bm-number-lesson");
          const trail = document.querySelector("#sources .bm-reading-trail");
          const sources = document.querySelector("#sources");
          const trails = [...document.querySelectorAll('[data-illustration="path-trail"]')];
          const meetings = [...document.querySelectorAll('[data-illustration^="meeting-"]')];
          return {
            scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth,
            spiral: { hidden: spiral.getAttribute("aria-hidden"), inside: within(spiral, lesson), h: rect(spiral).h, border: borders(spiral), centred: Math.abs((rect(spiral).l + rect(spiral).r) / 2 - (rect(lesson).l + rect(lesson).r) / 2) },
            trail: { items: trail.querySelectorAll("li").length, inside: within(trail, sources), border: borders(trail), ordered: trail.tagName },
            paths: trails.map((el) => ({ hidden: el.getAttribute("aria-hidden"), dots: el.children.length, steps: Number(el.dataset.steps), inside: within(el, el.closest("li")), border: borders(el) })),
            meetings: meetings.map((el) => ({ kind: el.dataset.illustration, svgHidden: el.querySelector("svg").getAttribute("aria-hidden"), caption: el.querySelector("small").textContent, inCard: Boolean(el.closest(".bm-example-card")), inside: within(el, el.closest(".bm-guided-group")), border: borders(el) })),
            flowBorder: null,
          };
        });
        assert.ok(r.scrollWidth <= r.viewport + 1, `${tag} overflow`);
        assert.equal(r.spiral.hidden, "true");
        assert.ok(r.spiral.inside && r.spiral.centred <= 2 && r.spiral.h > 60, `${tag} spiral bounded and centred`);
        assert.equal(r.spiral.border, 0, `${tag} spiral is not boxed`);
        assert.equal(r.trail.items, 7, `${tag} seven source steps`);
        assert.equal(r.trail.ordered, "OL");
        assert.ok(r.trail.inside && r.trail.border === 0, `${tag} source trail bounded, unboxed`);
        assert.ok(r.paths.length >= 5, `${tag} path trails`);
        for (const path of r.paths) assert.ok(path.hidden === "true" && path.dots === path.steps && path.inside && path.border === 0, `${tag} path trail ${JSON.stringify(path)}`);
        assert.deepEqual(r.meetings.map((m) => m.kind).sort(), ["meeting-convergence", "meeting-crossing"]);
        for (const meeting of r.meetings) {
          assert.equal(meeting.svgHidden, "true");
          assert.equal(meeting.caption, "המחשה בלבד", "illustration is labelled as illustration, not evidence");
          assert.equal(meeting.inCard, false, "never inside a finding card");
          assert.ok(meeting.inside && meeting.border === 0, `${tag} meeting bounded, unboxed`);
        }
        if (shots && theme !== "card") {
          await page.locator("#number-concept-fibonacci").screenshot({ path: `${shots}/fibonacci-${theme}-${width}.png` });
          await page.locator("#sources").screenshot({ path: `${shots}/sources-${theme}-${width}.png` });
        }
      }
    }
    // Reduced motion silences every illustration; the drawings stay fully visible.
    const anim = () => page.evaluate(() => [".bm-spiral-path", ".bm-reading-trail li", ".bm-path-trail i", ".bm-meeting-line"]
      .map((selector) => getComputedStyle(document.querySelector(selector)).animationName));
    assert.ok((await anim()).every((name) => name !== "none"), "motion plays when allowed");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.deepEqual([...new Set(await anim())], ["none"]);
    assert.equal(await page.locator(".bm-spiral-path").evaluate((el) => getComputedStyle(el).strokeDashoffset), "0px");
    assert.equal(await page.locator(".bm-reading-trail li").first().evaluate((el) => getComputedStyle(el).opacity), "1");
    assert.equal(requests, 0, "illustrations add no reader or fetch");
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});

const READING_LESSONS = [
  {
    kind: "source", section: "sources", pick: "independence", pickNo: 5, next: "interpretation",
    stepIds: ["locator", "context", "quotation", "calculation", "independence", "interpretation", "return"],
    texts: [/כמה הופעות שחוזרות לאותו מקום/, /האם כל הופעה חוזרת למקום אחר/, /מספר ההופעות אינו מספר המקורות העצמאיים/],
    option: /שלושה מקורות עצמאיים/, explanation: /יש כאן שלוש הופעות של מקור אחד/, continuation: ["לתרגול בנקודת מפגש", "/beit-midrash?section=guided"],
    strip: "שבעת שלבי קריאת המקור",
  },
  {
    kind: "cipher", section: "ciphers", pick: "comparison", pickNo: 5, next: "source",
    stepIds: ["text", "parameters", "letters", "repeat", "comparison", "source", "interpretation"],
    texts: [/האם מוצגים גם ניסיונות ההשוואה ולא רק ההתאמה שנבחרה/, /ריבוי ניסיונות מגדיל את הסיכוי להתאמה מקרית/],
    option: /רק פירוש מרגש יותר/, explanation: /התאמה נקראת יחד עם התנאים ומרחב החיפוש/, continuation: ["לפתיחת כלי הצפנים", "/code"],
    strip: "שבעת שלבי קריאת הדילוג", illustration: true,
  },
];

for (const spec of READING_LESSONS) {
  test(`${spec.kind} reading lesson: seven-step strip, centred lesson, explained exercise, no stored progress`, { skip: !available, timeout: 120_000 }, async () => {
    const server = await vite.createServer({ root, configFile: false, plugins: [fixturePlugin(), reactPlugin()], server: { host: "127.0.0.1", port: 0 } });
    let browser;
    try {
      await server.listen();
      const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
      browser = await playwright.chromium.launch({ headless: true, executablePath });
      const page = await (await browser.newContext({ reducedMotion: "no-preference" })).newPage();
      const errors = [];
      let requests = 0;
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
      page.on("request", (request) => { if (/supabase|\/rest\/v1|\/rpc\//.test(request.url())) requests += 1; });
      const shots = process.env.BM_SHOTS_DIR;
      const root$ = `#${spec.section}`;
      const stepSel = `${root$} .bm-reading-step`;
      const deep = `${origin}/beit-midrash?section=${spec.section}&step=${spec.pick}#${spec.kind}-step-${spec.pick}`;

      for (const theme of ["day", "card", "night"]) {
        for (const width of [320, 390, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(deep);
          await page.waitForSelector(`#${spec.kind}-step-${spec.pick}[data-${spec.kind}-step="${spec.pick}"]`);
          await page.evaluate((next) => window.__setTheme(next), theme);
          await page.waitForTimeout(700);
          const tag = `${theme} ${width}px`;
          const m = await page.evaluate(({ rootSel, kind }) => {
            const rect = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right }; };
            const section = document.querySelector(rootSel);
            const lesson = section.querySelector(".bm-reading-step");
            const strip = section.querySelector(".bm-reading-trail");
            const links = [...strip.querySelectorAll("a")];
            const art = section.querySelector(".bm-skip");
            return {
              scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth,
              stepLinks: links.map((a) => a.getAttribute(`data-${kind}-step-link`)),
              current: links.filter((a) => a.getAttribute("aria-current") === "step").map((a) => a.getAttribute(`data-${kind}-step-link`)),
              heights: links.map((a) => a.getBoundingClientRect().height),
              stripInside: rect(strip).l >= rect(section).l - 1 && rect(strip).r <= rect(section).r + 1,
              lessonInside: rect(lesson).l >= rect(section).l - 1 && rect(lesson).r <= rect(section).r + 1,
              centred: Math.abs((rect(lesson).l + rect(lesson).r) / 2 - (rect(section).l + rect(section).r) / 2),
              stripScrolls: strip.scrollWidth > strip.clientWidth,
              headings: [...lesson.querySelectorAll("h5, aside>strong")].map((el) => el.textContent),
              eyebrow: lesson.querySelector("header>span").textContent,
              text: lesson.innerText,
              radios: section.querySelectorAll('.bm-reading-exercise input[type="radio"]').length,
              radioHeights: [...section.querySelectorAll(".bm-reading-exercise label")].map((el) => el.getBoundingClientRect().height),
              fonts: { title: getComputedStyle(lesson.querySelector("h4")).fontFamily, body: getComputedStyle(lesson.querySelector("p")).fontFamily, link: getComputedStyle(links[0]).fontFamily },
              art: art ? { hidden: art.querySelector("svg").getAttribute("aria-hidden"), caption: art.querySelector("small").textContent, inside: rect(art).l >= rect(section).l - 1 && rect(art).r <= rect(section).r + 1 } : null,
              label: strip.closest("nav").getAttribute("aria-label"),
            };
          }, { rootSel: root$, kind: spec.kind });
          assert.ok(m.scrollWidth <= m.viewport + 1, `${tag} overflow`);
          assert.deepEqual(m.stepLinks, spec.stepIds, `${tag} seven steps in manifest order`);
          assert.deepEqual(m.current, [spec.pick], `${tag} one current step`);
          assert.equal(m.label, spec.strip);
          assert.ok(m.heights.every((h) => h >= 44), `${tag} strip touch targets`);
          assert.ok(m.stripInside && m.lessonInside, `${tag} strip and lesson stay inside the section`);
          assert.ok(m.centred <= 2, `${tag} lesson centred (${m.centred})`);
          if (width >= 1280) assert.equal(m.stripScrolls, false, `${tag} all seven steps visible on desktop`);
          assert.deepEqual(m.headings, ["מה עושים?", "איך בודקים?", "הגבול שחשוב לזכור"]);
          assert.equal(m.eyebrow, `שלב ${spec.pickNo} מתוך 7`);
          for (const text of spec.texts) assert.match(m.text, text);
          assert.equal(m.radios, 3);
          assert.ok(m.radioHeights.every((h) => h >= 44), `${tag} option touch targets`);
          assert.match(m.fonts.title, /^"?Rubik/);
          assert.match(m.fonts.body, /^"?Noto Sans Hebrew/);
          assert.match(m.fonts.link, /^"?Rubik/);
          if (spec.illustration) {
            assert.ok(m.art && m.art.hidden === "true" && m.art.caption === "המחשה בלבד" && m.art.inside, `${tag} skip illustration is decorative, labelled and bounded`);
          } else assert.equal(m.art, null);
          if (shots && theme !== "card") await page.locator(root$).screenshot({ path: `${shots}/${spec.kind}-lesson-${theme}-${width}.png` });
        }
      }

      // Default step, fallback, keyboard, URL-only progress.
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(`${origin}/beit-midrash?section=${spec.section}`);
      await page.waitForSelector(stepSel);
      assert.equal(await page.locator(stepSel).getAttribute(`data-${spec.kind}-step`), spec.stepIds[0]);
      assert.match(await page.locator(`${stepSel} header>span`).innerText(), /שלב 1 מתוך 7/);
      await page.goto(`${origin}/beit-midrash?section=${spec.section}&step=not-a-step`);
      assert.equal(await page.locator(stepSel).getAttribute(`data-${spec.kind}-step`), spec.stepIds[0], "unknown step falls back without inventing one");
      const second = page.locator(`${root$} [data-${spec.kind}-step-link="${spec.stepIds[1]}"]`);
      await second.focus();
      const ring = await second.evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }));
      assert.equal(ring.style, "solid");
      assert.ok(ring.width >= 2);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate((kind) => document.activeElement.getAttribute(`data-${kind}-step-link`), spec.kind), spec.stepIds[2], "keyboard order follows the steps");
      await page.keyboard.press("Enter");
      await page.waitForFunction(({ sel, id, kind }) => document.querySelector(sel)?.getAttribute(`data-${kind}-step`) === id, { sel: stepSel, id: spec.stepIds[2], kind: spec.kind });
      assert.match(page.url(), new RegExp(`step=${spec.stepIds[2]}`));
      await page.locator(`${root$} .bm-reading-step footer a`).click();
      await page.waitForFunction(({ sel, id, kind }) => document.querySelector(sel)?.getAttribute(`data-${kind}-step`) === id, { sel: stepSel, id: spec.stepIds[3], kind: spec.kind });
      await page.goto(`${origin}/beit-midrash?section=${spec.section}&step=${spec.stepIds[6]}`);
      await page.waitForSelector(`${stepSel}[data-${spec.kind}-step="${spec.stepIds[6]}"]`);
      assert.equal(await page.locator(`${stepSel} footer`).count(), 0, "last step has no next link");

      // Exercise: explanation only; no score, verdict wording, storage or network.
      const form = page.locator(`${root$} .bm-reading-exercise`);
      assert.equal(await form.locator("details").evaluate((el) => el.open), false);
      await form.getByLabel(spec.option).check();
      await form.locator("summary").click();
      const explanation = await form.locator("details").innerText();
      assert.match(explanation, spec.explanation);
      // Option labels are manifest content (a distractor may mention points); the feedback itself carries no verdict.
      for (const verdict of ["נכון!", "שגוי", "ניקוד", "ציון", "הצלחת", "טעית"]) assert.ok(!explanation.includes(verdict), `no verdict word ${verdict}`);
      assert.equal(await form.locator('[role="status"], [role="alert"], [aria-live], .is-correct, .is-wrong, [data-correct]').count(), 0, "no marking of the chosen option");
      assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0, "no stored progress");
      assert.equal(await page.evaluate(() => document.cookie), "");
      assert.equal(requests, 0, "the lesson adds no reader or fetch");
      assert.equal(await page.locator(`${root$} .bm-reading-next`).getAttribute("href"), spec.continuation[1]);
      assert.equal(await page.locator(`${root$} .bm-reading-next`).innerText(), spec.continuation[0]);

      // Reduced motion silences the strip while every step stays visible.
      const anim = () => page.evaluate((sel) => getComputedStyle(document.querySelector(`${sel} .bm-reading-trail li`)).animationName, root$);
      assert.notEqual(await anim(), "none");
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(await anim(), "none");
      assert.equal(await page.locator(`${root$} .bm-reading-trail li`).last().evaluate((el) => getComputedStyle(el).opacity), "1");
      if (spec.illustration) {
        assert.equal(await page.locator(`${root$} .bm-skip-hop`).first().evaluate((el) => getComputedStyle(el).animationName), "none");
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser?.close();
      await server.close();
    }
  });
}

test("learning paths keep exact manifest links and imply no saved completion", { skip: !available, timeout: 60_000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [fixturePlugin(), reactPlugin()], server: { host: "127.0.0.1", port: 0 } });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage();
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/beit-midrash?section=paths&path=ciphers#path-ciphers`);
      await page.waitForSelector("#path-ciphers.is-focused .bm-path-steps");
      const steps = await page.locator("#path-ciphers .bm-path-steps a").evaluateAll((links) => links.map((a) => [a.textContent.trim(), a.getAttribute("href")]));
      assert.deepEqual(steps, [
        ["לומדים לקרוא דילוג צעד אחר צעד", "/beit-midrash?section=ciphers#cipher-reading-lesson"],
        ["חוזרים על התנאים בכלי הצפנים", "/code"],
        ["לומדים לבדוק מקור והקשר", "/beit-midrash?section=sources#source-reading-lesson"],
      ]);
      const text = await page.locator("#path-ciphers").innerText();
      for (const done of ["הושלם", "הושלמו", "נשמר", "התקדמות", "%"]) assert.ok(!text.includes(done), `path implies no progress: ${done}`);
      assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= width + 1);
      assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
      const heights = await page.locator("#path-ciphers a").evaluateAll((links) => links.map((a) => a.getBoundingClientRect().height));
      assert.ok(heights.every((h) => h >= 44), "path links meet the touch target");
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});

const PRESENTATION_SLIDES = [
  "opening", "great-wonder", "name-times-seventy", "five-books", "bereshit-milui",
  "bereshit-chain", "bereshit-chain-total", "secret-and-strength", "twenty-six-to-sixty-five",
  "twenty-six-milui", "first-name-distance", "verse-1820", "jacob-rachel-leah",
  "brothers-words", "two-censuses", "tribes-question", "six-tribes", "leaders",
  "thirteen-attributes", "torah-roots", "ana-bekoach", "strong-1820", "bibi-examples", "diamonds",
];
const PRESENTATION_ENTRY = "/beit-midrash?section=paths&path=sod1820";
const PRESENTATION_OPEN = `${PRESENTATION_ENTRY}&lesson=sod1820`;
const FIXTURE_IMAGE = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect x="40" y="10" width="80" height="70" rx="8" fill="#888" opacity=".25"/></svg>');

async function openBrowserForPresentation() {
  const server = await vite.createServer({ root, configFile: false, plugins: [fixturePlugin(), reactPlugin()], server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ reducedMotion: "no-preference" });
  const page = await context.newPage();
  const seen = { errors: [], rest: 0, media: [], foreign: [] };
  page.on("pageerror", (error) => seen.errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !/Failed to load resource/.test(message.text())) seen.errors.push(message.text()); });
  await page.route(/sod1820\.co\.il|supabase\.co\/storage/, (route) => { seen.media.push(route.request().url()); return route.fulfill({ contentType: "image/svg+xml", body: FIXTURE_IMAGE }); });
  page.on("request", (request) => {
    const url = request.url();
    if (/\/rest\/v1|\/rpc\//.test(url)) seen.rest += 1;
    if (!url.startsWith(origin) && !/sod1820\.co\.il|supabase\.co\/storage/.test(url) && !url.startsWith("data:")) seen.foreign.push(url);
  });
  return { server, browser, page, origin, seen };
}

test("1820 presentation: opens only with its lesson, one shared diamonds read, exact slide order", { skip: !available, timeout: 120_000 }, async () => {
  const env = await openBrowserForPresentation();
  const { page, origin, seen } = env;
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    // Path open without the lesson: an invitation, no presentation, no catalogue read.
    await page.goto(`${origin}${PRESENTATION_ENTRY}#path-sod1820`);
    await page.waitForSelector('[data-presentation-open="true"]');
    assert.equal(await page.locator(".bm-presentation").count(), 0);
    assert.equal(await page.evaluate(() => window.__curationCalls || 0), 0, "no diamonds read before the lesson opens");
    // Other paths never open it either.
    await page.goto(`${origin}/beit-midrash?section=paths&path=ciphers&lesson=sod1820`);
    await page.waitForSelector("#path-ciphers");
    assert.equal(await page.locator(".bm-presentation").count(), 0);
    assert.equal(await page.evaluate(() => window.__curationCalls || 0), 0);

    await page.goto(`${origin}${PRESENTATION_OPEN}&slide=opening#sod1820-slide-opening`);
    await page.waitForSelector('.bm-slide[data-slide="opening"]');
    assert.equal(await page.locator(".bm-presentation").count(), 1);
    assert.deepEqual(await page.locator("[data-slide-link]").evaluateAll((links) => links.map((a) => a.dataset.slideLink)), PRESENTATION_SLIDES);
    assert.equal(await page.locator('[data-slide-link][aria-current="step"]').count(), 1);
    assert.match(await page.locator(".bm-slide>header>span").innerText(), /פתיחה · תחנה 1 מתוך 24/);
    assert.equal(await page.locator("a:has-text('→')").count(), 0, "no previous link on the first station");

    // Walk every station through the Next link: one station at a time, URL-addressable.
    const text = {};
    for (let index = 0; index < PRESENTATION_SLIDES.length; index += 1) {
      const id = PRESENTATION_SLIDES[index];
      await page.waitForSelector(`.bm-slide[data-slide="${id}"]`);
      assert.equal(await page.locator(".bm-slide").count(), 1, `${id}: one station at a time`);
      assert.equal(await page.locator("img").count() <= 1, true);
      text[id] = await page.locator(".bm-slide").innerText();
      assert.match(page.url(), new RegExp(`slide=${id}`));
      assert.equal(await page.locator('[data-slide-link][aria-current="step"]').getAttribute("data-slide-link"), id);
      const next = page.locator('.bm-presentation-nav a[rel="next"]');
      if (index < PRESENTATION_SLIDES.length - 1) { await next.click(); } else assert.equal(await next.count(), 0, "diamonds is the last station");
    }

    // Content rules.
    assert.match(text["five-books"], /165/); for (const n of ["398", "311", "396", "550", "165 + 398 + 311 + 396 + 550 = 1820"]) assert.ok(text["five-books"].includes(n), n);
    assert.ok(text["bereshit-milui"].includes("412 + 510 + 111 + 360 + 20 + 407 = 1820"));
    assert.ok(text["name-times-seventy"].includes("26 × 70 = 1820"));
    assert.ok(text["ana-bekoach"].includes("211 + 128 + 410 + 32 + 9 + 1030 = 1820"));
    assert.ok(text["bibi-examples"].includes("מחוץ לציר חישובי 1820"));
    assert.ok(text["bibi-examples"].includes("683") && text["bibi-examples"].includes("386") && text["bibi-examples"].includes("631"));
    assert.ok(!text["bibi-examples"].includes("= 1820"), "Bibi stays off the 1820 axis");
    for (const [id, body] of Object.entries(text)) {
      for (const banned of ["מקור אומת", "ציון אמת", "מצב אימות", "איכות ראיות", "ביטחון", "ממצא מחקר", "מאגר ממצאים"]) assert.ok(!body.includes(banned), `${id} must not say ${banned}`);
    }
    const allPresentationText = Object.values(text).join(" ");
    for (const removed of ["איך קוראים", "שלוש שכבות", "צוריאל", "1829", "טיוטה", "מראה מקום מדויק בבנייה"]) {
      assert.ok(!allPresentationText.includes(removed), `presentation must not contain ${removed}`);
    }

    // Diamonds: all of the shared catalogue, each exactly once, only one reader call for the whole walk.
    const ids = await page.locator("[data-diamond-id]").evaluateAll((items) => items.map((li) => li.dataset.diamondId));
    assert.deepEqual(ids, CATALOG_DIAMONDS.map((diamond) => diamond.id), "every diamond once, in catalogue order");
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(await page.locator(".bm-diamonds").getAttribute("data-diamond-count"), String(CATALOG_DIAMONDS.length));
    for (const diamond of CATALOG_DIAMONDS) assert.ok((text.diamonds ?? await page.locator(".bm-slide").innerText()).includes(diamond.label));
    assert.equal(await page.evaluate(() => window.__curationCalls), 1, "one shared diamonds read");
    assert.equal(await page.locator(`a[href^="/2029/gematria?q="]`).count() >= CATALOG_DIAMONDS.length, true);
    assert.equal(seen.rest, 0, "no canonical read besides the shared diamonds reader");
    assert.deepEqual(seen.foreign, [], "no request leaves the app except the presentation's own media");
    assert.deepEqual(seen.errors, []);
  } finally {
    await env.browser.close();
    await env.server.close();
  }
});

test("1820 presentation: exact original deck and Ahavat Torah selections", { skip: !available, timeout: 90_000 }, async () => {
  const env = await openBrowserForPresentation();
  const { page, origin } = env;
  try {
    await page.setViewportSize({ width: 1280, height: 900 });
    const slide = (id) => page.goto(`${origin}${PRESENTATION_OPEN}&slide=${id}#sod1820-slide-${id}`).then(() => page.waitForSelector(`.bm-slide[data-slide="${id}"]`));
    await slide("five-books");
    const links = await page.locator(".bm-slide-sources a").evaluateAll((anchors) => anchors.map((a) => [a.textContent.trim(), a.getAttribute("href"), a.target]));
    const bookLinks = links.filter(([, href]) => href.startsWith("/book/ahavat-torah?"));
    assert.equal(bookLinks.length, 2);
    for (const [, href] of bookLinks) {
      assert.ok(href.startsWith("/book/ahavat-torah?"), href);
      assert.ok(href.endsWith("#selection"));
      const url = new URL(href, "https://x.invalid");
      assert.equal(url.searchParams.get("tab"), "dossier");
      assert.equal(url.searchParams.get("page"), "6");
      assert.match(url.searchParams.get("selection"), /^book-selection:book:ahavat-torah:book:hebrewbooks:5635#p6:[a-z_]+:v1$/);
    }
    assert.match(bookLinks[0][1], /tetragrammaton_grand_total_restated/);
    assert.match(bookLinks[1][1], /per_parasha_tetragrammaton_table/);
    assert.equal(await page.locator(".bm-slide-sources small").first().innerText(), "מראה מקום מדויק");

    await slide("opening");
    const opening = await page.locator(".bm-slide-sources li").evaluateAll((items) => items.map((li) => [li.querySelector("a")?.getAttribute("href"), li.querySelector("a")?.target, li.querySelector("small")?.textContent]));
    assert.equal(opening[0][0], "https://www.youtube.com/watch?v=DClJVGBMCs0");
    assert.equal(opening[0][1], "_blank");
    assert.equal(opening[1][0], "/post/סוד-1820");
    assert.equal(opening[2][0], "https://www.slideserve.com/malana/5004169");
    assert.equal(opening[2][1], "_blank");
    assert.equal(await page.locator(".bm-facts").count(), 0);

    await slide("strong-1820");
    assert.equal(await page.locator(".bm-slide-list li").count(), 5);
    assert.equal(await page.locator('.bm-slide-list a[href^="/2029/gematria?q="]').count(), 5);
    assert.equal(await page.locator(".bm-slide-list b", { hasText: "1820" }).count(), 5);
  } finally {
    await env.browser.close();
    await env.server.close();
  }
});

test("1820 presentation: keyboard, deep links, error and retry", { skip: !available, timeout: 90_000 }, async () => {
  const env = await openBrowserForPresentation();
  const { page, origin, seen } = env;
  try {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${origin}${PRESENTATION_OPEN}&slide=strong-1820#sod1820-slide-strong-1820`);
    await page.waitForSelector('.bm-slide[data-slide="strong-1820"]');
    await page.goto(`${origin}${PRESENTATION_OPEN}&slide=not-a-slide`);
    await page.waitForSelector('.bm-slide[data-slide="opening"]');

    const current = () => page.locator(".bm-slide").getAttribute("data-slide");
    await page.locator("#sod1820-presentation").focus();
    // Right-to-left: the left arrow advances, the right arrow goes back.
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() => document.querySelector(".bm-slide")?.dataset.slide === "great-wonder");
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() => document.querySelector(".bm-slide")?.dataset.slide === "name-times-seventy");
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector(".bm-slide")?.dataset.slide === "great-wonder");
    await page.keyboard.press("End");
    await page.waitForFunction(() => document.querySelector(".bm-slide")?.dataset.slide === "diamonds");
    await page.keyboard.press("Home");
    await page.waitForFunction(() => document.querySelector(".bm-slide")?.dataset.slide === "opening");
    assert.equal(await current(), "opening");
    assert.match(page.url(), /slide=opening/);

    // Tab order: strip links, then previous/next; focus is visible on every stop.
    const link = page.locator('[data-slide-link="great-wonder"]');
    await link.focus();
    const ring = await link.evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }));
    assert.equal(ring.style, "solid");
    assert.ok(ring.width >= 2);
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.slideLink), "name-times-seventy");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector(".bm-slide")?.dataset.slide === "name-times-seventy");
    const nextHref = await page.locator('.bm-presentation-nav a[rel="next"]').getAttribute("href");
    assert.match(nextHref, /slide=five-books/);
    const touch = await page.locator(".bm-presentation-nav a, [data-slide-link]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    assert.ok(touch.every((h) => h >= 44), "touch targets");

    // Typing elsewhere never hijacks the keys: arrows inside a form control are ignored.
    await page.evaluate(() => { const i = document.createElement("input"); i.id = "probe"; document.querySelector("#sod1820-presentation").append(i); });
    await page.locator("#probe").focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await current(), "name-times-seventy");

    // Reader failure: no invented list; retry succeeds.
    await page.addInitScript(() => { window.__curationMode = { error: "once" }; });
    await page.goto(`${origin}${PRESENTATION_OPEN}&slide=diamonds#sod1820-slide-diamonds`);
    await page.waitForSelector('[data-frame-state="error"]');
    assert.equal(await page.locator("[data-diamond-id]").count(), 0);
    assert.match(await page.locator(".bm-slide").innerText(), /לא מוצגת רשימה חלופית/);
    await page.getByRole("button", { name: "נסו שוב" }).click();
    await page.waitForSelector("[data-diamond-id]");
    assert.equal(await page.locator("[data-diamond-id]").count(), CATALOG_DIAMONDS.length);
    assert.equal(await page.evaluate(() => window.__curationCalls), 2);
    assert.equal(seen.rest, 0);
    assert.deepEqual(seen.errors, []);
  } finally {
    await env.browser.close();
    await env.server.close();
  }
});

test("1820 presentation: nine theme/width combinations, centred, flat and motion-safe", { skip: !available, timeout: 180_000 }, async () => {
  const env = await openBrowserForPresentation();
  const { page, origin, seen } = env;
  try {
    const shots = process.env.BM_SHOTS_DIR;
    for (const theme of ["day", "card", "night"]) {
      for (const width of [320, 390, 1280]) {
        for (const slideId of ["five-books", "bereshit-milui", "diamonds"]) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${origin}${PRESENTATION_OPEN}&slide=${slideId}#sod1820-slide-${slideId}`);
          await page.waitForSelector(`.bm-slide[data-slide="${slideId}"]`);
          if (slideId === "diamonds") await page.waitForSelector("[data-diamond-id]");
          await page.evaluate((next) => window.__setTheme(next), theme);
          await page.waitForTimeout(500);
          const tag = `${theme} ${width}px ${slideId}`;
          const m = await page.evaluate(() => {
            const rect = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, w: b.width }; };
            const box = document.querySelector(".bm-presentation");
            const main = document.querySelector(".sod29-midrash");
            const slide = document.querySelector(".bm-slide");
            const nested = [...box.querySelectorAll(".bm-slide *")].filter((el) => {
              const style = getComputedStyle(el);
              const boxed = parseFloat(style.borderTopWidth) > 0 && parseFloat(style.borderLeftWidth) > 0 && parseFloat(style.borderRightWidth) > 0 && parseFloat(style.borderBottomWidth) > 0;
              return boxed && !["bm-tag"].some((cls) => el.classList.contains(cls)) && el.tagName !== "IMG" && el.tagName !== "B" && el.tagName !== "BUTTON" && el.tagName !== "A";
            }).map((el) => `${el.tagName}.${el.className}`);
            return {
              scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth,
              inside: rect(box).l >= rect(main).l - 1 && rect(box).r <= rect(main).r + 1,
              centred: Math.abs((rect(box).l + rect(box).r) / 2 - (rect(main).l + rect(main).r) / 2),
              stripHeights: [...box.querySelectorAll("[data-slide-link]")].map((a) => a.getBoundingClientRect().height),
              navHeights: [...box.querySelectorAll(".bm-presentation-nav a")].map((a) => a.getBoundingClientRect().height),
              overflowing: [...slide.querySelectorAll("*")].filter((el) => rect(el).r > rect(box).r + 1 || rect(el).l < rect(box).l - 1).map((el) => `${el.tagName}.${el.className}`).slice(0, 3),
              nested,
              fonts: { title: getComputedStyle(box.querySelector("h5")).fontFamily, body: getComputedStyle(slide.querySelector("header>p")).fontFamily, ui: getComputedStyle(box.querySelector("[data-slide-link]")).fontFamily, num: getComputedStyle(slide.querySelector("b, .bm-slide-equation, .bm-facts dd")).fontFamily },
              hint: box.querySelector(".bm-presentation-hint").textContent,
            };
          });
          assert.ok(m.scrollWidth <= m.viewport + 1, `${tag} overflow`);
          assert.ok(m.inside && m.centred <= 2, `${tag} centred (${m.centred})`);
          assert.ok(m.stripHeights.every((h) => h >= 44) && m.navHeights.every((h) => h >= 44), `${tag} touch targets`);
          assert.deepEqual(m.overflowing, [], `${tag} nothing leaves the frame`);
          assert.deepEqual(m.nested, [], `${tag} no nested boxes`);
          assert.match(m.fonts.title, /^"?Rubik/, `${tag} title font`);
          assert.match(m.fonts.body, /^"?Noto Sans Hebrew/, `${tag} body font`);
          assert.match(m.fonts.ui, /^"?Rubik/, `${tag} ui font`);
          if (slideId === "five-books") assert.match(m.fonts.num, /Plex Mono|Roboto Mono/, `${tag} numeric font`);
          if (shots && theme !== "card" || (shots && width === 390)) await page.locator(".bm-presentation").screenshot({ path: `${shots}/presentation-${slideId}-${theme}-${width}.png` });
        }
      }
    }
    // Reduced motion silences motion without hiding content.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${origin}${PRESENTATION_OPEN}&slide=five-books`);
    await page.waitForSelector(".bm-slide");
    const motion = () => page.evaluate(() => [getComputedStyle(document.querySelector(".bm-presentation-strip li")).animationName, getComputedStyle(document.querySelector(".bm-presentation-progress i")).transitionDuration]);
    const allowed = await motion();
    assert.notEqual(allowed[0], "none");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reduced = await motion();
    assert.equal(reduced[0], "none");
    assert.match(reduced[1], /^0s$/);
    assert.equal(await page.locator(".bm-presentation-strip li").last().evaluate((el) => getComputedStyle(el).opacity), "1");
    assert.equal(await page.locator(".bm-slide-figures li").count(), 5);
    assert.equal(seen.rest, 0);
    assert.deepEqual(seen.errors, []);
  } finally {
    await env.browser.close();
    await env.server.close();
  }
});
