import test from 'node:test';
import assert from 'node:assert/strict';
import { copyLink } from '../src/lib/share.js';

test('copy reports actual browser outcome and removes its temporary field', async t => {
  const originals = Object.fromEntries(['navigator', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => { for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    clipboard: { writeText: async () => { throw new Error('clipboard denied'); } },
  } });
  for (const outcome of [true, false, 'throws']) {
    await t.test(`fallback ${outcome}`, async () => {
      let field; let removed = false;
      globalThis.document = {
        createElement: () => (field = { style: {}, select() {}, remove() { removed = true; } }),
        body: { appendChild() {} },
        execCommand: () => { if (outcome === 'throws') throw new Error('unsupported'); return outcome; },
      };
      assert.equal(await copyLink('https://sod1820.co.il/book/test?focus=14'), outcome === true);
      assert.equal(field.value, 'https://sod1820.co.il/book/test?focus=14');
      assert.equal(removed, true);
    });
  }
  await t.test('native clipboard succeeds without fallback', async () => {
    let copied;
    navigator.clipboard.writeText = async value => { copied = value; };
    document.createElement = () => { throw new Error('unexpected fallback'); };
    assert.equal(await copyLink('https://sod1820.co.il/2029'), true);
    assert.equal(copied, 'https://sod1820.co.il/2029');
  });
});
