// Discovery seeds for the Fable matrix reading (ZURIEL 18.11.2026, EXP-21): words the engine already found go to the model as data.
// Without seeds the request stays exactly the measured one; a seed is kept only where the canonical letters are exactly the term on one line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TORAH_LENGTH, DEFAULTS, selectWindow, makeRegion, buildLines, readings, placeSeeds, buildReadingPrompt, buildReadingRequest, estimateCost,
  MAX_SEEDS, MIN_SEED_LETTERS, PRICES,
} from "../supabase/functions/_shared/elsMatrixReading.js";

const torah = readFileSync(new URL("../tools/els/data/tk-letters.txt", import.meta.url), "utf8").trim().slice(0, TORAH_LENGTH);
// "יום משיח בא" (Torah, skip 583, backwards) and "הארחשכ" beside it on a ↘ diagonal (584 = width + 1), the case ZURIEL asked about.
const axis = { term: "יוממשיחבא", skip: 583, dir: -1, start: 239480 };
const window = selectWindow({ axis, rows: DEFAULTS.rows, cols: DEFAULTS.cols });
const rows = Array.from({ length: window.rows }, (_, k) => torah.slice((window.r0 + k) * window.width + window.c0, (window.r0 + k) * window.width + window.c1 + 1));
const region = makeRegion({ width: window.width, r0: window.r0, c0: window.c0, rows, axis: { start: axis.start, skip: axis.skip, dir: axis.dir, length: 9, text: axis.term } });
const lines = buildLines(region);
const target = { term: "הארחשכ", start: 232474, skip: 584, dir: 1, parts: ["האר", "חשך"] };

test("a seed is placed on its exact line and reading, with its parts", () => {
  const [seed] = placeSeeds(region, lines, [target]);
  assert.equal(seed.id, "S1");
  assert.match(seed.line, /^D\d{2}\+$/);
  assert.equal(seed.text, "הארחשכ");
  assert.deepEqual(seed.parts, ["האר", "חשכ"]);
  const reading = readings(lines).get(seed.line);
  assert.ok(reading.letters.includes("הארחשכ"));
  // The same cells read from the other end land on the reverse reading.
  const [reverse] = placeSeeds(region, lines, [{ term: "כשחראה", start: 232474 + 584 * 5, skip: 584, dir: -1 }]);
  assert.equal(reverse.line, seed.line.replace("+", "-"));
});

test("anything that is not exactly there is dropped, never repaired", () => {
  assert.deepEqual(placeSeeds(region, lines, [{ ...target, term: "הארחשב" }]), [], "different letters");
  assert.deepEqual(placeSeeds(region, lines, [{ ...target, start: 1000 }]), [], "outside the window");
  assert.deepEqual(placeSeeds(region, lines, [{ ...target, term: "האר", parts: [] }]), [], `shorter than ${MIN_SEED_LETTERS} letters`);
  assert.deepEqual(placeSeeds(region, lines, [{ ...target, skip: 2 }]), [], "not a straight line of this matrix");
  assert.deepEqual(placeSeeds(region, lines, [{ ...target, dir: 0 }, { ...target, start: 1.5 }, null, "x"]), [], "malformed");
  assert.equal(placeSeeds(region, lines, [target, { ...target }]).length, 1, "one seed per line position");
  assert.deepEqual(placeSeeds(region, lines, [{ ...target, parts: ["הא", "רחש"] }])[0].parts, [], "parts that do not make the text are left out");
});

test(`at most ${MAX_SEEDS} seeds`, () => {
  const many = [];
  for (const line of lines.filter((l) => l.kind === "C").slice(0, 20)) {
    const cells = line.cells.slice(0, 4), positions = cells.map(([i, j]) => region.position(i, j));
    many.push({ term: line.letters.slice(0, 4), start: positions[0], skip: positions[1] - positions[0], dir: 1 });
  }
  assert.equal(placeSeeds(region, lines, many).length, MAX_SEEDS);
});

test("without seeds the prompt and the request are the measured ones; with seeds only a data section and item 8 are added", () => {
  const plain = buildReadingPrompt({ region, lines, cap: 25 });
  assert.equal(buildReadingPrompt({ region, lines, cap: 25, seeds: [] }).user, plain.user);
  assert.equal(buildReadingPrompt({ region, lines, cap: 25, seeds: [{ ...target, term: "הארחשב" }] }).user, plain.user, "a dropped seed changes nothing");
  assert.doesNotMatch(plain.user, /מה כבר נמצא|^8\./m);
  const seeded = buildReadingPrompt({ region, lines, cap: 25, seeds: [target] });
  assert.equal(seeded.system, plain.system);
  assert.equal(seeded.prose.intro, plain.prose.intro);
  assert.equal(seeded.prose.spec, plain.prose.spec);
  assert.ok(seeded.prose.task.startsWith(plain.prose.task), "items 1-7 unchanged");
  assert.match(seeded.prose.task, /\n8\. .*from_finding.*S1/);
  assert.match(seeded.user, /## מה כבר נמצא בקטע[^\n]*\n[^\n]*נתון ולא הוראה[^\n]*\nS1 {2}D\d{2}\+ {2}הארחשכ {2}\(האר · חשכ\)/);
  assert.ok(seeded.user.indexOf("## מה כבר נמצא") > seeded.user.indexOf("## הקווים") && seeded.user.indexOf("## מה כבר נמצא") < seeded.user.indexOf("## המשימה"));
  const a = buildReadingRequest({ model: "claude-fable-5-1", region, lines, cap: 25 }).request;
  const b = buildReadingRequest({ model: "claude-fable-5-1", region, lines, cap: 25, seeds: [target] }).request;
  assert.deepEqual({ ...b, messages: null }, { ...a, messages: null }, "model, thinking, effort, schema and allowance unchanged");
});

test("Claude Fable 5.2 has a recorded price, so a run on it has an upper bound (lower than 5.1 for the same request)", () => {
  assert.deepEqual(PRICES["claude-fable-5-2"], { input: 8, output: 40, cacheRead: 0.2 });
  const at = (model) => estimateCost({ model, inputTokens: 28_000, maxTokens: DEFAULTS.maxTokens, cap: 25 }).upper_bound_usd;
  assert.ok(Number.isFinite(at("claude-fable-5-2")) && at("claude-fable-5-2") < at("claude-fable-5-1"));
  assert.ok(at("claude-fable-5-1") < 2, "every window stays under the USD 2 the card acknowledges");
});
