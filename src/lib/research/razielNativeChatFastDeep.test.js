import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const client = read("../supabase.js");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const rel = read("../../../supabase/functions/_shared/raziel-reliability.ts");
// #1142: the native chat is a projection of ONE shared temporary session; the bounded request is built there.
const sessionModule = read("./razielSession2029.js");
const sessionProvider = read("./RazielSessionProvider2029.jsx");
const seamModule = read("../../components/experience2029/razielSessionSeam2029.js");
const seamMount = read("../../components/experience2029/RazielSessionMount2029.jsx");
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
  // Phase D: fast/deep is a user REQUEST fed to the semantic selector, not absolute authority.
  assert.match(razielBlock, /selectRazielIntelligence\(\{ plan: rPlanMeta, requested: body\?\.intelligence_level \}\)/);
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
  assert.equal((edge.match(/callClaudeReliable\(/g) || []).length, 2);
  assert.match(razielBlock, /model-truth-retry/);
  assert.match(razielBlock, /policy: \{ retries: 1 \}/);
  assert.match(razielBlock, /buildFallback[\s\S]*agent: "raziel"/);
  assert.match(rel, /usage\?: \{ input_tokens/);
  assert.match(razielBlock, /input_tokens: rel\.usage\?\.input_tokens/);
  assert.match(razielBlock, /input_tokens: retryRel\.usage\?\.input_tokens/);
});

test("native chat: user question is the subject; root/method only in facts/context", () => {
  const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
  assert.match(chat, /session\.submit\(\{ question: q, intelligenceLevel: level, again, facts: buildFacts\(\)/);
  assert.match(sessionModule, /const subject = cleanInline\(question, LIMITS\.question\)/);
  assert.match(sessionModule, /question: 300,/);
  assert.doesNotMatch(chat, /\$\{numberFocus\.root\} · \$\{q\}/);
  assert.match(chat, /שורש עמוד: \$\{numberFocus\.root\}/);
});

test("native chat: bounded local transcript in context, no new store", () => {
  const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));
  assert.match(sessionModule, /return prior\.slice\(-2\)/);
  assert.match(sessionModule, /transcriptTurn: 200,/);
  assert.match(sessionModule, /transcript: 500,/);
  assert.match(sessionModule, /context: 600,/);
  assert.doesNotMatch(sessionModule, /slice\(-6\)|1700/);
  for (const src of [chat, sessionModule, sessionProvider, seamMount]) assert.doesNotMatch(src, /localStorage|sessionStorage/);
  assert.match(edge, /body\?\.context \|\| ""\)\.slice\(0, 600\)/);
  assert.doesNotMatch(edge, /body\?\.context \|\| ""\)\.slice\(0, 1800\)/);
});

test("reliability: usage aggregated across HTTP-200 attempts, kept on degraded", () => {
  assert.match(rel, /addUsage\(data\?\.usage\)/);
  assert.match(rel, /usage: usageAcc/);
  assert.equal((rel.match(/usage: usageAcc/g) || []).length, 2);
  assert.match(razielBlock, /5B — deterministic-first \(תלוי הגדרה פעילה/);
  assert.doesNotMatch(razielBlock, /5B — deterministic-first \(מאחורי flag/);
});
