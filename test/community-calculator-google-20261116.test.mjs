// Contract: what Google sees of the community calculator (/community/calculator).
//
// Why this exists (16.11.2026): this address was the site's main Google landing page for calculator queries (Search Console, 18.6 - 8.11.2026:
// 338 clicks, 31,120 impressions, average position 7.9; the top query was "מחשבון גימטריה"). After the 2029 cutover the title was
// "מחשבון הקהילה — גימטריה, שמות ותאריך עברי" and the description "המחשבון הקיים: ...": neither carried the phrase searchers type, the page said
// nothing a crawler could index beyond its tools, and impressions fell from about 600 a day (31.10) to 1 (6.11). The wording now lives in ONE
// module (src/lib/research/communityCalculatorSeo2029.js) used by the server metadata (api/og.js), the client SEO effect, the visible page and its
// structured data. The structured data is rendered by the page (not by the server): the route SEO gate keeps the server-merged document's
// JSON-LD to the home identity, and Google reads JSON-LD from the rendered page.
//
// Runs the REAL production document handler (the real api/og.js merged into the SPA document); the network is forbidden.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicReadingDocumentHandler } from '../public-reading-deploy/api/public-document.js';
import {
  COMMUNITY_CALCULATOR_EXPLAINER, COMMUNITY_CALCULATOR_FAQ, COMMUNITY_CALCULATOR_LASTMOD, COMMUNITY_CALCULATOR_PATH, COMMUNITY_CALCULATOR_SEO, communityCalculatorJsonLd,
} from '../src/lib/research/communityCalculatorSeo2029.js';

const SITE = 'https://sod1820.co.il';
const SITE_NAME = 'SOD1820';
const document = '<html><head><title>2029</title></head><body><div id="root"></div></body></html>';
const response = () => ({ code: null, headers: new Map(), body: '', setHeader(k, v) { this.headers.set(k.toLowerCase(), v); }, status(code) { this.code = code; return this; }, send(body) { this.body = String(body); return this; } });
const request = path => ({ method: 'GET', headers: { host: 'sod1820.co.il' }, url: path,
  query: { ...Object.fromEntries(new URL(path, SITE).searchParams), path: new URL(path, SITE).pathname } });
const forbidden = () => { throw new Error('Unexpected network operation in synthetic acceptance'); };
async function isolated(run) {
  const original = globalThis.fetch;
  globalThis.fetch = forbidden;
  try { await run(); } finally { globalThis.fetch = original; }
}
const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === SITE, readDocument: async () => document });
const served = async path => { const res = response(); await handler(request(path), res); return res; };
const read = file => readFile(new URL('../' + file, import.meta.url), 'utf8');
const decodeEntities = text => text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const jsonLdBlocks = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));

test('the wording says what searchers type and fits a search result', () => {
  const fullTitle = `${COMMUNITY_CALCULATOR_SEO.title} · ${SITE_NAME}`;
  for (const [name, text] of [['title', COMMUNITY_CALCULATOR_SEO.title], ['description', COMMUNITY_CALCULATOR_SEO.description], ['heading', COMMUNITY_CALCULATOR_SEO.heading]]) {
    assert.match(text, /מחשבון גימטריה/, `${name} carries the phrase "מחשבון גימטריה"`);
  }
  assert.ok(fullTitle.length <= 70, `the title fits a result line (${fullTitle.length} characters)`);
  assert.ok(COMMUNITY_CALCULATOR_SEO.description.length >= 110 && COMMUNITY_CALCULATOR_SEO.description.length <= 160, `the description is a full snippet (${COMMUNITY_CALCULATOR_SEO.description.length} characters)`);
  assert.doesNotMatch(COMMUNITY_CALCULATOR_SEO.description, /המחשבון הקיים/, 'the placeholder wording is gone');
  // Nothing is promised that the page does not do today: no AI analysis, no saving.
  const everything = JSON.stringify([COMMUNITY_CALCULATOR_SEO, COMMUNITY_CALCULATOR_EXPLAINER, COMMUNITY_CALCULATOR_FAQ]);
  assert.doesNotMatch(everything, /\bAI\b|בינה מלאכותית|שמירה|נשמר/, 'no feature that is switched off is advertised');
  assert.equal(new Set(COMMUNITY_CALCULATOR_FAQ.map(item => item.q)).size, COMMUNITY_CALCULATOR_FAQ.length, 'every question is asked once');
  assert.ok(COMMUNITY_CALCULATOR_FAQ.every(item => item.q.endsWith('?') && item.a.length >= 30), 'real questions with real answers');
});

test('the bare address is served with the new title, description, canonical and robots', async () => {
  await isolated(async () => {
    const res = await served(COMMUNITY_CALCULATOR_PATH);
    assert.equal(res.code, 200);
    assert.equal(res.headers.get('x-robots-tag'), 'index, follow');
    assert.match(res.body, /<title>[^<]*<\/title>/);
    assert.equal(decodeEntities(res.body.match(/<title>([^<]*)<\/title>/)[1]), `${COMMUNITY_CALCULATOR_SEO.title} · ${SITE_NAME}`);
    assert.equal(decodeEntities(res.body.match(/<meta name="description" content="([^"]*)"/)[1]), COMMUNITY_CALCULATOR_SEO.description);
    assert.match(res.body, new RegExp(`<link rel="canonical" href="${SITE}${COMMUNITY_CALCULATOR_PATH}"`));
    assert.match(res.body, /<meta name="robots" content="index, follow"/);
    assert.equal(res.body.match(/<title>/g).length, 1, 'one title in the merged document');
    assert.equal(jsonLdBlocks(res.body).length, 0, 'the server document carries no structured data (the route SEO gate keeps that to the home identity)');
  });
});

test('a query-bearing address stays out of the index and keeps the bare canonical', async () => {
  await isolated(async () => {
    for (const path of ['/community/calculator?w=%D7%90%D7%95%D7%A8', '/community/calculator?q=%D7%A9%D7%9D&m=1', '/community/calculator?mode=baby&babyName=%D7%A0%D7%95%D7%A2%D7%94']) {
      const res = await served(path);
      assert.equal(res.headers.get('x-robots-tag'), 'noindex, follow', path);
      assert.match(res.body, new RegExp(`<link rel="canonical" href="${SITE}${COMMUNITY_CALCULATOR_PATH}"`), `${path} keeps the bare canonical`);
    }
  });
});

test('the structured data describes the page truthfully and matches the visible questions', () => {
  const graph = communityCalculatorJsonLd()['@graph'];
  const app = graph.find(node => node['@type'] === 'WebApplication');
  const faq = graph.find(node => node['@type'] === 'FAQPage');
  assert.equal(app.url, SITE + COMMUNITY_CALCULATOR_PATH);
  assert.equal(app.isAccessibleForFree, true);
  assert.deepEqual(app.offers, { '@type': 'Offer', price: '0', priceCurrency: 'ILS' });
  assert.equal(app.inLanguage, 'he');
  assert.equal(faq.mainEntity.length, COMMUNITY_CALCULATOR_FAQ.length);
  faq.mainEntity.forEach((entry, index) => {
    assert.equal(entry.name, COMMUNITY_CALCULATOR_FAQ[index].q);
    assert.equal(entry.acceptedAnswer.text, COMMUNITY_CALCULATOR_FAQ[index].a);
  });
  assert.doesNotMatch(JSON.stringify(communityCalculatorJsonLd()), /</, 'no markup characters in the data');
});

test('the client page uses the same wording, shows the explanation and the questions, and opens with every method', async () => {
  const page = await read('src/pages/CommunityCalculator2029Page.jsx');
  assert.match(page, /from "\.\.\/lib\/research\/communityCalculatorSeo2029\.js"/);
  assert.match(page, /applySeo\(\{ title: COMMUNITY_CALCULATOR_SEO\.title, description: COMMUNITY_CALCULATOR_SEO\.description/, 'the client SEO effect reads the shared wording');
  assert.doesNotMatch(page, /title: "מחשבון הקהילה — גימטריה, שמות ותאריך עברי"/, 'the old client title is gone');
  assert.match(page, /<h1>\{COMMUNITY_CALCULATOR_SEO\.heading\}<\/h1>/, 'the heading is the searched phrase');
  assert.match(page, /COMMUNITY_CALCULATOR_FAQ\.map\(\(\{ q, a \}\)/, 'the visible questions come from the same list as the structured data');
  assert.match(page, /COMMUNITY_CALCULATOR_EXPLAINER\.paragraphs\.map/);
  assert.match(page, /\.search === ""\s*&&\s*<script type="application\/ld\+json"/, 'structured data only on the bare address');
  assert.match(page, /JSON\.stringify\(communityCalculatorJsonLd\(\)\)\.replace\(\/<\/g, "\\\\u003c"\)/, 'the markup character is escaped');
  assert.match(page, /initialShowAll/, 'every method is open from the start (the classic grid)');
  const legacy = await read('src/pages/CommunityCalculatorPage.jsx');
  assert.match(legacy, /useState\(initialShowAll === true\)/);
  assert.match(legacy, /initialShowAll = false/, 'the default of the shared component is unchanged');
});

test('the Royal layer is adopted on purpose: opt-in class, scoped selectors, no second palette', async () => {
  const css = await read('src/pages/communityCalculator2029.css');
  const page = await read('src/pages/CommunityCalculator2029Page.jsx');
  assert.match(page, /<main className="sod29-community-calc r29"/);
  assert.match(page, /import "\.\.\/components\/experience2029\/royal2029\.css"/);
  const royal = css.slice(css.indexOf('/* ROYAL 2029 adoption')).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(royal.length > 500, 'the adoption block exists');
  const selectors = [...royal.matchAll(/([^{}]+)\{[^{}]*\}/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));
  assert.ok(selectors.length > 25, `the adoption block was read (${selectors.length} rules)`);
  for (const selector of selectors) {
    for (const part of selector.split(',')) assert.match(part.trim(), /\.sod29-community-calc/, `scoped: ${part.trim().slice(0, 80)}`);
  }
  assert.doesNotMatch(royal, /#[0-9a-fA-F]{3,8}\b/, 'no hard-coded colour: every colour is a role of the canonical palette');
});

test('the production sitemap lists the calculator once, with a content date later than the last visit Google made while the page was noindex', async () => {
  // Search Console (URL inspection, 16.11.2026): last crawl 4.11.2026, "excluded by noindex". The indexable version reached production on 5.11.2026.
  // A sitemap date after that visit is an honest reason for a new one; a date at or before it would tell Google nothing new.
  assert.match(COMMUNITY_CALCULATOR_LASTMOD, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(COMMUNITY_CALCULATOR_LASTMOD > '2026-11-04', `the date (${COMMUNITY_CALCULATOR_LASTMOD}) is later than Google's last visit`);
  const { default: sitemap } = await import('../api/sitemap.js');
  const { PUBLIC_READING_PROFILE_ID } = await import('../src/lib/publicReadingRelease2029.js');
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('[]', { headers: { 'content-range': '*/0' } });   // every source is empty: only the fixed addresses remain
  const res = { code: null, headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value; }, status(code) { this.code = code; return this; }, send(body) { this.body = body; return this; } };
  try { await sitemap({ publicFoundationPreview: true, publicReadingRelease: PUBLIC_READING_PROFILE_ID, publicReadingProductionArtifact: true }, res); }
  finally { globalThis.fetch = original; }
  assert.equal(res.code, 200);
  const blocks = [...String(res.body).matchAll(/<url>([\s\S]*?)<\/url>/g)].map(match => match[1]).filter(block => block.includes(`<loc>${SITE}${COMMUNITY_CALCULATOR_PATH}</loc>`));
  assert.equal(blocks.length, 1, 'listed exactly once');
  assert.match(blocks[0], new RegExp(`<lastmod>${COMMUNITY_CALCULATOR_LASTMOD}</lastmod>`));
  assert.doesNotMatch(String(res.body), new RegExp(`${COMMUNITY_CALCULATOR_PATH}\\?`), 'no query variant is listed');
});
