// Hosted/local acceptance for the personal-navigation integration Preview.
// The built app and its real mock-only service worker are exercised together;
// every off-origin request that escapes the worker is blocked by the browser.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "preview-deploy", "dist");
const expectedBranch = process.env.RAZIEL_NAV_EXPECTED_BRANCH?.trim() || "gpt/2029-central-raziel-personal-navigation-integration-20261026";
const hostedOriginValue = process.env.RAZIEL_NAV_PREVIEW_ORIGIN?.trim() || "";
const expectedSha = (process.env.RAZIEL_NAV_EXPECTED_SHA?.trim()
  || (!hostedOriginValue
    ? execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim()
    : ""));

const require = createRequire(import.meta.url);
const playwright = require("playwright");
const chromiumPath = "/usr/bin/chromium";
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function redact(value, protectedUrl = "") {
  let text = String(value ?? "");
  if (protectedUrl) text = text.split(protectedUrl).join("[protected access]");
  return text
    .replace(/(_vercel_share=)[^&\s"'<>]+/giu, "$1[redacted]")
    .replace(/(authorization|cookie|set-cookie):[^\r\n]*/giu, "$1: [redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/gu, "[redacted token]");
}

function readProtectedAccess(origin) {
  if (process.env.RAZIEL_NAV_ACCESS_STDIN !== "true") return "";
  const raw = readFileSync(0, "utf8").trim();
  assert.ok(raw, "protected Preview access URL was not provided on stdin");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("protected Preview access URL from stdin is invalid");
  }
  assert.equal(parsed.protocol, "https:", "protected Preview access must use HTTPS");
  assert.equal(parsed.origin, origin, "protected Preview access must use the exact Preview origin");
  return parsed.href;
}

function validateHostedOrigin(value) {
  if (!value) return "";
  const parsed = new URL(value);
  assert.equal(parsed.protocol, "https:", "hosted Preview origin must use HTTPS");
  assert.equal(parsed.username, "");
  assert.equal(parsed.password, "");
  assert.equal(parsed.pathname, "/", "RAZIEL_NAV_PREVIEW_ORIGIN must be an origin, not a route");
  assert.equal(parsed.search, "");
  assert.equal(parsed.hash, "");
  assert.match(expectedSha, /^[0-9a-f]{40}$/u, "hosted acceptance requires RAZIEL_NAV_EXPECTED_SHA");
  return parsed.origin;
}

function startStaticServer() {
  assert.ok(existsSync(join(dist, "2029.html")), "build preview-deploy/dist before browser acceptance");
  const html = readFileSync(join(dist, "2029.html"));
  const server = createServer((request, response) => {
    const pathname = normalize(decodeURIComponent(new URL(request.url, "http://preview.local").pathname));
    const candidate = join(dist, pathname);
    if (candidate.startsWith(`${dist}/`) && existsSync(candidate) && statSync(candidate).isFile()) {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": mime[extname(candidate)] || "application/octet-stream",
      });
      response.end(readFileSync(candidate));
      return;
    }
    response.writeHead(200, { "cache-control": "no-store", "content-type": mime[".html"] });
    response.end(html);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
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

test("mock-only Preview: personal navigation is deterministic and never reaches a live model or DB", async () => {
  assert.ok(existsSync(chromiumPath), "Chromium is required at /usr/bin/chromium");
  assert.match(expectedSha, /^[0-9a-f]{40}$/u, "expected Preview SHA must be exact");

  const hostedOrigin = validateHostedOrigin(hostedOriginValue);
  const server = hostedOrigin ? null : await startStaticServer();
  const origin = hostedOrigin || `http://127.0.0.1:${server.address().port}`;
  const protectedAccess = readProtectedAccess(origin);
  const browser = await playwright.chromium.launch({
    executablePath: chromiumPath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const pageErrors = [];

  try {
    for (const width of [320, 1440]) {
      const counters = { blockedOffOrigin: 0, escapedModel: 0 };
      const context = await browser.newContext({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      await context.addInitScript(() => {
        window.__razielNavigationFixtureCalls = [];
        const nativeFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
          const input = args[0];
          const url = new URL(typeof input === "string" ? input : input.url, location.origin);
          const response = await nativeFetch(...args);
          if (url.pathname === "/functions/v1/ai-analyze") {
            window.__razielNavigationFixtureCalls.push({
              status: response.status,
              transport: response.headers.get("X-Raziel-Preview-Transport"),
            });
          }
          return response;
        };
      });
      await context.route("**/*", async (route) => {
        const requestUrl = new URL(route.request().url());
        if (requestUrl.origin === origin) return route.continue();
        counters.blockedOffOrigin += 1;
        if (requestUrl.pathname.endsWith("/functions/v1/ai-analyze")
          || requestUrl.pathname.endsWith("/functions/v1/research-run")) counters.escapedModel += 1;
        return route.abort("blockedbyclient");
      });

      const page = await context.newPage();
      page.on("pageerror", (error) => pageErrors.push(redact(error, protectedAccess)));
      try {
        if (protectedAccess) {
          await page.goto(protectedAccess, { waitUntil: "domcontentloaded" });
          if (new URL(page.url()).pathname !== "/2029") await page.goto(`${origin}/2029`);
        } else await page.goto(`${origin}/2029`);

        await page.locator(".sod29-root").waitFor();
        await page.locator('[data-raziel-preview-transport="mock-only"]').waitFor();
        await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
        const receipt = await page.evaluate(async () => {
          const response = await fetch("/preview-identity.json", { cache: "no-store" });
          return response.json();
        });
        assert.deepEqual(receipt, {
          sha: expectedSha,
          branch: expectedBranch,
          transport: "mock-only",
          product_writes: false,
          edge_deploy: false,
        });
        assert.equal(await page.evaluate(() => window.__razielNavigationFixtureCalls.length), 0);

        let chat = await openChat(page, width);
        assert.equal(await page.evaluate(() => window.__razielNavigationFixtureCalls.length), 0, "opening Raziel is deterministic");

        // Missing number -> exact clarification -> bare numeral answer.
        await ask(chat, "פתח לי את דף המספר");
        await chat.getByText("לאיזה מספר תרצה שאפתח דף?").last().waitFor();
        assert.equal(await page.evaluate(() => window.__razielNavigationFixtureCalls.length), 0);
        await ask(chat, "73");
        const numberAfterClarification = chat.locator('[data-raziel-navigation-action="number_page"][href="/2029/number/73"]').last();
        await numberAfterClarification.waitFor();

        // Explicit number, verified-number research map, and World are all local turns.
        await ask(chat, "תן לי את דף המספר 73");
        const explicitNumber = chat.locator('[data-raziel-navigation-action="number_page"][href="/2029/number/73"]').last();
        await explicitNumber.waitFor();
        await ask(chat, "פתח את מפת המחקר");
        await chat.locator('[data-raziel-navigation-action="research_map"][href="/2029/number/73"]').last().waitFor();
        await ask(chat, "פתח את העולם");
        const world = chat.locator('[data-raziel-navigation-action="world"][href="/world"]').last();
        await world.waitFor();
        assert.equal(await page.evaluate(() => window.__razielNavigationFixtureCalls.length), 0);
        assert.equal(counters.escapedModel, 0);

        const overflow = await page.evaluate(() => ({
          page: document.documentElement.scrollWidth > innerWidth,
          buttons: [...document.querySelectorAll("[data-raziel-navigation-action]")]
            .filter((node) => node.getBoundingClientRect().right > innerWidth + 0.5
              || node.getBoundingClientRect().left < -0.5
              || node.scrollWidth > node.clientWidth + 1).length,
        }));
        assert.deepEqual(overflow, { page: false, buttons: 0 }, `no navigation overflow at ${width}px`);

        // An ordinary question receives one response from the service-worker fixture.
        const answersBefore = await chat.locator(".sod29-raziel-chat-raziel").count();
        await ask(chat, "מה זה משיח?");
        await page.waitForFunction(() => window.__razielNavigationFixtureCalls.length === 1);
        await chat.locator(".sod29-raziel-chat-raziel").nth(answersBefore).waitFor();
        assert.deepEqual(await page.evaluate(() => window.__razielNavigationFixtureCalls), [{
          status: 200,
          transport: "mock-only",
        }]);
        assert.equal(counters.escapedModel, 0, "ordinary question must stay inside the mock-only worker");

        // Real router clicks preserve the document and never add an AI request.
        await explicitNumber.click();
        await page.waitForURL(`${origin}/2029/number/73`);
        await page.locator(".sod29-root.surface-number").waitFor();
        assert.equal(await page.evaluate(() => window.__razielNavigationFixtureCalls.length), 1);
        chat = await openChat(page, width);
        const worldAfterNumber = chat.locator('[data-raziel-navigation-action="world"][href="/world"]').last();
        await worldAfterNumber.waitFor();
        await worldAfterNumber.click();
        await page.waitForURL(`${origin}/world`);
        await page.locator(".sod29-root.surface-world").waitFor();
        assert.equal(await page.evaluate(() => window.__razielNavigationFixtureCalls.length), 1);
        assert.equal(counters.escapedModel, 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      } catch (error) {
        throw new Error(redact(error?.stack || error, protectedAccess));
      } finally {
        await context.close();
      }
    }
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
});
