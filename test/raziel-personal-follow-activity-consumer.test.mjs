import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const edge = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");
const block = edge.slice(edge.indexOf("// ── Raziel Intelligence Core v1 Phase L — personal research continuity"), edge.indexOf("// ── Raziel Intelligence Core v1 Phase J"));
const UID = "11111111-2222-3333-4444-555555555555";
const ok = (data) => ({ ok: true, data, outcome: "success", ms: 1, error: null });
const snapshot = { saved: [], cart: [], pinned: [], history: [], collections: [], journeys: [] };
const path = { ok: false, error: "not_found" };

function load(fetchImpl, spans = []) {
  const code = stripTypeScriptTypes(
    `type OperationalTraceHandle = any; type RazielOperatorResult = any; type RazielOperatorCall = any;\n` +
    `const SB_URL = "https://db.test"; const SB_ANON = "anon-key";\n` +
    `const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);\n` +
    `const coordText = (v, max) => typeof v === "string" ? v.replace(/https?:\\/\\/\\S+/gi, "").replace(/[A-Za-z0-9_\\-]{32,}/g, "").replace(/\\s+/g, " ").trim().slice(0, max) : "";\n` +
    `async function razielOperatorRpc(_bearer, call) { return ${"call.rpc === \"research_state_snapshot_v1\" ? rpcSnapshot() : rpcPath()"}; }\n${block}\n`) +
    "\nreturn { razielPersonalOwnerGet, razielPersonalSignalsProject, runRazielPersonal };";
  return new Function("fetch", "recordOperationalSpan", "crypto", "rpcSnapshot", "rpcPath", code)(
    fetchImpl, async (_trace, span) => spans.push(span), { randomUUID: () => "span-id" }, () => ok(snapshot), () => ok(path),
  );
}

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

test("personal Follow/activity consumer uses only bounded owner GETs with caller JWT and explicit uid", async () => {
  const calls = [];
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    if (url.pathname.endsWith("/notification_prefs")) return json([{ topics: ["צופן", "מסע"], updated_at: "2026-10-31T12:00:00Z" }]);
    if (url.pathname.endsWith("/subscribe_events")) return json([{ topic: "צופן", source: "topic-page", action: "follow", created_at: "2026-10-30T10:00:00Z" }]);
    if (url.pathname.endsWith("/user_activity")) return json([{ kind: "post", ref: "p-1", title: "מאמר", created_at: "2026-10-31T09:00:00Z", metadata: "PRIVATE" }]);
    throw new Error("unexpected endpoint");
  };
  const spans = [], m = load(fetchImpl, spans);
  const result = await m.runRazielPersonal({ capability: "personal_continue" }, "caller-jwt", UID, null);
  assert.equal(result.ok, true);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls.map((x) => x.init.method), ["GET", "GET", "GET"]);
  for (const { url, init } of calls) {
    assert.equal(url.searchParams.get("user_id"), `eq.${UID}`);
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer caller-jwt");
    assert.equal(new Headers(init.headers).get("apikey"), "anon-key");
    assert.equal(init.body, undefined);
  }
  assert.deepEqual(calls.map((x) => x.url.searchParams.get("select")), ["topics,updated_at", "topic,source,action,created_at", "kind,ref,title,created_at"]);
  assert.deepEqual(calls.map((x) => x.url.searchParams.get("limit")), ["1", "100", "12"]);
  assert.equal(calls[2].url.searchParams.get("kind"), "eq.post");
  assert.match(calls[2].url.searchParams.get("created_at"), /^gte\.\d{4}-\d{2}-\d{2}T/);
  assert.match(result.pack, /צופן · מקור בחירה: topic-page/);
  assert.match(result.pack, /מסע · מקור בחירה: missing/);
  assert.match(result.pack, /פעילות אינה מעקב מפורש/);
  assert.doesNotMatch(result.pack, /PRIVATE|caller-jwt|11111111/);
  assert.equal(spans.length, 5);
  assert.deepEqual(spans.slice(2).map((x) => x.kind), ["network", "network", "network"]);
  assert.doesNotMatch(JSON.stringify(spans), /caller-jwt|11111111|PRIVATE|p-1|מאמר/);
});

test("Follow and activity retain measured-empty, missing, access-filtered and failed states without inference", () => {
  const m = load(async () => json([]));
  const projected = m.razielPersonalSignalsProject([
    { source: "notification_prefs", ok: true, data: [{ topics: [], updated_at: "2026-10-31T12:00:00Z" }], outcome: "success", ms: 1, error: null },
    { source: "subscribe_events", ok: false, data: [], outcome: "access_filtered", ms: 1, error: "http_403" },
    { source: "user_activity", ok: true, data: [], outcome: "success", ms: 1, error: null },
  ]);
  assert.equal(projected.follow.state, "measured_empty");
  assert.equal(projected.activity.state, "measured_empty");
  assert.equal(projected.activity.coverage, "last_30_days");

  const degraded = m.razielPersonalSignalsProject([
    { source: "notification_prefs", ok: false, data: [], outcome: "access_filtered", ms: 1, error: "http_403" },
    { source: "user_activity", ok: false, data: [], outcome: "failed", ms: 1, error: "http_500" },
  ]);
  assert.equal(degraded.follow.state, "access_filtered");
  assert.equal(degraded.activity.state, "failed");
  assert.deepEqual(degraded.follow.topics, []);
  assert.doesNotMatch(JSON.stringify(degraded), /interest|recommend|score|audience/i);
});

test("401 during a personal owner read fails closed and discards all partial Follow/activity data", async () => {
  const fetchImpl = async (input) => {
    const pathName = new URL(String(input)).pathname;
    if (pathName.endsWith("/notification_prefs")) return json([{ topics: ["סודי"], updated_at: "2026-10-31T12:00:00Z" }]);
    if (pathName.endsWith("/subscribe_events")) return json({}, 401);
    return json([{ kind: "post", ref: "private-post", title: "PRIVATE", created_at: "2026-10-31T09:00:00Z" }]);
  };
  const result = await load(fetchImpl).runRazielPersonal({ capability: "personal_continue" }, "caller-jwt", UID, null);
  assert.equal(result.ok, false);
  assert.equal(result.outcome, "access_filtered");
  assert.equal(result.pack, undefined);
  assert.equal(result.answer, undefined);
  assert.doesNotMatch(JSON.stringify(result), /סודי|private-post|PRIVATE/);
});

test("consumer source contains no write method, service credential or audience store", () => {
  assert.doesNotMatch(block, /method:\s*"(?:POST|PUT|PATCH|DELETE)"[^\n]*notification_prefs|service_role|SB_SVC|audience_store|visitor_events/i);
  assert.match(block, /פעילות אינה מעקב מפורש, אינה העדפה או עניין, ואינה המלצה/);
});
