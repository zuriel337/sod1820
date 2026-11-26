// "בדוק את האתר": the read suite must stay read-only, secret-free and unable to weaken a protection (ZURIEL 26.11.2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTarget, summarize, ALLOWED_HOSTS } from '../scripts/site-check.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('the target is one of the three public origins: the check is not a general scanner', () => {
  assert.deepEqual([...ALLOWED_HOSTS], ['sod1820.co.il', 'www.sod1820.co.il', 'sod1820.vercel.app']);
  assert.equal(parseTarget(), 'https://sod1820.co.il');
  assert.equal(parseTarget('https://www.sod1820.co.il/x?y=1'), 'https://www.sod1820.co.il');
  for (const bad of ['http://sod1820.co.il', 'https://evil.example', 'https://sod1820.co.il.evil.example', 'https://user:pw@sod1820.co.il', 'https://sod1820.co.il:8443', 'not a url', 'https://sod1820-ejib1fqy9-sod1820-s-projects.vercel.app'])
    assert.throws(() => parseTarget(bad), /invalid_url|url_not_allowed/, bad);
});

test('the summary states the verdict, the source identity and what was not checked', () => {
  const text = summarize({ origin: 'https://sod1820.co.il', observedSha: 'a'.repeat(40), expectedSha: 'b'.repeat(40), finishedAt: 0,
    checks: [{ name: 'x', ok: true, detail: '' }, { name: 'y', ok: false, detail: 'status=403' }] });
  assert.match(text, /נכשל \(1\)/);
  assert.match(text, /לא תואם/);
  assert.match(text, /❌ y — status=403/);
  assert.match(text, /מה לא נבדק: התחברות, שמירה, כתיבה/);
});

test('read-only by construction: no secret, no login, no write, no spoofed identity, no bypass of any protection', () => {
  const code = text => text.split('\n').filter(line => !line.trim().startsWith('#') && !line.trim().startsWith('//')).join('\n');
  const script = code(read('scripts/site-check.mjs')), workflow = code(read('.github/workflows/site-check.yml'));
  assert.doesNotMatch(workflow, /secrets\./, 'the read suite uses no secret');
  assert.doesNotMatch(workflow, /environment:/, 'no write environment in the read workflow');
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.doesNotMatch(script, /userAgent\s*:|setExtraHTTPHeaders|x-vercel-protection-bypass|x-vercel-bypass|signInWith|\.rpc\(|method:\s*["'](POST|PUT|PATCH|DELETE)/i);
  assert.match(read('scripts/site-check.mjs'), /חסימה בקצה[^\n]*דווחו ואל תעקפו/, 'an edge block is reported, never bypassed');
  assert.match(read('.claude/commands/check-site.md'), /do not ask for a password or a login code/);
});
