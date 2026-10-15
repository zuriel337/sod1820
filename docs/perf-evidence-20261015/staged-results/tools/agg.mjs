// aggregate replay-*.json from staged-measure.mjs: per cell medians [range] over the pooled passes; invalid = any MISS request or phaseB not ok
import fs from 'node:fs';
const dir = process.argv[2]; const cells = {};
for (const f of fs.readdirSync(dir).filter((f) => /^replay-.*\.json$/.test(f))) {
  const r = JSON.parse(fs.readFileSync(`${dir}/${f}`)); const m = /replay-bw(\d+)-(\w+)-p(\d)/.exec(f);
  for (const s of r.samples) { const miss = (s.reqList || []).filter((x) => x.startsWith('MISS')).length; const key = `bw${m[1]}/${m[2]}`; (cells[key] ||= { ok: [], bad: [] })[miss || !s.phaseB?.ok ? 'bad' : 'ok'].push(s); }
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const fmt = (a, d = 0) => a.length ? `${med(a).toFixed(d)} [${Math.min(...a).toFixed(d)}–${Math.max(...a).toFixed(d)}]` : '-';
const out = {};
for (const [k, c] of Object.entries(cells).sort()) {
  const v = c.ok; const g = (fn) => v.map(fn);
  out[k] = { n: v.length, excluded: c.bad.length,
    A_tContent: fmt(g((s) => s.phaseA.tContent)), A_reqsToContent: fmt(g((s) => s.phaseA.reqsToContent)), A_bytesToContentKB: fmt(g((s) => s.phaseA.bytesToContent / 1024)), A_wireToContentKB: fmt(g((s) => (s.phaseA.gzToContent||0) / 1024)),
    A_cpuMs: fmt(g((s) => s.phaseA.cpuMs)), A_longMs: fmt(g((s) => s.phaseA.longMs)), A_cls: fmt(g((s) => s.phaseA.cls), 3),
    A_reqsTotal: fmt(g((s) => s.phaseA.reqs)), A_bytesTotalKB: fmt(g((s) => s.phaseA.bytes / 1024)),
    B_tLaneMs: fmt(g((s) => s.phaseB.tLane)), B_reqs: fmt(g((s) => s.phaseB.reqs)), B_bytesKB: fmt(g((s) => s.phaseB.bytes / 1024)), B_wireKB: fmt(g((s) => (s.phaseB.gz||0) / 1024)), B_cpuMs: fmt(g((s) => s.phaseB.cpuMs)), B_longMs: fmt(g((s) => s.phaseB.longMs)), B_cls: fmt(g((s) => s.phaseB.cls), 3),
    TOTAL_reqs: fmt(g((s) => s.phaseA.reqs + s.phaseB.reqs)), TOTAL_bytesKB: fmt(g((s) => (s.phaseA.bytes + s.phaseB.bytes) / 1024)), TOTAL_wireKB: fmt(g((s) => ((s.phaseA.gz||0) + (s.phaseB.gz||0)) / 1024)), TOTAL_cpuMs: fmt(g((s) => s.phaseA.cpuMs + s.phaseB.cpuMs)),
    parity: [...new Set(v.map((s) => `${s.parity.sectionHash}|${s.parity.badge}|${s.parity.options.length}`))],
    badgeBefore: [...new Set(v.map((s) => s.phaseB.badgeBefore))], head: [...new Set(v.map((s) => s.parity.head))].slice(0, 1) };
}
console.log(JSON.stringify(out, null, 1));
