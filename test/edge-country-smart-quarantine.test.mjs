import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../middleware.js', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../supabase/migrations/20260914140000_cn_smart_quarantine_2029.sql', import.meta.url), 'utf8');

// One canonical owner; quarantine extends the existing mode vocabulary instead of creating a parallel system.
assert.match(migration, /edge_blocked_countries_mode_chk/);
assert.match(migration, /'quarantine'/);
assert.doesNotMatch(source, /QUARANTINE_COUNTRIES\s*=\s*new Set/);

// Quarantine remains a browser-only progressive-friction layer. Verified/known good automation keeps public access;
// bad bots are still denied by the existing global bot gate.
assert.match(source, /countryPolicy\?\.mode === 'quarantine'/);
assert.match(source, /kind === 'browser'/);
assert.match(source, /else if \(kind === 'bot'\) blocked = true/);
assert.match(source, /kind !== 'goodbot' && kind !== 'ai'/);

// Risk is computed locally from request/UA signals: no new per-request DB/API lookup.
assert.match(source, /function quarantineBrowserRisk\(/);
assert.match(source, /accept-language/);
assert.match(source, /sec-fetch-mode/);
assert.match(source, /Chrome\|CriOS/i);
assert.doesNotMatch(source, /asn.*fetch|turnstile.*fetch/i);

// Progressive friction: low risk stays usable; medium/high risk re-prove much more often.
assert.match(source, /QUARANTINE_LOW_TTL = 60 \* 60/);
assert.match(source, /QUARANTINE_MEDIUM_TTL = 15 \* 60/);
assert.match(source, /QUARANTINE_HIGH_TTL = 5 \* 60/);

// Browser automation that exposes webdriver does not receive a proof cookie.
assert.match(source, /navigator\.webdriver\s*!==\s*true/);
assert.match(source, /navigator\.cookieEnabled\s*!==\s*false/);

// Quarantine proof is deliberately separate from legacy strict proof so enabling the mode forces a fresh proof.
assert.match(source, /sod_edge_q_/);
assert.match(source, /QUARANTINE_POLICY_VERSION/);

// Most important invariant: challenge/proof is friction only, never Human classification.
assert.match(source, /not Human proof|אינו Human proof/);
assert.doesNotMatch(source, /clean_classification\s*=\s*['"]human['"]/);

console.log('edge-country-smart-quarantine: ok');
