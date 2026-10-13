import test from 'node:test';
import assert from 'node:assert/strict';
import { projectPrivateEmailThreads, intakeRoute, emailIntakeDescriptor, intakeFollowSubject } from '../src/lib/research/sourceIntake.js';
const mail=(id,extra={})=>({id,subject:'אותו נושא',message_id:`m${id}`,received_at:`2026-10-13T${String(id).padStart(2,'0')}:00:00Z`,read:false,...extra});
test('same subject never merges independent mail; duplicate page occurrences dedup',()=>{
  const rows=projectPrivateEmailThreads([mail(1),mail(2),mail(1)]);
  assert.equal(rows.length,2); assert.equal(rows[0].root.id,2);
});
test('parent precedes reply even with inverted source clocks; only actual latest is new',()=>{
  const rows=projectPrivateEmailThreads([mail(2,{in_reply_to:'m1',received_at:'2026-10-13T00:00:00Z'}),mail(1)]);
  assert.deepEqual(rows[0].rows.map(x=>x.id),[1,2]); assert.equal(rows[0].latestId,'1');
});
test('missing-parent siblings stay together; late parent joins without subject matching',()=>{
  const rows=[mail(2,{in_reply_to:'m1'}),mail(3,{in_reply_to:'m1'})];
  assert.equal(projectPrivateEmailThreads(rows).length,1); assert.equal(projectPrivateEmailThreads(rows)[0].missingParent,true);
  const complete=projectPrivateEmailThreads([...rows,mail(1)]);
  assert.equal(complete[0].missingParent,false);assert.deepEqual(complete[0].rows.map(x=>x.id),[1,2,3]);
});
test('ambiguous RFC identity and cycles are shown as unresolved, not invented chronology',()=>{
  const ambiguous=projectPrivateEmailThreads([mail(1),mail(2,{message_id:'m1'}),mail(3,{in_reply_to:'m1'})]);
  assert.equal(ambiguous.find(x=>x.root.id===3).ambiguousParent,true);assert.equal(ambiguous.length,3);
  const cyclic=projectPrivateEmailThreads([mail(1,{in_reply_to:'m2'}),mail(2,{in_reply_to:'m1'})]);
  assert.equal(cyclic.length,2);assert.ok(cyclic.every(x=>x.cyclic));
});
test('normalized stable lineage is used while provider storage keys stay private',()=>{
  const rows=projectPrivateEmailThreads([mail(1,{message_id:'provider_x',meta:{source_email_v1:{id:'stable-a',message_id:'m1'}}}),
    mail(2,{meta:{source_email_v1:{id:'stable-b',parent_id:'stable-a'}}})]);
  assert.deepEqual(rows[0].rows.map(x=>x.id),[1,2]);
});
test('Research Intake descriptor keeps exact raw text and private access, not publication',()=>{
  const text='<script>untrusted instruction</script>'.repeat(1000),row=mail(1,{body_text:text});
  const descriptor=emailIntakeDescriptor(row);
  assert.equal(descriptor.rawInput.value,text);assert.equal(descriptor.accessTier,'private');
  assert.equal(descriptor.persistence.persisted_ref,'inbound_emails:1');assert.equal('published' in descriptor,false);
});
test('route defaults to empty draft and does not treat unknown flags as publication',()=>{
  assert.deepEqual(intakeRoute(mail(1)),{revision:0,destinations:[],state:'draft'});
  assert.deepEqual(intakeRoute(mail(1,{meta:{intake_projection_v1:{revision:2,state:'approved',destinations:['world','world','unknown']}}})),{revision:2,destinations:['world'],state:'draft'});
});
test('Follow reuses existing author subject; no namespace is guessed from private sender',()=>{
  assert.equal(intakeFollowSubject(mail(1,{from_email:'private@example.invalid'})),null);
  const row=mail(1,{meta:{source_email_v1:{admission:'approved_source_candidate',author:{author_display:'כותב קנוני'}}}});
  assert.deepEqual(intakeFollowSubject(row),{entityType:'author',stableId:'כותב קנוני'});
  row.meta.source_email_v1.technical_test=true;assert.equal(intakeFollowSubject(row),null);
});
