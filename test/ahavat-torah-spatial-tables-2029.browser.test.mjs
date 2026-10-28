import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
const companionPages = req("../public/book-data/ahavat-torah.commentary.json").pages;
let playwright;
let vite;
let reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Browser tooling is optional in lightweight checkouts. */ }

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : playwright?.chromium.executablePath());
const available = Boolean(playwright && vite && reactPlugin && executablePath && existsSync(executablePath));

test("Ahavat Torah spatial tables keep source, data and 3D usable at 320/390/1440", { skip: !available, timeout: 360_000 }, async () => {
  process.env.SOD_BUILD_TARGET = "2029";
  process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW = "true";
  const server = await vite.createServer({
    root: ROOT,
    configFile: false,
    plugins: [reactPlugin()],
    appType: "spa",
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const address = server.httpServer.address();
  const base = `http://127.0.0.1:${address.port}`;
  const browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--use-angle=swiftshader"] });

  try {
    for (const width of [320, 390, 1440]) {
      console.info(`Ahavat Torah browser: starting ${width}px`);
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.origin === base && route.request().isNavigationRequest() && url.pathname === "/2029/control") {
          const response = await context.request.get(`${base}/2029.html`);
          return route.fulfill({ status: response.status(), contentType: "text/html", body: await response.body() });
        }
        if (url.pathname.endsWith(".pdf")) return route.abort();
        if (url.hostname === "linswmnnkjxvweumprav.supabase.co") {
          if (url.pathname.startsWith("/auth/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: null, session: null }) });
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        if (url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com")) return route.abort();
        return route.continue();
      });

      const page = await context.newPage();
      const click = async locator => {
        await locator.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
        await locator.click();
      };
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/2029/control?surface=ahavat-torah-system`, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "טבלאות שאפשר להיכנס לתוכן", exact: true }).waitFor();
      await page.locator("#ahavat29-source iframe").waitFor();

      await click(page.locator(".ahavat29-ds01-equation button").filter({ hasText: "שמות" }));
      assert.match(await page.locator(".ahavat29-ds01-detail p").textContent(), /398/);
      assert.equal(await page.locator(".ahavat29-ds01 .ahavat29-data-table tbody tr").filter({ hasText: "משפטים" }).locator("td:nth-child(2)").textContent(), "16");
      assert.equal(await page.locator(".ahavat29-ds01 .ahavat29-data-table tbody tr").filter({ hasText: "פקודי" }).locator("td:nth-child(2)").textContent(), "26");
      await click(page.locator(".ahavat29-ds01-equation button").filter({ hasText: "במדבר" }));
      assert.match(await page.locator(".ahavat29-ds01-detail p").textContent(), /396/);
      assert.equal(await page.locator(".ahavat29-ds01 .ahavat29-data-table tbody tr").filter({ hasText: "במדבר" }).locator("td:nth-child(2)").textContent(), "25");
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=6&view=FitH$/);

      assert.equal(await page.evaluate(() => (
        document.documentElement.scrollWidth <= window.innerWidth + 1
        && document.body.scrollWidth <= window.innerWidth + 1
        && document.querySelector(".ahavat29").getBoundingClientRect().right <= window.innerWidth + 1
      )), true, `Ahavat Torah overflows at ${width}px`);

      if (width <= 390) {
        const sourceBox = await page.locator("#ahavat29-source").boundingBox();
        const storyBox = await page.locator(".ahavat29-story").boundingBox();
        assert.ok(sourceBox && storyBox && sourceBox.y < storyBox.y, `PDF source is not first at ${width}px`);
      }

      await click(page.getByRole("button", { name: "פתח מצפה תלת־ממדי", exact: true }));
      await page.locator(".ahavat29-spatial-canvas canvas").waitFor();
      assert.equal(await page.locator(".ahavat29-spatial-canvas canvas").count(), 1);

      for (const id of ["DS-07", "DS-08"]) {
        await click(page.locator(".ahavat29-spatial-legend button").filter({ hasText: id }));
        assert.equal(new URL(page.url()).searchParams.get("dataset"), id);
        assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=6&view=FitH$/);
        assert.match(await page.locator(".ahavat29-dataset-detail").textContent(), /מראה־המקום בבירור/);
        assert.equal(await page.locator(".ahavat29-dataset-detail").getByRole("button", { name: /פתח PDF/ }).count(), 0);
      }
      await click(page.locator(".ahavat29-table-tabs").getByRole("button", { name: /מופעי משה/ }));
      const occurrence = page.locator(".ahavat29-occurrence");
      assert.equal(await occurrence.locator("tbody tr").count(), 10);
      assert.equal(await occurrence.locator("tbody tr").filter({ hasText: "כי תשא" }).locator("td:nth-child(4)").textContent(), "49");
      assert.equal(await occurrence.locator("tbody tr").filter({ hasText: "ויקהל" }).locator("td:nth-child(4)").textContent(), "9");
      await click(occurrence.getByRole("button", { name: "פתח מקור הקריאה · PDF 70", exact: true }));
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=70&view=FitH$/);
      await click(occurrence.locator(":scope > details > summary"));
      await click(occurrence.getByText("תעתיק קודם · 37 שורות", { exact: true }));
      assert.match(await occurrence.locator("pre").textContent(), /כי תשא · מ"ם · 40/);
      assert.equal(await occurrence.locator("pre").evaluate(element => getComputedStyle(element).whiteSpace), "pre-wrap");
      assert.equal(await occurrence.locator("pre").evaluate(element => element.scrollWidth <= element.clientWidth + 1), true, `historical source transcript overflows at ${width}px`);
      await click(page.locator(".ahavat29-table-tabs").getByRole("button", { name: /מופעי עשה/ }));
      assert.equal(await occurrence.locator("tbody tr").count(), 5);
      assert.equal(await occurrence.locator("tbody tr").filter({ hasText: "ויקהל" }).locator("td:nth-child(4)").textContent(), "84");
      await click(occurrence.getByRole("button", { name: "פתח מקור הקריאה · PDF 70", exact: true }));
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=70&view=FitH$/);

      const datasetButton = page.locator(".ahavat29-spatial-legend button").filter({ hasText: "DS-02" });
      await click(datasetButton);
      assert.equal(new URL(page.url()).searchParams.get("dataset"), "DS-02");
      assert.equal(new URL(page.url()).searchParams.get("page"), "35");
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=35&view=FitH$/);

      await click(page.locator(".ahavat29-table-tabs").getByRole("button", { name: /טבלת האותיות/ }));
      const search = page.getByRole("searchbox", { name: "חיפוש בתוך הטבלה" });
      await search.fill("שמיני");
      await page.getByRole("cell", { name: "שמיני", exact: true }).first().waitFor();
      assert.equal(await page.locator(".ahavat29-data-table tbody tr").count() > 0, true);

      const letterReader = page.locator("#ahavat29-letters");
      assert.equal(await letterReader.locator(".ahavat29-letter-alphabet button").count(), 28);
      for (const [name, form, pdfPage] of [["כף סופית", "ך", 37], ["מם סופית", "ם", 38], ["שין שמאלית", "שׂ", 41]]) {
        await click(letterReader.getByRole("button", { name, exact: true }));
        assert.equal(new URL(page.url()).searchParams.get("letter"), form);
        assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), new RegExp(`#page=${pdfPage}&view=FitH$`));
        assert.equal(await letterReader.locator("tbody tr").count(), 54);
        assert.equal(await letterReader.locator(".ahavat29-letter-transcript").count(), 0);
        if (form === "ם") {
          assert.equal(await letterReader.locator("tbody td:nth-child(4)").filter({ hasText: "—" }).count(), 5);
          await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "בראשית", exact: true }));
          assert.equal(await letterReader.locator(".ahavat29-letter-bars button").count(), 10, "unknown cells have no numeric bar");
          const unknownRow = letterReader.locator("tbody tr").filter({ has: page.getByRole("cell", { name: "ויצא", exact: true }) });
          assert.equal(await unknownRow.locator("td:nth-child(4)").textContent(), "—");
          await click(unknownRow.getByRole("button", { name: "PDF 38", exact: true }));
          assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=38&view=FitH$/);
          await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "כל התורה", exact: true }));
        }
      }
      await click(letterReader.getByRole("button", { name: "נון סופית", exact: true }));
      await click(letterReader.locator("tbody tr").filter({ has: page.getByRole("cell", { name: "תזריע", exact: true }) }).getByRole("button", { name: "PDF 39", exact: true }));
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=39&view=FitH$/);
      await click(letterReader.getByRole("button", { name: "אלף", exact: true }));
      await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "שמות", exact: true }));
      assert.equal(await letterReader.locator("tbody tr").count(), 11);
      assert.equal(await letterReader.locator("tbody tr").filter({ hasText: "ויקהל" }).locator("td:nth-child(4)").textContent(), "485");
      const letterSearch = letterReader.getByRole("searchbox", { name: "חיפוש בפרשות האות" });
      await letterSearch.fill("תפ״ה");
      assert.equal(await letterReader.locator("tbody tr").count(), 1);
      await letterSearch.fill("");
      await click(letterReader.getByRole("button", { name: "פתח מבנה האות בתלת־ממד", exact: true }));
      await letterReader.locator("canvas").waitFor();
      assert.equal(await letterReader.locator("canvas").count(), 1);
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=35&view=FitH$/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `letter reader overflows at ${width}px`);
      if (width > 900) {
        const sourceBounds = await page.locator("#ahavat29-source").boundingBox();
        const readerBounds = await letterReader.boundingBox();
        assert.ok(sourceBounds && readerBounds && readerBounds.x + readerBounds.width <= sourceBounds.x + 1, "PDF must be to the right of the letter reader without overlap");
      }
      await click(letterReader.getByRole("button", { name: "בית", exact: true }));
      assert.equal(await letterReader.locator("tbody tr").count(), 11);
      assert.equal(await letterReader.locator("tbody tr").filter({ hasText: "שמות" }).first().locator("td:nth-child(4)").textContent(), "315");
      assert.match(await letterReader.locator(".ahavat29-spatial-canvas").getByRole("img").getAttribute("aria-label"), /האות בית/);
      await letterSearch.fill("שט״ו");
      assert.equal(await letterReader.locator("tbody tr").count(), 1);
      await letterSearch.fill("");
      await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "כל התורה", exact: true }));
      assert.equal(await letterReader.locator("tbody tr").count(), 54);
      assert.match(await letterReader.locator(".ahavat29-ds01-guide").last().textContent(), /16,345/);
      await click(letterReader.getByRole("button", { name: "גימל", exact: true }));
      assert.equal(await letterReader.locator("tbody tr").count(), 54);
      assert.match(await letterReader.locator(".ahavat29-ds01-guide").last().textContent(), /2,109/);
      assert.match(await letterReader.locator(".ahavat29-spatial-canvas").getByRole("img").getAttribute("aria-label"), /האות גימל/);
      const sourceDetails = letterReader.locator("details");
      assert.equal(await sourceDetails.getAttribute("open"), null);
      await click(sourceDetails.locator("summary"));
      assert.match(await sourceDetails.textContent(), /פער קריאה: -10/);
      assert.match(await sourceDetails.textContent(), /פער קריאה: -9/);
      assert.match(await sourceDetails.textContent(), /הטור השמאלי/);
      await click(sourceDetails.locator("summary"));
      await letterSearch.fill("ויקהל");
      assert.equal(await letterReader.locator("tbody tr").count(), 1);
      assert.equal(await letterReader.locator("tbody tr td:nth-child(4)").textContent(), "26");
      await letterSearch.fill("");
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=35&view=FitH$/);
      const downloadPromise = page.waitForEvent("download");
      await click(letterReader.getByRole("button", { name: "הורד טבלה למחקר · 54 שורות", exact: true }));
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), "ahavat-torah-ג-all.csv");
      const csvStream = await download.createReadStream();
      const csvChunks = [];
      for await (const chunk of csvStream) csvChunks.push(chunk);
      const csv = Buffer.concat(csvChunks).toString("utf8");
      assert.equal(csv.trimEnd().split("\r\n").length, 55);
      assert.match(csv, /"ג","ויקהל","שמות","כ״ו","26","35"/);
      assert.match(csv, /"1332","387","377","-10"/);
      await click(letterReader.getByRole("button", { name: "דלת", exact: true }));
      assert.equal(await letterReader.locator("tbody tr").count(), 54);
      assert.match(await letterReader.locator(".ahavat29-ds01-guide").last().textContent(), /7,036/);
      assert.match(await letterReader.locator(".ahavat29-spatial-canvas").getByRole("img").getAttribute("aria-label"), /האות דלת/);
      await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "ויקרא", exact: true }));
      assert.equal(await letterReader.locator("tbody tr").count(), 10);
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=36&view=FitH$/);
      for (const pdfPage of [35, 36]) assert.equal(await letterReader.getByRole("button", { name: `המקור המלא · PDF ${pdfPage}`, exact: true }).count(), 1);
      await click(letterReader.locator("tbody tr").filter({ has: page.getByRole("cell", { name: "ויקרא", exact: true }) }).getByRole("button", { name: "PDF 35", exact: true }));
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=35&view=FitH$/);
      await click(letterReader.locator(".ahavat29-letter-bars").getByRole("button", { name: "צו 109", exact: true }));
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=36&view=FitH$/);
      const daletDownloadPromise = page.waitForEvent("download");
      await click(letterReader.getByRole("button", { name: "הורד טבלה למחקר · 10 שורות", exact: true }));
      const daletDownload = await daletDownloadPromise;
      assert.equal(daletDownload.suggestedFilename(), "ahavat-torah-ד-vayikra.csv");
      const daletChunks = [];
      for await (const chunk of await daletDownload.createReadStream()) daletChunks.push(chunk);
      const daletCsv = Buffer.concat(daletChunks).toString("utf8");
      assert.equal(daletCsv.trimEnd().split("\r\n").length, 11);
      assert.match(daletCsv, /"ד","ויקרא","ויקרא","קי״ב","112","35"/);
      assert.match(daletCsv, /"ד","צו","ויקרא","ק״ט","109","36"/);
      assert.match(daletCsv, /#page=35&view=FitH/);
      assert.match(daletCsv, /#page=36&view=FitH/);
      if (width === 1440) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await letterReader.locator("tbody tr").first().waitFor();
        assert.equal(await letterReader.getByRole("button", { name: "דלת", exact: true }).getAttribute("aria-pressed"), "true");
        assert.equal(await letterReader.locator("tbody tr").count(), 10);
        assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=36&view=FitH$/);
        await click(letterReader.getByRole("button", { name: "פתח מבנה האות בתלת־ממד", exact: true }));
        await letterReader.locator("canvas").waitFor();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `split-page letter reader overflows at ${width}px`);
      for (const [name, total, ammor] of [["הא", "28,055", "575"], ["וו", "30,516", "605"]]) {
        await click(letterReader.getByRole("button", { name, exact: true }));
        assert.equal(await letterReader.locator("tbody tr").count(), 10);
        assert.equal(await letterReader.locator("tbody tr").filter({ has: page.getByRole("cell", { name: "אמור", exact: true }) }).locator("td:nth-child(4)").textContent(), ammor);
        assert.match(await letterReader.locator(".ahavat29-ds01-guide").last().textContent(), new RegExp(total));
        assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=36&view=FitH$/);
      }
      await click(letterReader.getByRole("button", { name: "חית", exact: true }));
      assert.match(await letterReader.locator(".ahavat29-ds01-guide").last().textContent(), /7,189/);
      await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "במדבר", exact: true }));
      assert.equal(await letterReader.locator("tbody tr").count(), 10);
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=37&view=FitH$/);
      await click(letterReader.locator("tbody tr").first().getByRole("button", { name: "PDF 36", exact: true }));
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=36&view=FitH$/);
      await click(letterReader.locator(".ahavat29-letter-bars").getByRole("button", { name: "מסעי 173", exact: true }));
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=37&view=FitH$/);
      assert.match(await letterReader.locator(".ahavat29-spatial-canvas").getByRole("img").getAttribute("aria-label"), /האות חית/);
      await click(letterReader.getByRole("button", { name: "טית", exact: true }));
      await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "ויקרא", exact: true }));
      assert.equal(await letterReader.locator("tbody tr").filter({ has: page.getByRole("cell", { name: "תזריע", exact: true }) }).locator("td:nth-child(4)").textContent(), "56");
      const tetDownloadPromise = page.waitForEvent("download");
      await click(letterReader.getByRole("button", { name: "הורד טבלה למחקר · 10 שורות", exact: true }));
      const tetDownload = await tetDownloadPromise;
      const tetChunks = [];
      for await (const chunk of await tetDownload.createReadStream()) tetChunks.push(chunk);
      assert.match(Buffer.concat(tetChunks).toString("utf8"), /"1148","492","491","-1"/);
      await click(letterReader.getByRole("button", { name: "כף", exact: true }));
      assert.match(await letterReader.locator(".ahavat29-ds01-guide").last().textContent(), /8,612/);
      assert.equal(await letterReader.locator("tbody tr").filter({ has: page.getByRole("cell", { name: "אחרי מות", exact: true }) }).locator("td:nth-child(4)").textContent(), "146");
      assert.match(await letterReader.locator(".ahavat29-spatial-canvas").getByRole("img").getAttribute("aria-label"), /האות כף/);
      await click(letterReader.getByRole("button", { name: "למד", exact: true }));
      assert.match(await letterReader.locator(".ahavat29-ds01-guide").last().textContent(), /21,570/);
      assert.equal(await letterReader.locator("tbody tr").count(), 10);
      await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "בראשית", exact: true }));
      assert.equal(await letterReader.locator("tbody tr").count(), 12);
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=38&view=FitH$/);
      for (const pdfPage of [37, 38]) assert.equal(await letterReader.getByRole("button", { name: `המקור המלא · PDF ${pdfPage}`, exact: true }).count(), 1);
      await click(letterReader.locator(".ahavat29-letter-bars").getByRole("button", { name: "ויצא 609", exact: true }));
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=37&view=FitH$/);
      await click(letterReader.locator("tbody tr").filter({ has: page.getByRole("cell", { name: "וישלח", exact: true }) }).getByRole("button", { name: "PDF 38", exact: true }));
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=38&view=FitH$/);
      assert.match(await letterReader.locator(".ahavat29-spatial-canvas").getByRole("img").getAttribute("aria-label"), /האות למד/);
      await click(letterReader.locator("details summary"));
      assert.match(await letterReader.locator("details").textContent(), /פער קריאה: -1/);
      await click(letterReader.locator("details summary"));
      await click(letterReader.getByRole("button", { name: "מם", exact: true }));
      assert.match(await letterReader.locator(".ahavat29-ds01-guide").last().textContent(), /14,465/);
      assert.equal(await letterReader.locator("tbody tr").filter({ has: page.getByRole("cell", { name: "וישב", exact: true }) }).locator("td:nth-child(4)").textContent(), "271");
      assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=38&view=FitH$/);
      assert.match(await letterReader.locator(".ahavat29-spatial-canvas").getByRole("img").getAttribute("aria-label"), /האות מם/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Lamed/Mem reader overflows at ${width}px`);
      console.info(`Ahavat Torah browser: preceding source/3D/CSV flows passed at ${width}px`);
      await click(letterReader.getByRole("button", { name: "יוד", exact: true }));
      await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "כל התורה", exact: true }));
      assert.equal(await letterReader.locator(".ahavat29-letter-bars button").count(), 3, "unknown checkpoint contributions are not plotted");
      assert.equal(await letterReader.locator(".ahavat29-letter-checkpoints button").filter({ hasText: "—" }).count(), 2);
      await click(letterReader.getByRole("button", { name: "תו", exact: true }));
      assert.equal(await letterReader.locator("tbody tr").count(), 54);
      assert.equal(await letterReader.locator(".ahavat29-letter-bars button").count(), 4);
      assert.doesNotMatch(await letterReader.textContent(), /null|undefined|NaN/);
      await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "בראשית", exact: true }));
      if (width === 1440) {
        await click(letterReader.getByRole("button", { name: "סגור מבנה האות בתלת־ממד", exact: true }));
        await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "כל התורה", exact: true }));
        for (const name of ["אלף", "בית", "גימל", "דלת", "הא", "וו", "זין", "חית", "טית", "יוד", "כף", "כף סופית", "למד", "מם", "מם סופית", "נון", "נון סופית", "סמך", "עין", "פא", "פא סופית", "צדי", "צדי סופית", "קוף", "ריש", "שין", "שין שמאלית", "תו"]) {
          await click(letterReader.getByRole("button", { name, exact: true }));
          assert.equal(await letterReader.locator("tbody tr").count(), 54, name);
        }
        await click(letterReader.locator(".ahavat29-letter-books").getByRole("button", { name: "בראשית", exact: true }));
      }
      const fullReader = page.locator(".ahavat29-depth");
      for (const pdfPage of [26, 42, 45, 99]) {
        await click(fullReader.locator(".ahavat29-page-atlas").getByRole("button", { name: String(pdfPage), exact: true }));
        assert.equal(await fullReader.locator(".ahavat29-ai-guide>p").first().textContent(), companionPages[pdfPage - 1].companion_explanation);
        await click(fullReader.getByRole("button", { name: `פתח מקור ההסבר · PDF ${pdfPage}`, exact: true }));
        assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), new RegExp(`#page=${pdfPage}&view=FitH$`));
        if (pdfPage === 45) assert.match(await fullReader.locator(".ahavat29-machine-text").textContent(), /לא חולץ טקסט/);
      }
      if (process.env.BOOKS_SCREENSHOT_DIR) await letterReader.screenshot({ path: `${process.env.BOOKS_SCREENSHOT_DIR}/ahavat-letter-reader-${width}.png` });
      const finalKaf = letterReader.getByRole("button", { name: "כף סופית", exact: true });
      await finalKaf.focus();
      await finalKaf.press("Enter");
      assert.equal(await letterReader.locator("tbody tr").count(), 12, "final Kaf has its own Bereshit rows, not ordinary Kaf");
      assert.match(await letterReader.locator(".ahavat29-ds01-guide").last().textContent(), /3,358/);
      assert.equal(await letterReader.locator("tbody tr").first().locator("td:nth-child(4)").textContent(), "67");
      if (width === 1440) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.locator(".ahavat29-letter-alphabet").waitFor();
        assert.equal(await page.locator(".ahavat29-letter-alphabet").getByRole("button", { name: "כף סופית", exact: true }).getAttribute("aria-pressed"), "true");
        assert.match(await page.locator("#ahavat29-source iframe").getAttribute("src"), /#page=37&view=FitH$/);
      }
      assert.deepEqual(errors, []);
      console.info(`Ahavat Torah browser: completed ${width}px`);
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
    delete process.env.VITE_BOOK_PUBLICATION_REVIEW_PREVIEW;
  }
});
