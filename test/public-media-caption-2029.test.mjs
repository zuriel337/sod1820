import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicMediaCaption, publicMediaTitle, humanContentTitle } from "../src/lib/presentation/contentTitle.js";

test("one or several stored quote escapes become readable punctuation", () => {
  for (const count of [1, 2, 3, 5]) {
    const escape = "\\".repeat(count);
    const text = `ראינו ${escape}"וראית את אחרי${escape}" — הנ${escape}"ל = 1237`;
    assert.equal(publicMediaCaption(text), 'ראינו "וראית את אחרי" — הנ"ל = 1237');
  }
});

test("URLs, paths, numeric brackets, fractions, equations and line breaks are not stripped", () => {
  const text = String.raw`https://example.test/a/b?value=1456&other=456 [14,45] 1/2 C:\\photos\a.jpg 1,456 ← 456` + "\n844 < 1237 > 456";
  assert.equal(publicMediaCaption(text), text);
});

test("known presentation markup/entities become plain text, never executable HTML", () => {
  assert.equal(publicMediaCaption('<p>&amp;quot;וראית&amp;quot; = <b>1237</b><br>עוד [45]</p>'), '"וראית" = 1237\nעוד [45]');
  const page = readFileSync(new URL('../src/pages/Gallery2029Page.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /dangerouslySetInnerHTML/);
});

test("Hebrew maintenance notices do not become public headlines; meaningful titles survive", () => {
  for (const text of ['עדכון **** נוספו 6 תמונות חדשות', 'עדכון: נוספה תמונה', 'נוספו 6 תמונות חדשות', 'נוספה תמונה', 'תמונה', '', null])
    assert.equal(publicMediaTitle(text), null);
  assert.equal(publicMediaTitle('וראית את אחרי — 1237'), 'וראית את אחרי — 1237');
  assert.equal(publicMediaTitle('עדכונים על התגלות'), 'עדכונים על התגלות');
  assert.equal(publicMediaTitle('עדכוןהמחקר'), 'עדכוןהמחקר', 'no ASCII word-boundary assumption for Hebrew');
});

test("caption cleanup is display-only; raw historical text and OCR engine inputs remain available", () => {
  const row = Object.freeze({ originalName:'עדכון **** נוספו 6 תמונות חדשות', originalCaption:String.raw`\"וראית את אחרי\"`, ocr_text:String.raw`טקסט \"התגלות\"` });
  const snapshot = JSON.stringify(row);
  assert.equal(publicMediaCaption(row.originalCaption), '"וראית את אחרי"');
  assert.equal(JSON.stringify(row), snapshot);
  const page = readFileSync(new URL('../src/pages/Gallery2029Page.jsx', import.meta.url), 'utf8');
  assert.match(page, /<pre>\{placement.originalCaption\}<\/pre>/);
  assert.match(page, /<pre>\{placement.originalName\}<\/pre>/);
  assert.match(page, /SourceMethodResearch item=\{item\}/, 'the original source object still supplies exact OCR selection');
  assert.equal(humanContentTitle('&quot;שם&quot;'), '"שם"', 'existing title behavior retained');
});
