#!/usr/bin/env node
// Canary for the public-reading compute beacon database function (supabase/proposed/reading_activity_v1.sql).
//
// WHAT IT PROVES, in this order, with two real calls:
//   1. the trusted address header (cf-connecting-ip) reaches the function through request.headers:
//      the first call is answered `recorded`, not `rate_limited/no_address`  => no_address = 0 for this run;
//   2. exactly-once: the SAME activity_event_id sent again is answered `duplicate`;
//   3. optional (--service-key): the no_address counter did not move since the canary started.
// It prints the explicit activity_event_id list, which is the ONLY way a live test row is told apart from real traffic
// (never by time window, address or session). It sends exactly the closed body the site sends: no expression, no identity.
//
// SAFETY. It WRITES one event row. It does nothing unless --confirm-write is given, and --expect-host must equal the host
// of --url, so a wrong target is refused. Run it only after the DB step is approved and applied.
//
//   node scripts/canary-reading-activity.mjs --url https://<project>.supabase.co --anon-key <publishable key> \
//        --expect-host <project>.supabase.co --confirm-write [--service-key <key>] [--header "name: value"]...
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { readingActivityBody } from "../src/lib/publicReadingTelemetry2029.js";

const RPC = "ingest_reading_activity_v1";

export function buildCanaryBody(id = randomUUID(), session = randomUUID()) {
  return {
    p_event_type: "first_compute", p_path: "/gematria", p_app_context: "other",
    p_props: { schema: 1, activity_event_id: id, activity_session: session, length_bucket: "4-8", entry: "direct", surface_kind: "calculator" },
  };
}

// deps: { fetch, now, confirmWrite, expectHost, restBase, anonKey, serviceKey, headers }
export async function runCanary({ url, anonKey, serviceKey = null, expectHost = null, confirmWrite = false, headers = {}, restBase = null, fetchImpl = fetch, now = () => Date.now(), makeId = randomUUID } = {}) {
  const fail = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
  if (!url || !anonKey) return fail(2, "usage: --url and --anon-key are required");
  let host;
  try { host = new URL(url).host; } catch { return fail(2, "invalid --url"); }
  if (!confirmWrite) return fail(2, "refused: this canary writes one event; pass --confirm-write", { target: host });
  if (!expectHost || expectHost !== host) return fail(2, `refused: --expect-host (${expectHost || "missing"}) must equal the target host (${host})`, { target: host });
  const base = (restBase || url.replace(/\/$/, "") + "/rest/v1").replace(/\/$/, "");
  const startedAt = now();
  const id = makeId(), session = makeId();
  const body = buildCanaryBody(id, session);
  if (!readingActivityBody(body)) return fail(1, "internal: the canary body is not the closed beacon shape");
  const call = async b => {
    const res = await fetchImpl(`${base}/rpc/${RPC}`, { method: "POST", headers: { "content-type": "application/json", apikey: anonKey, authorization: `Bearer ${anonKey}`, ...headers }, body: JSON.stringify(b) });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { http: res.status, json };
  };
  const steps = [];
  const first = await call(body); steps.push({ step: "first", ...first });
  if (first.http !== 200) return fail(1, `first call: HTTP ${first.http} (is the RPC applied and executable by anon?)`, { ids: [id], steps });
  if (first.json?.reason === "no_address") return fail(1, "first call: no_address - the trusted header cf-connecting-ip did NOT reach request.headers; do not deploy the site", { ids: [id], steps });
  if (first.json?.status !== "recorded") return fail(1, `first call: expected recorded, got ${JSON.stringify(first.json)}`, { ids: [id], steps });
  const second = await call(body); steps.push({ step: "replay", ...second });
  if (second.http !== 200 || second.json?.status !== "duplicate") return fail(1, `replay: expected duplicate, got HTTP ${second.http} ${JSON.stringify(second.json)}`, { ids: [id], steps });
  let noAddress = null;
  if (serviceKey) {
    const since = new Date(Math.floor(startedAt / 60000) * 60000 - 60000).toISOString();
    const res = await fetchImpl(`${base}/reading_activity_outcomes?select=n&outcome=eq.no_address&minute=gte.${encodeURIComponent(since)}`, { headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } });
    const rows = res.status === 200 ? await res.json() : null;
    steps.push({ step: "no_address_counter", http: res.status });
    if (!Array.isArray(rows)) return fail(1, `outcomes read: HTTP ${res.status}`, { ids: [id], steps });
    noAddress = rows.reduce((s, r) => s + Number(r.n || 0), 0);
    if (noAddress !== 0) return fail(1, `no_address counter is ${noAddress} since the canary started (expected 0)`, { ids: [id], steps, no_address: noAddress });
  }
  return { ok: true, code: 0, target: host, activity_event_ids: [id], recorded: 1, duplicate: 1, no_address: noAddress, steps };
}

function parseArgs(argv) {
  const out = { headers: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--confirm-write") out.confirmWrite = true;
    else if (a === "--url") out.url = argv[++i];
    else if (a === "--anon-key") out.anonKey = argv[++i];
    else if (a === "--service-key") out.serviceKey = argv[++i];
    else if (a === "--expect-host") out.expectHost = argv[++i];
    else if (a === "--rest-base") out.restBase = argv[++i];
    else if (a === "--header") { const [k, ...v] = String(argv[++i] || "").split(":"); if (k && v.length) out.headers[k.trim().toLowerCase()] = v.join(":").trim(); }
    else return { error: `unknown argument ${a}` };
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const result = args.error ? { ok: false, code: 2, message: args.error } : await runCanary(args);
  // keys are never printed
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.code ?? 1);
}
