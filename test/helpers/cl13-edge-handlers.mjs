// CL-13 — runs the REAL Edge handlers that read or write personal memory, with the memory calls answered by a throwaway
// PostgreSQL (test/helpers/cl13-pg-bridge.mjs) and every provider mocked. Types are erased and only the imports are replaced;
// the shared policy module is the production module. Unknown I/O fails the run.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { createMaterialGate, conversationalLimit } from "../../supabase/functions/_shared/materialGate.js";
import { createRazielInterview } from "../../supabase/functions/_shared/razielInterview.js";
import { readPersonalMemoryPolicy, readResearchContext, gatePersonalContext, personalMemorySaveStatus } from "../../supabase/functions/_shared/personalMemoryPolicy.js";
import { runAiAnalyze } from "./ai-analyze-handler.mjs";
import { runWaRaziel } from "./wa-raziel-handler.mjs";

export const UA = "11111111-1111-4111-8111-111111111111";          // an account holder with a stored thread and a verified phone
export const UB = "22222222-2222-4222-8222-222222222222";          // another account holder
export const PHONE_A = "972500000001";                              // the phone the wa-raziel harness sends from
export const BOT_PERSON = { "wa-hatishbi": "972511111111@c.us", "wa-uriel": "972522222222@c.us" };
const TOKENS = { "token-admin-a": { id: UA, role: "admin" }, "token-user-a": { id: UA, role: "user" }, "token-user-b": { id: UB, role: "user" } };
const SERVICE = "synthetic-service-key", ANON = "synthetic-anon-key";
const source = (name) => readFileSync(new URL(`../../supabase/functions/${name}/index.ts`, import.meta.url), "utf8");
const imports = (text) => [...text.matchAll(/^import .*;$/gm)].map(([line]) => line);

// ── the two site endpoints that keep the conversation thread (number-researcher, raziel-attention) ──
// Returns { call(body, token), models, calls }: `models` are the requests that reached the model (the built context).
// `deployed` = { text, materialGate }: run the DEPLOYED source (read from git by the caller) with the deployed gate module
// instead of the source of this branch - for the intermediate states (test/cl13-intermediate-states.test.mjs).
export function siteThreadHandler(name, pg, { deployed = null } = {}) {
  const text = deployed ? deployed.text : source(name);
  const gate = deployed ? deployed.materialGate : { createMaterialGate, conversationalLimit };
  assert.deepEqual(imports(text), deployed ? [
    name === "number-researcher" ? 'import { createMaterialGate, conversationalLimit } from "../_shared/materialGate.js";' : 'import { createMaterialGate } from "../_shared/materialGate.js";',
  ] : name === "number-researcher" ? [
    'import { createMaterialGate, conversationalLimit } from "../_shared/materialGate.js";',
    'import { createRazielInterview } from "../_shared/razielInterview.js";',
    'import { readPersonalMemoryPolicy, gatePersonalContext, personalMemorySaveStatus } from "../_shared/personalMemoryPolicy.js";',
  ] : [
    'import { createMaterialGate } from "../_shared/materialGate.js";',
    'import { readPersonalMemoryPolicy, gatePersonalContext, personalMemorySaveStatus } from "../_shared/personalMemoryPolicy.js";',
  ], "new handler dependencies require explicit review");
  const calls = [], models = [], unexpected = [];
  const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(String(input)), fn = url.pathname.split("/").at(-1);
    const headers = new Headers(init.headers), token = (headers.get("Authorization") || "").replace(/^Bearer /, "");
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ name: fn, url: url.href, method: init.method || "GET", body });
    if (url.origin === "https://api.anthropic.com") {
      models.push({ system: body.system, user: body.messages[0].content });
      return reply({ content: [{ type: "text", text: `MODEL-REPLY-${models.length}` }], usage: { input_tokens: 10, output_tokens: 5 } });
    }
    if (url.origin !== "https://fixture.invalid") { unexpected.push(url.href); throw new Error("unexpected origin"); }
    const memory = pg.rest(input, init);                       // the personal-memory routes: real SQL on the throwaway database
    if (memory) { assert.equal(token, SERVICE, "memory is reached with the service key only"); return memory; }
    if (url.pathname === "/auth/v1/user") { const who = TOKENS[token]; return reply(who ? { id: who.id, is_anonymous: false } : {}, who ? 200 : 401); }
    if (url.pathname === "/rest/v1/users") { const uid = url.searchParams.get("id")?.slice(3); return reply([{ role: Object.values(TOKENS).find((t) => t.id === uid && t.role === "admin") ? "admin" : "user" }]); }
    if (url.pathname === "/rest/v1/raziel_brain") return reply([{ voice_version: "fixture", updated_at: null }]);
    if (url.pathname === "/rest/v1/decision_ledger") return reply([]);
    if (url.pathname === "/rest/v1/ai_token_log") return reply([{ id: 1 }]);
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      if (fn === "edge_rate_limit_check") return reply({ allowed: true, count: 1, limit: body.p_limit, window_seconds: body.p_window_seconds });
      if (fn === "ai_quota_check") return reply({ allowed: true, used: 1, limit: body.p_limit_override, tier: body.p_tier });
      if (fn === "fn_capability_execution_gate_v1") return reply({ allowed: true, availability: { allowed: true }, entitlement: { allowed: true }, budget: { allowed: true } });
      if (fn === "op_trace_begin_v1") return reply({ trace_id: body.p_trace_id, root_span_id: body.p_root_span_id });
      if (["op_trace_record_span_v1", "op_trace_finish_v1", "op_trace_link_ai_cost_v1"].includes(fn)) return reply({ ok: true });
      if (fn === "fn_raziel_persona") return reply("SYNTHETIC_RAZIEL_PERSONA");
      if (fn === "metatron_context") return reply({ canonical: {}, context_version: "fixture" });
      if (fn === "fn_number_dossier") return reply({ facts: {}, decisions: [], preferences: [] });
      if (["fn_rules_snapshot", "fn_engine_snapshot", "fn_raziel_relevant_rules"].includes(fn)) return reply([]);
    }
    unexpected.push(url.href); throw new Error(`unexpected mocked endpoint: ${url.pathname}`);
  };
  let fn;
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: SERVICE, SUPABASE_ANON_KEY: ANON, ANTHROPIC_API_KEY: "synthetic-model-key" };
  runInNewContext(stripTypeScriptTypes(text.replace(/^import .*;\n/gm, "")), {
    Deno: { env: { get: (k) => env[k] }, serve: (f) => { fn = f; } },
    createMaterialGate: (opts) => gate.createMaterialGate({ ...opts, fetchImpl }), conversationalLimit: gate.conversationalLimit,
    createRazielInterview: (opts) => createRazielInterview({ ...opts, fetchImpl }),
    readPersonalMemoryPolicy, gatePersonalContext, personalMemorySaveStatus,
    fetch: fetchImpl, Request, Response, Headers, URL, AbortController, AbortSignal, TextEncoder, TextDecoder, crypto: webcrypto, setTimeout, clearTimeout,
  });
  const call = async (body, token = "token-admin-a") => {
    const response = await fn(new Request(`https://fixture.invalid/${name}`, { method: "POST", headers: { "Content-Type": "application/json", "cf-connecting-ip": "192.0.2.10", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
    assert.deepEqual(unexpected, [], "all I/O must remain mocked");
    return { status: response.status, body: await response.json() };
  };
  return { call, models, calls };
}

// ── ai-analyze: the memory calls of the real handler go to the throwaway database ──
export async function aiAnalyzeOnPg(pg, options = {}) {
  return runAiAnalyze({
    allowed: true,
    extraRoute: async ({ url, init }) => pg.rest(url, init),
    ...options,
  });
}

// ── wa-raziel: the memory functions of the real handler go to the throwaway database ──
export async function waRazielOnPg(pg, { text, linked = true, id = `m-${Date.now()}-${Math.random()}`, ...rest } = {}) {
  const real = (name) => async (args) => { const r = pg.rpc(name, args); return { data: r.data, error: r.error }; };
  return runWaRaziel({
    incoming: { id, text },
    identity: linked ? { linked: true, user_ref: UA, user_id: UA } : { linked: false },
    // a sender without an account is answered only after the go-live time of the DM policy
    dmPolicy: { go_live_at: new Date(Date.now() - 86400_000).toISOString() },
    rpcOverrides: {
      fn_personal_memory_policy_v1: real("fn_personal_memory_policy_v1"), fn_raziel_context: real("fn_raziel_context"),
      fn_raziel_remember: real("fn_raziel_remember"), fn_raziel_fact: real("fn_raziel_fact"),
    },
    ...rest,
  });
}

// ── wa-raziel, the GROUP path. The product keeps it off with a constant (GROUPS_ENABLED = false); here that one constant is
// switched on in the copy of the source the test runs, so that "nothing personal in a group" is tested on the real code path.
export const GROUP = "120363000000000001@g.us";
export async function waRazielGroupOnPg(pg, { text, senderLinked = true }) {
  const original = source("wa-raziel");
  assert.equal(original.match(/const GROUPS_ENABLED = false;/g)?.length, 1, "the group path is off in the product");
  return waRazielOnPg(pg, {
    text: "הודעה פרטית שאינה קשורה", linked: senderLinked, id: `dm-${Math.random()}`,
    source: original.replace("const GROUPS_ENABLED = false;", "const GROUPS_ENABLED = true;"),
    group: { chatId: GROUP, senderId: `${PHONE_A}@c.us`, senderName: "A", text, id: `g-${Math.random()}` },
    envOverrides: { WA_RAZIEL_AMIT_GROUP: GROUP, ANTHROPIC_API_KEY: "synthetic-model-key" },
    tableRows: { wa_vip_senders: [{ raziel_access: true }] },
  });
}

// ── the two research bots (wa-hatishbi, wa-uriel) ──
// The handler carries the phone of a real person as a constant; it is replaced by a synthetic one before the handler runs.
// `deployedText` = the DEPLOYED source (read from git by the caller) instead of the source of this branch.
export async function runResearchBot(name, pg, { incomingText, modelText, deployedText = null }) {
  let text = deployedText ?? source(name);
  assert.deepEqual(imports(text), [
    name === "wa-hatishbi" ? "import { createClient } from 'jsr:@supabase/supabase-js@2';" : 'import { createClient } from "jsr:@supabase/supabase-js@2";',
    'import { waAdmin as waGreen } from "../_shared/waGreen.ts";',
    ...(deployedText ? [] : ['import { readPersonalMemoryPolicy, readResearchContext } from "../_shared/personalMemoryPolicy.js";']),
  ], "new handler dependencies require explicit review");
  const person = BOT_PERSON[name];
  const constant = name === "wa-hatishbi" ? /const YISKA = '[^']+';/ : /const CHRISTINA = "[^"]+";/;
  assert.equal(text.match(new RegExp(constant.source, "g"))?.length, 1, "exactly one person constant");
  text = text.replace(constant, name === "wa-hatishbi" ? `const YISKA = '${person}';` : `const CHRISTINA = "${person}";`);
  const now = Math.floor(Date.now() / 1000), sent = [], models = [], unexpected = [];
  const incoming = { idMessage: `in-${now}-${Math.random()}`, type: "incoming", chatId: person, timestamp: now - 5, typeMessage: "textMessage", textMessage: incomingText };
  // the bot was introduced before (so this is not the introduction message)
  const sb = pg.supabaseClient({ tables: { wa_bot_log: [], bot_outbox: [], uriel_drafts: [], ai_token_log: [] }, rpcMocks: { fn_all_methods: null } });
  const from = sb.from;
  sb.from = (table) => {
    const builder = from(table);
    if (table === "wa_bot_log") {
      // alreadyDone(msg) -> not done; introduced() -> yes (a previous reply exists); sentLastHour() -> 0
      builder.maybeSingle = async () => ({ data: null, error: null });
      builder.then = (resolve, reject) => Promise.resolve({ data: [{ id: 1 }], error: null, count: 0 }).then(resolve, reject);
    }
    return builder;
  };
  const waGreen = async (_sb, method, payload) => {
    if (method === "getChatHistory") return { result: [incoming] };
    if (method === "sendMessage") { sent.push(payload); return { result: { idMessage: `out-${sent.length}` } }; }
    return { result: {} };
  };
  const fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.origin === "https://api.anthropic.com") {
      const body = JSON.parse(init.body); models.push({ system: body.system, user: body.messages[0].content });
      return new Response(JSON.stringify({ content: [{ type: "text", text: modelText }], usage: { input_tokens: 10, output_tokens: 5 } }), { status: 200 });
    }
    unexpected.push(url.href); throw new Error(`unexpected fetch: ${url.href}`);
  };
  const env = { FB_ADMIN_KEY: "admin-key", SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: SERVICE, ANTHROPIC_API_KEY: "synthetic-model-key", ZURIEL_WA: "972500000000@c.us" };
  let handler;
  runInNewContext(stripTypeScriptTypes(text.replace(/^import .*;\n/gm, "")), {
    Deno: { env: { get: (k) => env[k] }, serve: (f) => { handler = f; } },
    createClient: () => sb, waGreen, readPersonalMemoryPolicy, readResearchContext,
    fetch, Request, Response, Headers, URL, AbortSignal, TextEncoder, TextDecoder, console, crypto: webcrypto, setTimeout, clearTimeout,
  }, { filename: `${name}/index.ts`, timeout: 5000 });
  const response = await handler(new Request(`https://fixture.invalid/functions/v1/${name}?debug=1`, { headers: { "x-fb-admin-key": "admin-key" } }));
  const body = await response.json();
  assert.deepEqual(unexpected, [], "all I/O must remain mocked");
  return { status: response.status, body, sent: sent.filter((m) => m.chatId === person), models, inserts: sb.inserts, rpcCalls: sb.rpcCalls };
}
