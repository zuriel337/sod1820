import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const client = read("../supabase.js");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const rel = read("../../../supabase/functions/_shared/raziel-reliability.ts");
const razielBlock = edge.slice(edge.indexOf('persona || "").toLowerCase() === "raziel"'), edge.indexOf('const isCollection = kind === "research"'));

test("native chat: no provider call on open/render; fast by default; deep only via explicit action", () => {
  const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
  assert.doesNotMatch(chat, /useEffect/);
  assert.match(chat, /send\(text, "fast"\)/);
  assert.match(chat, /data-raziel-deepen[\s\S]*send\(lastRaziel\.question, "deep", true\)/);
  assert.equal((chat.match(/"deep"/g) || []).length, 1);
  assert.doesNotMatch(chat, /tier|isSubscriber|admin/);
  assert.doesNotMatch(frame, /askRazielFast|askRazielAdvanced/);
  assert.doesNotMatch(frame, /תחובר בהמשך/);
});

test("askRaziel: additive intelligenceLevel, sent only on request", () => {
  assert.match(client, /intelligenceLevel = null/);
  assert.match(client, /\.\.\.\(level \? \{ intelligence_level: level \} : \{\}\)/);
  assert.doesNotMatch(client, /export async function askRazielFast/);
});

test("edge raziel: deterministic-first precedes quota and model; explicit tier only", () => {
  const iDet = razielBlock.indexOf("fn_raziel_answer");
  const iQuota = razielBlock.indexOf("checkQuota(");
  const iModel = razielBlock.indexOf("callClaudeReliable(");
  assert.ok(iDet > 0 && iDet < iQuota && iQuota < iModel);
  assert.match(razielBlock, /body\?\.intelligence_level \|\| ""\)\.toLowerCase\(\) === "fast"/);
  assert.match(razielBlock, /rFast \? FAST_MODEL : MODEL/);
  assert.doesNotMatch(razielBlock, /fn_raziel_model|routing_enabled|classif/);
});

test("edge raziel: fast quota pattern (:f, 30/200) and no stale '2' wording", () => {
  assert.match(razielBlock, /`\$\{identity\}:f`/);
  assert.match(razielBlock, /tier === "anon" \? 30 : tier === "user" \? 200 : null/);
  assert.doesNotMatch(razielBlock, /ל-2 שיחות/);
});

test("same persona/metatron/memory path for both tiers; reliability wired, never silent", () => {
  assert.equal((razielBlock.match(/fetchRazielPersona\(/g) || []).length, 1);
  assert.equal((razielBlock.match(/fetchMetatronContext\(/g) || []).length, 1);
  assert.match(edge, /import \{ callClaudeReliable \} from "\.\.\/_shared\/raziel-reliability\.ts"/);
  assert.equal((edge.match(/callClaudeReliable\(/g) || []).length, 1);
  assert.match(razielBlock, /buildFallback[\s\S]*agent: "raziel"/);
  assert.match(rel, /usage\?: \{ input_tokens/);
  assert.match(razielBlock, /out\.usage/);
});
