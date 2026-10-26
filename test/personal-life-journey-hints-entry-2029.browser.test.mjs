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
