// Actual ControlPlane2029Page and runtimeSwitches2029, rendered in Chromium.
// Auth, shell, operational health and Supabase are in-memory boundary fixtures.
// Every non-local HTTP request is blocked. This is not a live authorization or timing test.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || require.resolve("playwright", {
  paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || "/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules"],
}));
const evidenceDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceDir, "../../../..");
const entryId = path.join(root, "__perf_switches_main.jsx");
const fixtureFiles = new Map([
  ["src/lib/AuthContext.jsx", `export function useAuth() { return { loading: !!window.__fixture.authLoading, isAdmin: !!window.__fixture.admin }; }`],
  ["src/components/experience2029/NavigationIcon2029.jsx", `export default function Icon() { return null; }`],
  ["src/components/experience2029/Sod2029Shell.jsx", `import React from 'react'; export default function Shell({children}) { return React.createElement("main", {dir:"rtl"}, children); } export function FrameState({title,children,kind}) { return React.createElement("div", {role:kind === "error" ? "alert" : undefined}, React.createElement("strong",null,title), React.createElement("p",null,children)); }`],
  ["src/lib/visits.js", `const record = name => { window.__fixture.healthCalls.push(name); }; export async function getSystemHealth() { record('health'); return {}; } export async function getVideoMapHealth() { record('video'); return {}; } export async function getOperationalTraceList() { record('traces'); return []; } export async function getOperationalTrace() { record('trace'); return {}; }`],
  ["src/lib/supabase.js", `
    export async function getSiteFlags() {
      const f = window.__fixture; f.flagReads++;
      if (f.failRead) throw new Error('fixture flag read failure');
      return structuredClone(f.flags);
    }
    export const supabase = { from(table) {
      if (table !== 'site_flags') throw new Error('unexpected fixture table: ' + table);
      return { async select(columns) {
        const f = window.__fixture; f.readbacks++;
        if (columns !== 'key,enabled') throw new Error('unexpected fixture columns');
        return f.failReadback ? { data: null, error: { message: 'fixture readback unavailable' } } : { data: Object.entries(f.flags).map(([key, value]) => ({ key, ...value })), error: null };
      } };
    }, async rpc(name, args) {
      const f = window.__fixture; f.rpcCalls.push({ name, args: structuredClone(args) });
      if (f.delayMs) await new Promise(resolve => setTimeout(resolve, f.delayMs));
      if (name === 'fn_number_lookup_2029_page') {
        return f.rpcAvailable ? { data: [], error: null } : { data: null, error: { code: 'PGRST202', message: 'missing fixture function' } };
      }
      if (name !== 'admin_set_runtime_switch') throw new Error('unexpected fixture RPC: ' + name);
      if (f.denyWrite) return { data: null, error: { code: '42501', message: 'fixture permission denied' } };
      f.flags[args.p_key] = { enabled: args.p_on };
      f.writes.push(structuredClone(args));
      return { data: null, error: null };
    } };
  `],
].map(([file, source]) => [path.join(root, file), source]));
const entrySource = `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { MemoryRouter, Routes, Route } from 'react-router-dom';
  import ControlPlane2029Page from '/src/pages/ControlPlane2029Page.jsx';
  createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={['/control']}><Routes><Route path="/control" element={<ControlPlane2029Page />} /><Route path="/" element={<div data-testid="public-home">Public home fixture</div>} /></Routes></MemoryRouter>);
`;
const fixturePlugin = {
  name: "isolated-existing-control-page",
  enforce: "pre",
  resolveId(source, importer) {
    if (source === "/__perf_switches_main.jsx") return entryId;
    const resolved = source.startsWith(".") && importer ? path.resolve(path.dirname(importer.split("?")[0]), source) : source;
    if (fixtureFiles.has(resolved)) return "\0fixture:" + resolved;
  },
  load(id) {
    if (id === entryId) return entrySource;
    return fixtureFiles.get(id.replace(/^\0fixture:/, ""));
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url !== "/__perf_switches") return next();
      res.setHeader("Content-Type", "text/html");
      res.end(await server.transformIndexHtml(req.url, `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:20px;background:#f7f7fa;color:#18202d}.sod29-row{display:flex;justify-content:space-between;gap:20px;padding:14px;border:1px solid #ddd;background:white}small{display:block;margin-top:6px;max-width:720px}.sod29-actions{min-width:160px;display:flex;flex-direction:column;gap:8px}button{padding:10px;cursor:pointer}.sod29-kicker{margin:15px 0;font-weight:bold}.sod29-section{margin-bottom:24px}[role=alert]{background:#fee;padding:12px}</style></head><body><div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="/__perf_switches_main.jsx"></script></body></html>`));
    });
  },
};

const server = await createServer({ root, configFile: false, plugins: [fixturePlugin, react()], define: { __SOD_2029_BUILD__: "true" }, server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const optionalChromium = process.env.CHROMIUM_MODULE ? require(process.env.CHROMIUM_MODULE) : null;
const browser = await chromium.launch({ headless: true, ...(optionalChromium ? { executablePath: process.env.CHROMIUM_EXECUTABLE || await optionalChromium.executablePath(), args: optionalChromium.args.filter(arg => arg !== "--single-process") } : {}) });
const outcomes = [];
const blockedExternal = [];
const consoleErrors = [];
const worldKey = "fx_world_relation_identity";
const numberKey = "fx_number_lookup_page";
async function scenario(name, options, test) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    blockedExternal.push(url.href); return route.abort("blockedbyclient");
  });
  await context.addInitScript(fixture => { window.__fixture = fixture; }, {
    admin: true, authLoading: false, rpcAvailable: true, denyWrite: false, failRead: false, delayMs: 0,
    flags: {}, rpcCalls: [], writes: [], healthCalls: [], flagReads: 0, readbacks: 0, failReadback: false, ...options,
  });
  const page = await context.newPage();
  page.on("pageerror", error => consoleErrors.push({ scenario: name, message: error.message }));
  try {
    await page.goto(`${origin}/__perf_switches`);
    const section = page.getByRole("region", { name: "מתגי פונקציות" });
    const row = key => section.locator(".sod29-row").filter({ hasText: key });
    await test({ page, section, row, fixture: () => page.evaluate(() => window.__fixture) });
    outcomes.push({ name, status: "PASS", fixture: await page.evaluate(() => ({ rpcCalls: window.__fixture.rpcCalls, writes: window.__fixture.writes, flagReads: window.__fixture.flagReads, healthCalls: window.__fixture.healthCalls })) });
  } finally { await context.close(); }
}
async function waitState(row, on) {
  const button = row.getByRole("button");
  await button.waitFor();
  await button.page().waitForFunction(({ key, on }) => {
    const row = [...document.querySelectorAll('.sod29-row')].find(el => el.textContent.includes(key));
    const button = row?.querySelector('button');
    return button && !button.disabled && button.getAttribute('aria-pressed') === String(on);
  }, { key: (await row.locator("small").first().innerText()).split(" · ").at(-1), on });
  assert.equal(await button.getAttribute("aria-pressed"), String(on));
}
try {
  await scenario("independent defaults, ON and OFF, original controls preserved", {}, async ({ page, section, row, fixture }) => {
    await waitState(row(worldKey), false); await waitState(row(numberKey), false);
    assert.equal(await section.getByRole("button").count(), 15);
    assert.equal(await section.locator('button[aria-pressed="true"]').count(), 13);
    assert.equal(await row(worldKey).getByRole("button").innerText(), "הפעל האצה");
    await row(worldKey).getByRole("button").click(); await waitState(row(worldKey), true);
    await waitState(row(numberKey), false);
    await row(numberKey).getByRole("button").click(); await waitState(row(numberKey), true);
    assert.deepEqual((await fixture()).rpcCalls.map(call => call.name), ["admin_set_runtime_switch", "fn_number_lookup_2029_page", "admin_set_runtime_switch"]);
    await row(worldKey).getByRole("button").click(); await waitState(row(worldKey), false); await waitState(row(numberKey), true);
    await row(numberKey).getByRole("button").click(); await waitState(row(numberKey), false);
    assert.equal(await section.locator('button[aria-pressed="true"]').count(), 13);
    assert.deepEqual((await fixture()).writes, [{ p_key: worldKey, p_on: true }, { p_key: numberKey, p_on: true }, { p_key: worldKey, p_on: false }, { p_key: numberKey, p_on: false }]);
    await section.locator("div").filter({ has: page.getByText("האצות", { exact: true }) }).first().screenshot({ path: path.join(evidenceDir, "controls-off.png") });
  });
  await scenario("missing RPC prevents enable and clearly explains why", { rpcAvailable: false }, async ({ page, row, fixture }) => {
    await waitState(row(numberKey), false); await row(numberKey).getByRole("button").click();
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /עדכון המסד להאצה הזו עדיין לא הותקן/);
    await waitState(row(numberKey), false); assert.deepEqual((await fixture()).writes, []);
    assert.deepEqual((await fixture()).rpcCalls.map(call => call.name), ["fn_number_lookup_2029_page"]);
  });
  await scenario("server permission failure does not show a successful toggle", { denyWrite: true }, async ({ page, row, fixture }) => {
    await waitState(row(worldKey), false); await row(worldKey).getByRole("button").click();
    await page.getByRole("alert").waitFor(); assert.match(await page.getByRole("alert").innerText(), /fixture permission denied/);
    await waitState(row(worldKey), false); assert.deepEqual((await fixture()).writes, []);
  });
  await scenario("successful write with failed readback is unknown, then explicitly restored", { failReadback: true }, async ({ page, row, fixture }) => {
    await waitState(row(worldKey), false); await row(worldKey).getByRole("button").click();
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /לא ניתן לאמת את המצב הנוכחי/);
    assert.equal(await row(worldKey).getByRole("button").getAttribute("aria-pressed"), "mixed");
    assert.match(await row(worldKey).innerText(), /מצב לא מאומת/);
    assert.equal(await row(worldKey).getByRole("button").innerText(), "חזור למימוש הקיים");
    assert.equal(await row(numberKey).getByRole("button").isDisabled(), true);
    assert.equal((await fixture()).flags[worldKey].enabled, true);
    await page.evaluate(() => { window.__fixture.failReadback = false; });
    await row(worldKey).getByRole("button").click(); await waitState(row(worldKey), false);
    assert.deepEqual((await fixture()).writes, [{ p_key: worldKey, p_on: true }, { p_key: worldKey, p_on: false }]);
  });
  await scenario("one save pending disables all toggle buttons", { delayMs: 300 }, async ({ section, row }) => {
    await waitState(row(worldKey), false); await row(worldKey).getByRole("button").click();
    assert.equal(await section.locator("button:disabled").count(), 15);
    await waitState(row(worldKey), true); assert.equal(await section.locator("button:disabled").count(), 0);
  });
  await scenario("unavailable settings retain both original execution paths", { failRead: true }, async ({ row, fixture }) => {
    await waitState(row(worldKey), false); await waitState(row(numberKey), false);
    assert.equal((await fixture()).rpcCalls.length, 0);
  });
  await scenario("non-admin UI routes away before loading switches or operational data", { admin: false }, async ({ page, section, fixture }) => {
    await page.getByTestId("public-home").waitFor(); assert.equal(await section.count(), 0);
    const f = await fixture(); assert.equal(f.flagReads, 0); assert.deepEqual(f.healthCalls, []); assert.deepEqual(f.rpcCalls, []);
  });
  await scenario("auth still loading cannot render or read administrative controls", { authLoading: true }, async ({ page, section, fixture }) => {
    await page.getByLabel("טוען", { exact: true }).waitFor(); assert.equal(await section.count(), 0);
    const f = await fixture(); assert.equal(f.flagReads, 0); assert.deepEqual(f.healthCalls, []); assert.deepEqual(f.rpcCalls, []);
  });
  assert.deepEqual(consoleErrors, []); assert.deepEqual(blockedExternal, []);
  const report = { status: "PASS", testedAt: new Date().toISOString(), browser: await browser.version(), cases: outcomes.length, scope: "actual ControlPlane2029Page + runtimeSwitches2029; fixture auth, shell, health and Supabase boundaries", limitations: ["Not a live authentication/RLS test", "Not hosted preview acceptance", "No page/navigation/scroll timing measurement", "Screenshot uses fixture CSS, not production frame styling"], externalRequestsBlocked: blockedExternal, uncaughtBrowserErrors: consoleErrors, outcomes };
  await writeFile(path.join(evidenceDir, "results.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ status: report.status, cases: report.cases, browser: report.browser, externalRequests: blockedExternal.length }));
} finally { await browser.close(); await server.close(); }
