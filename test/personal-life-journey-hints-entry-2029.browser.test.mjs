import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createLifeJourneyFixturePlugin } from "./fixtures/life-journey-fixture-plugin.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright;
let vite;
let reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional outside browser-capable CI. */ }

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const available = Boolean(playwright && vite && reactPlugin && existsSync(executablePath));

// The original flow below exercises PersonJourney in full. This additional seam
// mounts the actual route page and sanitizer with only the global chrome/session
// and unrelated data readers replaced; it catches a return link filtered by UI.
function actualJourneyPageFixture() {
  const fixture = createLifeJourneyFixturePlugin();
  const modules = new Map([
    ["virtual:actual-hints-page-entry.jsx", `
      import React from "react";
      import {createRoot} from "react-dom/client";
      import {BrowserRouter,useLocation,useNavigate} from "react-router-dom";
      import ResearchProvider from "virtual:life-journey-research.jsx";
      import LifeJourney2029Page from "/src/pages/LifeJourney2029Page.jsx";
      function Entry(){
        const location=useLocation();const navigate=useNavigate();
        window.__openActualHintsPage=value=>navigate("/2029/journey?focus=hints",{state:{sodReturnTo2029:value}});
        if(location.pathname==="/2029/journey")return React.createElement(LifeJourney2029Page);
        return React.createElement("main",{"data-source-page":""},React.createElement("h1",null,"מקור לבדיקה"),React.createElement("button",{onClick:()=>window.__openActualHintsPage(location.pathname+location.search+location.hash)},"הרמזים שלי"));
      }
      createRoot(document.getElementById("root")).render(React.createElement(BrowserRouter,null,React.createElement(ResearchProvider,null,React.createElement(Entry))));
    `],
    ["virtual:actual-hints-shell.jsx", `
      import React from "react";
      export default function Shell({children}){return React.createElement("div",{"data-actual-journey-shell":""},children);}
      export const use2029Shell=()=>({razielLocked:false,openRaziel:()=>{window.__razielCalls=(window.__razielCalls||[]).concat("open");}});
    `],
    ["virtual:actual-hints-raziel.js", `export const useOptionalRazielSession2029=()=>({submit:()=>{window.__razielCalls=(window.__razielCalls||[]).concat("submit");}});`],
    ["virtual:actual-hints-public-reader.js", `export const getPublicResearchClient=()=>{throw new Error("unexpected public reader");};`],
    ["virtual:actual-hints-public-model.js", `export const safePublicUrl=value=>value;`],
  ]);
  return {
    ...fixture,
    name: "actual-LifeJourney-page-return-fixture",
    resolveId(source) {
      if (modules.has(source)) return `\0${source}`;
      if (source.endsWith("/Sod2029Shell.jsx")) return "\0virtual:actual-hints-shell.jsx";
      if (source.endsWith("/RazielSessionMount2029.jsx")) return "\0virtual:actual-hints-raziel.js";
      if (source.endsWith("/researchViewMode.js")) return "\0virtual:actual-hints-public-reader.js";
      if (source.endsWith("/publicContributor2029Model.js")) return "\0virtual:actual-hints-public-model.js";
      return fixture.resolveId(source);
    },
    load(id) {
      if (modules.has(id.replace(/^\0/, ""))) return modules.get(id.replace(/^\0/, ""));
      const original = fixture.load(id);
      return id === "\0virtual:life-journey-supabase.js"
        ? `${original}\nexport const contributorHref=()=>null;`
        : original;
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url, "http://fixture.invalid").pathname;
        if (!["/world", "/post/5107", "/2029/journey"].includes(pathname)) return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        const html = '<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/@id/__x00__virtual:actual-hints-page-entry.jsx"></script></html>';
        response.end(await server.transformIndexHtml(request.url, html));
      });
    },
  };
}

test("actual Life Journey page returns to canonical World and Post via Router state, without URL payload or AI", { skip: !available, timeout: 60_000 }, async () => {
  const server = await vite.createServer({
    root,
    configFile: false,
    plugins: [actualJourneyPageFixture(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 },
  });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    await page.addInitScript(() => {
      localStorage.setItem("life-journey-ledger-fixture:owner", JSON.stringify({ members: [{ source_ref: "person:11111111-1111-4111-8111-111111111111:self", name: "בעל החשבון", meta: { first_name: "בעל", surname: "החשבון", profile_source: "account_owner_entered" } }], relations: [] }));
    });
    for (const target of ["/world?view=sources&source=tzvi-opoc#source-occurrence-example", "/post/5107?part=631#post-discovery-meeting"]) {
      await page.goto(`${origin}${target}`);
      await page.getByRole("button", { name: "הרמזים שלי", exact: true }).click();
      await page.locator('[data-actual-journey-shell] [data-experience-capability="person-life-journey"]').waitFor();
      assert.equal(page.url(), `${origin}/2029/journey?focus=hints`);
      const back = page.getByRole("link", { name: "חזרה למקום שממנו הגעת", exact: true });
      assert.equal(await back.getAttribute("href"), target);
      assert.equal(await page.evaluate(() => history.state.usr.sodReturnTo2029), target);
      await page.reload();
      await back.waitFor();
      assert.equal(await back.getAttribute("href"), target, "Router state preserves the source after reload");
      assert.deepEqual(await page.evaluate(() => ({ matrix: window.__matrixCalls.length, reflection: window.__reflectionCalls.length, names: window.__nameCalls.length, dates: window.__dateCalls.length, els: window.__elsCalls.length, raziel: (window.__razielCalls || []).length })), { matrix: 0, reflection: 0, names: 0, dates: 0, els: 0, raziel: 0 });
      await back.click();
      await page.locator("[data-source-page]").waitFor();
      assert.equal(page.url(), `${origin}${target}`);
    }
    for (const target of ["/profile?module=hints", "//evil.invalid", "/2029/%2f%2fevil"]) {
      await page.evaluate(value => window.__openActualHintsPage(value), target);
      await page.locator("[data-actual-journey-shell]").waitFor();
      assert.equal(await page.getByRole("link", { name: "חזרה למקום שממנו הגעת", exact: true }).count(), 0);
      await page.goto(`${origin}/world`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("the fixed hints entry opens the same private tree without model calls at 320px", { skip: !available, timeout: 60_000 }, async () => {
  const server = await vite.createServer({
    root,
    configFile: false,
    plugins: [createLifeJourneyFixturePlugin(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 },
  });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    await page.addInitScript(() => {
      localStorage.setItem("life-journey-ledger-fixture:owner", JSON.stringify({
        members: [{
          source_ref: "person:11111111-1111-4111-8111-111111111111:self",
          name: "בעל החשבון",
          meta: { first_name: "בעל", surname: "החשבון", profile_source: "account_owner_entered" },
        }],
        relations: [],
      }));
    });
    await page.goto(`${origin}/2029/journey?focus=hints`);
    const hints = page.locator('[data-experience-capability="life-journey-hint-references"]');
    await hints.getByRole("heading", { name: "הרמזים האישיים שלי" }).waitFor();
    assert.equal(await page.evaluate(() => window.__lifeJourneyContext?.dimensions?.lifeJourneyMapTab), "hints");
    assert.equal(await page.evaluate(() => window.__hintReads.length), 1);
    assert.deepEqual(await page.evaluate(() => ({
      matrix: window.__matrixCalls.length,
      reflection: window.__reflectionCalls.length,
      names: window.__nameCalls.length,
      dates: window.__dateCalls.length,
      els: window.__elsCalls.length,
      raziel: (window.__razielCalls || []).length,
    })), { matrix: 0, reflection: 0, names: 0, dates: 0, els: 0, raziel: 0 });
    assert.equal(decodeURIComponent(page.url()).includes("hint-1"), false);
    for (const theme of ["light", "parchment", "dark"]) {
      await page.evaluate(value => window.__setLifeJourneyTheme(value), theme);
      await page.waitForFunction(value => document.querySelector("[data-fixture-theme]")?.dataset.fixtureTheme === value, theme);
      const layout = await hints.evaluate(element => ({
        overflow: element.scrollWidth > element.clientWidth + 1,
        smallTargets: [...element.querySelectorAll("button, a")].filter(target => {
          const box = target.getBoundingClientRect();
          return box.width < 43.5 || box.height < 43.5;
        }).length,
      }));
      assert.equal(layout.overflow, false, `${theme} private hints fit 320px`);
      assert.equal(layout.smallTargets, 0, `${theme} private hints keep 44px targets`);
    }
  } finally {
    await browser?.close();
    await server.close();
  }
});
