#!/usr/bin/env node
// EXP-22 runner.  Stages:  plan | status | selftest | run | reprocess
//   plan       offline: rebuilds the two requests with the product module, writes controls/plan-review.{json,md} and the ledger seed. No network, no key.
//   status     prints the experiment ledger.
//   selftest   (needs the temporary pass-through: ELS_PROXY_URL / ELS_PROXY_TOKEN / ELS_PROXY_JWT) probes that it is locked as designed: every probe must be refused.
//   run        sends the two requests one at a time (U, then A) with the budget guard: the model and token count are checked first, the worst case is reserved in the ledger before a
//              request is sent, the answer is saved as received before anything is done to it. NEVER retries a provider call and never sends a request twice.
//   reprocess  (no provider call) rebuilds result.json from the saved answer of a run, e.g. after a verification-path outage.
//   node experiments/els-axis-addendum/run.mjs plan
//   NODE_USE_ENV_PROXY=1 node experiments/els-axis-addendum/run.mjs run
// Exit codes: 2 no credential, 3 plan mismatch, 6 pass-through not locked as designed, 7 budget, 8 verification path unavailable, 9 other / unknown outcome.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as M from "../../supabase/functions/_shared/elsMatrixReading.js";
import { CAP, EXPERIMENT_CAP_USD, INPUT_MARGIN, LIVE_RUN_REQUEST_SHA256_PREFIX, MODEL, RUNS } from "./lib/plan.mjs";
import { buildArms } from "./lib/arms.mjs";
import { guard, loadLedger, reserve, seed, settle, settledOf, spentOf } from "./lib/ledger.mjs";
import { NoCredentialError, PROXY_JWT_ENV, PROXY_TOKEN_ENV, PROXY_URL_ENV, hasProxy, makeProxyFetch } from "./lib/proxy.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
export const SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
export const TOKENS_PER_CHAR = 0.798; // calibrated on the live run: 21,541 billed input tokens for the 26,419 + system characters of the uniform request

/** Worst case of one run at batch prices: the input times the margin plus the whole output allowance. */
export const worstCaseUsd = (inputTokens) => M.costFromUsage(MODEL.id, { input_tokens: Math.ceil(inputTokens * INPUT_MARGIN), output_tokens: MODEL.maxTokens }, { batch: true }).usd;

const paths = (a, b, path = "") => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => paths(a[k], b[k], `${path}${Array.isArray(a) ? `[${k}]` : `.${k}`}`));
  return [path];
};

export async function planReview() {
  const { ctx, arms } = await buildArms();
  const runs = arms.map((arm) => {
    const chars = arm.request.system.length + arm.prompt.user.length;
    const estInput = Math.round(chars * TOKENS_PER_CHAR);
    return {
      id: arm.run.id, focus: arm.run.focus, instruction: arm.instruction, custom_id: arm.run.customId, model: MODEL.id, effort: MODEL.effort, max_tokens: MODEL.maxTokens, cap: CAP,
      rows: ctx.region.nRows, cols: ctx.region.nCols, cells: ctx.region.nRows * ctx.region.nCols, lines: ctx.lines.length, prompt_chars: chars, est_input_tokens: estInput,
      worst_case_usd: worstCaseUsd(estInput), request_sha256: arm.requestSha256, lock_sha256: arm.lockSha256,
    };
  });
  const [u, a] = arms;
  const total = Number(runs.reduce((sum, r) => sum + r.worst_case_usd, 0).toFixed(4));
  return {
    created_for: "EXP-22", window_sha256: ctx.data.window_sha256, window: { width: ctx.data.width, r0: ctx.data.r0, c0: ctx.data.c0, rows: ctx.region.nRows, cols: ctx.region.nCols },
    window_matches_selectWindow: ctx.window.r0 === ctx.data.r0 && ctx.window.c0 === ctx.data.c0 && ctx.window.width === ctx.data.width,
    experiment_cap_usd: EXPERIMENT_CAP_USD, model: MODEL, runs,
    u_equals_live_run_request: u.requestSha256.startsWith(LIVE_RUN_REQUEST_SHA256_PREFIX),
    request_differences_u_to_a: paths(u.request, a.request),
    budget: { sum_of_worst_cases_usd: total, fits_cap: total <= EXPERIMENT_CAP_USD, headroom_usd: Number((EXPERIMENT_CAP_USD - total).toFixed(4)),
      note: "the estimate uses 0.798 tokens per character (calibrated on the live run); the preflight replaces it with the provider's exact count (free) and the guard reserves the run's worst case before sending it" },
    function: { slug: "els-live-reading", batch_only: true, count_tokens_allowed: true, models: [MODEL.id], approved_lock_sha256: runs.map((r) => r.lock_sha256), round2: "none", disabled_after: true },
  };
}

export function planMarkdown(review) {
  const lines = ["| run | instruction | cap | window | cells | lines | est. input tokens | worst case | request sha | lock sha |", "|---|---|---|---|---|---|---|---|---|---|"];
  for (const r of review.runs) lines.push(`| ${r.id} | ${r.instruction} | ${r.cap} | ${r.rows}x${r.cols} | ${r.cells} | ${r.lines} | ${r.est_input_tokens} | $${r.worst_case_usd.toFixed(3)} | ${r.request_sha256.slice(0, 12)} | ${r.lock_sha256.slice(0, 12)} |`);
  lines.push("", `Sum of the two worst cases (every run to max_tokens): $${review.budget.sum_of_worst_cases_usd}. Cap $${review.experiment_cap_usd}; headroom $${review.budget.headroom_usd}. Request differences U to A: ${review.request_differences_u_to_a.join(", ")}. U equals the live run's request: ${review.u_equals_live_run_request}.`);
  return `${lines.join("\n")}\n`;
}

/** Everything that turns a saved provider answer into the result of the run. Provider-free apart from the engine's read-only replay. */
export async function processEntry({ arm, ctx, entry, batch, timing, fetchImpl, restHeaders }) {
  const model = MODEL.id;
  const base = { experiment: "EXP-22", run: arm.run.id, focus: arm.run.focus, instruction: arm.instruction, request_sha256: arm.requestSha256, lock_sha256: arm.lockSha256, model, cap: CAP, window_sha256: ctx.data.window_sha256,
    batch: batch ? { id: batch.id, created_at: batch.created_at ?? null, ended_at: batch.ended_at ?? null, request_counts: batch.request_counts ?? null } : null, timing };
  if (entry.result?.type !== "succeeded") return { ...base, state: "FAILED", reason: `batch_${entry.result?.type ?? "no_result"}`, cost: { usd: null, note: "no usage object was returned" } };
  const message = entry.result.message;
  const usage = message.usage ?? null;
  const cost = M.costFromUsage(message.model ?? model, usage, { batch: true });
  const text = (message.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const output = { stop_reason: message.stop_reason ?? null, input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null, thinking_tokens: usage?.output_tokens_details?.thinking_tokens ?? null };
  const common = { ...base, usage, cost, output };
  if (message.stop_reason !== "end_turn") return { ...common, state: "INCOMPLETE", reason: message.stop_reason ?? "no_stop_reason", note: "the answer was cut off; nothing from it is shown; the cost was incurred" };
  const parsed = M.parseModelOutput(text);
  if (!parsed.ok) return { ...common, state: "INCOMPLETE", reason: "invalid_json", note: parsed.error };
  const rawFindings = parsed.value.findings.map((f, k) => ({ ...f, modelId: f.id, id: `r1.f${String(k + 1).padStart(2, "0")}` }));
  const located = rawFindings.map((f) => M.locateFinding(f, { region: ctx.region, byReading: ctx.byReading }));
  const replay = (item) => M.replayOccurrence(item, { fetchImpl, supabaseUrl: SUPABASE_URL, restHeaders });
  const rows = await M.verifyOccurrences(M.verificationItems(located), { region: ctx.region, replay });
  const classified = M.classify(located, rows);
  const findings = M.viewFindings({ classified, raw: rawFindings, region: ctx.region, rows });
  const summary = M.summarizeFindings(findings);
  const review = parsed.value.review ?? null;
  return { ...common, state: "COMPLETE", findings, summary, cap_info: { requested: CAP, proposals: rawFindings.length, reached: rawFindings.length >= CAP },
    coverage: M.describeCoverage({ region: ctx.region, lines: ctx.lines, window: ctx.window, focus: arm.run.focus }),
    coverage_report: M.buildCoverageReport({ region: ctx.region, lines: ctx.lines, window: ctx.window, focus: arm.run.focus, findings, review, cap: CAP }),
    review, observations: String(parsed.value.observations ?? "").slice(0, 600) };
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

  if (stage === "plan") {
    const review = await planReview();
    writeFileSync(here("./controls/plan-review.json"), `${JSON.stringify(review, null, 2)}\n`);
    writeFileSync(here("./controls/plan-review.md"), planMarkdown(review));
    writeFileSync(here("./controls/budget-ledger.seed.json"), `${JSON.stringify(seed(EXPERIMENT_CAP_USD), null, 2)}\n`);
    process.stdout.write(planMarkdown(review));
    return;
  }
  if (stage === "status") {
    const ledger = loadLedger(LEDGER);
    process.stdout.write(`${JSON.stringify({ cap: ledger.cap_usd, spent_or_reserved: spentOf(ledger), settled: settledOf(ledger), remaining: Number((ledger.cap_usd - spentOf(ledger)).toFixed(5)), entries: ledger.entries }, null, 2)}\n`);
    return;
  }

  const env = process.env;
  if (!hasProxy(env)) { process.stderr.write(`${new NoCredentialError().message}\n`); process.exit(2); }
  const proxyFetch = makeProxyFetch(env);
  const key = "pass-through"; // the product's provider helpers want a key; the pass-through strips it and holds the real credential
  const restHeaders = (extra = {}) => ({ apikey: env[PROXY_JWT_ENV].trim(), authorization: `Bearer ${env[PROXY_JWT_ENV].trim()}`, ...extra });

  // ---- 1. the plan: every request equals what was reviewed
  const plan = JSON.parse(readFileSync(here("./controls/plan-review.json"), "utf8"));
  const { ctx, arms } = await buildArms();
  for (const arm of arms) {
    const entry = plan.runs.find((r) => r.id === arm.run.id);
    if (!entry || entry.request_sha256 !== arm.requestSha256 || entry.lock_sha256 !== arm.lockSha256) die(3, `${arm.run.id}: the request differs from the reviewed plan; nothing was sent`);
  }
  if (arms.length !== plan.runs.length || !plan.u_equals_live_run_request || !plan.window_matches_selectWindow) die(3, "the plan is not what was reviewed");
  log("plan_verified", { runs: arms.length });

  if (stage === "reprocess") {
    const id = args.run;
    const arm = arms.find((a) => a.run.id === id);
    if (!arm) die(9, "reprocess needs --run U|A");
    const saved = JSON.parse(readFileSync(here(`./controls/runs/${id}/batch-entry.json`), "utf8"));
    const result = await processEntry({ arm, ctx, entry: saved.entry, batch: saved.batch, timing: saved.timing, fetchImpl: fetch, restHeaders });
    writeFileSync(here(`./controls/runs/${id}/result.json`), `${JSON.stringify(result, null, 2)}\n`);
    log("reprocessed", { run: id, state: result.state });
    return;
  }

  // ---- 2. the pass-through must be locked as designed (every probe is expected to be refused)
  async function probe(name, path, { method = "GET", token = env[PROXY_TOKEN_ENV], body = null } = {}) {
    const response = await fetch(`${env[PROXY_URL_ENV].trim().replace(/\/$/, "")}${path}`, { method, headers: { authorization: `Bearer ${env[PROXY_JWT_ENV].trim()}`, ...(token ? { "x-els-token": token } : {}), "content-type": "application/json", "anthropic-version": "2026-10-21" }, body: body ? JSON.stringify(body) : undefined });
    const text = await response.text();
    return { name, status: response.status, body: text.slice(0, 120) };
  }
  async function selftest() {
    const tiny = { model: MODEL.id, max_tokens: 16, messages: [{ role: "user", content: "x" }] };
    const checks = [
      [() => probe(`known model ${MODEL.id} with the token`, `/v1/models/${MODEL.id}`), (r) => r.status === 200],
      [() => probe("no token", `/v1/models/${MODEL.id}`, { token: "" }), (r) => r.status === 403],
      [() => probe("wrong token", `/v1/models/${MODEL.id}`, { token: "0".repeat(64) }), (r) => r.status === 403],
      [() => probe("an unapproved batch", "/v1/messages/batches", { method: "POST", body: { requests: [{ custom_id: "els-live-selftest", params: tiny }] } }), (r) => r.status === 403 && /request_not_approved/.test(r.body)],
      [() => probe("another model (Sonnet)", "/v1/messages/count_tokens", { method: "POST", body: { model: "claude-sonnet-5-5", messages: tiny.messages } }), (r) => r.status === 403 && /model_not_allowed/.test(r.body)],
      [() => probe("another model (Opus)", "/v1/messages/count_tokens", { method: "POST", body: { model: "claude-opus-5-5", messages: tiny.messages } }), (r) => r.status === 403 && /model_not_allowed/.test(r.body)],
      [() => probe("the messages route", "/v1/messages", { method: "POST", body: tiny }), (r) => r.status === 404],
      [() => probe("another API area", "/v1/files"), (r) => r.status === 404],
      [() => probe("a batch list", "/v1/messages/batches"), (r) => r.status === 404],
    ];
    const done = [];
    for (const [call, ok] of checks) { const r = await call(); done.push([r, ok(r)]); }
    log("selftest", { results: done.map(([r, ok]) => ({ name: r.name, status: r.status, ok })) });
    const failed = done.filter(([, ok]) => !ok);
    if (failed.length) die(6, `the pass-through is not locked as designed: ${failed.map(([r]) => `${r.name} -> ${r.status} ${r.body}`).join("; ")}`);
  }
  await selftest();
  if (stage === "selftest") return;
  if (stage !== "run") die(9, `unknown stage ${stage}`);

  // ---- 3. the verification path answers a known question (a positive and a negative control; read-only)
  try {
    const known = await M.replayOccurrence({ term: ctx.axis.term, skip: ctx.axis.skip, dir: ctx.axis.dir, start: ctx.axis.start }, { fetchImpl: fetch, supabaseUrl: SUPABASE_URL, restHeaders });
    const shifted = await M.replayOccurrence({ term: ctx.axis.term, skip: ctx.axis.skip, dir: ctx.axis.dir, start: ctx.axis.start + 1 }, { fetchImpl: fetch, supabaseUrl: SUPABASE_URL, restHeaders });
    if (known?.verification_state !== "MATCH" || shifted?.verification_state === "MATCH") die(8, `the engine contract did not confirm the control (${known?.verification_state}/${shifted?.verification_state})`);
  } catch (error) { die(8, `the verification path is unavailable: ${String(error.message ?? error)}`); }

  // ---- 4. the sequence: U then A, one at a time. A request is never sent twice.
  if (!existsSync(LEDGER)) writeFileSync(LEDGER, readFileSync(here("./controls/budget-ledger.seed.json")));
  const outcomes = [];
  let halted = null;
  for (const arm of arms) {
    if (halted) { outcomes.push({ id: arm.run.id, skipped: halted }); log("skipped", { run: arm.run.id, reason: halted }); continue; }
    const id = arm.run.id;
    const dir = here(`./controls/runs/${id}`);
    mkdirSync(dir, { recursive: true });
    if (existsSync(`${dir}/batch-entry.json`) || loadLedger(LEDGER).entries.some((e) => e.id === id)) die(9, `${id} was already started: a run is never sent twice (use reprocess)`);
    try {
      const model = await M.verifyModel({ fetchImpl: proxyFetch, key, model: MODEL.id, effort: MODEL.effort, maxTokens: MODEL.maxTokens });
      if (!model.ok) die(9, `${id}: the model does not fit the request: ${JSON.stringify(model.checks)}`);
      const counted = await M.countInputTokens({ fetchImpl: proxyFetch, key, request: arm.request });
      const worst = worstCaseUsd(counted);
      const verdict = guard(loadLedger(LEDGER), worst);
      writeFileSync(`${dir}/preflight.json`, `${JSON.stringify({ run: id, model, input_tokens_counted: counted, worst_case_usd: worst, guard: verdict, request_sha256: arm.requestSha256, lock_sha256: arm.lockSha256 }, null, 2)}\n`);
      writeFileSync(`${dir}/request.json`, `${JSON.stringify(arm.request, null, 2)}\n`);
      log("preflight", { run: id, counted, worst, guard: verdict });
      if (!verdict.ok) { halted = `budget: ${verdict.reason}`; outcomes.push({ id, skipped: halted }); log("budget_stop", { run: id, reason: verdict.reason }); continue; }
      reserve(LEDGER, { id, usd: worst, note: "worst case reserved before the request is sent" });
      const startedMs = Date.now();
      let created;
      try { created = await M.createBatch({ fetchImpl: proxyFetch, key, request: arm.request, customId: arm.run.customId }); } catch (error) {
        // outcome unknown: the provider may have created the batch. The reservation stays (it may be billed) and nothing else is sent.
        settle(LEDGER, id, { usd: worst, unknown_outcome: true, note: `batch creation outcome unknown (${String(error.message ?? error).slice(0, 120)}); the worst case stays counted` });
        halted = `${id}: batch creation outcome unknown`; outcomes.push({ id, failed: halted }); log("create_unknown", { run: id, error: String(error.message ?? error).slice(0, 200) });
        continue;
      }
      log("batch_created", { run: id, batch: created.id });
      writeFileSync(`${dir}/batch-created.json`, `${JSON.stringify(created, null, 2)}\n`);
      let batch = created, pollErrors = 0;
      while (batch.processing_status !== "ended") {
        if (Date.now() - startedMs > 2 * 60 * 60 * 1000) { halted = `${id}: batch ${created.id} did not end within 2 hours; reservation kept`; break; }
        await new Promise((resolve) => setTimeout(resolve, 15_000));
        try { batch = await M.retrieveBatch({ fetchImpl: proxyFetch, key, batchId: created.id }); pollErrors = 0; } catch (error) {
          pollErrors += 1; log("poll_error", { run: id, n: pollErrors, error: String(error.message ?? error).slice(0, 160) });
          if (pollErrors >= 12) { halted = `${id}: batch ${created.id} could not be polled; reservation kept`; break; }
        }
      }
      if (halted) { outcomes.push({ id, failed: halted, batch: created.id }); log("halted", { run: id, reason: halted }); continue; }
      const entry = await M.fetchBatchEntry({ fetchImpl: proxyFetch, key, batch, customId: arm.run.customId });
      const timing = { created_at: batch.created_at ?? null, ended_at: batch.ended_at ?? null, batch_ms: Math.max(0, Date.parse(batch.ended_at) - Date.parse(batch.created_at)) || null, wall_ms: Date.now() - startedMs };
      writeFileSync(`${dir}/batch-entry.json`, `${JSON.stringify({ saved_as_received: true, batch: { id: batch.id, created_at: batch.created_at, ended_at: batch.ended_at, request_counts: batch.request_counts, results_url: batch.results_url }, timing, entry }, null, 2)}\n`);
      const usd = M.costFromUsage(MODEL.id, entry.result?.message?.usage ?? null, { batch: true }).usd ?? 0;
      settle(LEDGER, id, { usd, batch: batch.id, result_type: entry.result?.type, note: "settled from the usage object and list prices (not an invoice)" });
      log("answer_saved", { run: id, result: entry.result?.type, usd });
      const result = await processEntry({ arm, ctx, entry, batch, timing, fetchImpl: fetch, restHeaders });
      writeFileSync(`${dir}/result.json`, `${JSON.stringify(result, null, 2)}\n`);
      outcomes.push({ id, state: result.state, usd, batch: batch.id });
      log("run_finished", { run: id, state: result.state, usd, proposals: result.cap_info?.proposals ?? null });
    } catch (error) {
      if (error?.name === "ReadingError" && error.code === "engine_unavailable") { halted = `${id}: verification path unavailable (the answer is saved; use reprocess)`; outcomes.push({ id, failed: halted }); log("engine_unavailable", { run: id }); continue; }
      halted = `unexpected error in ${id}: ${String(error?.message ?? error).slice(0, 200)}`;
      outcomes.push({ id, failed: halted });
      log("error", { run: id, error: String(error?.stack ?? error).slice(0, 600) });
    }
  }
  const ledger = loadLedger(LEDGER);
  writeFileSync(here("./controls/run-outcomes.json"), `${JSON.stringify({ finished_at: new Date().toISOString(), halted, spent_usd: spentOf(ledger), settled_usd: settledOf(ledger), cap_usd: ledger.cap_usd, remaining_usd: Number((ledger.cap_usd - spentOf(ledger)).toFixed(6)), outcomes }, null, 2)}\n`);
  log("finished", { halted, spent: spentOf(ledger), runs: outcomes.length });
  process.exit(halted ? 9 : 0);
}
