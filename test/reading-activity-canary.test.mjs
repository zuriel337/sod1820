import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { runCanary, buildCanaryBody } from "../scripts/canary-reading-activity.mjs";
import { readingActivityBody } from "../src/lib/publicReadingTelemetry2029.js";

const URL_ = "https://canary-target.supabase.co", HOST = "canary-target.supabase.co", ANON = "anon-key-SHOULD-NEVER-BE-PRINTED", SERVICE = "service-key-SHOULD-NEVER-BE-PRINTED";
const U = n => `eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12, "0")}`;
const res = (status, body) => ({ status, text: async () => (typeof body === "string" ? body : JSON.stringify(body)), json: async () => body });

// A fake backend that behaves like the proposed function: recorded once, then duplicate; optionally refuses with no_address.
function backend({ noAddress = false, notIdempotent = false, http = 200, counter = 0 } = {}) {
  const seen = new Set(), calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes("/reading_activity_outcomes")) return res(200, counter ? [{ n: counter }] : []);
    if (http !== 200) return res(http, { message: "not found" });
    const body = JSON.parse(init.body);
    if (noAddress) return res(200, { status: "rate_limited", reason: "no_address" });
    const id = body.p_props.activity_event_id;
    if (seen.has(id) && !notIdempotent) return res(200, { status: "duplicate" });
    seen.add(id); return res(200, { status: "recorded" });
  };
  return { fetchImpl, calls };
}
const opts = (b, extra = {}) => ({ url: URL_, anonKey: ANON, expectHost: HOST, confirmWrite: true, fetchImpl: b.fetchImpl, makeId: (() => { let n = 0; return () => U(++n); })(), ...extra });

test("canary refuses to write unless explicitly confirmed and pointed at the expected host, and then sends nothing", async () => {
  for (const extra of [{ confirmWrite: false }, { expectHost: undefined }, { expectHost: "other.supabase.co" }, { url: "not a url" }, { anonKey: "" }]) {
    const b = backend(); const r = await runCanary(opts(b, extra));
    assert.equal(r.ok, false); assert.equal(r.code, 2, JSON.stringify(extra)); assert.equal(b.calls.length, 0, "no request leaves the machine");
  }
});

test("canary passes only on recorded then duplicate, sends the closed body, and reports an explicit id list", async () => {
  const b = backend(); const r = await runCanary(opts(b));
  assert.equal(r.ok, true); assert.equal(r.code, 0); assert.deepEqual(r.activity_event_ids, [U(1)]);
  assert.equal(b.calls.length, 2);
  const [first, second] = b.calls.map(c => JSON.parse(c.init.body));
  assert.deepEqual(first, second, "the replay is byte-identical, so it carries the same activity_event_id");
  assert.equal(readingActivityBody(first), true);
  assert.deepEqual(Object.keys(first).sort(), ["p_app_context", "p_event_type", "p_path", "p_props"]);
  assert.equal(b.calls[0].url, URL_ + "/rest/v1/rpc/ingest_reading_activity_v1");
  assert.equal(b.calls[0].init.headers.apikey, ANON);
  assert.doesNotMatch(JSON.stringify(first), /[֐-׿]|sod_id|user|actor|expression/);
  assert.equal(JSON.stringify(r).includes(ANON), false, "keys are never reported");
});

test("canary fails loudly on the three ways the rollout can be wrong", async () => {
  const noAddr = await runCanary(opts(backend({ noAddress: true })));
  assert.equal(noAddr.ok, false); assert.equal(noAddr.code, 1); assert.match(noAddr.message, /no_address.*cf-connecting-ip.*did NOT reach.*do not deploy the site/s);
  const notIdem = await runCanary(opts(backend({ notIdempotent: true })));
  assert.equal(notIdem.ok, false); assert.match(notIdem.message, /expected duplicate/);
  const absent = await runCanary(opts(backend({ http: 404 })));
  assert.equal(absent.ok, false); assert.match(absent.message, /HTTP 404.*applied/);
  for (const r of [noAddr, notIdem, absent]) assert.equal(JSON.stringify(r).includes(ANON), false);
});

test("canary can also read the no_address counter with a service key: zero passes, anything else fails", async () => {
  const ok = backend({ counter: 0 }); const good = await runCanary(opts(ok, { serviceKey: SERVICE, now: () => Date.parse("2026-11-07T09:30:30Z") }));
  assert.equal(good.ok, true); assert.equal(good.no_address, 0);
  const q = ok.calls.at(-1).url;
  assert.match(q, /reading_activity_outcomes\?select=n&outcome=eq\.no_address&minute=gte\.2026-11-07T09%3A29%3A00\.000Z$/, "window starts one minute before the canary");
  assert.equal(ok.calls.at(-1).init.headers.apikey, SERVICE);
  const bad = await runCanary(opts(backend({ counter: 3 }), { serviceKey: SERVICE }));
  assert.equal(bad.ok, false); assert.equal(bad.no_address, 3); assert.match(bad.message, /no_address counter is 3/);
  assert.equal(JSON.stringify([good, bad]).includes(SERVICE), false);
});

test("canary CLI exits 2 without confirmation and never prints a key", () => {
  const r = spawnSync("node", ["scripts/canary-reading-activity.mjs", "--url", "http://127.0.0.1:9", "--anon-key", ANON, "--expect-host", "127.0.0.1:9"], { encoding: "utf8" });
  assert.equal(r.status, 2); assert.match(r.stdout, /--confirm-write/); assert.equal((r.stdout + r.stderr).includes(ANON), false);
  assert.equal(spawnSync("node", ["scripts/canary-reading-activity.mjs", "--nope"], { encoding: "utf8" }).status, 2);
});

// ───── against the real database function (local Postgres), through an HTTP shim ─────
// The shim copies the incoming HTTP headers into request.headers and calls the real function. That is what PostgREST DOCUMENTS
// (https://supabase.com/docs/guides/api/securing-your-api, "Accessing request information"); the shim does NOT prove PostgREST itself.
// It proves the canary's HTTP logic and the function's behaviour with and without the trusted header.
const { RA_PG_BIN: BIN, RA_PG_SOCKET: SOCK, RA_PG_PORT: PORT, RA_PG_AS_POSTGRES: AS_PG } = process.env;
const skip = !BIN || !SOCK ? "no local database (run scripts/run-reading-activity-sql-test.sh)" : false;
function psql(sql) {
  const cmd = `${BIN}/psql -h ${SOCK} -p ${PORT} -d t -v ON_ERROR_STOP=1 -qtA -c '${sql.replace(/'/g, "'\\''")}'`;
  return (AS_PG === "1" ? execFileSync("su", ["postgres", "-c", cmd], { encoding: "utf8" }) : execFileSync("bash", ["-c", cmd], { encoding: "utf8" })).trim();
}
const lit = v => "$q$" + v + "$q$";
function startShim() {
  const server = http.createServer((req, resp) => {
    let raw = ""; req.on("data", d => { raw += d; });
    req.on("end", () => {
      const send = (code, obj) => { resp.writeHead(code, { "content-type": "application/json" }); resp.end(JSON.stringify(obj)); };
      try {
        if (req.method === "POST" && req.url === "/rest/v1/rpc/ingest_reading_activity_v1") {
          const b = JSON.parse(raw);
          const out = psql(`select t.call_hdr('anon', ${lit(JSON.stringify(req.headers))}::jsonb, null, ${lit(b.p_event_type)}, ${lit(b.p_path)}, ${lit(b.p_app_context)}, ${lit(JSON.stringify(b.p_props))}::jsonb)`);
          return send(200, JSON.parse(out));
        }
        if (req.method === "GET" && req.url.startsWith("/rest/v1/reading_activity_outcomes?")) {
          const q = new URL(req.url, "http://x").searchParams;
          const out = psql(`select coalesce(json_agg(json_build_object('n', n)), '[]') from public.reading_activity_outcomes where outcome = ${lit(q.get("outcome").replace(/^eq\./, ""))} and minute >= ${lit(q.get("minute").replace(/^gte\./, ""))}::timestamptz`);
          return send(200, JSON.parse(out));
        }
        send(404, { message: "not found" });
      } catch (e) { send(500, { message: String(e).slice(0, 200) }); }
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r({ server, port: server.address().port })));
}

test("canary against the real function: with the edge header it records then dedupes; without it, it fails with no_address", { skip }, async () => {
  psql("delete from private.edge_rate_limit_buckets");
  psql("delete from public.reading_activity_outcomes where outcome = 'no_address'");   // disposable test database: start from a clean counter
  const { server, port } = await startShim();
  try {
    const base = { url: `http://127.0.0.1:${port}`, anonKey: ANON, expectHost: `127.0.0.1:${port}`, confirmWrite: true, serviceKey: SERVICE };
    const ip = "203.0.113.9";
    const good = await runCanary({ ...base, headers: { "cf-connecting-ip": ip } });
    assert.equal(good.ok, true, JSON.stringify(good)); assert.equal(good.no_address, 0);
    const id = good.activity_event_ids[0];
    assert.equal(psql(`select count(*) from public.events where props->>'activity_event_id' = '${id}'`), "1", "exactly one event");
    assert.equal(psql(`select count(*) from public.reading_activity_ids where activity_event_id = '${id}'`), "1", "exactly one key");
    assert.equal(psql(`select props->>'actor_class' from public.events where props->>'activity_event_id' = '${id}'`), "unknown");
    // the function keyed its bucket by exactly the header value: the header reached request.headers
    const key = createHash("sha256").update("reading-activity-v1|a|" + ip).digest("hex");
    assert.equal(psql(`select count from private.edge_rate_limit_buckets where key_hash = '${key}' order by bucket desc limit 1`), "2", "two calls (recorded + duplicate) counted for that address");
    // a different spelling of the header name is the same header
    const upper = await runCanary({ ...base, headers: { "CF-Connecting-IP": ip } });
    assert.equal(upper.ok, true);
    // WITHOUT the trusted header (and with a client-controllable one) the canary fails and says why
    const noHeader = await runCanary({ ...base, headers: { "x-forwarded-for": "198.51.100.77", "x-real-ip": "198.51.100.78" } });
    assert.equal(noHeader.ok, false); assert.equal(noHeader.code, 1); assert.match(noHeader.message, /did NOT reach request\.headers/);
    // that refusal was counted, and the next good canary (service key) notices the counter and fails: the alarm works
    assert.ok(Number(psql(`select coalesce(sum(n), 0) from public.reading_activity_outcomes where outcome = 'no_address'`)) >= 1);
    const alarmed = await runCanary({ ...base, headers: { "cf-connecting-ip": "203.0.113.10" } });
    assert.equal(alarmed.ok, false); assert.match(alarmed.message, /no_address counter is [1-9]/);
  } finally { server.close(); }
});
