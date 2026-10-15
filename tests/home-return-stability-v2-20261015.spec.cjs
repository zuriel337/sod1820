// Home return stability V2 (CLAUDE_PERF_HOME_STABILITY_V2_20261015): Home -> real long Post -> real browser Back, replayed
// from the frozen fixture. Needs a 2029 build:  SOD_BUILD_TARGET=2029 npx vite build && HOME_STABILITY_DIST=dist npx playwright test tests/home-return-stability-v2-20261015.spec.cjs
// The runner is docs/perf-evidence-20261015/home-stability-v2/runner.mjs (mobile 390x844 DPR2, CPU x4, 150ms replay).
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DIST = process.env.HOME_STABILITY_DIST;
test.skip(!DIST, 'set HOME_STABILITY_DIST to a 2029 build directory');
test.setTimeout(240_000);

test('Home return from a long Post keeps the reading position and does not shift (lab action window)', () => {
  const out = path.join(os.tmpdir(), `home-return-${process.pid}.json`);
  execFileSync(process.execPath, [path.join(__dirname, '..', 'docs/perf-evidence-20261015/home-stability-v2/runner.mjs'),
    '--arms', `B=${path.resolve(DIST)}`, '--pairs', '1', '--out', out], { stdio: 'inherit', timeout: 200_000 });
  const run = JSON.parse(fs.readFileSync(out, 'utf8')).runs[0];
  expect(run.valid, JSON.stringify({ error: run.error, invalid: run.invalid, misses: run.misses, pageErrors: run.pageErrors })).toBe(true);
  expect(run.cls).toBeLessThanOrEqual(0.1);
  expect(run.anchor.within120Final).toBe(true);
  expect(run.anchor.maxDispAfter).toBeLessThanOrEqual(120);
});
