import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../middleware.js', import.meta.url), 'utf8');
const core = readFileSync(new URL('../middleware-core.js', import.meta.url), 'utf8');

test('SG policy uses the canonical edge anon key without a duplicate JWT literal', () => {
  assert.match(source, /import coreMiddleware, \{ SUPABASE_ANON_KEY \} from '.\/middleware-core\.js'/);
  assert.match(source, /const ANON = SUPABASE_ANON_KEY/);
  assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);

  const token = core.match(/const ANON = ['"](eyJ[^'"]+)['"]/i)?.[1];
  assert.ok(token, 'canonical edge anon JWT must remain present');
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  assert.deepEqual(
    { iss: payload.iss, ref: payload.ref, role: payload.role },
    { iss: 'supabase', ref: 'linswmnnkjxvweumprav', role: 'anon' },
  );
});

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
