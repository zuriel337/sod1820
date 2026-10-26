import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright, vite, reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Browser tooling is optional only in lightweight checkouts. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : playwright?.chromium.executablePath());
const available = Boolean(playwright && vite && reactPlugin && executablePath && existsSync(executablePath));

test("people, roots and megillot retain their source through search/export/3D/reload at 320/390/1440", { skip: !available, timeout: 240_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  const server = await vite.createServer({ root: ROOT, configFile: false, plugins: [reactPlugin()], appType: "spa", server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--use-angle=swiftshader"] });
  try {
    for (const width of [320, 390, 1440]) {
      console.log(`Source tables viewport ${width}: start`);
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      let rootRequests = 0;
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === base && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
          const response = await context.request.get(`${base}/2029.html`);
          return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
        }
        if (url.pathname === "/book-data/ahavat-torah.roots.json") {
          rootRequests++;
          if (rootRequests === 1) return route.fulfill({ status: 503, body: "unavailable" });
        }
        if (url.pathname.endsWith(".pdf")) return route.abort();
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") return route.fulfill({ status: 200, contentType: "application/json", body: url.pathname.startsWith("/auth/v1/") ? JSON.stringify({ user: null, session: null }) : "[]" });
        if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/2029/control?surface=ahavat-torah-system&dataset=DS-05&peopleBook=bereshit&page=26#ahavat29-people`, { waitUntil: "domcontentloaded" });
      const people = page.locator("#ahavat29-people");
      const pdf = page.locator("#ahavat29-source iframe");
      const roots = page.locator("#ahavat29-roots");
      const scrolls = page.locator("#ahavat29-scrolls");
      const click = async locator => {
        await locator.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
        await locator.click();
      };
      const downloadText = async button => {
        const pending = page.waitForEvent("download");
        await click(button);
        const download = await pending;
        const chunks = [];
        for await (const chunk of await download.createReadStream()) chunks.push(chunk);
        return { filename: download.suggestedFilename(), text: Buffer.concat(chunks).toString("utf8") };
      };
      await people.locator("tbody tr").first().waitFor();
      await page.waitForFunction(() => {
        const top = document.getElementById("ahavat29-people")?.getBoundingClientRect().top;
        return top >= 0 && top < 200;
      });
      assert.equal(rootRequests, 0, "root OCR is not requested at page load");
      const peopleSearch = people.getByRole("searchbox", { name: "חיפוש באנשים ובייחוסים" });
      await peopleSearch.fill("יַעֲקֹב");
      const jacob = people.locator("tbody tr").filter({ has: page.getByRole("cell", { name: "יעקב", exact: true }) });
      assert.equal(await jacob.locator("td:nth-child(3)").textContent(), "83");
      assert.equal(await jacob.locator("td:nth-child(5)").textContent(), "1,197");
      await click(jacob.getByRole("button", { name: "PDF 27", exact: true }));
      assert.match(await pdf.getAttribute("src"), /#page=27&view=FitH$/);
      assert.equal(new URL(page.url()).searchParams.get("dataset"), "DS-05");
      await click(people.getByRole("navigation", { name: "בחירת חומש בייחוסים" }).getByRole("button", { name: "ויקרא", exact: true }));
      await peopleSearch.fill("משה");
      assert.equal(await people.locator("tbody tr").count(), 1);
      await click(people.locator("tbody tr button"));
      assert.match(await pdf.getAttribute("src"), /#page=29&view=FitH$/);
      const peopleCsv = await downloadText(people.getByRole("button", { name: /הורד ייחוסים למחקר/ }));
      assert.match(peopleCsv.text, /"משה","ו׳","6","שי״ט","319","29"/);
      await click(people.getByRole("button", { name: "פתח מבנה ייחוסים בתלת־ממד", exact: true }));
      await people.locator("canvas").waitFor();
      assert.match(await people.locator(".ahavat29-spatial-canvas").getAttribute("aria-label"), /תיבות מיוחסות/);
      await click(people.getByRole("button", { name: "פעמים", exact: true }));
      assert.match(await people.locator(".ahavat29-spatial-canvas").getAttribute("aria-label"), /פעמים בדברי המחבר/);
      await click(people.getByRole("button", { name: "סגור מבנה ייחוסים בתלת־ממד", exact: true }));

      await click(roots.getByRole("button", { name: "פתח תעתיק וחיפוש בשרשים", exact: true }));
      await roots.getByText("התעתיק לא נטען. הרשימה המלאה זמינה ב־PDF שלצדו.", { exact: true }).waitFor();
      await click(roots.getByRole("button", { name: "נסה לטעון שוב", exact: true }));
      await roots.locator("pre").first().waitFor();
      assert.equal(rootRequests, 2);
      assert.equal(await roots.locator("pre").count(), 2);
      assert.equal(await roots.locator("pre").first().evaluate(element => getComputedStyle(element).whiteSpace), "pre-wrap");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `expanded transcript overflow at ${width}`);
      const rootsSearch = roots.getByRole("searchbox", { name: "חיפוש ברשימת השרשים" });
      await rootsSearch.fill("שחקים");
      assert.equal(await roots.locator("article").count(), 1);
      await click(roots.locator("article").getByRole("button", { name: "מקור הרשימה · PDF 35", exact: true }));
      assert.match(await pdf.getAttribute("src"), /#page=35&view=FitH$/);
      assert.equal(new URL(page.url()).searchParams.get("dataset"), "DS-11");
      await rootsSearch.fill("לאנמצאבספראיזהטקסט");
      await roots.getByText("לא נמצאה צורה מתאימה בתעתיק. אפשר לבדוק את עמודי המקור המלאים.", { exact: true }).waitFor();
      await rootsSearch.fill("");
      await click(roots.getByRole("button", { name: "סגור תעתיק וחיפוש בשרשים", exact: true }));

      await click(scrolls.getByRole("button", { name: "מניין האותיות", exact: true }));
      assert.equal(await scrolls.locator("tbody tr").count(), 140);
      await click(scrolls.getByRole("navigation", { name: "בחירת מגילה", exact: true }).getByRole("button", { name: "אסתר", exact: true }));
      assert.equal(await scrolls.locator("tbody tr").count(), 28);
      const scrollSearch = scrolls.getByRole("searchbox", { name: "חיפוש בטבלת המגילות" });
      await scrollSearch.fill("לאנמצאבספראיזהטקסט");
      assert.equal(await scrolls.locator("tbody tr").count(), 0);
      await scrollSearch.fill("");
      for (const [form, sourcePage] of [["פ", 42], ["ף", 43]]) {
        await click(scrolls.locator("tbody tr").filter({ has: page.getByRole("cell", { name: form, exact: true }) }).getByRole("button", { name: `PDF ${sourcePage}`, exact: true }));
        assert.match(await pdf.getAttribute("src"), new RegExp(`#page=${sourcePage}&view=FitH$`));
      }
      const scrollCsv = await downloadText(scrolls.getByRole("button", { name: /הורד מגילות למחקר/ }));
      assert.match(scrollCsv.text, /"אסתר","ב","\?","","42"/);
      assert.equal(scrollCsv.filename, "ahavat-torah-megillot-letters-esther.csv");
      await click(scrolls.getByRole("button", { name: "מניין התיבות", exact: true }));
      assert.equal(await scrolls.locator("tbody tr").count(), 1);
      assert.equal(await scrolls.locator("tbody td:nth-child(4)").textContent(), "3,045");
      assert.equal(new URL(page.url()).searchParams.get("dataset"), "DS-10");
      await click(scrolls.getByRole("navigation", { name: "בחירת מגילה", exact: true }).getByRole("button", { name: "כל חמש המגילות", exact: true }));
      await click(scrolls.getByRole("button", { name: "פתח מבנה מגילות בתלת־ממד", exact: true }));
      await scrolls.locator("canvas").waitFor();
      assert.equal(await scrolls.locator("[aria-label='נתוני מבנה המגילות'] button").count(), 5);
      assert.equal(await scrolls.locator(".ahavat29-letter-scene [aria-label='נתוני מבנה המגילות']").count(), 0, "accessible controls stay outside the fixed-height canvas container");
      await click(scrolls.locator("[aria-label='נתוני מבנה המגילות']").getByRole("button", { name: "רות · 1,214", exact: true }));
      assert.equal(await scrolls.locator("tbody tr").count(), 1);
      assert.match(await pdf.getAttribute("src"), /#page=43&view=FitH$/);
      await click(scrolls.getByRole("button", { name: "סגור מבנה מגילות בתלת־ממד", exact: true }));
      await page.reload({ waitUntil: "domcontentloaded" });
      await scrolls.locator("tbody tr").first().waitFor();
      assert.equal(await scrolls.getByRole("button", { name: "מניין התיבות", exact: true }).getAttribute("aria-pressed"), "true");
      assert.equal(await scrolls.getByRole("navigation", { name: "בחירת מגילה", exact: true }).getByRole("button", { name: "רות", exact: true }).getAttribute("aria-pressed"), "true");
      await click(page.locator(".ahavat29-spatial-legend button").filter({ hasText: "DS-09" }));
      await scrolls.getByRole("button", { name: "מניין האותיות", exact: true, pressed: true }).waitFor();
      assert.equal(await scrolls.locator("tbody tr").count(), 28);
      assert.match(await pdf.getAttribute("src"), /#page=42&view=FitH$/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `overflow at ${width}`);
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`Source tables viewport ${width}: passed`);
    }
  } finally { await browser.close(); await server.close(); }
});
