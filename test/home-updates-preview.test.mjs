import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
async function render() {
  const { outputFiles } = await build({ entryPoints: ['src/components/experience2029/HomeUpdatesPreview2029.jsx'], bundle: true, write: false, format: 'cjs', platform: 'node', external: ['react'], loader: { '.jsx': 'jsx' }, jsx: 'transform' });
  const module = { exports: {} };
  vm.runInNewContext(outputFiles[0].text, { module, exports: module.exports, require: (name) => { if (name !== 'react') throw Error(name); return React; } });
  return renderToStaticMarkup(React.createElement(module.exports.default));
}
test('illustration is labelled as an example and carries no data, links or controls', async () => {
  const html = await render();
  assert.match(html, /role="img"/); assert.match(html, /המחשה בלבד/); assert.match(html, /אינם קשרים מאומתים/);
  assert.doesNotMatch(html, /<a |<button|href=|tabindex/i);
  for (const n of ['14', '140', '16']) assert.match(html, new RegExp(`>${n}<`));
});
test('motion is gated by prefers-reduced-motion, one-shot, under five seconds, and uses frame tokens only', async () => {
  const css = await readFile('src/components/experience2029/homeComposition2029.css', 'utf8');
  const block = css.slice(css.indexOf('HOME-UPDATES-VISUAL-20261103'));
  const start = block.indexOf('@media (prefers-reduced-motion: no-preference)');
  const motion = block.slice(start, block.indexOf('@container h29 (max-width:620px)'));
  assert.ok(start > 0 && motion.length > 0);
  assert.doesNotMatch(block, /infinite/);
  assert.match(motion, /h29-chain-sweep 1500ms ease-in-out 1500ms 1 both/);
  // Latest finish: sweep 1500ms delay + 1500ms duration = 3.0s; every other piece ends sooner.
  const outside = block.replace(motion, '').replace(/@keyframes [\w-]+ \{[^\n]*\n/g, '');
  assert.doesNotMatch(outside, /animation\s*:/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
