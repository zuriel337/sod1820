// EXP-17 plan: the same saved EXP-16 requests, re-sent to cheaper models. Only the model, the effort level and max_tokens differ from the Fable request; the system text, the
// messages, the schema and the thinking setting must be identical (checked by hash in prepare.mjs before any call). Cheapest arms run first.
import { runById } from "../../els-live-reading/lib/plan.mjs";

export const BASES = Object.freeze(["S2", "S4a", "S4b", "V1"]);
export const ARMS = Object.freeze({
  "haiku-m": { model: "claude-haiku-5-5", effort: "medium", maxTokens: 32_000, thinkingMode: "adaptive", priority: 1, expectedOut: 6_000 },
  "haiku-h": { model: "claude-haiku-5-5", effort: "high", maxTokens: 48_000, thinkingMode: "adaptive", priority: 1, expectedOut: 20_000 },
  "sonnet-m": { model: "claude-sonnet-5-5", effort: "medium", maxTokens: 32_000, thinkingMode: "adaptive", priority: 2, expectedOut: 6_000 },
  "sonnet-h": { model: "claude-sonnet-5-5", effort: "high", maxTokens: 48_000, thinkingMode: "adaptive", priority: 3, expectedOut: 30_000 },
});
export const MODELS = Object.freeze([...new Set(Object.values(ARMS).map((arm) => arm.model))]);

/** Spend so far (EXP-15, EXP-16 and the EXP-12 pilot, from the pilot ledger) and this experiment's own limits inside the USD 40 total cap. */
export const PRIOR_SPEND_USD = 31.548551;
export const EXPERIMENT_CAP_USD = 1.5;
export const EXPERIMENT_STOP_NEW_USD = 1.3;
export const BUDGET = Object.freeze({
  cap_usd: 40,
  hard_guard_usd: Number((PRIOR_SPEND_USD + EXPERIMENT_CAP_USD).toFixed(6)),
  stop_new_usd: Number((PRIOR_SPEND_USD + EXPERIMENT_STOP_NEW_USD).toFixed(6)),
});

export const RUNS = Object.freeze(BASES.flatMap((base) => Object.entries(ARMS).map(([arm, settings]) => {
  const source = runById(base);
  return Object.freeze({
    id: `${base}.${arm}`, base, arm, series: "blind", group: "matched", region: source.region, source, round2: false,
    priority: settings.priority, ...settings, note: `${base} request of EXP-16 re-sent to ${settings.model} (effort ${settings.effort})`,
  });
})));
