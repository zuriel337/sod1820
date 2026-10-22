// #1142 — ZURIEL Human Gate 2026-10-22: in the read-only hosted preview, ONLY the Raziel conversation may reach its
// existing backend, and only from the one approved branch. Everything else stays blocked exactly as before.
import test from "node:test";
import assert from "node:assert/strict";
import { RAZIEL_CHAT_PREVIEW_BRANCHES, renderPreviewReadonlyWorker } from "../scripts/preview-readonly-worker.mjs";
import { HOSTED_HYBRID_BRANCH } from "../scripts/hybrid-preview-source-boundary.mjs";

const HOST = "sod1820-abc123-sod1820-s-projects.vercel.app";
const API = "https://linswmnnkjxvweumprav.supabase.co";
const RETIRED_RAZIEL_CHAT_BRANCH = "claude/raziel-session-frame-seam-20261021";
const RAZIEL_CHAT_BRANCH = HOSTED_HYBRID_BRANCH;

function loadWorker(branch) {
  const { worker, descriptor } = renderPreviewReadonlyWorker({ commit: "a".repeat(40), branch, host: HOST, buildTarget: "hybrid" });
  const listeners = {};
  const forwarded = [];
  const self = { addEventListener: (type, fn) => { listeners[type] = fn; }, location: { href: `https://${HOST}/sw.js?content=x` }, skipWaiting() {}, clients: { claim() {} } };
  const fakeFetch = async (req) => { forwarded.push(req.url); return new Response("forwarded", { status: 200 }); };
  new Function("self", "fetch", "Response", worker)(self, fakeFetch, Response);
  const send = async (path, { method = "POST", body } = {}) => {
    let responded = null;
    listeners.fetch({ request: new Request(`${API}${path}`, { method, body: body == null ? undefined : JSON.stringify(body) }), respondWith: (p) => { responded = p; } });
    if (!responded) return "passthrough";
    const res = await responded;
    return res.status === 200 && (await res.text()) === "forwarded" ? "forwarded" : `blocked-${res.status}`;
  };
  return { descriptor, send, forwarded };
}

const ask = { kind: "research", persona: "raziel", subject: "איך מחברים בין המחקרים והמקורות באתר?", facts: "", context: null, again: false, metatron: false, path: null, intelligence_level: "fast" };

test("the current isolated integration Preview is the only Raziel-chat branch", () => {
  assert.equal(HOSTED_HYBRID_BRANCH, "codex/issue-1142-crossing-integration-20261022");
  assert.deepEqual([...RAZIEL_CHAT_PREVIEW_BRANCHES], [RAZIEL_CHAT_BRANCH]);
  assert.equal(RAZIEL_CHAT_PREVIEW_BRANCHES.includes(HOSTED_HYBRID_BRANCH), true);
  assert.equal(RAZIEL_CHAT_PREVIEW_BRANCHES.includes(RETIRED_RAZIEL_CHAT_BRANCH), false);
});

test("approved branch: a plain Raziel research ask reaches ai-analyze; everything else stays blocked", async () => {
  const w = loadWorker(RAZIEL_CHAT_BRANCH);
  assert.equal(w.descriptor.razielChat, true);
  assert.equal(await w.send("/functions/v1/ai-analyze", { body: ask }), "forwarded");
  assert.equal(await w.send("/functions/v1/ai-analyze", { body: { ...ask, intelligence_level: "deep", again: true } }), "forwarded");
  assert.equal(await w.send("/functions/v1/ai-analyze", { body: { ...ask, persona: "christina" } }), "blocked-403");
  assert.equal(await w.send("/functions/v1/ai-analyze", { body: { ...ask, kind: "image" } }), "blocked-403");
  assert.equal(await w.send("/functions/v1/ai-analyze", { body: { ...ask, metatron: true } }), "blocked-403");
  assert.equal(await w.send("/functions/v1/ai-analyze", { body: { ...ask, mode: "advanced" } }), "blocked-403");
  assert.equal(await w.send("/functions/v1/ai-analyze", { body: { ...ask, path: "x" } }), "blocked-403");
  assert.equal(await w.send("/functions/v1/ai-analyze", { body: { ...ask, facts: "א".repeat(9000) } }), "blocked-403");
  assert.equal(await w.send("/functions/v1/ask-raziel", { body: ask }), "blocked-403");
  assert.equal(await w.send("/rest/v1/research_items", { body: { id: 1 } }), "blocked-403");
  assert.equal(await w.send("/rest/v1/rpc/research_state_apply_ops_v1", { body: {} }), "blocked-403");
  assert.equal(await w.send("/functions/v1/els-search-bridge", { body: { op: "save" } }), "blocked-403");
  assert.equal(await w.send("/rest/v1/posts", { method: "GET" }), "passthrough");
  assert.equal(w.forwarded.length, 2);
});

test("any other branch keeps every model call blocked", async () => {
  const w = loadWorker(RETIRED_RAZIEL_CHAT_BRANCH);
  assert.equal(w.descriptor.razielChat, false);
  assert.equal(await w.send("/functions/v1/ai-analyze", { body: ask }), "blocked-403");
  assert.equal(w.forwarded.length, 0);
});
