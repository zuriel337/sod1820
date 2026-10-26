import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright;
let vite;
let reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional local browser tooling. */ }

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH
  || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : playwright?.chromium.executablePath());
const available = Boolean(playwright && vite && reactPlugin && executablePath && existsSync(executablePath));

const RETURN_HREF = "/beit-midrash?section=guided&kind=crossing&finding=f-public#finding-f-public";
const PUBLIC_STATEMENT = "ממצא ציבורי מדויק משולב";
const PRIVATE_MARKERS = ["PRIVATE_WORLD_MARKER", "CANDIDATE_WORLD_MARKER", "LOCKED_WRITER_MARKER", "BUILDING_WRITER_MARKER"];

const publicFinding = Object.freeze({
  id: "f-public",
  created_at: "2026-10-23T10:00:00.000Z",
  kind: "observation",
  statement: PUBLIC_STATEMENT,
  terms: ["1820"],
  value: 1820,
  source: "wa_channel",
  source_ref: "channel_updates:source-1#a2",
  contributor: "צבי",
  confidence: 88,
  engine_verified: true,
  engine_detail: { method: "standard" },
  evidence: { kind: "source_bound" },
  status: "approved",
  privacy_scope: "public",
  promoted_node_id: null,
  parent_id: null,
  meta: { ext: { wa_channel_intake: { tree_matches: [] } } },
});

const forbiddenFindings = Object.freeze({
  "f-candidate": { ...publicFinding, id: "f-candidate", statement: "CANDIDATE_WORLD_MARKER", status: "candidate" },
  "f-private": { ...publicFinding, id: "f-private", statement: "PRIVATE_WORLD_MARKER", privacy_scope: "private" },
});

const peopleRows = Object.freeze([
  ...Array.from({ length: 27 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    slug: `writer-${String(index + 1).padStart(2, "0")}`,
    code: String(200 + index),
    display_name: `כותב ציבורי ${String(index + 1).padStart(2, "0")}`,
    avatar_url: null,
    role: "חוקר וכותב",
    active: true,
    locked: false,
    building: false,
    trusted: index % 2 === 0,
    created_at: `2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    updated_at: `2026-09-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    public_visibility: "public",
    public_avatar: null,
  })),
  {
    id: "10000000-0000-4000-8000-000000000001", slug: "private-writer", display_name: "PRIVATE_WORLD_MARKER",
    active: true, locked: false, building: false, public_visibility: "private",
  },
  {
    id: "10000000-0000-4000-8000-000000000002", slug: "locked-writer", display_name: "LOCKED_WRITER_MARKER",
    active: true, locked: true, building: false, public_visibility: "public",
  },
  {
    id: "10000000-0000-4000-8000-000000000003", slug: "building-writer", display_name: "BUILDING_WRITER_MARKER",
    active: true, locked: false, building: true, public_visibility: "public",
  },
]);

function fixturePlugin() {
  const modules = new Map([
    ["virtual:central-world-auth.jsx", `
      export const useAuth=()=>({
        isAdmin:new URLSearchParams(window.location.search).get("principal")==="admin",
        loading:false,
        user:new URLSearchParams(window.location.search).get("principal")==="admin"?{id:"fixture-admin"}:null,
      });
    `],
    ["virtual:central-world-research.jsx", `
      export const useResearch=()=>({
        context:window.__researchContext,
        updateResearchContext:(update)=>{window.__researchUpdates.push(update);},
        setResearchContext:(update)=>{window.__researchUpdates.push(update);},
      });
    `],
    ["virtual:central-world-shell.jsx", `
      import React from "react";
      const move=(href)=>{history.pushState({},"",href);window.dispatchEvent(new PopStateEvent("popstate"));};
      export function FrameState({kind,title,children,action}){
        return React.createElement("section",{"data-frame-state":kind},React.createElement("h3",null,title),children,action);
      }
      export const use2029Shell=()=>({
        openCommand:()=>{window.__commandOpened=true;},
        openInspect:(value)=>{window.__inspected=value;},
        go:(href)=>move(href),
        returnExact:()=>{const href=window.__researchContext?.returnTo?.href;window.__returnExactHref=href;if(href)move(href);},
      });
      export default function Shell({children,title}){
        return React.createElement("div",{className:"sod29-root surface-world","data-fixture-shell":title},children);
      }
    `],
    ["virtual:central-world-entry.jsx", `
      import React from "react";
      import {createRoot} from "react-dom/client";
      import {BrowserRouter} from "react-router-dom";
      import {setThemePreset} from "/src/lib/themeMode.js";
      import World2029Page from "/src/pages/World2029Page.jsx";
      import "/src/components/experience2029/sod2029.css";
      setThemePreset("parchment");
      window.__researchUpdates=[];
      window.__researchContext={
        lens:"beit-midrash",
        returnTo:{href:${JSON.stringify(RETURN_HREF)},label:"בית המדרש"},
      };
      createRoot(document.getElementById("root")).render(
        React.createElement(BrowserRouter,null,React.createElement(World2029Page))
      );
    `],
  ]);
  const aliases = new Map([
    ["AuthContext.jsx", "virtual:central-world-auth.jsx"],
    ["ResearchProvider.jsx", "virtual:central-world-research.jsx"],
    ["Sod2029Shell.jsx", "virtual:central-world-shell.jsx"],
  ]);
  return {
    name: "central-world-focused-acceptance",
    enforce: "pre",
    resolveId(source) {
      if (source === "/__central-world-entry.jsx") return "\0virtual:central-world-entry.jsx";
      for (const [suffix, id] of aliases) if (source.endsWith(suffix)) return `\0${id}`;
      return null;
    },
    load(id) {
      return modules.get(id.replace(/^\0/, "")) ?? null;
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith("/world") && !request.url?.startsWith("/beit-midrash")) return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        const html = `<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>World acceptance</title></head><body><div id="root"></div><script type="module" src="/__central-world-entry.jsx"></script></body></html>`;
        response.end(await server.transformIndexHtml(request.url, html));
      });
    },
  };
}

function jwtRole(request) {
  const authorization = request.headers().authorization || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token.includes(".")) return null;
  try { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")).role || null; }
  catch { return "invalid"; }
}

async function fulfillJson(route, data, status = 200) {
  const length = Array.isArray(data) ? data.length : data == null ? 0 : 1;
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "access-control-allow-origin": "*",
      "access-control-expose-headers": "Content-Range",
      "content-range": length ? `0-${length - 1}/${length}` : "*/0",
    },
    body: JSON.stringify(data),
  });
}

async function openFixturePage(browser, origin, path) {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
  const records = [];
  const browserErrors = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === origin) {
      if (url.pathname.startsWith("/api/")) {
        records.push({ kind: "unexpected-api", method: request.method(), url: request.url() });
        return fulfillJson(route, { error: "fixture_api_blocked" }, 503);
      }
      return route.continue();
    }
    if (url.hostname !== "linswmnnkjxvweumprav.supabase.co") {
      records.push({ kind: "intercepted-external", method: request.method(), url: request.url() });
      return route.fulfill({ status: 204, body: "" });
    }
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
    const table = url.pathname.includes("/rest/v1/") ? url.pathname.split("/rest/v1/")[1].split("/")[0] : null;
    records.push({ kind: "supabase", table, role: jwtRole(request), method: request.method(), url: request.url() });
    if (request.method() !== "GET" && request.method() !== "HEAD") return fulfillJson(route, { error: "fixture_write_blocked" }, 405);
    if (table === "research_objects") {
      const id = String(url.searchParams.get("id") || "").replace(/^eq\./, "");
      const row = id === publicFinding.id ? publicFinding : forbiddenFindings[id] || null;
      return fulfillJson(route, row ? [row] : []);
    }
    if (table === "channel_updates") {
      return fulfillJson(route, [{
        id: "source-1", channel: "tzvi", status: "live",
        link_url: "https://example.test/exact-source", text: "מקור מדויק",
      }]);
    }
    if (table === "topic_cards") return fulfillJson(route, []);
    if (table === "contributors") return fulfillJson(route, peopleRows);
    // The source lens keeps its public Topic inventory and featured source corpus visible
    // beside the people index. They are expected anonymous reads, but this focused fixture
    // deliberately returns no rows because their content is outside the acceptance scope.
    if (["topic_cards_public", "posts"].includes(table)) return fulfillJson(route, []);
    records.push({ kind: "unexpected-reader", table, method: request.method(), url: request.url() });
    return fulfillJson(route, []);
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/Failed to load resource/.test(message.text())) browserErrors.push(message.text());
  });
  await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
  return { context, page, records, browserErrors };
}

function assertPublicTransport(records) {
  const reads = records.filter((record) => record.kind === "supabase");
  assert.ok(reads.length > 0, "the fixture must exercise the public Supabase reader");
  assert.deepEqual([...new Set(reads.map((record) => record.role))], ["anon"]);
  assert.ok(reads.every((record) => ["GET", "HEAD"].includes(record.method)));
  const unexpected = records.filter((record) => ["unexpected-api", "unexpected-reader"].includes(record.kind));
  assert.deepEqual(unexpected, [], `unexpected fixture readers: ${JSON.stringify(unexpected)}`);
  assert.equal(reads.some((record) => /\/rpc\//.test(new URL(record.url).pathname)), false);
}

async function assertNoOverflow(page) {
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("body *")].map((element) => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 80), left: rect.left, right: rect.right, width: rect.width };
    }).filter((rect) => rect.left < -1 || rect.right > innerWidth + 1).slice(0, 12),
  }));
  assert.ok(layout.scrollWidth <= layout.viewport + 1, JSON.stringify(layout));
}

test("combined World acceptance keeps the public DTO bounded and navigation exact", { skip: !available, timeout: 120_000 }, async () => {
  const cacheDir = mkdtempSync(join(tmpdir(), "central-world-browser-"));
  const server = await vite.createServer({
    root,
    configFile: false,
    cacheDir,
    plugins: [fixturePlugin(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 },
    logLevel: "error",
  });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });

    const findingByPrincipal = new Map();
    for (const principal of ["guest", "admin"]) {
      const fixture = await openFixturePage(browser, origin, `/world?finding=f-public&principal=${principal}`);
      const finding = fixture.page.locator('[data-world-public-finding="f-public"]');
      await finding.waitFor({ state: "visible" });
      const text = await finding.innerText();
      findingByPrincipal.set(principal, text);
      assert.match(text, new RegExp(PUBLIC_STATEMENT));
      assert.match(text, /channel_updates:source-1#a2/);
      assert.match(text, /נוסף למחקר · .* · .*2026/);
      assert.doesNotMatch(text, /לפני|PRIVATE_WORLD_MARKER|CANDIDATE_WORLD_MARKER/);
      assert.equal(await finding.getByRole("link", { name: "פתח מקור ↗", exact: true }).getAttribute("href"), "https://example.test/exact-source");
      assertPublicTransport(fixture.records);
      assert.deepEqual(fixture.browserErrors, []);
      await assertNoOverflow(fixture.page);
      if (principal === "guest") {
        await finding.getByRole("button", { name: /חזרה מדויקת אל בית המדרש/ }).click();
        await fixture.page.waitForURL(`${origin}${RETURN_HREF}`);
        assert.equal(await fixture.page.evaluate(() => window.__returnExactHref), RETURN_HREF);
      }
      await fixture.context.close();
    }
    assert.equal(findingByPrincipal.get("guest"), findingByPrincipal.get("admin"), "guest and admin must receive the same public finding DTO");

    for (const id of ["f-candidate", "f-private", "f-missing"]) {
      const fixture = await openFixturePage(browser, origin, `/world?finding=${id}&principal=admin`);
      await fixture.page.getByRole("heading", { name: "הממצא המבוקש אינו זמין לציבור", exact: true }).waitFor();
      assert.equal(await fixture.page.locator("[data-world-public-finding]").count(), 0);
      const body = await fixture.page.locator("body").innerText();
      for (const marker of PRIVATE_MARKERS) assert.equal(body.includes(marker), false);
      const reads = fixture.records.filter((record) => record.table === "research_objects");
      assert.equal(reads.length, 1, `${id} must perform one exact research-object read`);
      const query = new URL(reads[0].url).searchParams;
      assert.equal(query.get("id"), `eq.${id}`);
      assert.equal(query.get("privacy_scope"), "eq.public");
      assert.match(query.get("status") || "", /^in\./);
      assertPublicTransport(fixture.records);
      assert.deepEqual(fixture.browserErrors, []);
      await assertNoOverflow(fixture.page);
      await fixture.context.close();
    }

    const peopleByPrincipal = new Map();
    for (const principal of ["guest", "admin"]) {
      const fixture = await openFixturePage(browser, origin, `/world?view=sources&principal=${principal}`);
      const section = fixture.page.getByRole("region", { name: "כל האנשים הציבוריים בעולם" });
      await section.getByText("מוצגים 20 מתוך 27 אנשים ציבוריים", { exact: true }).waitFor();
      const cards = section.locator(".sod29-world-source-home-grid > article");
      assert.equal(await cards.count(), 20);
      const firstDate = await cards.first().locator("time").innerText();
      assert.match(firstDate, /[א-ת]/);
      assert.match(firstDate, / · \d{2}\.\d{2}\.2026/);
      assert.doesNotMatch(firstDate, /לפני/);
      await section.getByRole("button", { name: "לכל דפי הכותבים (7 נוספים)", exact: true }).click();
      await section.getByText("מוצגים 27 מתוך 27 אנשים ציבוריים", { exact: true }).waitFor();
      assert.equal(await cards.count(), 27);
      const names = await cards.locator("strong").allTextContents();
      peopleByPrincipal.set(principal, names);
      const body = await section.innerText();
      for (const marker of PRIVATE_MARKERS) assert.equal(body.includes(marker), false);
      assertPublicTransport(fixture.records);
      assert.deepEqual(fixture.browserErrors, []);
      await assertNoOverflow(fixture.page);
      await fixture.context.close();
    }
    assert.deepEqual(peopleByPrincipal.get("guest"), peopleByPrincipal.get("admin"));
  } finally {
    await browser?.close();
    await server.close();
    rmSync(cacheDir, { recursive: true, force: true });
  }
});
