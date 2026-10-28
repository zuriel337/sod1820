// EXP-12 pilot: request construction and the life of one pool-arm run. Everything that touches the outside world is injected (`deps`), so the same code is tested with fakes and run for real.
// The model call itself is EXP-16's `callOnce` (reservation of the worst case before the call, one batch per run, no retry, the answer on disk before anything is done with it).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { callOnce } from "../../els-live-reading/lib/orchestrate.mjs";
import { buildRequest, lockSha256, requestSha256 } from "../../els-live-reading/lib/request.mjs";
import { ANSWER_SCHEMA, buildPacket } from "./packet.mjs";
import { ARMS, MODELS, poolIdOf } from "./plan.mjs";
import { confirmed, verifyItems } from "./verify.mjs";
import { groupStats, parseAnswer, termsOf, validateAnswer } from "./validate.mjs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

/** The request of a pool-arm run (no network, no ledger). */
export function requestOf({ run, pool }) {
  const arm = ARMS[run.arm], model = MODELS[run.model];
  const packet = buildPacket({ pool, arm: { named: arm.named, hint: arm.hint } });
  const request = buildRequest({ model: model.id, system: packet.system, messages: [{ role: "user", content: packet.user }], effort: model.effort, maxTokens: model.maxTokens, thinkingMode: model.thinkingMode, schema: ANSWER_SCHEMA });
  return { packet, request };
}

/** Validation, engine confirmation and group statistics of a saved answer. Pure given `torah` and `rpc`. */
export async function evaluateAnswer({ pool, packet, text, torah, rpc, concurrency = 4 }) {
  const parsed = parseAnswer(text);
  if (!parsed.ok) return { ok: false, code: parsed.code, error: parsed.error };
  const validation = validateAnswer({ pool, listedRelationIds: packet.listedRelationIds, answer: parsed.value });
  const items = termsOf(validation.engineItems, torah);
  const rows = items.length ? await verifyItems(items.map((item) => ({ ...item, key: item.key })), { torah, rpc, concurrency }) : [];
  const byKey = new Map(rows.map((row) => [row.key, row]));
  for (const phrase of validation.phrases) { const row = byKey.get(`phrase:${phrase.order - 1}`); if (row) { phrase.engine = row; phrase.status = confirmed(row) ? "engine_confirmed" : "engine_not_confirmed"; } }
  for (const c of validation.continuations) { const row = byKey.get(`continuation:${c.order - 1}`); if (row) { c.engine = row; c.status = confirmed(row) ? "engine_confirmed" : "engine_not_confirmed"; } }
  const groups = validation.groups.map((g) => ({ ...g, stats: groupStats(pool, packet.listedRelationIds, g) }));
  return { ok: true, answer: parsed.value, errors: validation.errors, groups, singles: validation.singles, phrases: validation.phrases, continuations: validation.continuations, engine_rows: rows };
}

/** The whole life of one pool-arm run. Never throws for a failed or unusable model call (it is recorded and not retried); lets BudgetStop and engine errors out. */
export async function poolPipeline({ run, pool, packet, request, planEntry, deps }) {
  const dir = deps.runDir(run.id);
  mkdirSync(dir, { recursive: true });
  if (requestSha256(request) !== planEntry.request_sha256 || lockSha256(request) !== planEntry.lock_sha256) throw new Error(`${run.id}: the request differs from the reviewed plan; nothing was sent`);
  writeFileSync(`${dir}/request-round1.json`, JSON.stringify(request, null, 2));
  const out = { id: run.id, arm: run.arm, series: run.series, model: run.model, pool: poolIdOf(run) };
  let record = null;
  if (!existsSync(`${dir}/round1-response.json`) && !existsSync(`${dir}/state-round1.json`)) {
    record = await deps.preflight(deps.client, request);
    writeJson(`${dir}/preflight-round1.json`, record);
    if (!record.ok) { out.failed = `preflight: ${record.reason ?? JSON.stringify(record.checks)}`; deps.log("preflight_failed", { run: run.id, failed: out.failed }); return out; }
  } else if (existsSync(`${dir}/preflight-round1.json`)) record = readJson(`${dir}/preflight-round1.json`);
  const first = await callOnce({ run, round: 1, request, record: record ?? { upper_bound_usd: 0 }, dir, deps });
  if (first.failed) { out.failed = first.failed; return out; }
  const summary = first.response.summary;
  out.stop_reason = summary.stop_reason;
  out.usd = first.response.cost.usd;
  out.output_tokens = summary.usage?.output_tokens ?? null;
  out.ms = first.response.ms;
  const usable = summary.stop_reason === "end_turn" && parseAnswer(summary.text).ok;
  out.usable = usable;
  if (!usable) { out.failed = `no usable answer (stop_reason ${summary.stop_reason}); cost counted, not retried`; deps.log("unusable_answer", { run: run.id, stop_reason: summary.stop_reason }); return out; }
  if (!existsSync(`${dir}/evaluation-round1.json`)) {
    const evaluation = await evaluateAnswer({ pool, packet, text: summary.text, torah: deps.torah, rpc: deps.verifyRpc, concurrency: deps.engineConcurrency });
    writeJson(`${dir}/evaluation-round1.json`, evaluation);
    deps.log("evaluated", { run: run.id, groups: evaluation.groups?.length, errors: evaluation.errors?.length });
  }
  const evaluation = readJson(`${dir}/evaluation-round1.json`);
  out.groups = evaluation.groups.length;
  out.errors = evaluation.errors.length;
  return out;
}
