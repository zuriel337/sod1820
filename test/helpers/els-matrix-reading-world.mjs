// Shared fakes for the matrix reading layer tests: the stream, the canonical engine (recorded replays), the provider and the token log.
import { readFileSync } from "node:fs";
import * as M from "../../supabase/functions/_shared/elsMatrixReading.js";
import { ELS_MATRIX_READING_ACTION, normalizeElsMatrixReadingAction } from "../../supabase/functions/_shared/elsMatrixReadingAction.js";

export const fx = (name) => JSON.parse(readFileSync(new URL(`../fixtures/els-matrix-reading/${name}`, import.meta.url), "utf8"));
export const windowC1 = fx("window-c1.json");
export const savedAnswer = fx("response-c3.json");
export const recorded = new Map(fx("engine-replay-c3.json").rows.map((r) => [`${r.term}|${r.skip}|${r.dir}|${r.start}`, r]));
export const SB = "https://sb.test", KEY = "service-key", ANTH = "anthropic-key", BATCH = "msgbatch_test01";
export const OWNER_ID = "00000000-0000-4000-8000-000000000001";
export const REQUEST_ID = "00000000-0000-4000-8000-000000000002";
export const AXIS = { term: "קולומביה", scope: "torah", skip: 4545, dir: 1, start: 248765, corpusId: recorded.get("קולומביה|4545|1|248765").corpus_id };
export const WINDOW23 = { rows: 23, cols: 41 }; // the saved window: rows 44-66 of the width-4545 matrix

export const message = ({ stopReason = "end_turn", text = savedAnswer.summary.text, usage = savedAnswer.summary.usage } = {}) => ({ model: "claude-fable-5-1", stop_reason: stopReason, usage, content: [{ type: "thinking", thinking: "…" }, { type: "text", text }] });

/** A world of fakes: the stream, the engine, the provider and the token log, with a record of every call. */
export function world({ batchState = "in_progress", result = { type: "succeeded", message: message() }, engineDown = false, stream = windowC1.grid.map((r) => r.s), modelHttp = 200, sb = SB } = {}) {
  const calls = []; const tokenLog = [];
  const state = { batchState, result, engineDown, stream, modelHttp, pricing: [{ id: "pricing-row-1", usd_to_ils: "3.010", valid_from: "2026-09-01" }], cancelled: false, jobs: [], customId: M.BATCH_CUSTOM_ID };
  const reply = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  const fetchImpl = async (url, init = {}) => {
    const u = String(url); const method = init.method ?? "GET";
    calls.push({ url: u, method, body: init.body ? JSON.parse(init.body) : null });
    if (u.startsWith(`${sb}/rest/v1/rpc/els_matrix_reading_job_`)) {
      const op = u.split("els_matrix_reading_job_")[1].replace(/_v1$/, "");
      const b = JSON.parse(init.body);
      const jobs = state.jobs.filter(j => j.owner_id === b.p_owner_id);
      let job = jobs.find(j => j.id === b.p_job_id);
      const response = value => reply(structuredClone(value));
      if (op === "claim") {
        job = jobs.find(j => j.request_id === b.p_request_id);
        if (job && job.request_hash !== b.p_request_hash) return reply({ error: "request conflict" }, 409);
        if (!job) job = jobs.find(j => j.scope_key === b.p_scope_key && ["STARTING", "UNKNOWN", "RUNNING", "CANCEL_REQUESTED"].includes(j.state));
        if (job) return response({ created: false, conflict: job.request_id !== b.p_request_id, job });
        job = { id: `00000000-0000-4000-9000-${String(state.jobs.length + 1).padStart(12, "0")}`, owner_id: b.p_owner_id,
          request_id: b.p_request_id, scope_key: b.p_scope_key, request_hash: b.p_request_hash, snapshot: b.p_snapshot,
          state: "STARTING", created_at: "2026-10-29T10:00:00.000Z", result: null, job_payload: null };
        state.jobs.push(job); return response({ created: true, conflict: false, job });
      }
      if (op === "get") return response({ job: job || jobs.find(j => b.p_batch_id && j.batch_id === b.p_batch_id)
        || jobs.slice().reverse().find(j => b.p_scope_key && j.scope_key === b.p_scope_key) || null });
      if (!job) return reply({ error: "missing" }, 404);
      if (op === "attach") { Object.assign(job, { state: "RUNNING", batch_id: b.p_batch_id, job_payload: b.p_job_payload }); return response({ job }); }
      if (op === "mark_unknown") { if (job.state === "STARTING") job.state = "UNKNOWN"; return response({ job }); }
      if (op === "finish") {
        if (!job.result) { job.result = b.p_result; job.state = b.p_result.state === "FAILED_WITH_REASON" ? "FAILED" : b.p_result.state; }
        return response({ job });
      }
      if (op === "cost") {
        const existed = Boolean(job.cost_log_id);
        if (!existed) {
          const usage = b.p_usage;
          const row = { id: tokenLog.length + 1, source: "analyze", kind: "raziel_els_matrix_reading", model: b.p_model,
            input_tokens: (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0),
            output_tokens: usage.output_tokens || 0, user_id: b.p_owner_id, ref: job.batch_id, ref_name: `els_matrix_reading:${b.p_model}:batch` };
          tokenLog.push(row); job.cost_log_id = row.id;
        }
        if (b.p_trace) Object.assign(tokenLog.find(row => row.id === job.cost_log_id), { trace_id: b.p_trace.traceId, span_id: b.p_trace.spanId });
        return response({ logged: true, id: job.cost_log_id, existed });
      }
    }
    if (u.startsWith(`${sb}/rest/v1/rpc/els_verify_occurrence_v1`)) {
      if (state.engineDown) return reply({ error: "down" }, 500);
      const b = JSON.parse(init.body);
      const r = recorded.get(`${b.p_term}|${b.p_skip}|${b.p_dir}|${b.p_start}`);
      return reply(r ? { verification_state: r.verification_state, status: r.status, contract: r.contract, corpus_id: r.corpus_id, occurrence: { occurrence_id: r.occurrence_id } } : { verification_state: "MISMATCH", status: "REPLAY_MISMATCH" });
    }
    if (u.startsWith(`${sb}/rest/v1/torah_stream`)) {
      const q = new URL(u).searchParams; const lo = Number(q.get("idx").replace("gte.", "")); const hi = Number(new URL(u).searchParams.getAll("idx")[1].replace("lte.", ""));
      const row = Math.floor((lo - 1) / 4545); const c0 = (lo - 1) % 4545; const letters = state.stream[row - 44];
      return reply(Array.from({ length: hi - lo + 1 }, (_, i) => ({ idx: lo + i, ch: [...letters][c0 - 3315 + i] })));
    }
    if (u.startsWith(`${sb}/rest/v1/api_pricing`)) return reply(state.pricing);
    if (u.startsWith(`${sb}/rest/v1/ai_token_log`)) {
      if (method === "POST") { const row = { id: tokenLog.length + 1, ...JSON.parse(init.body) }; tokenLog.push(row); return reply([{ id: row.id }], 201); }
      const ref = new URL(u).searchParams.get("ref")?.replace("eq.", ""); return reply(tokenLog.filter((r) => r.ref === ref).map((r) => ({ id: r.id })));
    }
    if (u === "https://api.anthropic.com/v1/models/claude-fable-5-1") return state.modelHttp === 200 ? reply({ id: "claude-fable-5-1", display_name: "Claude Fable 5.1", max_tokens: 128000, max_input_tokens: 1000000, capabilities: { structured_outputs: { supported: true }, thinking: { types: { adaptive: { supported: true } } }, effort: { medium: { supported: true } } } }) : reply({ error: "not_found" }, state.modelHttp);
    if (u === "https://api.anthropic.com/v1/messages/count_tokens") return reply({ input_tokens: 16858 });
    if (u === "https://api.anthropic.com/v1/messages/batches" && method === "POST") { state.customId = JSON.parse(init.body).requests[0].custom_id; return reply({ id: BATCH, processing_status: "in_progress", created_at: "2026-10-29T10:00:00.000Z", results_url: null }); }
    if (u === `https://api.anthropic.com/v1/messages/batches/${BATCH}`) return reply({ id: BATCH, processing_status: state.cancelled && state.batchState !== "ended" ? "canceling" : state.batchState, created_at: "2026-10-29T10:00:00.000Z", ended_at: state.batchState === "ended" ? "2026-10-29T10:03:09.000Z" : null, results_url: `https://api.anthropic.com/v1/messages/batches/${BATCH}/results` });
    if (u === `https://api.anthropic.com/v1/messages/batches/${BATCH}/cancel` && method === "POST") { state.cancelled = true; return reply({ id: BATCH, processing_status: "canceling" }); }
    if (u === `https://api.anthropic.com/v1/messages/batches/${BATCH}/results`) return reply(`${JSON.stringify({ custom_id: state.customId, result: state.result })}\n`);
    return reply({ error: `unrouted ${u}` }, 404);
  };
  return { fetchImpl, calls, tokenLog, state };
}
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
export const TRACE_ID = "11111111-1111-4111-8111-111111111111";
/** Runs ONE operation as ai-analyze does: the action is normalised first, the trace recorder collects every span, and the provider is a test double unless told otherwise. */
export async function call(w, action, { tier = "admin", identity = `u:${OWNER_ID}`, enabled = "1", now = Date.parse("2026-10-29T10:00:30.000Z"), axis = AXIS, providerKind = M.PROVIDER_TEST_DOUBLE, model = "", fxIlsPerUsd = "", jobSecret = "job-secret" } = {}) {
  const normalized = normalizeElsMatrixReadingAction(action);
  if (!normalized) return { status: 400, body: { error: "invalid_els_matrix_reading_action" }, outcome: null, spans: [] };
  const spans = [];
  const out = await M.runElsMatrixReadingOperation({ action: normalized, axis, identity, tier, deps: {
    fetchImpl: w.fetchImpl, now: () => now, restHeaders: (extra = {}) => ({ apikey: KEY, authorization: `Bearer ${KEY}`, ...extra }), providerKind,
    trace: { record: async (descriptor) => { spans.push(descriptor); return { traceId: TRACE_ID, spanId: `00000000-0000-4000-8000-${String(spans.length).padStart(12, "0")}` }; } },
    env: { enabled, anthropicKey: ANTH, supabaseUrl: SB, serviceKey: KEY, jobSecret, model, fxIlsPerUsd },
  } });
  return { status: out.status, body: out.payload, outcome: out.outcome, spans };
}
/** The action of one operation: preview/start carry the saved 23x41 window and a cap of 25; status/cancel carry only the job token. */
export const req = (op, extra = {}) => (["status", "cancel", "recover"].includes(op)
  ? { id: ELS_MATRIX_READING_ACTION, op, ...extra }
  : { id: ELS_MATRIX_READING_ACTION, op, window: WINDOW23, cap: 25, ...(op === "start" ? { request_id: REQUEST_ID } : {}), ...extra });
export const countCalls = (w, pred) => w.calls.filter(pred).length;
export const aiCalls = (w) => countCalls(w, (c) => c.url.startsWith("https://api.anthropic.com"));

