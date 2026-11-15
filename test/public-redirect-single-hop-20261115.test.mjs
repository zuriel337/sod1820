// URL continuity (15.11.2026; DEF-020 of 6.11, finding 2 of the 11.11 audit): every explicit redirect reaches its final address in ONE hop.
// Evidence (live, read-only): `/<post>/<attachment>` -> 308 `/<post>/?sourceAttachment=...` -> 308 `/<post>?sourceAttachment=...` -> 200 (and 3 hops from the
// trailing-slash variant of the source). 496 of the 589 rules (484 sourceAttachment + 12 embed) had a destination whose PATH ends with "/", so the permanent
// rule `/(.+)/ -> /$1` of the same file added a second hop. The final address is exactly the destination without that slash.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../public-reading-deploy/vercel.json', import.meta.url), 'utf8'));
const rules = config.redirects;
const pathOf = destination => destination.split('?')[0];
const decode = value => { try { return decodeURIComponent(value); } catch { return value; } };
const SLASH_RULE = rules.find(rule => rule.source === '/(.+)/');

test('the permanent trailing-slash rule is still in force (it is what makes a slash destination cost a second hop)', () => {
  assert.ok(SLASH_RULE);
  assert.equal(SLASH_RULE.destination, '/$1');
  assert.equal(SLASH_RULE.permanent, true);
});

test('no explicit redirect destination path ends with a slash: the final address is reached in one hop', () => {
  const offenders = rules.filter(rule => {
    if (rule.source === '/(.+)/') return false;
    const path = pathOf(rule.destination);
    return /^\//.test(path) && path !== '/' && path.endsWith('/');
  });
  assert.equal(offenders.length, 0, `${offenders.length} redirect destinations end with "/" and are redirected again by /(.+)/ -> /$1; first: ${offenders[0]?.source}`);
});

test('no explicit redirect destination is itself the source of another explicit redirect (no table-internal chain)', () => {
  const statics = new Map();
  for (const rule of rules) if (!/[()*:?\\]/.test(rule.source)) statics.set(decode(rule.source).replace(/\/$/, ''), rule);
  const chained = rules.filter(rule => {
    const target = decode(pathOf(rule.destination)).replace(/\/$/, '');
    return statics.has(target) && statics.get(target) !== rule;
  });
  assert.equal(chained.length, 0, `${chained.length} chained redirects; first: ${chained[0]?.source}`);
});

test('every sourceAttachment redirect keeps its query selector and a permanent status', () => {
  const attachment = rules.filter(rule => rule.destination.includes('sourceAttachment='));
  assert.ok(attachment.length >= 484, 'the attachment rules are still present');
  for (const rule of attachment) {
    const url = new URL(rule.destination, 'https://sod1820.co.il');
    assert.ok(url.searchParams.get('sourceAttachment'), rule.source);
    assert.ok(rule.permanent === true || rule.statusCode === 301 || rule.statusCode === 308, rule.source);
  }
});
