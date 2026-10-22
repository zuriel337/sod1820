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
      family: "research_object",
      statement: "שתי דרכי חישוב נפגשות באותו ערך",
      secondary: "הממצא נשמר עם המקור והיעד המדויק.",
      kind: "relation",
      values: [1820],
      sourceLabel: "מקור מחקר",
      sourceRef: "channel_updates:source-1#a2",
      sourceRefs: ["channel_updates:source-1#a2", "channel_updates:source-1#a7"],
      contributor: "חוקר",
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

function fixturePlugin() {
  const modules = new Map([
    ["virtual:bm-auth.jsx", `export const useAuth=()=>({isAdmin:new URLSearchParams(window.location.search).get("fixtureAdmin")==="1",loading:false});`],
    ["virtual:bm-shell.jsx", `import React from "react";export function FrameState({kind,title,children,action}){return React.createElement("section",{"data-frame-state":kind},React.createElement("h3",null,title),children,action)}export default function Shell({children,title}){return React.createElement("div",{className:"sod29-root surface-beit-midrash"},React.createElement("header",{hidden:true},title),children)}`],
    ["virtual:bm-icon.jsx", `import React from "react";export default function Icon(){return React.createElement("span",{"aria-hidden":true},"◇")}`],
    ["virtual:bm-ratings.jsx", `import React from "react";export default function Ratings({quality,meterScore}){return React.createElement("div",{className:"k29-rate","data-quality":quality??"missing","data-meter":meterScore??"missing"},"איכות ",quality??"לא דורג"," · חוזק ",meterScore??"אין נתון")}`],
    ["virtual:bm-trace-component.jsx", `export default function Trace(){return null}`],
    ["virtual:bm-registry.js", `export const fetchGematriaMethodStates=async()=>[{method_key:"standard",display_label:"רגיל",category:"base",active:true,registered:true,executable:true,engine_verified:true,scannable:true}];`],
    ["virtual:bm-number.js", `export const fetchNumberMethodProfile=async()=>[{methodKey:"standard",displayLabel:"רגיל",category:"base",computedValue:73}];`],
    ["virtual:bm-trace.js", `export const fetchGematriaMethodTrace=async()=>null;`],
    ["virtual:bm-definition.js", `export const methodMechanicalDefinition=()=>({what:"סוכמת את ערכי האותיות",structure:null,dependencies:[],interpretation:null});`],
    ["virtual:bm-world.js", `
      export const fetchWorldAllResearchProjection=async()=>window.__projection;
      export function filterWorldAllResearchRows(rows,filters={}){return (rows||[]).filter(row=>(filters.family==null||row.family===filters.family)&&(!filters.tree||filters.tree==="all"||filters.tree==="matched"&&row.treeMatches?.length||filters.tree==="unmatched"&&!row.treeMatches?.length)&&(!filters.meter||filters.meter==="all"||filters.meter==="metered"&&row.linkedTopicRating?.meterScore!=null||filters.meter==="unmetered"&&row.linkedTopicRating?.meterScore==null));}
    `],
    ["virtual:bm-review.js", `export const fetchWorldFindingReviewPage=async()=>({projection:window.__projection});`],
    ["virtual:bm-mode.js", `export const isPublishedScope=value=>String(value||"").trim().toLowerCase()==="public";`],
    ["virtual:bm-seo.js", `export const applySeo=()=>{};`],
  ]);
  const aliases = new Map([
    ["AuthContext.jsx", "virtual:bm-auth.jsx"],
    ["Sod2029Shell.jsx", "virtual:bm-shell.jsx"],
    ["NavigationIcon2029.jsx", "virtual:bm-icon.jsx"],
    ["ConvergenceRatings2029.jsx", "virtual:bm-ratings.jsx"],
    ["MethodTraceExplanation2029.jsx", "virtual:bm-trace-component.jsx"],
    ["gematriaMethodRegistry.js", "virtual:bm-registry.js"],
    ["numberCoreProjection.js", "virtual:bm-number.js"],
    ["gematriaTrace.js", "virtual:bm-trace.js"],
    ["beitMidrashMethodDefinition.js", "virtual:bm-definition.js"],
    ["worldAllResearchProjection.js", "virtual:bm-world.js"],
    ["worldFindingReviewClient.js", "virtual:bm-review.js"],
    ["researchViewMode.js", "virtual:bm-mode.js"],
    ["seo.js", "virtual:bm-seo.js"],
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
        const html = `<div id="root"></div><script>window.__projection=${JSON.stringify(projection)}</script><script type="module" src="/test/fixtures/beit-midrash-browser-entry.jsx"></script>`;
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
          };
        });
        assert.ok(layout.scrollWidth <= layout.viewport + 1, `${theme} ${width}px must not overflow horizontally`);
        assert.equal(layout.pillarColumns, width <= 620 ? 1 : 3, `${theme} ${width}px pillar layout`);
        assert.notEqual(layout.background, "rgba(0, 0, 0, 0)");
        assert.notEqual(layout.heroBorder, "rgba(0, 0, 0, 0)", "thin gold frame is drawn");
        assert.deepEqual(layout.small, [], `${theme} ${width}px touch targets`);
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
    assert.equal(await page.locator('[data-guided-concept="crossing"][data-finding-id="f-public"] a[href="/world?admin=1&finding=f-public#finding-f-public"]').count(), 1);
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
