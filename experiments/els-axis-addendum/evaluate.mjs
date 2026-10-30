#!/usr/bin/env node
// EXP-22 evaluation. Run ONLY after both answers are saved (controls/runs/{U,A}/result.json). This is the first and only place that reads the saved cipher (the six findings saved on the
// site): they were never in an instruction, a schema, the plan or the runner. Everything is descriptive; there is no pass/fail and no target.
//   node experiments/els-axis-addendum/evaluate.mjs      -> results/summary.json, results/summary.md
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { context } from "./lib/arms.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const fixtures = (name) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../test/fixtures/els-matrix-reading/regression-saved-cipher/${name}`, import.meta.url)), "utf8"));
const NEAR_RADIUS = 8;

const cellsOf = (ctx, term, { start, skip, dir }) => [...term].map((_, k) => { const p = start + k * skip * dir; return [Math.floor(p / ctx.data.width) - ctx.data.r0 + 1, (p % ctx.data.width) - ctx.data.c0 + 1]; });
const key = (cells) => cells.map(([i, j]) => `${i},${j}`).join(";");
const distanceOf = (ctx, cells) => Math.min(...cells.map(([i, j]) => Math.min(...ctx.region.axisCells.map(([a, b]) => Math.max(Math.abs(i - a), Math.abs(j - b))))));
const bandOf = (d) => (d === 0 ? "crosses" : d === 1 ? "touches" : d <= NEAR_RADIUS ? "near" : "far");

/** One proposal in a common shape, whichever run it came from. */
function normalise(ctx, f, source) {
  const cells = f.occurrence?.cells ?? f.cells;
  const verification = f.verification?.state ?? "UNKNOWN";
  const skip = f.occurrence?.skip ?? f.skip;
  return {
    id: f.id, text: f.text, line: f.occurrence?.reading ?? f.line, skip, dir: f.occurrence?.dir ?? f.dir, start: f.occurrence?.start ?? f.start, cells, signature: `${f.text}|${key(cells)}`,
    state: verification, kind: verification === "PLAIN_TEXT_ONLY" ? "source_row" : verification === "ENGINE_VERIFIED" ? "els" : "not_verified",
    distance: distanceOf(ctx, cells), band: bandOf(distanceOf(ctx, cells)), chance: f.chance ?? null, tier: f.model_claims?.tier ?? null, note: f.model_claims?.note ?? "", source,
  };
}

function describeRun(ctx, id, result, label) {
  if (!result) return { id, label, state: "MISSING" };
  const base = { id, label, state: result.state, reason: result.reason ?? null, batch: result.batch?.id ?? null, usd: result.cost?.usd ?? null, timing: result.timing ?? null, output: result.output ?? null, usage: result.usage ?? null };
  if (result.state !== "COMPLETE") return base;
  const list = result.findings.filter((f) => f.verification.state !== "NOT_VERIFIED" && f.occurrence).map((f) => normalise(ctx, f, id));
  const by = (pred) => list.filter(pred);
  return {
    ...base, proposals: result.cap_info.proposals, reached_cap: result.cap_info.reached, summary: result.summary,
    findings: list, not_verified: result.findings.filter((f) => f.verification.state === "NOT_VERIFIED").map((f) => ({ id: f.id, text: f.text, reasons: f.verification.reasons })),
    bands: { crosses: by((f) => f.band === "crosses").length, touches: by((f) => f.band === "touches").length, near: by((f) => f.band === "near").length, far: by((f) => f.band === "far").length },
    els: by((f) => f.kind === "els").length, source_rows: by((f) => f.kind === "source_row").length,
    unlikely_by_chance: by((f) => f.chance?.unlikely_by_chance === true).length,
    margin: by((f) => f.distance > NEAR_RADIUS), axis_context: by((f) => f.distance <= 1),
    coverage_report: result.coverage_report, review: result.review ?? null, observations: result.observations ?? "",
  };
}

/**
 * How a run relates to each saved finding. "exact": the same letters on the same cells. "overlap": a proposal shares two or more cells with it (a longer, shorter or shifted reading of the same
 * stretch). "crossed": the only contact is ONE shared cell, i.e. a line that merely crosses it (the axis crosses every source row it meets): not a match. "same_text_elsewhere": the same letters
 * on other cells. "not_proposed": nothing.
 */
function savedStatus(list, savedCells, term) {
  const mine = new Set(savedCells.map(([i, j]) => `${i},${j}`));
  const exact = list.filter((f) => f.signature === `${term}|${key(savedCells)}`);
  if (exact.length) return { status: "exact", with: exact.map((f) => f.id) };
  const shared = list.map((f) => ({ f, n: f.cells.filter(([i, j]) => mine.has(`${i},${j}`)).length })).filter((x) => x.n > 0);
  const overlap = shared.filter((x) => x.n >= 2);
  if (overlap.length) return { status: "overlap", with: overlap.map(({ f, n }) => `${f.id} ${f.text} (${f.line}) · ${n} תאים משותפים`) };
  const sameText = list.filter((f) => f.text === term);
  if (sameText.length) return { status: "same_text_elsewhere", with: sameText.map((f) => `${f.id} ${f.line}`) };
  if (shared.length) return { status: "crossed", with: shared.map(({ f }) => `${f.id} ${f.text} (${f.line}) · תא יחיד`) };
  return { status: "not_proposed", with: [] };
}

export function evaluate() {
  const ctx = context();
  const read = (id) => { const path = here(`./controls/runs/${id}/result.json`); return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null; };
  const saved = fixtures("saved-cipher.json");
  const live = fixtures("live-run-uniform-proposals.json");
  const U = describeRun(ctx, "U", read("U"), "uniform (הקריאה הקיימת)");
  const A = describeRun(ctx, "A", read("A"), "תוספת העמקה");
  // the earlier live product run (uniform, job 5f5aa117): a reference only, kept apart. Its proposals were all verified in the engine when it ran.
  const liveList = live.proposals.map((p) => {
    const cells = cellsOf(ctx, p.text, p);
    const distance = distanceOf(ctx, cells);
    return { id: p.id, text: p.text, line: p.line, skip: p.skip, dir: p.dir, start: p.start, cells, signature: `${p.text}|${key(cells)}`, kind: p.skip === 1 ? "source_row" : "els", distance, band: bandOf(distance), source: "L" };
  });
  const L = { id: "L", label: "ריצה חיה קודמת (uniform, job 5f5aa117) — ייחוס", state: "COMPLETE", usd: live.cost_usd, proposals: liveList.length, findings: liveList,
    els: liveList.filter((f) => f.kind === "els").length, source_rows: liveList.filter((f) => f.kind === "source_row").length,
    bands: Object.fromEntries(["crosses", "touches", "near", "far"].map((b) => [b, liveList.filter((f) => f.band === b).length])), margin: liveList.filter((f) => f.distance > NEAR_RADIUS), axis_context: liveList.filter((f) => f.distance <= 1) };

  const targets = saved.findings.map((f) => {
    const [skip, dir, start] = f.key.split("_").map(Number);
    const cells = cellsOf(ctx, f.t, { start, skip, dir });
    const row = { text: f.t, key: f.key, skip, dir, start, cells, kind: skip === 1 ? "source_row" : "els", distance: distanceOf(ctx, cells) };
    for (const run of [U, A, L]) row[run.id] = run.findings ? savedStatus(run.findings, cells, f.t) : { status: "no_answer", with: [] };
    return row;
  });
  const sig = (run) => new Map((run.findings ?? []).map((f) => [f.signature, f]));
  const su = sig(U), sa = sig(A);
  const both = [...su.keys()].filter((k) => sa.has(k)).map((k) => su.get(k));
  const onlyU = [...su.keys()].filter((k) => !sa.has(k)).map((k) => su.get(k));
  const onlyA = [...sa.keys()].filter((k) => !su.has(k)).map((k) => sa.get(k));
  const textsU = new Set((U.findings ?? []).map((f) => f.text)), textsA = new Set((A.findings ?? []).map((f) => f.text));
  const out = {
    experiment: "EXP-22", generated_at: new Date().toISOString(), window_sha256: ctx.data.window_sha256, near_radius: NEAR_RADIUS,
    note: "descriptive only: n=1 per arm, a stochastic model; the saved cipher is known and the radius was first read off it (in-sample), so a hit is a regression result, not a blind discovery",
    runs: { U, A, L }, saved_targets: targets,
    saved_hits: Object.fromEntries(["U", "A", "L"].map((id) => [id, { exact: targets.filter((t) => t[id].status === "exact").length, overlap: targets.filter((t) => t[id].status === "overlap").length, crossed_at_one_cell: targets.filter((t) => t[id].status === "crossed").length, of: targets.length }])),
    overlap_between_arms: { same_text_and_cells: both.length, only_U: onlyU.length, only_A: onlyA.length, same_text_anywhere: [...textsU].filter((t) => textsA.has(t)).length },
    both: both.map((f) => ({ text: f.text, line: f.line, distance: f.distance, kind: f.kind })), only_U: onlyU.map((f) => ({ text: f.text, line: f.line, distance: f.distance, kind: f.kind, band: f.band })), only_A: onlyA.map((f) => ({ text: f.text, line: f.line, distance: f.distance, kind: f.kind, band: f.band })),
  };
  return out;
}

const fmtUsd = (v) => (v == null ? "—" : `$${Number(v).toFixed(4)}`);
const mins = (ms) => (ms == null ? "—" : `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")} דק׳`);
const STATUS = { exact: "נמצא בדיוק", overlap: "חפיפה (2+ תאים משותפים)", crossed: "נחתך בתא יחיד (לא התאמה)", same_text_elsewhere: "אותן אותיות במקום אחר", not_proposed: "לא הוצע", no_answer: "אין תשובה" };

export function summaryMarkdown(s) {
  const { U, A, L } = s.runs;
  const row = (label, f) => `| ${label} | ${[U, A, L].map(f).join(" | ")} |`;
  const lines = [
    "# EXP-22 — הקריאה הקיימת מול תוספת ההעמקה, על „יום משיח בא” (תוצאות)", "",
    `> ${s.note}`, "",
    "## מצב ועלות", "",
    "| | U — uniform | A — תוספת | L — ריצה חיה קודמת (ייחוס) |", "|---|---|---|---|",
    row("מצב", (r) => r.state + (r.reason ? ` (${r.reason})` : "")),
    row("הצעות / תקרה 25", (r) => (r.proposals ?? "—")),
    row("ELS מאומתים במנוע", (r) => r.els ?? "—"),
    row("שורות מקור (לא ELS)", (r) => r.source_rows ?? "—"),
    row("בלתי סבירות במקרה (E<1)", (r) => r.unlikely_by_chance ?? "—"),
    row("זמן אצווה", (r) => mins(r.timing?.batch_ms ?? null)),
    row("קלט / פלט / חשיבה (טוקנים)", (r) => (r.output ? `${r.output.input_tokens} / ${r.output.output_tokens} / ${r.output.thinking_tokens}` : "—")),
    row("stop_reason", (r) => r.output?.stop_reason ?? "—"),
    row("עלות (usage × מחירון)", (r) => fmtUsd(r.usd)), "",
    "## ששת הממצאים השמורים (נבדקו רק אחרי הריצות)", "",
    "| הממצא | סוג | מרחק מהציר | U | A | L |", "|---|---|---|---|---|---|",
    ...s.saved_targets.map((t) => `| ${t.text} | ${t.kind === "els" ? `ELS דילוג ${t.skip}` : "שורת מקור"} | ${t.distance} | ${STATUS[t.U.status]} | ${STATUS[t.A.status]} | ${STATUS[t.L.status]} |`),
    "", `בדיוק: U ${s.saved_hits.U.exact}/6 · A ${s.saved_hits.A.exact}/6 · L ${s.saved_hits.L.exact}/6. חפיפה של 2+ תאים: U ${s.saved_hits.U.overlap}/6 · A ${s.saved_hits.A.overlap}/6 · L ${s.saved_hits.L.overlap}/6. נחתך בתא יחיד בלבד (למשל הציר חותך שורת מקור): U ${s.saved_hits.U.crossed_at_one_cell} · A ${s.saved_hits.A.crossed_at_one_cell} · L ${s.saved_hits.L.crossed_at_one_cell}.`, "",
    ...s.saved_targets.filter((t) => ["overlap", "crossed"].some((st) => [t.U.status, t.A.status, t.L.status].includes(st))).flatMap((t) => [`**${t.text}** — ` + ["U", "A", "L"].filter((k) => t[k].with.length).map((k) => `${k}: ${t[k].with.join("; ")}`).join(" | "), ""]),
    "## קשרים סביב הציר", "",
    "| | U | A | L |", "|---|---|---|---|",
    ...["crosses", "touches", "near", "far"].map((b) => `| ${{ crosses: "חותכות את הציר (0)", touches: "נוגעות (1)", near: "סביבה קרובה (2–8)", far: "שוליים (>8)" }[b]} | ${[U, A, L].map((r) => r.bands?.[b] ?? "—").join(" | ")} |`),
    "", `**חותכות/נוגעות — U:** ${(U.axis_context ?? []).map((f) => `${f.text} (${f.line}, ${f.distance})`).join(" · ") || "—"}`, "", `**חותכות/נוגעות — A:** ${(A.axis_context ?? []).map((f) => `${f.text} (${f.line}, ${f.distance})`).join(" · ") || "—"}`, "",
    "## ממצאי שוליים (מרחק > 8)", "",
    `**U (${U.margin?.length ?? "—"}):** ${(U.margin ?? []).map((f) => `${f.text} (${f.line})`).join(" · ") || "—"}`, "",
    `**A (${A.margin?.length ?? "—"}):** ${(A.margin ?? []).map((f) => `${f.text} (${f.line})`).join(" · ") || "—"}`, "",
    `**L (${L.margin?.length ?? "—"}):** ${(L.margin ?? []).map((f) => `${f.text} (${f.line})`).join(" · ") || "—"}`, "",
    "## שורות מקור (טקסט רגיל, לא ELS)", "",
    `**U:** ${(U.findings ?? []).filter((f) => f.kind === "source_row").map((f) => `${f.text} (${f.line})`).join(" · ") || "—"}`, "",
    `**A:** ${(A.findings ?? []).filter((f) => f.kind === "source_row").map((f) => `${f.text} (${f.line})`).join(" · ") || "—"}`, "",
    `**L:** ${(L.findings ?? []).filter((f) => f.kind === "source_row").map((f) => `${f.text} (${f.line})`).join(" · ") || "—"}`, "",
    "## הצעות: במשותף ובנפרד (U מול A: אותן אותיות על אותם תאים)", "",
    `במשותף ${s.overlap_between_arms.same_text_and_cells} · רק ב־U ${s.overlap_between_arms.only_U} · רק ב־A ${s.overlap_between_arms.only_A} · אותו טקסט בכל מקום ${s.overlap_between_arms.same_text_anywhere}.`, "",
    `**במשותף:** ${s.both.map((f) => f.text).join(" · ") || "—"}`, "", `**רק ב־U:** ${s.only_U.map((f) => `${f.text} (${f.line})`).join(" · ") || "—"}`, "", `**רק ב־A:** ${s.only_A.map((f) => `${f.text} (${f.line})`).join(" · ") || "—"}`, "",
    "## כיסוי (שלושה דברים נפרדים)", "", "קו נספר גם בסביבה וגם בשוליים כשיש לו לפחות 3 תאים בכל אחד מהם (לכן קווי השוליים הם כל 212 הקווים).", "",
  ];
  for (const r of [U, A]) {
    const cr = r.coverage_report;
    if (!cr) { lines.push(`**${r.id}:** אין (${r.state}).`, ""); continue; }
    const mr = cr.model_review, fp = cr.proposal_footprint, sh = cr.shown_to_model;
    lines.push(`**${r.id}** — כמות ההצעות: ${cr.proposals.count} מתוך ${cr.proposals.cap}; דטרמיניסטי: הוצגו ${sh.lines} קווים (${sh.axis_lines.lines} דרך הציר; ${sh.near.lines} בסביבה, ${sh.margin.lines} בשוליים), נגעו בהצעות מאומתות ${fp.near.lines_with_proposals}/${fp.near.of_lines} קווי סביבה ו־${fp.margin.lines_with_proposals}/${fp.margin.of_lines} קווי שוליים (${fp.margin.cells_touched} תאים בשוליים); דיווח המודל: ${mr.status === "UNVERIFIED_MODEL_REPORT" ? `לאורך הציר ${mr.axis.reported}/${mr.axis.of_lines}, בסביבה ${mr.near.reported}/${mr.near.of_lines}, בשוליים ${mr.margin.reported}/${mr.margin.of_lines} (${mr.margin.state}) — הצהרה שלו, לא נבדקת` : mr.status}.`, "");
  }
  lines.push("## הערות המודל (לא מאומתות)", "", `**U:** ${U.observations || "—"}`, "", `**A:** ${A.observations || "—"}`, "");
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(here("./results/"), { recursive: true });
  const s = evaluate();
  writeFileSync(here("./results/summary.json"), `${JSON.stringify(s, null, 2)}\n`);
  writeFileSync(here("./results/summary.md"), summaryMarkdown(s));
  process.stdout.write(summaryMarkdown(s));
}
