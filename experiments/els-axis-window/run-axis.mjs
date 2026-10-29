#!/usr/bin/env node
// EXP-18 runner.  Stages:  plan | status | selftest | run
//   plan      offline: rebuilds the 3 requests, writes controls/plan-review.{json,md} and the ledger seed. No network, no key.
//   status    prints the experiment ledger.
//   selftest  (needs the temporary pass-through and ELS_PROXY_URL / ELS_PROXY_TOKEN / ELS_PROXY_JWT) probes that it is locked as designed: every probe must be refused.
//   run       (needs ZURIEL's approval, which was given on 29.10.2026 for this plan and cap) sends the three runs one at a time in priority order with the budget guard; never retries a model call; no round 2.
//   node experiments/els-axis-window/run-axis.mjs plan
//   NODE_USE_ENV_PROXY=1 node experiments/els-axis-window/run-axis.mjs run --concurrency 1 [--only C1,K1,...]
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { BUDGET, EXPERIMENT_CAP_USD, MODEL, MODELS, PRIOR_SPEND_USD, RUNS } from "./lib/plan.mjs";
import { prepareAll } from "./lib/prepare.mjs";
import { NoCredentialError, PROXY_JWT_ENV, PROXY_TOKEN_ENV, PROXY_URL_ENV, lockSha256, requestSha256 } from "../els-live-reading/lib/request.mjs";
import { BudgetStop, pipeline } from "../els-live-reading/lib/orchestrate.mjs";
import { loadLedger, settledOf, spentOf } from "../els-live-reading/lib/ledger.mjs";
import { TORAH_LENGTH, TORAH_MD5 } from "../els-live-reading/lib/metrics.mjs";
import { makeRpc, verifyItem } from "../els-live-reading/lib/verify-rest.mjs";
import { pageLetters } from "../els-live-reading/build-windows.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

export function ledgerSeed() {
  return {
    cap_usd: BUDGET.cap_usd, hard_guard_usd: BUDGET.hard_guard_usd, stop_new_usd: BUDGET.stop_new_usd, experiment_cap_usd: EXPERIMENT_CAP_USD,
    basis: "usage x list prices of the claude-api model table (Message Batches at 50%); not an invoice. First entry: the actual spend before EXP-18 (EXP-15, EXP-16, EXP-12 pilot, EXP-17).",
    entries: [{ id: "prior EXP-15 + EXP-16 + EXP-12 + EXP-17", kind: "prior", usd: PRIOR_SPEND_USD, note: "actual spend before EXP-18" }],
  };
}

export function planReview(prepared) {
  const runs = prepared.map((p) => p.review);
  const sum = (key) => Number(runs.reduce((a, r) => a + r[key], 0).toFixed(3));
  return {
    created_for: "EXP-18", experiment_cap_usd: EXPERIMENT_CAP_USD, prior_spend_usd: PRIOR_SPEND_USD, total_cap_usd: 40, remaining_before_usd: Number((40 - PRIOR_SPEND_USD).toFixed(5)), budget: BUDGET,
    model: MODEL, models: MODELS, runs,
    totals: { runs: runs.length, expected_usd: sum("expected_usd"), worst_case_if_every_run_used_max_tokens_usd: sum("worst_case_usd"),
      note: "expected assumes 30,000 output tokens per run (an assumption from EXP-16); the guard reserves each run's worst case before it is sent and stops launching when the experiment cap would be passed" },
    function: { models: MODELS, approved_lock_sha256: runs.map((r) => r.lock_sha256), batch_only: true, count_tokens_allowed: true, round2: "none" },
  };
}

export function planMarkdown(review) {
  const lines = ["| run | group | window | cells | lines | est. input tokens | expected | worst case | request sha | lock sha |", "|---|---|---|---|---|---|---|---|---|---|"];
  for (const r of review.runs) lines.push(`| ${r.id} | ${r.group} | ${r.rows}x${r.cols} | ${r.cells} | ${r.lines} | ${r.est_input_tokens} | $${r.expected_usd.toFixed(3)} | $${r.worst_case_usd.toFixed(3)} | ${r.request_sha256.slice(0, 12)} | ${r.lock_sha256.slice(0, 12)} |`);
  lines.push("", `Runs: ${review.totals.runs}. Expected total about $${review.totals.expected_usd} (assumption), worst case if every run used max_tokens $${review.totals.worst_case_if_every_run_used_max_tokens_usd}. Experiment cap $${review.experiment_cap_usd} (stop launching at $${(review.budget.stop_new_usd - PRIOR_SPEND_USD).toFixed(2)}); the guard reserves each run's worst case before sending it. Total cap $40, spent before $${review.prior_spend_usd}.`);
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();

async function main() {
  const [stage = "plan", ...rest] = process.argv.slice(2);
  const args = Object.fromEntries(rest.map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
  const LEDGER = here("./controls/budget-ledger.json");
  const LOG = here("./controls/run-log.jsonl");
  mkdirSync(here("./controls/"), { recursive: true });
  const log = (event, data = {}) => { const line = JSON.stringify({ at: new Date().toISOString(), event, ...data }); appendFileSync(LOG, `${line}\n`); process.stderr.write(`${line}\n`); };
  const die = (code, message) => { log("stop", { code, message }); process.stderr.write(`STOP (${code}): ${message}\n`); process.exit(code); };
  // exit codes: 2 no credential, 3 plan mismatch, 6 pass-through not locked as designed, 7 budget, 8 verification path unavailable, 9 other

  if (stage === "plan") {
    const prepared = prepareAll({ page: args.page || "public/tzofen.html" });
    const review = planReview(prepared);
    writeFileSync(here("./controls/plan-review.json"), `${JSON.stringify(review, null, 2)}\n`);
    writeFileSync(here("./controls/plan-review.md"), planMarkdown(review));
    writeFileSync(here("./controls/budget-ledger.seed.json"), `${JSON.stringify(ledgerSeed(), null, 2)}\n`);
    process.stdout.write(planMarkdown(review));
    return;
  }
  if (stage === "status") {
    const ledger = loadLedger(LEDGER);
    process.stdout.write(`${JSON.stringify({ cap: ledger.cap_usd, experiment_cap: ledger.experiment_cap_usd, spent_total: spentOf(ledger), spent_settled: settledOf(ledger), experiment_spent: Number((spentOf(ledger) - PRIOR_SPEND_USD).toFixed(5)), remaining_of_experiment: Number((EXPERIMENT_CAP_USD - (spentOf(ledger) - PRIOR_SPEND_USD)).toFixed(5)), entries: ledger.entries.length }, null, 2)}\n`);
    return;
  }

  const { fetchBatchResults, makeClient, preflight, transportOf } = await import("../els-live-reading/lib/client.mjs"); // the SDK is installed only in experiments/els-live-reading
  const env = process.env;
  if (transportOf(env) !== "proxy") { process.stderr.write(`${new NoCredentialError().message}\n`); process.exit(2); }
  let client;
  try { client = makeClient(env); } catch (error) { process.stderr.write(`${error.message}\n`); process.exit(2); }
  if (!existsSync(LEDGER)) writeFileSync(LEDGER, readFileSync(here("./controls/budget-ledger.seed.json")));
  const ledger0 = loadLedger(LEDGER);
  if (ledger0.hard_guard_usd !== BUDGET.hard_guard_usd || ledger0.stop_new_usd !== BUDGET.stop_new_usd) die(3, "the ledger's guard differs from the experiment budget");

  // ---- 1. the plan: every request equals what was reviewed
  const plan = JSON.parse(readFileSync(here("./controls/plan-review.json"), "utf8"));
  const planById = new Map(plan.runs.map((entry) => [entry.id, entry]));
  const prepared = prepareAll({ page: args.page || "public/tzofen.html" });
  for (const p of prepared) {
    const entry = planById.get(p.run.id);
    if (!entry || requestSha256(p.request) !== entry.request_sha256 || lockSha256(p.request) !== entry.lock_sha256) die(3, `${p.run.id}: the request differs from the reviewed plan; nothing was sent`);
  }
  if (prepared.length !== plan.runs.length) die(3, "the plan has a different number of runs");
  log("plan_verified", { runs: prepared.length });

  // ---- 2. the pass-through must be locked as designed (every probe is expected to be refused)
  async function probe(name, path, { method = "GET", token = env[PROXY_TOKEN_ENV], body = null } = {}) {
    const response = await fetch(`${env[PROXY_URL_ENV].replace(/\/$/, "")}${path}`, { method, headers: { authorization: `Bearer ${env[PROXY_JWT_ENV]}`, ...(token ? { "x-els-token": token } : {}), "content-type": "application/json", "anthropic-version": "2026-10-21" }, body: body ? JSON.stringify(body) : undefined });
    const text = await response.text();
    return { name, status: response.status, body: text.slice(0, 120) };
  }
  async function selftest() {
    const tiny = { model: MODELS[0], max_tokens: 16, messages: [{ role: "user", content: "x" }] };
    const results = [
      ...MODELS.map((id) => [() => probe(`known model ${id} with the token`, `/v1/models/${id}`), (r) => r.status === 200]),
      [() => probe("no token", `/v1/models/${MODELS[0]}`, { token: "" }), (r) => r.status === 403],
      [() => probe("wrong token", `/v1/models/${MODELS[0]}`, { token: "0".repeat(64) }), (r) => r.status === 403],
      [() => probe("an unapproved batch", "/v1/messages/batches", { method: "POST", body: { requests: [{ custom_id: "els-live-selftest", params: tiny }] } }), (r) => r.status === 403 && /request_not_approved/.test(r.body)],
      [() => probe("another model (Sonnet)", "/v1/messages/count_tokens", { method: "POST", body: { model: "claude-sonnet-5-5", messages: tiny.messages } }), (r) => r.status === 403 && /model_not_allowed/.test(r.body)],
      [() => probe("another model (Opus)", "/v1/messages/count_tokens", { method: "POST", body: { model: "claude-opus-5-5", messages: tiny.messages } }), (r) => r.status === 403 && /model_not_allowed/.test(r.body)],
      [() => probe("the messages route", "/v1/messages", { method: "POST", body: tiny }), (r) => r.status === 404],
      [() => probe("another API area", "/v1/files"), (r) => r.status === 404],
      [() => probe("a batch list", "/v1/messages/batches"), (r) => r.status === 404],
    ];
    const done = [];
    for (const [call, ok] of results) { const r = await call(); done.push([r, ok(r)]); }
    log("selftest", { results: done.map(([r, ok]) => ({ name: r.name, status: r.status, ok })) });
    const failed = done.filter(([, ok]) => !ok);
    if (failed.length) die(6, `the pass-through is not locked as designed: ${failed.map(([r]) => `${r.name} -> ${r.status} ${r.body}`).join("; ")}`);
  }
  await selftest();
  if (stage === "selftest") return;

  // ---- 3. the verification path answers a known question
  const page = args.page || "public/tzofen.html";
  const torah = pageLetters(page).slice(0, TORAH_LENGTH);
  if (createHash("md5").update(torah, "utf8").digest("hex") !== TORAH_MD5) die(8, "the page's Torah letters differ from public.torah_stream (md5)");
  const rpc = makeRpc({ anonKey: env[PROXY_JWT_ENV], retries: 3 });
  try {
    const known = await verifyItem({ key: "ping", term: "קולומביה", start: 248765, skip: 4545, dir: 1 }, { torah, rpc });
    if (!known.letters_match || known.engine.found !== true) die(8, "the engine contract did not confirm the known occurrence");
  } catch (error) { die(8, `the verification path is unavailable: ${error.message}`); }
  log("ready", { spent: spentOf(loadLedger(LEDGER)), settled: settledOf(loadLedger(LEDGER)) });

  // ---- 4. the sequence
  const concurrency = Math.max(1, Math.min(4, Number(args.concurrency || 1)));
  const deps = {
    client, ledgerPath: LEDGER, budget: BUDGET, diagnosticsMaxSpent: 1e9, now: () => new Date().toISOString(), log, preflight, torah, rpc, engineConcurrency: 4, round2Cap: 0, pollMs: 15_000, maxWaitMs: 3 * 60 * 60 * 1000,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)), fetchResults: (batchId) => fetchBatchResults(env, batchId), runDir: (id) => here(`./controls/runs/${id}`),
  };
  let halted = null;
  const outcomes = [];
  async function task(p) {
    if (halted) { outcomes.push({ id: p.run.id, skipped: halted }); log("skipped", { run: p.run.id, reason: halted }); return; }
    const entry = planById.get(p.run.id);
    try {
      const outcome = await pipeline({ run: { id: p.run.id, series: p.run.series, priority: p.run.priority, round2: false }, ctx: p.ctx, request: p.request, planEntry: entry, deps });
      outcomes.push(outcome);
      log("run_finished", { run: p.run.id, group: p.run.group, failed: outcome.failed ?? null, usd: outcome.rounds?.[0]?.usd ?? null });
    } catch (error) {
      if (error instanceof BudgetStop) { halted = `budget: ${error.message}`; outcomes.push({ id: p.run.id, skipped: halted }); log("budget_stop", { run: p.run.id, reason: error.message }); return; }
      if (error.name === "EngineUnavailableError") { halted = `verification path unavailable: ${error.message}`; outcomes.push({ id: p.run.id, failed: halted }); log("engine_unavailable", { run: p.run.id, error: error.message }); return; }
      halted = `unexpected error in ${p.run.id}: ${String(error.message ?? error).slice(0, 200)}`;
      outcomes.push({ id: p.run.id, failed: halted });
      log("error", { run: p.run.id, error: String(error.stack ?? error).slice(0, 600) });
    }
  }
  async function pool(items) {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => { while (next < items.length) { const item = items[next]; next += 1; await task(item); } }));
  }
  const only = args.only ? new Set(args.only.split(",")) : null;
  for (const priority of [...new Set(RUNS.map((r) => r.priority))].sort((a, b) => a - b)) {
    const group = prepared.filter((p) => p.run.priority === priority && (!only || only.has(p.run.id)));
    if (!group.length) continue;
    log("group_start", { priority, runs: group.map((p) => p.run.id) });
    await pool(group);
    const l = loadLedger(LEDGER);
    log("group_done", { priority, spent: spentOf(l), settled: settledOf(l), experiment_spent: Number((spentOf(l) - PRIOR_SPEND_USD).toFixed(5)) });
  }
  const l = loadLedger(LEDGER);
  writeFileSync(here("./controls/run-outcomes.json"), `${JSON.stringify({ finished_at: new Date().toISOString(), halted, spent_usd: spentOf(l), experiment_spent_usd: Number((spentOf(l) - PRIOR_SPEND_USD).toFixed(5)), remaining_usd: Number((l.cap_usd - spentOf(l)).toFixed(6)), outcomes }, null, 2)}\n`);
  log("finished", { halted, spent: spentOf(l), runs: outcomes.length });
  process.exit(halted ? (halted.startsWith("budget") ? 7 : 9) : 0);
}
