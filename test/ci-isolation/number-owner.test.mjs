import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import input from '../../scripts/ci-isolation/number-owner-snapshot.cjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const response = value => ({ status: 200, type: 'application/json', body: Buffer.from(JSON.stringify(value)).toString('base64') });
const api = 'https://linswmnnkjxvweumprav.supabase.co/rest/v1/';

test('all eight original Number product bodies, assertions and thresholds are byte-identical', () => {
  const source = fs.readFileSync(path.join(root, 'tests/number-2029-owner.spec.cjs'), 'utf8');
  const body = source.slice(source.indexOf("test('"));
  assert.equal(sha(body), '86f6991f1493395da0eee5a4f30f1b542436966df589a68da722685e7948b749');
  assert.equal((body.match(/^test\('/gm) || []).length, 8);
  assert.match(source, /require\('\.\/ci-isolated-test.cjs'\)/);
  assert.doesNotMatch(source, /route\.continue|real public reads/);
});

test('Number workflow isolates every application phase and disables setup hooks', () => {
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/number-2029-owner-gate.yml'), 'utf8');
  assert.match(workflow, /npm ci --ignore-scripts --no-audit --no-fund/);
  assert.match(workflow, /npm install --prefix .*--ignore-scripts --no-audit --no-fund @playwright\/test@1\.56\.1/);
  for (const phase of ['source', 'browser']) assert.ok(workflow.includes(`bash scripts/ci-isolation/offline.sh bash scripts/ci-isolation/number-owner.sh ${phase}`));
  assert.match(workflow, /snapshot_sha="\$\(node scripts\/ci-isolation\/number-owner-snapshot.cjs\)"/);
  assert.doesNotMatch(workflow, /npx |nohup |npm run (?:build|preview)|upload-artifact/);
});

function minimum() {
  const data = {};
  for (const value of [376, 1237, 1820]) data[`POST ${api}rpc/fn_number_lookup {"p_value":${value}}`] = response([{ value, phrase: 'synthetic control', method: 'רגיל' }]);
  for (const value of [0, 376, 1237, 1820]) data[`GET ${api}nodes?type=eq.number&identity_key=eq.${value} `] = response(value ? [{ type: 'number', label: String(value) }] : []);
  data[`GET ${api}gematria_methods `] = response([{ method_key: 'רגיל' }]);
  data[`POST ${api}rpc/fn_method_profile {"p_depth":"value","p_phrase":"שלום"}`] = response([{ method_key: 'רגיל', computed_value: 376 }]);
  return data;
}
test('Number minimum coverage accepts a genuine empty zero response and needs no Bennett/World body', () => {
  assert.equal(input.requireNumberCoverage(minimum()).passed, true);
  for (const value of [376, 1237, 1820]) {
    const data = minimum(); data[`POST ${api}rpc/fn_number_lookup {"p_value":${value}}`] = response([]);
    assert.throws(() => input.requireNumberCoverage(data), /nonempty canonical/);
  }
  const data = minimum(); delete data[`GET ${api}nodes?type=eq.number&identity_key=eq.0 `];
  assert.throws(() => input.requireNumberCoverage(data), /identity 0/);
});
test('Number manifest validates corpus AND source-index bytes before trusting coverage', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'number-owner-input-'));
  try {
    const bytes = zlib.gzipSync(JSON.stringify(minimum())), source = Buffer.from('synthetic unit provenance only');
    const file = path.join(dir, 'input.gz'), manifestFile = path.join(dir, 'manifest.json');
    fs.writeFileSync(file, bytes); fs.writeFileSync(path.join(dir, 'source.json'), source);
    const entry = { sha256: sha(bytes), source: { reference: 'source.json', date: '2026-10-16', sha256: sha(source), access: 'restricted-existing-artifact' }, privacyReview: { reference: 'unit only', decision: 'approved-for-this-location' }, coverage: { reference: 'unit minimum only' } };
    fs.writeFileSync(manifestFile, JSON.stringify({ browser: entry }));
    assert.equal(input.verifyInput(file, manifestFile), sha(bytes));
    fs.appendFileSync(file, 'changed'); assert.throws(() => input.verifyInput(file, manifestFile), /Snapshot digest mismatch/);
    fs.writeFileSync(file, bytes); fs.appendFileSync(path.join(dir, 'source.json'), 'changed');
    assert.throws(() => input.verifyInput(file, manifestFile), /Source-index digest mismatch/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('incomplete Number input stops the real browser entrypoint before preview startup', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'number-owner-preflight-'));
  try {
    const file = path.join(dir, 'input.gz'), bytes = zlib.gzipSync(JSON.stringify({ [`GET ${api}unit-only `]: response([]) }));
    fs.writeFileSync(file, bytes);
    const source = Buffer.from('unit-only missing-input provenance'); fs.writeFileSync(path.join(dir, 'source.json'), source);
    const manifest = path.join(dir, 'manifest.json');
    fs.writeFileSync(manifest, JSON.stringify({ browser: { sha256: sha(bytes), source: { reference: 'source.json', date: '2026-10-16', sha256: sha(source), access: 'restricted-existing-artifact' }, privacyReview: { reference: 'unit only', decision: 'approved-for-this-location' }, coverage: { reference: 'unit only, incomplete' } } }));
    const child = spawn(process.execPath, ['scripts/ci-isolation/run.mjs', '--', 'bash', 'scripts/ci-isolation/number-owner.sh', 'browser', manifest], {
      cwd: root, env: { ...process.env, RUNNER_TEMP: dir, PLAYWRIGHT_DIR: process.env.PLAYWRIGHT_DIR || dir, SOD_CI_SNAPSHOT: file, SOD_CI_SNAPSHOT_SHA256: sha(bytes) }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = ''; for (const stream of [child.stdout, child.stderr]) stream.on('data', b => { output += b; });
    const code = await new Promise((resolve, reject) => { child.once('close', resolve); child.once('error', reject); });
    assert.equal(code, 1, output); assert.match(output, /BLOCKED Number owner input/);
    for (const name of ['sod-ci-preview.ready', 'sod-number-2029-preview.log']) assert.equal(fs.existsSync(path.join(dir, name)), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

for (const kind of ['get', 'rpc', 'write', 'replay']) test(`Number beforeEach ${kind}: exact fixture or zero target hits; swallowed failure audited`, { timeout: 30_000 }, async () => {
  let hits = 0;
  const trap = http.createServer((_, res) => { hits++; res.end('FORBIDDEN'); });
  await new Promise(resolve => trap.listen(0, '127.0.0.1', resolve));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'number-owner-probe-'));
  try {
    const file = path.join(dir, 'input.gz');
    const bytes = zlib.gzipSync(JSON.stringify({ [`GET ${api}rpc/fn_owner_control `]: response([{ value: 376, phrase: 'synthetic control' }]) }));
    fs.writeFileSync(file, bytes);
    const child = spawn(process.execPath, ['scripts/ci-isolation/run.mjs', '--', process.execPath, 'test/ci-isolation/number-owner-probe.mjs', kind, `http://127.0.0.1:${trap.address().port}`], {
      cwd: root, env: { ...process.env, SOD_CI_SNAPSHOT: file, SOD_CI_SNAPSHOT_SHA256: sha(bytes) }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = ''; for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => { output += bytes; });
    const code = await new Promise((resolve, reject) => { child.once('close', resolve); child.once('error', reject); });
    assert.equal(hits, 0, 'Forbidden local target received a request');
    assert.equal(code, kind === 'replay' ? 0 : 1, output);
    assert.match(output, /Number scenario child completed/, output);
    if (kind !== 'replay') assert.match(output, /CI_EGRESS_FAILURE \(child exit 0\)/, output);
  } finally { await new Promise(resolve => trap.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }); }
});
