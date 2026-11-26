// Mount the real save panel and identity adapter; no database or network calls.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const outfile = resolve(`.test-els-save-panel-${process.pid}.mjs`);
await build({ entryPoints: ['src/components/experience2029/ElsSavePanel2029.jsx'], bundle: true,
  define: { '__SOD_2029_BUILD__': 'true', 'import.meta.env': JSON.stringify({ VITE_PUBLIC_READING_RELEASE: 'public-reading-20261101' }) },
  platform: 'node', format: 'esm', outfile, external: ['react'], loader: { '.css': 'empty' }, logLevel: 'silent' });
const Panel = (await import(pathToFileURL(outfile))).default;
after(() => rm(outfile, { force: true }));
const state = { term: 'תורה', termRaw: 'תורה', scope: 'torah', verification: { state: 'MATCH', corpus_id: 'fixture' },
  axis: { hitId: '2_1_0' }, provenance: { desc: 'הסבר מפורט על הממצא השמור' } };
const privateRow = { id: 'private-row', owner_user_id: 'member', visibility: 'private', self_published: false,
  status: 'draft', title: 'ממצא פרטי', search_term: 'תורה', scope: 'torah', skip_distance: 2,
  direction: 'fwd', start_index: 0, corpus_id: 'fixture' };
async function mount(t, overrides = {}) {
  const saves = [];
  let props = { visible: true, state, user: { id: 'member' }, onSave: value => saves.push(value), ...overrides }, root;
  await act(async () => { root = Renderer.create(React.createElement(Panel, props)); });
  t.after(async () => { await act(async () => root.unmount()); });
  return { root, saves, async update(next) { props = { ...props, ...next }; await act(async () => root.update(React.createElement(Panel, props))); },
    async submit() { await act(async () => root.root.findByType('form').props.onSubmit({ preventDefault() {} })); } };
}
const checkboxes = root => root.root.findAll(node => node.type === 'button' && node.props.role === 'checkbox');

test('new save requests publication by default, explains guest library access, and offers an explicit private choice', async t => {
  const f = await mount(t);
  assert.match(JSON.stringify(f.root.toJSON()), /כברירת מחדל הצופן יפורסם בספריית הצפנים/);
  assert.match(JSON.stringify(f.root.toJSON()), /כדי שרק אתם תוכלו לפתוח אותו/);
  assert.equal(checkboxes(f.root)[0].props['aria-checked'], false);
  await f.submit();
  assert.deepEqual(f.saves[0], { title: 'תורה', desc: state.provenance.desc, isPublic: true });
  await act(async () => checkboxes(f.root)[0].props.onClick());
  await f.submit();
  assert.equal(f.saves[1].isPublic, false);
});

test('updating an owned private record keeps it private, including pending and hidden records', async t => {
  const f = await mount(t, { matrix: privateRow });
  for (const status of ['draft', 'pending', 'hidden']) {
    await f.update({ matrix: { ...privateRow, status } });
    assert.equal(checkboxes(f.root).length, 0);
    assert.equal(f.root.root.findAllByType('input')[0].props.disabled, true);
    await f.submit();
    assert.equal(f.saves.at(-1).isPublic, false, status);
    assert.equal(f.saves.at(-1).title, privateRow.title);
  }
});

test('foreign and published records create a copy with a fresh explanation and privacy choice', async t => {
  const f = await mount(t);
  for (const matrix of [{ ...privateRow, owner_user_id: 'other' }, { ...privateRow, self_published: true, status: 'published', visibility: 'public' }]) {
    await f.update({ matrix });
    assert.equal(checkboxes(f.root).length, 1);
    assert.match(JSON.stringify(f.root.toJSON()), /השמירה יוצרת עותק משלך/);
    assert.equal(f.root.root.findByType('textarea').props.value, '');
    await f.submit(); assert.equal(f.saves.length, 0);
    // Force the next iteration through a different identity, as a real open would.
    await f.update({ matrix: null });
  }
});

test('guest cannot submit; unverified, busy, pending and empty-description states reject even direct submit', async t => {
  const f = await mount(t);
  for (const props of [{ state: { ...state, verification: { state: 'MISMATCH' } } }, { busy: true }, { pending: true }]) {
    await f.update({ state, busy: false, pending: false, ...props });
    assert.equal(f.root.root.findAll(node => node.type === 'button' && node.props.type === 'submit')[0].props.disabled, true);
    await f.submit();
  }
  await f.update({ state, busy: false, pending: false });
  await act(async () => f.root.root.findByType('textarea').props.onChange({ target: { value: '   ' } }));
  await f.submit(); assert.equal(f.saves.length, 0);
  await f.update({ user: null });
  assert.equal(f.root.root.findAllByType('form').length, 0);
  assert.equal(f.root.root.findAll(node => node.type === 'a' && node.props.href === '/login').length, 1);
});

test('public form respects the server limit and preserves an overlong description until the member edits it', async t => {
  const f = await mount(t, { state: { ...state, provenance: { desc: 'א'.repeat(4001) } } });
  const input = f.root.root.findByType('textarea');
  assert.equal(input.props.maxLength, 4000);
  assert.equal(input.props.value.length, 4001);
  await f.submit();
  assert.equal(f.saves.length, 0);
  await act(async () => input.props.onChange({ target: { value: 'א'.repeat(4000) } }));
  await f.submit();
  assert.equal(f.saves[0].desc.length, 4000);
});

test('only confirmed public receipts link to the exact reading address', async t => {
  const f = await mount(t);
  for (const [status, visibility, expected] of [
    ['draft', 'private', false], ['pending', 'private', false], ['published', 'public', true],
  ]) {
    await f.update({ result: { ok: true, row: { status, visibility, slug: 'בדיקה-2' } } });
    const links = f.root.root.findAll(node => node.type === 'a' && node.props.href === '/codes/' + encodeURIComponent('בדיקה-2'));
    assert.equal(links.length, Number(expected));
  }
});
