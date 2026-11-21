import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { ROYAL_PALACE_ATMOSPHERE_2029, BRAND_LOCKUP_2029 } from '../src/lib/brandAssets2029.js';
import { contextNavigationItems2029 } from '../src/components/experience2029/razielSessionSeam2029.js';

test('approved palace delivery is fingerprinted WebP, responsive, shared and cacheable', () => {
  for (const [kind, url] of Object.entries(ROYAL_PALACE_ATMOSPHERE_2029)) {
    const bytes = fs.readFileSync(`public${url}`);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(url.includes(createHash('sha256').update(bytes).digest('hex').slice(0, 12)));
    assert.ok(bytes.length <= (kind === 'mobile' ? 31000 : 90000));
  }
  for (const file of ['vercel.json', 'public-reading-deploy/vercel.json']) {
    for (const url of Object.values(ROYAL_PALACE_ATMOSPHERE_2029)) {
      const rules = JSON.parse(fs.readFileSync(file)).headers;
      const index = rules.findIndex(r => r.source === url);
      assert.ok(index > rules.findIndex(r => r.source === '/(.*)'));
      assert.ok(rules[index].headers.some(h => h.key === 'Cache-Control' && h.value.includes('immutable')));
    }
  }
  assert.equal(BRAND_LOCKUP_2029.sha256, '3f8a2a2fdc0a5a141d10b63bc633eefbd9ba2bfe7dbf7521f3984c21830dcd18');
});

test('intro navigation keeps absent targets as text and preserves exact return addresses', () => {
  const currentHref = '/world?view=updates#source';
  const context = { subject: { type: 'topic', label: 'נושא ללא כתובת' }, returnTo: { label: 'המקור', href: '/post/example?view=source#unit-2' } };
  const items = contextNavigationItems2029(context, { currentHref, pageTitle: 'העולם' });
  assert.equal(items.find(i => i.key === 'subject').href, null);
  assert.equal(items.find(i => i.key === 'return').href, context.returnTo.href);
  assert.equal(items.find(i => i.key === 'page').href, currentHref);
  assert.ok(!contextNavigationItems2029(null, { currentHref, pageTitle: 'העולם' }).some(i => i.key === 'return'));
});
