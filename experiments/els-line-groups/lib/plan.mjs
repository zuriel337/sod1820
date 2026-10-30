// EXP-23 plan: a diagnostic of WHY the reading missed the six saved findings of „יום משיח בא”: input load, choice of proposals, or difficulty with Hebrew recognition and word division.
// Same window as EXP-22 (data in ../els-axis-addendum/data/window.json, sha256 208cbe68…), same model and effort; only the amount of input (small groups of lines) and, in experiment 2, the instruction vary.
export const MODEL = Object.freeze({ id: "claude-fable-5-1", effort: "medium", maxTokens: 10_000 });
/** Lines per group (fixed), in the canonical order of the product's line list (R, C, D, A, ascending ids). The order and the sizes depend only on the ids, never on the letters. */
export const GROUP_SIZE = 8;
/** Ceiling of proposals per group, both arms. Not a quota: the instruction says there is no minimum and no obligation to fill it. */
export const CAP = 12;
/** ZURIEL (30.10.2026): up to USD 5 additional in total, failures included, no automatic retries, no excess. */
export const EXPERIMENT_CAP_USD = 5.0;
export const INPUT_MARGIN = 1.25;
/** Estimated tokens per prompt character (calibrated on EXP-22: 21,541 billed tokens for 26,419 + system characters). The preflight replaces it with the provider's exact count. */
export const TOKENS_PER_CHAR = 0.8;
export const ARMS = Object.freeze([
  Object.freeze({ id: "A", label: "קריאה בסיסית (בלי הנחיית איכות)" }),
  Object.freeze({ id: "B", label: "קריאה עם הנחיית איכות" }),
]);
