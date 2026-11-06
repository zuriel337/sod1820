import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Number page on a phone (ZURIEL 5.11.2026): the number and the central content must appear higher on the first screen.
// Measured on a production-profile build at 390 px (see docs/reviews/number-page-speed-20261105): the way back and the save action
// share one row instead of two stacked blocks, and the loading phrase card keeps its loaded height so nothing shifts inside the now
// higher first screen. Nothing changes from 768 px up. (The renewal ribbon that used to sit above the number was replaced by a verse in
// main, #1235; the ribbon is the frame's business and Number-page rules no longer touch it.) These contracts pin how it is achieved,
// so a later edit cannot quietly bring the stacked buttons back or change desktop.
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('src/pages/Number2029Page.jsx');
const numberCss = read('src/pages/number2029.css');
const ribbonCss = read('src/components/experience2029/globalLivingRibbon2029.css');
const coreCss = read('src/components/number2029/numberCore2029.css');

// Text inside every `@media(max-width:<px>){ ... }` block of that exact query (balanced braces).
function mediaBlocks(css, query) {
  const out = [];
  let from = 0;
  for (;;) {
    const at = css.indexOf(`@media(${query}){`, from);
    if (at < 0) break;
    let depth = 0; let end = at + `@media(${query}){`.length - 1;
    for (let i = end; i < css.length; i += 1) {
      if (css[i] === '{') depth += 1;
      if (css[i] === '}') { depth -= 1; if (depth === 0) { end = i; break; } }
    }
    out.push(css.slice(at, end + 1));
    from = end + 1;
  }
  return out.join('\n');
}

test('the way back and the save action share one wrapper; the link, its label and the permanent-link contract are untouched', () => {
  const start = page.indexOf('<div className="sod29-number-hero-bar">');
  assert.ok(start > 0, 'wrapper exists');
  const hero = page.slice(start, page.indexOf('<NumberCore2029', start));
  assert.match(hero, /<ContextReturnAction2029[\s\S]*?to="\/gematria"/);
  assert.match(hero, /"data-number-action": "open-calculator"/);
  assert.match(hero, /"data-number-action": "back-to-calculator"/);
  assert.match(hero, /<div className="sod29-actions"><PersonalSaveButton2029 /);
  // The calculator action picks one of two variants (back / open) but is always present; the save control is never conditional.
  assert.doesNotMatch(hero.slice(hero.indexOf('<div className="sod29-actions">')), /\?\s*<|&&\s*</, 'the save control does not sit behind a condition');
});

test('above the phone breakpoint the wrapper adds no box (desktop and tablet layout is exactly what it was)', () => {
  assert.match(numberCss, /^\.sod29-number-hero-bar\{display:contents\}/m);
});

test('on a phone the two controls form one row with their own margins removed (also the nested actions container)', () => {
  const phone = mediaBlocks(numberCss, 'max-width:560px');
  assert.match(phone, /\.sod29-number-hero-bar\{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px\}/);
  assert.match(phone, /\.sod29-number-hero-bar>\.sod29-number-calculator-return\{[^}]*margin:0/);
  assert.match(phone, /\.sod29-number-hero-bar \.sod29-actions\{[^}]*margin:0/, 'the Personal save button renders its own .sod29-actions with a 14px top margin');
});

test('Number-page rules leave the frame ribbon alone (it is the frame\'s business, and a rule keyed to the page mounting late would shift the layout)', () => {
  assert.doesNotMatch(ribbonCss, /surface-number|:has\(\.sod29-number-page\)/);
  assert.doesNotMatch(numberCss, /sod29-living-ribbon/);
});

test('the loading regular-phrases card reserves the height it has once loaded, per width (no over-reservation where the head is one line)', () => {
  assert.match(mediaBlocks(coreCss, 'max-width:720px'), /\.sod29-number-v11-regular-rail\.is-loading \.sod29-number-v11-regular-placeholder\{min-height:60px\}/);
  assert.match(mediaBlocks(coreCss, 'max-width:405px'), /\.sod29-number-v11-regular-rail\.is-loading \.sod29-number-v11-regular-head\{min-height:70px\}/);
  assert.doesNotMatch(mediaBlocks(coreCss, 'max-width:720px'), /v11-regular-head\{min-height:70px\}/, 'the 70px head only wraps up to about 400px; reserving it above that would shrink the card when it loads');
});
