#!/usr/bin/env node
// EXP-18 report stage: reads the saved answers of C1 (focused instruction, cap 25), C2 (previous instruction, cap 60) and C3 (previous instruction, cap 25) and the saved EXP-16 run S2 (the
// same Columbia region, full 33 x 41 window, other background), and writes results/summary.{md,json}. Descriptive counts only (n=1 per arm). The evaluation targets are read here, after the
// answers were saved, from the data file of the live-reading experiment; they are never part of a request.
//   node experiments/els-axis-window/evaluate-axis.mjs [--page public/tzofen.html]
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RUNS } from "./lib/plan.mjs";
import { loadContext } from "../els-live-reading/lib/context.mjs";
import { enrich, runMetrics, torahChanceModel } from "../els-live-reading/lib/metrics.mjs";
import { parseModelOutput } from "../els-live-reading/lib/validate.mjs";
import { evaluateTargets } from "../els-live-reading/lib/evaluate.mjs";
import { loadRegion } from "../els-live-reading/lib/region.mjs";
import { pageLetters } from "../els-live-reading/build-windows.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const args = Object.fromEntries(process.argv.slice(2).map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]] : null)).filter(Boolean));
const page = args.page || "public/tzofen.html";
const chance = torahChanceModel(pageLetters(page), (text) => createHash("md5").update(text, "utf8").digest("hex"));
const targets = readJson(here("../els-live-reading/evaluation/targets.json")).targets;
const window = RUNS[0].windowFile;
const ctx = loadContext(page, { regionPath: window });
const region = ctx.region;
const axisCells = region.axisCells; // [row, col] in this window, 1-based
const streamRowOf = (r) => region.r0 + r - 1;

/** Distance (Chebyshev, in cells) from an occurrence to the selected occurrence: 0 shares a cell, 1 touches (also diagonally), 2 or more is farther. */
const distanceToAxis = (cells) => Math.min(...cells.map(([i, j]) => Math.min(...axisCells.map(([a, b]) => Math.max(Math.abs(i - a), Math.abs(j - b))))));
const relationOf = (d) => (d === 0 ? "crosses" : d === 1 ? "touches" : "far");
const keyOf = (f, occ) => `${f.text}|${occ.params.start}|${occ.params.skip}|${occ.params.dir}`;

function load(dir, regionOfRun) {
  const responsePath = `${dir}/round1-response.json`;
  if (!existsSync(responsePath)) return null;
  const response = readJson(responsePath);
  const usage = response.summary.usage ?? {};
  const out = { stop_reason: response.summary.stop_reason, usd: response.cost?.usd ?? null, seconds: Math.round((response.ms ?? 0) / 1000), input_tokens: usage.input_tokens ?? null, output_tokens: usage.output_tokens ?? null, thinking_tokens: usage.output_tokens_details?.thinking_tokens ?? 0 };
  const parsed = parseModelOutput(response.summary.text);
  if (!existsSync(`${dir}/classified-round1.json`) || !parsed.ok) return { ...out, usable: false };
  const raw = parsed.value.findings.map((f, k) => ({ ...f, modelId: f.id, id: `r1.f${String(k + 1).padStart(2, "0")}` }));
  const classified = readJson(`${dir}/classified-round1.json`);
  const rows = enrich(classified, raw, chance);
  const m = runMetrics(rows);
  const els = new Map(); // key -> { text, long, unlikely, expected, relation, distance, kind, inWindow }
  for (const f of classified) {
    if (f.verdict !== "verified_by_engine") continue;
    const row = rows.find((r) => r.id === f.id);
    for (const occ of f.occurrences) {
      const cells = occ.cells.map(([i, j]) => [i, j]);
      const stream = cells.map(([i]) => regionOfRun.r0 + i - 1);
      els.set(keyOf(f, occ), { text: f.text, long: row.long, unlikely: row.unlikely, expected: row.expected, kind: occ.reading?.[0] ?? null, minStreamRow: Math.min(...stream), maxStreamRow: Math.max(...stream), cols: cells.map(([, j]) => regionOfRun.c0 + j - 1), cells, id: f.id });
    }
  }
  const findingsEls = classified.filter((f) => f.verdict === "verified_by_engine").map((f) => ({ id: f.id, text: f.text, kind: f.occurrences[0]?.reading?.[0] ?? null, distance: Math.min(...f.occurrences.map((occ) => distanceToAxis(occ.cells))), occurrences: f.occurrences.length }));
  return { ...out, usable: true, m, rows, els, findingsEls, classified, proposals: rows.length };
}

const fableS2 = (() => { const regionS2 = loadRegion(here("../els-live-reading/data/region-columbia.json")); const r = load(here("../els-live-reading/controls/runs/S2"), regionS2); return r && { ...r, regionS2 }; })();
const inWindowS2 = (e) => e.minStreamRow >= region.r0 && e.maxStreamRow <= region.r1;
const baseline = new Map([...fableS2.els].filter(([, e]) => inWindowS2(e)));
const baseLongUnlikely = new Map([...baseline].filter(([, e]) => e.long && e.unlikely));

const arms = RUNS.map((run) => ({ run, ...(load(here(`./controls/runs/${run.id}`), region) ?? { usable: false, missing: true }) }));
for (const a of arms) {
  if (!a.usable) continue;
  a.relations = { crosses: 0, touches: 0, far: 0 }; a.farKinds = { R: 0, C: 0, D: 0, A: 0 }; // per proposal, by its closest occurrence to the selected occurrence
  for (const f of a.findingsEls) { const rel = relationOf(f.distance); a.relations[rel] += 1; if (rel === "far" && f.kind) a.farKinds[f.kind] += 1; }
  a.remained = [...baseline.keys()].filter((k) => a.els.has(k)).length;
  a.notProposed = baseline.size - a.remained;
  a.newVsS2 = [...a.els.keys()].filter((k) => !baseline.has(k)).length;
  a.remainedLongUnlikely = [...baseLongUnlikely.keys()].filter((k) => a.els.has(k)).length;
  a.longUnlikelyOwn = [...a.els.values()].filter((e) => e.long && e.unlikely).length;
  a.capHit = a.proposals >= a.run.cap;
  a.evaluation = evaluateTargets({ targets, classified: a.classified, byReading: ctx.byReading });
  const textOf = new Map(a.classified.map((f) => [f.id, f.text]));
  a.targetDetail = a.evaluation.map((e) => ({ target: e.target, best: e.best, texts: (e.hits[e.best] ?? []).map((id) => textOf.get(id)) }));
}
const fmt = (v, d = 2) => (v === null || v === undefined ? "—" : typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(d)) : String(v));
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");
const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n");
const label = (a) => `${a.run.id} · ${a.run.prompt === "v4" ? "הנחיה ממוקדת" : "הנחיה קודמת"} · תקרה ${a.run.cap}`;
const out = ["# EXP-18 — חלון ±10 שורות סביב הציר: הנחיה ממוקדת מול הנחיה קודמת (תיאורי, n=1 לזרוע)", ""];
out.push("תקרת ההצעות (25 או 60) היא **תקרת פלט**, לא הוכחה שאין ממצאים נוספים בחלון. הזרוע הממוקדת מסננת לפי תכנון ואינה המלצה למוצר.", "");
out.push("## 0. עלות, זמן וסיום", table(["זרוע", "stop_reason", "קלט", "פלט", "מהם חשיבה", "שניות", "USD (אצווה)", "הצעות", "הגיעה לתקרה"],
  [...arms.map((a) => [label(a), a.missing ? "לא הורצה" : a.stop_reason, fmt(a.input_tokens), fmt(a.output_tokens), fmt(a.thinking_tokens), fmt(a.seconds), fmt(a.usd, 3), a.usable ? a.proposals : "—", a.usable ? (a.capHit ? "כן" : "לא") : "—"]),
   ["S2 · הרצה המלאה של EXP-16 (33×41, רקע אחר, תקרה 60)", fableS2.stop_reason, fmt(fableS2.input_tokens), fmt(fableS2.output_tokens), fmt(fableS2.thinking_tokens), fmt(fableS2.seconds), fmt(fableS2.usd, 3), fableS2.proposals, "כן"]]), "");
out.push("## 1. מה הוצע ואומת, ורעש", table(["זרוע", "אומתו", "ELS", "ELS 5+", "ELS בלתי סבירים במקרה (E<1)", "ELS צפויים במקרה (E≥1)", "ELS קצרים (≤4)", "טקסט רגיל", "לא אומתו"],
  arms.map((a) => a.usable ? [label(a), a.m.verified, a.m.els.n, a.m.els.long, a.m.els.unlikely, a.m.noise.likelyByChance, a.m.noise.shortEls, a.m.byVerdict.plainText, a.m.notVerified] : [label(a), "ללא תשובה (max_tokens): העלות נספרה", "—", "—", "—", "—", "—", "—", "—"])), "");
out.push("## 2. מה נשאר ומה לא הוצע ביחס ל־S2 (מופעי ה־ELS של הריצה המלאה שנמצאים בתוך חלון ±10; ספירה לפי מופעים)",
  `ב־S2 יש ${fableS2.els.size} מופעי ELS מאומתים בחלון המלא, ומהם ${baseline.size} בתוך החלון הזה (${baseLongUnlikely.size} ארוכים ובלתי סבירים במקרה). "לא הוצע" אינו "לא קיים": זו תקרת פלט והצעה אחת לכל חלון.`,
  table(["זרוע", "נשארו (מתוך הבסיס)", "לא הוצעו", "ארוכים ובלתי סבירים שנשארו", "הצעות שלא היו ב־S2"],
    arms.filter((a) => a.usable).map((a) => [label(a), `${a.remained} מתוך ${baseline.size}`, a.notProposed, `${a.remainedLongUnlikely} מתוך ${baseLongUnlikely.size}`, a.newVsS2])), "");
for (const a of arms.filter((x) => x.usable)) {
  const missed = [...baseLongUnlikely].filter(([k]) => !a.els.has(k)).map(([, e]) => e.text);
  const own = [...a.els].filter(([k, e]) => !baseline.has(k) && e.long && e.unlikely).map(([, e]) => e.text);
  out.push(`* ${label(a)}: ארוכים ובלתי סבירים של S2 שלא הוצעו: ${missed.join(", ") || "—"}. ארוכים ובלתי סבירים שהוצעו ולא היו ב־S2: ${own.join(", ") || "—"}.`);
}
out.push("");
out.push("## 3. יחס למופע הנבחר, לפי הקרוב ביותר מבין מופעי ההצעה (כל ה־ELS המאומתים, כולל מה שהנחיה ממוקדת לא הייתה מבקשת)", table(["זרוע", "חוצים (מרחק 0)", "צמודים (מרחק 1)", "רחוקים (2+)", "מהרחוקים: טורים", "מהרחוקים: שורות", "מהרחוקים: אלכסונים"],
  arms.filter((a) => a.usable).map((a) => [label(a), a.relations.crosses, a.relations.touches, a.relations.far, a.farKinds.C, a.farKinds.R, a.farKinds.D + a.farKinds.A])), "");
out.push("## 4. יעדי ההערכה (נבדק רק אחרי שמירת התשובות; לא נכנס לשום בקשה)", table(["זרוע", ...targets], arms.filter((a) => a.usable).map((a) => [label(a), ...targets.map((t) => { const d = a.targetDetail.find((e) => e.target === t); return d.best ? `${d.best}${d.texts.length ? ` (${d.texts.join(", ")})` : ""}` : "none"; })])), "");
out.push("מה זה אומר ומה לא: ספירה תיאורית. אימות הוא רצף ומיקום בתורה ולא משמעות. n=1 לזרוע. ההפרש בין C1 ל־C3 מפריד בין ההנחיה לתקרה; ההפרש בין C3 ל־C2 הוא התקרה בלבד. חלון ±10 לא הוגדר כברירת מחדל.");
writeFileSync(here("./results/summary.md"), `${out.join("\n")}\n`);
writeFileSync(here("./results/summary.json"), `${JSON.stringify({ baseline: { s2_els_total: fableS2.els.size, in_window: baseline.size, long_unlikely_in_window: baseLongUnlikely.size }, arms: arms.map(({ run, els, rows, classified, evaluation, m, ...rest }) => ({ id: run.id, prompt: run.prompt, cap: run.cap, ...rest, metrics: m ?? null, els_n: els?.size ?? null, targets: evaluation?.map((e) => ({ target: e.target, best: e.best })) ?? null })) }, null, 2)}\n`);
process.stdout.write(out.join("\n") + "\n");
