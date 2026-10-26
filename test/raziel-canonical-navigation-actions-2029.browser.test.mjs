// RAZIEL_CANONICAL_NAVIGATION_ACTIONS_V1 — built 2029 app in Chromium (320px and 1440px).
// All external traffic is intercepted. Counts ai-analyze requests: a navigation turn must make none,
// an ordinary question exactly one. Requires `SOD_BUILD_TARGET=2029 vite build` output in dist/.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const req = createRequire(import.meta.url);
let pw = null;
try { pw = req("playwright"); } catch { /* optional local browser tooling */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  || (pw && existsSync(pw.chromium.executablePath()) ? pw.chromium.executablePath() : null);
const canRun = Boolean(pw && executablePath && existsSync(join(dist, "2029.html")));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const SUPABASE_HOST = "linswmnnkjxvweumprav.supabase.co";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
const QUESTIONS = {
  explicit: "תן לי את דף המספר 73",
  open337: "פתח את המספר 337 באתר",
  link73: "לינק לדף המספר 73",
  contextLink: "תן לי לינק לדף המספר באתר",
  contextOpen: "פתח לי את דף המספר",
  map: "פתח את מפת המחקר",
  expressions: "קח אותי לביטויים של המספר הזה",
};

function serve() {
  const html = readFileSync(join(dist, "2029.html"));
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname));
    const file = join(dist, path);
    if (file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) {
      response.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
      return response.end(readFileSync(file));
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end(html);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function wire(page, counters) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.hostname === "127.0.0.1") return route.continue();
    if (url.hostname !== SUPABASE_HOST) return route.abort();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname.endsWith("/functions/v1/ai-analyze")) {
      counters.ai += 1;
      return route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify({ analysis: "תשובה רגילה מרזיאל.", intelligence_level: "fast" }) });
    }
    if (request.method() !== "GET" && request.method() !== "HEAD") return route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: "{}" });
    if (url.pathname.endsWith("/rest/v1/site_flags")) {
      const keys = ["lock_world", "lock_heichal", "lock_raziel_site", "lock_life_journey", "lock_books", "lock_number"];
      return route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(keys.map((key) => ({ key, enabled: false, message: "", mode: "all" }))) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: "[]" });
  });
}

async function openChat(page, width) {
  if (await page.locator(".sod29-frame-backdrop").count()) await page.keyboard.press("Escape");
  await page.locator(".sod29-command-island .sod29-raziel-orb").click();
  const chat = width >= 1000
    ? page.locator('[data-raziel-companion-view="open"] [data-raziel-native-chat="true"]')
    : page.locator('.sod29-frame-panel [data-raziel-native-chat="true"]');
  await chat.waitFor();
  return chat;
}

async function ask(chat, text) {
  await chat.getByRole("textbox", { name: "שאלה לרזיאל", exact: true }).fill(text);
  await chat.getByRole("button", { name: "שלח", exact: true }).click();
}

test("built 2029 app: navigation turns are deterministic buttons with zero model calls (320px / 1440px)", { skip: !canRun && "needs Playwright, Chromium and dist/2029.html" }, async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const errors = [];
  try {
    for (const width of [320, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(String(error)));
      const counters = { ai: 0 };
      await wire(page, counters);
      await page.goto(`${base}/2029`);
      await page.locator(".sod29-root").waitFor();
      let chat = await openChat(page, width);
      const buttons = () => chat.locator("[data-raziel-navigation-action]");

      // 1. missing number, no verified context: the exact short question and no button
      await ask(chat, QUESTIONS.contextOpen);
      await chat.getByText("לאיזה מספר תרצה שאפתח דף?").last().waitFor();
      assert.equal(await buttons().count(), 0);
      assert.equal(counters.ai, 0, "clarification makes no model call");

      // 2. the bare numeral answers the question: a page button, still no model call
      await ask(chat, "73");
      await buttons().last().waitFor();
      assert.equal(await buttons().last().getAttribute("href"), "/2029/number/73");
      assert.equal((await buttons().last().textContent()).trim(), "פתח את דף המספר 73");
      assert.equal(counters.ai, 0, "numeral follow-up makes no model call");

      // 3. context continuation: the page just opened is the focus
      await ask(chat, QUESTIONS.contextLink);
      await chat.locator('[data-raziel-navigation-action="number_page"][href="/2029/number/73"]').nth(1).waitFor();

      // 4. explicit wording variants
      for (const [question, href, intent] of [
        [QUESTIONS.explicit, "/2029/number/73", "number_page"],
        [QUESTIONS.open337, "/2029/number/337", "number_page"],
        [QUESTIONS.link73, "/2029/number/73", "number_page"],
        [QUESTIONS.expressions, "/2029/number/73", "number_expressions"],
        [QUESTIONS.map, "/2029/number/73", "research_map"],
      ]) {
        const before = await buttons().count();
        await ask(chat, question);
        await page.waitForFunction(({ n }) => document.querySelectorAll("[data-raziel-navigation-action]").length > n, { n: before });
        const last = buttons().last();
        assert.equal(await last.getAttribute("href"), href, question);
        assert.equal(await last.getAttribute("data-raziel-navigation-action"), intent, question);
      }
      assert.equal(counters.ai, 0, "every navigation wording is answered without a model call");
      assert.equal(await chat.locator("[data-raziel-oneshot]").count(), 0, "no research one-shots under a navigation answer");

      // 5. the buttons never overflow, even at 320px
      const overflow = await page.evaluate(() => {
        const wide = [...document.querySelectorAll("[data-raziel-navigation-action]")]
          .filter((node) => node.getBoundingClientRect().right > innerWidth + 0.5 || node.scrollWidth > node.clientWidth + 1);
        return { page: document.documentElement.scrollWidth > innerWidth, buttons: wide.length };
      });
      assert.deepEqual(overflow, { page: false, buttons: 0 }, `no horizontal overflow at ${width}px`);

      // 6. an ordinary question still reaches the model exactly once
      await ask(chat, "מה אפשר ללמוד מהמספר 1820?");
      await chat.getByText("תשובה רגילה מרזיאל.").waitFor();
      assert.equal(counters.ai, 1);

      // 7. the button navigates inside the app to the canonical page and closes the sheet
      await chat.locator('[data-raziel-navigation-action="number_page"]').first().click();
      await page.waitForURL(`${base}/2029/number/73`);
      assert.equal(new URL(page.url()).pathname, "/2029/number/73");
      assert.equal(counters.ai, 1, "navigating does not call the model");
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  assert.deepEqual(errors, []);
});
