import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { selectRazielIntelligence } from "../../../supabase/functions/_shared/razielIntelligence.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const mig = read("../../../supabase/migrations/20261005160000_raziel_intelligence_core_v1_phase_e_l4_tool_research.sql");

// Load the real razielToolResearch adapter + razielPlanMeta (strip TS annotations only).
const a = edge.slice(edge.indexOf("function razielToolResearch"), edge.indexOf("// ── Raziel Intelligence Core v1 Phase C"));
const ajs = a.replace("(src: any): RazielToolResearch | null", "(src)").replace(/\(sp: any\)/g, "(sp)").replace("const label: Record<string, string>", "const label")
  .replace(/\(t: \{ capability: string; status: string \}\)/g, "(t)").replace(/\(\w+ as any\)/g, (m) => m.replace(" as any", ""));
const razielToolResearch = new Function(`${ajs.replace(/ as any/g, "")}; return razielToolResearch;`)();

const spec = (cap, st, extra = {}) => ({ capability: cap, status: st, error: null, ms: 7, ...extra });
const det = (over = {}) => ({ enabled: true, mode: "tool_research", needs_synthesis: true, capability_class: "general_synthesis",
  tool_research: { contract: "tool_research_v1", status: "complete", subject: "משיח", specialists: [spec("gematria", "ok"), spec("els", "ok")],
    findings_by_capability: { gematria: { value: 358 }, els: { els_count: 292, min_skip: 2 } },
    evidence_by_capability: { gematria: { gematria_pack: { source_of_truth: "g" } }, els: { els: { source_of_truth: "e" } } }, needs_synthesis: true }, ...over });

test("E: tool_research contract is recognised, bounded, per-tool", () => {
  const r = razielToolResearch(det());
  assert.equal(r.status, "complete");
  assert.deepEqual(r.tools.map((t) => t.capability), ["gematria", "els"]);
  assert.match(r.text, /358/);
  assert.match(r.text, /292/);
  assert.match(r.text, /אל תחשב גימטריה/);
  assert.ok(r.text.length <= 3000);
});

test("E: any non-tool_research / malformed answer is ignored (no injection)", () => {
  assert.equal(razielToolResearch(null), null);
  assert.equal(razielToolResearch({ mode: "deterministic" }), null);
  assert.equal(razielToolResearch(det({ needs_synthesis: false })), null);
  assert.equal(razielToolResearch({ mode: "tool_research", needs_synthesis: true, tool_research: { contract: "other" } }), null);
  assert.equal(razielToolResearch({ mode: "fallback", needs_synthesis: true }), null);
});

test("E: partial failure is explicit and never filled in", () => {
  const d = det();
  d.tool_research.status = "partial";
  d.tool_research.specialists = [spec("gematria", "ok"), spec("els", "failed", { error: "boom" })];
  delete d.tool_research.findings_by_capability.els;
  const r = razielToolResearch(d);
  assert.equal(r.status, "partial");
  assert.match(r.text, /דילוגי-אותיות[^\n]*מצב: failed[^\n]*אל תמציא/);
  assert.equal(r.tools[1].error, "boom");
});

test("E: selector stays pure/semantic (untouched); tool_research forces deep synthesis + L4 label in ai-analyze only", () => {
  const plan = { minimum_intelligence: "L2_FAST", route_intent: "multi_domain", domains: ["gematria_engine", "els_cipher"] };
  for (const requested of [null, "fast", "deep"]) assert.equal(selectRazielIntelligence({ plan, requested }).selected_level, "L3_DEEP");
  assert.match(edge, /const rFast = rSel\.selected_level === RAZIEL_LEVELS\.L2 && !rToolRes;/);
  assert.match(edge, /semantic_level: RAZIEL_TOOL_LEVEL, synthesis_intelligence: RAZIEL_LEVELS\.L3/);
  assert.match(edge, /const RAZIEL_TOOL_LEVEL = "L4_TOOL_RESEARCH"/);
  // never tier-driven: the L4 path reads only rToolRes (database-executed contract)
  assert.doesNotMatch(edge.slice(edge.indexOf("const rFast ="), edge.indexOf("const rFast =") + 200), /tier/);
});

test("E: ai-analyze wiring — spans per tool, same persona/metatron/quota path, no model math, no new writes", () => {
  assert.match(edge, /rToolRes = razielToolResearch\(det\)/);
  assert.match(edge, /ai-analyze:raziel:tool:\$\{t\.capability\}/);
  assert.match(edge, /kind: "db_rpc"/);
  assert.match(edge, /toolText \+\n\s+\(rPath/);          // injected into the existing Raziel user prompt
  assert.match(edge, /await checkQuota\(rBudgetIdentity/); // same quota path
  assert.match(edge, /fetchMetatronContext\(rSubject/);    // same metatron path
  // tools are NOT executed by the edge function: only fn_raziel_answer/plan RPCs
  assert.doesNotMatch(edge, /rpc\/fn_raziel_protocol|rpc\/fn_els_search|rpc\/fn_gematria_pack/);
});

test("E: migration is additive, bounded to gematria+els, read-only, no new tables/tools", () => {
  const code = mig.replace(/--.*$/gm, "");
  assert.equal((code.match(/create or replace function/g) || []).length, 2);
  assert.doesNotMatch(code, /create table|alter table|insert into|update public|delete from|routing_enabled|http_|net\./i);
  assert.doesNotMatch(code, /fn_els_search\(|fn_gematria_pack\(|create or replace function public\.fn_(els_search|gematria_pack|raziel_protocol|raziel_route|raziel_extract_subject)/);
  assert.match(mig, /v_caps @> '\["gematria","els"\]'::jsonb/);
  assert.match(mig, /L4_TOOL_RESEARCH/);
  assert.match(mig, /'tool_availability'/);
  // exactly one protocol call site per tool (loop over a fixed pair), never sandalphon/research_intel
  assert.equal((code.match(/public\.fn_raziel_protocol\(/g) || []).length, 2); // phase-A single path + the one in the tool loop
  assert.match(code, /array\['gematria','els'\]/);
});
