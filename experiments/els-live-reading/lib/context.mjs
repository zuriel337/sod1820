// The region, its lines and the default round-1 request, shared by the runner and the tests so that what is reviewed is what is built.
import { buildLines, crossCheckAgainstPage, loadRegion, readings } from "./region.mjs";
import { buildRound1 } from "./prompt.mjs";
import { buildRequest } from "./request.mjs";

export const REGION_PATH = new URL("../data/region-columbia.json", import.meta.url).pathname;
export const DEFAULTS = Object.freeze({ model: "claude-opus-5-5", effort: "high", maxTokens: 32_000, rounds: 1 });

export function loadContext(pagePath = "public/tzofen.html") {
  const region = loadRegion(REGION_PATH);
  const pageCheck = crossCheckAgainstPage(region, pagePath);
  if (pageCheck.mismatches.length) throw new Error(`the region differs from the page's letters in ${pageCheck.mismatches.length} cells`);
  const lines = buildLines(region);
  return { region, lines, byReading: readings(lines), pageCheck };
}

export function round1Request(ctx, { model, effort, maxTokens, rounds } = DEFAULTS) {
  const round1 = buildRound1({ region: ctx.region, lines: ctx.lines });
  const request = buildRequest({ model, system: round1.system, messages: [{ role: "user", content: round1.user }], effort, maxTokens, cache: rounds === 2 });
  return { round1, request };
}

export const countsByKind = (lines) => Object.fromEntries(["R", "C", "D", "A"].map((k) => [k, lines.filter((l) => l.kind === k).length]));
