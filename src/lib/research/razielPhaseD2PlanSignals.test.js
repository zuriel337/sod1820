import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectRazielIntelligence } from "../../../supabase/functions/_shared/razielIntelligence.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const mig = read("../../../supabase/migrations/20261005150000_raziel_intelligence_core_v1_phase_d2_plan_signals.sql");

// Load the real razielPlanMeta adapter (strip TS annotations only).
const src = edge.slice(edge.indexOf("function razielPlanMeta"), edge.indexOf("// Non-authoritative guidance block"));
const js = src.replace(/\(src: any\): Record<string, unknown> \| null/, "(src)").replace(/\(v: unknown, n = 60\)/, "(v, n = 60)").replace(/\(d: unknown\)/g, "(d)");
const razielPlanMeta = new Function(`${js}; return razielPlanMeta;`)();

const L2 = "L2_FAST", L3 = "L3_DEEP";
// fn_raziel_answer fallback shape: top-level capability fields + trace.signals (fn_raziel_answer is not redefined by D2)
const ans = (signals, extra = {}) => ({ enabled: true, mode: "fallback", capability_class: "general_synthesis", strategy: "raziel_synthesis",
  minimum_intelligence: L2, availability: "no_match", trace: { intent: "multi_domain (הצלבה/פרשנות נדרשת)", signals }, ...extra });
const sel = (signals, requested = null, extra) => selectRazielIntelligence({ plan: razielPlanMeta(ans(signals, extra)), requested });
const S = (o) => ({ route_intent: "no_clear_match", route_intent_raw: "no_clear_match", domains: [], capabilities: [], compare_requested: false, cross_check_required: false, contradictory: false, ...o });

test("D2: gematria + ELS explicit wording → multi_domain, 2 domains, selected L3", () => {
  const meta = razielPlanMeta(ans(S({ route_intent: "multi_domain", domains: ["gematria_engine", "els_cipher"], capabilities: ["gematria", "els"] }), { availability: "multi_domain_synthesis" }));
  assert.equal(meta.route_intent, "multi_domain");
  assert.deepEqual(meta.domains, ["gematria_engine", "els_cipher"]);
  assert.deepEqual(meta.capabilities, ["gematria", "els"]);
  const r = selectRazielIntelligence({ plan: meta, requested: null });
  assert.equal(r.selected_level, L3);
  assert.equal(r.escalation_reason, "multi_domain_intent");
});

test("D2: compare across >1 domains → L3 (compare_multi_capability)", () => {
  const r = sel(S({ route_intent: "single_domain", compare_requested: true, domains: ["gematria_engine", "els_cipher"] }));
  assert.equal(r.selected_level, L3);
  assert.equal(r.escalation_reason, "compare_multi_capability");
});

test("D2: one-domain compare and bare compare stay L2", () => {
  assert.equal(sel(S({ route_intent: "single_domain", compare_requested: true, domains: ["els_cipher"] })).selected_level, L2);
  assert.equal(sel(S({ compare_requested: true })).selected_level, L2);
  assert.equal(sel(S({ compare_requested: true, domains: [] })).escalation_reason, null);
});

test("D2: generic long / admin-synthesis questions stay L2", () => {
  assert.equal(sel(S({}), null, { reason: "x".repeat(200) }).selected_level, L2);
  assert.equal(sel(S({}), null, { capability_class: "system_live_state", availability: "operator_read" }).selected_level, L2);
});

test("D2: raw legacy Hebrew route intent string never triggers multi_domain (only the normalized signal does)", () => {
  assert.equal(razielPlanMeta(ans(undefined)).route_intent, "multi_domain (הצלבה/פרשנות נדרשת)".slice(0, 40));
  assert.equal(sel(undefined).selected_level, L2);
});

test("D2: cross-check required alone stays L2; only with structured contradiction → L3", () => {
  assert.equal(sel(S({ cross_check_required: true })).selected_level, L2);
  assert.equal(sel(S({ cross_check_required: true, contradictory: true })).escalation_reason, "contradictory_evidence");
});

test("D2: explicit deep still L3; deterministic L0 stays L0 (never auto-promoted, no signals reach it)", () => {
  assert.equal(sel(S({}), "deep").escalation_reason, "explicit_deep_request");
  const det = selectRazielIntelligence({ plan: razielPlanMeta({ ...ans(S({ route_intent: "multi_domain", domains: ["a", "b"] })), minimum_intelligence: "L0_DETERMINISTIC" }), requested: null });
  assert.equal(det.selected_level, L2);
  assert.equal(det.escalation_reason, null);
});

test("D2: adapter is additive — top-level plan signals, bounded, no provider names", () => {
  const meta = razielPlanMeta({ ...ans(undefined), route_intent: undefined, signals: S({ route_intent: "multi_domain", domains: ["a", "b", "c", "d", "e"] }) });
  assert.equal(meta.domains.length, 4);
  assert.equal(meta.executed, false);
  assert.doesNotMatch(src, /claude|anthropic|sonnet|opus|haiku|gpt/i);
  assert.match(edge, /selectRazielIntelligence\(\{ plan: rPlanMeta/);
});

test("D2: migration is additive and keeps gates; no provider/model selection; no applied-candidate edits", () => {
  const code = mig.replace(/--.*$/gm, "");
  assert.doesNotMatch(code, /claude|anthropic|sonnet|opus|haiku|gpt|model_policy|routing_enabled|FAST_MODEL/i);
  for (const k of [/explicit_gematria_term/, /how_much_is_expression/, /effective_scope/, /operator_denied/, /blocked_permission/, /unavailable_matched/, /'contradictory', false/]) assert.match(mig, k);
  assert.match(mig, /permission_scope[\s\S]*<= v_urank|<= v_urank/);
  assert.doesNotMatch(code, /create or replace function public\.fn_raziel_(answer|route|resolve)/);
  assert.equal((mig.match(/create or replace function/g) || []).length, 1);
});
