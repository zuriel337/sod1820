#!/usr/bin/env node
// CLI of the ELS matrix-scan experiment. It never connects to a database: it BUILDS the read-only SQL (to be executed by whoever holds
// access) and ANALYSES the JSON the engine returned.
//
// Two modes (state.mode). CROSSING is the default direction: "which dictionary words cross the cipher". REGION is the earlier
// "everything in a 21x61 window" scan, kept for the comparison to other regions.
//
//   sql --kind occurrences --term T | --example id      every occurrence of the cipher through the canonical page function
//   sql --kind anchor --example id                      the single occurrence an example names (term + skip)
//   sql --kind total | count [--shares-with TERM]       stream length / dictionary size per word length (crossing: only words that share a letter with the cipher)
//   init --term T | --example id --anchor occ.json (--pick N | --pick-skip S) --total-letters N --dict counts.json --out state.json
//        [--mode crossing|region (default crossing)] [--min-len N]
//   sql --kind batch --state s.json --offset N --limit N [--directions diag|diag_row|cd|row|both] [--controls on (region mode only)]
//   sql --kind rarity --state s.json --batches DIR [--part N]    matrix-wide counts of the crossing words (same engine, whole matrix)
//   sql --kind letters --state s.json                   the real letters of the display region (to draw and to verify)
//   report --state s.json --batches DIR [--rarity a.json,b.json]            (crossing)
//   report --state s.json --batches DIR [--probe p.json] [--membership m.json] [--controls on]   (region; --controls on = the SEPARATE comparison)
//   packet / validate --state s.json --batches DIR [--rarity ...] [--answer a.json]   the grouping packet for a model / its validator
//   markup --state s.json --batches DIR --letters letters.json [--rarity ...] [--out-json marks.json] [--out-html matrix.html]
//   sql --kind chance --state s.json [--batches DIR]    (crossing, SEPARATE option) expected number of chance crossings, read-only, no engine call
//   sql --kind chance ... --letters letters.json        the same with the display region's own letter frequencies (sensitivity)
//   report/packet/markup ... --chance chance.json [--chance-local chance-local.json]   adds the chance baseline to a crossing report / packet
//   sql --kind windows --term T --skip-min N --skip-max N [--window 300]    exhaustive search of one rare term in skip windows (canonical page function), <= 40 windows per statement
//   windows-report --term T --skip-min N --skip-max N --parts a.json,b.json   merges the window outputs; coverage and completeness are checked
//   sql --kind sequences --width W --total N --axis-start S --axis-skip K --axis-dir D --axis-length L [--margin 20 --shifts 100 --probes a,b --grid torah|tanakh]   EXP-07 dictionary-free sequence detector
//   sequences-report --scan scan.json [--out f.json]
//   sql --kind crawl (--state s.json --batches DIR | --seeds seeds.json) [--reach 5 --shifts 300 --min-total 4 --criterion forms|collocations]
//        continuation crawler: seeds = engine occurrences (the crossing findings, or an explicit list [{id, word, start, skip, dir}])
//   crawl-report --crawl crawl.json (--state s.json --batches DIR | --seeds seeds.json) [--out f.json]     calibrated summary (language learned from the Torah's own words)
//   sql --kind verify-extensions --crawl crawl.json --state s.json (--batches DIR | --seeds seeds.json) [--top 1] [--only-unusual]    engine re-confirmation of extended strings
//   verify-report --verify v.json --crawl crawl.json --state s.json (--batches DIR | --seeds seeds.json) [--top 1] [--only-unusual]
//   method [--mode crossing|crawl]                      the exact calculation method of the comparison (region: tiles; crossing: iid-letter chance; crawl: calibrated continuation)
//   sql --kind membership --words a,b,c | sql --kind probe --state s.json --words a,b,c     evaluation helpers (never shown to a model)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fullRows, regionAroundAnchor, regionAroundPositions, tileGrid } from "./lib/geometry.mjs";
import { CROSSING_DIRECTION_COUNT, anchorSql, windowedOccurrencesSql, dictionaryCountSql, dictionaryMembershipSql, expectedCrossingSql, occurrencesSql, regionLettersSql, scanBatchSql, streamLengthSql } from "./lib/queries.mjs";
import { describeChanceModel, regionLetterCounts } from "./lib/chance.mjs";
import { summarizeWindowedSearch } from "./lib/exhaustive.mjs";
import { describeSequenceMethod, sequenceScanSql, summarizeSequenceScan } from "./lib/sequences.mjs";
import { crawlSql, describeCrawlMethod, parseVerifyLines, summarizeCrawl, verifyExtensionsSql } from "./lib/crawl.mjs";
import { buildCrossingReport, buildRunReport } from "./lib/report.mjs";
import { describeMethod } from "./lib/controls.mjs";
import { buildCrossingPacket, buildGroupingPacket, validateGrouping } from "./lib/grouping.mjs";
import { normalizeFindings } from "./lib/findings.mjs";
import { buildMarkup, letterGridFromRows, renderMarkupHtml, verifyFindingsAgainstLetters } from "./lib/markup.mjs";

const args = Object.fromEntries(process.argv.slice(3).map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const config = readJson(new URL("./examples.json", import.meta.url));
const exampleById = (id) => config.examples.find((entry) => entry.id === id) || (() => { throw new Error(`unknown --example ${id}`); })();
const unwrap = (value) => { const first = Array.isArray(value) ? value[0] : value; return first?.result ?? first?.batch ?? first?.expectation ?? first?.crawl ?? first?.verify ?? first?.out ?? first?.scan ?? first; };
const loadBatches = (dir) => readdirSync(dir).filter((name) => name.endsWith(".json")).sort().map((name) => readJson(join(dir, name))).map((entry) => ({ ...entry, result: unwrap(entry.result) }));
const isCrossing = (state) => state.mode === "crossing";
const termOf = () => (args.example ? exampleById(args.example).term : args.term || (() => { throw new Error("give --term or --example"); })());

/** Rarity probes (matrix-wide counts of the crossing words): several result files are merged. */
const loadRarity = () => {
  if (!args.rarity) return null;
  const parts = args.rarity.split(",").map((path) => unwrap(readJson(path)));
  return { word_matrix_hits: Object.assign({}, ...parts.map((part) => part.word_matrix_hits)), truncated_calls: parts.flatMap((part) => part.truncated_calls || []) };
};
const loadChance = () => (args.chance ? unwrap(readJson(args.chance)) : null);
const loadChanceLocal = () => (args["chance-local"] ? unwrap(readJson(args["chance-local"])) : null);
const stateOf = () => readJson(args.state);
/** Seeds of a crawl: an explicit list, or the crossing findings of a crossing run (engine occurrences, nothing else). */
const loadSeeds = () => {
  if (args.seeds) return readJson(args.seeds);
  const state = stateOf();
  return buildCrossingReport({ state, batches: loadBatches(args.batches) }).findingsList.map((finding) => ({ id: finding.id, word: finding.word, start: finding.start, skip: finding.skip, dir: finding.dir }));
};
const topExtensions = (summary, seeds, { top = 1, onlyUnusual = false } = {}) => summary.rows
  .filter((row) => row.best && (!onlyUnusual || row.p <= 0.05))
  .flatMap((row) => row.top.slice(0, top).map((candidate) => ({ row, seed: seeds[summary.rows.indexOf(row)], candidate })));
/** The extended string starts kl steps before the seed's first letter, on the same line and in the same direction. */
const predictedStart = ({ seed, candidate }) => seed.start - seed.dir * seed.skip * candidate.kl;
const writeOut = (text) => { if (args.out) writeFileSync(args.out, text); else console.log(text); };

const command = process.argv[2];
if (command === "sql") {
  const kind = args.kind;
  if (kind === "total") console.log(streamLengthSql());
  else if (kind === "count") console.log(dictionaryCountSql({ minLen: Number(args["min-len"] || 2), maxLen: Number(args["max-len"] || 9), sharesLettersWith: args["shares-with"] || null }));
  else if (kind === "membership") console.log(dictionaryMembershipSql((args.words || "").split(",")));
  else if (kind === "occurrences") console.log(occurrencesSql({ term: termOf() }));
  else if (kind === "windows") console.log(windowedOccurrencesSql({ term: termOf(), skipMin: Number(args["skip-min"]), skipMax: Number(args["skip-max"]), windowSize: Number(args.window || 300) }));
  else if (kind === "crawl" && args.seeds) console.log(crawlSql({ seeds: loadSeeds(), reach: Number(args.reach || 5), shifts: Number(args.shifts || 300), minTotal: Number(args["min-total"] || 4), criterion: args.criterion || "forms" }));
  else if (kind === "sequences") console.log(sequenceScanSql({ width: Number(args.width), totalLetters: Number(args.total), axis: { start: Number(args["axis-start"]), skip: Number(args["axis-skip"]), dir: Number(args["axis-dir"]), length: Number(args["axis-length"]) }, margin: Number(args.margin || 20), shifts: Number(args.shifts || 100), probes: args.probes ? args.probes.split(",") : [], grid: args.grid || "torah" }));
  else if (kind === "anchor") console.log(anchorSql({ term: exampleById(args.example).term, skip: exampleById(args.example).skip }));
  else {
    const state = stateOf();
    const base = { width: state.width, totalRows: state.totalRows, totalLetters: state.totalLetters, region: state.region };
    if (kind === "letters") console.log(regionLettersSql(state.region));
    else if (kind === "probe") console.log(scanBatchSql({ ...base, dictionary: { words: (args.words || "").split(",") }, directions: args.directions || "both" }));
    else if (kind === "crawl") {
      console.log(crawlSql({ seeds: loadSeeds(), reach: Number(args.reach || 5), shifts: Number(args.shifts || 300), minTotal: Number(args["min-total"] || 4), criterion: args.criterion || "forms" }));
    } else if (kind === "verify-extensions") {
      const seeds = loadSeeds();
      const summary = summarizeCrawl({ crawl: unwrap(readJson(args.crawl)), seeds });
      const extensions = topExtensions(summary, seeds, { top: Number(args.top || 1), onlyUnusual: args["only-unusual"] === "true" }).map((entry) => ({ term: entry.candidate.e, skip: entry.seed.skip, dir: entry.seed.dir, start: predictedStart(entry) }));
      console.log(verifyExtensionsSql({ width: state.width, totalRows: state.totalRows, extensions }));
    } else if (kind === "chance") {
      const words = args.batches ? [...new Set(buildCrossingReport({ state, batches: loadBatches(args.batches) }).findingsList.map((finding) => finding.word))] : [];
      let letterCounts = null;
      if (args.letters) { // sensitivity variant: letter frequencies of the display region itself
        const letters = readJson(args.letters);
        letterCounts = regionLetterCounts(letterGridFromRows(Array.isArray(letters) ? letters : letters.result, state.region));
      }
      console.log(expectedCrossingSql({ term: state.term, dictionary: state.dictionary, directionCount: CROSSING_DIRECTION_COUNT[args.directions || "diag"], words, letterCounts }));
    } else if (kind === "rarity") {
      const words = [...new Set(buildCrossingReport({ state, batches: loadBatches(args.batches) }).findingsList.map((finding) => finding.word))];
      const part = Number(args.part || 0);
      const slice = words.slice(part * 50, part * 50 + 50);
      if (!slice.length) throw new Error(`no crossing words in part ${part} (${words.length} words, 50 per part)`);
      console.log(scanBatchSql({ ...base, dictionary: { words: slice }, directions: args.directions || "diag" }));
    } else if (kind === "batch") {
      console.log(scanBatchSql({
        ...base,
        dictionary: { ...state.dictionary, offset: Number(args.offset || 0), limit: Number(args.limit || 100) },
        directions: args.directions || (isCrossing(state) ? "diag" : "both"),
        controls: args.controls === "on",
        crossing: isCrossing(state) ? { positions: state.anchor.positions } : null,
      }));
    } else throw new Error("unknown --kind");
  }
} else if (command === "init") {
  const mode = args.mode || "crossing";
  if (!["crossing", "region"].includes(mode)) throw new Error("--mode must be crossing or region");
  const ex = args.example ? exampleById(args.example) : null;
  const term = termOf();
  const page = unwrap(readJson(args.anchor));
  const all = page.hits;
  let hits = all;
  if (ex?.skip !== undefined) hits = hits.filter((hit) => hit.skip === ex.skip);
  if (ex?.start !== undefined) hits = hits.filter((hit) => hit.start === ex.start);
  if (args["pick-skip"]) hits = hits.filter((hit) => hit.skip === Number(args["pick-skip"]));
  if (args.pick !== undefined) hits = [all[Number(args.pick)]].filter(Boolean);
  if (hits.length !== 1) throw new Error(`the anchor must resolve to exactly one occurrence (found ${hits.length} of ${all.length}); give --pick N or --pick-skip S`);
  const hit = hits[0];
  const totalLetters = Number(args["total-letters"]);
  const dictionaryConfig = mode === "crossing" ? config.crossing.dictionary : config.dictionary;
  const dictionary = { ...dictionaryConfig, ...(args["min-len"] ? { minLen: Number(args["min-len"]) } : {}), ...(mode === "crossing" ? { sharesLettersWith: term } : {}) };
  const dictionaryTotals = readJson(args.dict).map((row) => ({ len: Number(row.len), words: Number(row.words) })).filter((entry) => entry.len >= dictionary.minLen && entry.len <= dictionary.maxLen);
  const base = { example: ex?.id ?? null, term, width: hit.skip, totalLetters, totalRows: fullRows(totalLetters, hit.skip), dictionary, dictionaryTotals };
  let state;
  if (mode === "crossing") {
    const region = regionAroundPositions({ positions: hit.positions, width: hit.skip, totalLetters, margin: dictionary.maxLen - 1 });
    state = { mode, ...base, region, anchor: { start: hit.start, skip: hit.skip, dir: hit.dir, length: page.input.length, positions: hit.positions, occurrenceIndex: all.indexOf(hit), occurrenceCount: all.length }, occurrences: all.map(({ skip, dir, start }) => ({ skip, dir, start })) };
  } else {
    const region = regionAroundAnchor({ anchorStart: hit.start, anchorSkip: hit.skip, anchorDir: hit.dir, anchorLength: page.input.length, width: hit.skip, totalLetters, ...config.region });
    state = { mode, ...base, region, tileGrid: tileGrid(region, totalLetters), anchor: { start: hit.start, skip: hit.skip, dir: hit.dir, length: page.input.length } };
  }
  writeFileSync(args.out, JSON.stringify(state, null, 2));
  console.log(JSON.stringify({ wrote: args.out, mode, term, anchor: state.anchor.occurrenceCount ? { skip: hit.skip, dir: hit.dir, start: hit.start, occurrenceIndex: state.anchor.occurrenceIndex, of: state.anchor.occurrenceCount } : { skip: hit.skip, dir: hit.dir, start: hit.start }, region: state.region }));
} else if (command === "report" || command === "packet" || command === "validate") {
  const state = stateOf();
  if (isCrossing(state)) {
    const chance = loadChance();
    const report = buildCrossingReport({ state, batches: loadBatches(args.batches), rarity: loadRarity(), chance, chanceLocal: loadChanceLocal() });
    if (command === "report") {
      const { findingsList, ...summary } = report;
      writeOut(JSON.stringify({ ...summary, findings: findingsList.map(({ cells, ...rest }) => rest) }, null, 2));
    } else {
      const anchor = { term: state.term, positions: state.anchor.positions, skip: state.anchor.skip };
      if (command === "packet") console.log(buildCrossingPacket({ anchor, region: state.region, findings: report.findingsList, chance: chance ? report.chance : null }).text);
      else console.log(JSON.stringify(validateGrouping(readJson(args.answer), { findings: report.findingsList, extraWords: [state.term] }), null, 2));
    }
  } else {
    const ex = config.examples.find((entry) => entry.id === state.example);
    const report = buildRunReport({ example: state.example, state, batches: loadBatches(args.batches), evaluationWords: command === "report" ? ex?.evaluationWords ?? [] : [], membership: args.membership ? readJson(args.membership).map((row) => row.phrase ?? row) : null, probe: command === "report" && args.probe ? unwrap(readJson(args.probe)) : null, controls: command === "report" && args.controls === "on" });
    if (command === "report") {
      const { findingsList, phrasesList, ...summary } = report;
      writeOut(JSON.stringify({ ...summary, findingsSample: findingsList.slice(0, 40).map(({ cells, ...rest }) => rest) }, null, 2));
    } else {
      const packet = buildGroupingPacket({ topic: state.term, region: state.region, findings: report.findingsList, phrases: report.phrasesList });
      if (command === "packet") console.log(packet.text);
      else console.log(JSON.stringify(validateGrouping(readJson(args.answer), { findings: report.findingsList, phrases: report.phrasesList }), null, 2));
    }
  }
} else if (command === "windows-report") {
  const parts = args.parts.split(",").map((path) => unwrap(readJson(path)));
  writeOut(JSON.stringify(summarizeWindowedSearch({ term: termOf(), skipMin: Number(args["skip-min"]), skipMax: Number(args["skip-max"]), parts }), null, 2));
} else if (command === "sequences-report") {
  writeOut(JSON.stringify(summarizeSequenceScan({ scan: unwrap(readJson(args.scan)) }), null, 2));
} else if (command === "crawl-report") {
  const seeds = loadSeeds();
  const { rows, method, ...summary } = summarizeCrawl({ crawl: unwrap(readJson(args.crawl)), seeds });
  writeOut(JSON.stringify({ ...summary, rows: rows.map(({ top, nullShare, ...row }) => ({ ...row, nullShare })) }, null, 2));
} else if (command === "verify-report") {
  const seeds = loadSeeds();
  const summary = summarizeCrawl({ crawl: unwrap(readJson(args.crawl)), seeds });
  const verify = parseVerifyLines(unwrap(readJson(args.verify)).lines);
  const planned = topExtensions(summary, seeds, { top: Number(args.top || 1), onlyUnusual: args["only-unusual"] === "true" });
  const confirmed = planned.map((entry, index) => {
    const { seed, candidate } = entry;
    const expectedStart = predictedStart(entry);
    const hit = verify.hits.find((item) => item.id === index + 1 && item.term === candidate.e && item.skip === seed.skip && item.dir === seed.dir && item.start === expectedStart);
    return { seed: seed.word, seedId: seed.id, extended: candidate.e, parts: candidate.parts, skip: seed.skip, dir: seed.dir, expectedStart, confirmedByEngine: Boolean(hit), engineTruncated: verify.truncated.includes(index + 1) };
  });
  writeOut(JSON.stringify({ planned: planned.length, confirmed: confirmed.filter((entry) => entry.confirmedByEngine).length, details: confirmed }, null, 2));
} else if (command === "method") {
  console.log(args.mode === "crossing" ? describeChanceModel() : args.mode === "crawl" ? describeCrawlMethod() : args.mode === "sequences" ? describeSequenceMethod() : describeMethod());
} else if (command === "markup") {
  const state = stateOf();
  const letters = readJson(args.letters);
  const grid = letterGridFromRows(Array.isArray(letters) ? letters : letters.result, state.region);
  let markup;
  let verification;
  let htmlOptions = { title: `ניסוי מטריצת ELS — ${state.term}` };
  if (isCrossing(state)) {
    const report = buildCrossingReport({ state, batches: loadBatches(args.batches), rarity: loadRarity() });
    const end = state.anchor.positions[state.anchor.positions.length - 1];
    const anchorFindings = normalizeFindings({ rows: [{ w: state.term, len: [...state.term].length, grp: "cd", skip: state.anchor.skip, dir: state.anchor.dir, s: state.anchor.start, e: end }], width: state.width, region: state.region, idPrefix: "Q" });
    verification = verifyFindingsAgainstLetters({ findings: [...report.findingsList, ...anchorFindings], grid });
    markup = buildMarkup({ findings: report.findingsList, grid, region: state.region, topic: state.term, probeFindings: anchorFindings });
    htmlOptions = { title: `ממצאים החוצים את הצופן ${state.term}`, scanTitle: "ממצאים שחוצים את הצופן (מהסריקה)", probeTitle: "הצופן (עוגן) — מסגרת", note: "הצופן מסומן במסגרת; כל ממצא צבוע חולק איתו אות אחת לפחות (אותו מקום בזרם). קו תחתון = מילה בטקסט רגיל (לא ELS)." };
  } else {
    const report = buildRunReport({ example: state.example, state, batches: loadBatches(args.batches) });
    const probe = args.probe ? unwrap(readJson(args.probe)) : null;
    const probeRows = probe ? probe.target.filter((row) => row.grp === "cd" && row.len >= Number(args["probe-min-len"] || 3)) : [];
    const probeFindings = probe ? normalizeFindings({ rows: probeRows, width: state.width, region: state.region, matrixHits: probe.word_matrix_hits, idPrefix: "Q" }) : [];
    verification = verifyFindingsAgainstLetters({ findings: [...report.findingsList, ...probeFindings], grid });
    markup = buildMarkup({ findings: report.findingsList, phrases: report.phrasesList, grid, region: state.region, topic: state.term, probeFindings });
  }
  if (args["out-json"]) writeFileSync(args["out-json"], JSON.stringify(markup, null, 2));
  if (args["out-html"]) writeFileSync(args["out-html"], renderMarkupHtml(markup, htmlOptions));
  console.log(JSON.stringify({ verification, marks: markup.marks.length, wrote: [args["out-json"], args["out-html"]].filter(Boolean) }, null, 2));
  if (verification.mismatches.length) process.exitCode = 1;
} else {
  console.error("usage: run.mjs sql|init|report|method|packet|validate|markup (see header)");
  process.exit(2);
}
