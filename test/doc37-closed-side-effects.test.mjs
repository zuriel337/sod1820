import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rm } from 'node:fs/promises';

const outputs = [];
async function compiled(entry, reading = true) {
  const outfile = resolve(`.test-closed-side-effects-${outputs.length}-${process.pid}.mjs`); outputs.push(outfile);
  const stub = {
    'supabase.js': `const hit=(...args)=>{globalThis.__closedEffects.push(args);return Promise.resolve({});};export const supabase={from:table=>({insert:body=>hit(table,body)}),rpc:hit};export const getNotificationPrefs=()=>hit('follow-read');`,
    'visitorId.js': `export const getVisitorId=()=>{globalThis.__closedEffects.push(['visitor']);return 'fixture-visitor';};`,
    'identity.js': `export const getSodId=()=> 'fixture-person';export const appContext=()=> 'browser';export const sessionId=()=> 'fixture-session';`,
    'theme.js': 'export const F={heading:"sans-serif",body:"sans-serif"};',
    'palette.js': `export const PALETTES={};export const usePalette=()=>{globalThis.__closedEffects.push(['mounted-follow-controller']);return {};};`,
    'AuthContext.jsx': `export const useAuth=()=>({user:null});`,
    'commandCenter.js': `export const watchToggle=()=>{globalThis.__closedEffects.push(['follow-write']);};`,
    'push.js': `export const PUSH_CONFIGURED=true;export const pushSupported=()=>{globalThis.__closedEffects.push(['push-support']);return true;};export const enablePush=()=>{globalThis.__closedEffects.push(['push']);};`,
    'EmailVerify.jsx': 'export default function Verify(){return null;}',
    'WatchControl2029.jsx': 'export default function Control(){return null;}',
  };
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile,
    external: ['react', 'react/jsx-runtime'], define: { __SOD_2029_BUILD__: String(reading),
      'import.meta.env.VITE_PUBLIC_READING_RELEASE': '"public-reading-20261101"',
      'import.meta.env.VITE_META_PIXEL_ID': '"fixture-meta"', 'import.meta.env.VITE_GOOGLE_ADS_ID': '"AW-fixture"' },
    plugins: [{ name: 'IO-boundaries', setup(b) {
      b.onResolve({ filter: /\/(supabase\.js|visitorId\.js|identity\.js|theme\.js|palette\.js|AuthContext\.jsx|commandCenter\.js|push\.js|EmailVerify\.jsx|WatchControl2029\.jsx)$/ }, args => ({ path: args.path.split('/').at(-1), namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: stub[args.path], loader: 'js' }));
    } }] });
  return import(pathToFileURL(outfile));
}
const tracking = await compiled('src/lib/tracking.js');
const events = await compiled('src/lib/events.js');
const marketing = await compiled('src/lib/marketing.js');
const watch = await compiled('src/components/WatchButton.jsx');
const legacy = await compiled('src/lib/tracking.js', false);
after(async () => { await Promise.all(outputs.map(path => rm(path, { force: true }))); delete globalThis.__closedEffects; });

test('closed Follow never mounts its controller, creates identity or reads preferences', () => {
  globalThis.__closedEffects = [];
  const html = renderToStaticMarkup(React.createElement(watch.default, { topic: 'stream:reality', variant: '2029',
    followIO: { read: () => assert.fail('unexpected custom read'), toggle: () => assert.fail('unexpected toggle') } }));
  assert.match(html, /disabled/); assert.match(html, /data-follow-state="unavailable"/);
  assert.ok(!html.includes('aria-pressed="false"'), 'closed is not a measured not-following state');
  assert.deepEqual(globalThis.__closedEffects, []);
});

test('reading profile suppresses both telemetry sinks, marketing and sharing credits before attempted IO', () => {
  globalThis.__closedEffects = [];
  globalThis.window = { fbq: () => assert.fail('pixel'), gtag: () => assert.fail('ads') };
  tracking.track('home'); tracking.trackShare('facebook', 'fixture'); tracking.trackWhatsappJoin('home');
  tracking.captureArrivalSource(); tracking.captureAcquisition(); tracking.initAppInstallTracking();
  events.emit('home', 'view'); marketing.initMarketing(); marketing.trackMarketingPageview(); marketing.trackConversion('share');
  assert.deepEqual(globalThis.__closedEffects, []);
});

test('reading errors remain locally visible, sanitized and deduplicated with zero telemetry IO', () => {
  globalThis.__closedEffects = []; const listeners = {}, warnings = [], original = console.warn;
  globalThis.window = { location: { pathname: '/post/fixture?token=secret' }, addEventListener: (type, cb) => { listeners[type] = cb; } };
  console.warn = (...args) => warnings.push(args);
  try {
    assert.equal(tracking.initRuntimeErrorCapture(), true);
    for (let i = 0; i < 10; i++) listeners.error({ message: 'error person@example.invalid', filename: 'https://fixture.invalid/page?token=secret', error: new Error('test') });
    assert.equal(warnings.length, 1); assert.ok(!JSON.stringify(warnings).includes('person@example.invalid'));
    assert.ok(!JSON.stringify(warnings).includes('token=secret')); assert.deepEqual(globalThis.__closedEffects, []);
  } finally { console.warn = original; }
});

test('Legacy tracking retains its existing two sinks', async () => {
  globalThis.__closedEffects = []; globalThis.document = { cookie: 'vb=browser', referrer: '' };
  globalThis.window = { location: { pathname: '/legacy' } };
  globalThis.location = { pathname: '/legacy', search: '', host: 'fixture.invalid' };
  legacy.track('legacy', 'fixture', 'click'); await Promise.resolve();
  assert.ok(globalThis.__closedEffects.some(x => x[0] === 'visitor_events'));
  assert.ok(globalThis.__closedEffects.some(x => x[0] === 'ingest_event'));
});
