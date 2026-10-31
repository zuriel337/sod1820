// Full built Post + shared Research/Raziel providers. Only external I/O is synthetic.
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url)), dist = join(root, "dist");
const require = createRequire(import.meta.url);
let pw; try { pw = require("playwright"); } catch {}
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const canRun = pw && existsSync(executablePath) && existsSync(join(dist, "2029.html"));
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const seed = (over = {}) => ({ id: 990005, slug: "final-dim5-source", title: "מקור בדיקה של מימד חמש",
  author: "בדרך לנצח", categories: ["מימד חמש"], tags: [], date: "2026-10-30T10:00:00Z",
  modified: "2026-10-31T08:00:00Z", image_url: null, thumb_url: null,
  content: "<h2>תוכן לקריאה</h2><p>זהו מקור סינתטי לבדיקת החיבור בלבד.</p>", ...over });

function serve() {
  const html = readFileSync(join(dist, "2029.html"));
  const server = createServer((request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname));
    const file = join(dist, path);
    if (file.startsWith(dist + "/") && existsSync(file) && statSync(file).isFile()) {
      response.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
      return response.end(readFileSync(file));
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function wire(page, row, counters) {
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === "127.0.0.1") return route.continue();
    if (url.hostname !== "linswmnnkjxvweumprav.supabase.co") return route.abort();
    const reply = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(data) });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname.endsWith("/functions/v1/ai-analyze")) {
      counters.ai.push(request.postDataJSON());
      return reply({ analysis: "תשובה סינתטית לבדיקת חיבור הפוסט.", intelligence_level: "fast" });
    }
    if (/\/rpc\/(?:watch_toggle|dispatch_notifications)$/.test(url.pathname)) {
      counters.forbidden.push(url.pathname);
      return reply({ error: "unexpected mutation" }, 403);
    }
    if (request.method() !== "GET" && request.method() !== "HEAD") return reply({});
    if (url.pathname.endsWith("/rest/v1/site_flags")) return reply(
      ["lock_world", "lock_heichal", "lock_raziel_site", "lock_life_journey", "lock_books", "lock_number"]
        .map(key => ({ key, enabled: false, message: "", mode: "all" })));
    if (url.pathname.endsWith("/rest/v1/posts")) return reply(row ? [row] : []);
    return reply([]);
  });
}

test("actual built Post sends source roles through shared Raziel once, returns exactly and refuses suppressed source", {
  skip: !canRun && "needs Playwright, Chromium and dist/2029.html", timeout: 120000,
}, async () => {
  const server = await serve(), base = `http://127.0.0.1:${server.address().port}`;
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const errors = [], artifacts = process.env.POST_RAZIEL_FINAL_ARTIFACT_DIR || "/workspace/shared/downloads/posts-raziel-final-20261031";
  mkdirSync(artifacts, { recursive: true });
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: "reduce" });
      const page = await context.newPage(), counters = { ai: [], forbidden: [] };
      page.on("pageerror", error => errors.push(String(error)));
      await wire(page, seed(), counters);
      await page.goto(`${base}/post/final-dim5-source`);
      const open = page.getByRole("button", { name: "להבין את השיוך למימד חמש עם רזיאל", exact: true, includeHidden: true });
      await open.waitFor({ state: "attached" });
      await page.locator("#post-classification").evaluate(node => { for (let p = node.parentElement; p; p = p.parentElement) if (p.tagName === "DETAILS") p.open = true; });
      await open.click();
      // Post's explicit open action may use the shared sheet even on desktop.
      // Assert one visible projection of the real chat, without guessing its chrome.
      const chat = page.locator('[data-raziel-native-chat="true"]:visible');
      await chat.waitFor();
      assert.equal(await chat.count(), 1);
      assert.equal(counters.ai.length, 0, "opening hierarchy never submits a model request");
      for (const question of ["מה ההבדל בין מימד חמש לאור הגאולה?", "מה ההבדל בין סדרה 5 לערוץ הקהילה?"]) {
        const before = counters.ai.length;
        await chat.getByRole("textbox", { name: "שאלה לרזיאל", exact: true }).fill(question);
        await chat.getByRole("button", { name: "שלח", exact: true }).click();
        await chat.getByText("תשובה סינתטית לבדיקת חיבור הפוסט.", { exact: true }).nth(before).waitFor();
        assert.equal(counters.ai.length, before + 1);
        const request = counters.ai.at(-1);
        assert.equal(request.subject, question);
        assert.equal(request.conversation_resolution ?? null, null);
        assert.equal(request.research_contract, "public-number-research-run-v1");
        assert.equal(request.surface_semantic.subject.type, "post");
        assert.match(request.surface_semantic.reading.primary, /מימד חמש: סדרת תוכן/u);
        assert.equal(request.surface_semantic.context.navigation.sourceRef, "posts:990005");
        assert.equal(request.surface_semantic.context.navigation.returnTo.href, "/post/final-dim5-source#post-classification");
      }
      assert.deepEqual(counters.forbidden, []);
      await page.screenshot({ path: join(artifacts, `post-raziel-${width}.png`) });
      // The canonical return address is usable after reload, including opening the closed section.
      await page.goto(base + counters.ai.at(-1).surface_semantic.context.navigation.returnTo.href);
      await page.waitForFunction(() => document.activeElement?.id === "post-classification");
      assert.equal(new URL(page.url()).hash, "#post-classification");
      assert.equal(counters.ai.length, 2, "returning never submits another question");
      await context.close();
    }
    for (const row of [null, seed({ tags: ["טיוטה"] }), seed({ tags: ["פורום"] })]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 960 } });
      const page = await context.newPage(), counters = { ai: [], forbidden: [] };
      page.on("pageerror", error => errors.push(String(error)));
      await wire(page, row, counters);
      await page.goto(`${base}/post/final-dim5-source`);
      await page.getByRole("alert").filter({ hasText: "לא הצלחתי לפתוח את הפוסט" }).waitFor();
      assert.equal(await page.locator("#post-classification").count(), 0);
      assert.deepEqual(counters, { ai: [], forbidden: [] });
      await context.close();
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    server.close();
  }
});
