#!/usr/bin/env node
// EXP-24 evaluation. Run ONLY after all answers are saved. This is the first and only place that reads the saved cipher (the six findings saved on the site): never in an instruction,
// a schema, the plan, the group rule's code or the runner. Everything is descriptive; there is no pass/fail on counts and no target. The interpretation block applies, word for word, the rules written in
// PREREGISTERED-EXP24.md before the run.
//   node experiments/els-ceiling-lift/evaluate.mjs   -> results/summary.json, results/summary.md
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { context } from "../els-axis-addendum/lib/arms.mjs";
import { buildRuns } from "./lib/arms.mjs";
import { CAP, PREVIOUS_CAP } from "./lib/plan.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const fixtures = (name) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../test/fixtures/els-matrix-reading/regression-saved-cipher/${name}`, import.meta.url)), "utf8"));
const NEAR_RADIUS = 8;
const key = (cells) => cells.map(([i, j]) => `${i},${j}`).join(";");
const rankOf = (id) => Number(String(id).match(/\.f(\d+)$/)?.[1] ?? 0);

/** L = EXP-24 (ceiling 40); P = the previous run of the same group and instruction, EXP-23 arm A (ceiling 12). */
export function loadResults(runs) {
  const L = new Map(), P = new Map();
  for (const run of runs) {
    const l = here(`./controls/runs/${run.id}/result.json`);
    const p = here(`../els-line-groups/controls/runs/${run.id}/result.json`);
    L.set(run.id, existsSync(l) ? JSON.parse(readFileSync(l, "utf8")) : null);
    P.set(run.id, existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
  }
  return { L, P };
}

const cellsOf = (ctx, term, { start, skip, dir }) => [...term].map((_, k) => { const p = start + k * skip * dir; return [Math.floor(p / ctx.data.width) - ctx.data.r0 + 1, (p % ctx.data.width) - ctx.data.c0 + 1]; });
const distanceOf = (ctx, cells) => Math.min(...cells.map(([i, j]) => Math.min(...ctx.region.axisCells.map(([a, b]) => Math.max(Math.abs(i - a), Math.abs(j - b))))));

/** "exact": same letters on the same cells. "overlap": 2+ shared cells. "crossed": one shared cell only (not a match). "same_text_elsewhere": same letters elsewhere. */
function savedStatus(list, savedCells, term) {
  const mine = new Set(savedCells.map(([i, j]) => `${i},${j}`));
  const exact = list.filter((f) => f.text === term && key(f.occurrence.cells) === key(savedCells));
  if (exact.length) return { status: "exact", with: exact.map((f) => f.id), ranks: exact.map((f) => rankOf(f.id)), findings: exact };
  const shared = list.map((f) => ({ f, n: f.occurrence.cells.filter(([i, j]) => mine.has(`${i},${j}`)).length })).filter((x) => x.n > 0);
  const overlap = shared.filter((x) => x.n >= 2);
  const relationOf = (f) => { const fc = new Set(f.occurrence.cells.map(([i, j]) => `${i},${j}`)); return [...mine].every((c) => fc.has(c)) ? "מכילה את הרצף השמור כולו (הצעה ארוכה יותר)" : [...fc].every((c) => mine.has(c)) ? "חלק מהרצף השמור" : "חפיפה חלקית"; };
  if (overlap.length) return { status: "overlap", with: overlap.map(({ f, n }) => `${f.id} ${f.text} (${f.occurrence.reading}) · ${n} תאים · ${relationOf(f)}`), ranks: overlap.map((x) => rankOf(x.f.id)), findings: overlap.map((x) => x.f), relations: overlap.map((x) => relationOf(x.f)) };
  const same = list.filter((f) => f.text === term);
  if (same.length) return { status: "same_text_elsewhere", with: same.map((f) => `${f.id} ${f.occurrence.reading}`), ranks: same.map((f) => rankOf(f.id)), findings: same };
  if (shared.length) return { status: "crossed", with: shared.map(({ f }) => `${f.id} ${f.text} (${f.occurrence.reading}) · תא יחיד`), ranks: shared.map((x) => rankOf(x.f.id)), findings: [] };
  return { status: "not_proposed", with: [], ranks: [], findings: [] };
}

export async function evaluate() {
  const ctx = context();
  const { runs, groups } = await buildRuns();
  const { L, P } = loadResults(runs);
  const saved = fixtures("saved-cipher.json");
  const verifiedOf = (result) => result.findings.filter((f) => f.verification.state !== "NOT_VERIFIED" && f.occurrence);

  const targets = saved.findings.map((f) => {
    const [skip, dir, start] = f.key.split("_").map(Number);
    const cells = cellsOf(ctx, f.t, { start, skip, dir });
    const mine = key(cells);
    const line = ctx.lines.find((l) => { const forward = l.cells.map(([i, j]) => `${i},${j}`); return `;${forward.join(";")};`.includes(`;${mine};`) || `;${forward.slice().reverse().join(";")};`.includes(`;${mine};`); });
    const group = groups.find((g) => line && g.ids.includes(line.id));
    const row = { text: f.t, key: f.key, skip, dir, start, cells, kind: skip === 1 ? "source_row" : "els", distance: distanceOf(ctx, cells), line: line?.id ?? null, group: group?.id ?? null };
    for (const [name, results] of [["P", P], ["L", L]]) {
      const result = group ? results.get(`${group.id}A`) : null;
      if (!result || result.state !== "COMPLETE") { row[name] = { status: result ? result.state : "no_run", reason: result?.reason ?? null, with: [], ranks: [] }; continue; }
      const st = savedStatus(verifiedOf(result), cells, f.t);
      row[name] = { status: st.status, with: st.with, ranks: st.ranks, relations: st.relations };
    }
    return row;
  });

  const describe = (result) => {
    if (!result) return { state: "NOT_RUN" };
    const base = { run: result.run, group: result.group, state: result.state, reason: result.reason ?? null, cap: result.cap, usd: result.cost?.usd ?? null, batch_ms: result.timing?.batch_ms ?? null, output: result.output ?? null };
    if (result.state !== "COMPLETE") return base;
    const ver = verifiedOf(result);
    return { ...base, summary: result.summary, observations: result.observations, cap_reached: result.cap_info.reached, beyond_previous_cap: result.findings.filter((f) => rankOf(f.id) > PREVIOUS_CAP).length,
      near: ver.filter((f) => distanceOf(ctx, f.occurrence.cells) <= NEAR_RADIUS).length,
      findings: result.findings.filter((f) => f.verification.state !== "NOT_VERIFIED" && f.occurrence).map((f) => ({ id: f.id, rank: rankOf(f.id), text: f.text, line: f.occurrence.reading, skip: f.occurrence.skip, kind: f.verification.state === "PLAIN_TEXT_ONLY" ? "source_row" : "els", cells: f.occurrence.cells, duplicate: f.group_check.duplicate, e: f.chance?.expected_occurrences ?? null })),
      not_verified: result.findings.filter((f) => f.verification.state === "NOT_VERIFIED").map((f) => ({ id: f.id, text: f.text, line: f.group_check.model_line, reasons: f.verification.reasons })) };
  };
  const perRun = Object.fromEntries(runs.map((r) => [r.group.id, { L: describe(L.get(r.id)), P: describe(P.get(r.id)) }]));

  // stability: the proposals of the EXP-23 run (same letters on the same cells) that come back in the EXP-24 run of the same group
  const stability = groups.map((g) => {
    const { L: l, P: p } = perRun[g.id];
    if (l.state !== "COMPLETE" || p.state !== "COMPLETE") return { group: g.id, comparable: false };
    const sig = (f) => `${f.text}|${key(f.cells)}`;
    const inL = new Set(l.findings.map(sig)), inP = new Set(p.findings.map(sig));
    return { group: g.id, comparable: true, previous: p.findings.length, returned: p.findings.filter((f) => inL.has(sig(f))).length, new_in_ceiling_lift: l.findings.filter((f) => !inP.has(sig(f))).length, new_beyond_previous_cap: l.findings.filter((f) => !inP.has(sig(f)) && f.rank > PREVIOUS_CAP).length };
  });

  // the interpretation rules of PREREGISTERED-EXP24.md, applied as written
  const read = groups.map((g) => perRun[g.id].L).filter((x) => x.state === "COMPLETE");
  const refused = groups.map((g) => perRun[g.id].L).filter((x) => x.state !== "COMPLETE");
  const newExact = targets.filter((t) => t.L.status === "exact" && t.P.status !== "exact");
  const anyExact = targets.filter((t) => t.L.status === "exact");
  const reached = read.filter((x) => x.cap_reached).map((x) => x.group);
  const verdict = newExact.length ? "ceiling_cut" : read.length && !reached.length && !anyExact.length ? "not_recognised_with_room" : "inconclusive";
  const interpretation = {
    rule_source: "experiments/els-ceiling-lift/PREREGISTERED-EXP24.md (כללי פרשנות)", verdict, groups_read: read.map((x) => x.group), groups_not_read: refused.map((x) => `${x.group}:${x.state}${x.reason ? `(${x.reason})` : ""}`),
    saved_exact_now: anyExact.map((t) => t.text), saved_exact_new_vs_exp23: newExact.map((t) => ({ text: t.text, ranks: t.L.ranks, beyond_12: t.L.ranks.some((r) => r > PREVIOUS_CAP) })), groups_that_reached_the_ceiling: reached,
    saved_read_but_not_exact: targets.filter((t) => perRun[t.group]?.L.state === "COMPLETE" && t.L.status !== "exact").map((t) => `${t.text}: ${t.L.status}`),
  };
  const completed = groups.map((g) => perRun[g.id].L).filter((x) => x.state === "COMPLETE");
  const all = groups.map((g) => perRun[g.id].L);
  return {
    experiment: "EXP-24", generated_at: new Date().toISOString(), window_sha256: ctx.data.window_sha256, ceiling: { exp24: CAP, exp23: PREVIOUS_CAP },
    note: "DIAGNOSTIC with an evaluation-oriented choice of groups (the saved lines), not a blind discovery; n=1 per group; descriptive only. The saved words were loaded only for this evaluation, after the answers were saved. Previous run = EXP-23 arm A (ceiling 12, max_tokens 10,000).",
    runs: perRun, targets, stability, interpretation,
    saved_exact: { P: targets.filter((t) => t.P.status === "exact").length, L: anyExact.length }, saved_overlap: { P: targets.filter((t) => t.P.status === "overlap").length, L: targets.filter((t) => t.L.status === "overlap").length },
    totals: { requests: all.length, completed: completed.length, incomplete: all.filter((x) => x.state === "INCOMPLETE").length, failed: all.filter((x) => x.state === "FAILED").length, proposals: completed.reduce((s, x) => s + x.summary.proposals, 0), usd: Number(all.reduce((s, x) => s + (x.usd ?? 0), 0).toFixed(6)), max_batch_ms: Math.max(0, ...all.map((x) => x.batch_ms ?? 0)) },
  };
}

const fmtUsd = (v) => (v == null ? "—" : `$${Number(v).toFixed(4)}`);
const mins = (ms) => (ms == null ? "—" : `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}`);
const STATUS = { exact: "נמצא בדיוק", overlap: "חפיפה (2+ תאים)", crossed: "נחתך בתא יחיד (לא התאמה)", same_text_elsewhere: "אותן אותיות במקום אחר", not_proposed: "לא הוצע", INCOMPLETE: "ריצה נקטעה / נדחתה", FAILED: "ריצה נכשלה", no_run: "לא הורצה" };
const VERDICT = { ceiling_cut: "**התקרה חתכה** — לפחות ממצא שמור שלא שוחזר ב־EXP-23 משוחזר כאן במדויק (אינדיקציה, n=1)", not_recognised_with_room: "**לא זוהה/לא נבחר גם כשיש מקום** — בכל הקבוצות שנקראו המודל הציע פחות מ־40 הצעות ושום ממצא שמור לא שוחזר במדויק", inconclusive: "**לא חד־משמעי** — קבוצה שהגיעה ל־40 בלי שחזור, קבוצות שלא נקראו, או שחזור חלקי בלבד" };

export function summaryMarkdown(s) {
  const L = [
    "# EXP-24 — ריצה צרה: ארבע הקבוצות השמורות עם תקרה 40 (תוצאות)", "", `> ${s.note}`, "",
    "## ריצות (EXP-24, תקרה 40) מול הריצה הקודמת של אותה קבוצה (EXP-23 A, תקרה 12)", "",
    "| קבוצה | מצב | הצעות (40) | הגיע לתקרה | מעבר ל־12 | ELS | שורות מקור | לא אומתו | כפילויות | פלט / חשיבה (טוקנים) | stop | זמן אצווה | עלות | קודם: מצב / הצעות |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...Object.entries(s.runs).map(([g, { L: r, P: p }]) => `| ${g} | ${r.state}${r.reason ? ` (${r.reason})` : ""} | ${r.summary?.proposals ?? "—"} | ${r.cap_reached == null ? "—" : r.cap_reached ? "כן" : "לא"} | ${r.beyond_previous_cap ?? "—"} | ${r.summary?.engine_verified ?? "—"} | ${r.summary?.source_rows ?? "—"} | ${r.summary?.not_verified ?? "—"} | ${r.summary?.duplicates ?? "—"} | ${r.output ? `${r.output.output_tokens} / ${r.output.thinking_tokens}` : "—"} | ${r.output?.stop_reason ?? "—"} | ${mins(r.batch_ms)} | ${fmtUsd(r.usd)} | ${p.state}${p.reason ? ` (${p.reason})` : ""} / ${p.summary?.proposals ?? "—"} |`),
    "", `סה"כ: ${s.totals.completed}/${s.totals.requests} הושלמו, ${s.totals.incomplete} נקטעו או נדחו, ${s.totals.failed} נכשלו; ${s.totals.proposals} הצעות; עלות ${fmtUsd(s.totals.usd)} מתוך $2.50; זמן אצווה מרבי ${mins(s.totals.max_batch_ms)} דק׳.`, "",
    "## ששת הממצאים השמורים (נטענו רק אחרי הריצות)", "", "| הממצא | סוג | קו | קבוצה | EXP-23 A (תקרה 12) | EXP-24 (תקרה 40) | מיקום ברשימה (EXP-24) |", "|---|---|---|---|---|---|---|",
    ...s.targets.map((t) => `| ${t.text} | ${t.kind === "els" ? `ELS דילוג ${t.skip}` : "שורת מקור"} | ${t.line} | ${t.group} | ${STATUS[t.P.status] ?? t.P.status}${t.P.reason ? ` (${t.P.reason})` : ""} | ${STATUS[t.L.status] ?? t.L.status}${t.L.reason ? ` (${t.L.reason})` : ""} | ${t.L.ranks.length ? t.L.ranks.join(", ") : "—"} |`),
    "", ...s.targets.filter((t) => t.L.with.length).map((t) => `* ${t.text} (EXP-24): ${t.L.with.join("; ")}`),
    "", "## יציבות מול EXP-23 A (אותן אותיות על אותם תאים)", "", "| קבוצה | הצעות קודמות | חזרו | חדשות ב־EXP-24 | מהן מעבר למקום 12 |", "|---|---|---|---|---|",
    ...s.stability.map((x) => (x.comparable ? `| ${x.group} | ${x.previous} | ${x.returned} | ${x.new_in_ceiling_lift} | ${x.new_beyond_previous_cap} |` : `| ${x.group} | — | — | — | — |`)),
    "", "## מה כתב המודל ב־observations", "", ...Object.entries(s.runs).map(([g, { L: r }]) => `* **${g}**: ${r.observations ? r.observations : "—"}`),
    "", "## פרשנות לפי הכללים שנכתבו מראש", "", `${VERDICT[s.interpretation.verdict]}.`, "",
    `* קבוצות שנקראו: ${s.interpretation.groups_read.join(", ") || "—"}; לא נקראו: ${s.interpretation.groups_not_read.join(", ") || "—"}.`,
    `* שחזור מדויק עכשיו: ${s.interpretation.saved_exact_now.join(", ") || "אף אחד"}; חדש מול EXP-23: ${s.interpretation.saved_exact_new_vs_exp23.map((x) => `${x.text} (מקום ${x.ranks.join(",")}${x.beyond_12 ? ", מעבר ל־12" : ""})`).join(", ") || "אף אחד"}.`,
    `* קבוצות שהגיעו לתקרת 40: ${s.interpretation.groups_that_reached_the_ceiling.join(", ") || "אף אחת"}.`,
    `* ממצאים שמורים בקבוצות שנקראו שלא שוחזרו במדויק: ${s.interpretation.saved_read_but_not_exact.join("; ") || "—"}.`,
    "", "## מה אי אפשר להסיק", "", "* n=1 לכל קבוצה; ההנחיה הבסיסית והחלון נשארו, אך התקרה משפיעה על כל הבחירה של המודל, ולא רק על \"הזנב\". הסדר ברשימה אינו דירוג.", "* קבוצות שנדחו על ידי הספק לא נקראו: אין מסקנה לגביהן.", "* בחירת הקבוצות מוכוונת־הערכה: אין כאן גילוי.", "",
  ];
  return `${L.join("\n")}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(here("./results/"), { recursive: true });
  const s = await evaluate();
  writeFileSync(here("./results/summary.json"), `${JSON.stringify(s, null, 2)}\n`);
  writeFileSync(here("./results/summary.md"), summaryMarkdown(s));
  process.stdout.write(summaryMarkdown(s));
}
