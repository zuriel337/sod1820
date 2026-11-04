// Execute the reviewed, unchanged source/unit/build commands extracted from the
// existing workflow. A3 and browser acceptance are separate receipts. This
// runner never represents that subset as a completed Isolation workflow.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const [stepsPath, outputPath] = process.argv.slice(2);
if (!stepsPath || !outputPath) throw Error('steps JSON and evidence directory required');
const steps = JSON.parse(readFileSync(stepsPath, 'utf8'));
if (steps.some(s => /test-a3-client-correlation-live|--with-isolated-a3|isolation-a3\/run|docker|npm (?:ci|install)|playwright|curl|wget|deploy|gh |supabase (?:db|functions)/.test(s.command))) {
  throw Error('unreviewed network/runtime command in source subset');
}
const output = resolve(outputPath);
mkdirSync(output, { recursive: true, mode: 0o700 });
const guard = resolve(output, 'deny-node-network.cjs');
writeFileSync(guard, `
const deny=()=>{throw Error('SOURCE_ACCEPTANCE_NETWORK_DENIED');};
globalThis.fetch=deny;globalThis.WebSocket=class{constructor(){deny();}};
for(const name of ['http','https']){const api=require('node:'+name);api.request=deny;api.get=deny;}
const net=require('node:net');net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;
require('node:module').syncBuiltinESMExports();
`);
const receipt = {
  sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  started: new Date().toISOString(), node: process.version,
  kind: 'original_workflow_source_unit_build_subset', fullIsolationGate: false,
  a3Included: false, browserIncluded: false, noDeployCommands: true,
  nodeNetworkDenied: true, steps: [],
};
for (const [index, step] of steps.entries()) {
  const start = Date.now();
  const result = spawnSync('/bin/bash', ['-euc', step.command], {
    cwd: process.cwd(), encoding: 'utf8', timeout: 300000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require ${guard}`.trim() },
  });
  const log = String(index + 1).padStart(2, '0') + '.txt';
  writeFileSync(resolve(output, log), (result.stdout || '') + (result.stderr || '') + (result.error ? String(result.error) : ''));
  const row = { ...step, exit: result.status, signal: result.signal, milliseconds: Date.now() - start, log };
  receipt.steps.push(row);
  writeFileSync(resolve(output, 'results.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify({ step: index + 1, name: row.name, exit: row.exit }));
}
receipt.finished = new Date().toISOString();
receipt.passed = receipt.steps.filter(s => s.exit === 0).length;
receipt.failed = receipt.steps.filter(s => s.exit !== 0).length;
writeFileSync(resolve(output, 'results.json'), JSON.stringify(receipt, null, 2) + '\n');
process.exitCode = receipt.failed ? 1 : 0;
