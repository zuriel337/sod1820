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
    assert.equal(await page.getByRole("button", { name: /קרוב|בינוני|רחוק/ }).count(), 0);
    await page.getByLabel("דילוג מינימלי").fill("81");
    await page.getByLabel("דילוג מקסימלי").fill("200");
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
    await page.getByLabel("מילות המשך למחקר").fill("אמת");
    await page.getByRole("button", { name: "בדוק מילות המשך" }).click();
    await page.getByLabel("תוצאות אמת").getByRole("button", { name: /דילוג 86/ }).click();
    await page.waitForFunction(() => window.__advancedLoad?.term === "אמת");
    const batchCalls = await page.evaluate(() => window.__advancedCalls.slice(2));
    assert.deepEqual(batchCalls.map(call => call.body.op), ["page", "page", "verify"]);
    assert.deepEqual(batchCalls.filter(call => call.body.op === "page").map(call => call.body.term), ["תורתאמת", "אמת"]);
    await page.getByLabel("דילוג מדויק ללא תקרת 500").fill("10065");
    await page.getByRole("button", { name: "פתח דילוג מדויק" }).click();
    await page.waitForFunction(() => window.__advancedLoad?.skip === 10065);
    assert.equal(await page.evaluate(() => window.__advancedLoad.start), 50890);
    assert.equal(await page.evaluate(() => window.__advancedCalls.length), 5, "exact skip goes through the mounted engine, not a >500 page request");
    await page.getByLabel("מונח לחיפוש מתקדם").fill("דפדוף");
    await page.getByLabel("תוצאות בדף").fill("1");
    await page.getByRole("button", { name: "חפש בטווח" }).click();
    await page.getByRole("button", { name: "טען תוצאות נוספות" }).click();
    await page.getByRole("button", { name: "טען תוצאות נוספות" }).click();
    await page.getByText("3 מופעים נטענו ב־3 דפים · סוף התוצאות בטווח").waitFor();
    assert.equal(await page.getByLabel("מופעי החיפוש המתקדם").getByRole("listitem").count(), 3);
    assert.deepEqual(await page.evaluate(() => window.__advancedCalls.slice(5).map(call => call.body.after_skip ?? null)), [null, 86, 87]);
    await page.getByLabel("מונח לחיפוש מתקדם").fill("סוד החשמל");
    await page.getByLabel("צורת כתיבה לחיפוש").selectOption("reverse_all");
    await page.getByText("יחופש בפועל: למשחה דוס").waitFor();
    await page.getByLabel("דילוג מקסימלי").fill("10065");
    await page.getByRole("button", { name: "חפש בטווח" }).click();
    await page.waitForFunction(() => window.__advancedCalls.at(-1)?.body?.term === "למשחה דוס");
    assert.equal(await page.evaluate(() => window.__advancedCalls.at(-1).body.skip_max), 10065);
    await page.getByLabel("צורת כתיבה לחיפוש").selectOption("reverse_last");
    await page.getByText("יחופש בפועל: סוד למשחה").waitFor();
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
