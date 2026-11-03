import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const renderers = new Map();
async function render(readonly, artifact, kind) {
  const key = `${readonly}:${artifact}`;
  if (!renderers.has(key)) {
    const fixtures = {
      'Sod2029Shell.jsx': 'import React from "react";export default function Frame({children}){return React.createElement("main",null,children)}',
      'PrivacyPage.jsx': 'import React from "react";export default function Privacy(){return React.createElement("section",{"data-fixture":"privacy"},"Existing privacy")}',
      'UnsubscribePage.jsx': 'import React from "react";export default function Unsubscribe(){return React.createElement("section",{"data-fixture":"unsubscribe"},"Existing signed removal")}',
      'NotFoundPage.jsx': 'import React from "react";export default function Missing(){return React.createElement("section",{"data-fixture":"not-found"},"Missing")}',
      'StayUpdatedCTA.jsx': 'import React from "react";export function NewsletterSignup2029(){return React.createElement("section",{"data-fixture":"existing-newsletter"},"Existing consent form")}',
      'seo.js': 'export function applySeo(){}',
      'publicLaunch2029.js': `export const PUBLIC_LAUNCH_READ_ONLY_PREVIEW=${readonly};`,
      'publicReadingRelease2029.js': `export const PUBLIC_READING_PRODUCTION_ARTIFACT=${artifact};`,
      'auth2029.css': '',
    };
    const { outputFiles } = await build({ stdin: { contents: `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{MemoryRouter}from'react-router-dom';import Page from './src/pages/PublicServices2029Page.jsx';export function render(kind){return renderToStaticMarkup(React.createElement(MemoryRouter,{initialEntries:['/'+kind]},React.createElement(Page,{kind})));}`, resolveDir: root, loader: 'jsx' },
      bundle: true, write: false, platform: 'node', format: 'cjs', external: ['react', 'react-dom/server', 'react-router-dom'],
      plugins: [{ name: 'only-owned-route-profile-fixtures', setup(b) {
        b.onResolve({ filter: /(?:Sod2029Shell|PrivacyPage|UnsubscribePage|NotFoundPage|StayUpdatedCTA)\.jsx$|(?:seo|publicLaunch2029|publicReadingRelease2029)\.js$|auth2029\.css$/ }, args => ({ path: args.path.split('/').at(-1), namespace: 'route-fixture' }));
        b.onLoad({ filter: /.*/, namespace: 'route-fixture' }, args => ({ contents: fixtures[args.path], loader: 'jsx' }));
      } }] });
    const module = { exports: {} };
    vm.runInNewContext(outputFiles[0].text, { module, exports: module.exports, require: createRequire(new URL('../package.json', import.meta.url)), console }, { timeout: 1000 });
    renderers.set(key, module.exports.render);
  }
  return renderers.get(key)(kind);
}

test('public publication profile mounts the same existing consent form on direct /updates', async () => {
  const html = await render(true, true, 'updates');
  assert.match(html, /data-fixture="existing-newsletter"/);
  assert.doesNotMatch(html, /פעולות הדיוור אינן פעילות/);
});
test('ordinary readonly Preview still cannot mount newsletter or removal actions', async () => {
  for (const kind of ['updates', 'unsubscribe']) {
    const html = await render(true, false, kind);
    assert.match(html, /פעולות הדיוור אינן פעילות/);
    assert.doesNotMatch(html, /data-fixture="(?:existing-newsletter|unsubscribe)"/);
  }
});
test('existing signed removal remains admitted in the public artifact only as before', async () => {
  assert.match(await render(true, true, 'unsubscribe'), /data-fixture="unsubscribe"/);
});
test('full existing profile keeps the original newsletter route', async () => {
  assert.match(await render(false, false, 'updates'), /data-fixture="existing-newsletter"/);
});
test('privacy and genuine missing pages retain their existing components', async () => {
  for (const [kind, fixture] of [['privacy', 'privacy'], ['not-found', 'not-found']]) {
    const html = await render(true, true, kind);
    assert.match(html, new RegExp(`data-fixture="${fixture}"`));
    assert.doesNotMatch(html, /data-fixture="existing-newsletter"/);
  }
});
test('public system map labels its admitted updates destination as available', async () => {
  const html = await render(true, true, 'map');
  assert.match(html, /href="\/updates"[^>]*>עדכונים במייל<\/a>/);
  assert.doesNotMatch(html, /עדכונים במייל · בהכנה/);
  assert.match(html, /כלי הצופן/);
  assert.match(html, /עדיין בבנייה/);
});
