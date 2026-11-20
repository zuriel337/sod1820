// Private channel audio adapts the existing STT/transcript owner. It never
// changes a source, attributes its author, publishes a file, or creates a finding.
import { MAX_STT_BYTES, normalizeLanguage } from './sttTranscribe.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA = /^[0-9a-f]{64}$/;
const AUDIO_PATH = /^sod1820\/2029\/unresolved\/\d{4}\/\d{2}\/[0-9a-f-]{36}\/audio\/original\.ogg$/;
export const PRIVATE_AUDIO_PREFIX = 'channel-audio:';
export const privateAudioAction = action => ['inspect_private_audio', 'transcribe_private_audio'].includes(action);
export const privateAudioKey = (sourceId, objectId) => `${PRIVATE_AUDIO_PREFIX}${sourceId}:${objectId}`;
const fail = error => ({ ok: false, error });
const sourceWitness = row => row ? JSON.stringify([row.id, row.image_url, row.status, row.created_at,
  row.ext_msg_id, row.contributor_id, row.channel]) : null;
const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  v => v.toString(16).padStart(2, '0')).join('');

// All I/O is injected by the already admin-authenticated video-transcribe handler.
export async function processPrivateChannelAudio(body, io) {
  const id = String(body.channel_update_id || ''), objectId = String(body.storage_object_id || '');
  if (!privateAudioAction(body.action) || !UUID.test(id) || !UUID.test(objectId)) return fail('invalid_private_audio_reference');
  const expectedSize = Number(body.expected_size);
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0 || expectedSize > MAX_STT_BYTES) return fail('invalid_expected_size');
  const write = body.action === 'transcribe_private_audio';
  if (write && !SHA.test(String(body.expected_sha256 || ''))) return fail('expected_sha256_required');
  const source = await io.readSource(id);
  if (!source || source.id !== id || source.status !== 'private'
    || source.image_url !== `storage-object:${objectId}`
    || source.ext_msg_id !== body.expected_message_id
    || Date.parse(source.created_at) !== Date.parse(body.expected_created_at)) return fail('source_binding_mismatch');
  const witness = sourceWitness(source);
  const resolved = await io.resolvePrivate(id, objectId);
  if (!resolved?.ok || resolved.bucket !== 'submission-inbox' || !AUDIO_PATH.test(resolved.path || '')
    || resolved.mime !== 'audio/ogg' || Number(resolved.size) !== expectedSize) return fail('private_audio_metadata_mismatch');
  const blob = await io.download(resolved.bucket, resolved.path);
  if (!blob || blob.size !== expectedSize || blob.type.split(';')[0].toLowerCase() !== 'audio/ogg') return fail('private_audio_bytes_mismatch');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length < 27 || String.fromCharCode(...bytes.slice(0, 4)) !== 'OggS') return fail('private_audio_format_mismatch');
  const digest = await sha256(bytes);
  if (write && digest !== body.expected_sha256) return fail('private_audio_hash_mismatch');
  const video_key = privateAudioKey(id, objectId);
  const receipt = { channel_update_id: id, storage_object_id: objectId, video_key,
    mime: 'audio/ogg', size: bytes.length, sha256: digest, source_unchanged: true, public: false };
  if (sourceWitness(await io.readSource(id)) !== witness) return fail('source_changed');
  if (!write) return { ok: true, state: 'inspected', receipt };
  const originals = await io.listOriginals(video_key);
  if (originals.length > 1) return fail('original_conflict');
  if (originals.length === 1) return originals[0].status === 'draft'
    ? { ok: true, state: 'original_exists', receipt } : fail('private_original_not_draft');
  const stt = await io.transcribe({ blob, filename: `${id}.ogg`, type: 'audio/ogg', language: body.source_lang ?? null });
  if (!stt?.ok) return { ...fail('private_audio_transcription_failed'), provider_status: stt?.status ?? 0 };
  const lang = normalizeLanguage(stt.language);
  if (!lang || !String(stt.text || '').trim()) return fail('source_language_or_transcript_unknown');
  if (sourceWitness(await io.readSource(id)) !== witness) return fail('source_changed');
  // Publication is NOT inherited from the public-video STT row builder.
  const row = { video_key, source_url: `storage-object:${objectId}`,
    title: `טיוטת תמלול מקור קולי · ${id}`, lang, transcript: stt.text, is_original: true,
    translated_by: `openai:${stt.model}`, model: stt.model, status: 'draft',
    summary: `Automated transcript; not human-reviewed. Source channel_updates:${id}; audio SHA-256 ${digest}; ${bytes.length} bytes. Author attribution is separate.` };
  const inserted = await io.insertOriginal(row);
  const after = await io.listOriginals(video_key);
  if (after.length !== 1 || after[0].status !== 'draft') return fail('private_original_readback_failed');
  if (inserted && after[0].transcript !== stt.text) return fail('private_original_text_readback_failed');
  return { ok: true, state: inserted ? 'draft_transcribed' : 'original_exists', receipt,
    lang: after[0].lang, language_evidence: stt.language_evidence, transcript_id: after[0].id };
}
