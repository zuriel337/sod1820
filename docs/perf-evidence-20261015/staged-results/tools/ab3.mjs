// three-arm comparison at the 1.6 Mbps wire model: world (OFF) vs staged (lookup deferred) vs famonly (families skipped, lookup NOT deferred; attribution build, not committed)
import fs from 'node:fs';
const dir = process.argv[2]; const arms = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) { const name = f.split('-p')[0]; const r = JSON.parse(fs.readFileSync(`${dir}/${f}`)); for (const s of r.samples) { const miss = (s.reqList || []).filter((x) => x.startsWith('MISS')).length; if (!miss && s.phaseB?.ok) (arms[name] ||= []).push(s); } }
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const boot = (a, b, n = 4000) => { const d = []; for (let i = 0; i < n; i++) { const pick = (x) => Array.from({ length: x.length }, () => x[Math.floor(Math.random() * x.length)]); d.push(med(pick(a)) - med(pick(b))); } d.sort((x, y) => x - y); return [Math.round(d[Math.floor(n * 0.025)]), Math.round(d[Math.floor(n * 0.975)])]; };
const col = (arm, fn) => (arms[arm] || []).map(fn);
const out = {}; for (const arm of Object.keys(arms)) { const t = col(arm, (s) => s.phaseA.tContent), l = col(arm, (s) => s.phaseB.tLane); out[arm] = { n: t.length, tContent: `${Math.round(med(t))} [${Math.round(Math.min(...t))}–${Math.round(Math.max(...t))}]`, reqsToContent: med(col(arm, (s) => s.phaseA.reqsToContent)), wireToContentKB: Math.round(med(col(arm, (s) => s.phaseA.gzToContent)) / 1024), cpuA: Math.round(med(col(arm, (s) => s.phaseA.cpuMs))), tLane: `${Math.round(med(l))} [${Math.round(Math.min(...l))}–${Math.round(Math.max(...l))}]`, totalReqs: med(col(arm, (s) => s.phaseA.reqs + s.phaseB.reqs)) }; }
for (const a of ['staged', 'famonly']) if (arms[a] && arms.world) { out[`${a}_minus_world_tContent_95CI_ms`] = boot(col(a, (s) => s.phaseA.tContent), col('world', (s) => s.phaseA.tContent)); out[`${a}_minus_world_tLane_95CI_ms`] = boot(col(a, (s) => s.phaseB.tLane), col('world', (s) => s.phaseB.tLane)); }
if (arms.staged && arms.famonly) out.staged_minus_famonly_tContent_95CI_ms = boot(col('staged', (s) => s.phaseA.tContent), col('famonly', (s) => s.phaseA.tContent));
console.log(JSON.stringify(out, null, 1));
