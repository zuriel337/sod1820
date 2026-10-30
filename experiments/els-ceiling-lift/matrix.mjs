#!/usr/bin/env node
// EXP-24: the results on the matrix, one self-contained page (no network, no site code). Run after evaluate.mjs.
//   node experiments/els-ceiling-lift/matrix.mjs   -> results/matrix-compare.html
// Colours: the previous run of the same groups (EXP-23 arm A, ceiling 12) = blue, this run (ceiling 40) = orange, proposed by both on the same cells = split blue/orange. The six saved findings
// (revealed only after the runs) are green corner marks; the selected occurrence (the axis) is gold. Choose a group to see its lines on the matrix. Source rows (plain text, not ELS) are italic.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { context } from "../els-axis-addendum/lib/arms.mjs";
import { buildRuns } from "./lib/arms.mjs";
import { evaluate } from "./evaluate.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

export async function matrixData() {
  const ctx = context();
  const { groups } = await buildRuns();
  const s = await evaluate();
  const byId = new Map(ctx.lines.map((l) => [l.id, l]));
  const runs = [];
  for (const [group, { P, L }] of Object.entries(s.runs)) for (const [arm, r] of [["P", P], ["L", L]]) runs.push({ run: r.run ?? `${group}A`, group, arm, state: r.state, reason: r.reason ?? null, usd: r.usd, proposals: r.summary?.proposals ?? 0, reached: r.cap_reached ?? null,
    findings: (r.findings ?? []).map((f) => ({ id: f.id, rank: f.rank, text: f.text, line: f.line, kind: f.kind, cells: f.cells, dup: f.duplicate })) });
  return {
    rows: ctx.region.rows, r0: ctx.data.r0, c0: ctx.data.c0, width: ctx.data.width, axis: ctx.region.axisCells, radius: 8, ceilings: s.ceiling,
    groups: groups.map((g) => ({ id: g.id, first: g.ids[0], last: g.ids[g.ids.length - 1], lines: g.ids, cells: [...new Set(g.ids.flatMap((id) => byId.get(id).cells.map(([i, j]) => `${i},${j}`)))] })),
    runs, saved: s.targets.map((t) => ({ text: t.text, kind: t.kind, cells: t.cells, group: t.group, P: t.P.status, L: t.L.status, Prel: t.P.relations?.[0] ?? null, Lrel: t.L.relations?.[0] ?? null, Lranks: t.L.ranks })), verdict: s.interpretation.verdict,
  };
}

export function renderHtml(data) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EXP-24 — תקרה מורמת על המטריצה</title>
<style>
:root { --bg:#fafaf7; --fg:#1d1d1b; --muted:#6b6b66; --line:#d8d6cc; --cell:#fff; --axis:#e0a800; --a:#2563eb; --b:#ea580c; --saved:#16a34a; --panel:#fff; --grp:#e6e2d3; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#16161a; --fg:#ececea; --muted:#9a9a94; --line:#33333a; --cell:#1e1e24; --axis:#f2c230; --a:#6aa0ff; --b:#ff8a4c; --saved:#4ade80; --panel:#1e1e24; --grp:#2f2f38; } }
:root[data-theme="dark"] { --bg:#16161a; --fg:#ececea; --muted:#9a9a94; --line:#33333a; --cell:#1e1e24; --axis:#f2c230; --a:#6aa0ff; --b:#ff8a4c; --saved:#4ade80; --panel:#1e1e24; --grp:#2f2f38; }
* { box-sizing:border-box; }
body { margin:0; padding:16px; background:var(--bg); color:var(--fg); font:15px/1.5 system-ui, "Segoe UI", Arial, sans-serif; }
h1 { font-size:20px; margin:0 0 4px; } .sub { color:var(--muted); margin:0 0 12px; max-width:78ch; }
.bar { display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; margin:8px 0 12px; }
.bar label { display:inline-flex; gap:6px; align-items:center; cursor:pointer; }
.sw { display:inline-block; width:14px; height:14px; border-radius:3px; vertical-align:-2px; }
.layout { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:16px; align-items:start; }
@media (max-width:900px) { .layout { grid-template-columns:1fr; } }
.gridwrap { overflow:auto; border:1px solid var(--line); border-radius:8px; padding:8px; background:var(--panel); }
.grid { display:grid; direction:rtl; gap:1px; width:max-content; }
.c { width:22px; height:22px; display:flex; align-items:center; justify-content:center; font:600 13px/1 "Frank Ruhl Libre","David",serif; background:var(--cell); color:var(--fg); position:relative; border-radius:2px; }
.c.g { background:var(--grp); }
.c.ax { box-shadow:inset 0 0 0 2px var(--axis); }
.c.a { background:color-mix(in srgb, var(--a) 36%, var(--cell)); }
.c.b { background:color-mix(in srgb, var(--b) 36%, var(--cell)); }
.c.a.b { background:linear-gradient(135deg, color-mix(in srgb, var(--a) 48%, var(--cell)) 50%, color-mix(in srgb, var(--b) 48%, var(--cell)) 50%); }
.c.s::after { content:""; position:absolute; top:1px; inset-inline-end:1px; width:6px; height:6px; border-radius:50%; background:var(--saved); }
.c.hl { box-shadow:inset 0 0 0 3px var(--fg); z-index:1; }
.panel { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px; margin-bottom:12px; }
.panel h2 { font-size:15px; margin:0 0 6px; } .k { color:var(--muted); font-size:13px; }
.list { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
.pill { border:1px solid var(--line); border-radius:999px; padding:2px 8px; font-size:13px; cursor:pointer; background:var(--cell); }
.pill.a { border-color:var(--a); } .pill.b { border-color:var(--b); } .pill.row { font-style:italic; } .pill small { color:var(--muted); }
.pill.on { background:color-mix(in srgb, var(--fg) 12%, var(--cell)); } .pill.beyond { border-style:dashed; border-width:2px; }
table { border-collapse:collapse; width:100%; font-size:13px; } td, th { border-bottom:1px solid var(--line); padding:3px 4px; text-align:start; }
select { font:inherit; padding:2px 6px; } .legend { color:var(--muted); font-size:13px; max-width:84ch; }
</style>
</head>
<body>
<h1>תקרה מורמת (12 ← 40) — „יום משיח בא”</h1>
<p class="sub">ניסוי אבחוני צר (בחירת הקבוצות מוכוונת־הערכה, לא גילוי עיוור): אותן ארבע קבוצות של 8 קווים, אותה הנחיה בסיסית, השינוי היחיד בהנחיה הוא התקרה. <b style="color:var(--a)">כחול = הריצה הקודמת (EXP-23, תקרה 12)</b>, <b style="color:var(--b)">כתום = הריצה הזו (תקרה 40)</b>, מפוצל = הוצע בשתיהן על אותם תאים. הציר בזהב; הממצאים השמורים — נקודות ירוקות. n=1 לכל קבוצה: תצפית, לא מדידה.</p>
<div class="bar" role="group" aria-label="שכבות">
  <label>קבוצה: <select id="grp"></select></label>
  <label><input type="checkbox" id="ta" checked><span class="sw" style="background:var(--a)"></span> קודם (12)</label>
  <label><input type="checkbox" id="tb" checked><span class="sw" style="background:var(--b)"></span> תקרה 40</label>
  <label><input type="checkbox" id="ts" checked><span class="sw" style="background:var(--saved);border-radius:50%"></span> הממצאים השמורים</label>
  <label><input type="checkbox" id="tg" checked><span class="sw" style="background:var(--grp)"></span> קווי הקבוצה הנבחרת</label>
</div>
<div class="layout">
  <div class="gridwrap"><div class="grid" id="grid" role="img" aria-label="מטריצת האותיות עם ההצעות"></div></div>
  <div><div class="panel" id="pA"></div><div class="panel" id="pB"></div><div class="panel" id="pS"></div></div>
</div>
<p class="legend">אימות = האותיות והמיקום בזרם, ובדילוג 2 ומעלה גם מופע במנוע ה־ELS הקנוני; לא משמעות. שורות מקור (טקסט רגיל) בנטוי. מסגרת מקווקווה = הצעה במקום 13 ומעלה ברשימת המודל (מעבר לתקרה הקודמת; הסדר ברשימה אינו דירוג). הצופן השמור ידוע: פגיעה בו היא בדיקת אבחון ולא גילוי עיוור. לחיצה על הצעה מדגישה את תאיה.</p>
<script>
const DATA = ${json};
const W = DATA.rows[0].length, H = DATA.rows.length, key = (i, j) => i + "," + j;
const axis = new Set(DATA.axis.map(([i, j]) => key(i, j)));
const grid = document.getElementById("grid"); grid.style.gridTemplateColumns = "repeat(" + W + ", 22px)";
const cells = new Map();
for (let i = 1; i <= H; i++) for (let j = 1; j <= W; j++) { const d = document.createElement("div"); d.className = "c" + (axis.has(key(i, j)) ? " ax" : ""); d.textContent = DATA.rows[i - 1][j - 1]; d.title = "R" + String(i).padStart(2, "0") + " C" + String(j).padStart(2, "0"); grid.appendChild(d); cells.set(key(i, j), d); }
const saved = new Set(DATA.saved.flatMap((t) => t.cells.map(([i, j]) => key(i, j))));
const sel = document.getElementById("grp");
sel.innerHTML = '<option value="*">כל הקבוצות</option>' + DATA.groups.map((g) => '<option value="' + g.id + '">' + g.id + " · " + g.first + ".." + g.last + "</option>").join("");
const on = (id) => document.getElementById(id).checked;
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const view = () => DATA.runs.filter((r) => sel.value === "*" || r.group === sel.value);
function paint() {
  const sets = { P: new Set(), L: new Set() };
  for (const r of view()) for (const f of r.findings) for (const [i, j] of f.cells) sets[r.arm].add(key(i, j));
  const grp = new Set(sel.value === "*" ? [] : DATA.groups.find((g) => g.id === sel.value).cells);
  for (const [k, el] of cells) { el.classList.toggle("a", on("ta") && sets.P.has(k)); el.classList.toggle("b", on("tb") && sets.L.has(k)); el.classList.toggle("s", on("ts") && saved.has(k)); el.classList.toggle("g", on("tg") && grp.has(k)); }
  panels();
}
let sel2 = [];
function highlight(f) { for (const k of sel2) cells.get(k)?.classList.remove("hl"); sel2 = f ? f.cells.map(([i, j]) => key(i, j)) : []; for (const k of sel2) cells.get(k)?.classList.add("hl"); }
function panel(id, arm, title, cls) {
  const runs = view().filter((r) => r.arm === arm), list = runs.flatMap((r) => r.findings.map((f) => ({ ...f, group: r.group })));
  const el = document.getElementById(id), rows = list.filter((f) => f.kind === "source_row").length;
  el.innerHTML = "<h2>" + title + '</h2><div class="k">' + runs.length + " ריצות · " + list.length + " הצעות · ELS " + (list.length - rows) + " · שורות מקור " + rows + (runs.some((r) => r.state !== "COMPLETE") ? " · לא הושלמו: " + runs.filter((r) => r.state !== "COMPLETE").map((r) => r.group + "=" + r.state + (r.reason ? "(" + r.reason + ")" : "")).join(",") : "") + (runs.some((r) => r.reached) ? " · הגיעו לתקרה: " + runs.filter((r) => r.reached).map((r) => r.group).join(",") : "") + '</div><div class="list">' + list.map((f, n) => '<span class="pill ' + cls + (f.kind === "source_row" ? " row" : "") + (arm === "L" && f.rank > DATA.ceilings.exp23 ? " beyond" : "") + '" data-n="' + n + '" title="' + esc(f.group + " · " + f.line + " · מקום " + f.rank) + '">' + esc(f.text) + "</span>").join("") + "</div>";
  el.querySelectorAll(".pill").forEach((p) => p.addEventListener("click", () => { document.querySelectorAll(".pill").forEach((q) => q.classList.remove("on")); p.classList.add("on"); highlight(list[Number(p.dataset.n)]); }));
}
function panels() { panel("pA", "P", "קודם — EXP-23 A (תקרה " + DATA.ceilings.exp23 + ")", "a"); panel("pB", "L", "עכשיו — תקרה " + DATA.ceilings.exp24, "b"); }
const NAME = { exact: "נמצא", overlap: "חפיפה", crossed: "נחתך בתא יחיד", same_text_elsewhere: "במקום אחר", not_proposed: "לא הוצע", INCOMPLETE: "נקטע / נדחה", FAILED: "נכשל", no_run: "—" };
const label = (st, rel) => (st === "overlap" && rel && rel.startsWith("מכילה") ? "מוכל בהצעה ארוכה יותר (לא שחזור)" : (NAME[st] ?? st));
document.getElementById("pS").innerHTML = "<h2>הממצאים השמורים (יעד הערכה)</h2><table><tr><th>ממצא</th><th>קבוצה</th><th>קודם (12)</th><th>עכשיו (40)</th></tr>" + DATA.saved.map((t) => "<tr><td>" + esc(t.text) + (t.kind === "source_row" ? " <small>(שורה)</small>" : "") + "</td><td>" + t.group + "</td><td>" + label(t.P, t.Prel) + "</td><td>" + label(t.L, t.Lrel) + (t.Lranks.length ? " <small>(מקום " + t.Lranks.join(",") + ")</small>" : "") + "</td></tr>").join("") + "</table>";
for (const id of ["grp", "ta", "tb", "ts", "tg"]) document.getElementById(id).addEventListener("change", paint);
paint();
</script>
</body>
</html>
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(here("./results/"), { recursive: true });
  const html = renderHtml(await matrixData());
  writeFileSync(here("./results/matrix-compare.html"), html);
  process.stdout.write(`matrix-compare.html written (${html.length} bytes)\n`);
}
