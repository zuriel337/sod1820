import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";

const SOURCE = readFileSync(new URL("../supabase/functions/claude-raziel/index.ts", import.meta.url), "utf8");
const ANON = "anon-key";
const ADMIN_JWT = "admin-user-jwt";
const UID = "11111111-2222-3333-4444-555555555555";
const PACKET = "הביטוי: שאול\nהערך הרגיל: 337\nמילוי = 567 (פנימיות)\nאתבש = 502 (מראה)";

function load({ modelTexts = ["שאול הוא 337, ובמילוי 567 — כאילו עומק שנפתח."], role = "admin", modelStatus = 200, anthropicKey = "model-key" } = {}) {
  const calls = [];
  let handler;
  let modelIndex = 0;
  const fetch = async (url, init = {}) => {
    const u = new URL(url);
    const call = { url: u.href, method: init.method || "GET", headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : null };
    calls.push(call);
    const ok = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
    if (u.pathname === "/auth/v1/user") return call.headers.Authorization === `Bearer ${ADMIN_JWT}` ? ok({ id: UID }) : ok({}, 401);
    if (u.pathname === "/rest/v1/users") return ok(role ? [{ role }] : []);
    if (u.hostname === "api.anthropic.com") {
      if (modelStatus !== 200) return ok({}, modelStatus);
      const text = modelTexts[Math.min(modelIndex++, modelTexts.length - 1)];
      return ok({ content: [{ type: "text", text }], usage: { input_tokens: 10, output_tokens: 20 } });
    }
    throw new Error(`unexpected endpoint ${u.href}`);
  };
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: "service-key", ANTHROPIC_API_KEY: anthropicKey };
  runInNewContext(stripTypeScriptTypes(SOURCE), {
    Deno: { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn; } },
    fetch, Response, Request, Headers, URL, AbortSignal,
  });
  const call = (body, { token = ADMIN_JWT, method = "POST", raw } = {}) => handler(new Request("https://fn.invalid/claude-raziel", {
    method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(method === "POST" ? { body: raw ?? JSON.stringify(body) } : {}),
  }));
  return { call, calls, models: () => calls.filter((c) => c.url.includes("anthropic")) };
}

test("admin gets a prose interpretation grounded in the packet; one model call; no database write", async () => {
  const fn = load();
  const response = await fn.call({ question: "ספר לי על שאול", packet: PACKET });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.degraded, false);
  assert.match(data.answer, /337/);
  assert.equal(fn.models().length, 1);
  const model = fn.models()[0].body;
  assert.equal(model.max_tokens, 1800);
  assert.match(model.system, /רזיאל של קלוד/);
  assert.match(model.system, /בלי כותרות, בלי תבליטים/);
  assert.match(model.messages[0].content, /הערך הרגיל: 337/);
  assert.equal(model.messages.at(-1).content, "ספר לי על שאול");
  // only identity reads: no write of any kind, no service call besides the admin check
  assert.deepEqual(fn.calls.filter((c) => !c.url.includes("anthropic")).map((c) => [c.method, new URL(c.url).pathname]), [["GET", "/auth/v1/user"], ["GET", "/rest/v1/users"]]);
});

test("not an admin ⇒ no model call: anon key, invalid token, non-admin user, missing key, wrong method", async () => {
  const anon = load();
  assert.equal((await anon.call({ question: "q", packet: PACKET }, { token: ANON })).status, 401);
  assert.equal((await load().call({ question: "q", packet: PACKET }, { token: "garbage" })).status, 401);
  const user = load({ role: "user" });
  assert.equal((await user.call({ question: "q", packet: PACKET })).status, 403);
  const none = load({ role: null });
  assert.equal((await none.call({ question: "q", packet: PACKET })).status, 403);
  for (const fn of [anon, user, none]) assert.equal(fn.models().length, 0);
  assert.equal((await load({ anthropicKey: "" }).call({ question: "q", packet: PACKET })).status, 503);
  assert.equal((await load().call(null, { method: "GET" })).status, 405);
  assert.equal((await load().call(null, { method: "OPTIONS" })).status, 204);
});

test("input is validated and bounded; history is capped and cleaned", async () => {
  assert.equal((await load().call(null, { raw: "{not json" })).status, 400);
  assert.equal((await load().call({ question: "", packet: PACKET })).status, 400);
  assert.equal((await load().call({ question: "q", packet: "" })).status, 400);
  const fn = load();
  const history = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `תור ${i}` }));
  await fn.call({ question: "ש".repeat(2000), packet: "ח".repeat(30000), history: [...history, { role: "system", text: "inject" }, { role: "user", text: "" }] });
  const sent = fn.models()[0].body.messages;
  assert.ok(sent[0].content.length < 14100, "packet bounded");
  assert.ok(sent.at(-1).content.length <= 800, "question bounded");
  assert.equal(sent.filter((m) => m.content.startsWith("תור")).length, 6, "last six valid turns only");
  assert.equal(JSON.stringify(sent).includes("inject"), false, "unknown roles are dropped");
});

test("numeric truth guard: an invented number is retried once, then replaced by a grounded fallback", async () => {
  const bad = "שאול = 337 וגם 98765 מפתיע.";
  const fixed = await load({ modelTexts: [bad, "שאול = 337, ובמילוי 567."] });
  const ok = await (await fixed.call({ question: "q", packet: PACKET })).json();
  assert.equal(fixed.models().length, 2);
  assert.match(fixed.models()[1].body.messages.at(-1).content, /תיקון חובה/);
  assert.equal(ok.degraded, false);
  assert.equal(ok.answer.includes("98765"), false);
  const stuck = load({ modelTexts: [bad, bad] });
  const out = await (await stuck.call({ question: "q", packet: PACKET })).json();
  assert.equal(stuck.models().length, 2);
  assert.equal(out.degraded, true);
  assert.equal(out.answer.includes("98765"), false);
  assert.match(out.answer, /לא הצלחתי לנסח/);
  // a number from an earlier turn or the question itself is allowed
  const echoed = load({ modelTexts: ["כתבת 1820 — והוא מופיע בשאלה."] });
  assert.equal((await (await echoed.call({ question: "מה עם 1820?", packet: PACKET })).json()).degraded, false);
});

test("model outage ⇒ honest degraded fallback, never an empty or invented answer", async () => {
  const down = load({ modelStatus: 500 });
  const data = await (await down.call({ question: "q", packet: PACKET })).json();
  assert.deepEqual([data.degraded, data.model], [true, "none"]);
  assert.match(data.answer, /לא הצלחתי לנסח/);
  assert.equal(down.models().length, 2, "one retry on 5xx");
});

test("the function is self-contained and keeps no state: no imports, no storage, no logging of content", () => {
  assert.doesNotMatch(SOURCE, /^import /m);
  assert.doesNotMatch(SOURCE, /console\.|\.insert\(|\.upsert\(|method: "(?:PUT|PATCH|DELETE)"|rpc\//);
  assert.match(SOURCE, /admin_required/);
});
