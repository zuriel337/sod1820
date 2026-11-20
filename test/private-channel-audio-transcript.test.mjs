import test from 'node:test';
import assert from 'node:assert/strict';
import { processPrivateChannelAudio, privateAudioKey } from '../supabase/functions/_shared/privateChannelAudioTranscript.js';

const id = 'f38eba63-24ca-43a5-8ba4-c60d7999b142', object = '8c994983-0426-430d-98f4-1b03c641239c';
const bytes = new Uint8Array(64); bytes.set(new TextEncoder().encode('OggS'));
const body = { action: 'inspect_private_audio', channel_update_id: id, storage_object_id: object,
  expected_size: 64, expected_message_id: 'exact-message', expected_created_at: '2026-11-14T16:46:01Z' };
function fixture() {
  const f = { source: { id, image_url: `storage-object:${object}`, status: 'private',
    ext_msg_id: body.expected_message_id, created_at: body.expected_created_at, contributor_id: null, channel: 'torat-haremez' },
    resolved: { ok: true, bucket: 'submission-inbox', path: 'sod1820/2029/unresolved/2026/11/ed505ab1-aff7-4a5f-a697-a758b411f718/audio/original.ogg', mime: 'audio/ogg', size: 64 },
    blob: new Blob([bytes], { type: 'audio/ogg' }), rows: [], calls: [] };
  f.io = { readSource: async () => ({ ...f.source }), resolvePrivate: async () => f.resolved,
    download: async () => f.blob, listOriginals: async () => f.rows,
    transcribe: async args => { f.calls.push('stt'); assert.equal(args.language, null);
      return { ok: true, text: 'תמלול מקור', language: 'he', language_evidence: 'provider_reported', model: 'test-stt' }; },
    insertOriginal: async row => { f.calls.push('insert'); f.rows.push({ ...row, id: 1 }); return true; } };
  return f;
}

test('inspection hashes the bound private bytes without transcription or persistence', async () => {
  const f = fixture(), r = await processPrivateChannelAudio(body, f.io);
  assert.equal(r.state, 'inspected'); assert.match(r.receipt.sha256, /^[a-f0-9]{64}$/);
  assert.equal(r.receipt.public, false); assert.deepEqual(f.calls, []); assert.deepEqual(f.rows, []);
  assert.equal(r.receipt.video_key, privateAudioKey(id, object));
  assert.ok(!JSON.stringify(r).includes('signed_url'));
});

test('transcription creates only a draft original, preserves source and never reruns an existing original', async () => {
  const f = fixture(), before = structuredClone(f.source);
  const inspected = await processPrivateChannelAudio(body, f.io);
  const request = { ...body, action: 'transcribe_private_audio', expected_sha256: inspected.receipt.sha256 };
  const out = await processPrivateChannelAudio(request, f.io);
  assert.equal(out.state, 'draft_transcribed'); assert.equal(f.rows[0].status, 'draft');
  assert.equal(f.rows[0].is_original, true); assert.equal(f.rows[0].source_url, `storage-object:${object}`);
  assert.equal(f.rows[0].translated_by, 'openai:test-stt'); assert.deepEqual(f.source, before);
  assert.equal((await processPrivateChannelAudio(request, f.io)).state, 'original_exists');
  assert.deepEqual(f.calls, ['stt', 'insert']);
});

test('wrong source binding, envelope or privacy never reaches STT', async () => {
  for (const change of [{ image_url: 'storage-object:other' }, { status: 'live' },
    { ext_msg_id: 'other' }, { created_at: '2026-11-15T16:46:01Z' }]) {
    const f = fixture(); Object.assign(f.source, change);
    assert.equal((await processPrivateChannelAudio(body, f.io)).error, 'source_binding_mismatch');
    assert.deepEqual(f.calls, []);
  }
});

test('wrong bucket, path, MIME, size, bytes or expected hash fails closed', async () => {
  for (const change of [{ bucket: 'media' }, { path: '../audio.ogg' }, { mime: 'image/jpeg' }, { size: 65 }]) {
    const f = fixture(); Object.assign(f.resolved, change);
    assert.equal((await processPrivateChannelAudio(body, f.io)).error, 'private_audio_metadata_mismatch');
  }
  const f = fixture(); f.blob = new Blob([new Uint8Array(64)], { type: 'audio/ogg' });
  assert.equal((await processPrivateChannelAudio(body, f.io)).error, 'private_audio_format_mismatch');
  const g = fixture();
  assert.equal((await processPrivateChannelAudio({ ...body, action: 'transcribe_private_audio', expected_sha256: '0'.repeat(64) }, g.io)).error, 'private_audio_hash_mismatch');
  assert.deepEqual(g.calls, []);
});

test('source drift and unknown source language produce no original', async () => {
  const f = fixture(); let reads = 0;
  f.io.readSource = async () => ++reads === 1 ? f.source : null;
  assert.equal((await processPrivateChannelAudio(body, f.io)).error, 'source_changed');
  const g = fixture(), r = await processPrivateChannelAudio(body, g.io);
  g.io.transcribe = async () => ({ ok: true, text: 'uncertain', language: null });
  assert.equal((await processPrivateChannelAudio({ ...body, action: 'transcribe_private_audio', expected_sha256: r.receipt.sha256 }, g.io)).error, 'source_language_or_transcript_unknown');
  assert.deepEqual(g.rows, []);
});

test('conflicting or published originals are never overwritten or accepted as private', async () => {
  const f = fixture(), r = await processPrivateChannelAudio(body, f.io);
  const request = { ...body, action: 'transcribe_private_audio', expected_sha256: r.receipt.sha256 };
  f.rows = [{ status: 'published' }];
  assert.equal((await processPrivateChannelAudio(request, f.io)).error, 'private_original_not_draft');
  f.rows = [{ status: 'draft' }, { status: 'draft' }];
  assert.equal((await processPrivateChannelAudio(request, f.io)).error, 'original_conflict');
  assert.deepEqual(f.calls, []);
});

test('timed mode persists mixed evidence only as a draft and records unknown failures without touching originals', async () => {
  for (const failed of [false,true]) {
    const f=fixture(), before=structuredClone(f.source);
    const inspected=await processPrivateChannelAudio(body,f.io);
    f.io.transcribe=async args=>{
      assert.equal(args.timestamped,true); assert.equal(args.language,null);
      return failed?{ok:false,status:503,model:'whisper-1'}:{ok:true,model:'whisper-1',duration:4,words:[{start:0,end:1,word:'שלום'},{start:2,end:3,word:'привет'}]};
    };
    const out=await processPrivateChannelAudio({...body,action:'transcribe_private_audio_timed',source_lang:'he',expected_sha256:inspected.receipt.sha256},f.io);
    assert.equal(out.classification,failed?'unknown':'mixed'); assert.equal(f.rows[0].lang,failed?'und':'mul');
    assert.equal(f.rows[0].status,'draft');assert.deepEqual(f.source,before);
    const evidence=JSON.parse(f.rows[0].summary);
    assert.equal(evidence.sha256,inspected.receipt.sha256);assert.equal(evidence.human_reviewed,false);
    assert.equal(evidence.segments.length,failed?0:2);
  }
});
