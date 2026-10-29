// Shared fakes for the matrix reading layer tests: the stream, the canonical engine (recorded replays), the provider and the token log.
import { readFileSync } from "node:fs";
import * as M from "../../supabase/functions/_shared/elsMatrixReading.js";

export const fx = (name) => JSON.parse(readFileSync(new URL(`../fixtures/els-matrix-reading/${name}`, import.meta.url), "utf8"));
export const windowC1 = fx("window-c1.json");
export const savedAnswer = fx("response-c3.json");
export const recorded = new Map(fx("engine-replay-c3.json").rows.map((r) => [`${r.term}|${r.skip}|${r.dir}|${r.start}`, r]));
export const SB = "https://sb.test", KEY = "service-key", ANTH = "anthropic-key", BATCH = "msgbatch_test01";
export const AXIS = { term: "קולומביה", scope: "torah", skip: 4545, dir: 1, start: 248765 };
export const WINDOW23 = { rows: 23, cols: 41 }; // the saved window: rows 44-66 of the width-4545 matrix

export const message = ({ stopReason = "end_turn", text = savedAnswer.summary.text, usage = savedAnswer.summary.usage } = {}) => ({ model: "claude-fable-5-1", stop_reason: stopReason, usage, content: [{ type: "thinking", thinking: "…" }, { type: "text", text }] });

/** A world of fakes: the stream, the engine, the provider and the token log, with a record of every call. */
export function world({ batchState = "in_progress", result = { type: "succeeded", message: message() }, engineDown = false, stream = windowC1.grid.map((r) => r.s), modelHttp = 200 } = {}) {
  const calls = []; const tokenLog = [];
  const state = { batchState, result, engineDown, stream, modelHttp };
  const reply = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
  const fetchImpl = async (url, init = {}) => {
    const u = String(url); const method = init.method ?? "GET";
    calls.push({ url: u, method, body: init.body ? JSON.parse(init.body) : null });
    if (u.startsWith(`${SB}/rest/v1/rpc/els_verify_occurrence_v1`)) {
      if (state.engineDown) return reply({ error: "down" }, 500);
      const b = JSON.parse(init.body);
      const r = recorded.get(`${b.p_term}|${b.p_skip}|${b.p_dir}|${b.p_start}`);
      return reply(r ? { verification_state: r.verification_state, status: r.status, contract: r.contract, corpus_id: r.corpus_id, occurrence: { occurrence_id: r.occurrence_id } } : { verification_state: "MISMATCH", status: "REPLAY_MISMATCH" });
    }
    if (u.startsWith(`${SB}/rest/v1/torah_stream`)) {
      const q = new URL(u).searchParams; const lo = Number(q.get("idx").replace("gte.", "")); const hi = Number(new URL(u).searchParams.getAll("idx")[1].replace("lte.", ""));
      const row = Math.floor((lo - 1) / 4545); const c0 = (lo - 1) % 4545; const letters = state.stream[row - 44];
      return reply(Array.from({ length: hi - lo + 1 }, (_, i) => ({ idx: lo + i, ch: [...letters][c0 - 3315 + i] })));
    }
    if (u.startsWith(`${SB}/rest/v1/ai_token_log`)) {
      if (method === "POST") { const row = { id: tokenLog.length + 1, ...JSON.parse(init.body) }; tokenLog.push(row); return reply([{ id: row.id }], 201); }
      const ref = new URL(u).searchParams.get("ref")?.replace("eq.", ""); return reply(tokenLog.filter((r) => r.ref === ref).map((r) => ({ id: r.id })));
    }
    if (u === "https://api.anthropic.com/v1/models/claude-fable-5-1") return state.modelHttp === 200 ? reply({ id: "claude-fable-5-1", display_name: "Claude Fable 5.1", max_tokens: 128000, max_input_tokens: 1000000, capabilities: { structured_outputs: { supported: true }, thinking: { types: { adaptive: { supported: true } } }, effort: { medium: { supported: true } } } }) : reply({ error: "not_found" }, state.modelHttp);
    if (u === "https://api.anthropic.com/v1/messages/count_tokens") return reply({ input_tokens: 16858 });
    if (u === "https://api.anthropic.com/v1/messages/batches" && method === "POST") return reply({ id: BATCH, processing_status: "in_progress", created_at: "2026-10-29T10:00:00.000Z", results_url: null });
    if (u === `https://api.anthropic.com/v1/messages/batches/${BATCH}`) return reply({ id: BATCH, processing_status: state.batchState, created_at: "2026-10-29T10:00:00.000Z", ended_at: state.batchState === "ended" ? "2026-10-29T10:03:09.000Z" : null, results_url: `https://api.anthropic.com/v1/messages/batches/${BATCH}/results` });
    if (u === `https://api.anthropic.com/v1/messages/batches/${BATCH}/results`) return reply(`${JSON.stringify({ custom_id: M.BATCH_CUSTOM_ID, result: state.result })}\n`);
    return reply({ error: `unrouted ${u}` }, 404);
  };
  return { fetchImpl, calls, tokenLog, state };
}
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
export async function call(w, body, { tier = "admin", identity = "u:admin-1", enabled = "1", now = Date.parse("2026-10-29T10:00:30.000Z") } = {}) {
  const res = await M.handleElsMatrixReading({ body, deps: {
    json, fetchImpl: w.fetchImpl, now: () => now, resolveIdentity: async () => ({ identity, tier }), restHeaders: (extra = {}) => ({ apikey: KEY, authorization: `Bearer ${KEY}`, ...extra }),
    env: { enabled, anthropicKey: ANTH, supabaseUrl: SB, serviceKey: KEY, jobSecret: "job-secret", model: "" },
  } });
  return { status: res.status, body: await res.json() };
}
export const req = (op, extra = {}) => ({ els_matrix_reading: { contract: M.REQUEST_CONTRACT, op, axis: AXIS, window: WINDOW23, cap: 25, ...extra } });
export const countCalls = (w, pred) => w.calls.filter(pred).length;
export const aiCalls = (w) => countCalls(w, (c) => c.url.startsWith("https://api.anthropic.com"));

