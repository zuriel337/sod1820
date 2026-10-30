#!/usr/bin/env node
// EXP-22: both results on the matrix, side by side in one self-contained page (no network, no site code). Run after evaluate.mjs.
//   node experiments/els-axis-addendum/matrix.mjs   -> results/matrix-compare.html
// Colours: U (uniform, the existing reading) = blue, A (axis-deepening addendum) = orange, found by both = split blue/orange; the earlier live run L is a toggle (grey outline);
// the six saved findings (an evaluation target revealed only after the runs) are green corner marks. The selected occurrence (the axis) is gold.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { context } from "./lib/arms.mjs";
import { evaluate } from "./evaluate.mjs";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

export function matrixData() {
  const ctx = context();
  const s = evaluate();
  const slim = (run) => (run.findings ?? []).map((f) => ({ id: f.id, text: f.text, line: f.line, skip: f.skip, kind: f.kind, d: f.distance, band: f.band, cells: f.cells, e: f.chance?.expected_occurrences ?? null, unlikely: f.chance?.unlikely_by_chance === true }));
  return {
    rows: ctx.region.rows, r0: ctx.data.r0, c0: ctx.data.c0, width: ctx.data.width, axis: ctx.region.axisCells, radius: s.near_radius,
    runs: { U: { label: s.runs.U.label, state: s.runs.U.state, usd: s.runs.U.usd, findings: slim(s.runs.U) }, A: { label: s.runs.A.label, state: s.runs.A.state, usd: s.runs.A.usd, findings: slim(s.runs.A) }, L: { label: s.runs.L.label, state: s.runs.L.state, usd: s.runs.L.usd, findings: slim(s.runs.L) } },
    saved: s.saved_targets.map((t) => ({ text: t.text, kind: t.kind, cells: t.cells, d: t.distance, U: t.U.status, A: t.A.status, L: t.L.status })),
    stats: { U: { els: s.runs.U.els, rows: s.runs.U.source_rows, margin: s.runs.U.margin?.length ?? null }, A: { els: s.runs.A.els, rows: s.runs.A.source_rows, margin: s.runs.A.margin?.length ?? null } },
  };
}

export function renderHtml(data) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EXP-22 — שתי הקריאות על המטריצה</title>
<style>
:root { --bg:#fafaf7; --fg:#1d1d1b; --muted:#6b6b66; --line:#d8d6cc; --cell:#fff; --axis:#e0a800; --u:#2563eb; --a:#ea580c; --l:#7c7c74; --saved:#16a34a; --panel:#fff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#16161a; --fg:#ececea; --muted:#9a9a94; --line:#33333a; --cell:#1e1e24; --axis:#f2c230; --u:#6aa0ff; --a:#ff8a4c; --l:#a0a098; --saved:#4ade80; --panel:#1e1e24; } }
:root[data-theme="dark"] { --bg:#16161a; --fg:#ececea; --muted:#9a9a94; --line:#33333a; --cell:#1e1e24; --axis:#f2c230; --u:#6aa0ff; --a:#ff8a4c; --l:#a0a098; --saved:#4ade80; --panel:#1e1e24; }
* { box-sizing: border-box; }
body { margin:0; padding:16px; background:var(--bg); color:var(--fg); font:15px/1.5 system-ui, "Segoe UI", Arial, sans-serif; }
h1 { font-size:20px; margin:0 0 4px; } .sub { color:var(--muted); margin:0 0 12px; max-width:70ch; }
.bar { display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; margin:8px 0 12px; }
.bar label { display:inline-flex; gap:6px; align-items:center; cursor:pointer; }
.sw { display:inline-block; width:14px; height:14px; border-radius:3px; vertical-align:-2px; }
.layout { display:grid; grid-template-columns: minmax(0,1fr) 340px; gap:16px; align-items:start; }
@media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
.gridwrap { overflow:auto; border:1px solid var(--line); border-radius:8px; padding:8px; background:var(--panel); }
.grid { display:grid; direction:rtl; gap:1px; width:max-content; }
.c { width:22px; height:22px; display:flex; align-items:center; justify-content:center; font:600 13px/1 "Frank Ruhl Libre", "David", serif; background:var(--cell); color:var(--fg); position:relative; border-radius:2px; }
.c.ax { box-shadow: inset 0 0 0 2px var(--axis); }
.c.u { background: color-mix(in srgb, var(--u) 34%, var(--cell)); }
.c.a { background: color-mix(in srgb, var(--a) 34%, var(--cell)); }
.c.u.a { background: linear-gradient(135deg, color-mix(in srgb, var(--u) 45%, var(--cell)) 50%, color-mix(in srgb, var(--a) 45%, var(--cell)) 50%); }
.c.l { outline:1.5px dashed var(--l); outline-offset:-2px; }
.c.s::after { content:""; position:absolute; top:1px; inset-inline-end:1px; width:6px; height:6px; border-radius:50%; background:var(--saved); }
.c.hl { box-shadow: inset 0 0 0 3px var(--fg); z-index:1; }
.c.out { opacity:.82; }
.rowlab, .collab { font-size:10px; color:var(--muted); display:flex; align-items:center; justify-content:center; }
.panel { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:10px; margin-bottom:12px; }
.panel h2 { font-size:15px; margin:0 0 6px; } .panel .k { color:var(--muted); font-size:13px; }
.list { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
.pill { border:1px solid var(--line); border-radius:999px; padding:2px 8px; font-size:13px; cursor:pointer; background:var(--cell); }
.pill.u { border-color:var(--u); } .pill.a { border-color:var(--a); } .pill.l { border-color:var(--l); border-style:dashed; }
.pill.row { font-style:italic; } .pill small { color:var(--muted); }
.pill.on { background:color-mix(in srgb, var(--fg) 12%, var(--cell)); }
table { border-collapse:collapse; width:100%; font-size:13px; } td, th { border-bottom:1px solid var(--line); padding:3px 4px; text-align:start; }
.legend { color:var(--muted); font-size:13px; max-width:80ch; }
</style>
</head>
<body>
<h1>שתי הקריאות על המטריצה — „יום משיח בא”</h1>
<p class="sub">אותו חלון (33×41, שורות ${data.r0}–${data.r0 + data.rows.length - 1}, עמודות ${data.c0}–${data.c0 + data.rows[0].length - 1}, רוחב ${data.width}), אותה תקרה (25), אותו מודל. <b style="color:var(--u)">כחול = הקריאה הקיימת (uniform)</b>, <b style="color:var(--a)">כתום = עם תוספת ההעמקה</b>, מפוצל = הוצע בשתיהן (אותן אותיות על אותם תאים). הציר (המופע הנבחר) בזהב. n=1 לכל זרוע; זו תצפית, לא מדידה של אפקט.</p>
<div class="bar" role="group" aria-label="שכבות">
  <label><input type="checkbox" id="tu" checked><span class="sw" style="background:var(--u)"></span> uniform</label>
  <label><input type="checkbox" id="ta" checked><span class="sw" style="background:var(--a)"></span> תוספת</label>
  <label><input type="checkbox" id="tl"><span class="sw" style="border:2px dashed var(--l)"></span> ריצה חיה קודמת (ייחוס)</label>
  <label><input type="checkbox" id="ts" checked><span class="sw" style="background:var(--saved);border-radius:50%"></span> ששת הממצאים השמורים (נחשפו אחרי הריצות)</label>
  <label><input type="checkbox" id="tm"> הדגש שוליים (מרחק &gt; ${data.radius})</label>
</div>
<div class="layout">
  <div class="gridwrap"><div class="grid" id="grid" role="img" aria-label="מטריצת האותיות עם ההצעות"></div></div>
  <div>
    <div class="panel" id="pU"></div>
    <div class="panel" id="pA"></div>
    <div class="panel" id="pS"></div>
    <div class="panel" id="pL" hidden></div>
  </div>
</div>
<p class="legend">אימות = האותיות והמיקום בזרם התורה, ובדילוג 2 ומעלה גם מופע במנוע ה־ELS הקנוני; לא משמעות ולא חריגות סטטיסטית. שורות מקור (טקסט רגיל, דילוג 1) מסומנות בנטוי. הצופן השמור ידוע, והרדיוס 8 נקבע ממנו: פגיעה בו היא בדיקת רגרסיה ולא גילוי עיוור. לחיצה על הצעה מדגישה את תאיה.</p>
<script>
const DATA = ${json};
const W = DATA.rows[0].length, H = DATA.rows.length;
const key = (i, j) => i + "," + j;
const axis = new Set(DATA.axis.map(([i, j]) => key(i, j)));
const grid = document.getElementById("grid");
grid.style.gridTemplateColumns = "repeat(" + W + ", 22px)";
const cells = new Map();
for (let i = 1; i <= H; i++) for (let j = 1; j <= W; j++) {
  const d = document.createElement("div"); d.className = "c" + (axis.has(key(i, j)) ? " ax" : ""); d.textContent = DATA.rows[i - 1][j - 1]; d.title = "R" + String(i).padStart(2, "0") + " C" + String(j).padStart(2, "0");
  grid.appendChild(d); cells.set(key(i, j), d);
}
const marks = (list) => { const m = new Set(); for (const f of list) for (const [i, j] of f.cells) m.add(key(i, j)); return m; };
const sets = { u: marks(DATA.runs.U.findings), a: marks(DATA.runs.A.findings), l: marks(DATA.runs.L.findings), s: new Set(DATA.saved.flatMap((t) => t.cells.map(([i, j]) => key(i, j)))) };
const margin = (i, j) => { let best = 1e9; for (const [a, b] of DATA.axis) best = Math.min(best, Math.max(Math.abs(i - a), Math.abs(j - b))); return best > DATA.radius; };
const on = (id) => document.getElementById(id).checked;
function paint() {
  for (const [k, el] of cells) {
    const [i, j] = k.split(",").map(Number);
    el.classList.toggle("u", on("tu") && sets.u.has(k)); el.classList.toggle("a", on("ta") && sets.a.has(k));
    el.classList.toggle("l", on("tl") && sets.l.has(k)); el.classList.toggle("s", on("ts") && sets.s.has(k));
    el.classList.toggle("out", on("tm") && !margin(i, j));
  }
  document.getElementById("pL").hidden = !on("tl");
}
for (const id of ["tu", "ta", "tl", "ts", "tm"]) document.getElementById(id).addEventListener("change", paint);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
let sel = [];
function highlight(f) { for (const k of sel) cells.get(k)?.classList.remove("hl"); sel = f ? f.cells.map(([i, j]) => key(i, j)) : []; for (const k of sel) cells.get(k)?.classList.add("hl"); }
function pills(run, cls) {
  const list = run.findings.slice().sort((x, y) => x.d - y.d || x.text.localeCompare(y.text));
  return '<div class="list">' + list.map((f, n) => '<span class="pill ' + cls + (f.kind === "source_row" ? " row" : "") + '" data-n="' + n + '" title="' + esc(f.line) + (f.e != null ? " · E=" + f.e : "") + '">' + esc(f.text) + ' <small>' + (f.kind === "source_row" ? "שורה" : "ELS") + " · " + f.d + '</small></span>').join("") + "</div>";
}
function panel(id, run, cls, title) {
  const el = document.getElementById(id), f = run.findings;
  const near = f.filter((x) => x.d <= DATA.radius).length, far = f.length - near, rows = f.filter((x) => x.kind === "source_row").length;
  el.innerHTML = "<h2>" + title + '</h2><div class="k">' + (run.state === "COMPLETE" ? f.length + " הצעות · ELS " + (f.length - rows) + " · שורות מקור " + rows + " · סביבה " + near + " · שוליים " + far : "מצב: " + run.state) + (run.usd != null ? " · $" + Number(run.usd).toFixed(2) : "") + "</div>" + pills(run, cls);
  const sorted = f.slice().sort((x, y) => x.d - y.d || x.text.localeCompare(y.text));
  el.querySelectorAll(".pill").forEach((p) => p.addEventListener("click", () => { el.querySelectorAll(".pill").forEach((q) => q.classList.remove("on")); p.classList.add("on"); highlight(sorted[Number(p.dataset.n)]); }));
}
panel("pU", DATA.runs.U, "u", "U — הקריאה הקיימת (uniform)");
panel("pA", DATA.runs.A, "a", "A — עם תוספת ההעמקה");
panel("pL", DATA.runs.L, "l", "ריצה חיה קודמת (uniform) — ייחוס");
const NAME = { exact: "נמצא", overlap: "חפיפה", crossed: "נחתך בתא יחיד", same_text_elsewhere: "במקום אחר", not_proposed: "לא הוצע", no_answer: "—" };
document.getElementById("pS").innerHTML = "<h2>הצופן השמור (יעד הערכה)</h2><table><tr><th>ממצא</th><th>מרחק</th><th>U</th><th>A</th></tr>" + DATA.saved.map((t) => "<tr><td>" + esc(t.text) + (t.kind === "source_row" ? " <small>(שורה)</small>" : "") + "</td><td>" + t.d + "</td><td>" + NAME[t.U] + "</td><td>" + NAME[t.A] + "</td></tr>").join("") + "</table>";
paint();
</script>
</body>
</html>
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(here("./results/"), { recursive: true });
  const html = renderHtml(matrixData());
  writeFileSync(here("./results/matrix-compare.html"), html);
  process.stdout.write(`matrix-compare.html written (${html.length} bytes)\n`);
}
