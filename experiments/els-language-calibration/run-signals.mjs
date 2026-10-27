#!/usr/bin/env node
// EXP-14 runner (definitions: PREREGISTERED-EXP14.md). One process runs the null windows, the planted hidden words and the development cases, because the calibration tables are built from the null windows.
//   node run-signals.mjs --out-dir results                       (full run, writes exp14-null.json, exp14-planted.json, exp14-cases.json)
//   node run-signals.mjs --null-torah 4 --null-tanakh 3 --planted 3 --out-dir /tmp/smoke   (smoke test with fewer windows; not an experiment result)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadProductReader } from "./lib/product-reader.mjs";
import { axisOf } from "./lib/calibrate.mjs";
import { makeReadInfo } from "./lib/reading.mjs";
import { enumerateCandidates, rankFindings, windowLetters } from "./lib/ranking.mjs";
import { SIGNAL_RANKERS, addCalibrated, addContext, addGeometry, addMirror, addRawScores, addWhole, buildLists, locate, nullComparison, strengthOf, tableFromBuckets, trainTrigram, unionWithContext } from "./lib/signals.mjs";
import { PLANT_CLASSES, overridesOf, planWindow, plantingWords, withOverrides } from "./lib/planting.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
const config = JSON.parse(readFileSync(new URL("./cases-exp14.json", import.meta.url), "utf8"));
const outDir = args["out-dir"] || "experiments/els-language-calibration/results";
const nullCounts = { torah: Number(args["null-torah"] || config.null.windows.torah), tanakh: Number(args["null-tanakh"] || config.null.windows.tanakh) };
const plantedCount = Number(args.planted || config.planted.windows);
const { foundTop, unionPerSignal, contextBlockCap, tops } = config.budgets;
const fold = (text) => text.replace(/[ךםןףץ]/g, (c) => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[c]);
const median = (values) => { if (!values.length) return null; const s = values.slice().sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
const round = (x, d = 3) => (x === null || x === undefined || !Number.isFinite(x) ? x : Number(x.toFixed(d)));
const log = (text) => process.stderr.write(`${new Date().toISOString().slice(11, 19)} ${text}\n`);

const reader = loadProductReader({ htmlPath: args.html || "public/tzofen.html", lexiconPath: args.lexicon || "public/els-dynamic-lexicon-v1.gz64.txt" });
const lexicon = await reader.loadLexicon();
if (!lexicon) throw new Error("the dynamic lexicon did not load");
const hints = reader.newMap();
const streamCount = (scope) => (scope === "tanakh" ? reader.streamLetters : reader.torahLetters);
const models = {};
const modelFor = (scope) => (models[scope] ??= trainTrigram(reader.letters, { limit: streamCount(scope) }));
const scenarios = config.scenarios.map((s) => ({ ...s, terms: new Set(s.context.map(fold)) }));

/** The deterministic control-window sequence of one scope (same formulas as the earlier blind sets). */
function* windowSpecs(scope, axisLength) {
  const spec = config.null;
  reader.setScope(scope);
  const total = streamCount(scope);
  for (let i = 1; i < 20000; i += 1) {
    const skip = spec.skipBase + ((i * 7919 * 104729) % spec.skipSpan);
    const start = (i * 104729 * 13) % (total - axisLength * skip);
    const box = reader.box(axisOf({ start, skip, dir: 1, length: axisLength }));
    if (box && box.cells >= spec.minCells) yield { i, skip, start };
  }
}

/** The pool of one window with language-free features; `edit(base, ctx)` may return a letterAt with overwritten cells (planted words). */
function buildPool({ scope, axisSpec, edit = null }) {
  reader.setScope(scope);
  const axis = axisOf(axisSpec);
  const box = reader.box(axis);
  const started = performance.now();
  const base = windowLetters({ letters: reader.letters, box, streamLetters: streamCount(scope) });
  const axisCells = axis.positions.map((p) => [Math.floor(p / box.S), p % box.S]);
  const planted = edit ? edit({ base, axis, box, axisCells }) : null;
  if (edit && !planted) return null;
  const letterAt = planted ? withOverrides(base, overridesOf(planted)) : base;
  const candidates = enumerateCandidates({ letterAt, box });
  const poolMs = performance.now() - started;
  const g0 = performance.now();
  addGeometry(candidates, axisCells);
  for (const c of candidates) { c.cross = c.dist === 0; c.adjacent = c.dist === 1; c.parallel = c.line === "down" && c.dist > 0; }
  return { scope, axis, box, axisCells, axisColumn: axisCells[0][1], candidates, planted, timing: { pool: poolMs, geometry: performance.now() - g0 } };
}

/** All five signals and the combined list for a pool. `terms` is the context for K (may be empty). */
function runSignals(win, { table, terms }) {
  const timing = { ...win.timing };
  let t = performance.now();
  const model = modelFor(win.scope);
  addRawScores(win.candidates, model);
  addCalibrated(win.candidates, table);
  timing.hebrewLikeness = performance.now() - t;
  t = performance.now();
  addMirror(win.candidates, win.axisColumn);
  timing.mirror = performance.now() - t;
  t = performance.now();
  addWhole(win.candidates, makeReadInfo({ reader, lexicon, hints, mode: "whole" }));
  timing.productReading = performance.now() - t;
  t = performance.now();
  if (terms.size) addContext(win.candidates, terms);
  const lists = buildLists(win.candidates, { withContext: terms.size > 0 });
  timing.ranking = performance.now() - t;
  t = performance.now();
  const union = unionWithContext(lists, { per: unionPerSignal, cap: contextBlockCap });
  timing.union = performance.now() - t;
  timing.total = Object.values(timing).reduce((a, b) => a + b, 0);
  return { lists, union, timing };
}

const describeCandidate = (c) => ({ surface: c.surface, line: c.line, reverse: c.reverse, from: c.cells[0], to: c.cells.at(-1), len: c.len, dist: c.dist, H: round(c.H, 2), ...(c.M !== undefined ? { M: round(c.M, 2) } : {}), whole: c.whole === true });
const eligibleCount = (win, name) => win.candidates.filter((c) => SIGNAL_RANKERS[name].eligible(c, {})).length;
/** Share of the window's cells covered by the first n findings of a list (the chance level for "a finding contains the word": a word placed at random is contained only if its cells are covered). */
const coverage = (list, n, box) => { const cells = new Set(); for (const f of list.slice(0, n)) for (const [r, c] of f.candidate.cells) cells.add(r * 1_000_000 + c); return round(cells.size / box.cells, 3); };
const roundTimes = (timing) => Object.fromEntries(Object.entries(timing).map(([k, v]) => [k, Math.round(v)]));

// ------------------------------------------------------------------------------------------------ null windows
const nullData = {};
async function nullPass(scope) {
  const count = nullCounts[scope];
  const specs = [];
  for (const spec of windowSpecs(scope, config.null.axisLength)) { specs.push(spec); if (specs.length >= count) break; }
  const buckets = new Map();
  const started = performance.now();
  for (const spec of specs) {
    const win = buildPool({ scope, axisSpec: { start: spec.start, skip: spec.skip, dir: 1, length: config.null.axisLength } });
    addRawScores(win.candidates, modelFor(scope));
    for (const c of win.candidates) { let b = buckets.get(c.len); if (!b) { b = []; buckets.set(c.len, b); } b.push(c.hRaw); }
  }
  const table = tableFromBuckets(buckets);
  log(`null ${scope}: table from ${specs.length} windows in ${Math.round((performance.now() - started) / 1000)}s`);
  const windows = [];
  const strengths = { G: [], H: [], W: [], M: [], ...Object.fromEntries(scenarios.map((s) => [`K:${s.id}`, []])) };
  for (const spec of specs) {
    const win = buildPool({ scope, axisSpec: { start: spec.start, skip: spec.skip, dir: 1, length: config.null.axisLength } });
    const sig = runSignals(win, { table, terms: new Set() });
    const row = { i: spec.i, skip: spec.skip, start: spec.start, cells: win.box.cells, candidates: win.candidates.length, findings: {}, scored: {}, timeMs: roundTimes(sig.timing), unionSize: sig.union.length };
    for (const name of ["G", "H", "W", "M"]) { strengths[name].push(sig.lists[name].map(strengthOf)); row.findings[name] = sig.lists[name].length; row.scored[name] = eligibleCount(win, name); }
    row.topH = round(sig.lists.H[0]?.tuple[0], 2);
    row.topM = round(sig.lists.M[0]?.tuple[0], 2);
    row.context = {};
    for (const s of scenarios) {
      addContext(win.candidates, s.terms);
      const contextFindings = rankFindings(win.candidates, SIGNAL_RANKERS.K, {});
      strengths[`K:${s.id}`].push(contextFindings.map(strengthOf));
      row.context[s.id] = { findings: contextFindings.length, scored: eligibleCount(win, "K"), blockSize: Math.min(contextFindings.length, contextBlockCap) };
    }
    windows.push(row);
    if (windows.length % 5 === 0) log(`null ${scope}: ${windows.length}/${specs.length}`);
  }
  const quantiles = Object.fromEntries(Object.entries(table).map(([len, sorted]) => [len, { n: sorted.length, p50: round(sorted[Math.floor(sorted.length * 0.5)], 3), p90: round(sorted[Math.floor(sorted.length * 0.9)], 3), p99: round(sorted[Math.floor(sorted.length * 0.99)], 3), p999: round(sorted[Math.floor(sorted.length * 0.999)], 3) }]));
  const summary = { scope, windows: windows.length, medianCandidates: median(windows.map((w) => w.candidates)), medianTotalMs: median(windows.map((w) => w.timeMs.total)), medianFindings: Object.fromEntries(["G", "H", "W", "M"].map((n) => [n, median(windows.map((w) => w.findings[n]))])),
    medianContextFindings: Object.fromEntries(scenarios.map((s) => [s.id, median(windows.map((w) => w.context[s.id].findings))])), maxContextFindings: Object.fromEntries(scenarios.map((s) => [s.id, Math.max(...windows.map((w) => w.context[s.id].findings))])), medianTopH: median(windows.map((w) => w.topH)), medianTopM: median(windows.map((w) => w.topM)) };
  nullData[scope] = { table, strengths, rows: windows, summary, quantiles, usedIndexes: new Set(specs.map((s) => s.i)), lastIndex: specs.at(-1)?.i ?? 0 };
}

// ------------------------------------------------------------------------------------------------ target analysis
function analyze(win, sig, rawTarget, scenario) {
  const target = fold(rawTarget);
  const placements = win.candidates.filter((c) => c.surface === target);
  const out = { target: rawTarget, present: placements.length > 0, placements: placements.map(describeCandidate) };
  if (!placements.length) return out;
  const per = {};
  for (const [name, list] of Object.entries(sig.lists)) {
    const ranker = SIGNAL_RANKERS[name];
    const eligible = placements.filter((c) => ranker.eligible(c, {}));
    const loc = locate(list, placements);
    const row = { eligiblePlacements: eligible.length, listSize: list.length, scored: eligibleCount(win, name), rank: loc };
    for (const top of tops) row[`found${top}`] = loc.contained !== null && loc.contained <= top;
    row.found = loc.contained !== null && loc.contained <= foundTop;
    if (eligible.length) {
      const best = eligible.map((c) => ({ c, tuple: ranker.tuple(c, {}) })).sort((a, b) => { for (let i = 0; i < a.tuple.length; i += 1) if (a.tuple[i] !== b.tuple[i]) return b.tuple[i] - a.tuple[i]; return 0; })[0];
      row.strength = best.tuple.slice(0, -1).map((x) => round(x, 3));
      const nullKey = name === "K" ? `K:${scenario.id}` : name;
      row.null = nullComparison(nullData[win.scope].strengths[nullKey], best.tuple.slice(0, -1));
      row.credible = row.found && row.null.blindShare <= config.thresholds.credibleBlindShare;
      if (name === "G") row.tiedGroup = win.candidates.filter((c) => c.dist === best.c.dist && c.len === best.c.len).length;
    }
    per[name] = row;
  }
  const u = locate(sig.union, placements);
  const tier = u.contained !== null ? sig.union[u.contained - 1].tier : null;
  per.U = { listSize: sig.union.length, rank: u, found: u.contained !== null, tier, keptOnlyByContext: null };
  out.signals = per;
  return out;
}

function caseRuns() {
  const runs = [];
  for (const c of config.cases) {
    runs.push({ caseSpec: c, scenario: null });
    for (const s of scenarios.filter((x) => x.case === c.id)) runs.push({ caseSpec: c, scenario: s });
  }
  return runs;
}

function developmentPass() {
  const out = [];
  for (const { caseSpec, scenario } of caseRuns()) {
    const terms = scenario?.terms ?? new Set();
    const win = buildPool({ scope: caseSpec.scope, axisSpec: caseSpec });
    const sig = runSignals(win, { table: nullData[caseSpec.scope].table, terms });
    const targets = caseSpec.targets.map((raw) => analyze(win, sig, raw, scenario));
    const keptOnlyByContext = terms.size ? sig.lists.K.slice(0, contextBlockCap).filter((f) => !["G", "H", "W", "M"].some((n) => sig.lists[n].slice(0, unionPerSignal).some((g) => g.candidate === f.candidate))).length : 0;
    const top = (name, n = 5) => (sig.lists[name] ?? []).slice(0, n).map((f) => ({ ...describeCandidate(f.candidate), strength: strengthOf(f).map((x) => round(x, 2)) }));
    const report = {
      case: caseSpec.id, scenario: scenario?.id ?? null, scope: caseSpec.scope, origin: scenario?.origin ?? caseSpec.origin, box: win.box, candidates: win.candidates.length,
      lists: Object.fromEntries(Object.entries(sig.lists).map(([n, l]) => [n, { findings: l.length, scored: eligibleCount(win, n), returnedTop50: Math.min(l.length, foundTop), coverageTop50: coverage(l, foundTop, win.box) }])),
      union: { size: sig.union.length, coverage: coverage(sig.union, sig.union.length, win.box), byTier: Object.fromEntries(["K", "G", "H", "W", "M"].map((t) => [t, sig.union.filter((f) => f.tier === t).length])), keptOnlyByContext },
      timeMs: roundTimes(sig.timing), targets, top5: Object.fromEntries(Object.keys(sig.lists).map((n) => [n, top(n)])),
    };
    out.push(report);
    log(`case ${caseSpec.id}${scenario ? `+${scenario.id}` : ""} done in ${Math.round(sig.timing.total)} ms`);
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ planted hidden words
function plantedPass() {
  const exclude = config.cases.flatMap((c) => c.targets.map(fold));
  const words = plantingWords(lexicon.words.keys(), { min: config.planted.wordLengths[0], max: config.planted.wordLengths[1], exclude });
  const specs = [];
  reader.setScope(config.planted.scope);
  const records = [];
  let skipped = 0;
  const windows = [];
  const started = performance.now();
  for (const spec of windowSpecs(config.planted.scope, config.null.axisLength)) {
    if (spec.i <= nullData.torah.lastIndex) continue;
    if (windows.length >= plantedCount) break;
    const odd = spec.i % 2 === 1;
    const givenClasses = new Set(odd ? config.planted.given.odd : config.planted.given.even);
    let placed = null;
    const win = buildPool({
      scope: config.planted.scope, axisSpec: { start: spec.start, skip: spec.skip, dir: 1, length: config.null.axisLength },
      edit: ({ base, axis, box, axisCells }) => {
        placed = planWindow({ axisCells, axisLetters: axis.positions.map((p) => reader.letters[p]), words, index: (k) => (spec.i * 7919 + k * 104729 + 13) % words.length, inside: (r, c) => base(r, c) !== undefined });
        return placed;
      },
    });
    if (!win) { skipped += 1; continue; }
    const terms = new Set(placed.filter((p) => givenClasses.has(p.class)).map((p) => p.word));
    const sig = runSignals(win, { table: nullData.torah.table, terms });
    const row = { i: spec.i, skip: spec.skip, cells: win.box.cells, unionSize: sig.union.length, coverage: { ...Object.fromEntries(Object.entries(sig.lists).map(([n, l]) => [n, coverage(l, foundTop, win.box)])), U: coverage(sig.union, sig.union.length, win.box) }, listSizes: Object.fromEntries(Object.entries(sig.lists).map(([n, l]) => [n, l.length])), timeMs: roundTimes(sig.timing), words: [] };
    for (const p of placed) {
      const candidate = win.candidates.find((c) => !c.reverse && c.line === p.line && c.surface === p.word && c.cells[0][0] === p.cells[0][0] && c.cells[0][1] === p.cells[0][1]);
      if (!candidate) throw new Error(`planted ${p.class} not found in the pool of window ${spec.i}`);
      const given = givenClasses.has(p.class);
      const rec = { window: spec.i, class: p.class, len: p.word.length, given, dist: candidate.dist, ranks: {}, exact: {} };
      for (const [name, list] of Object.entries(sig.lists)) { const at = locate(list, [candidate]); rec.ranks[name] = at.contained; rec.exact[name] = at.exact; }
      const atUnion = locate(sig.union, [candidate]);
      rec.ranks.U = atUnion.contained;
      rec.exact.U = atUnion.exact;
      records.push(rec);
      row.words.push({ class: p.class, given, len: p.word.length, dist: candidate.dist });
    }
    windows.push(row);
    if (windows.length % 5 === 0) log(`planted ${windows.length}/${plantedCount}`);
  }
  const aggregate = {};
  for (const cls of PLANT_CLASSES) {
    for (const given of [false, true]) {
      const group = records.filter((r) => r.class === cls && r.given === given);
      if (!group.length) continue;
      const key = `${cls}:${given ? "given" : "hidden"}`;
      aggregate[key] = { n: group.length };
      for (const name of ["G", "H", "W", "M", "K", "U"]) {
        const ranks = group.map((r) => r.ranks[name]).filter((x) => x !== null && x !== undefined);
        const rowOf = (r) => windows.find((w) => w.i === r.window);
        const sizeOf = (r) => (name === "U" ? rowOf(r).unionSize : rowOf(r).listSizes[name]);
        const size = median(group.map(sizeOf).filter((x) => x !== undefined));
        const everything = median(group.map((r) => rowOf(r).listSizes.G));
        aggregate[key][name] = { ...Object.fromEntries(tops.map((top) => [`recall${top}`, round(group.filter((r) => r.ranks[name] !== null && r.ranks[name] !== undefined && r.ranks[name] <= (name === "U" ? Infinity : top)).length / group.length, 3)])), recallExact50: round(group.filter((r) => r.exact[name] !== null && r.exact[name] !== undefined && r.exact[name] <= (name === "U" ? Infinity : foundTop)).length / group.length, 3), medianCoverage: median(group.map((r) => rowOf(r).coverage[name]).filter((x) => x !== undefined)), medianRank: median(ranks), medianListSize: size, chance: size ? round((name === "U" ? size : Math.min(foundTop, size)) / (name === "U" ? everything : size), 3) : null };
      }
    }
  }
  return { windows: windows.length, skippedByFit: skipped, wordsAvailable: words.length, seconds: Math.round((performance.now() - started) / 1000), medianTotalMs: median(windows.map((w) => w.timeMs.total)), medianUnionSize: median(windows.map((w) => w.unionSize)), aggregate, records, rows: windows };
}

// ------------------------------------------------------------------------------------------------ main
mkdirSync(outDir, { recursive: true });
const wall = performance.now();
await nullPass("torah");
await nullPass("tanakh");
const nullOut = { provenance: reader.provenance, windows: Object.fromEntries(Object.entries(nullData).map(([scope, d]) => [scope, { summary: d.summary, quantiles: d.quantiles, rows: d.rows }])) };
writeFileSync(`${outDir}/exp14-null.json`, JSON.stringify(nullOut));
log("null windows written");
const cases = developmentPass();
writeFileSync(`${outDir}/exp14-cases.json`, JSON.stringify({ provenance: reader.provenance, runs: cases }));
log("development cases written");
const planted = plantedPass();
writeFileSync(`${outDir}/exp14-planted.json`, JSON.stringify({ provenance: reader.provenance, ...planted }));
log(`planted written; wall ${Math.round((performance.now() - wall) / 1000)}s`);
