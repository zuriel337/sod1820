// The region, its lines and the default round-1 request, shared by the runner and the tests so that what is reviewed is what is built.
import { buildLines, crossCheckAgainstPage, loadRegion, readings } from "./region.mjs";
import { buildRound1 } from "./prompt.mjs";
import { FINDINGS_SCHEMA_V2, buildRound1V2 } from "./prompt2.mjs";
import { buildRequest } from "./request.mjs";

export const REGION_PATH = new URL("../data/region-columbia.json", import.meta.url).pathname;
export const DEFAULTS = Object.freeze({ model: "claude-fable-5-1", effort: "medium", maxTokens: 64_000, rounds: 1, thinkingMode: "adaptive" });

export const DATA_DIR = new URL("../data/", import.meta.url).pathname;
/** Region data file of a run: "columbia" or the id of a control / planted window (w01..w08, p1, p2). */
export const regionPathOf = (name) => (name === "columbia" ? REGION_PATH : `${DATA_DIR}windows/${name}.json`);

export function loadContext(pagePath = "public/tzofen.html", { regionPath = REGION_PATH } = {}) {
  const region = loadRegion(regionPath);
  const pageCheck = crossCheckAgainstPage(region, pagePath);
  if (pageCheck.mismatches.length) throw new Error(`the region differs from the page's letters in ${pageCheck.mismatches.length} cells`);
  const lines = buildLines(region);
  return { region, lines, byReading: readings(lines), pageCheck };
}

export function round1Request(ctx, { model, effort, maxTokens, rounds, thinkingMode } = DEFAULTS) {
  const round1 = buildRound1({ region: ctx.region, lines: ctx.lines });
  const request = buildRequest({ model, system: round1.system, messages: [{ role: "user", content: round1.user }], effort, maxTokens, cache: rounds === 2, thinkingMode });
  return { round1, request };
}

export const countsByKind = (lines) => Object.fromEntries(["R", "C", "D", "A"].map((k) => [k, lines.filter((l) => l.kind === k).length]));

/** EXP-16 version-2 request: same builder, the v2 prompt and the v2 schema (tier). `run` is a plan entry (see plan.mjs). */
export function round1RequestV2(ctx, run, { model, effort, maxTokens, thinkingMode } = DEFAULTS) {
  const round1 = buildRound1V2({ region: ctx.region, lines: ctx.lines, story: run.story ?? "columbia", marked: Boolean(run.marked), hint: run.hint ?? null, onlyLines: run.onlyLines ?? null });
  const request = buildRequest({ model, system: round1.system, messages: [{ role: "user", content: round1.user }], effort, maxTokens, cache: false, thinkingMode, schema: FINDINGS_SCHEMA_V2 });
  return { round1, request };
}
