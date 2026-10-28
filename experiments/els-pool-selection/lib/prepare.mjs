// EXP-12 pilot: builds every request of the plan from the committed pools (and, for the free-proposal arm, from the EXP-16 case-U1 region), with its hashes and cost bounds.
// No network and no ledger here: this is what is reviewed (plan-review.json) and what the runner re-builds and compares before it sends anything.
import { readFileSync } from "node:fs";
import { PRICES, lockSha256, requestSha256 } from "../../els-live-reading/lib/request.mjs";
import { loadContext, regionPathOf, round1RequestV2 } from "../../els-live-reading/lib/context.mjs";
import { ARMS, MODELS, RUNS, poolIdOf } from "./plan.mjs";
import { requestOf } from "./pilot.mjs";

const here = (path) => new URL(path, import.meta.url);
export const poolFile = (id) => JSON.parse(readFileSync(here(`../data/pools/${id}.json`), "utf8"));

/** The U1 run of EXP-16 (window of the width-10101 matrix, axis phrase given, relations prompt v3): the dictionary-free proposal arm reuses it unchanged except for the model. */
export const FREE_RUN = Object.freeze({ prompt: "v3", story: "axis", marked: true });

/** Conservative token estimate for a Hebrew/digit-heavy text (chars, not a tokenizer): digits 1 token each, Hebrew 0.67, everything else 0.45. */
export function estimateTokens(text) {
  const hebrew = (text.match(/[א-ת]/g) ?? []).length, digits = (text.match(/[0-9]/g) ?? []).length;
  return Math.ceil(digits + hebrew * 0.67 + (text.length - hebrew - digits) * 0.45);
}
const EXPECTED_OUTPUT = Object.freeze({ fable: 35_000, sonnet: 16_000, haiku: 16_000 }); // assumption for the review, not a bound
const TOKENIZER_FACTOR = Object.freeze({ haiku: 1.3 }); // claude-haiku-5-5 counts the same text as about 30% more tokens

export function prepareRun(item, { page = "public/tzofen.html" } = {}) {
  const model = MODELS[item.model];
  let request, text, extra = {};
  if (ARMS[item.arm].free) {
    const ctx = loadContext(page, { regionPath: regionPathOf("u1") });
    ({ request } = round1RequestV2(ctx, FREE_RUN, { model: model.id, effort: model.effort, maxTokens: model.maxTokens, thinkingMode: model.thinkingMode }));
    text = `${request.system}\n${request.messages[0].content}`;
    extra = { ctx };
  } else {
    const pool = poolFile(poolIdOf(item));
    const built = requestOf({ run: item, pool });
    request = built.request;
    text = `${built.packet.system}\n${built.packet.user}`;
    extra = { pool, packet: built.packet };
  }
  const price = PRICES[model.id];
  const inputTokens = Math.ceil(estimateTokens(text) * (TOKENIZER_FACTOR[item.model] ?? 1));
  const worst = ((inputTokens * price.input * 1.25 + model.maxTokens * price.output) / 1e6) * 0.5;
  const expected = ((inputTokens * price.input + EXPECTED_OUTPUT[item.model] * price.output) / 1e6) * 0.5;
  return { run: item, request, ...extra, review: { id: item.id, arm: item.arm, series: item.series, model: model.id, pool: ARMS[item.arm].free ? "u1 window (EXP-16)" : poolIdOf(item), priority: item.priority, max_tokens: model.maxTokens, est_input_tokens: inputTokens, expected_usd: Number(expected.toFixed(4)), worst_case_usd: Number(worst.toFixed(4)), request_sha256: requestSha256(request), lock_sha256: lockSha256(request), chars: text.length } };
}

export function prepareAll(options) {
  return RUNS.map((item) => prepareRun(item, options));
}
