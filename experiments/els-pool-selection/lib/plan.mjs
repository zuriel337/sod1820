// EXP-12 pilot plan: every run, the arm it belongs to, the model settings and the order in which runs may spend money (Amendment 3 of the pre-registration fixes the counts).
// The blind arms never contain a hint or a known word; the diagnostic arms are marked as such everywhere and never pooled with blind results.
export const MODELS = Object.freeze({
  fable: { id: "claude-fable-5-1", effort: "medium", maxTokens: 48_000, thinkingMode: "adaptive" },
  sonnet: { id: "claude-sonnet-5-5", effort: "medium", maxTokens: 32_000, thinkingMode: "adaptive" },
  haiku: { id: "claude-haiku-5-5", effort: "medium", maxTokens: 32_000, thinkingMode: "adaptive" },
});

export const ARMS = Object.freeze({
  B1: { series: "blind", pool: "real", named: false, hint: null, note: "real region, axis marked but unnamed, no story, no topic" },
  B2: { series: "blind", pool: "real", named: true, hint: null, note: "real region, axis named (the cipher's phrase), no story, no topic" },
  B3: { series: "blind", pool: "tile", named: false, hint: null, note: "control tile, pseudo-axis marked and unnamed (the prompt of B1)" },
  F: { series: "blind", free: true, note: "free proposals: the EXP-16 case-U1 request (v3: window letters and geometric relations, axis phrase given, no story, no topic); the model proposes words, phrases and continuations itself, every proposal is verified by the engine" },
  D1: { series: "diagnostic", pool: "real-d1", named: true, hint: null, note: "DIAGNOSTIC pool-forced: the real pool plus the saved words that the word list lacked, as ordinary items (prompt of B2)" },
  D2: { series: "diagnostic", pool: "real", named: false, hint: "structure", note: "DIAGNOSTIC structure hint: one added paragraph on parallel words (prompt of B1 + paragraph)" },
});

// priority: groups run in ascending order; a diagnostic group (priority >= 4) runs only while the spend is below the diagnostics gate of the pilot ledger.
const run = (arm, model, k, priority, extra = {}) => ({ id: `${arm}-${model}-${k}`, arm, model, k, priority, series: ARMS[arm].series, ...extra });
export const RUNS = Object.freeze([
  ...[1, 2, 3].map((k) => run("B1", "sonnet", k, 1)),
  run("B1", "haiku", 1, 1),
  ...[1, 2].map((k) => run("B2", "sonnet", k, 2)),
  run("F", "sonnet", 1, 2.5),
  run("F", "haiku", 1, 2.5),
  ...["t01", "t02", "t03", "t04", "t05", "t06"].map((tile, k) => run("B3", "sonnet", k + 1, 3, { tile })),
  run("B1", "fable", 1, 3.5),
  run("B2", "fable", 1, 3.5),
  ...[1, 2].map((k) => run("D1", "sonnet", k, 4)),
  run("D1", "fable", 1, 4),
  run("D2", "sonnet", 1, 4),
  ...["t07", "t08"].map((tile, k) => run("B3", "haiku", k + 1, 5, { tile })),
]);

export const runById = (id) => {
  const found = RUNS.find((item) => item.id === id);
  if (!found) throw new Error(`unknown run: ${id}`);
  return found;
};
export const poolIdOf = (item) => (item.arm === "B3" ? item.tile : ARMS[item.arm].pool);
export const DIAGNOSTIC_PRIORITY = 4;
