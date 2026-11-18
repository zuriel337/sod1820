// gsc-sync (Edge) behaviour before its deployment (ZURIEL 18.11.2026): run the real function source in Node with an isolated Deno /
// Supabase / Google stand-in. Web keeps its historical rows, other search types never write zero for an unavailable type, the live
// action "inspect" (version 10) is served unchanged, and the daily run completes even when the scheduled caller stops waiting.
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { build } from "esbuild";

async function loadFunction() {
  const { outputFiles } = await build({ entryPoints: ["supabase/functions/gsc-sync/index.ts"], bundle: true, write: false, format: "esm", platform: "neutral",
    plugins: [{ name: "stand-in", setup(b) {
      b.onResolve({ filter: /^jsr:@supabase\/supabase-js@2$/ }, () => ({ path: "sb", namespace: "stand-in" }));
      b.onLoad({ filter: /.*/, namespace: "stand-in" }, () => ({ loader: "js", contents: "export const createClient = (...args) => globalThis.__sb(...args);" }));
    } }] });
  let handler = null;
  globalThis.Deno = { env: { get: name => ({ GSC_SA_KEY: globalThis.__sa, GSC_SYNC_KEY: "sync-key" })[name] || "" }, serve: fn => { handler = fn; } };
  await import("data:text/javascript;base64," + Buffer.from(outputFiles[0].text).toString("base64") + "#" + Math.random());
  return handler;
}

function standIns({ discoverFails = true } = {}) {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  globalThis.__sa = JSON.stringify({ client_email: "sync@example.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) });
  const writes = [], calls = [], background = [];
  globalThis.__sb = () => ({ rpc: async () => ({ data: null, error: null }),
    from: table => ({ upsert: async (rows, options) => { writes.push({ table, rows, options }); return { error: null }; } }) });
  globalThis.EdgeRuntime = { waitUntil: promise => background.push(promise) };
  globalThis.fetch = async (url, init = {}) => {
    const href = String(url);
    if (href.includes("oauth2.googleapis.com")) return new Response(JSON.stringify({ access_token: "token" }), { status: 200 });
    if (href.includes("urlInspection")) return new Response(JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed" } } }), { status: 200 });
    const body = JSON.parse(init.body || "{}");
    calls.push(body);
    if (body.type === "discover" && discoverFails) return new Response(JSON.stringify({ error: { message: "not available for this property" } }), { status: 400 });
    if (body.type !== "web") return new Response(JSON.stringify({}), { status: 200 });
    const dim = body.dimensions[1];
    return new Response(JSON.stringify({ rows: [{ keys: dim ? ["2026-11-15", `${dim}-key`] : ["2026-11-15"], clicks: 3, impressions: 40, ctr: 0.075, position: 7.2 }] }), { status: 200 });
  };
  return { writes, calls, background };
}

const request = body => new Request("https://example.supabase.co/functions/v1/gsc-sync", { method: "POST", headers: { "x-gsc-key": "sync-key", "content-type": "application/json" }, body: JSON.stringify(body) });

test("daily sync: web rows keep their historical dimensions; an unavailable or empty type writes nothing; the run is kept alive", async () => {
  const { writes, calls, background } = standIns();
  const handler = await loadFunction();
  const response = await handler(request({ days: 7, site: "sc-domain:sod1820.co.il" }));
  const report = await response.json();
  assert.equal(response.status, 200);
  assert.equal(report.ok, true);
  const dimensions = writes.flatMap(w => w.rows.map(r => r.dimension));
  assert.deepEqual([...new Set(dimensions)].sort(), ["country", "device", "page", "query", "total"], "only web rows, under the historical names");
  assert.ok(writes.every(w => w.table === "gsc_metrics" && w.options.onConflict === "site,date,dimension,key"), "same upsert key: nothing else is overwritten");
  assert.ok(writes.flatMap(w => w.rows).every(r => r.impressions > 0), "no zero row is written for any type");
  assert.equal(report.searchTypes.web.state, "measured");
  assert.equal(report.searchTypes.discover.state, "unavailable");
  for (const type of ["googleNews", "news", "image", "video"]) assert.equal(report.searchTypes[type].state, "no_data", type);
  assert.deepEqual([...new Set(calls.map(c => c.type))], ["web", "discover", "googleNews", "news", "image", "video"], "web first, then the other types");
  assert.ok(calls.filter(c => ["discover", "googleNews"].includes(c.type)).every(c => c.dimensions[1] !== "query"), "no query dimension for Discover / Google News");
  assert.equal(background.length, 1, "the run is registered with EdgeRuntime.waitUntil");
});

test("a type Google serves is stored under its own prefix, never over web", async () => {
  const { writes } = standIns({ discoverFails: false });
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    if (!String(url).includes("searchAnalytics")) return original(url, init);
    const body = JSON.parse(init.body || "{}");
    if (body.type === "discover") return new Response(JSON.stringify({ rows: [{ keys: body.dimensions[1] ? ["2026-11-15", "x"] : ["2026-11-15"], clicks: 1, impressions: 9, ctr: 0.1, position: 3 }] }), { status: 200 });
    return original(url, init);
  };
  const handler = await loadFunction();
  const report = await (await handler(request({ days: 7 }))).json();
  const dimensions = new Set(writes.flatMap(w => w.rows.map(r => r.dimension)));
  for (const d of ["discover:total", "discover:page", "discover:country", "discover:device"]) assert.ok(dimensions.has(d), d);
  assert.ok(!dimensions.has("discover:query"));
  assert.equal(report.searchTypes.discover.state, "measured");
});

test("action inspect answers exactly as the live version 10 and writes nothing", async () => {
  const { writes } = standIns();
  const handler = await loadFunction();
  const response = await handler(request({ action: "inspect", urls: ["https://sod1820.co.il/", "https://sod1820.co.il/gematria"] }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(body).sort(), ["inspected", "ok", "site"]);
  assert.equal(body.inspected.length, 2);
  // Fields Google does not return are left out by JSON (undefined), exactly as the live version answers.
  assert.deepEqual(body.inspected[0], { url: "https://sod1820.co.il/", verdict: "PASS", coverageState: "Submitted and indexed" });
  assert.equal(writes.length, 0);
});

test("a failed web run answers 502 and the key still guards the function", async () => {
  standIns();
  globalThis.fetch = async url => String(url).includes("oauth2") ? new Response(JSON.stringify({ access_token: "t" }), { status: 200 }) : new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 });
  const handler = await loadFunction();
  assert.equal((await handler(request({ days: 7 }))).status, 502);
  const unauthorized = await handler(new Request("https://example.supabase.co/functions/v1/gsc-sync", { method: "POST", headers: { "x-gsc-key": "wrong" }, body: "{}" }));
  assert.equal(unauthorized.status, 401);
});
