import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { submitNewsletterSignup } from '../src/lib/newsletterSignup.js';
import { openingSubscriber, openingExistingStatus, canReceiveNewsletter, siteUpdatesSubscriber, siteUpdatesExistingStatus } from '../supabase/functions/newsletter-signup/purpose.js';
const endpoint = 'https://mail.invalid/functions/v1/newsletter-signup';
const contractHeaders = { 'x-newsletter-purpose-contract': 'opening-parts-v1' };
const consented = { ...openingSubscriber('reader@example.invalid', true, '2026-11-02T00:00:00Z'), unsubscribed_at: null };
async function handler(name, fetch, client, env = {}) {
  const { outputFiles } = await build({ entryPoints: [`supabase/functions/${name}/index.ts`], bundle: true, write: false, format: 'iife', platform: 'neutral', plugins: [{ name: 'offline-supabase', setup(b) { b.onResolve({ filter: /^jsr:/ }, () => ({ path: 'client', namespace: 'test' })); b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const createClient = globalThis.offlineClient;' })); } }] });
  let captured;
  vm.runInNewContext(outputFiles[0].text, { Deno: { env: { get: k => ({ SUPABASE_URL: 'https://mail.invalid', SUPABASE_SERVICE_ROLE_KEY: 'offline-test-only', ...env }[k]) }, serve: fn => captured = fn }, fetch, offlineClient: () => client, Response, Request, URL, crypto: webcrypto, TextEncoder, btoa, atob, console });
  return captured;
}
const post = (body) => new Request(endpoint + '?format=json', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('old server cannot silently convert opening-only request into general newsletter', async () => {
  const methods = [];
  await assert.rejects(submitNewsletterSignup({ email: 'reader@example.invalid', consent: true, purpose: 'site-openings' }, { endpoint, request: async (_, options) => { methods.push(options.method); return new Response(null); } }), /purpose-unavailable/);
  assert.deepEqual(methods, ['OPTIONS']);
});
test('opening consent is explicit, sends no marketing acquisition and requires server purpose receipt', async () => {
  const calls = [];
  const request = async (_, options) => { calls.push(options); return options.method === 'OPTIONS' ? new Response(null, { headers: contractHeaders }) : Response.json({ ok: true, status: 'new', purpose: 'site-openings', contract: 'opening-parts-v1' }); };
  await assert.rejects(submitNewsletterSignup({ email: 'reader@example.invalid', consent: false, purpose: 'site-openings' }, { endpoint, request }), /consent/);
  assert.equal(calls.length, 0);
  assert.deepEqual(await submitNewsletterSignup({ email: 'Reader@example.invalid', consent: true, purpose: 'site-openings', acquisition: { private: 'must-not-send' } }, { endpoint, request }), { status: 'new' });
  assert.deepEqual(JSON.parse(calls[1].body), { email: 'reader@example.invalid', purpose: 'site-openings', consent: true, source: '2029-opening-parts' });
});
test('fresh opening-only consent writes exactly one existing subscriber row; no welcome/referral/follow/identity/telemetry', async () => {
  const calls = [];
  const h = await handler('newsletter-signup', async (url, options) => { calls.push({ url, options }); return new Response('', { status: 201 }); });
  const r = await h(post({ email: 'Reader@example.invalid', purpose: 'site-openings', consent: true, ref: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', visitor_id: 'fake-visitor', acquisition: { campaign: 'bad' } }));
  assert.equal(r.status, 200); assert.equal((await r.json()).purpose, 'site-openings');
  assert.equal(calls.length, 1); assert.equal(calls[0].url, 'https://mail.invalid/rest/v1/subscribers');
  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(body.email_purposes, ['site-openings']); assert.equal(body.source, '2029-opening-parts'); assert.equal(body.email, 'reader@example.invalid');
  for (const key of ['acquisition','visitor_id','ref','user_id']) assert.equal(key in body, false);
});
test('missing consent/unknown purpose/reserved source without purpose produce no DB write', async () => {
  let calls = 0; const h = await handler('newsletter-signup', async () => { calls++; throw Error('unreachable'); });
  for (const body of [{ purpose: 'site-openings' }, { purpose: 'other', consent: true }, { source: '2029-opening-parts' }]) assert.equal((await h(post({ email: 'reader@example.invalid', ...body }))).status, 400);
  assert.equal(calls, 0);
});
test('duplicate opening consent is idempotent; general/suppressed/missing evidence never change subscriptions', async () => {
  for (const [row, ok] of [[consented, true], [{ ...consented, active: false }, false], [{ ...consented, unsubscribed_at: '2026-11-02T01:00Z' }, false], [{ ...consented, email_purposes: ['general'] }, false], [{ ...consented, opening_updates_consented_at: null }, false]]) {
    const calls = [];
    const h = await handler('newsletter-signup', async (url, options = {}) => { calls.push({ url, method: options.method || 'GET' }); return calls.length === 1 ? new Response('duplicate', { status: 409 }) : Response.json([row]); });
    const r = await h(post({ email: 'reader@example.invalid', purpose: 'site-openings', consent: true }));
    assert.equal((await r.json()).ok, ok); assert.deepEqual(calls.map(c=>c.method), ['POST','GET']);
  }
});
test('failed insert/read never returns signup success', async () => {
  const h = await handler('newsletter-signup', async () => new Response('database unavailable', { status: 503 }));
  assert.equal((await (await h(post({ email:'reader@example.invalid',purpose:'site-openings',consent:true }))).json()).ok, false);
});
test('mail cohorts remain separate; unsubscribe overrides every purpose', () => {
  assert.equal(canReceiveNewsletter(consented), false);
  assert.equal(canReceiveNewsletter(consented, 'site-openings'), true);
  assert.equal(canReceiveNewsletter({ ...consented, active: false }, 'site-openings'), false);
  assert.equal(canReceiveNewsletter({ ...consented, email_purposes: ['general'] }), true);
  assert.equal(openingExistingStatus({ ...consented, email_purposes: ['general'] }), 'verification-required');
});
test('actual admin send handler filters purpose, denies non-admin and fails closed on schema/read error', async () => {
  for (const purpose of [undefined, 'site-openings']) {
    const filters = []; let networkCalls = 0;
    const q = { select() { return this; }, eq() { return this; }, contains(key,value) { filters.push([key,Array.from(value)]); return this; }, then(resolve) { resolve({ data: [consented, { email:'general@example.invalid',active:true,email_purposes:['general'] }] }); } };
    const client = { auth: { getUser: async () => ({ data: { user: { id:'admin-test' } } }) }, from: table => table === 'users' ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data:{ role:'admin' } }) }) }) } : q };
    const h = await handler('send-newsletter', async () => { networkCalls++; throw Error('no delivery in test'); }, client);
    const r = await h(post({ purpose, dry_run:true })); assert.equal(r.status,200); assert.equal((await r.json()).count,1);
    assert.deepEqual(filters, [['email_purposes',[purpose||'general']]]); assert.equal(networkCalls,0);
  }
  const failedQuery = { select() { return this; }, eq() { return this; }, contains() { return this; }, then(resolve) { resolve({ data: null, error: { message: 'column missing' } }); } };
  const failedClient = { auth: { getUser: async () => ({ data: { user: { id:'admin' } } }) }, from: table => table === 'users' ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role:'admin' } }) }) }) } : failedQuery };
  const fail = await handler('send-newsletter', async () => { throw Error('delivery forbidden'); }, failedClient);
  assert.equal((await fail(post({dry_run:true}))).status,503);
  for (const role of ['user', null]) {
    const client = { auth: { getUser: async () => ({ data: { user: { id:'test' } } }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role } }) }) }) }) };
    const h = await handler('send-newsletter', async () => { throw Error('forbidden'); }, client);
    assert.equal((await h(post({dry_run:true}))).status,403);
  }
});
test('existing other mail consumers require general purpose and opening-only cannot reactivate through tracking', async () => {
  assert.match(await readFile('supabase/functions/welcome-backfill/index.ts','utf8'), /email_purposes=cs\.%7Bgeneral%7D/);
  assert.match(await readFile('supabase/functions/send-reengage/index.ts','utf8'), /contains\("email_purposes", \["general"\]\)/);
  assert.match(await readFile('supabase/functions/nl-track/index.ts','utf8'), /const reactivated = !subscriber.active && Array.isArray\(subscriber.email_purposes\) && subscriber.email_purposes.includes\("general"\)/);
});

test('actual welcome cron reader excludes opening-only and returns read failure honestly', async () => {
  for (const fail of [false,true]) {
    const urls=[];
    const h=await handler('welcome-backfill', async url => {
      urls.push(url);
      if (url.includes('/newsletter_welcome?')) return Response.json([{subject:'test',html:'synthetic template'}]);
      if (url.includes('/email_events?')) return Response.json([]);
      if (url.includes('/subscribers?')) { assert.equal(new URL(url).searchParams.get('email_purposes'),'cs.{general}'); return fail ? new Response('failed',{status:503}) : Response.json([{email:'general@example.invalid'}]); }
      throw Error('unexpected send/write');
    },null,{RESEND_API_KEY:'offline-only',FB_ADMIN_KEY:'offline-admin'});
    const r=await h(new Request('https://mail.invalid/?mode=send&dry=1',{headers:{'x-fb-admin-key':'offline-admin'}}));
    assert.equal(r.status,fail?503:200); assert.equal(urls.length,3);
  }
});
test('actual tracking resolve cannot reactivate opening-only suppressed address', async () => {
  let writes=0;
  const client={from:table=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:table==='newsletter_sends'?null:{...consented,active:false,name:null}}),update(){writes++;return this;},is(){return Promise.resolve({});}})};
  const h=await handler('nl-track',async()=>{throw Error('no external request');},client);
  const r=await h(new Request('https://mail.invalid/?t=synthetic-token'));
  assert.equal(r.status,200); assert.equal((await r.json()).reactivated,false); assert.equal(writes,0);
});
test('opening announcement content keeps signed unsubscribe and omits marketing tracking', async () => {
  const q={select(){return this;},eq(){return this;},contains(){return this;},then(resolve){resolve({data:[consented]});}};
  const client={auth:{getUser:async()=>({data:{user:{id:'admin-test'}}})},from:table=>table==='users'?{select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'admin'}})})})}:q};
  const sent=[];
  const h=await handler('send-newsletter',async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');sent.push(JSON.parse(options.body));return Response.json({id:'offline-message'});},client,{RESEND_API_KEY:'offline-provider'});
  const r=await h(post({purpose:'site-openings',subject:'נפתח חלק',html:'<a href="https://sod1820.co.il/world">לעולם</a>',test_email:'fixture@example.invalid'}));
  assert.equal(r.status,200,await r.text());assert.equal(sent.length,1);
  assert.match(sent[0].html,/פתיחת חלקים באתר בלבד/);assert.match(sent[0].html,/unsubscribe\?e=/);
  assert.doesNotMatch(sent[0].html,/nl-track|email-open|nlid=|src=nl/);
});

// ---- one public product: "עדכוני האתר" (purpose site-updates). Historical opening-only consent is never widened.
const updatesConsented = { ...siteUpdatesSubscriber('reader@example.invalid', true, '2026-11-03T00:00:00Z'), unsubscribed_at: null };
test('site-updates signup writes one existing subscriber row under its own purpose and consent timestamp', async () => {
  const calls = [];
  const h = await handler('newsletter-signup', async (url, options) => { calls.push({ url, options }); return new Response('', { status: 201 }); });
  const r = await h(post({ email: 'Reader@example.invalid', purpose: 'site-updates', consent: true, ref: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', visitor_id: 'v', acquisition: { c: 1 } }));
  const result = await r.json();
  assert.equal(r.status, 200); assert.equal(result.purpose, 'site-updates'); assert.equal(result.contract, 'site-updates-v1');
  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(body.email_purposes, ['site-updates']); assert.equal(body.source, '2029-site-updates'); assert.ok(Date.parse(body.site_updates_consented_at));
  for (const key of ['acquisition', 'visitor_id', 'ref', 'user_id', 'opening_updates_consented_at']) assert.equal(key in body, false);
});
test('site-updates requires consent, its own source pairing, and capability is advertised for both contracts', async () => {
  let writes = 0; const h = await handler('newsletter-signup', async () => { writes++; throw Error('unreachable'); });
  for (const body of [{ purpose: 'site-updates' }, { purpose: 'site-updates', consent: true, source: '2029-opening-parts' }, { purpose: 'site-openings', consent: true, source: '2029-site-updates' }, { source: '2029-site-updates' }]) assert.equal((await h(post({ email: 'reader@example.invalid', ...body }))).status, 400);
  assert.equal(writes, 0);
  const options = await h(new Request(endpoint, { method: 'OPTIONS' }));
  assert.deepEqual(options.headers.get('x-newsletter-purpose-contract').split(','), ['opening-parts-v1', 'site-updates-v1']);
});
test('historical opening-only consent is not treated as site-updates consent, and the reverse', async () => {
  assert.equal(siteUpdatesExistingStatus(consented), 'verification-required');
  assert.equal(siteUpdatesExistingStatus(updatesConsented), 'exists');
  assert.equal(openingExistingStatus(updatesConsented), 'verification-required');
  assert.equal(canReceiveNewsletter(consented, 'site-updates'), false);
  assert.equal(canReceiveNewsletter(updatesConsented, 'site-updates'), true);
  assert.equal(canReceiveNewsletter(updatesConsented, 'site-openings'), false);
  assert.equal(canReceiveNewsletter(updatesConsented), false);
  assert.equal(canReceiveNewsletter({ ...updatesConsented, unsubscribed_at: '2026-11-03T01:00Z' }, 'site-updates'), false);
  for (const [row, ok] of [[updatesConsented, true], [consented, false], [{ ...updatesConsented, active: false }, false]]) {
    const calls = [];
    const h = await handler('newsletter-signup', async (url, options = {}) => { calls.push({ url, method: options.method || 'GET' }); return calls.length === 1 ? new Response('duplicate', { status: 409 }) : Response.json([row]); });
    const r = await h(post({ email: 'reader@example.invalid', purpose: 'site-updates', consent: true }));
    assert.equal((await r.json()).ok, ok); assert.deepEqual(calls.map(c => c.method), ['POST', 'GET']); assert.match(calls[1].url, /site_updates_consented_at/);
  }
});
test('client: site-updates probes its own contract, sends exact body, rejects wrong receipt', async () => {
  const calls = [];
  const request = (receipt) => async (_, options) => { calls.push(options); return options.method === 'OPTIONS' ? new Response(null, { headers: { 'x-newsletter-purpose-contract': 'opening-parts-v1,site-updates-v1' } }) : Response.json(receipt); };
  assert.deepEqual(await submitNewsletterSignup({ email: 'Reader@example.invalid', consent: true, purpose: 'site-updates' }, { endpoint, request: request({ ok: true, status: 'new', purpose: 'site-updates', contract: 'site-updates-v1' }) }), { status: 'new' });
  assert.deepEqual(JSON.parse(calls[1].body), { email: 'reader@example.invalid', purpose: 'site-updates', consent: true, source: '2029-site-updates' });
  await assert.rejects(submitNewsletterSignup({ email: 'reader@example.invalid', consent: true, purpose: 'site-updates' }, { endpoint, request: request({ ok: true, status: 'new', purpose: 'site-openings', contract: 'opening-parts-v1' }) }), /purpose-unavailable/);
  const methods = [];
  await assert.rejects(submitNewsletterSignup({ email: 'reader@example.invalid', consent: true, purpose: 'site-updates' }, { endpoint, request: async (_, options) => { methods.push(options.method); return new Response(null, { headers: contractHeaders }); } }), /purpose-unavailable/);
  assert.deepEqual(methods, ['OPTIONS']);
});
test('admin send selects site-updates cohort only; no tracking and an honest footer; other sends never read the new column', async () => {
  const selects = []; const filters = [];
  const q = { select(columns) { selects.push(columns); return this; }, eq() { return this; }, contains(key, value) { filters.push([key, Array.from(value)]); return this; }, then(resolve) { resolve({ data: [updatesConsented, consented, { email: 'g@example.invalid', active: true, email_purposes: ['general'] }] }); } };
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'admin-test' } } }) }, from: table => table === 'users' ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin' } }) }) }) } : q };
  const h = await handler('send-newsletter', async () => { throw Error('no delivery'); }, client);
  const r = await h(post({ purpose: 'site-updates', dry_run: true }));
  assert.equal((await r.json()).count, 1); assert.deepEqual(filters, [['email_purposes', ['site-updates']]]); assert.match(selects[0], /site_updates_consented_at/);
  selects.length = 0; await h(post({ dry_run: true })); await h(post({ purpose: 'site-openings', dry_run: true }));
  assert.ok(selects.every(columns => !columns.includes('site_updates_consented_at')));
  const q2 = { select() { return this; }, eq() { return this; }, contains() { return this; }, then(resolve) { resolve({ data: [updatesConsented] }); } };
  const client2 = { ...client, from: table => table === 'users' ? client.from(table) : q2 };
  const sent = [];
  const sender = await handler('send-newsletter', async (url, options) => { sent.push(JSON.parse(options.body)); return Response.json({ id: 'offline' }); }, client2, { RESEND_API_KEY: 'offline-provider' });
  const res = await sender(post({ purpose: 'site-updates', subject: 'חדש באתר', html: '<a href="https://sod1820.co.il/2029/posts">לפוסטים</a>', test_email: 'fixture@example.invalid' }));
  assert.equal(res.status, 200, await res.text());
  assert.match(sent[0].html, /נרשמת לעדכוני האתר/); assert.match(sent[0].html, /unsubscribe\?e=/); assert.doesNotMatch(sent[0].html, /nl-track|email-open|nlid=|src=nl/);
});
