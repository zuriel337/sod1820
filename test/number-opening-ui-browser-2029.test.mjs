import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { performance } from "node:perf_hooks";

const require = createRequire(import.meta.url);
let chromium = null;
try { ({ chromium } = require("playwright")); } catch {
  try { ({ chromium } = require("/opt/codex/cua_node/lib/node_modules/playwright")); } catch { /* optional outside evidence runners */ }
}

const chromiumPath = process.env.CHROMIUM_PATH || "/usr/bin/chromium";
const dist = new URL("../dist", import.meta.url).pathname;
const runnable = Boolean(chromium && existsSync(chromiumPath) && existsSync(join(dist, "2029.html")));
const jsonHeaders = {
  "access-control-allow-origin": "*",
  "access-control-expose-headers": "content-range",
  "content-type": "application/json",
  "content-range": "0-0/0",
};

function openingPayload(value) {
  const phrase = "פתיחת קומפקט";
  return {
    v: 1,
    value,
    per_method_limit: 12,
    ordering: "registry_sort_order__then_count_desc__then_regular_governed_priority_method",
    source_ordering: "governed_first__then_atomic_before_composite__then_method__phrase__bid_id",
    family_count: 1,
    source_row_count: 2,
    distinct_method_phrase_count: 2,
    opening_phrase_count: 1,
    families: [{
      method: "רגיל",
      priority: 1,
      count: 2,
      composite: false,
      component_methods: null,
      operator: null,
      governed: true,
      evidence_class: "governed",
      method_active: true,
      method_scannable: true,
      method_executable: true,
      method_engine_verified: true,
      phrases: [{
        phrase,
        world: "אמת",
        ragil: value,
        tags: ["synthetic-opening"],
        component_values: null,
        bid_id: "opening-1",
      }],
      registry: {
        method_key: "רגיל",
        db_column: "ragil",
        display_label: "רגיל",
        required_entitlement: "public",
        version: 1,
        category: "atomic",
        sort_order: 1,
        active: true,
        in_engine: true,
        scannable: true,
        execution_kind: "sql_function",
        derived_from: null,
        operator: null,
        mathematical_family: "additive",
      },
      sample: {
        returned_count: 1,
        total_count: 2,
        limit: 12,
        cursor: { method: "רגיל", phrase, bid_id: "opening-1" },
        cursor_scope: "opening_sample_checkpoint",
        has_more: true,
        complete: false,
      },
    }],
    completeness: {
      opening: true,
      families: true,
      counts: true,
      samples: false,
      full_row_population: false,
      universal_findings: false,
    },
    depth: {
      rpc: "fn_number_lookup",
      field_count: 37,
      cursor: null,
      cursor_field: "bid_id",
      has_more: true,
      complete: false,
      deferred: true,
    },
  };
}

function mime(path) {
  return ({
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
  })[extname(path)] || "application/octet-stream";
}

function startStaticServer() {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://loopback").pathname);
    const relative = normalize(pathname).replace(/^(?:\.\.(?:\/|\\|$))+/, "").replace(/^[/\\]+/, "");
    let file = join(dist, relative);
    if (!relative || !existsSync(file) || !statSync(file).isFile()) file = join(dist, "2029.html");
    const body = readFileSync(file);
    response.writeHead(200, { "content-type": mime(file), "content-length": body.length, "cache-control": "no-store" });
    response.end(body);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function waitFor(predicate, message, timeout = 8_000) {
  const started = performance.now();
  while (performance.now() - started < timeout) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail(message);
}

test("loopback opening becomes usable before depth, preserves click handoff, and does not auto-load at common widths", { skip: !runnable }, async () => {
  const server = await startStaticServer();
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({
    executablePath: chromiumPath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const receipt = [];

  try {
    for (const scenario of [
      { width: 320, height: 700, trigger: "scroll", path: "/number/1820" },
      { width: 390, height: 844, trigger: "expression-then-action", path: "/number/1820" },
      { width: 1440, height: 1000, trigger: "action", path: "/number/001820" },
    ]) {
      const context = await browser.newContext({
        viewport: { width: scenario.width, height: scenario.height },
        serviceWorkers: "block",
      });
      const reads = [];
      const errors = [];
      let compactBytes = 0;

      await context.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === origin) return route.continue();
        if (url.hostname !== "linswmnnkjxvweumprav.supabase.co") return route.abort("blockedbyclient");
        if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: jsonHeaders, body: "" });

        const rpc = url.pathname.includes("/rest/v1/rpc/") ? url.pathname.split("/").pop() : null;
        const table = url.pathname.startsWith("/rest/v1/") && !rpc ? url.pathname.split("/").pop() : null;
        const body = request.postDataJSON?.() || null;
        reads.push({ at: performance.now(), method: request.method(), path: url.pathname, rpc, table, body });

        if (table === "site_flags") {
          return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify([
            { key: "lock_number", enabled: false, message: "", mode: "all" },
            { key: "lock_world", enabled: false, message: "", mode: "all" },
            { key: "fx_analytics", enabled: false, message: "", mode: "all" },
          ]) });
        }
        if (url.pathname.startsWith("/auth/v1/")) {
          return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({ user: null }) });
        }
        if (table === "nodes") {
          const requested = url.searchParams.get("identity_key") || url.searchParams.get("label") || "eq.1820";
          const root = Number(String(requested).replace(/^eq\./, "")) || 1820;
          const node = {
            id: "18200000-0000-4000-8000-000000000001",
            type: "number",
            label: String(root),
            description: null,
            metadata: { public: true },
            identity_key: String(root),
            is_active: true,
            created_at: "2026-10-18T00:00:00.000Z",
          };
          return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify([node]) });
        }
        if (table === "number_anchors") {
          const requested = url.searchParams.get("value") || "eq.1820";
          const root = Number(String(requested).replace(/^eq\./, "")) || 1820;
          return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify({
            value: root,
            category: "synthetic",
            fact: `פתיחת קומפקט = ${root}`,
            hint: null,
            created_at: "2026-10-18T00:00:00.000Z",
            updated_at: null,
          }) });
        }
        if (rpc === "fn_number_opening_projection_2029") {
          const payload = openingPayload(Number(body?.p_value));
          const encoded = JSON.stringify(payload);
          compactBytes += Buffer.byteLength(encoded);
          return route.fulfill({ status: 200, headers: jsonHeaders, body: encoded });
        }
        if (rpc === "fn_method_profile") {
          return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify([{
            method_key: "רגיל",
            display_label: "רגיל",
            category: "atomic",
            mathematical_family: "additive",
            lifecycle_active: true,
            required_entitlement: "public",
            atomic_or_composite: "atomic",
            computed_value: 1820,
            definition_version: 1,
          }]) });
        }
        if (table === "gematria_methods") {
          return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify([{
            method_key: "רגיל",
            db_column: "ragil",
            display_label: "רגיל",
            category: "atomic",
            sort_order: 1,
            mathematical_family: "additive",
            execution_kind: "sql_function",
            derived_from: [],
            dependency_rules: [],
          }]) });
        }
        return route.fulfill({ status: 200, headers: jsonHeaders, body: rpc ? "null" : "[]" });
      });

      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${origin}${scenario.path}`, { waitUntil: "domcontentloaded" });
      await page.locator('[data-number-opening-status="ready"]').waitFor({ timeout: 15_000 });
      const firstUsableAt = performance.now();
      await page.waitForTimeout(900);

      const openingRpc = reads.find((read) => read.rpc === "fn_number_opening_projection_2029");
      const identityRead = reads.find((read) => read.table === "nodes");
      const anchorRead = reads.find((read) => read.table === "number_anchors");
      assert.ok(identityRead && openingRpc && anchorRead, `${scenario.width}: identity, compact and anchor reads observed`);
      assert.ok(identityRead.at <= openingRpc.at && identityRead.at <= anchorRead.at, `${scenario.width}: identity precedes compact and anchor`);
      assert.equal(reads.some((read) => read.rpc === "fn_number_lookup"), false, `${scenario.width}: sentinel must not auto-load depth at rest`);
      assert.equal(reads.some((read) => [
        "fn_number_dossier",
        "fn_number_journey",
        "number_neighbors",
        "fn_zero_scale",
        "fn_get_value_phrases",
        "get_all_value_phrases",
      ].includes(read.rpc)), false, `${scenario.width}: no depth/redundant opening RPC`);
      assert.equal(await page.locator('[data-number-opening-status="ready"]').getAttribute("data-number-opening-complete"), "false");
      assert.equal(await page.locator('[data-number-root="1820"]').count() > 0, true, `${scenario.width}: leading-zero route resolves to existing canonical root`);
      assert.equal(openingRpc.body?.p_value, 1820, `${scenario.width}: compact RPC receives canonical numeric root`);
      assert.equal(reads.filter((read) => read.rpc === "fn_number_opening_projection_2029").length, 1, `${scenario.width}: initial StrictMode/rerender shares one compact request`);

      if (scenario.trigger === "expression-then-action") {
        assert.equal(reads.some((read) => read.rpc === "fn_method_profile"), false, "method profile is deferred before a real click");
        await page.locator('[data-experience-capability="number-regular-expressions"] button').first().evaluate((button) => button.click());
        await waitFor(() => reads.some((read) => read.rpc === "fn_method_profile"), "compact expression click did not start its canonical method profile");
        assert.equal(reads.some((read) => read.rpc === "fn_number_lookup"), false, "expression focus loads its own reads without silently starting full depth");
      }

      let depthIntentAt;
      if (scenario.trigger === "scroll") {
        depthIntentAt = performance.now();
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      } else {
        depthIntentAt = performance.now();
        await page.locator('[data-number-depth-action="load"]').evaluate((button) => button.click());
      }
      await waitFor(() => reads.some((read) => read.rpc === "fn_number_lookup"), `${scenario.width}: explicit/near-depth trigger did not start canonical full lookup`);
      const depthRead = reads.find((read) => read.rpc === "fn_number_lookup");
      assert.ok(depthRead.at >= firstUsableAt, `${scenario.width}: first usable compact marker precedes full lookup`);
      assert.ok(depthRead.at >= depthIntentAt, `${scenario.width}: full lookup begins only after scroll/action intent`);
      assert.deepEqual(errors, [], `${scenario.width}: no browser runtime errors`);

      receipt.push({
        viewport: `${scenario.width}x${scenario.height}`,
        trigger: scenario.trigger,
        compactBytes,
        requestCountBeforeDepth: reads.filter((read) => read.at < depthIntentAt).length,
        openingBeforeDepth: true,
        autoDepthAtRest: false,
      });
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  assert.equal(receipt.length, 3);
  console.log(`NUMBER_OPENING_BROWSER_RECEIPT ${JSON.stringify(receipt)}`);
});
