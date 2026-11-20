import test from 'node:test';
import assert from 'node:assert/strict';
import { privateAudioTimedDraft } from '../supabase/functions/_shared/privateAudioTimedDraft.js';
import { transcribeBlob, STT_MODEL } from '../supabase/functions/_shared/sttTranscribe.js';

test('language switches retain provider word boundaries and original scripts', () => {
  const out = privateAudioTimedDraft({ ok: true, duration: 6, words: [
    { start: 0, end: 1, word: 'שלום' }, { start: 1, end: 2, word: 'לכולם' },
    { start: 2.5, end: 4, word: 'радость' }, { start: 4, end: 5, word: 'שמחה' }], segments: [] });
  assert.equal(out.classification, 'mixed');
  assert.deepEqual(out.segments.map(s => [s.start,s.end,s.language,s.text]), [[0,2,'he','שלום לכולם'],[2.5,4,'ru','радость'],[4,5,'he','שמחה']]);
});
test('unsupported or uncertain speech is unknown; timestamps are never invented', () => {
  for (const stt of [{ ok: false, status: 503 }, { ok: true, text: 'שלום' },
    { ok:true,duration:2,words:[{start:0,end:3,word:'שלום'}] },
    { ok:true,duration:2,segments:[{start:0,end:2,text:'שלום радость'}] },
    { ok:true,duration:2,words:[{start:0,end:1,word:'שלום'}],segments:[{start:0,end:2,no_speech_prob:.9}] }]) {
    const out=privateAudioTimedDraft(stt); assert.equal(out.classification,'unknown'); assert.ok(out.reason);
  }
});
test('Hebrew and Russian are recognized separately without a caller language hint', () => {
  for (const [word,lang] of [['שלום','he'],['радость','ru']])
    assert.equal(privateAudioTimedDraft({ok:true,duration:2,words:[{start:0,end:1,word}]}).classification,lang);
});
test('invalid word alignment falls back to real segment times and retains raw evidence', () => {
  const words = [{start:0,end:0,word:'שלום'},{start:1,end:2,word:'לכולם'}];
  const segments = [{start:0,end:2,text:'שלום לכולם'}, {start:2,end:4,text:'радость'}];
  const out = privateAudioTimedDraft({ok:true,duration:4,text:'שלום לכולם радость',words,segments});
  assert.equal(out.classification,'mixed');
  assert.equal(out.timing_basis,'provider_segments');
  assert.deepEqual(out.segments.map(s=>[s.start,s.end,s.language]),[[0,2,'he'],[2,4,'ru']]);
  assert.deepEqual(out.asr_evidence.words,words);
  const unknown = privateAudioTimedDraft({ok:true,duration:1,text:'שלום',words,segments});
  assert.equal(unknown.classification,'unknown');
  assert.equal(unknown.asr_evidence.text,'שלום');
});
test('timestamp mode is opt-in; the existing default model and request stay unchanged', async () => {
  for (const timestamped of [false,true]) {
    let request;
    const out=await transcribeBlob({key:'test',blob:new Blob(['audio']),filename:'test.ogg',type:'audio/ogg',timestamped,
      fetchImpl:async (url,opts)=>{request=opts.body;return new Response(JSON.stringify({text:'שלום',duration:2,words:[{start:0,end:1,word:'שלום'}],segments:[]}),{status:200});}});
    assert.equal(request.get('language'),null);
    assert.equal(request.get('model'),timestamped?'whisper-1':STT_MODEL);
    assert.equal(request.get('response_format'),timestamped?'verbose_json':null);
    assert.deepEqual(request.getAll('timestamp_granularities[]'),timestamped?['word','segment']:[]);
    assert.equal(Boolean(out.words),timestamped);
  }
});
