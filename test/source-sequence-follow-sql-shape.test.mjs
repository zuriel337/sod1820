import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('unapplied Follow candidate is one intact definition and preserves both typed namespaces',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261013072000_event_follow_subject_projection_v1.sql',import.meta.url),'utf8');
  assert.equal((sql.match(/create or replace function/g)||[]).length,1);
  assert.equal((sql.match(/\$function\$/g)||[]).length,2);
  assert.ok(sql.includes("'^[1-9][0-9]{0,17}$'"));
  assert.ok(sql.trim().endsWith('$function$;'));
  assert.ok(sql.includes("('post', 'post_sequence')")); assert.ok(sql.includes("('event', 'event_sequence')"));
  assert.ok(sql.includes("canonical_follow_topic('post:' || v_id)"));
  assert.doesNotMatch(sql.replace(/^\s*--.*$/gm,''),/security definer|create table|grant |notify_topic\(/i);
});
