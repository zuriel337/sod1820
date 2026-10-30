// EXP-22 plan: two Fable 5.1 readings of ONE instance and ONE window, with the same cap, differing only in the instruction. Nothing else varies.
//   U  focus "uniform"            the instruction measured in EXP-15..18 and sent by the live product run 5f5aa117 (request sha256 27f467a7…)
//   A  focus "axis_neighborhood"  the same text plus the unmeasured axis-deepening addendum (the product default of the branch, never deployed)
// ZURIEL (30.10.2026): up to USD 4 additional in total for the two runs, failures included; no automatic retries.
export const MODEL = Object.freeze({ id: "claude-fable-5-1", effort: "medium", maxTokens: 64_000 });
export const CAP = 25;
export const ROWS = 33;
export const COLS = 41;
export const EXPERIMENT_CAP_USD = 4.0;
/** The batch worst case of a run is reserved before it is sent: counted input x 1.25 (the harness margin; the schema is not in the count) + the whole output allowance, at batch prices. */
export const INPUT_MARGIN = 1.25;
export const RUNS = Object.freeze([
  Object.freeze({ id: "U", focus: "uniform", customId: "els-live-axis-u", label: "uniform (הקריאה הקיימת, נמדדת)" }),
  Object.freeze({ id: "A", focus: "axis_neighborhood", customId: "els-live-axis-a", label: "תוספת העמקה (לא נמדדת)" }),
]);
/** The request of the live product run (job 5f5aa117, uniform, 33x41, cap 25): the U arm must reproduce it exactly. */
export const LIVE_RUN_REQUEST_SHA256_PREFIX = "27f467a7b46317dc";
export const LIVE_RUN_JOB = "5f5aa117-7bb0-4df0-aa6c-96e172b23d44";
