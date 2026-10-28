// The unattended pipeline of one EXP-16 run: preflight -> budget reservation -> one Message Batch -> save the answer -> verify every proposal -> (continuation round built by the
// harness from the model's own verified proposals) -> save. Everything that touches the outside world is injected (`deps`), so the same code is tested with fakes and run for real.
//   * No automatic retry of a model call: a failed or unusable call is recorded and the run ends; a batch that was created is never created again (state.json holds its id and a restart
//     only collects it).
//   * The worst case of every call is reserved in the spend ledger before it is sent, and replaced by the cost computed from the usage object when it returns.
//   * Every answer is written to disk before anything else is done with it.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildCard, buildRound2Message } from "./prompt.mjs";
import { classify, locateFinding, parseModelOutput, syntheticRows, verificationItems } from "./validate.mjs";
import { costOf, lockSha256, requestSha256, summarizeMessage } from "./request.mjs";
import { guardSpend, loadLedger, reserve, settle, settledOf } from "./ledger.mjs";
import { verifyItems } from "./verify-rest.mjs";

export class BudgetStop extends Error { constructor(message) { super(message); this.name = "BudgetStop"; } }

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const prefixed = (round, findings) => findings.map((f, k) => ({ ...f, modelId: f.id, id: `r${round}.f${String(k + 1).padStart(2, "0")}` }));

/** One batch with one request. Returns { response } on a usable answer, or { failed } with the reason. Never creates a second batch for the same file. */
export async function callOnce({ run, round, request, record, dir, deps }) {
  const file = `round${round}-response.json`;
  const statePath = `${dir}/state-round${round}.json`;
  const reservationId = `${run.id} round${round}`;
  if (existsSync(`${dir}/${file}`)) return { response: readJson(`${dir}/${file}`), resumed: true };
  const previous = existsSync(statePath) ? readJson(statePath) : null;
  if (previous?.failed) return { failed: previous.failed, resumed: true };
  let batchId = previous?.batch_id ?? null;
  if (!batchId) {
    const ledger = loadLedger(deps.ledgerPath);
    const guard = guardSpend(ledger, record.upper_bound_usd, { batch: true });
    if (!guard.ok) throw new BudgetStop(guard.reason);
    if (run.priority >= 4 && settledOf(ledger) > deps.diagnosticsMaxSpent) throw new BudgetStop(`diagnostics only while spent <= ${deps.diagnosticsMaxSpent} (spent ${settledOf(ledger)})`);
    reserve(deps.ledgerPath, { id: reservationId, usd: Number((0.5 * record.upper_bound_usd).toFixed(6)), at: deps.now(), note: "worst case reserved before the call" });
    try {
      const created = await deps.client.messages.batches.create({ requests: [{ custom_id: "els-live-1", params: request }] }, { maxRetries: 0 });
      batchId = created.id;
      writeJson(statePath, { batch_id: batchId, created_at: created.created_at ?? deps.now(), request_sha256: requestSha256(request), lock_sha256: lockSha256(request) });
      deps.log("batch_created", { run: run.id, round, batch: batchId });
    } catch (error) {
      // A 4xx answer (the lock's own refusal, or the API rejecting the request) means no batch was created and nothing is billed: the reservation is released. Any other failure (a network error,
      // a timeout, a 5xx) leaves the outcome unknown: the reservation (worst case) is kept as the spend. Nothing is retried either way.
      const refused = [400, 401, 403, 404, 413, 422].includes(error?.status);
      settle(deps.ledgerPath, reservationId, { usd: refused ? 0 : Number((0.5 * record.upper_bound_usd).toFixed(6)), kind: refused ? "batch-refused-nothing-billed" : "batch-create-outcome-unknown", error: String(error.message ?? error).slice(0, 200), at: deps.now() });
      const failed = `batch create failed: ${String(error.message ?? error).slice(0, 200)}`;
      writeJson(statePath, { failed });
      deps.log("batch_create_failed", { run: run.id, round, error: failed });
      return { failed };
    }
  }
  const started = Date.parse(readJson(statePath).created_at) || Date.now();
  let current = await deps.client.messages.batches.retrieve(batchId);
  while (current.processing_status !== "ended") {
    if (Date.now() - started > deps.maxWaitMs) { const failed = `batch ${batchId} did not end within ${deps.maxWaitMs} ms (reservation kept)`; writeJson(statePath, { ...readJson(statePath), failed }); deps.log("batch_wait_timeout", { run: run.id, round, batch: batchId }); return { failed }; }
    await deps.sleep(deps.pollMs);
    current = await deps.client.messages.batches.retrieve(batchId);
  }
  const entries = await deps.fetchResults(batchId);
  const result = entries.find((entry) => entry.custom_id === "els-live-1")?.result;
  const batch = { id: batchId, created_at: current.created_at, ended_at: current.ended_at, request_counts: current.request_counts };
  const ms = Date.parse(current.ended_at) - Date.parse(current.created_at);
  if (result?.type !== "succeeded") {
    const failed = `the batch result is "${result?.type}", not "succeeded"`;
    writeJson(`${dir}/${file}`.replace(".json", "-failed.json"), { run: run.id, batch, result, request_sha256: requestSha256(request) });
    settle(deps.ledgerPath, reservationId, { usd: 0, kind: "batch", batch: batchId, note: failed, at: deps.now() });
    writeJson(statePath, { ...readJson(statePath), failed });
    deps.log("batch_not_succeeded", { run: run.id, round, batch: batchId, type: result?.type });
    return { failed };
  }
  const summary = summarizeMessage(result.message);
  const cost = costOf(summary.model, summary.usage, { batch: true });
  const response = { request_sha256: requestSha256(request), lock_sha256: lockSha256(request), transport: "proxy", batch, preflight: record, ms, cost, summary, content: result.message.content, run: run.id };
  writeJson(`${dir}/${file}`, response); // the answer is on disk before anything else is done with it
  settle(deps.ledgerPath, reservationId, { usd: cost.usd, kind: "batch", batch: batchId, model: summary.model, stop_reason: summary.stop_reason, input_tokens: summary.usage?.input_tokens, cache_write_tokens: summary.usage?.cache_creation_input_tokens, output_tokens: summary.usage?.output_tokens, thinking_tokens: summary.usage?.output_tokens_details?.thinking_tokens ?? null, at: deps.now() });
  deps.log("call_done", { run: run.id, round, batch: batchId, usd: cost.usd, stop_reason: summary.stop_reason, output_tokens: summary.usage?.output_tokens, ms });
  return { response };
}

/** Locates, verifies and classifies the proposals of one round. Writes located / engine / classified files. */
export async function verifyRound({ run, round, response, ctx, dir, deps }) {
  const parsed = parseModelOutput(response.summary.text);
  if (!parsed.ok) return { failed: `round ${round}: ${parsed.error}` };
  const findings = prefixed(round, parsed.value.findings);
  const located = findings.map((f) => locateFinding(f, ctx));
  writeJson(`${dir}/located-round${round}.json`, located);
  const items = verificationItems(located);
  const rows = ctx.region.synthetic ? syntheticRows(located) : await verifyItems(items, { torah: deps.torah, rpc: deps.rpc, concurrency: deps.engineConcurrency });
  writeJson(`${dir}/engine-round${round}.json`, [{ verification: rows }]);
  const classified = classify(located, rows);
  writeJson(`${dir}/classified-round${round}.json`, classified);
  deps.log("verified", { run: run.id, round, proposals: classified.length, verified: classified.filter((f) => f.verdict !== "not_verified").length, items: items.length });
  return { findings, classified };
}

/** The continuation request: the approved round-1 request, the model's own answer, and cards built from its verified proposals that asked to continue (at most `cap`). */
export function buildContinuation({ request, response, findings, classified, ctx, cap }) {
  const wanted = new Map(findings.map((f) => [f.id, f]));
  const chosen = classified.filter((f) => f.verdict !== "not_verified" && f.occurrences.length && wanted.get(f.id)?.continue_from === true).slice(0, cap);
  if (!chosen.length) return null;
  const cards = chosen.map((f) => buildCard({ region: ctx.region, lines: ctx.lines, byReading: ctx.byReading, findingId: f.id, text: f.text, readingId: f.occurrences[0].reading, from: f.occurrences[0].from, to: f.occurrences[0].to }));
  return { cards: chosen.length, request: { ...request, cache_control: { type: "ephemeral" }, messages: [...request.messages, { role: "assistant", content: response.content }, { role: "user", content: buildRound2Message({ cards }) }] } };
}

/** The whole life of one run. Returns a record for the log; never throws for a failed model call (it is recorded), but lets BudgetStop and engine errors out. */
export async function pipeline({ run, ctx, request, planEntry, deps }) {
  const dir = deps.runDir(run.id);
  mkdirSync(dir, { recursive: true });
  if (requestSha256(request) !== planEntry.request_sha256 || lockSha256(request) !== planEntry.lock_sha256) throw new Error(`${run.id}: the request differs from the reviewed plan; nothing was sent`);
  writeFileSync(`${dir}/request-round1.json`, JSON.stringify(request, null, 2));
  const out = { id: run.id, series: run.series, rounds: [] };
  let record = null;
  if (!existsSync(`${dir}/round1-response.json`) && !existsSync(`${dir}/state-round1.json`)) {
    record = await deps.preflight(deps.client, request);
    writeJson(`${dir}/preflight-round1.json`, record);
    if (!record.ok) { out.failed = `preflight: ${record.reason ?? JSON.stringify(record.checks)}`; deps.log("preflight_failed", { run: run.id, failed: out.failed }); return out; }
  } else if (existsSync(`${dir}/preflight-round1.json`)) record = readJson(`${dir}/preflight-round1.json`);
  const first = await callOnce({ run, round: 1, request, record: record ?? { upper_bound_usd: 0 }, dir, deps });
  if (first.failed) { out.failed = first.failed; return out; }
  const usable = first.response.summary.stop_reason === "end_turn" && parseModelOutput(first.response.summary.text).ok;
  out.rounds.push({ round: 1, stop_reason: first.response.summary.stop_reason, usd: first.response.cost.usd, usable });
  if (!usable) { out.failed = `no usable answer (stop_reason ${first.response.summary.stop_reason}); cost counted, not retried`; deps.log("unusable_answer", { run: run.id, stop_reason: first.response.summary.stop_reason }); return out; }
  const verified1 = existsSync(`${dir}/classified-round1.json`) ? null : await verifyRound({ run, round: 1, response: first.response, ctx, dir, deps });
  if (verified1?.failed) { out.failed = verified1.failed; return out; }
  if (!run.round2) return out;
  const parsed1 = parseModelOutput(first.response.summary.text).value.findings;
  const findings = prefixed(1, parsed1);
  const classified1 = readJson(`${dir}/classified-round1.json`);
  let request2;
  if (existsSync(`${dir}/request-round2.json`)) request2 = readJson(`${dir}/request-round2.json`);
  else {
    const built = buildContinuation({ request, response: first.response, findings, classified: classified1, ctx, cap: deps.round2Cap });
    if (!built) { out.round2 = "no verified proposal asked to continue"; deps.log("no_continuation", { run: run.id }); return out; }
    request2 = built.request;
    writeJson(`${dir}/request-round2.json`, request2);
    out.cards = built.cards;
  }
  const record2 = existsSync(`${dir}/state-round2.json`) || existsSync(`${dir}/round2-response.json`) ? (existsSync(`${dir}/preflight-round2.json`) ? readJson(`${dir}/preflight-round2.json`) : { upper_bound_usd: 0 }) : await deps.preflight(deps.client, request2);
  if (!existsSync(`${dir}/preflight-round2.json`)) writeJson(`${dir}/preflight-round2.json`, record2);
  if (!record2.ok && !existsSync(`${dir}/state-round2.json`) && !existsSync(`${dir}/round2-response.json`)) { out.failed = `round 2 preflight: ${record2.reason ?? JSON.stringify(record2.checks)}`; return out; }
  const second = await callOnce({ run, round: 2, request: request2, record: record2, dir, deps });
  if (second.failed) { out.round2 = second.failed; return out; }
  const usable2 = second.response.summary.stop_reason === "end_turn" && parseModelOutput(second.response.summary.text).ok;
  out.rounds.push({ round: 2, stop_reason: second.response.summary.stop_reason, usd: second.response.cost.usd, usable: usable2 });
  if (!usable2) { out.round2 = `no usable answer (stop_reason ${second.response.summary.stop_reason}); cost counted, not retried`; return out; }
  if (!existsSync(`${dir}/classified-round2.json`)) { const verified2 = await verifyRound({ run, round: 2, response: second.response, ctx, dir, deps }); if (verified2.failed) out.round2 = verified2.failed; }
  return out;
}
