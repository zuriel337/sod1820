// EXP-25 route to the provider: the same request-locked pass-through as EXP-15..24 (scripts/els-live-reading-edge/handler.mjs, verbatim), rendered with the locks of the
// reviewed requests and the two Fable models. Run here against a fake upstream: only an approved request passes, with the site's key added inside the function.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { handle } from "../scripts/els-live-reading-edge/handler.mjs";
import { renderSource, DISABLED_SOURCE } from "../scripts/els-live-reading-edge/render.mjs";
import { TORAH_LENGTH, DEFAULTS, selectWindow, makeRegion, buildLines, buildReadingRequest, lockSha256 } from "../supabase/functions/_shared/elsMatrixReading.js";

const hex = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const torah = readFileSync(new URL("../tools/els/data/tk-letters.txt", import.meta.url), "utf8").trim().slice(0, TORAH_LENGTH);
const axis = { term: "יוממשיחבא", skip: 583, dir: -1, start: 239480 };
const window = selectWindow({ axis, rows: DEFAULTS.rows, cols: DEFAULTS.cols });
const rows = Array.from({ length: window.rows }, (_, k) => torah.slice((window.r0 + k) * window.width + window.c0, (window.r0 + k) * window.width + window.c1 + 1));
const region = makeRegion({ width: window.width, r0: window.r0, c0: window.c0, rows, axis: { start: axis.start, skip: axis.skip, dir: axis.dir, length: 9, text: axis.term } });
const lines = buildLines(region);
const seeds = [{ term: "הארחשכ", start: 232474, skip: 584, dir: 1 }];
const approvedRequest = buildReadingRequest({ model: "claude-fable-5-2", region, lines, cap: 25, seeds }).request;
const TOKEN = "one-time-token-for-the-test";

async function setup(overrides = {}) {
  const calls = [];
  const cfg = { apiKey: "site-secret", tokenSha256: hex(TOKEN), approved: new Set([await lockSha256(approvedRequest)]), models: ["claude-fable-5-1", "claude-fable-5-2"], maxBody: 400000, expiresAt: Date.now() + 3600_000, round2Bases: new Set(), round2Prefix: "", round2MaxCards: 0, round2MaxAssistant: 0, round2MaxUser: 0, ...overrides };
  const upstream = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify({ id: "msgbatch_test1234" }), { status: 200, headers: { "content-type": "application/json" } }); };
  const send = (params, { token = TOKEN, customId = "els-live-exp25-c1-52-seeds" } = {}) => handle(new Request("https://example.supabase.co/functions/v1/els-live-reading/v1/messages/batches", {
    method: "POST", headers: { "x-els-token": token, "anthropic-version": "2026-10-21", "content-type": "application/json" }, body: JSON.stringify({ requests: [{ custom_id: customId, params }] }),
  }), cfg, upstream);
  return { calls, send };
}

// SHA-256 of the handler without its first (provenance) line: the body of experiments/els-axis-addendum/edge/handler.mjs at 653ed8cad (EXP-22..24).
const HANDLER_BODY_SHA256 = "590685d91e8396a146d8d1f2381df089d84ef34c3a2971f69ead7b4c9a651d6a";
test("the handler is the verbatim EXP-15..24 copy", (t) => {
  const current = readFileSync(new URL("../scripts/els-live-reading-edge/handler.mjs", import.meta.url), "utf8").split("\n").slice(1).join("\n");
  assert.equal(hex(current), HANDLER_BODY_SHA256, "the pinned body");
  let previous = null;
  try { previous = execFileSync("git", ["show", "653ed8cad:experiments/els-axis-addendum/edge/handler.mjs"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").slice(1).join("\n"); } catch { previous = null; }
  if (previous === null) { t.diagnostic("commit 653ed8cad is not in this clone (shallow): only the pinned SHA-256 was checked"); return; }
  assert.equal(current, previous, "the same text as the EXP-22..24 copy in git");
});

test("an approved request passes once, with the site's key added inside the function", async () => {
  const { calls, send } = await setup();
  const response = await send(approvedRequest);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages/batches");
  assert.equal(calls[0].init.headers["x-api-key"], "site-secret");
});

test("anything else is refused before the provider", async () => {
  const { calls, send } = await setup();
  assert.equal((await send({ ...approvedRequest, max_tokens: 64001 })).status, 403, "a changed request");
  assert.equal((await send(buildReadingRequest({ model: "claude-fable-5-2", region, lines, cap: 25 }).request)).status, 403, "the same request without the seeds is a different request");
  assert.equal((await send({ ...approvedRequest, model: "claude-opus-5-5" })).status, 403, "a model that is not allowed");
  assert.equal((await send(approvedRequest, { token: "wrong" })).status, 403, "a wrong token");
  assert.equal((await send(approvedRequest, { customId: "els-reading-1" })).status, 400, "the custom id shape");
  assert.equal(calls.length, 0);
  const expired = await setup({ expiresAt: Date.now() - 1 });
  assert.equal((await expired.send(approvedRequest)).status, 410);
});

test("the rendered live source carries only hashes and the site secret name; the disabled source refuses everything", () => {
  const source = renderSource("live", { "token-sha256": hex(TOKEN), approve: "a".repeat(64), model: "claude-fable-5-1,claude-fable-5-2", expires: "2026-11-18T23:00:00Z" });
  assert.match(source, /export|async function handle\(/);
  assert.doesNotMatch(source, /^export /m);
  assert.match(source, /Deno\.env\.get\("ANTHROPIC_API_KEY"\)/);
  assert.ok(!source.includes(TOKEN), "the token itself is never in the function");
  assert.throws(() => renderSource("live", { "token-sha256": hex(TOKEN), approve: "a".repeat(64), model: "claude-opus-5-5", expires: "2026-11-18T23:00:00Z" }), /claude-fable/);
  assert.match(DISABLED_SOURCE, /status: 410/);
});
