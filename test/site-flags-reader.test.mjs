import test from 'node:test';
import assert from 'node:assert/strict';
import { createSiteFlagsReader } from '../src/lib/siteFlagsReader.js';

const row = (key, enabled, mode = 'all') => ({ key, enabled, message: null, mode });
function harness(opts = {}) {
  const h = { t: 1_000_000, rows: [row('lock_number', false)], calls: 0, fail: false, gate: null };
  h.read = createSiteFlagsReader({
    now: () => h.t,
    fetchRows: async () => {
      h.calls++;
      const snapshot = h.rows;           // state at request start, like a real response
      if (h.gate) await h.gate;
      if (h.fail) throw new Error('network');
      return snapshot;
    },
    ...opts,
  });
  return h;
}

test('parallel callers share exactly one request', async () => {
  const h = harness();
  const all = await Promise.all(Array.from({ length: 8 }, () => h.read()));
  assert.equal(h.calls, 1);
  assert.ok(all.every((f) => f === all[0]));
});

test('a successful result is reused inside the TTL and read again after it', async () => {
  const h = harness();
  await h.read(); h.t += 29_999; await h.read();
  assert.equal(h.calls, 1);
  h.t += 2; await h.read();
  assert.equal(h.calls, 2);
});

test('open -> locked is seen after expiry', async () => {
  const h = harness();
  assert.equal((await h.read()).lock_number.enabled, false);
  h.rows = [row('lock_number', true)];
  assert.equal((await h.read()).lock_number.enabled, false, 'inside TTL the cached value is still valid');
  h.t += 30_001;
  assert.equal((await h.read()).lock_number.enabled, true);
});

test('open -> locked is seen immediately by a fresh (navigation) read, without waiting for the TTL', async () => {
  const h = harness();
  await h.read();
  h.rows = [row('lock_number', true)];
  h.t += 1000;
  assert.equal((await h.read({ fresh: true })).lock_number.enabled, true);
  assert.equal((await h.read()).lock_number.enabled, true, 'the fresh result becomes the cached one');
});

test('failure after expiry never returns the old open result and is not cached', async () => {
  const h = harness();
  assert.equal((await h.read()).lock_number.enabled, false);
  h.t += 30_001; h.fail = true;
  assert.deepEqual(await h.read(), {});
  h.fail = false; h.rows = [row('lock_number', true)];
  const again = await h.read();
  assert.equal(again.lock_number.enabled, true, 'next call retries instead of serving a cached failure');
  assert.equal(h.calls, 3);
});

test('failure inside the TTL window of a fresh read also yields {} and drops the cache', async () => {
  const h = harness();
  await h.read();
  h.fail = true; h.t += 500;
  assert.deepEqual(await h.read({ fresh: true }), {});
  h.fail = false;
  await h.read();
  assert.equal(h.calls, 3, 'cache was cleared by the failure');
});

test('malformed response is a failure', async () => {
  const h = harness({ fetchRows: async () => null });
  assert.deepEqual(await h.read(), {});
});

test('fresh joins an in-flight request only inside the same burst', async () => {
  const h = harness();
  let release; h.gate = new Promise((r) => { release = r; });
  const a = h.read({ fresh: true });
  h.t += 100;
  const b = h.read({ fresh: true });
  assert.equal(h.calls, 1, 'same burst shares one request');
  h.t += 1000;
  h.gate = null;
  const c = h.read({ fresh: true });
  assert.equal(h.calls, 2, 'an older in-flight request is not reused after the burst');
  release();
  await Promise.all([a, b, c]);
});

test('an older response cannot overwrite a newer one', async () => {
  const h = harness();
  let releaseOld; const oldGate = new Promise((r) => { releaseOld = r; });
  h.gate = oldGate;
  const oldRead = h.read({ fresh: true });          // started while the flag is open
  h.rows = [row('lock_number', true)];
  h.t += 1000; h.gate = null;
  const newRead = h.read({ fresh: true });          // started after the flip
  assert.equal((await newRead).lock_number.enabled, true);
  releaseOld(); await oldRead;
  assert.equal((await h.read()).lock_number.enabled, true, 'late old response must not reopen the flag');
});
