import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../middleware.js', import.meta.url), 'utf8');

// One existing country-policy table remains the owner.
assert.match(source, /edge_blocked_countries\?select=code,mode,strict_level&enabled=eq\.true/);
assert.doesNotMatch(source, /STRICT_COUNTRIES\s*=\s*new Set/);

// goodbot/ai bypass country hard-block and strict challenge.
assert.match(source, /countryPolicy\?\.mode === 'blocked' && kind !== 'goodbot' && kind !== 'ai'/);
assert.match(source, /kind === 'browser' && countryPolicy\?\.mode === 'strict'/);

// Bad bots remain denied independently of country policy.
assert.match(source, /else if \(kind === 'bot'\) blocked = true/);

// Strict levels are bounded and tunable without redeploy.
assert.match(source, /strictChallengeTtl\(level\)/);
assert.match(source, /if \(level >= 3\) return 60 \* 60/);
assert.match(source, /if \(level === 2\) return 6 \* 60 \* 60/);
assert.match(source, /return 24 \* 60 \* 60/);
assert.match(source, /COUNTRY_POLICY_CACHE_MS = 5 \* 60 \* 1000/);

// The challenge is not truth: it sets only an edge-pass cookie and no Human classification.
assert.match(source, /sod_edge_ok_/);
assert.match(source, /it is not Human proof|אינו Human proof/);

console.log('edge-country-adaptive-strict: ok');
