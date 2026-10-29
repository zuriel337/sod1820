// Builds every EXP-17 request from the same builders as EXP-16 and proves that the input is the saved Fable input: system text, messages, schema and thinking setting are
// compared with controls/runs/<base>/request-round1.json of the live-reading experiment. Only model, effort and max_tokens may differ.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadContext, regionPathOf, round1RequestV2 } from "../../els-live-reading/lib/context.mjs";
import { PRICES, canonicalJson, lockSha256, requestSha256 } from "../../els-live-reading/lib/request.mjs";
import { RUNS } from "./plan.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const sha = (value) => createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

export const savedFableRequestPath = (base) => here(`../../els-live-reading/controls/runs/${base}/request-round1.json`);
export const savedFablePreflight = (base) => readJson(here(`../../els-live-reading/controls/runs/${base}/preflight-round1.json`));

/** Which parts of the request are the "input": everything but the three settings that this experiment changes on purpose. */
export function inputOf(request) {
  const { model, max_tokens, output_config, ...rest } = request;
  const { effort, ...config } = output_config ?? {};
  return { ...rest, output_config: config };
}

export function prepareAll({ page = "public/tzofen.html", only = null } = {}) {
  const contexts = new Map();
  const out = [];
  for (const run of RUNS) {
    if (only && !only.has(run.id)) continue;
    const path = savedFableRequestPath(run.base);
    if (!existsSync(path)) throw new Error(`${run.id}: the saved Fable request ${path} is missing`);
    if (!contexts.has(run.region)) contexts.set(run.region, loadContext(page, { regionPath: regionPathOf(run.region) }));
    const ctx = contexts.get(run.region);
    const { request } = round1RequestV2(ctx, run.source, { model: run.model, effort: run.effort, maxTokens: run.maxTokens, thinkingMode: run.thinkingMode });
    const saved = readJson(path);
    const sameInput = sha(inputOf(request)) === sha(inputOf(saved));
    if (!sameInput) throw new Error(`${run.id}: the input differs from the saved Fable request of ${run.base}; nothing may be sent`);
    const price = PRICES[run.model];
    const estInput = savedFablePreflight(run.base).input_tokens_counted; // Fable's count; the live preflight gives the exact count for the model
    const expected = 0.5 * ((estInput * price.input + run.expectedOut * price.output) / 1e6);
    const worst = 0.5 * ((estInput * price.input * 1.25 + run.maxTokens * price.output) / 1e6);
    out.push({
      run, ctx, request,
      review: {
        id: run.id, base: run.base, arm: run.arm, model: run.model, effort: run.effort, max_tokens: run.maxTokens, priority: run.priority,
        input_identical_to_fable_request: true, input_sha256: sha(inputOf(request)), fable_request_sha256: requestSha256(saved), fable_model: saved.model,
        request_sha256: requestSha256(request), lock_sha256: lockSha256(request), est_input_tokens: estInput,
        expected_usd: Number(expected.toFixed(4)), worst_case_usd: Number(worst.toFixed(4)),
      },
    });
  }
  return out;
}
