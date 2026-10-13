import test from 'node:test';
import assert from 'node:assert/strict';
import { safeOAuthReturnPath, googleOAuthRequest } from '../src/lib/oauthReturn.js';

test('returns to the initiating local route including its query, without an auth fragment', () => {
  const route = '/2029/posts/elections?view=source';
  assert.equal(safeOAuthReturnPath(route + '#access_token=private'), route);
  assert.deepEqual(googleOAuthRequest({ origin: 'https://sod1820.co.il', returnTo: route }), {
    provider: 'google', options: { redirectTo: 'https://sod1820.co.il' + route },
  });
  assert.equal(googleOAuthRequest({ origin: 'https://sod1820.co.il' }).options.redirectTo, 'https://sod1820.co.il/');
});

test('external, encoded, malformed and control-character targets cannot change origin', () => {
  for (const value of [null, {}, '', 'https://evil.example', '//evil.example', '/\\evil.example',
    '/%2fevil.example', '/%5cevil.example', '/%0a/evil.example', '/\tevil.example',
    '/bad%escape', '/a/..//evil.example', 'javascript:alert(1)']) {
    assert.equal(safeOAuthReturnPath(value), '/', String(value));
  }
  assert.equal(safeOAuthReturnPath('/2029/חיפוש?q=שלום%20עולם'), '/2029/%D7%97%D7%99%D7%A4%D7%95%D7%A9?q=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%A2%D7%95%D7%9C%D7%9D');
});

test('unverified previews fail before an OAuth request can be built', () => {
  for (const config of [
    { origin: 'https://sod1820-preview.vercel.app' },
    { origin: 'https://preview.example', integratedPreview: true },
  ]) assert.throws(() => googleOAuthRequest(config), { code: 'OAUTH_PREVIEW_UNVERIFIED' });
  assert.throws(() => googleOAuthRequest({ origin: 'javascript:alert(1)' }));
  assert.throws(() => googleOAuthRequest({ origin: 'https://sod1820.co.il/path' }));
});
