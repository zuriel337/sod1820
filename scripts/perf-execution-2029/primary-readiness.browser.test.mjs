// Static DOM regressions, not site performance evidence. Chromium is mandatory.
// PERF_PRIMARY_SOURCE selects the previous implementation for the negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import isolation from '../ci-isolation/policy.cjs';
const { chromium } = createRequire(`${process.env.PLAYWRIGHT_DIR}/node_modules/`)('playwright');
const { primaryContentState, installBrowserMetrics, sessionWindowCls } = await import(
  process.env.PERF_PRIMARY_SOURCE ? pathToFileURL(process.env.PERF_PRIMARY_SOURCE).href : './browser-metrics.mjs'
);
let browser;
test.before(async () => {
  isolation.requireIsolation();
  browser = await chromium.launch({ executablePath: process.env.PERF_CHROME, args: isolation.browserArgs });
});
test.after(async () => { await browser?.close(); });
const link = '<a href="/post/example" style="display:block;height:40px">Read the source</a>';
const title = '<h2 class="h29-card-t" style="margin:0;height:40px">Actual source title</h2>';
const card = (attrs = '', content = title + link) => `<article class="h29-card" ${attrs}>${content}</article>`;
const hero = (attrs = '') => `<section class="h29-hero" ${attrs}><h1>Actual source title</h1>${link}</section>`;
const home = content => `<!doctype html><style>body{margin:0} main{min-height:100px}</style><main><div data-experience-capability="home-composition">${content}</div></main>`;
async function withPage(fn) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await page.route('**/*', route => route.abort('blockedbyclient'));
  try { return await fn(page); } finally { await page.close(); }
}
const cases = [
  ['transparent card', card('style="opacity:0"'), false],
  ['transparent ancestor', `<div style="opacity:0">${card()}</div>`, false],
  ['unfinished reveal', `<div style="opacity:.5">${card()}</div>`, false],
  ['below viewport', `<div style="height:3000px"></div>${card()}`, false],
  ['outside viewport horizontally', card('style="position:absolute;left:-1000px;width:300px"'), false],
  ['covered content', card() + '<div style="position:fixed;inset:0;background:black"></div>', false],
  ['inert old route', `<div inert>${card()}</div>`, false],
  ['unavailable hero with post link', hero().replace('class="h29-hero"', 'class="h29-hero is-unavailable"'), false],
  ['notice containing the only post link', card('', title + `<div class="h29-notice">${link}</div>`), false],
  ['transparent title', card('', title.replace('margin:0', 'opacity:0;margin:0') + link), false],
  ['transparent destination', card('', title + link.replace('display:block', 'opacity:0;display:block')), false],
  ['skeleton', card('aria-busy="true"'), false],
  ['ready marker without content', '<div data-h29-primary="ready"><section class="h29-hero is-loading"><h1>Loading</h1></section></div>', false],
  ['ordinary card', card(), true],
  ['ordinary hero', hero(), true],
  ['real content beside notice', card() + '<div class="h29-notice">Failed area <button>Retry</button></div>', true],
  ['completed reveal', card('style="opacity:.95"'), true],
  ['first hidden copy does not mask another visible hero', hero('style="display:none"') + hero(), true],
];
for (const [name, content, expected] of cases) {
  test(`Home primary readiness: ${name}`, () => withPage(async page => {
    await page.setContent(home(content));
    assert.equal((await page.evaluate(primaryContentState, '/')).primary, expected);
  }));
}
test('readiness is recorded only after the real content becomes usable', () => withPage(async page => {
  await page.setContent(home(card('style="opacity:0"')));
  await page.evaluate(`window.__primaryContentState=${primaryContentState};window.__sessionWindowCls=${sessionWindowCls};(${installBrowserMetrics})({pathname:'/'});`);
  await page.waitForTimeout(75);
  assert.equal(await page.evaluate(() => window.__perf.ready), null);
  const revealAt = await page.evaluate(() => {
    document.querySelector('.h29-card').style.opacity = '1';
    return performance.now();
  });
  await page.waitForFunction(() => window.__perf.ready !== null);
  assert.ok(await page.evaluate(t => window.__perf.ready >= t, revealAt));
}));
