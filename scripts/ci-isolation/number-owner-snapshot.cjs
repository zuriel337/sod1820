// Number owner input gate; intentionally independent of World/Entry Golden bodies.
// Minimum coverage is not full acceptance: every further runtime request must map.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const contract = require('./snapshot-contract.cjs');

function numberCoverage(data) {
  const entries = Object.entries(data).map(([key, row]) => {
    const request = contract.parseKey(key);
    let json; try { json = JSON.parse(Buffer.from(row.body, 'base64')); } catch {}
    return { ...request, row, json };
  });
  const missing = [];
  const check = (name, pass) => { if (!pass) missing.push(name); };
  const successful = e => [200, 206].includes(e.row.status);
  const api = entries.filter(e => e.url.origin === 'https://linswmnnkjxvweumprav.supabase.co');
  check('headerless browser request signatures', entries.every(e => !e.headers));
  for (const value of [376, 1237, 1820]) {
    check(`POST /rest/v1/rpc/fn_number_lookup p_value=${value}: nonempty canonical phrase/method/value rows`, api.some(e =>
      e.method === 'POST' && e.url.pathname === '/rest/v1/rpc/fn_number_lookup' && e.args?.p_value === value &&
      successful(e) && Array.isArray(e.json) && e.json.some(r => r.value === value && r.phrase && r.method)));
  }
  // Zero may genuinely have no node. Require the actual identity read response,
  // never manufacture a zero lookup result to fill a missing input.
  for (const value of [0, 376, 1237, 1820]) check(`GET /rest/v1/nodes Number identity ${value}`, api.some(e =>
    e.method === 'GET' && e.url.pathname === '/rest/v1/nodes' && e.url.searchParams.get('type') === 'eq.number' &&
    ['identity_key', 'label'].some(k => e.url.searchParams.get(k) === `eq.${value}`) && successful(e) &&
    Array.isArray(e.json) && (value === 0 || e.json.some(r => r.type === 'number' && (r.identity_key === String(value) || r.label === String(value))))));
  check('GET /rest/v1/gematria_methods: nonempty method registry', api.some(e => e.method === 'GET' &&
    e.url.pathname === '/rest/v1/gematria_methods' && successful(e) && Array.isArray(e.json) && e.json.length));
  check('POST /rest/v1/rpc/fn_method_profile {"p_depth":"value","p_phrase":"שלום"}: canonical regular result 376', api.some(e =>
    e.method === 'POST' && e.url.pathname === '/rest/v1/rpc/fn_method_profile' && e.args?.p_phrase === 'שלום' && e.args?.p_depth === 'value' &&
    successful(e) && Array.isArray(e.json) && e.json.some(r => r.method_key === 'רגיל' && Number(r.computed_value) === 376)));
  return { responses: entries.length, missing, passed: missing.length === 0 };
}
function requireNumberCoverage(data) {
  const report = numberCoverage(data);
  assert.ok(report.passed, 'BLOCKED Number owner input: ' + report.missing.join('; '));
  return report;
}
function verifyInput(file, manifestFile) {
  assert.ok(file && manifestFile, 'Frozen snapshot and reviewed manifest paths required');
  const bytes = fs.readFileSync(file), manifest = JSON.parse(fs.readFileSync(manifestFile));
  const entry = manifest.browser;
  contract.verifyManifestEntry(entry, bytes);
  // The source-index signature is verified against bytes, not merely a hash label.
  const reference = entry.source.reference;
  const sourceFile = fs.existsSync(reference) ? reference : path.resolve(path.dirname(manifestFile), reference);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex'), entry.source.sha256, 'Source-index digest mismatch');
  const data = contract.decodeSnapshot(bytes);
  if (entry.source.access === 'public-reviewed') require('./corpus-privacy.cjs').reviewCorpus(data, entry.privacyReview.publicAttribution);
  requireNumberCoverage(data);
  return entry.sha256;
}
if (require.main === module) {
  try {
    process.stdout.write(verifyInput(process.argv[2] || 'test/fixtures/ci-2029/browser.json.gz', process.argv[3] || 'test/fixtures/ci-2029/manifest.json') + '\n');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { numberCoverage, requireNumberCoverage, verifyInput };
