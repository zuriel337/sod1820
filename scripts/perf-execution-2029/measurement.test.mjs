import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MEASUREMENT_PROFILE, calibrateRequestClock, documentTime, snapshotReads } from './measurement-profile.mjs';
import { sessionWindowCls } from './browser-metrics.mjs';
import { compareReplay, validateReplay, checkMatchedRegressionBudget } from './replay-gate.mjs';
import { runInNewContext } from 'node:vm';

test('calibration selects tightest round trip and retains the same clock after hard and soft navigation', async () => {
  const times = [10, 30, 40, 44, 50, 60, 70, 90, 100, 120, 200];
  const epochs = [1020, 1042, 1055, 1080, 1110];
  const clock = await calibrateRequestClock({ evaluate: async () => epochs.shift() }, () => times.shift());
  assert.equal(clock.offsetMs, 1000); assert.equal(clock.uncertaintyMs, 2);
  const epoch = clock.epochNow();
  assert.equal(documentTime(epoch, 1000), 200);
  assert.equal(documentTime(epoch, 1100), 100);
  assert.equal(documentTime(epoch, 1100) - 80, 20, 'read.start - navStart shares document axis');
  assert.throws(() => documentTime(undefined, 1000));
});

test('CLS uses maximum session window, excludes recent input and keeps separate clusters', () => {
  const shifts = [
    { startTime: 0, value: .04 }, { startTime: 999, value: .06 },
    { startTime: 1999, value: .08 }, { startTime: 2050, value: .9, hadRecentInput: true },
  ];
  assert.equal(sessionWindowCls(shifts), .1);
  assert.equal(sessionWindowCls([]), 0);
});
test('CLS session span is strictly below 5 seconds, gap strictly below 1 second', () => {
  const shifts = Array.from({ length: 7 }, (_, i) => ({ startTime: i * 900, value: .01 }));
  assert.ok(Math.abs(sessionWindowCls(shifts) - .06) < 1e-9);
  assert.equal(sessionWindowCls([{ startTime: 0, value: .1 }, { startTime: 1000, value: .2 }]), .2);
  const boundary = [...Array.from({ length: 6 }, (_, i) => ({ startTime: i * 900, value: .01 })), { startTime: 5000, value: .01 }];
  assert.ok(Math.abs(sessionWindowCls(boundary) - .06) < 1e-9);
});

const legacy = () => JSON.parse(fs.readFileSync(new URL('../../docs/perf-evidence-20261014/execution/world-primary-before-enrichment.json', import.meta.url)));
function current() {
  const data = legacy(); data.measurementProfile = MEASUREMENT_PROFILE;
  for (const result of Object.values(data.routes)) for (const sample of result.samples) Object.assign(sample, {
    primaryState: { primary: true }, clockUncertaintyMs: 1, timeOrigin: 100000, navStart: 0,
    shell: 10, backgroundSettled: sample.ready + 100, layoutShiftSum: sample.cls,
    observationEnd: sample.lastRestEnd + 100, pendingFixtureResponses: 0,
  });
  return data;
}
test('historical artifacts are retained, mixed definitions never produce comparable deltas', () => {
  assert.equal(validateReplay(legacy()).valid, true, 'Historical validation remains explicitly legacy');
  assert.equal(validateReplay(current()).valid, true);
  for (const pair of [[legacy(), current()], [current(), legacy()]]) {
    const result = compareReplay(...pair);
    assert.equal(result.comparable, false); assert.deepEqual(result.deltas, {});
    assert.ok(result.errors.some(e => e.includes('measurementProfile')));
  }
  assert.equal(compareReplay(current(), current()).comparable, true);
  const unknown = current(); unknown.measurementProfile = { version: 'unknown' };
  assert.equal(validateReplay(unknown).valid, false);
});
test('late response completion cannot mutate finalized read counts or introduce epoch timestamps', async () => {
  const reads = [{ start: 1000020, status: 200 }];
  const snapshot = snapshotReads(reads, 1000000);
  await Promise.resolve();
  reads.push({ start: 1000040, status: 200 });
  reads[0].status = 503;
  assert.deepEqual(snapshot, [{ start: 20, status: 200 }]);
  assert.equal(reads[0].start, 1000020, 'Active response records retain their epoch axis');
  const data = current(), sample = data.routes['/world'].samples[0];
  sample.reads[0].start = 1.7e12;
  assert.equal(validateReplay(data).valid, false);
  const mutated = current(); mutated.routes['/world'].samples[0].reads.push({ start: 10, status: 200 });
  assert.equal(validateReplay(mutated).valid, false);
});
test('current reports require primary content, calibrated time and separated readiness phases', () => {
  for (const mutate of [s => s.primaryState.primary = false, s => s.clockUncertaintyMs = null,
    s => s.backgroundSettled = s.ready - 1, s => s.timeOrigin = null]) {
    const data = current(); mutate(data.routes['/world'].samples[0]);
    assert.equal(validateReplay(data).valid, false);
  }
});
test('a bounded primary sample with pending background responses cannot certify complete read-count regression', () => {
  const data = current(); data.routes['/world'].samples[0].pendingFixtureResponses = 1;
  assert.equal(validateReplay(data).valid, true);
  assert.equal(compareReplay(data, current()).comparable, false);
});
test('SPA paints cannot silently satisfy the cold-navigation timing budget', () => {
  const data = current(); data.navigation = { from: '/' };
  for (const result of Object.values(data.routes)) for (const sample of result.samples) { sample.fcp = null; sample.lcp = null; }
  assert.equal(validateReplay(data).valid, true);
  const budget = { maxTimingRatio: 1.1, timingNoiseMs: 100, maxAdditionalRestReads: 0, maxCls: .1 };
  const checked = checkMatchedRegressionBudget(data, data, budget);
  assert.equal(checked.valid, false);
  assert.ok(checked.errors.some(error => error.includes('SPA navigation')));
});

test('the installed response guard blocks analytics, table writes, auth and unreviewed RPCs before navigation', async () => {
  const source = fs.readFileSync(new URL('./measure.mjs', import.meta.url), 'utf8');
  assert.ok(source.indexOf("await page.route('**/*'") < source.indexOf('await page.goto('));
  assert.ok(source.includes("serviceWorkers: 'block'"));
  const start = source.indexOf("      await page.route('**/*', async route => {");
  const end = source.indexOf('\n      });', start);
  let handler;
  const blocked = [], errors = [], misses = [];
  await runInNewContext(`(async () => {${source.slice(start, end + '\n      });'.length)}})()`, {
    page: { route: async (_, fn) => { handler = fn; }, evaluate: () => assert.fail('Renderer dependency') },
    URL, origin: 'http://127.0.0.1:1', ALLOW: new Set(['gematria_method_trace']), telemetry: /analytics|ingest_event|track_visit|link_identity/,
    blocked, errors, misses, args: {}, mode: 'replay',
    capture: () => assert.fail('No upstream write'), keyOf: () => assert.fail('Blocked request reached fixtures'),
  });
  for (const [method, path] of [['POST', '/rest/v1/nodes'], ['PATCH', '/rest/v1/posts'], ['DELETE', '/rest/v1/events'],
    ['POST', '/rest/v1/rpc/unreviewed'], ['POST', '/rest/v1/rpc/ingest_event'], ['POST', '/auth/v1/token']]) {
    let status;
    await handler({ request: () => ({ url: () => `https://linswmnnkjxvweumprav.supabase.co${path}`, method: () => method }),
      fulfill: async response => { status = response.status; }, continue: () => assert.fail('Upstream access'), abort: () => assert.fail('Expected blocked response') });
    assert.equal(status, 204);
  }
  assert.equal(blocked.length, 6); assert.deepEqual(errors, []); assert.deepEqual(misses, []);
});
