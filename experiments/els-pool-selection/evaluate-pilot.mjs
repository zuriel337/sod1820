#!/usr/bin/env node
// Evaluates the saved runs of the EXP-12 pilot (after they were saved): metrics per run, per arm, the known words in the diagnostic arm, the free-proposal arm against the saved words, controls,
// stability. Reads the evaluation data files; the library and the prompts never do. Writes results/pilot-results.json and controls/summary.md.
//   node experiments/els-pool-selection/evaluate-pilot.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RUNS } from "./lib/plan.mjs";
import { poolFile } from "./lib/prepare.mjs";
import { fold } from "./lib/lexicon.mjs";
import { knownPairMetrics, mean, median, pairRanks, runMetrics, stability } from "./lib/results.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const runDir = (id) => here(`./controls/runs/${id}/`);

export function freeArmMetrics({ run, dir, saved, located }) {
  const response = existsSync(`${dir}round1-response.json`) ? readJson(`${dir}round1-response.json`) : null;
  const classified = existsSync(`${dir}classified-round1.json`) ? readJson(`${dir}classified-round1.json`) : null;
  const usage = response?.summary?.usage ?? {};
  const row = { id: run.id, arm: run.arm, series: run.series, model: run.model, stop_reason: response?.summary?.stop_reason ?? null, usd: response?.cost?.usd ?? null, input_tokens: usage.input_tokens ?? null, output_tokens: usage.output_tokens ?? null, thinking_tokens: usage.output_tokens_details?.thinking_tokens ?? null, seconds: response?.ms ? Math.round(response.ms / 1000) : null, usable: Boolean(classified) };
  if (!classified) return row;
  const words = saved.findings.map((f) => fold(f.t));
  const savedOccurrences = located.words.flatMap((w) => w.occurrences.map((o) => ({ text: w.text, start: o.start, skip: o.skip, dir: o.dir })));
  const verified = classified.filter((f) => f.verdict !== "not_verified");
  const hits = classified.filter((f) => words.includes(f.text)).map((f) => ({ id: f.id, text: f.text, verdict: f.verdict, same_occurrence_as_saved: f.occurrences.some((o) => savedOccurrences.some((s) => s.text === f.text && s.start === o.params.start && s.skip === o.params.skip && s.dir === o.params.dir)) }));
  return { ...row, proposals: classified.length, verified: verified.length, verified_by_engine: classified.filter((f) => f.verdict === "verified_by_engine").length, verified_plain_text_only: classified.filter((f) => f.verdict === "verified_plain_text_only").length, not_verified: classified.filter((f) => f.verdict === "not_verified").length, saved_words_proposed: hits, texts_verified_by_engine: classified.filter((f) => f.verdict === "verified_by_engine").map((f) => f.text) };
}

export function evaluateAll() {
  const saved = readJson(here("./evaluation/saved-cipher-u1.json"));
  const located = readJson(here("./evaluation/locate-saved-result.json"));
  const forced = readJson(here("./evaluation/d1-forced-ids.json")).forced;
  const pairWords = [fold(saved.findings[0].t), fold(saved.findings[1].t), fold(saved.findings[2].t)];
  const rows = [], free = [], known = {};
  for (const run of RUNS) {
    const dir = runDir(run.id);
    if (!existsSync(dir)) continue;
    if (run.arm === "F") { free.push(freeArmMetrics({ run, dir, saved, located })); continue; }
    const poolId = run.arm === "B3" ? run.tile : { B1: "real", B2: "real", D1: "real-d1", D2: "real" }[run.arm];
    const pool = poolFile(poolId);
    const response = existsSync(`${dir}round1-response.json`) ? readJson(`${dir}round1-response.json`) : null;
    const evaluation = existsSync(`${dir}evaluation-round1.json`) ? readJson(`${dir}evaluation-round1.json`) : null;
    if (!response && !existsSync(`${dir}state-round1.json`)) continue;
    const row = runMetrics({ run, pool, response, evaluation });
    if (row.usable) row.pair_ranks = pairRanks(pool, row);
    rows.push(row);
    if (run.arm === "D1") known[run.id] = knownPairMetrics({ pool, evaluation, forced, pair: pairWords });
  }
  const arms = {};
  for (const r of rows) { const key = `${r.arm}/${r.model}`; (arms[key] ??= []).push(r); }
  const armSummary = Object.fromEntries(Object.entries(arms).map(([key, list]) => [key, { runs: list.length, usable: list.filter((r) => r.usable).length, usd: Number(list.reduce((a, r) => a + (r.usd ?? 0), 0).toFixed(4)), groups_mean: mean(list.filter((r) => r.usable).map((r) => r.groups)), connected_any_mean: mean(list.filter((r) => r.usable).map((r) => r.connected_any_mean)), groups_with_pp_pair_mean: mean(list.filter((r) => r.usable).map((r) => r.groups_with_pp_pair)), groups_with_tight_pair_mean: mean(list.filter((r) => r.usable).map((r) => r.groups_with_tight_pair)), errors_total_mean: mean(list.filter((r) => r.usable).map((r) => r.errors_total)), stability_jaccard: stability(list) }]));
  const ledger = readJson(here("./controls/budget-ledger.json"));
  const spent = Number(ledger.entries.reduce((a, e) => a + (e.usd ?? 0), 0).toFixed(5));
  return { evaluated_at: new Date().toISOString(), runs: rows, free_proposals: free, known_pair_in_diagnostic_arm: known, arms: armSummary, spend: { total_usd: spent, pilot_usd: Number((spent - 28.72293).toFixed(5)), remaining_of_cap_usd: Number((40 - spent).toFixed(5)) } };
}

const fmt = (x) => (x === null || x === undefined ? "—" : typeof x === "number" ? String(x) : x);
export function summaryMarkdown(result) {
  const L = [];
  L.push("# EXP-12 pilot — results (descriptive; no test statistic is claimed)", "");
  L.push(`Spend: pilot USD ${result.spend.pilot_usd} (cap 8); total USD ${result.spend.total_usd} of 40; remaining USD ${result.spend.remaining_of_cap_usd}. Blind and diagnostic arms are reported apart and never pooled.`, "");
  const table = (title, list) => {
    L.push(`## ${title}`, "", "| run | model | stop | usd | s | out tok | groups | sizes | connected (any) | claimed relation | names relation | PP groups | tight groups | E>=1 share | errors (other than digits) | phrases ok/all | continuations ok/all |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const r of list) L.push(r.usable ? `| ${r.id} | ${r.model} | ${r.stop_reason} | ${fmt(r.usd)} | ${fmt(r.seconds)} | ${fmt(r.output_tokens)} | ${r.groups} | ${r.group_sizes.join(",")} | ${fmt(r.connected_any_mean)} | ${r.groups_with_claimed_relation} | ${r.groups_names_relation} | ${r.groups_with_pp_pair} | ${r.groups_with_tight_pair} | ${fmt(r.members_E_ge_1_share)} | ${r.errors_total} (${r.errors_other_than_digits}) | ${r.phrases_confirmed}/${r.phrases} | ${r.continuations_confirmed}/${r.continuations} |` : `| ${r.id} | ${r.model} | ${fmt(r.stop_reason)} | ${fmt(r.usd)} | ${fmt(r.seconds)} | ${fmt(r.output_tokens)} | no usable answer: ${r.failure ?? ""} |  |  |  |  |  |  |  |  |  |  |`);
    L.push("");
  };
  table("Blind arms on the real region (B1 unnamed axis, B2 named axis)", result.runs.filter((r) => r.series === "blind" && (r.arm === "B1" || r.arm === "B2")));
  table("Blind arm on control tiles (B3)", result.runs.filter((r) => r.arm === "B3"));
  table("DIAGNOSTIC arms (D1 pool-forced, D2 structure hint) — never counted as blind success", result.runs.filter((r) => r.series === "diagnostic"));
  L.push("## Free proposals (arm F: window letters, no list; every proposal verified by the engine)", "", "| run | model | stop | usd | proposals | verified | by engine | plain text only | not verified | saved words proposed |", "|---|---|---|---|---|---|---|---|---|---|");
  for (const f of result.free_proposals) L.push(`| ${f.id} | ${f.model} | ${fmt(f.stop_reason)} | ${fmt(f.usd)} | ${fmt(f.proposals)} | ${fmt(f.verified)} | ${fmt(f.verified_by_engine)} | ${fmt(f.verified_plain_text_only)} | ${fmt(f.not_verified)} | ${(f.saved_words_proposed ?? []).map((h) => `${h.text} (${h.verdict}${h.same_occurrence_as_saved ? ", same occurrence" : ""})`).join("; ") || "none"} |`);
  L.push("", "## Known words in the diagnostic pool (D1)", "");
  for (const [id, k] of Object.entries(result.known_pair_in_diagnostic_arm)) {
    L.push(`### ${id}`, "");
    if (!k) { L.push("no usable answer", ""); continue; }
    L.push(`* groups holding both words: ${k.groups_with_both_words.length}; all three words: ${k.groups_with_all_three.length}; any added item: ${k.groups_with_any_added_item.length}`);
    for (const g of k.groups_with_any_added_item) L.push(`  * group #${g.order} (${g.kind}) ${g.ids.join(" ")} — relation named in the reason: ${g.names_relation ? "yes" : "no"} — "${g.why}"`);
    for (const s of k.singles_with_added_item) L.push(`  * single #${s.order} ${s.id} — "${s.why}"`);
    for (const p of k.phrases_with_both) L.push(`  * phrase #${p.order} ${p.ids.join(" ")} (${p.status}) — "${p.why}"`);
    for (const c of k.continuations_of_added_item) L.push(`  * continuation #${c.order} of ${c.id}: before "${c.before}" after "${c.after}" (${c.status})`);
    L.push("");
  }
  L.push("## Arms (means over usable runs)", "", "```json", JSON.stringify(result.arms, null, 1), "```", "");
  return L.join("\n");
}

/** The model's original proposals, run by run, with the engine/validator verdicts next to them (nothing removed). Items are shown as id:word(family,direction). */
export function proposalsMarkdown() {
  const L = ["# EXP-12 pilot — the original proposals (as saved, with verdicts)", "", "Every proposal is shown exactly as the model gave it; the verdict is appended. Findings in the pools were engine-confirmed before the model saw them; phrases and continuations proposed by a model were confirmed (or not) by the engine afterwards. Validation errors are listed, never repaired.", ""];
  for (const run of RUNS) {
    const dir = runDir(run.id);
    if (!existsSync(dir)) continue;
    L.push(`## ${run.id} — ${run.series}${run.series === "diagnostic" ? " (DIAGNOSTIC)" : ""} — ${run.model} — ${run.arm === "F" ? "free proposals (EXP-16 case-U1 window)" : `pool ${run.arm === "B3" ? run.tile : { B1: "real", B2: "real", D1: "real-d1", D2: "real" }[run.arm]}`}`, "");
    if (run.arm === "F") {
      const c = existsSync(`${dir}classified-round1.json`) ? readJson(`${dir}classified-round1.json`) : [];
      const raw = existsSync(`${dir}round1-response.json`) ? JSON.parse(readJson(`${dir}round1-response.json`).summary.text) : { findings: [] };
      L.push(`${c.length} proposals; verdicts below (verified_by_engine = an ELS occurrence confirmed by the engine; verified_plain_text_only = a run of the plain text row).`, "");
      for (const f of c) L.push(`* ${f.id} \`${f.text}\` on line ${f.line} — **${f.verdict}**${f.status !== "located_in_cited_line" ? ` (${f.status})` : ""} — ${String(raw.findings[Number(f.id.split(".f")[1]) - 1]?.note ?? "").slice(0, 200)}`);
      L.push("");
      continue;
    }
    const ev = existsSync(`${dir}evaluation-round1.json`) ? readJson(`${dir}evaluation-round1.json`) : null;
    if (!ev?.ok) { L.push("no usable answer", ""); continue; }
    const poolId = run.arm === "B3" ? run.tile : { B1: "real", B2: "real", D1: "real-d1", D2: "real" }[run.arm];
    const byId = new Map(poolFile(poolId).items.map((i) => [i.id, i]));
    const show = (id) => { const i = byId.get(id); return i ? `${id}:${i.text}(${i.family}${i.dir > 0 ? "+" : "-"})` : `${id}:?`; };
    for (const g of ev.groups) L.push(`* group ${g.order} [${g.kind}] ${g.ids.map(show).join(" ")} — relations ${g.relation_ids.join(",") || "none"} (accepted: ${g.claimed_ok.join(",") || "none"}) — ${g.why}`);
    for (const x of ev.singles) L.push(`* single ${x.order} ${show(x.id)} — ${x.why}`);
    for (const p of ev.phrases) L.push(`* phrase ${p.order} ${p.ids.map(show).join(" + ")} — ${p.status} — ${p.why}`);
    for (const x of ev.continuations) L.push(`* continuation ${x.order} of ${show(x.id)}: before "${x.before_letters}" after "${x.after_letters}" — ${x.status} — ${x.why}`);
    L.push(`* chance note: ${ev.answer.chance_note}`);
    if (ev.errors.length) { const by = {}; for (const e of ev.errors) (by[e.code] ??= []).push(`${e.where}${e.detail ? `: ${String(e.detail).slice(0, 80)}` : ""}`); L.push(`* validation errors (${ev.errors.length}): ${Object.entries(by).map(([k, v]) => `${k} ×${v.length}`).join(", ")}`); for (const [k, v] of Object.entries(by)) if (k !== "digits_in_text") for (const d of v.slice(0, 6)) L.push(`  * ${k} — ${d}`); }
    L.push("");
  }
  return L.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(here("./results/proposals.md"), proposalsMarkdown());
  const result = evaluateAll();
  writeFileSync(here("./results/pilot-results.json"), `${JSON.stringify(result, null, 1)}\n`);
  writeFileSync(here("./controls/summary.md"), summaryMarkdown(result));
  process.stdout.write(summaryMarkdown(result));
}
export { median };
