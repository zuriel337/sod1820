import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const client = read("../supabase.js");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const rel = read("../../../supabase/functions/_shared/raziel-reliability.ts");
const session = read("./razielSession2029.js");
const submission = read("./razielSessionSubmission2029.js");
const provider = read("./RazielSessionProvider2029.jsx");
const razielBlock = edge.slice(edge.indexOf('persona || "").toLowerCase() === "raziel"'), edge.indexOf('const isCollection = kind === "research"'));
const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));

test("native chat: no provider call on open/render; fast by default; deep only via explicit action", () => {
  assert.doesNotMatch(chat, /useEffect/);
  assert.match(chat, /send\(text, "fast"\)/);
  assert.match(chat, /data-raziel-deepen[\s\S]*send\(deepCandidate\.question, "deep", true, deepCandidate\.turnId\)/);
  assert.equal((chat.match(/session\.submit\(/g) || []).length, 1);
  assert.match(provider, /const submit = useCallback[\s\S]*const rawResponse = await transport\(request\)/);
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
  const iModel = razielBlock.indexOf("const rel = await callClaudeReliable(");
  const iClassifier = razielBlock.indexOf("classifyRazielSemanticIntent(");
  assert.ok(iDet > 0 && iDet < iQuota && iQuota < iModel);
  // Phase D: fast/deep is a user REQUEST fed to the semantic selector, not absolute authority.
  assert.match(razielBlock, /selectRazielIntelligence\(\{ plan: rPlanMeta, requested: body\?\.intelligence_level \}\)/);
  assert.match(razielBlock, /rFast \? FAST_MODEL : MODEL/);
  assert.doesNotMatch(razielBlock, /fn_raziel_model|routing_enabled/);
  assert.ok(iClassifier > iQuota, "bounded semantic fallback may run only after deterministic planning and quota");
  assert.match(edge, /intent: validateRazielSemanticIntent\(parsed, question\)/);
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
  const synthesis = razielBlock.slice(razielBlock.indexOf("const razielModelSpanId"), razielBlock.indexOf("// 📊 Telemetry"));
  assert.equal((synthesis.match(/callClaudeReliable\(/g) || []).length, 1);
  assert.match(synthesis, /buildFallback[\s\S]*agent: "raziel"/);
  assert.match(razielBlock, /if \(firstRazielTruthRejected\)[\s\S]*retryRel = await callClaudeReliable\(/);
  assert.match(rel, /usage\?: \{ input_tokens/);
  assert.match(razielBlock, /logTokens\([\s\S]*rel\.usage/);
});

test("native chat: user question is the subject; root/method only in facts/context", () => {
  assert.match(chat, /session\.submit\(\{ question: q,/);
  assert.match(submission, /const subject = cleanInline\(question, LIMITS\.question\)/);
  assert.match(submission, /return \{\s*subject,/);
  assert.doesNotMatch(chat, /\$\{numberFocus\.root\} · \$\{q\}/);
  assert.match(chat, /שורש עמוד: \$\{numberFocus\.root\}/);
});

test("native chat: bounded local transcript in context, no new store", () => {
  assert.match(submission, /messages\.slice\(-2\)/);
  assert.match(submission, /transcriptTurn: 200/);
  assert.match(submission, /transcript: 500/);
  assert.match(submission, /context: 600/);
  assert.match(submission, /cleanInline\(message\?\.text, LIMITS\.transcriptTurn\)/);
  assert.match(submission, /slice\(0, LIMITS\.transcript\)/);
  assert.match(submission, /slice\(0, LIMITS\.context\)/);
  assert.doesNotMatch(submission, /slice\(0, 1700\)|\.slice\(-6\)/);
  assert.doesNotMatch(session + submission + provider, /localStorage|sessionStorage/);
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
