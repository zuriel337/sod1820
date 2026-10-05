import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const mig = read("../../../supabase/migrations/20261005170000_raziel_intelligence_core_v1_phase_f_sandalphon_source.sql");

test("F: migration is additive and extends existing owners only", () => {
  assert.match(mig, /insert into public\.raziel_protocol_agents/);
  assert.match(mig, /'tanakh_source','sandalphon'/);
  assert.match(mig, /'fn_ev_sources'/);
  assert.match(mig, /where not exists/);
  assert.doesNotMatch(mig, /create table|create or replace function public\.fn_ev_sources|create or replace function public\.fn_name_in_tanach/i);
  assert.doesNotMatch(mig, /routing_enabled/);
});

test("F: source answer is deterministic, zero-model and fails closed on phrases", () => {
  assert.match(mig, /exact_whole_token/);
  assert.match(mig, /multiword_phrase/);
  assert.doesNotMatch(mig, /ilike|like '%'\|\|v_subject/);   // no substring search path
});

test("F: ai-analyze short-circuits Sandalphon deterministic + clarification without a model call", () => {
  assert.match(edge, /source_result: det\.intent === "tanakh_source"/);
  assert.match(edge, /det\.mode === "needs_clarification" && det\.intent === "tanakh_source"/);
  const i = edge.indexOf('det.mode === "needs_clarification" && det.intent === "tanakh_source"');
  assert.match(edge.slice(i, i + 700), /engine: "deterministic", model: "none"/);
});
