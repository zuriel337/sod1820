import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const mig = read("../../../supabase/migrations/20261005180000_raziel_intelligence_core_v1_phase_g_source_l4_combination.sql");

// Load the real adapter + source bundle (strip TS annotations only), same technique as the Phase E test.
const b = edge.slice(edge.indexOf("function razielSourceBundle"), edge.indexOf("type RazielToolResearch")).replace("(f: any)", "(f)").replace("(x: any)", "(x)");
const a = edge.slice(edge.indexOf("function razielToolResearch"), edge.indexOf("// ── Raziel Intelligence Core v1 Phase C"));
const ajs = a.replace("(src: any): RazielToolResearch | null", "(src)").replace(/\(sp: any\)/g, "(sp)").replace("const label: Record<string, string>", "const label")
  .replace(/\(t: \{ capability: string; status: string \}\)/g, "(t)").replace(/\(\w+ as any\)/g, (m) => m.replace(" as any", ""));
const razielToolResearch = new Function(`${b}\n${ajs.replace(/ as any/g, "")}; return razielToolResearch;`)();

const spec = (cap, st, extra = {}) => ({ capability: cap, status: st, error: null, ms: 7, ...extra });
const src = (count) => ({ count, found: count > 0, match: "exact_whole_token", books: [{ book: "ישעיהו", n: count }], first: { ref: "ישעיהו 9:5" }, last: { ref: "תהלים 2:2" },
  samples: [{ ref: "ישעיהו 9:5", text: "משיח בן דוד כאן" }, { ref: "a", text: "b" }, { ref: "c", text: "d" }, { ref: "e", text: "f" }] });
const det = (count = 2) => ({ enabled: true, mode: "tool_research", needs_synthesis: true,
  tool_research: { contract: "tool_research_v1", status: "complete", subject: "משיח",
    specialists: [spec("gematria", "ok"), spec("tanakh_source", "ok")],
    findings_by_capability: { gematria: { value: 358 }, tanakh_source: src(count) },
    evidence_by_capability: { gematria: { gematria_pack: { source_of_truth: "g" } }, tanakh_source: { sources: { source_of_truth: "public.tanach_verses via fn_ev_sources" } } }, needs_synthesis: true } });

test("G: three-capability contract is read, per-tool, bounded, evidence kept separate", () => {
  const d = det();
  d.tool_research.specialists.push(spec("els", "ok"));
  d.tool_research.findings_by_capability.els = { els_count: 292 };
  const r = razielToolResearch(d);
  assert.deepEqual(r.tools.map((t) => t.capability), ["gematria", "tanakh_source", "els"]);
  assert.match(r.text, /fn_ev_sources/);
  assert.match(r.text, /public\.tanach_verses via fn_ev_sources/);
  assert.match(r.text, /הסכמה בין כלים אינה עובדה/);
  assert.ok(r.text.length <= 3000);
  assert.ok(!r.text.includes('"e"') && !r.text.includes('"f"'), "source samples bounded to 3");
});

test("G: zero source findings stays a truthful, scoped negative (not proof of absence)", () => {
  const r = razielToolResearch(det(0));
  assert.match(r.text, /"found":false/);
  assert.match(r.text, /אין זו הוכחה שהמושג נעדר מכל המקורות/);
});

test("G: failed/unavailable source leg is explicit and never filled in", () => {
  const d = det();
  d.tool_research.status = "partial";
  d.tool_research.specialists = [spec("gematria", "ok"), spec("tanakh_source", "failed", { error: "boom" })];
  delete d.tool_research.findings_by_capability.tanakh_source;
  const r = razielToolResearch(d);
  assert.match(r.text, /מקורות בתנ״ך[^\n]*מצב: failed[^\n]*אל תמציא/);
});

test("G: ai-analyze — one span per executed tool (any capability), plan meta lists tools, edge never executes tools", () => {
  assert.match(edge, /for \(const t of rToolRes\.tools\)/);
  assert.match(edge, /ai-analyze:raziel:tool:\$\{t\.capability\}/);
  assert.match(edge, /tool_research_capabilities: rToolRes\.tools\.map/);
  assert.match(edge, /rawPrivatePayloadLogged: false/);
  assert.match(edge, /tool_research\.slice|tr\.specialists\.slice\(0, 3\)/);
  assert.doesNotMatch(edge, /rpc\/fn_raziel_protocol|rpc\/fn_ev_sources|rpc\/fn_name_in_tanach|tanach_verses/);
});

test("G: migration is additive, extends existing owners only, no source broadening", () => {
  const code = mig.replace(/--.*$/gm, "");
  assert.equal((code.match(/create or replace function/g) || []).length, 2);   // fn_raziel_plan + fn_raziel_answer only
  assert.doesNotMatch(code, /create table|alter table|insert into|update public|delete from|routing_enabled|fn_raziel_model|http_|net\./i);
  assert.doesNotMatch(code, /create or replace function public\.fn_(ev_sources|name_in_tanach|raziel_protocol|raziel_route|raziel_extract_subject)/);
  assert.doesNotMatch(code, /ilike|like '%'\|\||(from|join)\s+(public\.)?tanach_verses/i);               // no substring/source-table path
  assert.match(code, /'gematria','els','tanakh_source'/);
  assert.match(code, /v_toolset then v_minint := 'L4_TOOL_RESEARCH'/);
  assert.match(code, /'synthesis_target'/);
  assert.match(code, /'multiword_phrase'/);
  // one protocol call site in the tool loop + the Phase A/F single paths; no unrelated capability in the loop
  assert.match(code, /foreach v_i in array array\['gematria','els','tanakh_source'\]/);
});
