// Partition test registrations, not files: the native file contains most of the gate's time.
// No test body is rewritten. Node's runner executes the exact selected names in isolated processes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from 'node:test';

const require = createRequire(import.meta.url);
export const SHARDS = 3;
export const NATIVE_FILE = 'test/els-native-ui-browser.test.mjs';
export function plan(source) {
  const { parse } = require('acorn'); // CI-only, pinned alongside Playwright; no application dependency.
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const imports = ast.body.filter(n => n.type === 'ImportDeclaration' && n.source.value === 'node:test');
  assert.equal(imports.length, 1);
  assert.equal(imports[0].specifiers.length, 1);
  assert.equal(imports[0].specifiers[0].type, 'ImportDefaultSpecifier');
  assert.equal(imports[0].specifiers[0].local.name, 'test');
  const registrations = ast.body.filter(n => n.type === 'ExpressionStatement' && n.expression.type === 'CallExpression' && n.expression.callee.name === 'test').map(n => n.expression);
  const known = new Set(registrations);
  function visit(node, parent) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Identifier' && node.name === 'test') {
      assert.ok(parent?.type === 'ImportDefaultSpecifier'
        || (parent?.type === 'MemberExpression' && parent.property === node && !parent.computed)
        || (parent?.type === 'CallExpression' && parent.callee === node && known.has(parent)),
        'Aliased or indirect test registrations require an explicit sharding review');
    }
    if (node.type === 'ImportExpression') assert.notEqual(node.source?.value, 'node:test');
    if (node.type === 'CallExpression' && (node.callee.name === 'test' || node.callee.object?.name === 'test')) {
      assert.ok(known.has(node), 'New nested/dynamic/test.only registrations require an explicit sharding review');
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(child => visit(child, node));
      else if (value && typeof value === 'object') visit(value, node);
    }
  }
  visit(ast);
  const names = registrations.map(node => {
    assert.equal(node.arguments[0]?.type, 'Literal', 'Test names must be static to prove coverage');
    assert.equal(typeof node.arguments[0].value, 'string');
    return node.arguments[0].value;
  });
  assert.ok(names.length >= SHARDS, 'Empty suite is not a passing gate');
  assert.equal(new Set(names).size, names.length, 'Every test needs a unique name');
  return { sourceHash: createHash('sha256').update(source).digest('hex'), names,
    groups: Array.from({ length: SHARDS }, (_, i) => names.filter((_, n) => n % SHARDS === i)) };
}

export function verify(manifest, reports) {
  assert.equal(reports.length, SHARDS, 'All three reports are required');
  assert.equal(new Set(reports.map(r => r.shard)).size, SHARDS, 'Duplicate shard report');
  for (let i = 0; i < SHARDS; i++) {
    const report = reports.find(r => r.shard === i + 1);
    assert.ok(report, `Missing shard ${i + 1}`);
    assert.equal(report.sourceHash, manifest.sourceHash, 'Reports must describe the checked-out source');
    assert.equal(report.ok, true, 'Failed, skipped or incomplete runs cannot pass');
    assert.deepEqual([...report.passed].sort(), [...manifest.groups[i]].sort(), 'Each assigned test must pass exactly once');
  }
  assert.deepEqual(reports.flatMap(r => r.passed).sort(), [...manifest.names].sort());
}

async function main() {
  const manifest = plan(readFileSync(NATIVE_FILE, 'utf8'));
  const [mode, argument, output] = process.argv.slice(2);
  if (mode === 'verify') {
    verify(manifest, Array.from({ length: SHARDS }, (_, i) => JSON.parse(readFileSync(resolve(argument, `shard-${i + 1}.json`), 'utf8'))));
    console.log(`Coverage verified: ${manifest.names.length} native tests, exactly once across ${SHARDS} shards`);
    return;
  }
  assert.equal(mode, 'run', 'Usage: els-browser-shards.mjs run <1..3> <report.json> | verify <report-directory>');
  const shard = Number(argument);
  assert.ok(Number.isInteger(shard) && shard >= 1 && shard <= SHARDS);
  assert.ok(output);
  const selected = manifest.groups[shard - 1], passed = [];
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^(?:${selected.map(escape).join('|')})$`);
  let ok = true;
  const start = Date.now();
  for await (const event of run({ files: [resolve(NATIVE_FILE)], concurrency: 1, testNamePatterns: [pattern] })) {
    const { type, data } = event;
    if (type === 'test:pass' || type === 'test:fail') {
      if (type === 'test:fail' || data.skip || data.todo || !selected.includes(data.name)) ok = false;
      if (type === 'test:pass' && !data.skip && !data.todo) passed.push(data.name);
      console.log(`${type} ${data.name} (${Math.round(data.details?.duration_ms || 0)}ms)${data.skip ? ' SKIPPED' : ''}`);
      if (type === 'test:fail') console.error(data.details?.error);
    }
    if (type === 'test:stderr') process.stderr.write(data.message);
  }
  if (JSON.stringify([...passed].sort()) !== JSON.stringify([...selected].sort())) ok = false;
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(output, JSON.stringify({ shard, sourceHash: manifest.sourceHash, ok, passed, durationMs: Date.now() - start }, null, 2) + '\n');
  if (!ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
