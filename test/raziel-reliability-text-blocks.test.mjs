// #1142 P0 — deep Raziel answers came back "empty" (live traces 21.10: provider_error/stop_reason=empty, 3 attempts ≈ max_tokens).
// The Sonnet reply does not necessarily start with a text block (e.g. a thinking block first); the reliable caller must read
// the text blocks, like every other Anthropic caller in this repo (runClaude, research-extract). Run with type stripping.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mod = await import("../supabase/functions/_shared/raziel-reliability.ts");
const edge = readFileSync(new URL("../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");

function withFetch(bodies, fn) {
  const real = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { const body = bodies[Math.min(calls, bodies.length - 1)]; calls += 1; return new Response(JSON.stringify(body), { status: 200 }); };
  return fn().finally(() => { globalThis.fetch = real; }).then((r) => ({ ...r, calls }));
}
const args = { apiKey: "k", model: "claude-sonnet-5", system: "s", user: "u", maxTokens: 100, policy: { retries: 2, backoffMs: 0, timeoutMs: 5000 }, buildFallback: () => "FALLBACK" };

test("a reply whose first block is not text still yields its text (one attempt, not degraded)", async () => {
  const body = { stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 20 }, content: [{ type: "thinking", thinking: "…" }, { type: "text", text: "{\"answer\":\"תשובה\"}" }] };
  const r = await withFetch([body], () => mod.callClaudeReliable(args));
  assert.equal(r.degraded, false);
  assert.equal(r.text, "{\"answer\":\"תשובה\"}");
  assert.equal(r.calls, 1);
});

test("several text blocks are joined; a reply with no text at all is still 'empty' and falls back honestly", async () => {
  const two = { content: [{ type: "text", text: "א" }, { type: "text", text: "ב" }] };
  assert.equal((await withFetch([two], () => mod.callClaudeReliable(args))).text, "א\nב");
  const none = { content: [{ type: "thinking", thinking: "…" }] };
  const r = await withFetch([none], () => mod.callClaudeReliable(args));
  assert.equal(r.degraded, true);
  assert.equal(r.text, "FALLBACK");
  assert.equal(r.reason, "empty");
});

test("deep Raziel gets room for its answer; fast keeps its existing budget", () => {
  assert.match(edge, /maxTokens: rFast \? 1600 : RAZIEL_DEEP_MAX_TOKENS/);
  assert.match(edge, /const RAZIEL_DEEP_MAX_TOKENS = 4000;/);
  assert.match(edge, /raziel:max_tokens:\$\{rFast \? 1600 : RAZIEL_DEEP_MAX_TOKENS\}/);
});
