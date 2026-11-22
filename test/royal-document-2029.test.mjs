import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { royalBackdropDocument2029 } from '../scripts/lib/royal-backdrop-document.mjs';
import { resolve2029Palette } from '../src/lib/paletteTokens2029.js';
import { POST_ARTICLE_THEME_SCRIPT } from '../src/lib/research/postArticleFrame2029.js';

test('the approved responsive picture is in the first document, outside the React root, without a second render', () => {
 const original=fs.readFileSync('2029.html','utf8'), html=royalBackdropDocument2029(original);
 assert.equal((html.match(/id="sod29-royal-backdrop"/g)||[]).length,1);
 assert.ok(html.indexOf('id="sod29-royal-backdrop"')<html.indexOf('id="root"'));
 assert.match(html,/<picture class="r29-connected-art">/);
 assert.match(html,/fetchpriority="low"/);
 assert.equal(royalBackdropDocument2029(html),html,'applying the build projection twice cannot duplicate its image or styles');
 assert.equal(royalBackdropDocument2029('<html><head></head><body>other document</body></html>'),'<html><head></head><body>other document</body></html>');
 assert.equal((html.match(/rel="preload"[^>]+as="font"/g)||[]).length,2);
 assert.ok(html.includes(POST_ARTICLE_THEME_SCRIPT),'reuse the canonical initial theme reader');
 for(const preset of ['dark','light','parchment']){
  const p=resolve2029Palette(preset);
  assert.ok(html.includes(`--s29-page:${p.pageBg};--s29-frame:${p.frame||p.card}`));
 }
 assert.equal(html.slice(html.indexOf('<div id="root">'),html.indexOf('</body>')), original.slice(original.indexOf('<div id="root">'),original.indexOf('</body>')),'opening content and entry script unchanged');
});

// The desktop art's motif sits below the fixed bar/crown. The mobile crop is unchanged.
test('royal picture uses a lower desktop crop without changing mobile or the crown seam', () => {
 const css=fs.readFileSync('src/components/experience2029/royalBackdrop2029.css','utf8');
 assert.match(css, /\.r29-connected-art\{[^}]*top:63px;/);
 assert.match(css, /\.r29-connected-art img\{[^}]*object-position:center 12%/);
 assert.match(css, /@media\(max-width:650px\)\{\.r29-connected-art\{height:340px\}\.r29-connected-art img\{object-position:center 22%\}\}/);
});
