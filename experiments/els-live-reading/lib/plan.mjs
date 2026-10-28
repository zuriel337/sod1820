// EXP-16 plan: every run, its series, and the order in which runs are allowed to spend money. The blind series never contain a hint; a diagnostic run is marked as such in
// its definition, its output directory and its report line, and is never pooled with the blind runs. Defaults for all runs: claude-fable-5-1, adaptive thinking (summarized),
// effort medium, max_tokens 64,000, batch transport (the settings of the EXP-15 run that produced an answer).
export const SERIES = Object.freeze({
  blind: "blind: no hint of any kind; targets never in input or code",
  planted: "blind with known truth: words planted by the harness, the model is not told",
  diagnostic: "DIAGNOSTIC: the model is given a hint; never pooled with blind results",
});

const RANDOM = ["w01", "w02", "w03", "w04", "w05", "w06"];
const letter = (k) => "abcdef"[k];

export const RUNS = Object.freeze([
  // --- blind story control: does the story, the marking or chance explain the Columbia result?
  { id: "S2", series: "blind", group: "story", region: "columbia", prompt: "v2", story: "columbia", marked: false, priority: 1, note: "Columbia region, the story, nothing marked" },
  { id: "S3", series: "blind", group: "story", region: "columbia", prompt: "v2", story: "wrong", marked: false, priority: 1, note: "Columbia region, an unrelated story, nothing marked" },
  ...RANDOM.map((region, k) => ({ id: `S4${letter(k)}`, series: "blind", group: "story", region, prompt: "v2", story: "columbia", marked: false, priority: 1, note: `random window ${region}, the Columbia story, nothing marked` })),
  { id: "S1", series: "blind", group: "story", region: "columbia", prompt: "v1", priority: 1, note: "exact repeat of the EXP-15 request (same hash): run-to-run variance" },
  // --- blind exploration without a story or a topic
  { id: "N1", series: "blind", group: "nostory", region: "columbia", prompt: "v2", story: "none", marked: false, priority: 2, round2: true, note: "Columbia region, no story, nothing marked" },
  // Amendment (28.10, during the run, before the N group started): S4c and S4d (windows w03, w04) ended at max_tokens with no answer, so N2c and N2d, the same windows without a story, run after the planted
  // windows (priority 3.5) to put the budget first where an answer is likely. No request changed.
  ...RANDOM.slice(0, 4).map((region, k) => ({ id: `N2${letter(k)}`, series: "blind", group: "nostory", region, prompt: "v2", story: "none", marked: false, priority: k < 2 ? 2 : 3.5, round2: true, note: `random window ${region}, no story, nothing marked (paired with S4${letter(k)})` })),
  // --- a saved cipher added by ZURIEL (28.10): only the region and the axis phrase are given; the saved record's description is read after the answer is saved
  { id: "V1", series: "blind", group: "saved", region: "v1", prompt: "v2", story: "axis", marked: true, priority: 2.5, round2: true, note: "saved cipher: region of the width-5541 matrix with the axis phrase given, no description, no topic" },
  // --- blind planted recall
  { id: "P1", series: "planted", group: "planted", region: "p1", prompt: "v2", story: "none", marked: false, priority: 3, note: "planted window 1 (6 words), no story" },
  { id: "P2", series: "planted", group: "planted", region: "p2", prompt: "v2", story: "none", marked: false, priority: 3, note: "planted window 2 (6 words), no story" },
  // --- diagnostics (hints), last
  { id: "D1", series: "diagnostic", group: "diagnostic", region: "columbia", prompt: "v2", story: "none", marked: true, hint: "lines", onlyLines: ["D45", "A45"], priority: 4, note: "points at two lines that pass next to the selected occurrence; asks for every reading" },
  { id: "D2", series: "diagnostic", group: "diagnostic", region: "columbia", prompt: "v2", story: "columbia", marked: true, hint: "names", priority: 4, note: "Columbia, story, occurrence marked, plus a hint to propose names, acronyms and splits" },
]);

export const runById = (id) => {
  const run = RUNS.find((item) => item.id === id);
  if (!run) throw new Error(`unknown run: ${id}`);
  return run;
};
export const ROUND2_CARD_CAP = 6;
