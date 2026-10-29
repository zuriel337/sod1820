// EXP-18 plan: three Fable 5.1 runs on windows of the selected occurrence's rows +-10 with the v4 (near-axis, at most 25 proposals) prompt. Same model settings as EXP-16.
import { fileURLToPath } from "node:url";

export const MODEL = Object.freeze({ id: "claude-fable-5-1", effort: "medium", maxTokens: 64_000, thinkingMode: "adaptive" });
export const MODELS = Object.freeze([MODEL.id]);
const window = (name) => fileURLToPath(new URL(`../data/windows/${name}.json`, import.meta.url));

export const RUNS = Object.freeze([
  Object.freeze({ id: "C1", series: "blind", group: "near-axis", windowFile: window("c1"), priority: 1, round2: false, note: "Columbia: rows of the selected occurrence +-10 (cut at the end of the Torah), axis marked, unnamed, no topic" }),
  Object.freeze({ id: "K1", series: "blind", group: "control", windowFile: window("k1"), priority: 2, round2: false, note: "control: random window with a pseudo-axis of 8 cells (marked, unnamed), rows +-10" }),
  Object.freeze({ id: "V1X", series: "blind", group: "near-axis", windowFile: window("v1x"), priority: 3, round2: false, note: "saved cipher: rows of the selected occurrence +-10, axis marked, unnamed, no topic" }),
]);

/** Spend so far (EXP-15, EXP-16, EXP-12, EXP-17; the EXP-17 ledger total) and this experiment's limits inside the USD 40 total cap. */
export const PRIOR_SPEND_USD = 32.278199;
export const EXPERIMENT_CAP_USD = 3.0;
export const EXPERIMENT_STOP_NEW_USD = 2.5;
export const BUDGET = Object.freeze({
  cap_usd: 40,
  hard_guard_usd: Number((PRIOR_SPEND_USD + EXPERIMENT_CAP_USD).toFixed(6)),
  stop_new_usd: Number((PRIOR_SPEND_USD + EXPERIMENT_STOP_NEW_USD).toFixed(6)),
});
