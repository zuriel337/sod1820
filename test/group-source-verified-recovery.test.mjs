import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { waReadPrivateGroupMedia, waInspectPublicGroupMedia, waProveAndPublishGroupMedia } from '../supabase/functions/_shared/waGroupMedia.js';

const bytes = new Uint8Array([255,216,255,224,0,0,0,0,0,0,0,0,1]);
const media = { buf: bytes, ct: 'image/jpeg', ext: 'jpg' };
const blob = (buf = bytes, type = 'image/jpeg') => new Blob([buf], { type });
function client({ existing = null, corruptReadback = false, denied = false } = {}) {
  const calls = []; let saved = existing;
  return { calls, rpc: async (name, args) => {
    calls.push({ name, args });
    if (name === 'private_channel_media_access') return { data: { ok: !denied, bucket: 'submission-inbox', path: 'exact/source.jpg', mime: 'image/jpeg', size: bytes.length } };
    if (name === 'record_channel_update_group_media_proof_v1') return { data: { ok: true, publishable: !denied } };
    if (name === 'record_group_source_public_media_v1') return { data: { ok: true } };
    assert.fail(name);
  }, storage: { from: bucket => ({
    download: async path => {
      calls.push({ name: 'download', bucket, path });
      if (bucket === 'submission-inbox') return { data: blob() };
      return saved ? { data: saved } : { error: { status: 404, message: 'Object not found' } };
    },
    upload: async (path, buf, options) => {
      calls.push({ name: 'upload', bucket, path, options });
      const data = new Uint8Array(buf); if (corruptReadback) data[data.length - 1] ^= 1;
      saved = blob(data); return { error: null };
    },
  }) } };
}
const args = sb => ({ sb, trace: [], bucket: 'media', updateId: 'source', source: { id: 'group', channel: 'torat-haremez' },
  msgId: 'exact-message', chatId: 'group@g.us', senderId: 'verified-sender', typeMessage: 'imageMessage', kind: 'image', sourceTs: 1794440000, media, verifyCopy: true });

test('reads only the exact source-bound original and checks MIME, size and SHA-256', async () => {
  const sb = client();
  const result = await waReadPrivateGroupMedia({ sb, updateId: 'source', objectRef: 'storage-object:12345678-1234-1234-1234-123456789abc', kind: 'image' });
  assert.deepEqual(result.buf, bytes); assert.match(result.sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(sb.calls.map(x => x.name), ['private_channel_media_access', 'download']);
  await assert.rejects(waReadPrivateGroupMedia({ sb: client({ denied: true }), updateId: 'source', objectRef: 'storage-object:12345678-1234-1234-1234-123456789abc', kind: 'image' }), /unavailable/);
  await assert.rejects(waReadPrivateGroupMedia({ sb, updateId: 'source', objectRef: 'https://untrusted/file', kind: 'image' }), /invalid_private_ref/);
});
test('verified recovery uploads once and records only after a matching binary readback', async () => {
  const sb = client(); const result = await waProveAndPublishGroupMedia(args(sb));
  assert.equal(result.published, true); assert.equal(result.receipt.verified, true);
  assert.equal(result.receipt.size, bytes.length); assert.match(result.receipt.sha256, /^[0-9a-f]{64}$/);
  const names = sb.calls.map(x => x.name);
  assert.ok(names.lastIndexOf('download') < names.indexOf('record_group_source_public_media_v1'));
  assert.deepEqual(sb.calls.find(x => x.name === 'upload').options, { contentType: 'image/jpeg', upsert: false });
  const replay = await waProveAndPublishGroupMedia(args(sb));
  assert.equal(replay.published, true); assert.equal(sb.calls.filter(x => x.name === 'upload').length, 1);
});
test('existing mismatched copy stops before proof or writes; corrupt new copy never registers', async () => {
  const wrong = new Uint8Array(bytes); wrong[wrong.length - 1] ^= 1;
  const existing = client({ existing: blob(wrong) });
  assert.equal((await waProveAndPublishGroupMedia(args(existing))).published, false);
  assert.deepEqual(existing.calls.map(x => x.name), ['download']);
  const corrupt = client({ corruptReadback: true });
  assert.equal((await waProveAndPublishGroupMedia(args(corrupt))).published, false);
  assert.ok(!corrupt.calls.some(x => x.name === 'record_group_source_public_media_v1'));
});
test('missing mapping bytes and denied admission never become a successful receipt', async () => {
  assert.deepEqual(await waInspectPublicGroupMedia({ sb: client(), bucket: 'media', path: 'missing', media }), { exists: false, verified: false });
  const sb = client({ denied: true });
  assert.equal((await waProveAndPublishGroupMedia(args(sb))).published, false);
  assert.ok(!sb.calls.some(x => x.name === 'upload' || x.name === 'record_group_source_public_media_v1'));
});
test('verified recovery is opt-in, targeted, and its read-only branch precedes all mutation paths', () => {
  const code = readFileSync(new URL('../supabase/functions/wa-channel-ingest/index.ts', import.meta.url), 'utf8');
  assert.ok(code.includes('const verifiedBackfill = groupBackfill && verifiedRecovery;'));
  assert.ok(code.includes('if (verifiedRecovery && !targeted)'));
  assert.ok(code.includes('recoverMessageIds.length > 50'));
  assert.ok(code.includes('(recoverMessageIds.length > 1 && !verifiedRecovery)'));
  assert.ok(code.includes('targetIds.includes(String(m?.idMessage || ""))'));
  assert.ok(code.includes('else if (verifiedRecovery) break;'));
  const check = code.indexOf('if (verifiedRecovery && !groupBackfill)');
  const inspect = code.indexOf('step: "group-media-verified-read"');
  const mutation = code.indexOf('const { error: repairError }');
  assert.ok(check > 0 && check < inspect && inspect < mutation);
  assert.match(code.slice(inspect, mutation), /continue;/);
  assert.ok(code.includes('if (!targeted) {'));
});
