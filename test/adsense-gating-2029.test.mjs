// AdSense on 2029 (ZURIEL, 11.11.2026): off without a publisher id, off for non-Israeli browsers and bots, only the two reading slots,
// and the two reading pages (post, posts list) are the only places that render a slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { build } from 'esbuild';

async function load(env, { zone = 'Asia/Jerusalem', cookie = 'vb=browser', webdriver = false } = {}) {
  const out = await build({ entryPoints: ['src/lib/adsense.js'], bundle: true, write: false, format: 'cjs', platform: 'neutral',
    define: Object.fromEntries(['VITE_ADSENSE_CLIENT', 'VITE_ADSENSE_SLOT_POST', 'VITE_ADSENSE_SLOT_LIST'].map(key => ['import.meta.env.' + key, JSON.stringify(env[key] || '')])) });
  const appended = [];
  const module = { exports: {} };
  const context = { module, exports: module.exports, Intl: { DateTimeFormat: function () { return { resolvedOptions: () => ({ timeZone: zone }) }; } },
    navigator: { userAgent: 'Mozilla/5.0 Chrome/124 Safari/537.36', webdriver },
    document: { cookie, createElement: () => ({}), head: { appendChild: node => appended.push(node) } } };
  vm.runInNewContext(out.outputFiles[0].text, context);
  return { ads: module.exports, appended };
}
const ids = { VITE_ADSENSE_CLIENT: 'ca-pub-9535875486398314', VITE_ADSENSE_SLOT_POST: '111', VITE_ADSENSE_SLOT_LIST: '222' };

test('enabled only with a well-formed publisher id; slots come from the build', async () => {
  assert.equal((await load({})).ads.ADSENSE_ENABLED, false);
  assert.equal((await load({ VITE_ADSENSE_CLIENT: 'not-a-publisher' })).ads.ADSENSE_ENABLED, false);
  const { ads } = await load(ids);
  assert.equal(ads.ADSENSE_ENABLED, true);
  assert.deepEqual({ ...ads.ADSENSE_SLOTS }, { post: '111', list: '222' });
});

test('shown to Israeli human browsers only; the script is injected once and only when allowed', async () => {
  const israeli = await load(ids);
  assert.equal(israeli.ads.adsAllowedHere(), true);
  israeli.ads.ensureAdSenseScript(); israeli.ads.ensureAdSenseScript();
  assert.equal(israeli.appended.length, 1);
  assert.equal(israeli.appended[0].src, 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9535875486398314');
  for (const [why, options] of [['abroad', { zone: 'Europe/Paris' }], ['unknown zone', { zone: '' }], ['edge says bot', { cookie: 'vb=bot' }], ['webdriver', { cookie: '', webdriver: true }]]) {
    const blocked = await load(ids, options);
    assert.equal(blocked.ads.adsAllowedHere(), false, why);
    blocked.ads.ensureAdSenseScript();
    assert.equal(blocked.appended.length, 0, why + ': no script');
  }
  assert.equal((await load({}, {})).ads.adsAllowedHere(), false, 'no publisher id: no ads');
});

test('only the post page and the posts list render a slot (never home, Beit Midrash, account or experiences)', () => {
  const users = [];
  const walk = dir => { for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = dir + '/' + entry.name;
    if (entry.isDirectory()) walk(path); else if (/\.jsx?$/.test(entry.name) && !/AdSlot\.jsx$/.test(entry.name) && /<AdSlot\b/.test(readFileSync(path, 'utf8'))) users.push(path); } };
  walk('src');
  assert.deepEqual(users.sort(), ['src/pages/Post2029Page.jsx', 'src/pages/Posts2029Page.jsx']);
  assert.match(readFileSync('src/pages/Post2029Page.jsx', 'utf8'), /!projection\.draft && !projection\.privateStage && !projection\.previewSnapshot \? <AdSlot place="post" \/>/);
});
