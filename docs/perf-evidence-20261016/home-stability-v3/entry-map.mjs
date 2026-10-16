// What a first entry asks for, from a runner load-mode result (runner.mjs --mode load, with --traceDir for the script costs): the app's own files in waves with their gzip
// size, the reads in order with repeated shapes, and what the scripts cost to compile and run (CPU throttled x4, from a Chromium trace). Read-only, no network.
//   node entry-map.mjs --in <load.json> --arm A=<dist dir>[,B=<dist dir>] [--run <n>] [--gap 300]
// A "wave" is a run of script requests whose starts are less than --gap ms apart; a new wave begins when the page asks again after a pause (the next lazy import).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const argv = process.argv.slice(2), A = Object.fromEntries(argv.reduce((a, v, i, all) => v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]]] : a, []));
if (!A.in || !A.arm) { console.error("usage: node entry-map.mjs --in <load.json> --arm A=<dist>[,B=<dist>] [--run n] [--gap ms]"); process.exit(2); }
const dists = Object.fromEntries(A.arm.split(",").map((s) => s.split("=")));
const data = JSON.parse(fs.readFileSync(A.in, "utf8")), GAP = +(A.gap || 300);
const gz = (dist, file) => { const p = path.join(dist, "assets", file); return fs.existsSync(p) ? zlib.gzipSync(fs.readFileSync(p), { level: 9 }).length : 0; };
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

for (const arm of Object.keys(dists)) {
  const runs = data.runs.filter((r) => r.arm === arm && r.valid);
  if (!runs.length) continue;
  // the run whose usable time is the median is the one drawn; the totals are medians over every valid run
  const order = [...runs].sort((a, b) => a.readyMs.usable - b.readyMs.usable), drawn = A.run ? runs[+A.run - 1] : order[Math.floor(order.length / 2)];
  const scripts = drawn.assets.filter((a) => a.type === "script").sort((a, b) => a.start - b.start);
  const waves = []; for (const s of scripts) { const w = waves.at(-1); if (w && s.start - w.lastStart < GAP) { w.files.push(s); w.lastStart = s.start; } else waves.push({ files: [s], lastStart: s.start }); }
  console.log(`\n## arm ${arm} (${runs.length} valid runs; drawn: usable ${drawn.readyMs.usable} ms, LCP ${drawn.lcp?.t} ms)`);
  console.log(`totals (median of runs): requests ${median(runs.map((r) => r.reqCount))}, reads ${median(runs.map((r) => r.reads.total))}, scripts ${median(runs.map((r) => r.assets.filter((a) => a.type === "script").length))}, ` +
    `script gzip ${(median(runs.map((r) => r.assets.filter((a) => a.type === "script").reduce((n, a) => n + gz(dists[arm], a.f), 0))) / 1024).toFixed(1)} KB, ` +
    (runs[0].scripts ? `compile ${median(runs.map((r) => r.scripts.totals.compile))} ms, function calls ${median(runs.map((r) => r.scripts.totals.calls))} ms, long tasks ${median(runs.map((r) => r.scripts.longTaskMs))} ms` : "no trace"));
  console.log("\nscript waves of the drawn run:");
  waves.forEach((w, i) => console.log(`  wave ${i + 1}: ${w.files.length} scripts, ${(w.files.reduce((n, s) => n + gz(dists[arm], s.f), 0) / 1024).toFixed(1)} KB gzip, requested ${w.files[0].start}..${w.lastStart} ms, done by ${Math.max(...w.files.map((s) => s.end ?? 0))} ms`));
  const shapes = Object.entries(drawn.reads.shapes).sort((a, b) => a[1].first - b[1].first);
  console.log(`\nreads of the drawn run (${drawn.reads.total} requests, ${drawn.reads.distinct} shapes), repeated shapes: ${drawn.reads.repeated.map((r) => `${r.k} x${r.n}`).join("; ") || "none"}`);
  for (const [k, v] of shapes) console.log(`  ${String(v.first).padStart(5)} ms  x${v.n}  ${k.replace(/(storage\/v1\/object\/public\/media\/).*/, "$1…")}`);
}
