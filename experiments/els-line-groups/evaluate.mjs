#!/usr/bin/env node
// EXP-23 evaluation. Run ONLY after all answers are saved. This is the first and only place that reads the saved cipher (the six findings saved on the site): never in an instruction,
// a schema, the plan, the group rule's code or the runner. Everything is descriptive; there is no pass/fail on counts and no target.
//   node experiments/els-line-groups/evaluate.mjs blind-export   -> results/blind-rating-input.json (sequences only, shuffled, no arm/group/line) and results/blind-key.json (decoder)
//   node experiments/els-line-groups/evaluate.mjs                -> results/summary.json, results/summary.md (uses results/blind-ratings.json if it exists)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { context } from "../els-axis-addendum/lib/arms.mjs";
import { buildRuns } from "./lib/arms.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const fixtures = (name) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../test/fixtures/els-matrix-reading/regression-saved-cipher/${name}`, import.meta.url)), "utf8"));
const NEAR_RADIUS = 8;
const key = (cells) => cells.map(([i, j]) => `${i},${j}`).join(";");

const mulberry32 = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export function loadResults(runs) {
  const out = new Map();
  for (const run of runs) {
    const path = here(`./controls/runs/${run.id}/result.json`);
    out.set(run.id, existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null);
  }
  return out;
}

/** The distinct sequences of the verified proposals of every completed run, in a fixed pseudo-random order, with opaque ids. The key is a separate file; the rater does not open it before the ratings are saved. */
export function blindExport(results) {
  const byText = new Map();
  for (const result of results.values()) {
    if (result?.state !== "COMPLETE") continue;
    for (const f of result.findings) {
      if (f.verification.state === "NOT_VERIFIED" || !f.occurrence) continue;
      const entry = byText.get(f.text) ?? { text: f.text, uses: [] };
      entry.uses.push({ run: result.run, arm: result.arm, group: result.group, role: result.role, id: f.id, line: f.occurrence.reading, state: f.verification.state });
      byText.set(f.text, entry);
    }
  }
  const texts = [...byText.values()].sort((x, y) => x.text.localeCompare(y.text));
  const rand = mulberry32(20261030);
  for (let i = texts.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [texts[i], texts[j]] = [texts[j], texts[i]]; }
  const items = texts.map((entry, n) => ({ rid: `Q${String(n + 1).padStart(3, "0")}`, text: entry.text }));
  const keyFile = Object.fromEntries(texts.map((entry, n) => [`Q${String(n + 1).padStart(3, "0")}`, { text: entry.text, uses: entry.uses }]));
  return { items, key: keyFile };
}

const cellsOf = (ctx, term, { start, skip, dir }) => [...term].map((_, k) => { const p = start + k * skip * dir; return [Math.floor(p / ctx.data.width) - ctx.data.r0 + 1, (p % ctx.data.width) - ctx.data.c0 + 1]; });
const distanceOf = (ctx, cells) => Math.min(...cells.map(([i, j]) => Math.min(...ctx.region.axisCells.map(([a, b]) => Math.max(Math.abs(i - a), Math.abs(j - b))))));

/** "exact": same letters on the same cells. "overlap": 2+ shared cells. "crossed": one shared cell only (not a match). "same_text_elsewhere": same letters elsewhere. */
function savedStatus(list, savedCells, term) {
  const mine = new Set(savedCells.map(([i, j]) => `${i},${j}`));
  const exact = list.filter((f) => f.text === term && key(f.occurrence.cells) === key(savedCells));
  if (exact.length) return { status: "exact", with: exact.map((f) => f.id), findings: exact };
  const shared = list.map((f) => ({ f, n: f.occurrence.cells.filter(([i, j]) => mine.has(`${i},${j}`)).length })).filter((x) => x.n > 0);
  const overlap = shared.filter((x) => x.n >= 2);
  const relationOf = (f) => { const fc = new Set(f.occurrence.cells.map(([i, j]) => `${i},${j}`)); return [...mine].every((c) => fc.has(c)) ? "מכילה את הרצף השמור כולו (הצעה ארוכה יותר)" : [...fc].every((c) => mine.has(c)) ? "חלק מהרצף השמור" : "חפיפה חלקית"; };
  if (overlap.length) return { status: "overlap", with: overlap.map(({ f, n }) => `${f.id} ${f.text} (${f.occurrence.reading}) · ${n} תאים · ${relationOf(f)}`), findings: overlap.map((x) => x.f), relations: overlap.map((x) => relationOf(x.f)) };
  const same = list.filter((f) => f.text === term);
  if (same.length) return { status: "same_text_elsewhere", with: same.map((f) => `${f.id} ${f.occurrence.reading}`), findings: same };
  if (shared.length) return { status: "crossed", with: shared.map(({ f }) => `${f.id} ${f.text} (${f.occurrence.reading}) · תא יחיד`), findings: [] };
  return { status: "not_proposed", with: [], findings: [] };
}

export async function evaluate() {
  const ctx = context();
  const { runs, groups } = await buildRuns();
  const results = loadResults(runs);
  const saved = fixtures("saved-cipher.json");
  const ratingsPath = here("./results/blind-ratings.json");
  const keyPath = here("./results/blind-key.json");
  const ratings = existsSync(ratingsPath) && existsSync(keyPath) ? { ratings: JSON.parse(readFileSync(ratingsPath, "utf8")), key: JSON.parse(readFileSync(keyPath, "utf8")) } : null;
  const ratingOfText = new Map();
  if (ratings) for (const [rid, rec] of Object.entries(ratings.key)) { const r = ratings.ratings[rid]; if (r) ratingOfText.set(rec.text, r); }

  const targets = saved.findings.map((f) => {
    const [skip, dir, start] = f.key.split("_").map(Number);
    const cells = cellsOf(ctx, f.t, { start, skip, dir });
    const mine = key(cells);
    const line = ctx.lines.find((l) => { const forward = l.cells.map(([i, j]) => `${i},${j}`); return `;${forward.join(";")};`.includes(`;${mine};`) || `;${forward.slice().reverse().join(";")};`.includes(`;${mine};`); });
    const group = groups.find((g) => line && g.ids.includes(line.id));
    const row = { text: f.t, key: f.key, skip, dir, start, cells, kind: skip === 1 ? "source_row" : "els", distance: distanceOf(ctx, cells), line: line?.id ?? null, group: group?.id ?? null };
    for (const arm of ["A", "B"]) {
      const result = group ? results.get(`${group.id}${arm}`) : null;
      if (!result || result.state !== "COMPLETE") { row[arm] = { status: result ? result.state : "no_run", with: [] }; continue; }
      const verified = result.findings.filter((f2) => f2.verification.state !== "NOT_VERIFIED" && f2.occurrence);
      const st = savedStatus(verified, cells, f.t);
      row[arm] = { status: st.status, with: st.with, relations: st.relations, detail: arm === "B" ? st.findings.map((x) => ({ id: x.id, text: x.text, display: x.group_check.display, classification: x.group_check.classification, explanation: x.group_check.explanation, split_ok: x.group_check.split_preserves_letters })) : undefined };
    }
    return row;
  });

  const describe = (result) => {
    if (!result) return { state: "NOT_RUN" };
    const base = { run: result.run, group: result.group, role: result.role, arm: result.arm, state: result.state, reason: result.reason ?? null, usd: result.cost?.usd ?? null, batch_ms: result.timing?.batch_ms ?? null, output: result.output ?? null };
    if (result.state !== "COMPLETE") return base;
    const ver = result.findings.filter((f) => f.verification.state !== "NOT_VERIFIED" && f.occurrence);
    return { ...base, summary: result.summary, observations: result.observations, cap_reached: result.cap_info.reached,
      near: ver.filter((f) => distanceOf(ctx, f.occurrence.cells) <= NEAR_RADIUS).length,
      findings: ver.map((f) => ({ id: f.id, text: f.text, line: f.occurrence.reading, skip: f.occurrence.skip, kind: f.verification.state === "PLAIN_TEXT_ONLY" ? "source_row" : "els", cells: f.occurrence.cells, duplicate: f.group_check.duplicate, display: f.group_check.display ?? null, classification: f.group_check.classification ?? null, explanation: f.group_check.explanation ?? null, split_ok: f.group_check.split_preserves_letters ?? null, e: f.chance?.expected_occurrences ?? null, rating: ratingOfText.get(f.text)?.r ?? null })),
      not_verified: result.findings.filter((f) => f.verification.state === "NOT_VERIFIED").map((f) => ({ id: f.id, text: f.text, line: f.group_check.model_line, reasons: f.verification.reasons })) };
  };
  const perRun = Object.fromEntries(runs.map((r) => [r.id, describe(results.get(r.id))]));

  const agg = (arm, role) => {
    const set = runs.filter((r) => r.arm === arm && r.group.role === role).map((r) => perRun[r.id]).filter((x) => x.state === "COMPLETE");
    const all = set.flatMap((x) => x.findings);
    const rated = all.filter((f) => f.rating != null);
    const cnt = (n) => rated.filter((f) => f.rating === n).length;
    return { runs: set.length, proposals: all.length, els: all.filter((f) => f.kind === "els").length, source_rows: all.filter((f) => f.kind === "source_row").length, not_verified: set.reduce((s, x) => s + x.summary.not_verified, 0), duplicates: set.reduce((s, x) => s + x.summary.duplicates, 0), outside_group: set.reduce((s, x) => s + x.summary.cited_line_outside_group, 0),
      rated: rated.length, clear: cnt(3), partial: cnt(2), unclear: cnt(1), split_invalid: arm === "B" ? set.reduce((s, x) => s + (x.summary.split_invalid ?? 0), 0) : null, usd: Number(set.reduce((s, x) => s + (x.usd ?? 0), 0).toFixed(6)) };
  };
  const aggregates = Object.fromEntries(["A", "B"].map((arm) => [arm, { saved_lines: agg(arm, "saved_lines"), control: agg(arm, "control") }]));

  // arm B's own classification against the blinded rating of the same sequence (descriptive)
  const crosstab = {};
  for (const x of runs.filter((r) => r.arm === "B").map((r) => perRun[r.id]).filter((x) => x.state === "COMPLETE")) for (const f of x.findings) if (f.rating != null) { const k = `${f.classification}|${f.rating}`; crosstab[k] = (crosstab[k] ?? 0) + 1; }

  // what the two arms share inside a group (same letters on the same cells), and what only one proposed
  const pairs = groups.map((g) => {
    const a = perRun[`${g.id}A`], b = perRun[`${g.id}B`];
    if (a.state !== "COMPLETE" || b.state !== "COMPLETE") return { group: g.id, role: g.role, comparable: false };
    const sa = new Map(a.findings.map((f) => [`${f.text}|${key(f.cells)}`, f])), sb = new Map(b.findings.map((f) => [`${f.text}|${key(f.cells)}`, f]));
    return { group: g.id, role: g.role, comparable: true, both: [...sa.keys()].filter((k) => sb.has(k)).map((k) => sa.get(k).text), only_A: [...sa.keys()].filter((k) => !sb.has(k)).map((k) => sa.get(k).text), only_B: [...sb.keys()].filter((k) => !sa.has(k)).map((k) => sb.get(k).text) };
  });
  const completed = runs.map((r) => perRun[r.id]).filter((x) => x.state === "COMPLETE");
  const reference = JSON.parse(readFileSync(fileURLToPath(new URL("../els-axis-addendum/results/summary.json", import.meta.url)), "utf8"));
  return {
    experiment: "EXP-23", generated_at: new Date().toISOString(), window_sha256: ctx.data.window_sha256,
    note: "DIAGNOSTIC with an evaluation-oriented choice of groups (the saved lines), not a blind discovery; n=1 per cell; descriptive only. The saved words were loaded only for this evaluation, after the answers were saved.",
    runs: perRun, targets, aggregates, crosstab_B_classification_vs_blind_rating: crosstab, arm_pairs: pairs, blind_ratings_loaded: Boolean(ratings),
    saved_exact: Object.fromEntries(["A", "B"].map((arm) => [arm, targets.filter((t) => t[arm].status === "exact").length])),
    saved_overlap: Object.fromEntries(["A", "B"].map((arm) => [arm, targets.filter((t) => t[arm].status === "overlap").length])),
    full_window_reference: { exact: { U: reference.saved_hits.U.exact, A: reference.saved_hits.A.exact, L: reference.saved_hits.L.exact }, note: "EXP-22 and the earlier live run (different instruction, schema, cap and the grid; indicative comparison only)" },
    totals: { requests: runs.length, completed: completed.length, incomplete: runs.map((r) => perRun[r.id]).filter((x) => x.state === "INCOMPLETE").length, failed: runs.map((r) => perRun[r.id]).filter((x) => x.state === "FAILED").length, usd: Number(runs.reduce((s, r) => s + (perRun[r.id].usd ?? 0), 0).toFixed(6)), max_batch_ms: Math.max(0, ...runs.map((r) => perRun[r.id].batch_ms ?? 0)) },
  };
}

const fmtUsd = (v) => (v == null ? "—" : `$${Number(v).toFixed(4)}`);
const mins = (ms) => (ms == null ? "—" : `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}`);
const STATUS = { exact: "נמצא בדיוק", overlap: "חפיפה (2+ תאים)", crossed: "נחתך בתא יחיד (לא התאמה)", same_text_elsewhere: "אותן אותיות במקום אחר", not_proposed: "לא הוצע", INCOMPLETE: "ריצה נקטעה", FAILED: "ריצה נכשלה", no_run: "לא הורצה" };

export function summaryMarkdown(s) {
  const L = [
    "# EXP-23 — קריאה בקבוצות קווים קטנות ואיכות עברית (תוצאות)", "", `> ${s.note}`, "",
    "## ריצות", "", "| ריצה | קבוצה | תפקיד | זרוע | מצב | הצעות | ELS | שורות מקור | לא אומתו | כפילויות | חלוקה פסולה (B) | זמן אצווה | פלט / חשיבה (טוקנים) | stop | עלות |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...Object.values(s.runs).map((r) => `| ${r.run} | ${r.group} | ${r.role === "saved_lines" ? "שמורה" : "ביקורת"} | ${r.arm} | ${r.state}${r.reason ? ` (${r.reason})` : ""} | ${r.summary?.proposals ?? "—"} | ${r.summary?.engine_verified ?? "—"} | ${r.summary?.source_rows ?? "—"} | ${r.summary?.not_verified ?? "—"} | ${r.summary?.duplicates ?? "—"} | ${r.summary?.split_invalid ?? "—"} | ${mins(r.batch_ms)} | ${r.output ? `${r.output.output_tokens} / ${r.output.thinking_tokens}` : "—"} | ${r.output?.stop_reason ?? "—"} | ${fmtUsd(r.usd)} |`),
    "", `סה"כ: ${s.totals.completed}/${s.totals.requests} הושלמו, ${s.totals.incomplete} נקטעו, ${s.totals.failed} נכשלו; עלות ${fmtUsd(s.totals.usd)}; זמן אצווה מרבי ${mins(s.totals.max_batch_ms)} דק׳.`, "",
    "## ששת הממצאים השמורים (נטענו רק אחרי הריצות)", "", "| הממצא | סוג | קו | קבוצה | A (בסיסית) | B (איכות) |", "|---|---|---|---|---|---|",
    ...s.targets.map((t) => `| ${t.text} | ${t.kind === "els" ? `ELS דילוג ${t.skip}` : "שורת מקור"} | ${t.line} | ${t.group} | ${STATUS[t.A.status] ?? t.A.status} | ${STATUS[t.B.status] ?? t.B.status} |`),
    "", `שחזור מדויק: A ${s.saved_exact.A}/6 · B ${s.saved_exact.B}/6. חפיפה של 2+ תאים (לא נספרת כשחזור): A ${s.saved_overlap.A} · B ${s.saved_overlap.B}. ייחוס, חלון מלא (EXP-22 U/A + ריצה חיה קודמת): ${s.full_window_reference.exact.U}/${s.full_window_reference.exact.A}/${s.full_window_reference.exact.L} מתוך 6.`, "",
  ];
  for (const t of s.targets) for (const arm of ["A", "B"]) if (t[arm].with?.length) L.push(`* **${t.text}** — ${arm}: ${t[arm].with.join("; ")}${t[arm].detail?.length ? ` · ${t[arm].detail.map((d) => `[${d.display} | ${d.classification} | ${d.split_ok ? "חלוקה תקינה" : "חלוקה פסולה"} | ${d.explanation}]`).join(" ")}` : ""}`);
  L.push("", "## מצטבר לפי זרוע ותפקיד", "", "| זרוע | תפקיד | ריצות | הצעות | ELS | שורות מקור | לא אומתו | כפילויות | מחוץ לקבוצה | מדורגות | ברור | חלקי | לא ברור | חלוקה פסולה | עלות |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const arm of ["A", "B"]) for (const role of ["saved_lines", "control"]) { const a = s.aggregates[arm][role]; L.push(`| ${arm} | ${role === "saved_lines" ? "שמורה" : "ביקורת"} | ${a.runs} | ${a.proposals} | ${a.els} | ${a.source_rows} | ${a.not_verified} | ${a.duplicates} | ${a.outside_group} | ${a.rated} | ${a.clear} | ${a.partial} | ${a.unclear} | ${a.split_invalid ?? "—"} | ${fmtUsd(a.usd)} |`); }
  L.push("", `דירוג לשוני מעורפל נטען: ${s.blind_ratings_loaded ? "כן" : "לא"}. סיווג עצמי של B מול הדירוג (סיווג|דירוג: כמות): ${Object.entries(s.crosstab_B_classification_vs_blind_rating).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}.`, "", "## אותה קבוצה: מה הוצע בשתי הזרועות ומה רק באחת", "");
  for (const p of s.arm_pairs) L.push(p.comparable ? `* **${p.group}** (${p.role === "saved_lines" ? "שמורה" : "ביקורת"}): בשתיהן ${p.both.length} (${p.both.join(" ") || "—"}) · רק A ${p.only_A.length} (${p.only_A.join(" ") || "—"}) · רק B ${p.only_B.length} (${p.only_B.join(" ") || "—"})` : `* **${p.group}**: לא ניתנת להשוואה (ריצה לא הושלמה).`);
  L.push("", "## הערות המודל (לא מאומתות)", "");
  for (const r of Object.values(s.runs)) if (r.observations) L.push(`* ${r.run}: ${r.observations}`);
  return `${L.join("\n")}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(here("./results/"), { recursive: true });
  const [mode] = process.argv.slice(2);
  if (mode === "blind-export") {
    const { runs } = await buildRuns();
    const { items, key: keyFile } = blindExport(loadResults(runs));
    writeFileSync(here("./results/blind-rating-input.json"), `${JSON.stringify({ instructions: "דרג כל רצף לפי הרובריקה שנכתבה מראש (3 ברור, 2 חלקי, 1 לא ברור) לפי הרצף בלבד", items }, null, 1)}\n`);
    writeFileSync(here("./results/blind-key.json"), `${JSON.stringify(keyFile, null, 1)}\n`);
    process.stdout.write(`${items.length} distinct sequences exported (key written separately)\n`);
  } else {
    const s = await evaluate();
    writeFileSync(here("./results/summary.json"), `${JSON.stringify(s, null, 2)}\n`);
    writeFileSync(here("./results/summary.md"), summaryMarkdown(s));
    process.stdout.write(summaryMarkdown(s));
  }
}
