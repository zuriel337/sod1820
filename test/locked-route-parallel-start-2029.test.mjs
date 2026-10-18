import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(process.env.LOCKED_ROUTE_DIST || resolve(root, "dist"));
const expected = process.env.LOCKED_ROUTE_EXPECT || "before";
const output = process.env.LOCKED_ROUTE_OUTPUT || "";
const reps = Math.max(1, Number(process.env.LOCKED_ROUTE_REPS || 1));
const chromiumPath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const require = createRequire(import.meta.url);

let chromium = null;
try {
  ({ chromium } = require("/opt/codex/cua_node/lib/node_modules/playwright"));
} catch {
  try { ({ chromium } = require("playwright")); } catch { /* optional outside the evidence environment */ }
}

const runnable = Boolean(chromium && existsSync(chromiumPath)
  && existsSync(resolve(dist, "2029.html"))
  && existsSync(resolve(dist, ".vite/manifest.json")));

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const jsonHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,apikey,content-type,prefer,x-client-info",
  "access-control-expose-headers": "content-range",
  "content-type": "application/json; charset=utf-8",
  "content-range": "0-0/0",
};

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function contentType(file) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
  })[extname(file)] || "application/octet-stream";
}

async function localServer() {
  const html = resolve(dist, "2029.html");
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      const requested = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      let file = requested && extname(requested) ? resolve(dist, requested) : html;
      if (!file.startsWith(`${dist}${sep}`) && file !== html) file = html;
      const body = await readFile(file);
      response.writeHead(200, { "content-type": contentType(file), "cache-control": "no-store" });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("not found");
    }
  });
  await new Promise((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((done, reject) => server.close((error) => error ? reject(error) : done())),
  };
}

function manifestAsset(manifest, source) {
  const entry = Object.values(manifest).find((item) => item.src === source);
  assert.ok(entry?.file, `${source} must exist in the build manifest`);
  return `/${entry.file}`;
}

function syntheticSession() {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const accessToken = `${encode({ alg: "none", typ: "JWT" })}.${encode({
    aud: "authenticated", exp: now + 3600, iat: now, sub: "synthetic-viewer",
    role: "authenticated", email: "synthetic@example.invalid",
  })}.synthetic`;
  return {
    access_token: accessToken,
    refresh_token: "synthetic-refresh-token",
    expires_at: now + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "synthetic-viewer",
      aud: "authenticated",
      role: "authenticated",
      email: "synthetic@example.invalid",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      identities: [],
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  };
}

const switchRows = [
  "fx_analytics", "fx_now_feed", "fx_tier_signals", "fx_number_dossier",
  "fx_number_journey", "fx_home_videos", "fx_home_gateways", "fx_home_pulse",
  "fx_home_temporal", "fx_home_world_preview", "fx_home_convergences",
  "fx_world_discovery", "fx_els_gallery", "fx_world_relation_identity",
  "fx_number_lookup_page",
].map((key) => ({ key, enabled: false, message: "", mode: "all" }));

async function runScenario(browser, origin, assets, options) {
  const {
    name, kind, path, flagsDelay = 0, locked = false, internal = false,
    authProfileDelay = 0, failChunk = false, expectSurface = true,
  } = options;
  const targetAsset = assets[kind];
  const context = await browser.newContext({ serviceWorkers: "block" });
  const state = {
    name, kind, path, flagsDelay, locked, internal, authProfileDelay, failChunk,
    navStart: null, routeRequests: [], flagRequests: [], flagResponseAt: null,
    authProfileRequests: [], authProfileResponseAt: null, dataReads: [],
    externalSideEffects: [], earlyDom: null, finalDom: null,
  };
  let phase = internal ? "setup" : "target";

  if (authProfileDelay > 0) {
    const storageKey = "sb-linswmnnkjxvweumprav-auth-token";
    const value = JSON.stringify(syntheticSession());
    await context.addInitScript(({ key, session }) => {
      localStorage.setItem(key, session);
    }, { key: storageKey, session: value });
  }

  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const at = performance.now();
    if (url.origin === origin) {
      if (phase === "target" && url.pathname === targetAsset && failChunk) {
        state.routeRequests.push(at);
        await route.abort("failed");
        return;
      }
      await route.continue();
      return;
    }
    if (url.hostname === "linswmnnkjxvweumprav.supabase.co") {
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: jsonHeaders, body: "" });
        return;
      }
      if (url.pathname === "/rest/v1/site_flags") {
        if (phase === "target") state.flagRequests.push(at);
        await sleep(phase === "target" ? flagsDelay : 0);
        const rows = [
          { key: "lock_world", enabled: kind === "world" ? locked : false, message: "synthetic lock", mode: "all" },
          { key: "lock_number", enabled: kind === "number" ? locked : false, message: "synthetic lock", mode: "all" },
          ...switchRows,
        ];
        if (phase === "target") state.flagResponseAt = performance.now();
        await route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(rows) });
        return;
      }
      if (url.pathname === "/rest/v1/users" && authProfileDelay > 0) {
        if (phase === "target") state.authProfileRequests.push(at);
        await sleep(authProfileDelay);
        if (phase === "target") state.authProfileResponseAt = performance.now();
        await route.fulfill({
          status: 200,
          headers: jsonHeaders,
          body: JSON.stringify({
            id: "synthetic-viewer", username: "synthetic", display_name: "Synthetic Viewer",
            avatar_url: null, tier: "free", role: "user", created_at: "2026-01-01T00:00:00.000Z",
          }),
        });
        return;
      }
      if (phase === "target") {
        state.dataReads.push({ at, method: request.method(), path: `${url.pathname}${url.search}` });
      }
      if (url.pathname.startsWith("/auth/v1/")) {
        await route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({ user: null }) });
      } else {
        await route.fulfill({ status: 200, headers: jsonHeaders, body: url.pathname.includes("/rpc/") ? "null" : "[]" });
      }
      return;
    }
    if (phase === "target" && !["fonts.googleapis.com", "fonts.gstatic.com"].includes(url.hostname)) {
      state.externalSideEffects.push({ at, method: request.method(), url: request.url() });
    }
    await route.abort("blockedbyclient");
  });

  const page = await context.newPage();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (phase === "target" && url.origin === origin && url.pathname === targetAsset && !failChunk) {
      state.routeRequests.push(performance.now());
    }
  });

  if (internal) {
    await page.goto(`${origin}/post/synthetic-control`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".surface-post", { timeout: 6000 });
    assert.equal(state.routeRequests.length, 0, `${name}: an unrequested route must not preload during Post setup`);
    phase = "target";
    state.navStart = performance.now();
    await page.evaluate((target) => {
      history.pushState({ synthetic: true }, "", target);
      window.dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
    }, path);
  } else {
    state.navStart = performance.now();
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded" });
  }

  if (flagsDelay >= 1000 || authProfileDelay >= 1000) {
    await sleep(250);
    state.earlyDom = await page.evaluate(() => ({
      world: document.querySelectorAll(".surface-world").length,
      number: document.querySelectorAll(".surface-number").length,
      locked: document.querySelectorAll(".mlock").length,
      routeFailure: document.querySelectorAll("[data-route-load-failure]").length,
      protectedText: /העולם של סוד 1820|דף המספר/.test(document.body.textContent || ""),
    }));
  }

  const gateTimeout = Math.max(flagsDelay, authProfileDelay) + 6500;
  if (kind === "post") {
    await page.waitForSelector(".surface-post", { timeout: gateTimeout });
    const flagDeadline = performance.now() + gateTimeout;
    while (!state.flagResponseAt && performance.now() < flagDeadline) await sleep(20);
  } else if (failChunk) {
    await page.waitForSelector("[data-route-load-failure]", { timeout: gateTimeout });
    await sleep(1200);
  } else if (locked) {
    await page.waitForSelector(".mlock", { timeout: gateTimeout });
  } else if (expectSurface) {
    await page.waitForSelector(`.surface-${kind}`, { timeout: gateTimeout });
  } else {
    await sleep(Math.max(600, flagsDelay + 200));
  }

  state.finalDom = await page.evaluate(() => ({
    world: document.querySelectorAll(".surface-world").length,
    number: document.querySelectorAll(".surface-number").length,
    post: document.querySelectorAll(".surface-post").length,
    locked: document.querySelectorAll(".mlock").length,
    routeFailure: document.querySelectorAll("[data-route-load-failure]").length,
    reloadLink: [...document.querySelectorAll("a")].some((node) => /טען מחדש/.test(node.textContent || "")),
  }));

  const gateReadyAt = Math.max(state.flagResponseAt || 0, state.authProfileResponseAt || 0);
  state.routeRequestStartMs = state.routeRequests.length
    ? Number((state.routeRequests[0] - state.navStart).toFixed(1)) : null;
  state.routeBeforeGate = state.routeRequests.length > 0 && gateReadyAt > 0 && state.routeRequests[0] < gateReadyAt;
  state.earlyDataReads = state.dataReads.filter((entry) => gateReadyAt > 0 && entry.at < gateReadyAt);
  state.earlyExternalSideEffects = state.externalSideEffects.filter((entry) => gateReadyAt > 0 && entry.at < gateReadyAt);
  state.routeRequestCount = state.routeRequests.length;
  delete state.navStart;
  delete state.routeRequests;
  delete state.flagResponseAt;
  delete state.authProfileResponseAt;
  await context.close();
  return state;
}

test("Locked starts only current World/Number route code in parallel and keeps access authoritative", { skip: !runnable, timeout: 120_000 }, async () => {
  assert.ok(["before", "after"].includes(expected), "LOCKED_ROUTE_EXPECT must be before or after");
  const manifest = JSON.parse(await readFile(resolve(dist, ".vite/manifest.json"), "utf8"));
  const assets = {
    world: manifestAsset(manifest, "src/pages/World2029Page.jsx"),
    number: manifestAsset(manifest, "src/pages/Number2029Page.jsx"),
    post: manifestAsset(manifest, "src/pages/Post2029Page.jsx"),
  };
  const server = await localServer();
  const browser = await chromium.launch({ executablePath: chromiumPath, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const rows = [];
  try {
    const measured = [
      { name: "world-direct-flags-0", kind: "world", path: "/world", flagsDelay: 0 },
      { name: "world-direct-flags-1500", kind: "world", path: "/world", flagsDelay: 1500 },
      { name: "number-direct-flags-0", kind: "number", path: "/number/718", flagsDelay: 0 },
      { name: "number-direct-flags-1500", kind: "number", path: "/number/718", flagsDelay: 1500 },
      { name: "post-control-flags-1500", kind: "post", path: "/post/synthetic-control", flagsDelay: 1500 },
    ];
    for (const scenario of measured) {
      for (let sample = 1; sample <= reps; sample += 1) {
        rows.push({ sample, ...(await runScenario(browser, server.origin, assets, scenario)) });
      }
    }

    const delayedRoutes = rows.filter((row) => row.flagsDelay === 1500 && row.kind !== "post");
    const delayedPost = rows.filter((row) => row.name === "post-control-flags-1500");
    if (expected === "before") {
      for (const row of delayedRoutes) {
        assert.equal(row.routeBeforeGate, false, `${row.name}: baseline route code should still wait for Locked`);
        assert.equal(row.earlyDom?.world + row.earlyDom?.number, 0);
        if (row.kind === "world") {
          assert.equal(row.earlyDataReads.length, 1, "baseline World head reader is the documented early-data blocker");
          assert.match(row.earlyDataReads[0].path, /^\/rest\/v1\/posts\?.*flydubai-fz1073-363-14000-remzei-geula/);
        } else {
          assert.deepEqual(row.earlyDataReads, [], "baseline Number performs no route data read before Locked");
        }
      }
    } else {
      for (const row of delayedRoutes) {
        assert.equal(row.routeBeforeGate, true, `${row.name}: route code must start before the delayed gate finishes`);
        assert.equal(row.earlyDom?.world + row.earlyDom?.number, 0, `${row.name}: route must not mount while the gate loads`);
        assert.equal(row.earlyDom?.protectedText, false, `${row.name}: protected route content must not enter the DOM`);
        assert.deepEqual(row.earlyDataReads, [], `${row.name}: route data must not start before access`);
        assert.deepEqual(row.earlyExternalSideEffects, [], `${row.name}: route analytics/side effects must not start before access`);
      }
    }
    for (const row of delayedPost) {
      assert.equal(row.routeBeforeGate, true, "Post is the non-Locked control and must not wait for site_flags");
    }

    if (expected === "after") {
      const acceptance = [
        { name: "world-blocked", kind: "world", path: "/world", flagsDelay: 1500, locked: true },
        { name: "number-blocked", kind: "number", path: "/number/718", flagsDelay: 1500, locked: true },
        { name: "world-auth-loading-unauthorized", kind: "world", path: "/world", flagsDelay: 0, locked: true, authProfileDelay: 1500 },
        { name: "world-internal-flags-1500", kind: "world", path: "/world", flagsDelay: 1500, internal: true },
        { name: "number-internal-flags-1500", kind: "number", path: "/number/718", flagsDelay: 1500, internal: true },
        { name: "home-does-not-preload-world", kind: "world", path: "/", flagsDelay: 0, expectSurface: false },
        { name: "home-does-not-preload-number", kind: "number", path: "/", flagsDelay: 0, expectSurface: false },
        { name: "world-chunk-failure", kind: "world", path: "/world", flagsDelay: 150, failChunk: true },
      ];
      for (const scenario of acceptance) rows.push({ sample: 1, ...(await runScenario(browser, server.origin, assets, scenario)) });

      for (const name of ["world-blocked", "number-blocked", "world-auth-loading-unauthorized"]) {
        const row = rows.find((item) => item.name === name);
        assert.equal(row.routeBeforeGate, true, `${name}: only code preparation should run during the gate`);
        assert.equal(row.earlyDom?.world + row.earlyDom?.number, 0, `${name}: no protected mount while loading`);
        assert.equal(row.finalDom.locked, 1, `${name}: the canonical lock decision must still render`);
        assert.equal(row.finalDom.world + row.finalDom.number, 0, `${name}: blocked route must never mount`);
        assert.deepEqual(row.dataReads, [], `${name}: blocked route must issue zero data reads`);
        assert.deepEqual(row.earlyExternalSideEffects, [], `${name}: no early route side effects`);
      }
      for (const name of ["world-internal-flags-1500", "number-internal-flags-1500"]) {
        const row = rows.find((item) => item.name === name);
        assert.equal(row.routeBeforeGate, true, `${name}: internal navigation must prepare current route code in parallel`);
        assert.equal(row.earlyDom?.world + row.earlyDom?.number, 0, `${name}: internal navigation must remain unmounted while gated`);
        assert.deepEqual(row.earlyDataReads, [], `${name}: internal navigation must not read route data early`);
      }
      for (const name of ["home-does-not-preload-world", "home-does-not-preload-number"]) {
        const row = rows.find((item) => item.name === name);
        assert.equal(row.routeRequestCount, 0, `${name}: Home must not request an unrelated route module`);
      }
      const failure = rows.find((item) => item.name === "world-chunk-failure");
      assert.equal(failure.routeRequestCount, 1, "a failed route chunk must not enter an automatic retry loop");
      assert.equal(failure.finalDom.routeFailure, 1, "a failed route chunk must have a recoverable visible state");
      assert.equal(failure.finalDom.reloadLink, true, "chunk failure must offer an explicit same-address reload");
    }

    const summary = {};
    for (const delay of [0, 1500]) {
      for (const kind of ["world", "number", "post"]) {
        const values = rows
          .filter((row) => row.kind === kind && row.flagsDelay === delay && row.routeRequestStartMs != null
            && (row.name.includes("direct") || row.name === `post-control-flags-${delay}`))
          .map((row) => row.routeRequestStartMs);
        if (values.length) summary[`${kind}_${delay}ms`] = {
          samplesMs: values, medianMs: Number(median(values).toFixed(1)),
        };
      }
    }
    const report = {
      schema: "locked-route-parallel-start-2029.v1",
      expected, synthetic: true, loopbackOnly: true, reps,
      browser: browser.version(), dist, assets, summary, scenarios: rows,
    };
    if (output) {
      await mkdir(resolve(output, ".."), { recursive: true });
      await writeFile(resolve(output), `${JSON.stringify(report, null, 2)}\n`);
    }
    console.log(`# locked-route evidence ${JSON.stringify(summary)}`);
  } finally {
    await browser.close();
    await server.close();
  }
});
