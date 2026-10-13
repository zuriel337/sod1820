import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNowBarEmail } from '../src/lib/nowBarSources.js';
import { sourceEmailRows } from './fixtures/sourceEmailThreads.fixture.mjs';
test('legacy bar consumes complete sanitized conversations and latest reply time', async () => {
  const root = { ...sourceEmailRows[0], full_text: 'מקור מלא '.repeat(300) };
  const rows = [root, sourceEmailRows[1]];
  const result = await loadNowBarEmail({ rpc: async (name, args) => {
    assert.equal(name, 'email_source_threads_v1'); assert.deepEqual(args, { p_limit: 15, p_destination: 'nowbar' });
    return { data: rows, error: null };
  } });
  assert.equal(result.length, 1);
  assert.ok(result[0].text.includes(root.full_text));
  assert.ok(result[0].text.includes(sourceEmailRows[1].author_display));
  assert.equal(result[0].at, new Date(sourceEmailRows[1].arrival_at).toISOString());
});
test('unavailable reader never impersonates an empty inbox or falls back to raw mail', async () => {
  await assert.rejects(() => loadNowBarEmail(null), /unavailable/);
  await assert.rejects(() => loadNowBarEmail({ rpc: async () => ({ data: null, error: new Error('not installed') }) }), /not installed/);
  await assert.rejects(() => loadNowBarEmail({ rpc: async () => ({ data: null, error: null }) }), /invalid/);
  assert.deepEqual(await loadNowBarEmail({ rpc: async () => ({ data: [], error: null }) }), []);
});
test('held parents stay absent while admitted replies retain an explicit missing-parent state', async () => {
  const result = await loadNowBarEmail({ rpc: async () => ({ data: sourceEmailRows.map(row => row.id === 'demo-root' ? { ...row, held: true } : row), error: null }) });
  assert.ok(result.every(row => row.text.startsWith('ההודעה המקורית אינה זמינה')));
  assert.ok(result.every(row => !row.text.includes(sourceEmailRows[0].full_text)));
});
