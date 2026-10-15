import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { MEASUREMENT_PROFILE } from './measurement-profile.mjs';

const METRICS = ['fcp', 'lcp', 'ready', 'firstPrimaryReq', 'lastRestEnd', 'restCount', 'cls'];
export function validateReplay(data, { functional = false } = {}) {
  const errors = [];
  if (data.mode !== 'replay' || data.dataMode !== 'anonymous-rpc-complete-replay') errors.push('Wrong measurement method');
  const current = data.measurementProfile != null;
  if (current && JSON.stringify(data.measurementProfile) !== JSON.stringify(MEASUREMENT_PROFILE)) errors.push('Unknown measurement profile');
  if (!functional && data.runs !== 7) errors.push('Seven samples required');
  for (const [route, result] of Object.entries(data.routes || {})) {
    if (result.samples?.length !== data.runs) errors.push(`${route}: missing raw samples`);
    for (const sample of result.samples || []) {
      if (sample.errors?.length || sample.misses?.length) errors.push(`${route}: runtime error or fixture miss`);
      for (const metric of METRICS) {
        if (current && data.navigation && ['fcp', 'lcp'].includes(metric) && sample[metric] === null) continue;
        if (!Number.isFinite(sample[metric]) || sample[metric] < 0 || (metric !== 'cls' && sample[metric] === 0)) errors.push(`${route}: invalid ${metric}`);
      }
      if (current) {
        if (!sample.primaryState?.primary) errors.push(`${route}: real primary content missing`);
        if (!Number.isFinite(sample.clockUncertaintyMs) || sample.clockUncertaintyMs < 0) errors.push(`${route}: clock calibration missing`);
        if (!Number.isFinite(sample.timeOrigin) || !Number.isFinite(sample.navStart)) errors.push(`${route}: document clock missing`);
        if (!Number.isFinite(sample.observationEnd) || !Number.isFinite(sample.readsObservationEnd)
          || sample.observationEnd < 0 || sample.readsObservationEnd < 0
          || sample.readsObservationEnd > sample.observationEnd + sample.clockUncertaintyMs)
          errors.push(`${route}: finite observation bounds required`);
        if (!Number.isFinite(sample.shell) || !Number.isFinite(sample.backgroundSettled)
          || sample.shell > sample.ready || sample.backgroundSettled < sample.ready) errors.push(`${route}: readiness phases invalid`);
        if (!Number.isFinite(sample.layoutShiftSum) || sample.layoutShiftSum < sample.cls) errors.push(`${route}: layout-shift diagnostics missing`);
        if (sample.restCount !== sample.reads?.length) errors.push(`${route}: read count changed after collection`);
        if (!Number.isInteger(sample.pendingFixtureResponses) || sample.pendingFixtureResponses < 0) errors.push(`${route}: pending response diagnostic missing`);
        for (const read of sample.reads || []) if (!Number.isFinite(read.start) || read.start < 0
          || read.start > sample.observationEnd + sample.navStart + sample.clockUncertaintyMs)
          errors.push(`${route}: read timestamp outside document observation window`);
      }
      if (!sample.reads?.some(read => read.primary && read.status >= 200 && read.status < 300)) errors.push(`${route}: successful primary read missing`);
      for (const read of sample.reads || []) if (read.status >= 400
        && !(read.path === '/rest/v1/rpc/world_group_source_arrivals_v3' && read.status === 404)
        && !(functional && read.intentionalFailure)) errors.push(`${route}: unexpected failed read ${read.path.split('?')[0]}`);
    }
  }
  if (!Object.keys(data.routes || {}).length) errors.push('No measured routes');
  return { valid: errors.length === 0, errors, measurementProfile: data.measurementProfile || 'legacy-unversioned-v1',
    method: 'controlled anonymous public-content replay; not hosted/field proof' };
}
export function compareReplay(before, after) {
  const errors = [...validateReplay(before).errors, ...validateReplay(after).errors];
  for (const data of [before, after]) if (data.measurementProfile) for (const [route, result] of Object.entries(data.routes || {}))
    if (result.samples?.some(sample => sample.pendingFixtureResponses > 0)) errors.push(`${route}: pending responses make complete read-count comparison unavailable`);
  for (const key of ['networkIsolation', 'measurementProfile', 'browser', 'playwright', 'cpu', 'rtt', 'download', 'upload', 'viewport', 'dpr', 'theme', 'navigation', 'fixturesSha256', 'extensionInjection']) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) errors.push(`Conditions differ: ${key}`);
  }
  const deltas = {};
  if (!errors.length) for (const [route, result] of Object.entries(after.routes)) {
    const base = before.routes[route];
    if (!base) { errors.push(`${route}: baseline missing`); continue; }
    deltas[route] = Object.fromEntries(METRICS.map(key => [key,
      result.median[key] == null || base.median[key] == null ? null : result.median[key] - base.median[key]]));
    deltas[route].readyBeyondRange = result.ranges.ready[1] < base.ranges.ready[0];
  }
  return { comparable: errors.length === 0, errors, deltas };
}
export function checkReplayBudget(data, budgets) {
  const errors = validateReplay(data).errors;
  for (const [route, budget] of Object.entries(budgets.routes || {})) {
    const measured = data.routes?.[route];
    if (!measured) { errors.push(`${route}: budgeted route missing`); continue; }
    for (const [metric, ceiling] of Object.entries(budget)) if (!Number.isFinite(measured.median[metric]) || measured.median[metric] > ceiling)
      errors.push(`${route}: ${metric} ${measured.median[metric]} exceeds ${ceiling}`);
  }
  return { valid: errors.length === 0, errors, scope: 'replay-only; production budgets require hosted and field calibration' };
}
export function checkMatchedRegressionBudget(before, after, budget) {
  const comparison = compareReplay(before, after), errors = [...comparison.errors];
  if (before.navigation || after.navigation) errors.push('Cold LCP budget cannot certify SPA navigation; use the navigation gate');
  if (comparison.comparable) for (const [route, result] of Object.entries(after.routes)) {
    const base = before.routes[route].median, current = result.median;
    for (const metric of ['ready', 'lcp']) {
      if (after.navigation && metric === 'lcp') continue;
      const ceiling = base[metric] * budget.maxTimingRatio + budget.timingNoiseMs;
      if (current[metric] > ceiling) errors.push(`${route}: ${metric} regressed past matched budget ${ceiling}`);
    }
    if (current.restCount > base.restCount + budget.maxAdditionalRestReads) errors.push(`${route}: data request budget regressed`);
    if (current.cls > budget.maxCls) errors.push(`${route}: CLS budget exceeded`);
  }
  return { valid: errors.length === 0, errors, scope: 'matched replay regression; not production performance closure' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, budgetFile, matchedBudgetFile] = process.argv.slice(2);
  const data = JSON.parse(fs.readFileSync(file));
  const result = matchedBudgetFile
    ? checkMatchedRegressionBudget(data, JSON.parse(fs.readFileSync(budgetFile)), JSON.parse(fs.readFileSync(matchedBudgetFile)))
    : budgetFile ? checkReplayBudget(data, JSON.parse(fs.readFileSync(budgetFile))) : validateReplay(data);
  console.log(JSON.stringify(result, null, 2)); process.exitCode = result.valid ? 0 : 1;
}
