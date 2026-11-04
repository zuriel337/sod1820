import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { rolldown } from "rolldown";

const journeyEntry = new URL("../supabase/functions/journey-message/index.ts", import.meta.url).pathname;
const thumbEntry = new URL("../supabase/functions/capture-video-thumb/index.ts", import.meta.url).pathname;
const migration = readFileSync(
  new URL("../supabase/migrations/20261024152312_p0_emergency_public_surface_containment_v1.sql", import.meta.url),
  "utf8",
);
const journeySource = readFileSync(journeyEntry, "utf8");
const thumbSource = readFileSync(thumbEntry, "utf8");
const videoThumbSource = readFileSync(new URL("../src/lib/videoThumb.js", import.meta.url), "utf8");

async function loadEdgeHandler(entry) {
  let handler = null;
  const originalDeno = globalThis.Deno;

  globalThis.Deno = {
    env: {
      get(name) {
        if (name === "SUPABASE_URL") return "https://fixture.supabase.test";
        if (name === "SUPABASE_SERVICE_ROLE_KEY") return "fixture-service-role";
        if (name === "SUPABASE_ANON_KEY") return "fixture-anon";
        if (name === "ANTHROPIC_API_KEY") return "fixture-anthropic";
        return "";
      },
    },
    serve(fn) { handler = fn; },
  };

  const bundle = await rolldown({
    input: entry,
    platform: "neutral",
    plugins: [{
      name: "fixture-edge-runtime",
      resolveId(id) {
        return id.startsWith("jsr:@supabase/functions-js/") ? "\0fixture-edge-runtime" : null;
      },
      load(id) {
        return id === "\0fixture-edge-runtime" ? "export {};" : null;
      },
    }],
  });
  const generated = await bundle.generate({ format: "esm" });
  await bundle.close();
  const code = generated.output.find((item) => item.type === "chunk")?.code;
  assert.ok(code, "edge bundle must contain an executable chunk");

  const uniqueCode = `${code}\n// fixture:${crypto.randomUUID()}`;
  await import(`data:text/javascript;base64,${Buffer.from(uniqueCode).toString("base64")}`);
  assert.equal(typeof handler, "function");

  return {
    handler,
    restore() {
      if (originalDeno === undefined) delete globalThis.Deno;
      else globalThis.Deno = originalDeno;
    },
  };
}

function journeyRequest(body, headers = {}) {
  return new Request("https://fixture.test/journey-message", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.9",
      "user-agent": "fixture-browser",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("P0 migration is bounded to exact RPC ACL and gallery policy containment", () => {
  assert.match(migration, /begin;/i);
  assert.match(migration, /lock_timeout = '5s'/);
  assert.match(migration, /statement_timeout = '30s'/);
  assert.match(migration, /672b0dc0568a7c79c94fa49b03b580e0/);
  assert.match(migration, /f1ab9e06ff969f474acb576a8d64d08e/);
  assert.match(migration, /revoke execute on function public\.sod_fb_call\(text,jsonb,integer,boolean\)[\s\S]*from public, anon, authenticated;/i);
  assert.match(migration, /grant execute on function public\.sod_fb_call\(text,jsonb,integer,boolean\)[\s\S]*to service_role;/i);
  assert.match(migration, /revoke execute on function public\.wa_add_vip_word\(text,text,text\)[\s\S]*from public, anon, authenticated;/i);
  assert.match(migration, /grant execute on function public\.wa_add_vip_word\(text,text,text\)[\s\S]*to service_role;/i);
  assert.match(migration, /drop policy if exists "allow_insert_anon" on public\.gallery_posts;/i);
  assert.match(migration, /drop policy if exists "allow_select_anon" on public\.gallery_posts;/i);
  assert.match(migration, /revoke insert on table public\.gallery_posts from anon;/i);
  assert.match(migration, /קריאה פתוחה לגלריה/);
  assert.match(migration, /admin מנהל גלריה/);
  assert.match(migration, /gallery policy inventory drifted/);
  assert.match(migration, /unexpected direct EXECUTE grantee/);
  assert.match(migration, /unexpected gallery policy remains/);
  assert.doesNotMatch(migration, /create\s+or\s+replace\s+function/i);
  assert.doesNotMatch(migration, /update\s+public\.gallery_posts|delete\s+from\s+public\.gallery_posts/i);
});

test("edge HTTP contracts keep preflight cheap and explicit", async (t) => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const runtime = await loadEdgeHandler(journeyEntry);
  t.after(() => {
    runtime.restore();
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("unexpected fetch");
  };

  const options = await runtime.handler(new Request("https://fixture.test", { method: "OPTIONS" }));
  assert.equal(options.status, 204);
  assert.match(options.headers.get("access-control-allow-methods"), /POST/);
  assert.match(options.headers.get("access-control-allow-headers"), /authorization/);

  const get = await runtime.handler(new Request("https://fixture.test", { method: "GET" }));
  assert.equal(get.status, 405);

  const malformed = await runtime.handler(journeyRequest("{"));
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, "bad_json");

  const unsafe = await runtime.handler(journeyRequest({ value: Number.MAX_SAFE_INTEGER + 1, path: ["א", "ב"] }));
  assert.equal(unsafe.status, 400);
  assert.equal((await unsafe.json()).error, "bad_input");
  assert.equal(calls, 0);
});

test("capture-video-thumb is an inert 410 tombstone with no privileged writer", async (t) => {
  for (const forbidden of ["SUPABASE_SERVICE_ROLE_KEY", "createClient", ".upload(", ".update(", "channel_updates"]) {
    assert.ok(!thumbSource.includes(forbidden), `tombstone must not contain ${forbidden}`);
  }
  assert.match(thumbSource, /status:\s*410/);
  assert.match(thumbSource, /backend-media-thumbs/);
  assert.match(videoThumbSource, /owner:\s*"backend-media-thumbs"/);

  const runtime = await loadEdgeHandler(thumbEntry);
  t.after(() => runtime.restore());

  const options = await runtime.handler(new Request("https://fixture.test", { method: "OPTIONS" }));
  assert.equal(options.status, 204);

  const post = await runtime.handler(new Request("https://fixture.test", { method: "POST" }));
  assert.equal(post.status, 410);
  assert.deepEqual(await post.json(), {
    ok: false,
    retired: true,
    error: "gone",
    replacement: "backend-media-thumbs",
  });
});

test("journey rejects oversized payload before any rate or provider call", async (t) => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const runtime = await loadEdgeHandler(journeyEntry);
  t.after(() => {
    runtime.restore();
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error("unexpected fetch");
  };

  const response = await runtime.handler(journeyRequest(`{"value":1820,"path":["a","b"],"meaning":"${"x".repeat(17_000)}"}`));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error, "payload_too_large");
  assert.equal(calls, 0);
});

test("journey fails closed when the server limiter is unavailable", async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const runtime = await loadEdgeHandler(journeyEntry);
  t.after(() => {
    runtime.restore();
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response("backend unavailable", { status: 503 });
  };

  const response = await runtime.handler(journeyRequest({ value: 1820, path: ["א", "ב"] }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "rate_limit_unavailable");
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\/rpc\/edge_rate_limit_check$/);
});

test("journey returns 429 + Retry-After without reaching trace, gate or provider", async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const runtime = await loadEdgeHandler(journeyEntry);
  t.after(() => {
    runtime.restore();
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (input, init = {}) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ allowed: false, count: 13, limit: 12, window_seconds: 3600 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const response = await runtime.handler(journeyRequest({ value: 1820, path: ["א", "ב"] }));
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("retry-after")) > 0);
  const body = await response.json();
  assert.equal(body.error, "rate_limited");
  assert.ok(body.retry_after_seconds > 0);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rpc\/edge_rate_limit_check$/);
  const rpcBody = JSON.parse(calls[0].init.body);
  assert.match(rpcBody.p_key_hash, /^[0-9a-f]{64}$/);
  assert.equal(rpcBody.p_window_seconds, 3600);
  assert.equal(rpcBody.p_limit, 12);
  assert.ok(!calls[0].init.body.includes("203.0.113.9"));
});

test("anonymous limiter key cannot be rotated with user-agent or a spoofed first XFF hop", async (t) => {
  const originalFetch = globalThis.fetch;
  const keys = [];
  const runtime = await loadEdgeHandler(journeyEntry);
  t.after(() => {
    runtime.restore();
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (_input, init = {}) => {
    keys.push(JSON.parse(init.body).p_key_hash);
    return Response.json({ allowed: false, count: 13, limit: 12, window_seconds: "invalid" });
  };

  const first = await runtime.handler(journeyRequest(
    { value: 1820, path: ["א", "ב"] },
    { "x-forwarded-for": "198.51.100.1, 192.0.2.20", "user-agent": "rotating-a" },
  ));
  const second = await runtime.handler(journeyRequest(
    { value: 1820, path: ["א", "ב"] },
    { "x-forwarded-for": "198.51.100.99, 192.0.2.20", "user-agent": "rotating-b" },
  ));

  assert.equal(first.status, 429);
  assert.equal(second.status, 429);
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
  assert.match(first.headers.get("retry-after"), /^\d+$/);
  assert.ok(Number(first.headers.get("retry-after")) >= 1);
});

test("verified caller receives 40/hour and global denial uses a separate 120/hour bucket", async (t) => {
  const originalFetch = globalThis.fetch;
  const limiterBodies = [];
  let forbiddenDownstreamCalls = 0;
  const runtime = await loadEdgeHandler(journeyEntry);
  t.after(() => {
    runtime.restore();
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/user")) {
      return Response.json({ id: "11111111-1111-4111-8111-111111111111" });
    }
    if (url.includes("/rest/v1/users?")) return Response.json([{ role: "user" }]);
    if (url.endsWith("/rpc/edge_rate_limit_check")) {
      const body = JSON.parse(init.body);
      limiterBodies.push(body);
      return Response.json({
        allowed: limiterBodies.length === 1,
        count: limiterBodies.length,
        limit: body.p_limit,
        window_seconds: 3600,
      });
    }
    forbiddenDownstreamCalls += 1;
    throw new Error(`unexpected downstream URL ${url}`);
  };

  const response = await runtime.handler(journeyRequest(
    { value: 1820, path: ["א", "ב"] },
    { authorization: "Bearer verified-user-token" },
  ));
  assert.equal(response.status, 429);
  assert.equal(limiterBodies.length, 2);
  assert.equal(limiterBodies[0].p_limit, 40);
  assert.equal(limiterBodies[1].p_limit, 120);
  assert.notEqual(limiterBodies[0].p_key_hash, limiterBodies[1].p_key_hash);
  assert.equal(forbiddenDownstreamCalls, 0);
});

test("journey limiter precedes the public/no-budget gate and provider", async (t) => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let limiterCalls = 0;
  let gateBody = null;
  let providerCalls = 0;
  const runtime = await loadEdgeHandler(journeyEntry);
  t.after(() => {
    runtime.restore();
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/rpc/edge_rate_limit_check")) {
      limiterCalls += 1;
      const requestBody = JSON.parse(init.body);
      assert.match(requestBody.p_key_hash, /^[0-9a-f]{64}$/);
      assert.ok(!init.body.includes("203.0.113.9"));
      return Response.json({ allowed: true, count: 1, limit: requestBody.p_limit, window_seconds: 3600 });
    }
    if (url.endsWith("/rpc/op_trace_begin_v1")) {
      return Response.json({
        trace_id: "11111111-1111-4111-8111-111111111111",
        root_span_id: "22222222-2222-4222-8222-222222222222",
      });
    }
    if (url.endsWith("/rpc/fn_capability_execution_gate_v1")) {
      gateBody = JSON.parse(init.body);
      return Response.json({
        allowed: true,
        availability: { allowed: true },
        entitlement: { allowed: true },
        budget: { allowed: true },
      });
    }
    if (url.includes("api.anthropic.com/v1/messages")) {
      providerCalls += 1;
      return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "מסר בדיקה" }] });
    }
    if (url.includes("/rest/v1/rpc/")) return Response.json({ ok: true });
    throw new Error(`unexpected URL ${url}`);
  };

  const response = await runtime.handler(journeyRequest({ value: 1820, path: ["א", "ב"] }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).message, "מסר בדיקה");
  assert.equal(limiterCalls, 2, "identity and global buckets must both pass");
  assert.equal(providerCalls, 1);
  assert.equal(gateBody.p_required_entitlement, "public");
  assert.equal(gateBody.p_budget_kind, "none");
  assert.ok(calls[0].endsWith("/rpc/edge_rate_limit_check"));
  assert.ok(calls[1].endsWith("/rpc/edge_rate_limit_check"));
  assert.ok(calls.indexOf("https://api.anthropic.com/v1/messages") > 1);
});

test("journey source keeps free-public semantics while adding atomic containment", () => {
  assert.match(journeySource, /serviceRpc\("edge_rate_limit_check"/);
  assert.match(journeySource, /requiredEntitlement:\s*"public",\s*budgetKind:\s*"none"/);
  assert.match(journeySource, /MAX_REQUEST_BYTES = 16 \* 1024/);
  assert.match(journeySource, /RATE_LIMIT_ANON = 12/);
  assert.match(journeySource, /RATE_LIMIT_VERIFIED = 40/);
  assert.match(journeySource, /RATE_LIMIT_GLOBAL = 120/);
  assert.match(journeySource, /forwarded\.at\(-1\)/);
  assert.doesNotMatch(journeySource, /anon:\$\{ip\}:\$\{ua\}/);
  assert.doesNotMatch(journeySource, /captcha|upstash|redis/i);
});
