import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { buildNumberAiFactPack, NUMBER_AI_LIMITS } from "../src/lib/research/numberAiFactPack2029.js";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const comp = read("src/components/number2029/NumberAiAnalysis2029.jsx");
const pack = read("src/lib/research/numberAiFactPack2029.js");
const core = read("src/components/number2029/NumberCore2029.jsx");

const projection = {
  root: 26, expression: "הויה",
  methods: [{ methodKey: "standard", computedValue: 26 }, { methodKey: "ordinal", computedValue: 17 }, { methodKey: "empty", computedValue: null }],
  connections: [{ kind: "expression", label: "אברהם" }, { kind: "expression", label: "אברהם" }, { kind: "relation", label: "x" }],
  crossings: [{ partner: "יה", methods: ["standard"] }],
};

test("fact pack passes projected values verbatim, bounded, deduped, no local arithmetic", () => {
  const p = buildNumberAiFactPack(projection);
  assert.match(p.facts, /standard=26/);
  assert.match(p.facts, /ordinal=17/);
  assert.doesNotMatch(p.facts, /empty=/);
  assert.equal((p.facts.match(/אברהם/g) || []).length, 1);
  assert.match(p.facts, /התכנסויות שהוצגו: יה \(standard\)/);
  assert.equal(buildNumberAiFactPack(null), null);
  assert.ok(NUMBER_AI_LIMITS.phrases <= 12);
  assert.doesNotMatch(pack.replace(/\/\/.*$/gm, ""), /reduce\(|Math\.|[^=!<>]=\s*\w+\s*[+*]\s*\w+;/, "no arithmetic in the fact builder");
});

test("no provider call on render: analyze only inside click handler", () => {
  const calls = [...comp.matchAll(/analyze\(/g)].length;
  assert.equal(calls, 1);
  assert.match(comp, /const run = async/);
  for (const m of comp.matchAll(/useEffect\(\(\) => \{[^\n]*\n?[^\n]*\}, \[[^\]]*\]\);/g)) assert.doesNotMatch(m[0], /analyze\(|run\(/);
});

test("quick path = Claude fast=true; Gemini compare uses the same fact pack; again reuses contract", () => {
  assert.match(comp, /kind: "number", engine, fast: true, again, facts: pack\.facts/);
  assert.match(comp, /run\("claude"\)/);
  assert.match(comp, /run\("gemini"\)/);
  assert.match(comp, /run\("claude", true\)/);
});

test("no duplicated prompt / no new provider router or store; single entry point reused", () => {
  assert.match(comp, /from "\.\.\/\.\.\/lib\/aiAnalysis\.js"/);
  assert.doesNotMatch((comp + pack).replace(/\/\/.*$/gm, ""), /functions\.invoke|KIND_HINT|SYSTEM\s*=|api\.anthropic|generativelanguage/);
  assert.doesNotMatch(comp, /localStorage|sessionStorage/);
});

test("one instance, directly discoverable from the Number stage footer, not in MethodInspector", () => {
  assert.equal([...core.matchAll(/<NumberAiAnalysis2029 /g)].length, 1);
  assert.match(core, /\{showAiAnalysis \? <NumberAiAnalysis2029 projection=\{projection\} \/> : null\}/);
  const footer = core.slice(core.indexOf('className="sod29-number-v10-stage-actions"'));
  assert.ok(footer.indexOf("◈ ניתוח AI") > 0 && footer.indexOf("◈ ניתוח AI") < footer.indexOf("</footer>"));
  assert.ok(core.indexOf("<NumberAiAnalysis2029 ") > core.indexOf("onClose={() => setShowCalculation(false)}"), "not inside MethodInspector");
  assert.match(comp, /פרשנות חד־פעמית/);
  assert.match(comp, /לא פרסונת רזיאל|שאל את רזיאל/);
  assert.match(read("docs/RAZIEL_NUMBER_AI_COST_POLICY_V1.md"), /L2_FAST/);
});

test("Hebrew route boundary migration: token match, new migration only, routing stays disabled", () => {
  const files = readdirSync(new URL("../supabase/migrations", import.meta.url)).filter((f) => f.includes("raziel_route_token_boundary"));
  assert.equal(files.length, 1);
  const sql = read(`supabase/migrations/${files[0]}`);
  assert.match(sql, /fn_raziel_norm/);
  assert.match(sql, /position\(' '\|\|fn_raziel_norm\(kw\)\|\|' ' in p\.q\)/);
  assert.doesNotMatch(sql, /like '%'/);
  assert.doesNotMatch(sql, /routing_enabled/.source ? /update\s+raziel_config|set\s+.*routing_enabled/i : /x/);
  assert.match(read("tests/sql/raziel_route_token_boundary_v1.sql"), /מספר must not match ספר/);
});
