import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const raziel = read('supabase/functions/wa-raziel/index.ts');
const video = read('supabase/functions/wa-video-enrich/index.ts');

test('A2 wa-raziel emits one canonical trace root and linked model cost without raw payloads', () => {
  assert.match(raziel, /op_trace_begin_v1/);
  assert.match(raziel, /capability:\s*"wa-raziel:reply"/);
  assert.match(raziel, /kind:\s*"model_call"[\s\S]*name:\s*"wa-raziel:anthropic-reply"/);
  assert.match(raziel, /trace_id:\s*t\?\.traceId/);
  assert.match(raziel, /span_id:\s*t\?\.traceId\s*\?\s*spanId/);
  assert.match(raziel, /op_trace_link_ai_cost_v1/);
  assert.doesNotMatch(raziel, /op_trace_link_ai_cost_v1[\s\S]{0,260}\.catch\(/);
  assert.match(raziel, /rawPrivatePayloadLogged:\s*false/);
  assert.match(raziel, /wa-chat:sha256:/);
  assert.doesNotMatch(raziel, /subject_ref:\s*chatId/);
});

test('A2 wa-video-enrich traces batch plus Anthropic calls and OpenAI STT tool', () => {
  assert.match(video, /op_trace_begin_v1/);
  assert.match(video, /capability:\s*"wa-video-enrich"/);
  assert.match(video, /name:\s*"wa-video-enrich:thumbnail-metadata"/);
  assert.match(video, /name:\s*"wa-video-enrich:text-metadata"/);
  assert.match(video, /kind:\s*"tool_call"[\s\S]*name:\s*"wa-video-enrich:openai-transcribe"/);
  assert.match(video, /op_trace_link_ai_cost_v1/);
  assert.match(video, /trace_id:\s*opTrace\?\.traceId/);
  assert.match(video, /rawPrivatePayloadLogged:\s*false/);
  assert.match(video, /finishVideoTrace\(opTrace/);
  assert.match(video, /thumbnailMetadataTraced\(row, opTrace, null\)/);
  assert.match(video, /aiMetadata\(basis, opTrace, null\)/);
  assert.match(video, /transcribe\(row, opTrace, null\)/);
  assert.doesNotMatch(video, /kind:\s*"tool"/);
  assert.doesNotMatch(video, /op_trace_link_ai_cost_v1[\s\S]{0,260}\.catch\(/);
});

test('A2 does not introduce a second trace/cost store or change auth mode', () => {
  for (const src of [raziel, video]) {
    assert.doesNotMatch(src, /create table|CREATE TABLE/i);
    assert.doesNotMatch(src, /new Trace|trace_store|cost_store/i);
  }
  assert.match(raziel, /FB_ADMIN_KEY/);
  assert.match(video, /FB_ADMIN_KEY/);
});
