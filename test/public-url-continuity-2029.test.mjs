import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicReadingContinuation, publicReadingPath, publicReadingFeatureLock, publicReadingCapability } from '../src/lib/publicReadingRelease2029.js';
import { publicReadingDocumentHandler } from '../public-reading-deploy/api/public-document.js';
import { publicPostHref } from '../src/lib/publicPostUrls.js';

const SITE = 'https://sod1820.co.il';
const document = '<html><head><title>2029</title></head><body><div id="root"></div></body></html>';
const handler = publicReadingDocumentHandler({ authorized: () => true, readDocument: async () => document });
const response = () => ({ code: null, headers: new Map(), body: '', setHeader(k, v) { this.headers.set(k.toLowerCase(), v); }, status(code) { this.code = code; return this; }, send(body) { this.body = String(body); return this; } });
const request = path => ({ method: 'GET', headers: { host: 'sod1820.co.il' }, url: path,
  query: { ...Object.fromEntries(new URL(path, SITE).searchParams), path: new URL(path, SITE).pathname } });
const json = (value, count) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json', ...(count == null ? {} : { 'content-range': `0-${Math.max(0, value.length - 1)}/${count}` }) } });
async function isolated(fetcher, run) {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  try { await run(); } finally { globalThis.fetch = original; }
}
const forbidden = () => { throw new Error('Unexpected network operation in synthetic acceptance'); };
const metadata = async path => { const res = response(); await handler(request(path), res); return res; };

test('hosted document rewrite cannot inject its route into the visitor community path selector', async () => {
  const config = JSON.parse(readFileSync(new URL('../public-reading-deploy/vercel.json', import.meta.url)));
  assert.equal(config.rewrites.find(rule => rule.source === '/((?!api(?:/|$)).*)').destination, '/api/public-document');
  const alias = await metadata('/chat?part=2&part=7');
  assert.equal(alias.code, 308);
  assert.equal(alias.headers.get('location'), '/community/chat?part=2&part=7');
  await isolated(forbidden, async () => {
    assert.equal((await metadata('/community/chat?part=2&part=7')).code, 200);
    // An actual visitor-provided invalid focus still fails closed.
    assert.equal((await metadata('/community/chat?path=%2Fchat')).code, 404);
  });
});

test('exact aliases retain duplicate query bytes, encoded values and fragment with no chained fallback', () => {
  for (const [old, target] of [['/chat','/community/chat'], ['/דף-צאט-ראשי','/community/chat'], ['/tag/צאט','/community/chat'],
    ['/posts','/post'], ['/גימטריה','/gematria'], ['/book','/books'], ['/books/ahavat-torah','/book/ahavat-torah'],
    ['/888','/community/researcher/888'], ['/about','/contact'], ['/צור-קשר','/contact'], ['/profile','/2029/me/profile']]) {
    const suffix = '?part=2&part=7&encoded=%2f%2F+%20&path=%2Fkept';
    assert.equal(publicReadingContinuation(old, suffix, '#message-a'), target + suffix + '#message-a');
    assert.equal(publicReadingContinuation(target, suffix, '#message-a'), null);
  }
  assert.equal(publicReadingContinuation('/2029','?preview=community&thread=abc&reply=def','#reply'), '/community/chat?preview=community&thread=abc&reply=def#reply');
  assert.equal(publicReadingContinuation('/research','?tool=gematria&w=%D7%93%D7%95%D7%93&method=milui'), '/gematria?tool=gematria&w=%D7%93%D7%95%D7%93&method=milui');
  assert.equal(publicReadingContinuation('/tag/chat-about-history'), null);
  assert.equal(publicReadingContinuation('/research','?tool=other'), null);
});

test('public reading routes preserve engine/action gates and exact source identities', () => {
  for (const path of ['/community','/community/chat','/community/calculator','/tag/סוד-החשמל','/category/אסונות%2Fתופעות-טבע',
    '/number/1820','/number/אחת%20ארבע','/books','/book/ahavat-torah','/codes','/codes/מחקר','/or-geula','/contact']) assert.equal(publicReadingPath(path),'public',path);
  for (const path of ['/code','/journey','/raziel','/heichal','/2029/me/unknown']) assert.equal(publicReadingPath(path),'closed',path);
  assert.equal(publicReadingPath('/2029/me/profile'),'account');
  for (const path of ['/not/a/real/page','/category/x/y','/code/invented','/%ZZ']) assert.equal(publicReadingPath(path),'missing',path);
  assert.equal(publicReadingPath('/unknown-post'),'post-lookup');
  for (const key of ['lock_els','lock_life_journey','lock_raziel_site','lock_heichal','unknown']) assert.equal(publicReadingFeatureLock(key).enabled,true);
  assert.match(publicReadingCapability('/name').title,/השם/);
  assert.equal(publicPostHref({slug:'old',wp_id:1820,source:'wordpress'}),'/old');
  assert.equal(publicPostHref({slug:'new',wp_id:40000,source:'sod1820'}),'/post/new');
});

test('real HTTP aliases perform only a local 308, never query data or interpret return/identity parameters', async () => {
  await isolated(forbidden, async () => {
    const res = await metadata('/2029?preview=community&thread=a&reply=b&part=2&part=7');
    assert.equal(res.code,308); assert.equal(res.headers.get('location'),'/community/chat?preview=community&thread=a&reply=b&part=2&part=7');
    assert.equal((await metadata('/books/ahavat-torah?chapter=2&page=7')).headers.get('location'),'/book/ahavat-torah?chapter=2&page=7');
  });
});

test('community share metadata retains an admitted exact thread/reply, without requesting account or body fields', async () => {
  const root = '00000000-0000-4000-8000-000000000001', reply = '00000000-0000-4000-8000-000000000002';
  const path = `/community/chat?thread=${root}&reply=${reply}&path=${root},${reply}`;
  await isolated(async (url, options) => {
    assert.equal(new URL(url).pathname, '/rest/v1/rpc/community_message_context');
    assert.equal(new URL(url).searchParams.get('select'), 'id,parent_id,origin,is_deleted');
    assert.equal(options.method, 'POST'); assert.deepEqual(JSON.parse(options.body), {p_id:reply});
    return json([{id:root,parent_id:null,origin:'openweb'}, {id:reply,parent_id:root,origin:'community_2029'}]);
  }, async () => {
    const res = await metadata(path); assert.equal(res.code,200);
    assert.ok(res.body.includes(`thread=${root}&amp;reply=${reply}`));
    assert.match(res.headers.get('x-robots-tag'),/noindex/);
  });
  await isolated(async () => json([]), async () => assert.equal((await metadata(path)).code,404));
  await isolated(async () => { throw Error('synthetic outage'); }, async () => assert.equal((await metadata(path)).code,503));
  await isolated(forbidden, async () => assert.equal((await metadata('/community/chat?thread=invented')).code,404));
});

test('taxonomy HTTP uses the same membership, public admission, page order and encoded-slash label', async () => {
  await isolated(async url => {
    const params = new URL(url).searchParams;
    assert.equal(params.get('order'),'modified.desc.nullslast,id.asc');
    assert.match(params.get('or'),/tags.not.ov/);
    assert.equal(params.get('categories'),'ov.{"אסונות/תופעות טבע"}');
    return json([{id:1,title:'Public',categories:['אסונות/תופעות טבע'],tags:[]}],1);
  }, async () => {
    const res = await metadata('/category/אסונות%2Fתופעות-טבע');
    assert.equal(res.code,200); assert.match(res.body,/אסונות\/תופעות טבע/);
  });
});

test('missing/draft/conflicting/invalid taxonomy URLs are never invented as successful collections', async () => {
  await isolated(forbidden, async () => {
    for (const path of ['/tag/טיוטה','/tag/פורום','/tag/existing?category=other','/tag/existing?page=0','/tag/existing?page=1&page=2','/post?tag=טיוטה','/post?tag=a&category=b'])
      assert.equal((await metadata(path)).code,404,path);
  });
  await isolated(async () => json([],0), async () => {
    for (const path of ['/tag/unknown','/post?tag=unknown','/2029/posts?category=unknown']) assert.equal((await metadata(path)).code,404,path);
  });
  await isolated(async () => { throw Error('synthetic source outage'); }, async () => assert.equal((await metadata('/tag/known')).code,503));
});

test('an empty search needs an unfiltered public membership witness, and paging stays noindex/base canonical', async () => {
  const row = {id:1,title:'Public',tags:['שלום'],categories:[]};
  await isolated(async url => new URL(url).searchParams.has('title') ? json([],0) : json([row],1), async () => {
    const res = await metadata('/tag/שלום?q=missing'); assert.equal(res.code,200); assert.match(res.headers.get('x-robots-tag'),/noindex/);
  });
  await isolated(async () => json([],0), async () => assert.equal((await metadata('/tag/unknown?q=missing')).code,404));
  await isolated(async () => json([row],25), async () => {
    const res = await metadata('/tag/שלום?page=2'); assert.equal(res.code,200); assert.match(res.headers.get('x-robots-tag'),/noindex/);
    assert.ok(!res.body.match(/rel="canonical"[^>]+\?page=/));
  });
});

test('named services remain truthful and do not make missing items, drafts or malformed people pages public', async () => {
  await isolated(forbidden, async () => {
    for (const path of ['/name','/journey','/credits','/contact','/early-access','/melech-hamisparim/718']) assert.equal((await metadata(path)).code,200,path);
    for (const path of ['/or-geula?v=','/or-geula?page=0','/members?page=0','/community/researchers?page=1&page=2','/forum/not-an-id']) assert.equal((await metadata(path)).code,404,path);
  });
  await isolated(async url => {
    const params = new URL(url).searchParams;
    if (new URL(url).pathname.endsWith('/els_records')) { assert.equal(params.get('status'),'eq.published'); assert.equal(params.get('visibility'),'eq.public'); }
    return json([]);
  }, async () => {
    for (const path of ['/book/missing','/codes/missing','/unknown-real-looking-slug','/forum/00000000-0000-4000-8000-000000000001']) assert.equal((await metadata(path)).code,404,path);
  });
});

test('phrase metadata never truncates a phrase beginning with digits to an unrelated Number', async () => {
  await isolated(async url => String(url).includes('/rpc/is_phrase_indexable') ? json(false) : json([]), async () => {
    const res = await metadata('/number/1820abc'); assert.equal(res.code,200); assert.match(res.body,/1820abc/); assert.doesNotMatch(res.body,/api\/card\?n=1820(?:["&])/);
  });
});

test('known campaign content does not enable held signup or automatic acquisition', () => {
  for (const file of ['EarlyAccess2029Page.jsx','Campaign718Page2029.jsx']) {
    const code = readFileSync(new URL('../src/pages/'+file,import.meta.url),'utf8');
    assert.match(code,/event\.preventDefault\(\);\s*if \(PUBLIC_READING_RELEASE\) return;/);
    assert.match(code,/document\.title = [^\n]+\n\s*if \(PUBLIC_READING_RELEASE\) return;/);
    assert.match(code,/PUBLIC_READING_RELEASE \? <p role="status">/);
  }
});
