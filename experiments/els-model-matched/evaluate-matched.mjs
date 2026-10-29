#!/usr/bin/env node
// EXP-17 report stage: reads the saved answers of the 16 matched runs and the saved Fable runs of the same requests, and writes results/summary.{md,json}. Descriptive counts only (n=1 per cell).
// The evaluation targets are read here, after the answers were saved, from the data file of the live-reading experiment; they are never part of a request or of the runner's call path.
//   node experiments/els-model-matched/evaluate-matched.mjs [--page public/tzofen.html]
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ARMS, BASES, RUNS } from "./lib/plan.mjs";
import { loadContext, regionPathOf } from "../els-live-reading/lib/context.mjs";
import { enrich, runMetrics, torahChanceModel } from "../els-live-reading/lib/metrics.mjs";
import { parseModelOutput } from "../els-live-reading/lib/validate.mjs";
import { evaluateTargets } from "../els-live-reading/lib/evaluate.mjs";
import { runById } from "../els-live-reading/lib/plan.mjs";
import { pageLetters } from "../els-live-reading/build-windows.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const args = Object.fromEntries(process.argv.slice(2).map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]] : null)).filter(Boolean));
const page = args.page || "public/tzofen.html";
const chance = torahChanceModel(pageLetters(page), (text) => createHash("md5").update(text, "utf8").digest("hex"));
const targets = readJson(here("../els-live-reading/evaluation/targets.json")).targets;

/** The saved record of one run directory, or null when it never produced an answer file. */
function load(dir, ctx) {
  const responsePath = `${dir}/round1-response.json`;
  if (!existsSync(responsePath)) return null;
  const response = readJson(responsePath);
  const usage = response.summary.usage ?? {};
  const base = { stop_reason: response.summary.stop_reason, usd: response.cost?.usd ?? null, seconds: Math.round((response.ms ?? 0) / 1000), input_tokens: usage.input_tokens ?? null, output_tokens: usage.output_tokens ?? null, thinking_tokens: usage.output_tokens_details?.thinking_tokens ?? 0, model: response.summary.model };
  const parsed = parseModelOutput(response.summary.text);
  if (!existsSync(`${dir}/classified-round1.json`) || !parsed.ok) return { ...base, usable: false };
  const raw = parsed.value.findings.map((f, k) => ({ ...f, modelId: f.id, id: `r1.f${String(k + 1).padStart(2, "0")}` }));
  const classified = readJson(`${dir}/classified-round1.json`);
  const rows = enrich(classified, raw, chance);
  const m = runMetrics(rows);
  const key = (f, occ) => `${f.text}|${occ.params.start}|${occ.params.skip}|${occ.params.dir}`;
  const els = new Set(), interesting = new Set();
  for (const f of classified) if (f.verdict === "verified_by_engine") {
    const row = rows.find((r) => r.id === f.id);
    for (const occ of f.occurrences) { els.add(key(f, occ)); if (row.long && row.unlikely) interesting.add(key(f, occ)); }
  }
  const evaluation = ctx.region.planted || ctx.region.name === "v1" ? null : evaluateTargets({ targets, classified, byReading: ctx.byReading });
  return { ...base, usable: true, m, els, interesting, evaluation, proposals: rows.length };
}

const results = [];
for (const baseId of BASES) {
  const ctx = loadContext(page, { regionPath: regionPathOf(runById(baseId).region) });
  const fable = load(here(`../els-live-reading/controls/runs/${baseId}`), ctx);
  results.push({ base: baseId, arm: "fable (saved)", model: fable?.model ?? "claude-fable-5-1", ...fable });
  for (const arm of Object.keys(ARMS)) {
    const run = RUNS.find((r) => r.base === baseId && r.arm === arm);
    const item = load(here(`./controls/runs/${run.id}`), ctx);
    results.push({ base: baseId, arm, model: run.model, ...(item ?? { usable: false, missing: true }) });
  }
}
for (const r of results) {
  const fable = results.find((x) => x.base === r.base && x.arm === "fable (saved)");
  if (r.usable && fable?.usable && r !== fable) {
    r.shared_els_with_fable = [...r.els].filter((k) => fable.els.has(k)).length;
    r.shared_interesting_with_fable = [...r.interesting].filter((k) => fable.interesting.has(k)).length;
    r.share_of_fable_els = fable.els.size ? r.els.size / fable.els.size : null;
  }
}

const fmt = (v, d = 2) => (v === null || v === undefined ? "—" : typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(d)) : String(v));
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");
const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n");
const out = ["# EXP-17 — אותה בקשה, מודלים שונים: סיכום (תיאורי, n=1 לכל תא)", ""];
out.push("## 0. עלות, זמן וסיום", table(["חלון", "זרוע", "מודל", "stop_reason", "קלט", "פלט", "מהם חשיבה", "שניות", "USD (אצווה)"],
  results.map((r) => [r.base, r.arm, r.model, r.missing ? "לא הורצה" : r.stop_reason, fmt(r.input_tokens), fmt(r.output_tokens), fmt(r.thinking_tokens), fmt(r.seconds), fmt(r.usd, 3)])), "");
out.push("## 1. מה הוצע ומה אומת מול המנוע הקנוני", table(["חלון", "זרוע", "שימושית", "הצעות", "אומתו", "ELS", "ELS 5+", "ELS בלתי סבירים במקרה (E<1)", "צפוי במקרה (E≥1)", "טקסט רגיל", "לא אומתו"],
  results.map((r) => r.usable ? [r.base, r.arm, "כן", r.m.proposals, r.m.verified, r.m.els.n, r.m.els.long, r.m.els.unlikely, r.m.noise.likelyByChance, r.m.byVerdict.plainText, r.m.notVerified] : [r.base, r.arm, r.missing ? "לא הורצה" : "לא", "—", "—", "—", "—", "—", "—", "—", "—"])), "");
out.push("## 2. חפיפה עם הצעות ה־ELS של Fable באותו חלון (זהות: טקסט+התחלה+דילוג+כיוון)", table(["חלון", "זרוע", "ELS מאומתים (מופעים)", "משותפים עם Fable", "מתוך ELS של Fable", "ארוכים ובלתי סבירים: שלו", "מהם משותפים", "היקף ELS ביחס ל־Fable"],
  results.filter((r) => r.usable && r.arm !== "fable (saved)").map((r) => { const f = results.find((x) => x.base === r.base && x.arm === "fable (saved)"); return [r.base, r.arm, r.els.size, fmt(r.shared_els_with_fable), f?.els?.size ?? "—", r.interesting.size, fmt(r.shared_interesting_with_fable), r.share_of_fable_els === null || r.share_of_fable_els === undefined ? "—" : `${Math.round(100 * r.share_of_fable_els)}%`]; })), "");
const evalRows = results.filter((r) => r.usable && r.evaluation);
if (evalRows.length) {
  out.push("## 3. יעדי ההערכה בקולומביה (נבדק רק אחרי שמירת התשובות; לא נכנס לשום בקשה)", table(["חלון", "זרוע", ...targets], evalRows.map((r) => [r.base, r.arm, ...targets.map((t) => r.evaluation.find((e) => e.target === t)?.best ?? "none")])), "");
}
const fableCount = (base) => results.find((x) => x.base === base && x.arm === "fable (saved)")?.els?.size ?? 0;
const verdictFor = (arm) => { const cells = BASES.map((b) => results.find((x) => x.base === b && x.arm === arm)); const ok = cells.filter((c) => c?.usable && fableCount(c.base) && c.els.size >= 0.5 * fableCount(c.base)).length; const usable = cells.filter((c) => c?.usable).length; return { arm, usable, atLeastHalfOfFable: ok }; };
const rule = Object.keys(ARMS).map(verdictFor);
out.push("## 4. הכלל שנקבע מראש: האם הזרוע מפיקה ELS בהיקף של לפחות 50% ממה ש־Fable הפיק באותו חלון, ב־3 מתוך 4 חלונות?",
  table(["זרוע", "חלונות עם תשובה שמישה", "חלונות עם ≥50% מ־Fable", "הכלל מתקיים"], rule.map((v) => [v.arm, `${v.usable} מתוך 4`, `${v.atLeastHalfOfFable} מתוך 4`, v.atLeastHalfOfFable >= 3 ? "כן" : "לא"])), "");
out.push("מה זה אומר ומה לא: ספירה תיאורית בלבד. כל הצעה אומתה ברצף ובמיקום מול המנוע הקנוני, אבל אימות אינו משמעות: באזורים אקראיים Fable הפיק אותות באותו גודל (EXP-16). n=1 לכל תא, בקשה אחת לכל חלון, והבדל בין זרועות כולל גם את כמות החשיבה ולא רק את המודל.");
writeFileSync(here("./results/summary.md"), `${out.join("\n")}\n`);
writeFileSync(here("./results/summary.json"), `${JSON.stringify({ rule, cells: results.map(({ els, interesting, m, ...rest }) => ({ ...rest, els_n: els?.size ?? null, interesting_n: interesting?.size ?? null, metrics: m ?? null })) }, null, 2)}\n`);
process.stdout.write(out.join("\n") + "\n");
