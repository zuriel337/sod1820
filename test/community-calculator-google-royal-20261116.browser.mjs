// Built public artifact + its real worker; every host resolves to a local fixture. No request leaves the machine.
// The community calculator as Google visitors meet it: the calculator in the first screen, every method in the classic grid from the first
// keystroke, the page's own wording and structured data, the explanation and questions as visible text, and the Royal design layer opted in.
// VITE_GA_ID=G-TEST node scripts/build-public-reading-production.mjs
// CHROMIUM_PATH=/usr/bin/chromium node --test test/community-calculator-google-royal-20261116.browser.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startFixture } from './helpers/authBrowserFixture.mjs';
import { COMMUNITY_CALCULATOR_FAQ, COMMUNITY_CALCULATOR_SEO } from '../src/lib/research/communityCalculatorSeo2029.js';

const require = createRequire(import.meta.url);
let pw; for (const name of ['playwright', '@playwright/test']) { try { pw = require(name); break; } catch {} }
assert.ok(pw, 'Install the pinned browser tooling; this acceptance test must not skip.');
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const DOCK_CLEARANCE = 80;   // the floating bottom bar covers about this much of the first screen

for (const [width, height] of [[390, 844], [1280, 900]]) test(`[${width}x${height}] the community calculator is a classic, Royal, searchable calculator page`, { timeout: 120000 }, async () => {
  const fixture = await startFixture();
  const browser = await pw.chromium.launch({ executablePath, headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width, height }, locale: 'he-IL', serviceWorkers: 'allow' });
    // The guest updates invitation (22 s / scroll) has its own contract (guest-newsletter-restoration-20261115); keep it out of this one.
    await context.addInitScript(() => { try { localStorage.setItem('sod_legacy_newsletter_invite_until', String(Date.now() + 86400000)); } catch {} });
    await context.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const page = await context.newPage();
    await page.goto(fixture.origin + '/community/calculator', { waitUntil: 'domcontentloaded' });
    const heading = page.getByRole('heading', { level: 1 });
    await heading.waitFor({ timeout: 40000 });

    // The phrase searchers type is the heading, the title and the description (the same wording the server sends).
    assert.equal((await heading.innerText()).trim(), COMMUNITY_CALCULATOR_SEO.heading);
    assert.equal(await page.title(), `${COMMUNITY_CALCULATOR_SEO.title} · SOD1820`);
    assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), COMMUNITY_CALCULATOR_SEO.description);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'index, follow', 'the bare address is indexable');

    // The Royal layer is opted in on the page, and the tools carry its medallions.
    assert.equal(await page.locator('main.sod29-community-calc.r29').count(), 1);
    assert.equal(await page.locator('.sod29-community-calc-modes .r29-medal').count(), 4);

    // The calculator is in the first screen: a visitor can type without scrolling.
    const input = page.locator('#community-calculator-name');
    const box = await input.boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= height - DOCK_CLEARANCE, `the input is inside the first screen (bottom ${Math.round(box.y + box.height)}, limit ${height - DOCK_CLEARANCE})`);

    // Structured data for the bare address: the application and the visible questions.
    const questions = await page.locator('.sod29-community-calc-faq h3').allInnerTexts();
    assert.deepEqual(questions, COMMUNITY_CALCULATOR_FAQ.map(item => item.q), 'the questions are visible text, in the list order');
    const blocks = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)));
    assert.equal(blocks.length, 1);
    const graph = blocks[0]['@graph'];
    assert.deepEqual(graph.map(node => node['@type']), ['WebApplication', 'FAQPage']);
    assert.deepEqual(graph[1].mainEntity.map(entry => entry.name), questions, 'structured questions are the visible questions');

    // Typing: every method opens at once in the classic grid, the regular method first and lit; the number is the regular value.
    await input.fill('אור');
    await page.locator('.sod29-community-calc-method').first().waitFor({ timeout: 30000 });
    assert.ok(await page.locator('.sod29-community-calc-method').count() >= 20, 'all methods are open from the first keystroke');
    const lit = page.locator('.sod29-community-calc-method.is-selected');
    assert.equal(await lit.count(), 1);
    assert.match(await lit.innerText(), /רגיל[\s\S]*207/);
    await page.locator('#result').getByText('207').first().waitFor({ timeout: 30000 });

    // A name is private: once the address carries it, the page leaves the index and drops the structured data.
    await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content === 'noindex, follow', null, { timeout: 15000 });
    assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
  } finally { await browser.close(); await fixture.close(); }
});
