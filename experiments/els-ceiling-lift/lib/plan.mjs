// EXP-24 plan: the narrow follow-up of EXP-23. Same window as EXP-22/23 (data in ../els-axis-addendum/data/window.json, sha256 208cbe68…), same model, same effort, same instruction (arm A of EXP-23, basic reading),
// same four groups of eight lines that hold the lines of the six saved findings. The ONLY change of the instruction is the ceiling of proposals (12 -> 40). max_tokens is raised from 10,000 to 20,000 so that a longer list cannot be cut off (a cut answer is lost and is never retried); that is an output allowance, not an instruction.
export const MODEL = Object.freeze({ id: "claude-fable-5-1", effort: "medium", maxTokens: 20_000 });
/** Lines per group (fixed, as in EXP-23). */
export const GROUP_SIZE = 8;
/** Ceiling of proposals per group in EXP-24. Not a quota: the instruction still says there is no minimum and no obligation to fill it. */
export const CAP = 40;
/** The ceiling of EXP-23, for the comparison only. */
export const PREVIOUS_CAP = 12;
/** ZURIEL (30.10.2026, "תנסה ריצה צרה"): the narrow run recommended at about USD 2.5, failures included, no automatic retries, no excess. */
export const EXPERIMENT_CAP_USD = 2.5;
export const INPUT_MARGIN = 1.25;
/** Estimated tokens per prompt character (calibrated on EXP-22/23). The preflight replaces it with the provider's exact count. */
export const TOKENS_PER_CHAR = 0.8;
export const ARMS = Object.freeze([Object.freeze({ id: "A", label: "קריאה בסיסית, תקרה מורמת" })]);
