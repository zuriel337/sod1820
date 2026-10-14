import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, validateEvidence, compareEvidence } from '../scripts/perf-execution-2029/evidence-gate.mjs';

function sample() {
  const manifest = { commit: 'a'.repeat(40), harnessSha256: 'h', fixturesSha256: 'f', browserVersion: '141', playwrightVersion: '1.56.1',
    viewport: { width: 390, height: 844 }, dpr: 2, cpu: 4, network: { rtt: 150, downloadBytesPerSecond: 1.6 * 1024 * 1024 / 8, uploadBytesPerSecond: 750 * 1024 / 8 },
    cache: 'cold', encoding: 'br', dataMode: 'fixture-get-only', sbdelay: 150, extdelay: 400, runs: 7,
    location: 'local', authMode: 'guest', rpcPolicy: 'non-GET-204', thirdPartyPolicy: 'empty-400ms', buildTarget: '2029' };
  const measurement = { mode: 'run', cpu: 4, rtt: 150, sbdelay: 150, routes: Object.fromEntries(ROUTES.map(route => [route, {
    median: { fcp: 2000, lcp: 5000, ready: 4500, firstContentReq: 1800, firstContentEnd: 2000, lastSbEnd: 6000, sbCount: 50, cls: 0 },
    spread: { fcp: [1900, 2100], lcp: [4900, 5100], ready: [4400, 4600], firstContentReq: [1700, 1900] }, misses: [] }])) };
  return { manifest, measurement };
}
test('fixture evidence is accepted only for its declared lab purpose', () => {
  const { manifest, measurement } = sample();
  assert.equal(validateEvidence(measurement, manifest).valid, true);
  const product = validateEvidence(measurement, manifest, { purpose: 'product' });
  assert.equal(product.valid, false);
  assert.ok(product.errors.some(x => x.includes('GET-only')));
});
test('a fixture miss must fail even when the page reports READY', () => {
  const { manifest, measurement } = sample(); measurement.routes['/'].misses = ['/posts?select=*'];
  assert.equal(validateEvidence(measurement, manifest).valid, false);
});
test('Home redirect and absent readiness cannot be used as a baseline', () => {
  const { manifest, measurement } = sample(); measurement.routes['/2029'] = measurement.routes['/']; delete measurement.routes['/'];
  measurement.routes['/world'].median.ready = null;
  const report = validateEvidence(measurement, manifest);
  assert.ok(report.errors.some(x => x.includes('/2029')));
  assert.ok(report.errors.some(x => x.includes('invalid ready')));
});
test('real DB and fixtures, or different browsers, cannot be compared', () => {
  const a = sample(), b = sample(); b.manifest.dataMode = 'live'; b.manifest.browserVersion = '143';
  const report = compareEvidence(a.measurement, b.measurement, a.manifest, b.manifest);
  assert.equal(report.comparable, false); assert.deepEqual(report.deltas, {});
});
test('overlapping READY ranges do not prove improvement', () => {
  const a = sample(), b = sample(); b.measurement.routes['/'].median.ready = 4450;
  const report = compareEvidence(a.measurement, b.measurement, a.manifest, b.manifest);
  assert.equal(report.comparable, true); assert.equal(report.deltas['/'].readyImprovedBeyondRange, false);
});
test('output metadata and missing conditions fail closed', () => {
  const { manifest, measurement } = sample(); delete manifest.location; measurement.cpu = 1;
  assert.equal(validateEvidence(measurement, manifest).valid, false);
});
test('product gate requires extension isolation and exact hosted SHA', () => {
  const { manifest, measurement } = sample(); manifest.dataMode = 'live';
  manifest.acceptance = Object.fromEntries(ROUTES.map(route => [route, { primaryContentHash: 'hash', runtimeErrors: 0,
    failedPrimaryReads: 0, successfulSamples: 7, extensionsNonBlocking: true, boundedReads: true }]));
  manifest.hostedPreview = { url: 'https://preview.example', commit: manifest.commit };
  assert.equal(validateEvidence(measurement, manifest, { purpose: 'product' }).valid, true);
  manifest.acceptance['/world'].extensionsNonBlocking = false; manifest.hostedPreview.commit = 'b'.repeat(40);
  const report = validateEvidence(measurement, manifest, { purpose: 'product' });
  assert.ok(report.errors.some(x => x.includes('extension'))); assert.ok(report.errors.some(x => x.includes('exact application')));
});
