import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {generatedMigration,migrationPath} from '../scripts/generate-follow-content-series-only.mjs';
import {CONTENT_SERIES_2029} from '../src/lib/research/contentSeries2029Identity.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sha=text=>createHash('sha256').update(text).digest('hex');
const manifest=JSON.parse(read('docs/reviews/follow-series-release-20261031/manifest.json'));
const candidate=read(migrationPath),rollback=read(manifest.rollback_path);

test('exact reviewed artifacts match the shared descriptor build and release hashes',()=>{
  assert.equal(candidate,generatedMigration());assert.equal(manifest.candidate_path,migrationPath);
  assert.equal(sha(candidate),manifest.candidate_sha256);assert.equal(sha(rollback),manifest.rollback_sha256);
  assert.deepEqual([...CONTENT_SERIES_2029.map(item=>item.key)].sort(),[...manifest.series].sort());
});
test('series release preserves Legacy category normalization and existing authorization primitives',()=>{
  assert.equal(manifest.preserve_legacy_category_functions,true);
  const replaced=[...candidate.matchAll(/create or replace function public\.(\w+)/gi)].map(match=>match[1]);
  assert.deepEqual(replaced,['canonical_follow_subject','notify_on_post_publish']);
  assert.doesNotMatch(candidate,/create or replace function public\.(?:canonical_follow_topic|follow_topic_aliases|watch_toggle|dispatch|resolve_topics)/i);
  assert.doesNotMatch(candidate,/(?:insert into|update|delete from)\s+(?:public\.)?notification_prefs\b/i);
  assert.doesNotMatch(candidate,/grant\s|create table|alter table|net\.http|http_post/i);
  assert.match(candidate,/revoke all on function public\.post_content_series_keys_v1\(text\[\],text\[\],text\) from public, anon, authenticated/);
});
test('apply and rollback refuse stale function and trigger bases without removing data',()=>{
  for(const [name,hash]of Object.entries(manifest.preimage_md5)){
    assert.ok(candidate.includes(hash),name+' preimage must be guarded');
  }
  for(const [name,hash]of Object.entries(manifest.postimage_md5))assert.ok(rollback.includes(hash),name+' rollback must be guarded');
  assert.ok(candidate.includes(manifest.trigger_before));assert.ok(rollback.includes(manifest.trigger_after));
  assert.match(candidate,/series helper already exists/);assert.match(rollback,/Follow rollback base changed/);
  assert.doesNotMatch(rollback,/(?:insert into|update|delete from)\s+(?:public\.)?(?:notification_prefs|subscribe_events|user_notifications)\b/i);
  assert.doesNotMatch(rollback,/cascade|create or replace function public\.(?:canonical_follow_topic|follow_topic_aliases)/i);
});
