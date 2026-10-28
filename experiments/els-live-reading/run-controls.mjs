#!/usr/bin/env node
// EXP-16 unattended runner. ZURIEL approved (28.10.2026) the plan in controls/plan-review.json and the continuation rounds built by the rule in the plan, inside a total cap of USD 40
// for all experiments, without a per-call approval. What this script does before it spends anything:
//   1. every request is rebuilt from the code and must equal the reviewed plan (request and lock SHA-256) - otherwise it stops: "the content differs from the plan";
//   2. the temporary pass-through is probed: it must refuse a request without the token, an unapproved batch, another model, and any other route - otherwise it stops: "not locked as designed";
//   3. the model is listed and the public engine contract answers a known question;
// then it runs the plan in priority order, up to --concurrency batches at a time, with the budget guard (worst case reserved before every call). It stops launching new calls on a budget stop,
// a security/lock failure, or a plan mismatch; it never retries a model call. Stages:  selftest | run | status
//   node experiments/els-live-reading/run-controls.mjs run --concurrency 3
// Environment: ELS_PROXY_URL, ELS_PROXY_TOKEN, ELS_PROXY_JWT (the site's public key, for the platform gateway; also used for the public engine contract) and NODE_USE_ENV_PROXY=1.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DEFAULTS, loadContext, regionPathOf, round1Request, round1RequestV2 } from "./lib/context.mjs";
import { RUNS, ROUND2_CARD_CAP } from "./lib/plan.mjs";
import { NoCredentialError, PROXY_JWT_ENV, PROXY_TOKEN_ENV, PROXY_URL_ENV, lockSha256, requestSha256 } from "./lib/request.mjs";
import { fetchBatchResults, makeClient, preflight, transportOf } from "./lib/client.mjs";
import { BudgetStop, pipeline } from "./lib/orchestrate.mjs";
import { loadLedger, settledOf, spentOf } from "./lib/ledger.mjs";
import { TORAH_LENGTH, TORAH_MD5 } from "./lib/metrics.mjs";
import { makeRpc, verifyItem } from "./lib/verify-rest.mjs";
import { pageLetters } from "./build-windows.mjs";

const [stage = "run", ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
const here = (path) => new URL(path, import.meta.url);
const LEDGER = here("./controls/budget-ledger.json").pathname;
const LOG = here("./controls/run-log.jsonl").pathname;
const log = (event, data = {}) => { const line = JSON.stringify({ at: new Date().toISOString(), event, ...data }); appendFileSync(LOG, `${line}\n`); process.stderr.write(`${line}\n`); };
const die = (code, message) => { log("stop", { code, message }); process.stderr.write(`STOP (${code}): ${message}\n`); process.exit(code); };
// exit codes: 2 no credential, 3 plan mismatch, 6 pass-through not locked as designed, 7 budget, 8 verification path unavailable, 9 other

const env = process.env;
const concurrency = Math.max(1, Math.min(4, Number(args.concurrency || 3)));
const page = args.page || "public/tzofen.html";
const plan = JSON.parse(readFileSync(here("./controls/plan-review.json"), "utf8"));
const planById = new Map(plan.runs.map((entry) => [entry.id, entry]));

if (stage === "status") {
  const ledger = loadLedger(LEDGER);
  process.stdout.write(`${JSON.stringify({ cap: ledger.cap_usd, spent_total: spentOf(ledger), spent_settled: settledOf(ledger), remaining: Number((ledger.cap_usd - spentOf(ledger)).toFixed(6)), entries: ledger.entries.length, reserved_now: ledger.entries.filter((e) => e.reserved).map((e) => [e.id, e.usd]) }, null, 2)}\n`);
  process.exit(0);
}

if (transportOf(env) !== "proxy") { process.stderr.write(`${new NoCredentialError().message}\n`); process.exit(2); }
let client;
try { client = makeClient(env); } catch (error) { process.stderr.write(`${error.message}\n`); process.exit(2); }

// ---- 1. the plan: model settings and every request equal what was reviewed
if (plan.model !== DEFAULTS.model || plan.effort !== DEFAULTS.effort || plan.max_tokens !== DEFAULTS.maxTokens) die(3, "the plan's model settings differ from the defaults");
const prepared = new Map();
for (const run of RUNS) {
  const ctx = loadContext(page, { regionPath: regionPathOf(run.region) });
  const { request } = run.prompt === "v2" ? round1RequestV2(ctx, run) : round1Request(ctx);
  const entry = planById.get(run.id);
  if (!entry || requestSha256(request) !== entry.request_sha256 || lockSha256(request) !== entry.lock_sha256) die(3, `${run.id}: the request differs from the reviewed plan; nothing was sent`);
  prepared.set(run.id, { run, ctx, request, entry });
}
log("plan_verified", { runs: prepared.size });

// ---- 2. the pass-through must be locked as designed (every probe is expected to be refused; a probe that gets through would be a tiny, cheap request)
async function probe(name, path, { method = "GET", token = env[PROXY_TOKEN_ENV], body = null } = {}) {
  const response = await fetch(`${env[PROXY_URL_ENV].replace(/\/$/, "")}${path}`, { method, headers: { authorization: `Bearer ${env[PROXY_JWT_ENV]}`, ...(token ? { "x-els-token": token } : {}), "content-type": "application/json", "anthropic-version": "2026-10-21" }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  return { name, status: response.status, body: text.slice(0, 120) };
}
async function selftest() {
  const tiny = { model: DEFAULTS.model, max_tokens: 16, messages: [{ role: "user", content: "x" }] };
  const results = [
    [await probe("known model with the token", `/v1/models/${DEFAULTS.model}`), (r) => r.status === 200],
    [await probe("no token", `/v1/models/${DEFAULTS.model}`, { token: "" }), (r) => r.status === 403],
    [await probe("wrong token", `/v1/models/${DEFAULTS.model}`, { token: "0".repeat(64) }), (r) => r.status === 403],
    [await probe("an unapproved batch", "/v1/messages/batches", { method: "POST", body: { requests: [{ custom_id: "els-live-selftest", params: tiny }] } }), (r) => r.status === 403 && /request_not_approved/.test(r.body)],
    [await probe("another model", "/v1/messages/count_tokens", { method: "POST", body: { model: "claude-opus-5-5", messages: tiny.messages } }), (r) => r.status === 403 && /model_not_allowed/.test(r.body)],
    [await probe("the messages route", "/v1/messages", { method: "POST", body: tiny }), (r) => r.status === 404],
    [await probe("another API area", "/v1/files"), (r) => r.status === 404],
    [await probe("a batch list", "/v1/messages/batches"), (r) => r.status === 404],
  ];
  const failed = results.filter(([r, ok]) => !ok(r));
  log("selftest", { results: results.map(([r, ok]) => ({ name: r.name, status: r.status, ok: ok(r) })) });
  if (failed.length) die(6, `the pass-through is not locked as designed: ${failed.map(([r]) => `${r.name} -> ${r.status} ${r.body}`).join("; ")}`);
}
await selftest();
if (stage === "selftest") process.exit(0);

// ---- 3. the model is listed; the verification path answers a known question
const torah = pageLetters(page).slice(0, TORAH_LENGTH);
if (createHash("md5").update(torah, "utf8").digest("hex") !== TORAH_MD5) die(8, "the page's Torah letters differ from public.torah_stream (md5)");
const rpc = makeRpc({ anonKey: env[PROXY_JWT_ENV], retries: 3 });
try {
  const known = await verifyItem({ key: "ping", term: "קולומביה", start: 248765, skip: 4545, dir: 1 }, { torah, rpc });
  if (!known.letters_match || known.engine.found !== true) die(8, "the engine contract did not confirm the known occurrence");
} catch (error) { die(8, `the verification path is unavailable: ${error.message}`); }
log("ready", { concurrency, spent: spentOf(loadLedger(LEDGER)) });

// ---- 4. the sequence
const deps = {
  client, ledgerPath: LEDGER, now: () => new Date().toISOString(), log, preflight, torah, rpc, engineConcurrency: 4, round2Cap: ROUND2_CARD_CAP, pollMs: 20_000, maxWaitMs: 3 * 60 * 60 * 1000, diagnosticsMaxSpent: 26,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)), fetchResults: (batchId) => fetchBatchResults(env, batchId), runDir: (id) => here(`./controls/runs/${id}`).pathname,
};
let halted = null;
const outcomes = [];
async function task(item) {
  if (halted) { outcomes.push({ id: item.run.id, skipped: halted }); log("skipped", { run: item.run.id, reason: halted }); return; }
  try {
    const outcome = await pipeline({ run: item.run, ctx: item.ctx, request: item.request, planEntry: item.entry, deps });
    outcomes.push(outcome);
    log("run_finished", { run: item.run.id, series: item.run.series, failed: outcome.failed ?? null, rounds: outcome.rounds });
  } catch (error) {
    if (error instanceof BudgetStop) { halted = `budget: ${error.message}`; outcomes.push({ id: item.run.id, skipped: halted }); log("budget_stop", { run: item.run.id, reason: error.message }); return; }
    if (error.name === "EngineUnavailableError") { halted = `verification path unavailable: ${error.message}`; outcomes.push({ id: item.run.id, failed: halted }); log("engine_unavailable", { run: item.run.id, error: error.message }); return; }
    halted = `unexpected error in ${item.run.id}: ${String(error.message ?? error).slice(0, 200)}`;
    outcomes.push({ id: item.run.id, failed: halted });
    log("error", { run: item.run.id, error: String(error.stack ?? error).slice(0, 600) });
  }
}
async function pool(items) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => { while (next < items.length) { const item = items[next]; next += 1; await task(item); } }));
}
for (const priority of [...new Set(RUNS.map((run) => run.priority))].sort((a, b) => a - b)) {
  const group = [...prepared.values()].filter((item) => item.run.priority === priority);
  if (!args["only"] || args.only.split(",").some((id) => group.some((item) => item.run.id === id))) {
    const chosen = args.only ? group.filter((item) => args.only.split(",").includes(item.run.id)) : group;
    log("group_start", { priority, runs: chosen.map((item) => item.run.id) });
    await pool(chosen);
    log("group_done", { priority, spent: spentOf(loadLedger(LEDGER)), settled: settledOf(loadLedger(LEDGER)) });
  }
}
const ledger = loadLedger(LEDGER);
writeFileSync(here("./controls/run-outcomes.json").pathname, `${JSON.stringify({ finished_at: new Date().toISOString(), halted, spent_usd: spentOf(ledger), remaining_usd: Number((ledger.cap_usd - spentOf(ledger)).toFixed(6)), outcomes }, null, 2)}\n`);
log("finished", { halted, spent: spentOf(ledger), runs: outcomes.length });
process.exit(halted ? (halted.startsWith("budget") ? 7 : 9) : 0);
