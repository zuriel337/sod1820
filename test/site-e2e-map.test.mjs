// Keeps the end-to-end map honest (ZURIEL 26.11.2026): the generated action map is current, every scenario result in the families file
// is a line that scripts/qa-site-2029.mjs can actually print, ids are unique, and the report never calls a scenario PASS without a result.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const families = JSON.parse(read('qa/site-e2e-families.json')).families;

test('the generated site action map is current', () => {
  const run = spawnSync('node', ['scripts/map-site-actions-2029.mjs', '--check'], { cwd: root.pathname, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
});

test('scenario ids are unique and every result prefix is printed by the QA runner', () => {
  const runner = ['scripts/qa-site-2029.mjs', 'scripts/qa-scenarios-p1.mjs', 'scripts/qa-scenarios-p3.mjs', 'scripts/qa-ui-messages.mjs', 'scripts/qa-ui-notifications.mjs', 'scripts/qa-ui-comments.mjs', 'scripts/qa-ui-cipher.mjs'].map(read).join('\n');
  const ids = families.flatMap((f) => f.scenarios.map((s) => s.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const sc of families.flatMap((f) => f.scenarios))
    for (const prefix of sc.results) {
      // the runner builds some names from a template such as `${profile}: login ...`: compare the part after the template
      const tail = prefix.replace(/^(ui-cipher (desktop-1440|Pixel 7)|ui-comments (desktop-1440|Pixel 7)|els-verify|ui-notifications (desktop-1440|Pixel 7)|ui-messages (desktop-1440|Pixel 7)|desktop-1440|Pixel 7|tiers|isolation|messages|notifications|counters|comments|likes|follow): /, '');
      assert.ok(runner.includes(tail), `${sc.id}: the runner never prints "${tail}"`);
    }
});

test('the report: no results means NOT_RUN, a failing line means FAIL, matching passes mean PASS, nothing is invented', () => {
  const report = (lines) => {
    const file = join(mkdtempSync(join(tmpdir(), 'e2e-report-')), 'qa.log');
    writeFileSync(file, lines);
    const run = spawnSync('node', ['scripts/site-e2e-report-2029.mjs', '--json', file], { cwd: root.pathname, encoding: 'utf8' });
    return JSON.parse(run.stdout);
  };
  const empty = report('');
  assert.equal(empty.totals.PASS, 0);
  const all = families.flatMap((f) => f.scenarios).filter((s) => s.results.length);
  // raw GitHub job logs prefix every line with a timestamp
  const pass = report(all.flatMap((s) => s.results).map((r) => `2026-11-26T22:52:14.8412527Z PASS ${r}`).join('\n'));
  assert.equal(pass.totals.PASS, all.length);
  assert.equal(pass.totals.FAIL, 0);
  const one = all[0], failing = report([`FAIL ${one.results[0]} (x)`, ...all.slice(1).flatMap((s) => s.results).map((r) => `PASS ${r}`)].join('\n'));
  assert.equal(failing.rows.find((r) => r.id === one.id).status, 'FAIL');
  assert.ok(failing.totals.NOT_TESTED > 0 && failing.totals.NOT_TESTED === pass.totals.NOT_TESTED, 'untested scenarios stay untested whatever the QA lines say');
});
