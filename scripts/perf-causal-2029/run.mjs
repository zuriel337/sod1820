import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { validateReplay } from '../perf-execution-2029/replay-gate.mjs';
const out = 'docs/perf-causal-evidence-20261014';
const cases = [
  ['baseline', {}],
  ['api-rtt450', { apirtt: 450 }],
  ['cpu1', { cpu: 1 }],
  ['static-rtt300', { staticrtt: 300 }],
  ['bandwidth10', { bandwidth: 10 }],
];
const manifest = { runtime: '5dd4afaacd9ead2fef5ff43d4c1adec4e4a0ed75', method: 'separate calibrated static transport and replay API latency, not live SQL', cases: [] };
for (const [label, factors] of cases) {
  const args = ['scripts/perf-causal-2029/sensitivity.mjs', '--dist', '/workspace/perf-execution-scratch/lazy-golden-dist', '--fixtures', '/workspace/perf-execution-scratch/causal-fixtures.json.gz', '--out', `${out}/${label}.json`, '--runs', '7', '--label', label];
  for (const [k, v] of Object.entries(factors)) args.push(`--${k}`, String(v));
  console.log('START', label, new Date().toISOString());
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit' });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${label}: exit ${code}`)));
  });
  const data = JSON.parse(fs.readFileSync(`${out}/${label}.json`));
  const gate = validateReplay(data);
  if (!gate.valid) throw new Error(`${label}: ${gate.errors.join('; ')}`);
  for (const [route, value] of Object.entries(data.routes)) for (const s of value.samples) {
    if (!(s.firstRoot > 0 && s.firstPrimaryResponseReleased > s.firstPrimaryReq && s.jsResources.length)) throw new Error(`${label} ${route}: incomplete causal instrumentation`);
  }
  manifest.cases.push({ label, factors, fixtureHash: data.fixturesSha256, valid: true, finished: new Date().toISOString() });
  fs.writeFileSync(`${out}/run-manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  console.log('PASS', label);
}
