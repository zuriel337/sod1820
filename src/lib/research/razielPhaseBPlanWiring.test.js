import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const edge = read("../../../supabase/functions/ai-analyze/index.ts");
const client = read("../supabase.js");
const frame = read("../../components/experience2029/SystemFrame2029.jsx");
const razielBlock = edge.slice(edge.indexOf('persona || "").toLowerCase() === "raziel"'), edge.indexOf('const isCollection = kind === "research"'));
const chat = frame.slice(frame.indexOf("function RazielNativeChat"), frame.indexOf("function RazielProjection"));

test("Phase B: plan is reused from fn_raziel_answer (fallback: existing fn_raziel_plan) and injected before the model call", () => {
  assert.match(razielBlock, /rPlanMeta = razielPlanMeta\(det\)/);
  assert.match(razielBlock, /rpc\/fn_raziel_plan/);
  assert.ok(razielBlock.indexOf("planText") < razielBlock.indexOf("callClaudeReliable("));
  assert.match(edge, /הכוונה בלבד — לא אמת, לא תוצאת-כלי; שום כלי לא הורץ/);
});

test("Phase B: deterministic short-circuit unchanged; zero-model for gematria/ELS; Phase A negatives fall to L2", () => {
  assert.match(razielBlock, /det\.mode === "deterministic" && det\.needs_synthesis === false/);
  assert.ok(razielBlock.indexOf("det.needs_synthesis === false") < razielBlock.indexOf("checkQuota("));
  assert.doesNotMatch(razielBlock, /routing_enabled|sandalphon|research_intel/i);
});

test("Phase B: unavailable/unwired capability is labelled not-executed; no false tool-run claim", () => {
  assert.match(edge, /executed: false/);
  assert.match(edge, /לא הורצה בבקשה זו — אל תציג ערך מחושב ואל תטען שהרצת כלי/);
  assert.match(edge, /אינה זמינה\/אינה מחוברת כרגע ולא הורצה/);
});

test("Phase B: plan metadata is additive in trace + response and has no provider names", () => {
  assert.match(razielBlock, /plan: rPlanMeta/);
  assert.match(razielBlock, /contract\.plan_meta = rPlanMeta/);
  const meta = edge.slice(edge.indexOf("function razielPlanMeta"), edge.indexOf("function razielPlanBlockText"));
  assert.doesNotMatch(meta, /claude|anthropic|sonnet|opus|haiku|gpt/i);
});

test("Phase B: semantic surface is whitelisted, tag-stripped and server-capped (no raw HTML / page text)", () => {
  const fn = edge.slice(edge.indexOf("function razielSemanticSurfaceText"), edge.indexOf("function razielPlanMeta"));
  assert.match(edge, /replace\(\/<\[\^>\]\*>\/g, " "\)/);
  assert.match(fn, /\.slice\(0, 1000\)/);
  assert.doesNotMatch(fn, /innerHTML|outerHTML|pageText|html/i);
  assert.match(razielBlock, /razielSemanticSurfaceText\(body\?\.surface_semantic\)/);
});

test("Phase B: askRaziel transport is additive — surface_semantic only when provided", () => {
  assert.match(client, /surfaceSemantic = null/);
  assert.match(client, /surface_semantic: surfaceSemantic/);
  assert.match(client, /plan_meta: data\.plan_meta/);
});

test("Phase B: SystemFrame builds the pack from existing context only; no provider call on open; no HTML", () => {
  assert.doesNotMatch(chat, /useEffect/);
  assert.match(chat, /buildSurfaceSemantic/);
  assert.match(chat, /surfaceSemantic: buildSurfaceSemantic\(\)/);
  const b = chat.slice(chat.indexOf("const buildSurfaceSemantic"), chat.indexOf("const send = async"));
  assert.doesNotMatch(b, /innerHTML|outerHTML|document\.|textContent|supabase|fetch\(/);
  assert.match(b, /cap\(context\.subject\.label, 80\)/);
  assert.match(b, /\.slice\(0, n\)/);
  assert.match(frame, /elsFocus=\{elsFocus\}/);
});

test("Phase B: persona/metatron/quota path and global routing untouched; Advanced beta gate unchanged", () => {
  assert.match(razielBlock, /RAZIEL_ADVANCED_GATED_RESPONSE/);
  assert.ok(razielBlock.indexOf("fetchMetatronContext(") > 0 && razielBlock.indexOf("fetchRazielPersona(") > 0);
  assert.doesNotMatch(razielBlock, /routing_enabled\s*=/);
});
