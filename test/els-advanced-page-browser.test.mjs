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

test("light Research entry exposes an idle brief while advanced controls stay closed; exact load survives Classic round-trip", { skip: !available, timeout: 60000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [libraryFixturePlugin(), react()], server: { host: "127.0.0.1", port: 0 } });
  let browser;
  try {
    await server.listen();
    browser = await pw.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture`);
    await page.getByRole("heading", { name: "הקשר למחקר" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "מחקר", exact: true }).count(), 1);
    assert.equal(await page.getByLabel("סיפור או הקשר למחקר").isVisible(), true);
    assert.equal(await page.getByLabel("מונח לחיפוש מתקדם").isVisible(), false);
    assert.deepEqual(await page.evaluate(() => window.__advancedCalls), []);
    await page.locator('[data-els-advanced-options="explicit-open-v1"] > summary').click();
    assert.equal(await page.getByLabel("מונח לחיפוש מתקדם").isVisible(), true);
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
    await page.getByRole("button", { name: "מחקר", exact: true }).click();
    assert.equal(await page.getByLabel("מונח לחיפוש מתקדם").isVisible(), true);
    assert.equal(await page.getByLabel("מונח לחיפוש מתקדם").inputValue(), "תורתאמת");
    await page.getByLabel("מילות המשך למחקר").fill("אמת");
    await page.getByRole("button", { name: "חקור את כל הצורות אוטומטית" }).click();
    await page.getByText(/ביטויים · .*צורות שונות/).waitFor();
    await page.getByLabel("תוצאות אמת").getByRole("button", { name: /דילוג 86/ }).click();
    await page.waitForFunction(() => window.__advancedLoad?.term === "אמת");
    assert.equal(await page.evaluate(() => window.__advancedLoad?.researchBundle), true);
    const batchCalls = await page.evaluate(() => window.__advancedCalls.slice(2));
    assert.equal(batchCalls.at(-1).body.op, "verify");
    assert.ok(batchCalls.filter(call => call.body.op === "page").some(call => call.body.term === "תורתאמת"));
    assert.ok(batchCalls.filter(call => call.body.op === "page").some(call => call.body.term === "אמת"));
    const beforeExact = await page.evaluate(() => window.__advancedCalls.length);
    await page.getByLabel("דילוג מדויק ללא תקרת 500").fill("10065");
    await page.getByRole("button", { name: "פתח דילוג מדויק" }).click();
    await page.waitForFunction(() => window.__advancedLoad?.skip === 10065);
    assert.equal(await page.evaluate(() => window.__advancedLoad.start), 50890);
    assert.equal(await page.evaluate(() => window.__advancedCalls.length), beforeExact, "exact skip goes through the mounted engine, not a >500 page request");
    await page.getByLabel("מונח לחיפוש מתקדם").fill("דפדוף");
    await page.getByLabel("תוצאות בדף").fill("1");
    await page.getByRole("button", { name: "חפש בטווח" }).click();
    await page.getByRole("button", { name: "טען תוצאות נוספות" }).click();
    await page.getByRole("button", { name: "טען תוצאות נוספות" }).click();
    await page.getByText("3 מופעים נטענו ב־3 דפים · סוף התוצאות בטווח").waitFor();
    assert.equal(await page.getByLabel("מופעי החיפוש המתקדם").getByRole("listitem").count(), 3);
    assert.deepEqual(await page.evaluate(index => window.__advancedCalls.slice(index).map(call => call.body.after_skip ?? null), beforeExact), [null, 86, 87]);
    await page.getByLabel("מונח לחיפוש מתקדם").fill("סוד החשמל");
    await page.getByLabel("צורת כתיבה לחיפוש").selectOption("reverse_all");
    await page.getByText("יחופש בפועל: למשחה דוס").waitFor();
    await page.getByLabel("דילוג מקסימלי").fill("10065");
    await page.getByRole("button", { name: "חפש בטווח" }).click();
    await page.waitForFunction(() => window.__advancedCalls.at(-1)?.body?.term === "למשחה דוס");
    assert.equal(await page.evaluate(() => window.__advancedCalls.at(-1).body.skip_max), 10065);
    await page.getByLabel("צורת כתיבה לחיפוש").selectOption("reverse_last");
    await page.getByText("יחופש בפועל: סוד למשחה").waitFor();
    await page.getByLabel("מונח לחיפוש מתקדם").fill("חשפד");
    await page.getByLabel("מילות המשך למחקר").fill("משיח");
    await page.getByLabel("מונחים למחקר הצורות").selectOption("secondary");
    await page.evaluate(() => { window.__advancedHoldTerm = 'משיח'; });
    const beforeSecondary = await page.evaluate(() => window.__advancedCalls.length);
    await page.getByRole("button", { name: "חקור את כל הצורות אוטומטית" }).click();
    await page.getByText("סורק עכשיו: משיח").waitFor();
    assert.equal(await page.getByLabel("תוצאות משיח").getByText("הצורה הזאת נסרקת כעת…").count(), 1);
    assert.equal(await page.getByLabel("תוצאות חשפד").count(), 0, "secondary-only research does not scan the primary term");
    await page.evaluate(() => { window.__advancedHoldTerm = null; window.__releaseAdvanced(); });
    await page.getByText(/צורות שונות · .* הושלמו/).waitFor();
    await page.waitForFunction(index => window.__advancedCalls.slice(index).some(call => call.body.term === 'משיח'), beforeSecondary);
    assert.ok(!(await page.evaluate(index => window.__advancedCalls.slice(index).some(call => call.body.term === 'חשפד'), beforeSecondary)));
    await page.getByLabel("מונחים למחקר הצורות").selectOption("primary");
    await page.evaluate(() => { window.__advancedFailTerm = 'חשפד'; });
    await page.getByRole("button", { name: "חקור את כל הצורות אוטומטית" }).click();
    await page.getByLabel("תוצאות חשפד").getByRole("heading", { name: /הבדיקה לא הושלמה/ }).waitFor();
    assert.equal(await page.getByLabel("תוצאות חשפד").getByText(/לא נמצאו מופעים/).count(), 0);
    assert.equal(await page.getByText(/הטווח פתוח גם מעל 500/).count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("a private research brief sends one axis and selected exact context without sending the story", { skip: !available, timeout: 60000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [libraryFixturePlugin(), react()], server: { host: "127.0.0.1", port: 0 } });
  let browser;
  try {
    await server.listen();
    browser = await pw.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture`);
    await page.getByLabel("ציר ראשי למחקר").fill("קולומביה");
    await page.getByLabel("סיפור או הקשר למחקר").fill("הספינה קולומביה עלתה באש. האש אכלה.");
    await page.getByLabel("מונחים שחייבים לבדוק").fill("יכל אש");
    await page.getByRole("button", { name: "בנה תוכנית ציר והקשר" }).click();
    const plan = page.getByLabel("תוכנית הציר וההקשר");
    await plan.getByText(/ציר ראשי אחד ·/).waitFor();
    assert.ok(await plan.getByText("קולומביה", { exact: true }).count() >= 1);
    assert.ok(await plan.getByText("יכל אש", { exact: true }).count() >= 1);
    assert.equal(await plan.locator(".els29-brief-context-row").filter({ hasText: "יכל אש" }).getByRole("button", { name: "גם כל מילה בנפרד" }).getAttribute("aria-pressed"), "false");
    assert.deepEqual(await page.evaluate(() => window.__advancedCalls), []);
    assert.equal(await page.getByLabel("מונח לחיפוש מתקדם").isVisible(), false);
    await plan.getByRole("button", { name: "מצא את הציר ובנה סביבו חבילת מחקר" }).click();
    await page.waitForFunction(() => window.__advancedLoad?.researchCommand === true);
    const state = await page.evaluate(() => ({
      calls: window.__advancedCalls,
      load: window.__advancedLoad,
      url: location.href,
      local: Object.values(localStorage),
      session: Object.values(sessionStorage),
    }));
    assert.deepEqual(state.calls, [], "the mounted canonical engine owns the search; the brief does not call a second page scanner");
    assert.equal(state.load.term, "קולומביה");
    assert.equal(state.load.returnLabel, "תוכנית המחקר");
    const exactContext = state.load.contextTerms.find(row => row.term === "יכל אש");
    assert.deepEqual({ mode: exactContext?.mode, split: exactContext?.split }, { mode: "exact_phrase", split: false });
    assert.equal(state.load.contextTerms.some(row => row.term === "יכל" || row.term === "אש"), false, "exact context is not silently split");
    assert.ok(!JSON.stringify(state.load).includes("הספינה קולומביה עלתה באש"));
    assert.ok(!state.url.includes("הספינה"));
    assert.ok(!JSON.stringify([...state.local, ...state.session]).includes("הספינה"));
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("Raziel exact-return URL loads the saved ELS coordinates through the existing canonical matrix input", { skip: !available, timeout: 60000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [libraryFixturePlugin(), react()], server: { host: "127.0.0.1", port: 0 } });
  let browser;
  try {
    await server.listen();
    browser = await pw.chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const query = new URLSearchParams({
      els_return: "verified-v1",
      term: "משיח",
      scope: "torah",
      corpus: "fixture-torah",
      skip: "17",
      dir: "1",
      start: "100",
      occurrence: "anon:fixture-occurrence",
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture?${query}`);
    await page.waitForFunction(() => window.__advancedLoad?.hitId === "17_1_100");
    const loaded = await page.evaluate(() => window.__advancedLoad);
    assert.deepEqual({
      term: loaded.term,
      scope: loaded.scope,
      corpusId: loaded.corpusId,
      skip: loaded.skip,
      dir: loaded.dir,
      start: loaded.start,
      occurrenceRef: loaded.occurrenceRef,
    }, {
      term: "משיח",
      scope: "torah",
      corpusId: "fixture-torah",
      skip: 17,
      dir: 1,
      start: 100,
      occurrenceRef: "anon:fixture-occurrence",
    });
    assert.deepEqual(await page.evaluate(() => window.__advancedCalls), []);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});

test("restored Research stays clean and keeps one workspace on mobile and desktop", { skip: !available, timeout: 90000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [libraryFixturePlugin(), react()], server: { host: "127.0.0.1", port: 0 } });
  let browser;
  try {
    await server.listen();
    browser = await pw.chromium.launch({ headless: true, executablePath });
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture`);
      await page.getByRole("heading", { name: "הקשר למחקר" }).waitFor();
      assert.equal(await page.getByRole("button", { name: "מחקר", exact: true }).count(), 1);
      assert.equal(await page.locator('[data-els-classic-2029="native-v1"]').isVisible(), true);
      await page.getByLabel("ציר ראשי למחקר").fill("קולומביה");
      await page.getByLabel("סיפור או הקשר למחקר").fill("הספינה קולומביה עלתה באש ונשארה בלב ים");
      await page.getByRole("button", { name: "בנה תוכנית ציר והקשר" }).click();
      const plan = page.getByLabel("תוכנית הציר וההקשר");
      await plan.getByText(/ציר ראשי אחד ·/).waitFor();
      assert.ok(await plan.getByText("קולומביה", { exact: true }).count() >= 1);
      await plan.getByRole("button", { name: "מצא את הציר ובנה סביבו חבילת מחקר" }).click();
      await page.waitForFunction(() => window.__advancedLoad?.researchCommand === true);
      assert.equal(await page.locator('[data-els-classic-2029="native-v1"]').isVisible(), true);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.getByRole("button", { name: "קלאסי", exact: true }).first().click();
      assert.equal(await page.getByLabel("סיפור או הקשר למחקר").isVisible(), false);
      assert.equal(await page.locator('[data-els-classic-2029="native-v1"]').isVisible(), true);
      await page.getByRole("button", { name: "מחקר", exact: true }).click();
      assert.equal(await page.getByLabel("סיפור או הקשר למחקר").inputValue(), "הספינה קולומביה עלתה באש ונשארה בלב ים");
      assert.deepEqual(errors, []);
      await page.close();
    }
    for (const width of [320, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const query = new URLSearchParams({
        els_return: "verified-v1",
        term: "משיח",
        scope: "torah",
        corpus: "fixture-torah",
        skip: "17",
        dir: "1",
        start: "100",
        occurrence: "anon:fixture-occurrence",
      });
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture?${query}`);
      await page.waitForFunction(() => window.__advancedLoad?.hitId === "17_1_100");
      const loaded = await page.evaluate(() => window.__advancedLoad);
      assert.deepEqual({
        term: loaded.term,
        scope: loaded.scope,
        corpusId: loaded.corpusId,
        skip: loaded.skip,
        dir: loaded.dir,
        start: loaded.start,
        occurrenceRef: loaded.occurrenceRef,
      }, {
        term: "משיח",
        scope: "torah",
        corpusId: "fixture-torah",
        skip: 17,
        dir: 1,
        start: 100,
        occurrenceRef: "anon:fixture-occurrence",
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${width}: exact return has no horizontal overflow`);
      await page.close();
    }
    const invalid = await browser.newPage({ viewport: { width: 320, height: 900 } });
    await invalid.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture?els_return=verified-v1&term=${encodeURIComponent("משיח")}&scope=torah&skip=17&dir=1`);
    await invalid.getByRole("heading", { name: "הקשר למחקר" }).waitFor();
    assert.equal(await invalid.evaluate(() => window.__advancedLoad), null);
    assert.equal(await invalid.evaluate(() => window.__libraryMatrix), null, "an incomplete exact return never degrades to legacy skip-only loading");
    await invalid.close();
  } finally {
    await browser?.close();
    await server.close();
  }
});
