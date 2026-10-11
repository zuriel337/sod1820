import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { libraryFixturePlugin } from "./fixtures/els-library-browser-fixture.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let pw, vite, react;
try {
  pw = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  react = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Browser tooling is optional outside CI. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const available = Boolean(pw && vite && react && existsSync(executablePath));

test("advanced page verifies a bounded hit before loading the shared matrix; Classic hides the controls", { skip: !available, timeout: 60000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [libraryFixturePlugin(), react()], server: { host: "127.0.0.1", port: 0 } });
  let browser;
  try {
    await server.listen();
    browser = await pw.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture`);
    await page.getByLabel("מונח לחיפוש מתקדם").fill("תורתאמת");
    await page.getByRole("button", { name: "בינוני · 81–200" }).click();
    await page.getByRole("button", { name: "חפש בטווח" }).click();
    await page.getByRole("button", { name: /תורתאמת · דילוג 86/ }).click();
    await page.waitForFunction(() => window.__advancedLoad?.hitId === "86_1_1200");
    const calls = await page.evaluate(() => window.__advancedCalls);
    assert.deepEqual(calls.map(call => call.body.op), ["page", "verify"]);
    assert.deepEqual([calls[0].body.skip_min, calls[0].body.skip_max], [81, 200]);
    assert.equal(await page.evaluate(() => window.__libraryEngineMounts), 1);
    await page.getByRole("button", { name: /קלאסי/ }).first().click();
    assert.equal(await page.getByLabel("מונח לחיפוש מתקדם").isVisible(), false);
    assert.equal(await page.evaluate(() => window.__advancedLoad?.hitId), "86_1_1200");
    await page.getByRole("button", { name: /מחקר/ }).first().click();
    assert.equal(await page.getByLabel("מונח לחיפוש מתקדם").inputValue(), "תורתאמת");
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
