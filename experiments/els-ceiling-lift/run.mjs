#!/usr/bin/env node
// EXP-24 runner (narrow follow-up of EXP-23: the four saved-line groups, arm A only, ceiling 40).  Stages:  plan | status | selftest | run | reprocess
//   plan       offline: rebuilds every request with the product's renderer and the EXP-24 prompts, writes controls/plan-review.{json,md} (hashes, estimated and worst-case cost) and the ledger seed.
//              No network, no key. If the sum of the worst cases does not fit the budget the plan FAILS: groups must be removed in the plan (documented) before anything can run.
//   status     prints the ledger.
//   selftest   (needs the temporary pass-through: ELS_PROXY_URL / ELS_PROXY_TOKEN / ELS_PROXY_JWT) probes that it is locked as designed: every probe must be refused.
//   run        sends the requests in plan order (saved group, its control, ...), `--concurrency` at a time. Each request: model check, exact token count, the worst case is RESERVED in the
//              ledger before it is sent, the answer is saved as received before anything is done to it. NEVER retries a provider call and never sends a request twice.
//   reprocess  (no provider call) rebuilds result.json of a run from its saved answer.
//   node experiments/els-ceiling-lift/run.mjs plan
//   NODE_USE_ENV_PROXY=1 node experiments/els-ceiling-lift/run.mjs run --concurrency 4
// Exit codes: 2 no credential, 3 plan mismatch, 6 pass-through not locked as designed, 7 budget, 8 verification path unavailable, 9 other / unknown outcome.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as M from "../../supabase/functions/_shared/elsMatrixReading.js";
import { CAP, EXPERIMENT_CAP_USD, GROUP_SIZE, INPUT_MARGIN, MODEL, PREVIOUS_CAP, TOKENS_PER_CHAR } from "./lib/plan.mjs";
import { buildRuns } from "./lib/arms.mjs";
import { guard, loadLedger, reserve, seed, settle, settledOf, spentOf } from "../els-axis-addendum/lib/ledger.mjs";
import { NoCredentialError, PROXY_JWT_ENV, PROXY_TOKEN_ENV, PROXY_URL_ENV, hasProxy, makeProxyFetch } from "../els-axis-addendum/lib/proxy.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
export const SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";

/** Worst case of one run at batch prices: the input times the margin plus the whole output allowance. */
export const worstCaseUsd = (inputTokens) => M.costFromUsage(MODEL.id, { input_tokens: Math.ceil(inputTokens * INPUT_MARGIN), output_tokens: MODEL.maxTokens }, { batch: true }).usd;

export async function planReview() {
  const { ctx, groups, runs } = await buildRuns();
  const rows = runs.map((r) => {
    const chars = r.request.system.length + r.prompt.user.length;
    const est = Math.round(chars * TOKENS_PER_CHAR);
    return { id: r.id, group: r.group.id, role: r.group.role, control_of: r.group.control_of ?? null, arm: r.arm, lines: r.group.ids, custom_id: r.customId, prompt_chars: chars, est_input_tokens: est, worst_case_usd: worstCaseUsd(est), request_sha256: r.requestSha256, lock_sha256: r.lockSha256 };
  });
  const total = Number(rows.reduce((sum, r) => sum + r.worst_case_usd, 0).toFixed(4));
  return {
    created_for: "EXP-24", window_sha256: ctx.data.window_sha256, model: MODEL, group_size: GROUP_SIZE, cap_per_group: CAP, previous_cap_per_group: PREVIOUS_CAP, experiment_cap_usd: EXPERIMENT_CAP_USD,
    groups: groups.map((g) => ({ id: g.id, role: g.role, control_of: g.control_of ?? null, first: g.ids[0], last: g.ids[g.ids.length - 1], lines: g.ids })), runs: rows,
    budget: { requests: rows.length, sum_of_worst_cases_usd: total, fits_cap: total <= EXPERIMENT_CAP_USD, headroom_usd: Number((EXPERIMENT_CAP_USD - total).toFixed(4)),
      note: "the worst case of a request is the counted input x 1.25 plus the whole max_tokens allowance, at batch prices; the estimate uses 0.8 tokens per character and the preflight replaces it with the provider's exact count (free)" },
    function: { slug: "els-live-reading", batch_only: true, count_tokens_allowed: true, models: [MODEL.id], approved_lock_sha256: rows.map((r) => r.lock_sha256), round2: "none", disabled_after: true },
  };
}

export function planMarkdown(review) {
  const lines = ["| run | group | role | arm | lines | est. input tokens | worst case | request sha | lock sha |", "|---|---|---|---|---|---|---|---|---|"];
  for (const r of review.runs) lines.push(`| ${r.id} | ${r.group} | ${r.role}${r.control_of ? ` (of ${r.control_of})` : ""} | ${r.arm} | ${r.lines[0]}..${r.lines[r.lines.length - 1]} | ${r.est_input_tokens} | $${r.worst_case_usd.toFixed(3)} | ${r.request_sha256.slice(0, 12)} | ${r.lock_sha256.slice(0, 12)} |`);
  lines.push("", `Requests: ${review.budget.requests}. Sum of the worst cases (every request to max_tokens ${review.model.maxTokens}): $${review.budget.sum_of_worst_cases_usd}. Cap $${review.experiment_cap_usd}; headroom $${review.budget.headroom_usd}.`);
  return `${lines.join("\n")}\n`;
}

/** Everything that turns a saved provider answer into the result of one run. Provider-free apart from the engine's read-only replay. Proposals are located ONLY in the lines of their own group. */
export async function processEntry({ run, ctx, entry, batch, timing, fetchImpl, restHeaders }) {
  const base = { experiment: "EXP-24", run: run.id, group: run.group.id, role: run.group.role, control_of: run.group.control_of ?? null, arm: run.arm, lines: run.group.ids, request_sha256: run.requestSha256, lock_sha256: run.lockSha256, model: MODEL.id, cap: CAP, window_sha256: ctx.data.window_sha256,
    batch: batch ? { id: batch.id, created_at: batch.created_at ?? null, ended_at: batch.ended_at ?? null, request_counts: batch.request_counts ?? null } : null, timing };
  if (entry.result?.type !== "succeeded") return { ...base, state: "FAILED", reason: `batch_${entry.result?.type ?? "no_result"}`, cost: { usd: null, note: "no usage object was returned" } };
  const message = entry.result.message;
  const usage = message.usage ?? null;
  const cost = M.costFromUsage(message.model ?? MODEL.id, usage, { batch: true });
  const text = (message.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const output = { stop_reason: message.stop_reason ?? null, input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null, thinking_tokens: usage?.output_tokens_details?.thinking_tokens ?? null };
  const common = { ...base, usage, cost, output };
  if (message.stop_reason !== "end_turn") return { ...common, state: "INCOMPLETE", reason: message.stop_reason ?? "no_stop_reason", note: "the answer was cut off; nothing from it is shown; the cost was incurred" };
  const parsed = M.parseModelOutput(text);
  if (!parsed.ok) return { ...common, state: "INCOMPLETE", reason: "invalid_json", note: parsed.error };
  const byReading = M.readings(run.groupLines); // the readings the model was shown, nothing else
  const raw = parsed.value.findings.map((f, k) => ({ ...f, modelId: f.id, id: `${run.id}.f${String(k + 1).padStart(2, "0")}` }));
  const located = raw.map((f) => M.locateFinding(f, { region: ctx.region, byReading }));
  const replay = (item) => M.replayOccurrence(item, { fetchImpl, supabaseUrl: SUPABASE_URL, restHeaders });
  const rows = await M.verifyOccurrences(M.verificationItems(located), { region: ctx.region, replay });
  const classified = M.classify(located, rows);
  const views = M.viewFindings({ classified, raw, region: ctx.region, rows });
  const groupIds = new Set(run.group.ids);
  const seen = new Map();
  const findings = views.map((view, k) => {
    const claimed = String(raw[k].line ?? "").replace(/[+-]$/, "").toUpperCase();
    const signature = view.occurrence ? `${view.text}|${view.occurrence.cells.map(([i, j]) => `${i},${j}`).join(";")}` : null;
    const duplicate = signature ? seen.has(signature) : false;
    if (signature) seen.set(signature, true);
    const extra = { model_line: raw[k].line ?? "", cited_line_in_group: groupIds.has(claimed), duplicate };
    return { ...view, group_check: extra };
  });
  const state = (s) => findings.filter((f) => f.verification.state === s).length;
  const summary = { proposals: findings.length, engine_verified: state("ENGINE_VERIFIED"), source_rows: state("PLAIN_TEXT_ONLY"), not_verified: state("NOT_VERIFIED"), duplicates: findings.filter((f) => f.group_check.duplicate).length, cited_line_outside_group: findings.filter((f) => !f.group_check.cited_line_in_group).length };
  return { ...common, state: "COMPLETE", findings, summary, cap_info: { requested: CAP, proposals: raw.length, reached: raw.length >= CAP }, observations: String(parsed.value.observations ?? "").slice(0, 600) };
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
    if (!review.budget.fits_cap) { process.stderr.write(`STOP (7): the sum of the worst cases ${review.budget.sum_of_worst_cases_usd} does not fit the cap ${EXPERIMENT_CAP_USD}: remove groups in the plan, documented, before any run\n`); process.exit(7); }
    writeFileSync(here("./controls/plan-review.json"), `${JSON.stringify(review, null, 2)}\n`);
    writeFileSync(here("./controls/plan-review.md"), planMarkdown(review));
    writeFileSync(here("./controls/budget-ledger.seed.json"), `${JSON.stringify(seed(EXPERIMENT_CAP_USD), null, 2)}\n`);
    const { runs } = await buildRuns();
    const a = runs[0];
    writeFileSync(here("./controls/prompts-review.md"), [`# EXP-24 — ההנחיה כפי שתועבר למודל (לבדיקה לפני הריצה)`, "", `קבוצה לדוגמה: ${a.group.id} (${a.group.ids[0]}..${a.group.ids[a.group.ids.length - 1]}). בכל קבוצה הטקסט זהה חוץ מהקווים. ההנחיה היא זרוע A של EXP-23 (קריאה בסיסית); השינוי היחיד בה הוא התקרה (${PREVIOUS_CAP} -> ${CAP}) בסעיף 3.`, "", "## system (זהה לזה של מודול המוצר)", "", "```", a.request.system, "```", "", "## הודעת המשתמש", "", "```", a.prompt.user, "```", "", "## סכמת הפלט", "", "`findings[].{id, line, text}` + `observations`", ""].join("\n"));
    process.stdout.write(planMarkdown(review));
    return;
  }
  if (stage === "status") {
    const ledger = loadLedger(LEDGER);
    process.stdout.write(`${JSON.stringify({ cap: ledger.cap_usd, spent_or_reserved: spentOf(ledger), settled: settledOf(ledger), remaining: Number((ledger.cap_usd - spentOf(ledger)).toFixed(5)), entries: ledger.entries.length }, null, 2)}\n`);
    return;
  }

  const env = process.env;
  if (!hasProxy(env)) { process.stderr.write(`${new NoCredentialError().message}\n`); process.exit(2); }
  const proxyFetch = makeProxyFetch(env);
  const key = "pass-through";
  const restHeaders = (extra = {}) => ({ apikey: env[PROXY_JWT_ENV].trim(), authorization: `Bearer ${env[PROXY_JWT_ENV].trim()}`, ...extra });

  // ---- 1. the plan: every request equals what was reviewed
  const plan = JSON.parse(readFileSync(here("./controls/plan-review.json"), "utf8"));
  const { ctx, runs } = await buildRuns();
  if (runs.length !== plan.runs.length || !plan.budget.fits_cap) die(3, "the plan is not what was reviewed");
  for (const run of runs) {
    const entry = plan.runs.find((r) => r.id === run.id);
    if (!entry || entry.request_sha256 !== run.requestSha256 || entry.lock_sha256 !== run.lockSha256) die(3, `${run.id}: the request differs from the reviewed plan; nothing was sent`);
  }
  log("plan_verified", { runs: runs.length });

  if (stage === "reprocess") {
    const run = runs.find((r) => r.id === args.run);
    if (!run) die(9, "reprocess needs --run <id>");
    const saved = JSON.parse(readFileSync(here(`./controls/runs/${run.id}/batch-entry.json`), "utf8"));
    const result = await processEntry({ run, ctx, entry: saved.entry, batch: saved.batch, timing: saved.timing, fetchImpl: fetch, restHeaders });
    writeFileSync(here(`./controls/runs/${run.id}/result.json`), `${JSON.stringify(result, null, 2)}\n`);
    log("reprocessed", { run: run.id, state: result.state });
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

  // ---- 4. the sequence, `concurrency` at a time. A request is never sent twice.
  if (!existsSync(LEDGER)) writeFileSync(LEDGER, readFileSync(here("./controls/budget-ledger.seed.json")));
  const concurrency = Math.max(1, Math.min(4, Number(args.concurrency || 1)));
  const outcomes = [];
  let halted = null;
  async function one(run) {
    if (halted) { outcomes.push({ id: run.id, skipped: halted }); log("skipped", { run: run.id, reason: halted }); return; }
    const id = run.id;
    const dir = here(`./controls/runs/${id}`);
    mkdirSync(dir, { recursive: true });
    if (existsSync(`${dir}/batch-entry.json`) || loadLedger(LEDGER).entries.some((e) => e.id === id)) { halted = `${id} was already started: a run is never sent twice (use reprocess)`; outcomes.push({ id, failed: halted }); log("stop_duplicate", { run: id }); return; }
    try {
      const counted = await M.countInputTokens({ fetchImpl: proxyFetch, key, request: run.request });
      const worst = worstCaseUsd(counted);
      const verdict = guard(loadLedger(LEDGER), worst); // check and reserve with no await in between
      writeFileSync(`${dir}/preflight.json`, `${JSON.stringify({ run: id, input_tokens_counted: counted, worst_case_usd: worst, guard: verdict, request_sha256: run.requestSha256, lock_sha256: run.lockSha256 }, null, 2)}\n`);
      writeFileSync(`${dir}/request.json`, `${JSON.stringify(run.request, null, 2)}\n`);
      log("preflight", { run: id, counted, worst, guard: verdict });
      if (!verdict.ok) { halted = `budget: ${verdict.reason}`; outcomes.push({ id, skipped: halted }); log("budget_stop", { run: id, reason: verdict.reason }); return; }
      reserve(LEDGER, { id, usd: worst, note: "worst case reserved before the request is sent" });
      const startedMs = Date.now();
      let created;
      try { created = await M.createBatch({ fetchImpl: proxyFetch, key, request: run.request, customId: run.customId }); } catch (error) {
        settle(LEDGER, id, { usd: worst, unknown_outcome: true, note: `batch creation outcome unknown (${String(error.message ?? error).slice(0, 120)}); the worst case stays counted` });
        halted = `${id}: batch creation outcome unknown`; outcomes.push({ id, failed: halted }); log("create_unknown", { run: id, error: String(error.message ?? error).slice(0, 200) });
        return;
      }
      log("batch_created", { run: id, batch: created.id });
      writeFileSync(`${dir}/batch-created.json`, `${JSON.stringify(created, null, 2)}\n`);
      let batch = created, pollErrors = 0, gaveUp = null;
      while (batch.processing_status !== "ended") {
        if (Date.now() - startedMs > 2 * 60 * 60 * 1000) { gaveUp = `${id}: batch ${created.id} did not end within 2 hours; reservation kept`; break; }
        await new Promise((resolve) => setTimeout(resolve, 15_000));
        try { batch = await M.retrieveBatch({ fetchImpl: proxyFetch, key, batchId: created.id }); pollErrors = 0; } catch (error) {
          pollErrors += 1; log("poll_error", { run: id, n: pollErrors, error: String(error.message ?? error).slice(0, 160) });
          if (pollErrors >= 12) { gaveUp = `${id}: batch ${created.id} could not be polled; reservation kept`; break; }
        }
      }
      if (gaveUp) { halted = gaveUp; outcomes.push({ id, failed: gaveUp, batch: created.id }); log("halted", { run: id, reason: gaveUp }); return; }
      const entry = await M.fetchBatchEntry({ fetchImpl: proxyFetch, key, batch, customId: run.customId });
      const timing = { created_at: batch.created_at ?? null, ended_at: batch.ended_at ?? null, batch_ms: Math.max(0, Date.parse(batch.ended_at) - Date.parse(batch.created_at)) || null, wall_ms: Date.now() - startedMs };
      writeFileSync(`${dir}/batch-entry.json`, `${JSON.stringify({ saved_as_received: true, batch: { id: batch.id, created_at: batch.created_at, ended_at: batch.ended_at, request_counts: batch.request_counts, results_url: batch.results_url }, timing, entry }, null, 2)}\n`);
      const usd = M.costFromUsage(MODEL.id, entry.result?.message?.usage ?? null, { batch: true }).usd ?? 0;
      settle(LEDGER, id, { usd, batch: batch.id, result_type: entry.result?.type, note: "settled from the usage object and list prices (not an invoice)" });
      log("answer_saved", { run: id, result: entry.result?.type, usd });
      const result = await processEntry({ run, ctx, entry, batch, timing, fetchImpl: fetch, restHeaders });
      writeFileSync(`${dir}/result.json`, `${JSON.stringify(result, null, 2)}\n`);
      outcomes.push({ id, state: result.state, usd, batch: batch.id });
      log("run_finished", { run: id, state: result.state, usd, proposals: result.summary?.proposals ?? null });
    } catch (error) {
      if (error?.name === "ReadingError" && error.code === "engine_unavailable") { halted = `${id}: verification path unavailable (the answer is saved; use reprocess)`; outcomes.push({ id, failed: halted }); log("engine_unavailable", { run: id }); return; }
      halted = `unexpected error in ${id}: ${String(error?.message ?? error).slice(0, 200)}`;
      outcomes.push({ id, failed: halted });
      log("error", { run: id, error: String(error?.stack ?? error).slice(0, 600) });
    }
  }
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, runs.length) }, async () => { while (next < runs.length) { const run = runs[next]; next += 1; await one(run); } }));
  const ledger = loadLedger(LEDGER);
  writeFileSync(here("./controls/run-outcomes.json"), `${JSON.stringify({ finished_at: new Date().toISOString(), halted, spent_usd: spentOf(ledger), settled_usd: settledOf(ledger), cap_usd: ledger.cap_usd, remaining_usd: Number((ledger.cap_usd - spentOf(ledger)).toFixed(6)), outcomes }, null, 2)}\n`);
  log("finished", { halted, spent: spentOf(ledger), runs: outcomes.length });
  process.exit(halted ? 9 : 0);
}
