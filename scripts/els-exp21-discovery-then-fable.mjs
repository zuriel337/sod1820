#!/usr/bin/env node
// EXP-21 — "discovery first, then Fable" (ZURIEL 18.11.2026: approved, the test up to USD 10, seeds of 5+ letters as before; plan in
// docs/reviews/els-discovery-fable-overlap-20261118/README.md). Measures, on the same windows, whether giving the model the words the engine's
// matrix discovery already found (seeds, els_seed_expansion_law) brings new engine-verified findings instead of repeats, and whether
// Claude Fable 5.2 reads the matrix as well as Claude Fable 5.1 (every measurement so far, EXP-15..18, is on 5.1).
//
// Same code as the product wherever it exists:
//   - discovery: the engine's own functions, taken from public/tzofen.html (scanMatrixLexicon, guidedMatrixLanguageInspection, the lexicon loader);
//   - the request: buildReadingRequest of supabase/functions/_shared/elsMatrixReading.js (byte-identical to the product without seeds);
//   - batches, token count, model check, cost and upper bound: the same module (createBatch, countInputTokens, verifyModel, estimateCost, costFromUsage);
//   - verification: locateFinding + verifyOccurrences + classify, with every occurrence replayed in the canonical engine (els_verify_occurrence_v1).
// The Torah letters come from tools/els/data/tk-letters.txt; the script checks their MD5 against public.torah_stream before anything else.
//
//   node scripts/els-exp21-discovery-then-fable.mjs                 dry run: discovery, seeds, windows, prompt hashes. No network, no cost.
//   node scripts/els-exp21-discovery-then-fable.mjs --submit        needs ANTHROPIC_API_KEY: model check, token count (free), budget check, then
//                                                                   one Message Batch per arm. Refuses when the sum of upper bounds exceeds --budget-usd.
//   node scripts/els-exp21-discovery-then-fable.mjs --collect       needs ANTHROPIC_API_KEY: collects the ended batches, verifies in the engine, writes the report.
// Options: --budget-usd 10 (default, the approved amount) · --out <dir> · --arms <id,id,...>
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TORAH_LENGTH, DEFAULTS, selectWindow, makeRegion, buildLines, readings, buildReadingRequest, placeSeeds, INSTRUCTION_NO_STORY, INSTRUCTION_SEEDS_SUFFIX,
  countInputTokens, verifyModel, estimateCost, costFromUsage, createBatch, retrieveBatch, fetchBatchEntry,
  parseModelOutput, locateFinding, verificationItems, verifyOccurrences, classify, replayOccurrence, MIN_SEED_LETTERS, MAX_SEEDS,
} from "../supabase/functions/_shared/elsMatrixReading.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => { const at = args.indexOf(name); return at >= 0 && args[at + 1] ? args[at + 1] : fallback; };
const BUDGET_USD = Number(option("--budget-usd", "10"));
const OUT = resolve(root, option("--out", "docs/reviews/els-discovery-fable-overlap-20261118/exp21"));
const TORAH_STREAM_MD5 = "0066c2431821863d258745e664d3883e";
const CAP = 25; // what the product card sends (ElsMatrixReadingCard2029: cap 25); cap 60 ended at max_tokens in 6 of 18 runs (EXP-16)

// ---------- the ciphers and the arms ----------
const CIPHERS = {
  C1: { name: "יום משיח בא", term: "יוממשיחבא", skip: 583, dir: -1, start: 239480, target: { text: "הארחשכ", start: 232474, step: 584 } },
  C2: { name: "קולומביה", term: "קולומביה", skip: 4545, dir: 1, start: 248765, target: null },
};
const ARMS = [
  { id: "C1-51-plain", cipher: "C1", model: "claude-fable-5-1", seeds: false },
  { id: "C1-51-seeds", cipher: "C1", model: "claude-fable-5-1", seeds: true },
  { id: "C1-52-plain", cipher: "C1", model: "claude-fable-5-2", seeds: false },
  { id: "C1-52-seeds", cipher: "C1", model: "claude-fable-5-2", seeds: true },
  { id: "C2-52-plain", cipher: "C2", model: "claude-fable-5-2", seeds: false },
  { id: "C2-52-seeds", cipher: "C2", model: "claude-fable-5-2", seeds: true },
];
const armFilter = option("--arms", "").split(",").filter(Boolean);
const arms = armFilter.length ? ARMS.filter((arm) => armFilter.includes(arm.id)) : ARMS;

// ---------- the letters ----------
const torah = readFileSync(join(root, "tools/els/data/tk-letters.txt"), "utf8").trim().slice(0, TORAH_LENGTH);
const md5 = createHash("md5").update(torah, "utf8").digest("hex");
if (torah.length !== TORAH_LENGTH || md5 !== TORAH_STREAM_MD5) throw new Error(`Torah letters differ from public.torah_stream (md5 ${md5})`);

// ---------- the engine's discovery, taken from the built engine ----------
async function loadEngineDiscovery() {
  const html = readFileSync(join(root, "public/tzofen.html"), "utf8");
  const grab = (name) => {
    const at = html.search(new RegExp(`(async )?function ${name}\\(`));
    if (at < 0) throw new Error(`engine function ${name} not found`);
    let depth = 0, j = html.indexOf("{", html.indexOf(")", at));
    for (; j < html.length; j++) {
      const ch = html[j];
      if (ch === '"' || ch === "'" || ch === "`") { const q = ch; j++; while (j < html.length && html[j] !== q) { if (html[j] === "\\") j++; j++; } continue; }
      if (ch === "{") depth++; else if (ch === "}") { depth--; if (!depth) break; }
    }
    return html.slice(at, j + 1);
  };
  const names = ["distanceToAnchors", "guidedMatrixBox", "guidedMatrixRays", "guidedMatrixDistance", "guidedLanguageReadings", "guidedLanguageRelations", "guidedLanguageBoundaryScore",
    "guidedLanguageBoundaryHypotheses", "guidedMatrixLanguageInspection", "guidedDynamicLexiconSkeleton", "guidedMatrixDisplayTerm", "guidedMatrixPlausible", "scanMatrixLexicon", "guidedLoadDynamicLexicon"];
  const body = names.map(grab).join("\n");
  const payload = readFileSync(join(root, "public/els-dynamic-lexicon-v1.gz64.txt"), "utf8").trim();
  const prelude = `const T=__T;const scopeN=()=>${TORAH_LENGTH};const hitKey=h=>h.skip+"_"+h.dir+"_"+h.start;const st={raw:"",scope:"torah"};let _guidedDynamicLexiconPromise=null;
    const norm=s=>String(s||"").replace(/[^א-ת]/g,"").replace(/ך/g,"כ").replace(/ם/g,"מ").replace(/ן/g,"נ").replace(/ף/g,"פ").replace(/ץ/g,"צ");
    const guidedDynamicLexiconAsset=async()=>({payload:__payload,asset:{path:"els-dynamic-lexicon-v1.gz64.txt",encodedBytes:__payload.length}});
    const inflate=async b64=>__gunzip(b64);`;
  let extra = "";
  for (let attempt = 0; attempt < 40; attempt++) {
    const factory = new Function("__T", "__payload", "__gunzip", `${prelude}\n${extra}\n${body}\nreturn {setRaw:v=>{st.raw=v;},guidedMatrixBox,guidedMatrixLanguageInspection,scanMatrixLexicon,guidedLoadDynamicLexicon};`);
    const api = factory(torah, payload, (b64) => gunzipSync(Buffer.from(b64, "base64")).toString("utf8"));
    try {
      const lexicon = await api.guidedLoadDynamicLexicon();
      if (!lexicon) throw new Error("the engine refused the lexicon asset");
      const probe = { skip: 583, dir: -1, start: 239480, positions: Array.from({ length: 9 }, (_, k) => 239480 - 583 * k) };
      api.guidedMatrixLanguageInspection(probe, api.guidedMatrixBox(probe), new Map(), lexicon);
      await api.scanMatrixLexicon(probe, api.guidedMatrixBox(probe), lexicon, () => false, () => {}, { minLength: 5 });
      return { ...api, lexicon };
    } catch (error) {
      const missing = String(error?.message || "").match(/^(\w+) is not defined/);
      if (!missing) throw error;
      const name = missing[1], found = new RegExp(`[,\\s]${name}=`).exec(html);
      if (!found) throw new Error(`engine constant ${name} not found`);
      const declaration = html.lastIndexOf("const ", found.index + 1), statement = html.slice(declaration, html.indexOf(";", found.index + 1) + 1);
      if (extra.includes(statement)) throw new Error(`cannot resolve ${name}`);
      extra += `${statement}\n`;
    }
  }
  throw new Error("engine discovery could not be loaded");
}

const positionsOf = ({ start, skip, dir }, length) => Array.from({ length }, (_, k) => start + dir * skip * k);
const hitIdOf = ({ skip, dir, start }) => `${skip}_${dir}_${start}`;

/** Discovery around an axis, exactly as the engine runs it: words mode at minimum lengths 5 and 4, and the expressions/split mode. */
async function discover(engine, cipher) {
  const axis = { skip: cipher.skip, dir: cipher.dir, start: cipher.start, positions: positionsOf(cipher, [...cipher.term].length) };
  engine.setRaw(cipher.term);
  const box = engine.guidedMatrixBox(axis);
  const words5 = await engine.scanMatrixLexicon(axis, box, engine.lexicon, () => false, () => {}, { minLength: 5 });
  const words4 = await engine.scanMatrixLexicon(axis, box, engine.lexicon, () => false, () => {}, { minLength: 4 });
  const language = engine.guidedMatrixLanguageInspection(axis, box, new Map(), engine.lexicon);
  const items = [];
  for (const [mode, out] of [["words5", words5], ["words4", words4]]) for (const item of out?.items ?? []) items.push({ source: mode, term: item.term, start: item.start, skip: item.skip, dir: item.dir, positions: item.positions, distance: item.distance, parts: [] });
  for (const row of language?.segmentations ?? []) {
    const step = Number(row.step), skip = Math.abs(step), dir = step < 0 ? -1 : 1, term = String(row.canonicalLetters);
    items.push({ source: "language", term, start: row.start, skip, dir, positions: positionsOf({ start: row.start, skip, dir }, [...term].length), distance: row.distance, parts: row.tokens.map((token) => String(token.exactLetters).replace(/[ךםןףץ]/g, (c) => ({ ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" })[c])) });
  }
  return { box: { r0: box.r0, r1: box.r1, c0: box.c0, c1: box.c1, cells: box.cells }, items, coverage: { words5: words5?.coverage ?? null, words4: words4?.coverage ?? null, language: language?.coverage ?? null } };
}

/**
 * Seeds: ELS only (skip 2 or more: a row of the matrix is the plain Torah text, which the model reads anyway), at least MIN_SEED_LETTERS letters,
 * never a piece of the axis itself; longest first, then closest to the axis; a seed inside an already chosen one is skipped.
 */
function chooseSeeds(items, axisPositions) {
  const axisCells = new Set(axisPositions);
  const sorted = items.filter((item) => [...item.term].length >= MIN_SEED_LETTERS && item.skip >= 2 && !item.positions.every((p) => axisCells.has(p)))
    .sort((a, b) => [...b.term].length - [...a.term].length || a.distance - b.distance || a.start - b.start);
  const chosen = [];
  for (const item of sorted) {
    const cells = new Set(item.positions);
    if (chosen.some((seed) => item.positions.every((p) => seed.cellSet.has(p)))) continue;
    chosen.push({ ...item, cellSet: cells });
  }
  return chosen.map(({ cellSet, ...seed }) => seed);
}

// ---------- the window, exactly as the product builds it ----------
function windowFor(cipher) {
  const axis = { term: cipher.term, skip: cipher.skip, dir: cipher.dir, start: cipher.start };
  const window = selectWindow({ axis, rows: DEFAULTS.rows, cols: DEFAULTS.cols });
  const rows = Array.from({ length: window.rows }, (_, k) => torah.slice((window.r0 + k) * window.width + window.c0, (window.r0 + k) * window.width + window.c1 + 1));
  const region = makeRegion({ width: window.width, r0: window.r0, c0: window.c0, rows, axis: { start: cipher.start, skip: cipher.skip, dir: cipher.dir, length: [...cipher.term].length, text: cipher.term } });
  const lines = buildLines(region);
  return { window, region, lines };
}

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const key = () => { const value = process.env.ANTHROPIC_API_KEY || ""; if (!value) throw new Error("ANTHROPIC_API_KEY is not set: --submit and --collect need it (the dry run does not)"); return value; };
const ANON = (() => { const text = readFileSync(join(root, "src/lib/supabase.js"), "utf8"); return { url: text.match(/SUPABASE_URL = '([^']+)'/)[1], key: text.match(/SUPABASE_ANON = '([^']+)'/)[1] }; })();
const restHeaders = (extraHeaders = {}) => ({ apikey: ANON.key, Authorization: `Bearer ${ANON.key}`, ...extraHeaders });
const replay = (item) => replayOccurrence(item, { fetchImpl: fetch, supabaseUrl: ANON.url, restHeaders });

async function prepare() {
  const engine = await loadEngineDiscovery();
  const prepared = {};
  for (const [id, cipher] of Object.entries(CIPHERS)) {
    if (!arms.some((arm) => arm.cipher === id)) continue;
    const found = await discover(engine, cipher);
    const view = windowFor(cipher);
    const seeds = placeSeeds(view.region, view.lines, chooseSeeds(found.items, positionsOf(cipher, [...cipher.term].length)));
    prepared[id] = { cipher, discovery: found, view, seeds };
  }
  const requests = arms.map((arm) => {
    const p = prepared[arm.cipher];
    const { request, prompt } = buildReadingRequest({ model: arm.model, region: p.view.region, lines: p.view.lines, cap: CAP, seeds: arm.seeds ? p.seeds.map((seed) => ({ term: seed.text, ...seedPosition(p, seed), parts: seed.parts })) : [] });
    return { arm, request, prompt, instruction: INSTRUCTION_NO_STORY + (prompt.seeds.length ? INSTRUCTION_SEEDS_SUFFIX : ""), request_sha256: sha256(JSON.stringify(request)) };
  });
  return { prepared, requests };
}

/** The stream position, skip and direction of a placed seed (from its reading), to hand back to buildReadingRequest unchanged. */
function seedPosition(p, seed) {
  const reading = readings(p.view.lines).get(seed.line);
  const from = reading.letters.indexOf(seed.text);
  const cells = reading.cells.slice(from, from + [...seed.text].length);
  const positions = cells.map(([i, j]) => p.view.region.position(i, j));
  const step = positions.length > 1 ? positions[1] - positions[0] : 1;
  return { start: positions[0], skip: Math.abs(step), dir: step < 0 ? -1 : 1 };
}

const summaryOfPreparation = ({ prepared, requests }) => ({
  experiment: "EXP-21", approved_budget_usd: BUDGET_USD, cap: CAP, effort: DEFAULTS.effort, max_tokens: DEFAULTS.maxTokens, torah_md5: md5,
  ciphers: Object.fromEntries(Object.entries(prepared).map(([id, p]) => [id, {
    name: p.cipher.name, axis: hitIdOf(p.cipher), window: { r0: p.view.window.r0, r1: p.view.window.r1, c0: p.view.window.c0, c1: p.view.window.c1, rows: p.view.window.rows, cols: p.view.window.cols },
    discovery: { box: p.discovery.box, items: p.discovery.items.length, by_source: countBy(p.discovery.items, (item) => item.source), coverage: p.discovery.coverage },
    seeds: p.seeds,
  }])),
  arms: requests.map((r) => ({ id: r.arm.id, model: r.arm.model, cipher: r.arm.cipher, seeds: r.prompt.seeds.length, instruction: r.instruction, request_sha256: r.request_sha256, prompt_chars: r.prompt.user.length })),
});
const countBy = (list, keyOf) => list.reduce((acc, item) => { const k = keyOf(item); acc[k] = (acc[k] || 0) + 1; return acc; }, {});

// ---------- submit ----------
async function submit(prep) {
  const apiKey = key();
  const state = { experiment: "EXP-21", created_at: new Date().toISOString(), budget_usd: BUDGET_USD, arms: [] };
  for (const model of [...new Set(prep.requests.map((r) => r.arm.model))]) {
    const check = await verifyModel({ fetchImpl: fetch, key: apiKey, model, effort: DEFAULTS.effort, maxTokens: DEFAULTS.maxTokens });
    if (!check.ok) throw new Error(`model check failed for ${model}: ${JSON.stringify(check.checks)}`);
  }
  let totalUpper = 0;
  for (const r of prep.requests) {
    r.input_tokens = await countInputTokens({ fetchImpl: fetch, key: apiKey, request: r.request });
    r.estimate = estimateCost({ model: r.arm.model, inputTokens: r.input_tokens, maxTokens: DEFAULTS.maxTokens, cap: CAP });
    if (!Number.isFinite(r.estimate.upper_bound_usd)) throw new Error(`no price recorded for ${r.arm.model}`);
    totalUpper += r.estimate.upper_bound_usd;
  }
  console.log(`upper bound of all arms: $${totalUpper.toFixed(2)} (approved $${BUDGET_USD})`);
  if (totalUpper > BUDGET_USD) throw new Error(`refused: the upper bound $${totalUpper.toFixed(2)} exceeds the approved $${BUDGET_USD}; nothing was sent`);
  for (const r of prep.requests) {
    const batch = await createBatch({ fetchImpl: fetch, key: apiKey, request: r.request });
    state.arms.push({ id: r.arm.id, model: r.arm.model, cipher: r.arm.cipher, batch_id: batch.id, request_sha256: r.request_sha256, input_tokens: r.input_tokens, upper_bound_usd: r.estimate.upper_bound_usd, expected_usd: r.estimate.expected_usd });
    console.log(`${r.arm.id}: batch ${batch.id} (upper bound $${r.estimate.upper_bound_usd})`);
  }
  state.upper_bound_total_usd = Number(totalUpper.toFixed(4));
  writeFileSync(join(OUT, "state.json"), JSON.stringify(state, null, 1));
}

// ---------- collect, verify, report ----------
async function collect(prep) {
  const apiKey = key();
  const state = JSON.parse(readFileSync(join(OUT, "state.json"), "utf8"));
  const results = [];
  for (const entryState of state.arms) {
    const r = prep.requests.find((x) => x.arm.id === entryState.id);
    if (!r || r.request_sha256 !== entryState.request_sha256) throw new Error(`${entryState.id}: the request changed since it was sent; refusing to mix`);
    const batch = await retrieveBatch({ fetchImpl: fetch, key: apiKey, batchId: entryState.batch_id });
    if (batch.processing_status !== "ended") { results.push({ id: entryState.id, state: "RUNNING", processing_status: batch.processing_status }); continue; }
    const entry = await fetchBatchEntry({ fetchImpl: fetch, key: apiKey, batch });
    results.push(await evaluate(prep, r, entry));
  }
  const report = { experiment: "EXP-21", collected_at: new Date().toISOString(), preparation: summaryOfPreparation(prep), results, cost_total_usd: Number(results.reduce((sum, x) => sum + (x.cost?.usd ?? 0), 0).toFixed(4)) };
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 1));
  writeFileSync(join(OUT, "report.md"), renderReport(report));
  console.log(renderReport(report));
}

async function evaluate(prep, r, entry) {
  const p = prep.prepared[r.arm.cipher];
  const out = { id: r.arm.id, model: r.arm.model, cipher: r.arm.cipher, seeds_given: r.prompt.seeds.length, result_type: entry?.result?.type ?? null };
  if (entry?.result?.type !== "succeeded") return { ...out, state: "FAILED", error: entry?.result?.error ?? null };
  const message = entry.result.message;
  out.stop_reason = message.stop_reason;
  out.usage = message.usage;
  out.cost = costFromUsage(r.arm.model, message.usage, { batch: true });
  if (message.stop_reason === "refusal") return { ...out, state: "REFUSED", stop_details: message.stop_details ?? null };
  const text = (message.content || []).filter((block) => block.type === "text").map((block) => block.text).join("");
  const parsed = parseModelOutput(text);
  if (!parsed.ok) return { ...out, state: message.stop_reason === "max_tokens" ? "INCOMPLETE" : "UNPARSEABLE", error: parsed.error };
  const byReading = readings(p.view.lines);
  const located = parsed.value.findings.map((finding) => locateFinding(finding, { region: p.view.region, byReading }));
  const rows = await verifyOccurrences(verificationItems(located), { region: p.view.region, replay });
  const classified = classify(located, rows);
  const verified = classified.filter((f) => f.verdict === "verified_by_engine");
  const cellsOf = (f) => { const k = f.checks.findIndex((c) => c.letters_match && c.engine_found); return k < 0 ? [] : positionsOf(f.occurrences[k].params, f.text.length); };
  const discoveryKeys = new Set(p.discovery.items.map((item) => item.positions.join(",")));
  const seedKeys = new Set(p.seeds.map((seed) => { const pos = seedPosition(p, seed); return positionsOf(pos, [...seed.text].length).join(","); }));
  const sameCells = (positions, keys) => keys.has(positions.join(",")) || keys.has(positions.slice().reverse().join(","));
  const target = p.cipher.target ? positionsOf({ start: p.cipher.target.start, skip: p.cipher.target.step, dir: 1 }, p.cipher.target.text.length) : null;
  return {
    ...out, state: message.stop_reason === "max_tokens" ? "INCOMPLETE" : "COMPLETE",
    proposals: parsed.value.findings.length,
    verdicts: countBy(classified, (f) => f.verdict),
    verified_texts: verified.map((f) => f.text),
    repeats_of_seeds: verified.filter((f) => sameCells(cellsOf(f), seedKeys)).map((f) => f.text),
    already_in_discovery: verified.filter((f) => sameCells(cellsOf(f), discoveryKeys)).map((f) => f.text),
    new_vs_discovery: verified.filter((f) => !sameCells(cellsOf(f), discoveryKeys)).map((f) => f.text),
    continued_from_seeds: parsed.value.findings.filter((f) => /^S\d+$/.test(String(f.from_finding || ""))).length,
    // The target counts when a verified proposal covers all of it, or is a 3+ letter piece of it (האר, חשכ).
    target_found: target ? verified.some((f) => { const own = cellsOf(f); if (!own.length) return false; const cells = new Set(own); return target.every((pos) => cells.has(pos)) || (own.length >= 3 && own.every((pos) => target.includes(pos))); }) : null,
    observations: parsed.value.observations ?? "",
  };
}

function renderReport(report) {
  const lines = [`# EXP-21 — discovery first, then Fable: results`, "", `Collected ${report.collected_at}. Total cost (estimated from usage at list prices, batch 50%): $${report.cost_total_usd}. Approved: $${report.preparation.approved_budget_usd}.`, "",
    "| Arm | Model | Seeds | State | Proposals | Verified by engine | Repeats of seeds | New vs discovery | Continued from seeds | Target (האר חשך) | Output tokens | Cost $ |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|"];
  for (const r of report.results) lines.push(`| ${r.id} | ${r.model} | ${r.seeds_given ?? "-"} | ${r.state} | ${r.proposals ?? "-"} | ${r.verdicts?.verified_by_engine ?? 0} | ${r.repeats_of_seeds?.length ?? "-"} | ${r.new_vs_discovery?.length ?? "-"} | ${r.continued_from_seeds ?? "-"} | ${r.target_found === null || r.target_found === undefined ? "-" : r.target_found ? "yes" : "no"} | ${r.usage?.output_tokens ?? "-"} | ${r.cost?.usd ?? "-"} |`);
  lines.push("", "Verified means: the letters are at the claimed cells of the canonical stream and els_verify_occurrence_v1 answered MATCH. It says nothing about meaning; random windows give signals of the same kind (EXP-16).");
  return lines.join("\n");
}

// ---------- main ----------
mkdirSync(OUT, { recursive: true });
const prep = await prepare();
const summary = summaryOfPreparation(prep);
writeFileSync(join(OUT, "preparation.json"), JSON.stringify(summary, null, 1));
if (flag("--submit")) await submit(prep);
else if (flag("--collect")) { if (!existsSync(join(OUT, "state.json"))) throw new Error("no state.json: run --submit first"); await collect(prep); }
else {
  for (const [id, c] of Object.entries(summary.ciphers)) {
    console.log(`${id} ${c.name} · axis ${c.axis} · window rows ${c.window.r0}-${c.window.r1} cols ${c.window.c0}-${c.window.c1} · discovery ${c.discovery.items} (${JSON.stringify(c.discovery.by_source)})`);
    for (const seed of c.seeds) console.log(`   ${seed.id} ${seed.line} ${seed.text}${seed.parts.length ? ` (${seed.parts.join(" · ")})` : ""}`);
  }
  for (const arm of summary.arms) console.log(`${arm.id}: ${arm.model}, ${arm.seeds} seeds, ${arm.instruction}, prompt ${arm.prompt_chars} chars, sha256 ${arm.request_sha256.slice(0, 12)}`);
  console.log(`dry run only: nothing was sent. Seeds per arm: ${MIN_SEED_LETTERS}+ letters, at most ${MAX_SEEDS}.`);
}
