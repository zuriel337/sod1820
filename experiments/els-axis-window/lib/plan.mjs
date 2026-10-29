// EXP-18 plan: three Fable 5.1 runs on windows of the selected occurrence's rows +-10 with the v4 (near-axis, at most 25 proposals) prompt. Same model settings as EXP-16.
import { fileURLToPath } from "node:url";

export const MODEL = Object.freeze({ id: "claude-fable-5-1", effort: "medium", maxTokens: 64_000, thinkingMode: "adaptive" });
export const MODELS = Object.freeze([MODEL.id]);
const window = (name) => fileURLToPath(new URL(`../data/windows/${name}.json`, import.meta.url));

// Amendment 1 (29.10, after ZURIEL's new instruction and before the second call): the same Columbia window with three instructions, so that the effect of the window, of the focused
// instruction and of the output cap can be told apart. The control window (K1) and the saved-cipher window (V1X) stay built in data/windows but are not run.
export const RUNS = Object.freeze([
  Object.freeze({ id: "C1", series: "blind", group: "focused", prompt: "v4", cap: 25, windowFile: window("c1"), priority: 1, round2: false, note: "Columbia +-10 rows, FOCUSED instruction (v4: only words that cross or touch the selected occurrence), output cap 25" }),
  Object.freeze({ id: "C2", series: "blind", group: "general", prompt: "v2-general", cap: 60, windowFile: window("c1"), priority: 2, round2: false, note: "Columbia +-10 rows, the PREVIOUS general instruction (v2) as it was, output cap 60" }),
  Object.freeze({ id: "C3", series: "blind", group: "general", prompt: "v2-general", cap: 25, windowFile: window("c1"), priority: 3, round2: false, note: "Columbia +-10 rows, the PREVIOUS general instruction (v2), output cap 25 (separates the cap from the focus)" }),
]);

/** Spend so far (EXP-15, EXP-16, EXP-12, EXP-17; the EXP-17 ledger total) and this experiment's limits inside the USD 40 total cap. */
export const PRIOR_SPEND_USD = 32.278199;
// Amendment 1: ZURIEL approved up to three runs inside the remaining USD 7.72 with cost tracking and a stop before any excess. The cap is raised from 3.0 to 5.2 only so that the guard (which
// reserves the worst case of each run before sending it, about 1.72) does not drop the third run; the expected spend is about 2.5.
export const EXPERIMENT_CAP_USD = 5.2;
export const EXPERIMENT_STOP_NEW_USD = 4.0;
export const BUDGET = Object.freeze({
  cap_usd: 40,
  hard_guard_usd: Number((PRIOR_SPEND_USD + EXPERIMENT_CAP_USD).toFixed(6)),
  stop_new_usd: Number((PRIOR_SPEND_USD + EXPERIMENT_STOP_NEW_USD).toFixed(6)),
});
