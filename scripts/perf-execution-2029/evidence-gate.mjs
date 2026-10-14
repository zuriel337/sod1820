import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const ROUTES = ['/', '/world', '/post/seventh-to-tenth-sefirot-2027'];
const metrics = ['fcp', 'lcp', 'ready', 'firstContentReq', 'firstContentEnd', 'lastSbEnd', 'sbCount', 'cls'];
const conditions = ['harnessSha256', 'fixturesSha256', 'browserVersion', 'playwrightVersion',
  'viewport', 'dpr', 'cpu', 'network', 'cache', 'encoding', 'dataMode', 'sbdelay',
  'extdelay', 'runs', 'location', 'authMode', 'rpcPolicy', 'thirdPartyPolicy', 'buildTarget'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// This gate consumes evidence. It does not alter the shared harness, readers, or budgets.
export function validateEvidence(measurement, manifest, { purpose = 'lab' } = {}) {
  const errors = [];
  const limitations = [];
  if (!['lab', 'product'].includes(purpose)) errors.push('Unknown evidence purpose');
  if (!/^[a-f0-9]{40}$/.test(manifest.commit || '')) errors.push('Exact application commit required');
  for (const key of conditions) if (manifest[key] == null) errors.push(`Missing condition: ${key}`);
  if (manifest.runs !== 7) errors.push('Protocol requires seven samples per route');
  if (!same(manifest.viewport, { width: 390, height: 844 }) || manifest.dpr !== 2 || manifest.cpu !== 4)
    errors.push('Mobile viewport/DPR/CPU differs from the fixed protocol');
  if (manifest.cache !== 'cold') errors.push('Fixed baseline requires cold HTTP cache');
  if (manifest.network?.rtt !== 150 || manifest.network?.downloadBytesPerSecond !== 1.6 * 1024 * 1024 / 8
    || manifest.network?.uploadBytesPerSecond !== 750 * 1024 / 8) errors.push('Fixed network profile differs');
  if (!['fixture-get-only', 'live'].includes(manifest.dataMode)) errors.push('Unknown data mode');
  if (measurement.mode !== 'run' || measurement.cpu !== manifest.cpu || measurement.rtt !== manifest.network?.rtt || measurement.sbdelay !== manifest.sbdelay)
    errors.push('Harness output and declared conditions disagree');
  if (!same(Object.keys(measurement.routes || {}).sort(), [...ROUTES].sort())) errors.push('All three canonical routes required; /2029 is not Home');
  for (const route of ROUTES) {
    const result = measurement.routes?.[route];
    if (!result) continue;
    if (!Array.isArray(result.misses) || result.misses.length) errors.push(`${route}: missing fixtures invalidate the run`);
    for (const key of metrics) {
      const value = result.median?.[key];
      if (!Number.isFinite(value) || value < 0 || (key !== 'cls' && value === 0)) errors.push(`${route}: invalid ${key}`);
    }
    for (const key of ['fcp', 'lcp', 'ready', 'firstContentReq']) {
      const range = result.spread?.[key];
      if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isFinite) || range[0] > range[1]
        || result.median?.[key] < range[0] || result.median?.[key] > range[1]) errors.push(`${route}: invalid ${key} range`);
    }
  }
  if (manifest.dataMode === 'fixture-get-only') {
    limitations.push('RPC reads are answered 204; content parity, real DB cost, and complete request counts are unproven');
    limitations.push('firstContentReq includes flags and non-primary reads; it is not a primary-content start marker');
    limitations.push('Shared output contains medians/ranges, not individual samples or runtime-error/status traces');
    if (purpose === 'product') errors.push('GET-only fixture evidence cannot establish product acceptance or product budgets');
  }
  if (purpose === 'product') {
    for (const route of ROUTES) {
      const proof = manifest.acceptance?.[route];
      if (!proof?.primaryContentHash || proof.runtimeErrors !== 0 || proof.failedPrimaryReads !== 0)
        errors.push(`${route}: successful primary content and runtime trace required`);
      if (proof?.successfulSamples !== 7) errors.push(`${route}: seven successful individual samples required`);
      if (proof?.extensionsNonBlocking !== true) errors.push(`${route}: delayed/failed-extension acceptance required`);
      if (proof?.boundedReads !== true) errors.push(`${route}: bounded-data acceptance required`);
    }
    if (!manifest.hostedPreview?.url || manifest.hostedPreview.commit !== manifest.commit)
      errors.push('Hosted preview must be verified against the exact application commit');
  }
  return { valid: errors.length === 0, purpose, errors, limitations };
}

export function compareEvidence(before, after, beforeManifest, afterManifest, options = {}) {
  const checks = [validateEvidence(before, beforeManifest, options), validateEvidence(after, afterManifest, options)];
  const errors = checks.flatMap(x => x.errors);
  for (const key of conditions) if (!same(beforeManifest[key], afterManifest[key])) errors.push(`Incomparable condition: ${key}`);
  if (options.purpose === 'product') for (const route of ROUTES)
    if (beforeManifest.acceptance?.[route]?.primaryContentHash !== afterManifest.acceptance?.[route]?.primaryContentHash)
      errors.push(`${route}: primary content changed`);
  const deltas = {};
  if (!errors.length) for (const route of ROUTES) {
    const a = before.routes[route], b = after.routes[route];
    deltas[route] = Object.fromEntries(metrics.map(key => [key, b.median[key] - a.median[key]]));
    // Conservative protocol rule: overlapping full ranges are not proof of improvement.
    deltas[route].readyImprovedBeyondRange = b.spread.ready[1] < a.spread.ready[0];
  }
  return { comparable: errors.length === 0, errors, deltas, limitations: [...new Set(checks.flatMap(x => x.limitations))] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [measurementPath, manifestPath, purpose = 'lab'] = process.argv.slice(2);
  if (!measurementPath || !manifestPath) {
    console.error('Usage: node evidence-gate.mjs MEASUREMENT.json MANIFEST.json [lab|product]');
    process.exitCode = 2;
  } else {
    const report = validateEvidence(JSON.parse(fs.readFileSync(measurementPath)), JSON.parse(fs.readFileSync(manifestPath)), { purpose });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.valid ? 0 : 1;
  }
}
