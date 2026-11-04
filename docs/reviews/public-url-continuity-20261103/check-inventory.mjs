// Reconcile the already-collected inventory; never crawl, publish or infer an
// existing item merely from its URL. This is adapter coverage, not HTTP proof.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { publicReadingContinuation, publicReadingPath } from '../../../src/lib/publicReadingRelease2029.js';
const inventory = JSON.parse(readFileSync(new URL('../url-continuity-plan-20261103/url-inventory.json', import.meta.url)));
const receipt = { kind: 'existing-inventory-adapter-reconciliation', sourceInventory: inventory.sourceSha,
  networkRequests: 0, fullHttpCoverage: false, records: inventory.rows.length,
  familyCounts: {}, pathStates: {}, aliasRecordsChecked: 0, loops: [], brokenAliasTargets: [] };
for (const row of inventory.rows) {
  receipt.familyCounts[row.family] = (receipt.familyCounts[row.family] || 0) + 1;
  if (!row.url.startsWith('/') || row.url.includes('/:')) continue;
  const url = new URL(row.url, 'https://sod1820.co.il');
  const state = publicReadingPath(url.pathname, { search: url.search });
  receipt.pathStates[state] = (receipt.pathStates[state] || 0) + 1;
  let target = publicReadingContinuation(url.pathname, url.search, url.hash);
  if (!target) continue;
  receipt.aliasRecordsChecked++;
  const seen = new Set([url.pathname + url.search + url.hash]);
  for (let depth = 0; target && depth < 10; depth++) {
    if (seen.has(target)) { receipt.loops.push(row.url); break; }
    seen.add(target);
    const next = new URL(target, url.origin);
    if (publicReadingPath(next.pathname, { search: next.search }) === 'missing') receipt.brokenAliasTargets.push(row.url);
    target = publicReadingContinuation(next.pathname, next.search, next.hash);
  }
}
writeFileSync(new URL('./inventory-receipt.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n');
assert.deepEqual(receipt.loops, []); assert.deepEqual(receipt.brokenAliasTargets, []);
console.log(JSON.stringify(receipt));
