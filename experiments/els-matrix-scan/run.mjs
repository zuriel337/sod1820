#!/usr/bin/env node
// CLI of the ELS matrix-scan experiment. It never connects to a database: it BUILDS the read-only SQL (to be executed by whoever holds
// access) and ANALYSES the JSON the engine returned. Commands:
//   sql   --kind anchor|total|count|letters|batch  [--example id] [--state s.json] [--offset N --limit N --directions cd|row|both] [--controls on]
//   init  --example id --anchor anchor.json --total-letters N --dict counts.json --out state.json
//   report --state s.json --batches DIR [--membership present.json] [--controls on] [--out report.json]
//        (--controls on = the SEPARATE comparison to other regions; needs batches run with `sql --kind batch --controls on`)
//   method                                        (prints the exact calculation method of the comparison)
//   sql --kind membership --words a,b,c          (evaluation only: which words exist in the dictionary)
//   packet --state s.json --batches DIR            (grouping packet for a model; evaluation words are NOT included)
//   validate --state s.json --batches DIR --answer answer.json
//   markup --state s.json --batches DIR --letters letters.json [--out-json marks.json] [--out-html matrix.html]
//        (letters.json = rows of `sql --kind letters`; checks that every finding's cells spell its word, then writes the marks)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fullRows, regionAroundAnchor, tileGrid } from "./lib/geometry.mjs";
import { anchorSql, dictionaryCountSql, dictionaryMembershipSql, regionLettersSql, scanBatchSql, streamLengthSql } from "./lib/queries.mjs";
import { buildRunReport } from "./lib/report.mjs";
import { describeMethod } from "./lib/controls.mjs";
import { buildGroupingPacket, validateGrouping } from "./lib/grouping.mjs";
import { buildMarkup, letterGridFromRows, renderMarkupHtml, verifyFindingsAgainstLetters } from "./lib/markup.mjs";

const args = Object.fromEntries(process.argv.slice(3).map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "true" : all[i + 1]] : null)).filter(Boolean));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const config = readJson(new URL("./examples.json", import.meta.url));
const example = () => config.examples.find((entry) => entry.id === args.example) || (() => { throw new Error(`unknown --example ${args.example}`); })();
const unwrap = (value) => { const first = Array.isArray(value) ? value[0] : value; return first?.result ?? first?.batch ?? first; };
const loadBatches = (dir) => readdirSync(dir).filter((name) => name.endsWith(".json")).sort().map((name) => readJson(join(dir, name))).map((entry) => ({ ...entry, result: unwrap(entry.result) }));

const command = process.argv[2];
if (command === "sql") {
  const kind = args.kind;
  if (kind === "total") console.log(streamLengthSql());
  else if (kind === "count") console.log(dictionaryCountSql(config.dictionary));
  else if (kind === "membership") console.log(dictionaryMembershipSql((args.words || "").split(",")));
  else if (kind === "anchor") console.log(anchorSql({ term: example().term, skip: example().skip }));
  else {
    const state = readJson(args.state);
    if (kind === "letters") console.log(regionLettersSql(state.region));
    else if (kind === "batch") console.log(scanBatchSql({ width: state.width, totalRows: state.totalRows, totalLetters: state.totalLetters, region: state.region, dictionary: { ...state.dictionary, offset: Number(args.offset || 0), limit: Number(args.limit || 100) }, directions: args.directions || "both", controls: args.controls === "on" }));
    else throw new Error("unknown --kind");
  }
} else if (command === "init") {
  const ex = example();
  const anchor = unwrap(readJson(args.anchor));
  const hits = anchor.hits.filter((hit) => ex.start === undefined || hit.start === ex.start);
  if (hits.length !== 1) throw new Error(`anchor must resolve to exactly one occurrence (found ${hits.length}); give "start" in examples.json`);
  const hit = hits[0];
  const totalLetters = Number(args["total-letters"]);
  const region = regionAroundAnchor({ anchorStart: hit.start, anchorSkip: hit.skip, anchorDir: hit.dir, anchorLength: anchor.input.length, width: hit.skip, totalLetters, ...config.region });
  const dictionaryTotals = readJson(args.dict).map((row) => ({ len: Number(row.len), words: Number(row.words) }));
  const state = { example: ex.id, term: ex.term, width: hit.skip, totalLetters, totalRows: fullRows(totalLetters, hit.skip), region, tileGrid: tileGrid(region, totalLetters), anchor: { start: hit.start, skip: hit.skip, dir: hit.dir, length: anchor.input.length }, dictionary: { ...config.dictionary, ...(args["min-len"] ? { minLen: Number(args["min-len"]) } : {}) }, dictionaryTotals: dictionaryTotals.filter((entry) => entry.len >= Number(args["min-len"] || config.dictionary.minLen)) };
  writeFileSync(args.out, JSON.stringify(state, null, 2));
  console.log(JSON.stringify({ wrote: args.out, region, tileGrid: state.tileGrid }));
} else if (command === "report" || command === "packet" || command === "validate") {
  const state = readJson(args.state);
  const ex = config.examples.find((entry) => entry.id === state.example);
  const report = buildRunReport({ example: state.example, state, batches: loadBatches(args.batches), evaluationWords: command === "report" ? ex.evaluationWords : [], membership: args.membership ? readJson(args.membership).map((row) => row.phrase ?? row) : null, controls: command === "report" && args.controls === "on" });
  if (command === "report") {
    const { findingsList, phrasesList, ...summary } = report;
    const out = JSON.stringify({ ...summary, findingsSample: findingsList.slice(0, 40).map(({ cells, ...rest }) => rest) }, null, 2);
    if (args.out) writeFileSync(args.out, out); else console.log(out);
  } else {
    const packet = buildGroupingPacket({ topic: state.term, region: state.region, findings: report.findingsList, phrases: report.phrasesList });
    if (command === "packet") console.log(packet.text);
    else console.log(JSON.stringify(validateGrouping(readJson(args.answer), { findings: report.findingsList, phrases: report.phrasesList }), null, 2));
  }
} else if (command === "method") {
  console.log(describeMethod());
} else if (command === "markup") {
  const state = readJson(args.state);
  const report = buildRunReport({ example: state.example, state, batches: loadBatches(args.batches) });
  const letters = readJson(args.letters);
  const grid = letterGridFromRows(Array.isArray(letters) ? letters : letters.result, state.region);
  const verification = verifyFindingsAgainstLetters({ findings: report.findingsList, grid });
  const markup = buildMarkup({ findings: report.findingsList, phrases: report.phrasesList, grid, region: state.region, topic: state.term });
  if (args["out-json"]) writeFileSync(args["out-json"], JSON.stringify(markup, null, 2));
  if (args["out-html"]) writeFileSync(args["out-html"], renderMarkupHtml(markup, { title: `ניסוי מטריצת ELS — ${state.term}` }));
  console.log(JSON.stringify({ verification, marks: markup.marks.length, wrote: [args["out-json"], args["out-html"]].filter(Boolean) }, null, 2));
  if (verification.mismatches.length) process.exitCode = 1;
} else {
  console.error("usage: run.mjs sql|init|report|method|packet|validate|markup (see header)");
  process.exit(2);
}
