import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../middleware.js', import.meta.url), 'utf8');

test('SG policy lookup occurs only after browser classification', () => {
  const entry = source.indexOf("if (country === 'SG')");
  const browser = source.indexOf("if (kind === 'browser')", entry);
  const lookup = source.indexOf('await sgPolicy()', entry);
  assert.ok(entry >= 0 && browser > entry && lookup > browser);
});
test('SG quarantine and approved rate limits remain unchanged', () => {
  assert.match(source, /policy\?\.mode === 'quarantine' && policy\.strictLevel >= 3/);
  assert.match(source, /SG_RATE_LIMIT_WINDOW_SECONDS = 5 \* 60/);
  assert.match(source, /risk\.band === 'high' \? 6 : risk\.band === 'medium' \? 12 : 30/);
  assert.match(source, /Math\.min\(cap, 8\)/);
  assert.match(source, /hasQuarantineProof\(request, risk\)/);
  assert.match(source, /status: 429/);
  assert.match(source, /return coreMiddleware\(request, context\)/);
});
