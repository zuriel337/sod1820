import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { libraryFixturePlugin } from './fixtures/els-library-browser-fixture.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const react = (await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))).default;
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium';
const cacheDir = mkdtempSync(join(tmpdir(), 'els-research-controls-vite-'));

async function withPage(run) {
  const server = await createServer({ root, cacheDir, configFile: false, plugins: [libraryFixturePlugin(), react()], server: { host: '127.0.0.1', port: 0 } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture?testAdvanced`);
    await page.getByLabel('מונח לחיפוש מתקדם').waitFor();
    await run(page);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
}
const options = { skip: !existsSync(executablePath), timeout: 60000 };

test('changing the forms target cancels the old request and rejects its late response', options, () => withPage(async page => {
  await page.getByLabel('מונח לחיפוש מתקדם').fill('בדיקה');
  await page.getByLabel('מילות המשך למחקר').fill('אמת');
  await page.evaluate(() => { window.__advancedHoldTerm = 'בדיקה'; });
  await page.getByRole('button', { name: 'חקור את כל הצורות אוטומטית' }).click();
  await page.waitForFunction(() => window.__advancedCalls.at(-1)?.body.term === 'בדיקה');
  await page.getByLabel('מונחים למחקר הצורות').selectOption('secondary');
  assert.equal(await page.evaluate(() => window.__advancedAborted || 0), 1);
  const requests = await page.evaluate(() => window.__advancedCalls.length);
  await page.evaluate(() => { window.__advancedHoldTerm = null; window.__releaseAdvanced(); });
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.__advancedCalls.length), requests);
  assert.equal(await page.getByLabel('תוכנית צורות אוטומטית').count(), 0);
  assert.equal(await page.evaluate(() => window.__advancedLoad || null), null);
}));

test('Research progress and narrowing are explicit; Classic round trip does not issue searches', options, () => withPage(async page => {
  assert.equal(await page.evaluate(() => window.__advancedCalls.length), 0);
  await page.getByLabel('מונח לחיפוש מתקדם').fill('בדיקה');
  await page.getByLabel('דילוג מינימלי').fill('80');
  await page.getByLabel('דילוג מקסימלי').fill('400');
  await page.getByLabel('טקסט לחיפוש מתקדם').selectOption('tanakh');
  await page.evaluate(() => { window.__advancedHoldTerm = 'בדיקה'; });
  await page.getByRole('button', { name: 'חפש בטווח', exact: true }).click();
  const progress = page.getByRole('region', { name: 'התקדמות מחקר הדילוגים' });
  await progress.waitFor();
  assert.equal(await progress.getByRole('progressbar').getAttribute('value'), null, 'unknown work must be indeterminate');
  await page.getByRole('button', { name: 'קלאסי', exact: true }).click();
  assert.equal(await progress.isVisible(), false);
  await page.getByRole('button', { name: 'מחקר', exact: true }).click();
  assert.equal(await progress.isVisible(), true);
  assert.equal(await page.evaluate(() => window.__advancedCalls.length), 1);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px overflow`);
    assert.deepEqual(await progress.evaluate(el => ({
      smallText: [...el.querySelectorAll('span,strong,button')].filter(n => parseFloat(getComputedStyle(n).fontSize) < 16).map(n => n.textContent),
      smallControls: [...el.querySelectorAll('button')].filter(n => n.getBoundingClientRect().height < 44).map(n => n.textContent),
    })), { smallText: [], smallControls: [] });
    if (process.env.ELS_SCREENSHOT_DIR) {
      mkdirSync(process.env.ELS_SCREENSHOT_DIR, { recursive: true });
      await progress.screenshot({ path: join(process.env.ELS_SCREENSHOT_DIR, `research-progress-${width}.png`) });
    }
  }
  await progress.getByRole('button', { name: 'עצור וצמצם לתורה' }).click();
  assert.equal(await page.getByLabel('טקסט לחיפוש מתקדם').inputValue(), 'torah');
  assert.equal(await page.evaluate(() => window.__advancedAborted), 1);
  await page.evaluate(() => { window.__releaseAdvanced(); });
  await page.waitForTimeout(150);
  assert.equal(await page.getByLabel('מופעי החיפוש המתקדם').count(), 0);
  assert.equal(await page.evaluate(() => window.__advancedCalls.length), 1, 'narrowing must not automatically restart');
  await page.getByRole('button', { name: 'חפש בטווח', exact: true }).click();
  await page.waitForFunction(() => window.__advancedCalls.length === 2);
  await progress.getByRole('button', { name: 'עצור והקטן את טווח הדילוגים' }).click();
  assert.equal(await page.getByLabel('דילוג מקסימלי').inputValue(), '240');
  await page.evaluate(() => { window.__advancedHoldTerm = null; window.__releaseAdvanced(); });
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.__advancedCalls.length), 2);
  assert.equal(await page.evaluate(() => window.__razielPlannerCalls.length), 0);
  assert.equal(await page.evaluate(() => window.__libraryEngineMounts), 1);
}));

test('editing exact skip aborts range work; stopping pagination retains the completed page', options, () => withPage(async page => {
  await page.getByLabel('מונח לחיפוש מתקדם').fill('בדיקה');
  await page.evaluate(() => { window.__advancedHoldTerm = 'בדיקה'; });
  await page.getByRole('button', { name: 'חפש בטווח', exact: true }).click();
  await page.waitForFunction(() => window.__advancedCalls.length === 1);
  await page.getByLabel('דילוג מדויק ללא תקרת 500').fill('1820');
  assert.equal(await page.evaluate(() => window.__advancedAborted), 1);
  await page.evaluate(() => { window.__advancedHoldTerm = null; window.__releaseAdvanced(); });
  await page.waitForTimeout(150);
  assert.equal(await page.getByLabel('מופעי החיפוש המתקדם').count(), 0);
  assert.equal(await page.evaluate(() => window.__advancedCalls.length), 1);
  await page.getByLabel('מונח לחיפוש מתקדם').fill('דפדוף');
  await page.getByLabel('דילוג מקסימלי').fill('200');
  await page.getByRole('button', { name: 'חפש בטווח', exact: true }).click();
  await page.getByText('1 מופעים נטענו ב־1 דפים · יש תוצאות נוספות').waitFor();
  await page.evaluate(() => { window.__advancedHoldTerm = 'דפדוף'; });
  await page.getByRole('button', { name: 'טען תוצאות נוספות', exact: true }).click();
  await page.waitForFunction(() => window.__advancedCalls.length === 3);
  await page.getByRole('button', { name: 'עצור סריקה', exact: true }).click();
  await page.evaluate(() => { window.__advancedHoldTerm = null; window.__releaseAdvanced(); });
  await page.waitForTimeout(150);
  assert.equal(await page.getByLabel('מופעי החיפוש המתקדם').getByRole('listitem').count(), 1);
  assert.equal(await page.evaluate(() => window.__advancedCalls.length), 3);
}));
