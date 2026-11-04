import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let playwright, vite, reactPlugin;
try {
  playwright = require("playwright");
  vite = await import(pathToFileURL(require.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Browser tooling is optional; acceptance reports an explicit skip. */ }
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || playwright?.chromium.executablePath();
const available = Boolean(playwright && vite && reactPlugin && executablePath && existsSync(executablePath));
const root = fileURLToPath(new URL("..", import.meta.url));
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const zvi = "c66f0464-0928-490e-be9b-66d8a87e7fc8";
const yaniv = id(500);

function fixturePlugin() {
  const modules = new Map([
    ["virtual:one-world-elections", `export async function fetchElectionWorldContentProjection(){ return {summary:null,contentProjection:null}; }`],
    ["virtual:one-world-entry.jsx", `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
      import WorldIndex from '/src/components/research/WorldPublicSourceSubjects2029.jsx';
      import WorldUpdates from '/src/components/research/WorldPublicUpdates2029.jsx';
      const people=[{id:${JSON.stringify(zvi)},slug:'tzvi-opoc',displayName:'צבי (OPOC)'},
        {id:${JSON.stringify(yaniv)},slug:'yaniv-levi',displayName:'יניב לוי'}];
      const index={people,bySlug:Object.fromEntries(people.map(p=>[p.slug,p]))};
      const h=React.createElement;
      const messages=Array.from({length:14},(_,n)=>({id:'group:x'+n,kind:'source',sourceKind:'group_message',
        label:'כותרת '+n,creator:'צבי',fullText:'תוכן ציבורי של הודעת מקור '+n,
        href:'/world#group-source-x'+n,arrivalAt:new Date(Date.UTC(2026,9,31-n)).toISOString()}));
      function UpdatesFixture(){const location=useLocation();return h(WorldUpdates,{arrivals:messages,
        initialLimit:2,selectedSourceHash:location.hash,onOpen:(item,options)=>{
          if(!options?.inline)throw new Error('group must open inline');document.body.dataset.opened=item.id;
        }})}
      createRoot(document.getElementById('root')).render(h(BrowserRouter,null,h(Routes,null,
        h(Route,{path:'/world',element:h(WorldIndex,{peopleIndex:index})}),
        h(Route,{path:'/updates',element:h(UpdatesFixture)}),
        h(Route,{path:'*',element:h('main',null,h('p',null,'עמוד יעד'),h(Link,{to:'/world?view=sources'},'עולם'))})
      )));
    `],
  ]);
  return {
    name: "world-one-tree-search-fixture", enforce: "pre",
    resolveId(source) {
      if (source === "/__one-world-entry.jsx") return "\0virtual:one-world-entry.jsx";
      if (source.endsWith("worldElectionContentProjection.js")) return "\0virtual:one-world-elections";
      return null;
    },
    load(key) { return modules.get(key.replace(/^\0/, "")) ?? null; },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!/^\/(?:world|updates|topic\/|post\/)/.test(request.url || "")) return next();
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(await server.transformIndexHtml(request.url, `<!doctype html><html lang="he" dir="rtl"><head>
          <meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:8px;font-family:sans-serif}</style>
          </head><body><div id="root"></div><script type="module" src="/__one-world-entry.jsx"></script></body></html>`));
      });
    },
  };
}

async function reply(route, value) {
  const n = Array.isArray(value) ? value.length : 0;
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(value),
    headers: { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range",
      "content-range": n ? `0-${n - 1}/${n}` : "*/0" } });
}

async function routeData(context, records) {
  await context.route("**/*", async (route) => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === "127.0.0.1") return route.continue();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: {
      "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS" } });
    records.push({ method: request.method(), path: url.pathname, params: Object.fromEntries(url.searchParams.entries()) });
    const table = url.pathname.split("/rest/v1/")[1] || "";
    if (table === "rpc/world_group_source_arrivals_v2" && request.method() === "POST") {
      return reply(route, [1, 2].map((n) => ({ id: id(n), body: "ירושלים מוזכרת בהודעה ציבורית",
        created_at: `2026-10-0${n}T10:00:00Z`, contributor_slug: "tzvi-opoc", contributor_name: "צבי (OPOC)",
        group_proof: true, proof_basis: "verified_phone_unique" })));
    }
    if (request.method() !== "GET") return route.fulfill({ status: 405, body: "blocked" });
    if (table === "topic_cards_public") return reply(route, [
      { id: id(11), slug: "zvi-topic", title: "שער צבי", subtitle: "", search_terms: ["ירושלים"], created_by: "צבי (OPOC)", numbers: [1820] },
      { id: id(12), slug: "yaniv-topic", title: "שער יניב", subtitle: "", search_terms: ["ירושלים"], created_by: "יניב לוי", numbers: [] },
    ]);
    if (table === "posts") return reply(route, [{ id: 8, slug: "hashmal-source", title: "גיליון סוד החשמל",
      excerpt: "תוכן הגיליון", content: "<p>ירושלים כתובה במקור הזה</p>", source: "sod1820", tags: [] }]);
    if (table === "world_contributor_research_v1") {
      const rows = [
        { id: id(21), source_contributor_id: zvi, contributor: "צבי", source_ref: `channel_updates:${id(31)}#1` },
        { id: id(22), source_contributor_id: yaniv, contributor: "יניב", source_ref: `channel_updates:${id(32)}#1` },
        { id: id(23), source_contributor_id: zvi, contributor: "פרטי", source_ref: `channel_updates:${id(31)}#private`, privacy_scope: "private" },
      ].map((row) => ({ created_at: "2026-10-31T12:00:00Z", kind: "observation", statement: "ירושלים מופיעה ביחידת מידע",
        status: "approved", privacy_scope: "public", value: null, meta: { ext: { presentation: { statement_role: "research_statement" } } }, ...row }));
      const contributor = url.searchParams.get("source_contributor_id")?.replace(/^eq\./, "");
      return reply(route, contributor ? rows.filter((row) => row.source_contributor_id === contributor) : rows);
    }
    if (table === "channel_updates") return reply(route, [1, 2, 31, 32].map((n) => ({ id: id(n), status: "live",
      contributor_id: n === 32 ? yaniv : zvi, channel: "public" })));
    return reply(route, []);
  });
}

test("one World search covers words, public source text, writers, safe grouping and return at mobile and desktop widths", { skip: !available, timeout: 90000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [fixturePlugin(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 }, logLevel: "silent" });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const records = [], errors = [];
      await routeData(context, records);
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("response", (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`); });
      await page.goto(`${origin}/world?view=sources`);
      const search = page.getByRole("searchbox", { name: "חיפוש לפי נושא, מקור או מספר" });
      try { await search.waitFor(); } catch (error) {
        const entry = await fetch(`${origin}/__one-world-entry.jsx`).then((response) => response.text());
        throw new Error(`search fixture failed: ${JSON.stringify({ errors, entry: entry.slice(0, 2000), body: (await page.locator("body").innerText()).slice(0, 600) })}: ${error.message}`);
      }
      await page.getByText("שער צבי", { exact: true }).waitFor();
      assert.ok(!records.some((entry) => entry.path.endsWith("/rpc/world_group_source_arrivals_v2")
        || entry.path.endsWith("/world_contributor_research_v1") || (entry.path.endsWith("/posts") && entry.params.content)),
      "opening World does not run the new content or finding search before a visitor searches");
      await search.fill("ירושלים");
      await page.getByText("שער צבי", { exact: true }).waitFor();
      await page.getByText("ירושלים כתובה במקור הזה", { exact: false }).waitFor();
      await page.getByText("הודעת מקור · צבי (OPOC)", { exact: true }).waitFor();
      const message = page.locator("article").filter({ hasText: "הודעת מקור · צבי (OPOC)" });
      await message.locator("summary").click();
      assert.equal(await message.getByRole("link", { name: "פתיחת המקור" }).count(), 2);
      await page.getByText("2 מופעים באותו נוסח מוצג", { exact: true }).waitFor();
      await page.getByText("2 מופעים באותו נוסח מוצג", { exact: true }).click();
      assert.equal(await page.getByText("פרטי", { exact: true }).count(), 0);
      assert.ok((await page.getByText("פריט 1", { exact: true }).count()) === 1);
      assert.equal(new URL(page.url()).searchParams.get("q"), "ירושלים");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow at ${width}px`);
      await page.getByRole("link", { name: /שער צבי/ }).click();
      assert.match(page.url(), /\/topic\/zvi-topic/);
      await page.goBack();
      await page.getByRole("searchbox", { name: "חיפוש לפי נושא, מקור או מספר" }).waitFor();
      assert.equal(await page.getByRole("searchbox", { name: "חיפוש לפי נושא, מקור או מספר" }).inputValue(), "ירושלים");
      await page.getByLabel("חומר לפי כותב").selectOption("writer:yaniv-levi");
      await page.getByText("שער יניב", { exact: true }).waitFor();
      assert.equal(await page.getByText("שער צבי", { exact: true }).count(), 0);
      assert.equal(new URL(page.url()).searchParams.get("source"), "yaniv-levi");
      await page.goto(`${origin}/world?view=sources&source=tzvi-opoc&sourceRef=channel_updates%3A${id(1)}#source-occurrence-${id(1)}`);
      await page.getByLabel("חומר לפי כותב").selectOption("writer:yaniv-levi");
      assert.equal(new URL(page.url()).searchParams.get("source"), "yaniv-levi");
      assert.equal(new URL(page.url()).searchParams.has("sourceRef"), false, "changing writers clears the old source identity");
      assert.equal(new URL(page.url()).hash, "", "changing writers clears the old source anchor");
      const origins = page.getByRole("group", { name: "בחירה לפי מקור" });
      await origins.getByRole("button", { name: "צבי", exact: true }).click();
      assert.equal(new URL(page.url()).searchParams.get("source"), "tzvi-opoc",
        "the Zvi shortcut also opens the existing writer source surface");
      assert.equal(new URL(page.url()).searchParams.get("subjectSource"), "zvi");
      await origins.getByRole("button", { name: "סוד החשמל", exact: true }).click();
      assert.equal(new URL(page.url()).searchParams.get("source"), "sod-hashmal",
        "the corpus shortcut opens its existing source reader");
      await origins.getByRole("button", { name: "הכול", exact: true }).click();
      assert.equal(new URL(page.url()).searchParams.has("source"), false);
      assert.equal(new URL(page.url()).searchParams.has("subjectSource"), false);
      assert.deepEqual(errors, []);
      assert.ok(records.every((entry) => entry.method === "GET" || entry.path.endsWith("/rpc/world_group_source_arrivals_v2")),
        "only public GETs and the existing read-only group RPC are allowed");
      assert.ok(records.some((entry) => entry.path.endsWith("/posts") && entry.params.content && entry.params.limit === "8"),
        "source text searches request at most eight public posts per page");
      await context.close();
    }
  } finally { await browser.close(); await server.close(); }
});

test("public source messages open in place and an exact shared anchor opens even beyond the first page", { skip: !available, timeout: 45000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [fixturePlugin(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 }, logLevel: "silent" });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/updates`);
    const first = page.locator("#group-source-x0");
    await first.locator("summary").click();
    assert.equal(await first.locator("p").first().innerText(), "תוכן ציבורי של הודעת מקור 0");
    assert.equal(await first.locator("p").last().innerText(), "הודעת מקור שטרם נבדקה.");
    assert.equal(new URL(page.url()).pathname, "/updates");
    await page.waitForFunction(() => document.body.dataset.opened === "group:x0");
    await page.goto(`${origin}/updates#group-source-x13`);
    const deep = page.locator("#group-source-x13");
    await deep.waitFor();
    assert.equal(await deep.getAttribute("open"), "");
    assert.equal(await deep.locator("p").first().innerText(), "תוכן ציבורי של הודעת מקור 13");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await server.close(); }
});

test("World reader failures and pending search never claim measured emptiness; explicit retry can recover", { skip: !available, timeout: 45000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [fixturePlugin(), reactPlugin()],
    server: { host: "127.0.0.1", port: 0 }, logLevel: "silent" });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const browser = await playwright.chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await routeData(context, []);
    let mode = "index-failure";
    await context.route("**/*", async route => {
      const url = new URL(route.request().url()), table = url.pathname.split('/rest/v1/')[1];
      if (mode === "index-failure" && ['posts','topic_cards_public'].includes(table)
        || mode === "search-failure" && (table === 'rpc/world_group_source_arrivals_v2' || table === 'posts' && url.searchParams.has('content'))) {
        return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'controlled public-reader outage'})});
      }
      return route.fallback();
    });
    const page = await context.newPage();
    await page.goto(origin + '/world?view=sources');
    await page.getByText('הנושאים והמקורות אינם זמינים כרגע.',{exact:false}).waitFor();
    assert.equal(await page.getByText('לא נמצאו פריטים בחומר שנטען.',{exact:true}).count(),0);
    mode = 'ok';
    await page.getByRole('button',{name:'נסה שוב',exact:true}).click();
    await page.getByText('שער צבי',{exact:true}).waitFor();
    mode = 'search-failure';
    await page.getByRole('searchbox').fill('נומשהולאבמקור');
    assert.equal(await page.getByText('לא נמצאו פריטים בחומר שנטען.',{exact:true}).count(),0);
    await page.getByText('חלק מהמקורות לא נטענו.',{exact:false}).waitFor();
    assert.equal(await page.getByText('לא נמצאו פריטים בחומר שנטען.',{exact:true}).count(),0);
    mode = 'ok';
    await page.getByRole('button',{name:'נסה שוב',exact:true}).click();
    await page.getByText('לא נמצאו פריטים בחומר שנטען.',{exact:true}).waitFor();
    await context.close();
  } finally { await browser.close(); await server.close(); }
});
