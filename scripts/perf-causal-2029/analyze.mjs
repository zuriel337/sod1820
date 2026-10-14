import fs from 'node:fs';
import { validateReplay } from '../perf-execution-2029/replay-gate.mjs';
const dir = 'docs/perf-causal-evidence-20261014';
const names = ['baseline', 'api-rtt450', 'cpu1', 'static-rtt300', 'bandwidth10'];
const data = Object.fromEntries(names.map(n => [n, JSON.parse(fs.readFileSync(`${dir}/${n}.json`))]));
const base = data.baseline, errors = [], rows = [];
const normalize = s => decodeURIComponent(s || '').replace(/\d{4}-\d\d-\d\dT[\d:.]+(?:Z|\+00:00| ?00:00)?/g, 'TS');
const responseSet = s => [...new Set(s.reads.map(r => `${r.method} ${normalize(r.path)} ${normalize(r.args)} ${r.status} ${r.bodyHash}`))].sort();
for (const [name, d] of Object.entries(data)) {
  errors.push(...validateReplay(d).errors.map(e => `${name}: ${e}`));
  for (const key of ['runtimeCommit', 'fixturesSha256', 'browser', 'playwright', 'viewport', 'dpr', 'theme']) if (JSON.stringify(d[key]) !== JSON.stringify(base[key])) errors.push(`${name}: shared condition mismatch ${key}`);
  for (const [route, v] of Object.entries(d.routes)) {
    const b = base.routes[route];
    const reference = responseSet(b.samples[0]);
    for (const s of v.samples) if (JSON.stringify(responseSet(s)) !== JSON.stringify(reference)) errors.push(`${name} ${route}: response/argument set changed`);
    rows.push({ factor: name, route, ready: v.median.ready, readyRange: v.ranges.ready,
      delta: v.median.ready - b.median.ready,
      beyondBaselineRange: v.ranges.ready[1] < b.ranges.ready[0] || v.ranges.ready[0] > b.ranges.ready[1],
      lastRestEnd: v.median.lastRestEnd, tailDelta: v.median.lastRestEnd - b.median.lastRestEnd,
      firstPrimaryReq: v.median.firstPrimaryReq, firstPrimaryResponseReleased: v.median.firstPrimaryResponseReleased,
      firstRoot: v.median.firstRoot, jsBeforeReadyEnd: v.median.jsBeforeReadyEnd,
      restCount: v.median.restCount, cls: v.median.cls });
  }
}
const result = { valid: !errors.length, errors, method: '105 accepted cold contexts, 5 one-factor cases ×3 routes ×7; calibrated controlled replay; not live DB/network geolocation', rows };
fs.writeFileSync(`${dir}/analysis.json`, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2)); process.exitCode = errors.length ? 1 : 0;
