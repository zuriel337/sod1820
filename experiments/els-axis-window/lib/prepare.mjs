// Builds the three EXP-18 requests from the windows and the v4 prompt, with hashes and cost bounds for the plan review.
import { loadContext } from "../../els-live-reading/lib/context.mjs";
import { PRICES, buildRequest, lockSha256, requestSha256 } from "../../els-live-reading/lib/request.mjs";
import { FINDINGS_SCHEMA_V4, buildRound1V4 } from "./prompt4.mjs";
import { MODEL, RUNS } from "./plan.mjs";

export const TOKENS_PER_CHAR = 0.777; // calibrated on the tested EXP-16 request: 20,731 counted tokens for 26,679 characters of system + user text

export function prepareAll({ page = "public/tzofen.html", only = null } = {}) {
  const out = [];
  for (const run of RUNS) {
    if (only && !only.has(run.id)) continue;
    const ctx = loadContext(page, { regionPath: run.windowFile });
    const round1 = buildRound1V4({ region: ctx.region, lines: ctx.lines });
    const request = buildRequest({ model: MODEL.id, system: round1.system, messages: [{ role: "user", content: round1.user }], effort: MODEL.effort, maxTokens: MODEL.maxTokens, cache: false, thinkingMode: MODEL.thinkingMode, schema: FINDINGS_SCHEMA_V4 });
    const chars = round1.system.length + round1.user.length;
    const estInput = Math.round(chars * TOKENS_PER_CHAR);
    const price = PRICES[MODEL.id];
    const expected = 0.5 * ((estInput * price.input + 30_000 * price.output) / 1e6); // assumption: 30,000 output tokens (EXP-16 median about 36,000, range 23,000-60,000)
    const worst = 0.5 * ((estInput * price.input * 1.25 + MODEL.maxTokens * price.output) / 1e6);
    out.push({
      run: { ...run, model: MODEL.id }, ctx, request,
      review: { id: run.id, group: run.group, model: MODEL.id, effort: MODEL.effort, max_tokens: MODEL.maxTokens, rows: ctx.region.nRows, cols: ctx.region.nCols, cells: ctx.region.nRows * ctx.region.nCols, lines: ctx.lines.length, est_input_tokens: estInput,
        expected_usd: Number(expected.toFixed(3)), worst_case_usd: Number(worst.toFixed(3)), request_sha256: requestSha256(request), lock_sha256: lockSha256(request) },
    });
  }
  return out;
}
