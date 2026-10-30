import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  MATRIX_RAZIEL_PREVIEW_BRANCHES,
  selectMatrixRazielPreview,
  buildMatrixRazielPreviewWorker,
} from "../scripts/lib/matrix-raziel-preview.mjs";

const builder = readFileSync(new URL("../scripts/build-integrated-preview.mjs", import.meta.url), "utf8");
const base = vm.runInNewContext(builder.slice(
  builder.indexOf("const allow ="),
  builder.indexOf('await writeFile(resolve(output, "preview-readonly-sw.js")'),
) + "\nworker;");
const branch = [...MATRIX_RAZIEL_PREVIEW_BRANCHES][0];
const origin = "https://linswmnnkjxvweumprav.supabase.co";

const matrixBody = (over = {}) => ({
  kind: "research", persona: "raziel", subject: "בדוק את המטריצה שבחרתי והצע כיוון מחקרי", facts: [], context: null,
  research_contract: "public-number-research-run-v1", intelligence_level: "deep",
  els_matrix_context: { contract: "els_matrix_presentation_context_v1", axis: { term: "אורניום" }, matrix: { width: 7, rows: [] } },
  ...over,
});

async function call(worker, path, { body = {}, method = "POST", base: host = origin, raw = null } = {}) {
  let handler, output, forwarded = 0;
  vm.runInNewContext(worker, {
    self: { addEventListener: (name, fn) => { if (name === "fetch") handler = fn; } },
    URL, Request, Response,
    fetch: async () => { forwarded++; return Response.json({ forwarded: true }); },
  });
  handler({ request: new Request(host + path, { method, body: raw ?? JSON.stringify(body) }), respondWith: value => { output = value; } });
  const response = output ? await output : null;
  return { response, forwarded, passedThrough: output === undefined };
}

const open = buildMatrixRazielPreviewWorker(base);

test("the baseline Preview worker is untouched and still blocks every ai-analyze call", async () => {
  assert.equal(base.split("preview_read_only").length - 1, 1);
  const { response, forwarded } = await call(base, "/functions/v1/ai-analyze", { body: matrixBody() });
  assert.equal(response.status, 403);
  assert.equal(forwarded, 0);
});

test("an explicit matrix request is the only ai-analyze call that reaches the existing route", async () => {
  const { response, forwarded } = await call(open, "/functions/v1/ai-analyze", { body: matrixBody() });
  assert.equal(forwarded, 1);
  assert.equal((await response.json()).forwarded, true);
});

test("ordinary Raziel chat, other personas and non-matrix contexts stay blocked", async () => {
  const withoutMatrix = matrixBody(); delete withoutMatrix.els_matrix_context;
  for (const body of [
    withoutMatrix,
    matrixBody({ persona: "other" }),
    matrixBody({ kind: "analysis" }),
    matrixBody({ intelligence_level: "fast" }),
    matrixBody({ research_contract: undefined }),
    matrixBody({ els_matrix_context: "x" }),
    matrixBody({ els_matrix_context: [] }),
    matrixBody({ els_matrix_context: { contract: "something_else" } }),
    matrixBody({ companion_action: { type: "save" } }),
    matrixBody({ els_planning_action: { type: "plan" } }),
  ]) {
    const { response, forwarded } = await call(open, "/functions/v1/ai-analyze", { body });
    assert.equal(response.status, 403, JSON.stringify(body).slice(0, 120));
    assert.equal(forwarded, 0);
  }
});

test("malformed bodies, other origins and other methods do not reach ai-analyze", async () => {
  for (const [options, host] of [
    [{ raw: "{not json" }, origin],
    [{ body: matrixBody() }, "https://example.test"],
    [{ body: matrixBody(), method: "PUT" }, origin],
  ]) {
    const { response, forwarded } = await call(open, "/functions/v1/ai-analyze", { ...options, base: host });
    assert.equal(response?.status ?? 403, 403);
    assert.equal(forwarded, 0);
  }
});

test("every other write and model path keeps the existing read-only decision", async () => {
  for (const [path, body] of [
    ["/rest/v1/rpc/research_state_apply_v1", {}],
    ["/rest/v1/rpc/fn_upsert_self_profile", {}],
    ["/rest/v1/rpc/fn_upsert_family_member", {}],
    ["/functions/v1/els-search-bridge", { op: "save" }],
    ["/functions/v1/some-other-function", matrixBody()],
  ]) {
    const { response, forwarded } = await call(open, path, { body });
    assert.equal(response.status, 403, path);
    assert.equal(forwarded, 0);
  }
  // the existing ELS reader and read RPCs are unchanged
  assert.equal((await call(open, "/functions/v1/els-search-bridge", { body: { op: "verify_batch" } })).forwarded, 1);
  assert.equal((await call(open, "/rest/v1/rpc/fn_all_methods")).passedThrough, true);
});

test("the gate admits only the named branch or an explicit local flag, and never Production or the mock build", () => {
  assert.equal(selectMatrixRazielPreview({}), null);
  assert.equal(selectMatrixRazielPreview({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "gpt/anything-else" }), null);
  assert.equal(selectMatrixRazielPreview({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: branch }), branch);
  assert.equal(selectMatrixRazielPreview({ SOD_MATRIX_RAZIEL_PREVIEW: "true" }), branch);
  assert.throws(() => selectMatrixRazielPreview({ SOD_MATRIX_RAZIEL_PREVIEW: "true", VERCEL_ENV: "production" }), /never_production/);
  assert.throws(() => selectMatrixRazielPreview({ SOD_MATRIX_RAZIEL_PREVIEW: "true", VERCEL_GIT_COMMIT_REF: "gpt/other" }), /branch_mismatch/);
  assert.throws(() => selectMatrixRazielPreview({ SOD_MATRIX_RAZIEL_PREVIEW: "true", SOD_RAZIEL_SAFE_ACTIONS_PREVIEW: "true" }), /conflict/);
});

test("responsive acceptance branch admits only the existing bounded reading Preview", () => {
  const branch = "gpt/els-reading-responsive-preview-20261030";
  assert.equal(selectMatrixRazielPreview({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: branch }), branch);
  assert.equal(selectMatrixRazielPreview({ VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: branch }), null);
  assert.throws(() => selectMatrixRazielPreview({ SOD_MATRIX_RAZIEL_PREVIEW: "true", VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: branch }), /never_production/);
});

test("the builder applies the gate only after the baseline worker and reports its identity", () => {
  assert.match(builder, /selectMatrixRazielPreview\(process\.env\)/);
  assert.match(builder, /live-ai-analyze-matrix-request-only/);
  assert.ok(builder.indexOf("selectMatrixRazielPreview(process.env)") > builder.indexOf("const selectedMockBranch ="));
  assert.doesNotMatch(builder, /--prod|target:\s*["']production/);
});

test("the matrix request is the explicit, deep, session-routed shape the gate expects", () => {
  const supabase = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
  assert.match(supabase, /researchContract === 'public-number-research-run-v1' && elsMatrixContext && typeof elsMatrixContext === 'object' \? \{ els_matrix_context: elsMatrixContext \}/);
  const page = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /razielSession\.submitElsMatrixReading\(\{ \.\.\.options, context \}\)/);
  const submission = readFileSync(new URL("../src/lib/research/elsMatrixReadingSession.js", import.meta.url), "utf8");
  assert.match(submission, /intelligenceLevel: "deep"/);
  assert.match(submission, /elsMatrixContext: context/);
  const cmp = readFileSync(new URL("../src/components/experience2029/ElsNativeClassic2029.jsx", import.meta.url), "utf8");
  // the AI request exists only inside the button handler, never in an effect or on selection
  const handler = cmp.indexOf("await onRazielMatrix(context)");
  assert.ok(handler > 0);
  assert.equal(cmp.split("onRazielMatrix(").length - 1, 1);
});

// ELS matrix reading (claude/els-matrix-fable-reading-20261029): the reading is one more field on the SAME matrix Raziel turn, so the existing gate admits it unchanged
// (start, preview, status and cancel are all deep Raziel research turns with the matrix context) and still blocks everything it blocked before.
test("the matrix reading actions are the same admitted request shape: no change to the Preview worker is needed", async () => {
  const token = "T".repeat(80);
  for (const action of [
    { id: "els_matrix_reading_v1", op: "start", ack_upper_bound_usd: 2 },
    { id: "els_matrix_reading_v1", op: "preview" },
    { id: "els_matrix_reading_v1", op: "status", job_token: token },
    { id: "els_matrix_reading_v1", op: "cancel", job_token: token },
  ]) {
    const { forwarded } = await call(open, "/functions/v1/ai-analyze", { body: matrixBody({ els_matrix_reading_action: action }) });
    assert.equal(forwarded, 1, action.op);
  }
  for (const body of [
    matrixBody({ els_matrix_reading_action: { id: "els_matrix_reading_v1", op: "start" }, companion_action: { type: "save" } }),
    matrixBody({ els_matrix_reading_action: { id: "els_matrix_reading_v1", op: "start" }, els_planning_action: { type: "plan" } }),
    matrixBody({ els_matrix_reading_action: { id: "els_matrix_reading_v1", op: "start" }, intelligence_level: "fast" }),
    matrixBody({ els_matrix_reading_action: { id: "els_matrix_reading_v1", op: "start" }, persona: "other" }),
    (() => { const body = matrixBody({ els_matrix_reading_action: { id: "els_matrix_reading_v1", op: "start" } }); delete body.els_matrix_context; return body; })(),
  ]) {
    const { response, forwarded } = await call(open, "/functions/v1/ai-analyze", { body });
    assert.equal(response.status, 403, JSON.stringify(body).slice(0, 100));
    assert.equal(forwarded, 0);
  }
  assert.equal(MATRIX_RAZIEL_PREVIEW_BRANCHES.size, 1, "this branch does not extend the Preview allow-list: trying it in a Preview is a separate, named decision");
  assert.equal(MATRIX_RAZIEL_PREVIEW_BRANCHES.has("claude/els-matrix-fable-reading-20261029"), false);
});
