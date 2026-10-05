import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const mig = read("../../../supabase/migrations/20261005130000_raziel_intelligence_core_v1_phase_a_plan_first.sql");
const answer = mig.slice(mig.indexOf("create or replace function public.fn_raziel_answer"));
const plan = mig.slice(mig.indexOf("create or replace function public.fn_raziel_plan"), mig.indexOf("create or replace function public.fn_raziel_answer"));
const edge = read("../../../supabase/functions/ai-analyze/index.ts");

test("Phase A: fn_raziel_answer plans BEFORE the gematria resolver, and the resolver is class-gated", () => {
  const iPlan = answer.indexOf("fn_raziel_plan(");
  const iGate = answer.indexOf("v_class = 'gematria_expression'");
  const iResolve = answer.indexOf("fn_raziel_resolve(");
  assert.ok(iPlan > 0 && iPlan < iGate && iGate < iResolve);
  assert.equal((answer.match(/fn_raziel_resolve\(/g) || []).length, 1);
});

test("Phase A: no second router — only existing functions are replaced; no new tables/policies", () => {
  const defs = [...mig.matchAll(/create or replace function public\.(\w+)/g)].map((m) => m[1]);
  assert.deepEqual(defs, ["fn_raziel_plan", "fn_raziel_answer"]);
  assert.doesNotMatch(mig, /create table|alter table|drop |routing_enabled\s*=|insert into|update public/i);
});

test("Phase A: plan exposes bounded semantic fields without provider/model names", () => {
  assert.match(plan, /'capability_class'/);
  assert.match(plan, /'strategy'/);
  assert.match(plan, /'minimum_intelligence'/);
  assert.match(plan, /L0_DETERMINISTIC/);
  assert.match(plan, /L2_FAST/);
  const meta = plan.slice(plan.indexOf("-- ▼ Phase A bounded"), plan.indexOf("return jsonb_build_object("));
  assert.doesNotMatch(meta, /claude|anthropic|sonnet|opus|haiku|gpt/i);
});

test("Phase A: extract_subject stays an extractor after classification (not used by the plan)", () => {
  assert.doesNotMatch(plan, /fn_raziel_extract_subject/);
});

test("Phase A: ai-analyze consumer unchanged — only mode=deterministic short-circuits; else falls to Raziel persona", () => {
  assert.match(edge, /det\.mode === "deterministic" && det\.needs_synthesis === false/);
});

test("Phase A: migration is additive-new (old applied migrations untouched)", () => {
  assert.ok(read("../../../supabase/migrations/20261005050000_raziel_route_token_boundary_match_v1.sql").includes("fn_raziel_route"));
});
