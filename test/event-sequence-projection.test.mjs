import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventSequences } from '../src/lib/research/eventSequenceProjection.js';
import { buildPresentationReason, buildPresentationFeedback } from '../src/lib/research/presentationReason.js';
const event = (id, parentId = null, order = null) => ({ id, label: id, href: `/event/${id}`, parentId, order });
const update = (id, eventId, at, extra = {}) => ({ id, eventId, revisionId: '1', sourceRef: `posts:${id}`, summary: `changed ${id}`, href: `/post/${id}#unit`, arrivalAt: at, streamIds: ['sources'], verification: 'unverified', ...extra });
const at = '2026-10-13T07:00:00Z';
test('multiple unrelated sequences, parent-first undated chronology and one latest pulse each', () => {
  const p = buildEventSequences({ events: [event('c2','root',2),event('other'),event('root'),event('c1','root',1)], updates: [update('u','c1',at),update('v','c2','2026-10-13T08:00:00Z'),update('w','other',at)] });
  assert.equal(p.sequences.length,2); assert.deepEqual(p.sequences[0].treeRows.map(e=>e.id),['root','c1','c2']);
  assert.deepEqual(p.sequences[0].treeRows.map(e=>e.depth),[0,1,1]);
  assert.equal(p.sequences[0].updates.filter(u=>u.pulse).length,1);
  assert.equal(p.sequences[0].updates.at(-1).verification,'unverified');
});
test('seen revision stays read, a later revision resurfaces without marking all history new',()=>{
  const bundle={events:[event('root')],updates:[update('u','root',at)]};
  const key=buildEventSequences(bundle).sequences[0].updates[0].seenKey;
  const seen={[key]:true}; assert.equal(buildEventSequences(bundle,{seen}).streams[0].hasUnread,false);
  bundle.updates.push(update('u','root','2026-10-13T08:00:00Z',{revisionId:'2'}));
  const rows=buildEventSequences(bundle,{seen}).sequences[0].updates;
  assert.deepEqual(rows.map(u=>u.isUnread),[false,true]); assert.equal(rows.filter(u=>u.pulse).length,1);
});
test('reduced motion preserves latest/unread semantics without pulse',()=>{
  const p=buildEventSequences({events:[event('a')],updates:[update('u','a',at)]},{reducedMotion:true});
  assert.equal(p.sequences[0].updates[0].isLatest,true); assert.equal(p.sequences[0].updates[0].pulse,false); assert.equal(p.streams[0].hasUnread,true);
});
test('same attested occurrence across streams is one update; similar titles are not dedup evidence',()=>{
  const a=update('u','a',at); const b={...a,streamIds:['mail']};
  const p=buildEventSequences({events:[event('a')],updates:[a,b,update('v','a',at,{summary:a.summary})]});
  assert.equal(p.sequences[0].updates.length,2); assert.deepEqual(p.sequences[0].updates[0].streamIds,['mail','sources']);
});
test('conflicting event or occurrence identity is withheld, independently of input order',()=>{
  const rows=[update('u','a',at),update('u','a',at,{summary:'conflict'})];
  for(const updates of [rows,[...rows].reverse()]) assert.equal(buildEventSequences({events:[event('a')],updates}).sequences[0].updates.length,0);
  assert.equal(buildEventSequences({events:[event('a'),{...event('a'),label:'different'}]}).sequences.length,0);
});
test('missing ancestors/cycles are not promoted to roots or exposed in diagnostic labels',()=>{
  const p=buildEventSequences({events:[event('secret-child','missing'),event('a','b'),event('b','a'),event('ok')],updates:[update('u','secret-child',at)]});
  assert.deepEqual(p.sequences.map(s=>s.rootId),['ok']); assert.equal(p.coverage.state,'partial');
  assert.ok(!JSON.stringify(p).includes('secret-child')); assert.ok(!JSON.stringify(p).includes('missing"'));
});
test('late parent resolves the same source occurrence key',()=>{
  const u=update('u','child',at); const events=[event('child','root')];
  assert.equal(buildEventSequences({events,updates:[u]}).sequences.length,0);
  events.push(event('root')); const a=buildEventSequences({events,updates:[u]}).sequences[0].updates[0].seenKey;
  assert.equal(a,buildEventSequences({events:[...events].reverse(),updates:[u]}).sequences[0].updates[0].seenKey);
});
test('no HTML/raw metadata, missing clocks, unsafe URLs or inferred relationship is exported',()=>{
  const p=buildEventSequences({events:[{...event('a'),email:'private'},event('b')],updates:[update('u','a',at,{privateBody:'secret'}),update('v','a',null),update('x','a',at,{href:'//evil.test'}),update('y','a',at,{href:'/\\evil.test'})]});
  assert.equal(p.sequences.find(s=>s.rootId==='a').updates.length,1); assert.ok(!JSON.stringify(p).includes('secret')); assert.ok(!JSON.stringify(p).includes('private'));
  assert.equal(p.sequences.length,2);
});
test('arrival time ranks updates independently of event time; replay order is deterministic',()=>{
  const events=[{...event('a'),occurredAt:'2020-01-01'},{...event('b'),occurredAt:'2030-01-01'}];
  const updates=[update('u','b',at),update('z','a','2026-10-13T09:00:00Z'),update('z','a','2026-10-13T09:00:00Z',{revisionId:'2'})];
  assert.deepEqual(buildEventSequences({events,updates}),buildEventSequences({events:[...events].reverse(),updates:[...updates].reverse()}));
  assert.equal(buildEventSequences({events,updates}).sequences[0].rootId,'a');
});
test('oversized/malformed bundles fail explicitly instead of silently truncating a thread',()=>{
  assert.equal(buildEventSequences({events:Array(1001).fill(event('a'))}).coverage.state,'unavailable');
  assert.equal(buildEventSequences({events:null}).coverage.state,'unavailable');
});
test('optional reason has no audience classifier and recommendations require provenance',()=>{
  assert.equal(buildPresentationReason({code:'or_geula_audience',subjectRef:'a',occurrenceKey:'b'}),null);
  assert.equal(buildPresentationReason({code:'explicit_recommendation',subjectRef:'a',occurrenceKey:'b'}),null);
  const r=buildPresentationReason({code:'followed_subject',subjectRef:'a',occurrenceKey:'b',audience:'private'});
  assert.ok(!JSON.stringify(r).includes('audience')); const f=buildPresentationFeedback(r,'dismiss_once');
  assert.equal(f.changesFollow,false); assert.equal(f.requiresConfirmation,false);
  assert.equal(buildPresentationFeedback(r,'mute_subject').requiresConfirmation,true);
});
test('unknown sibling chronology stays explicit rather than claiming lexical order is historical',()=>{
  const p=buildEventSequences({events:[event('root'),event('a','root'),event('b','root')]});
  assert.equal(p.sequences[0].chronologyAvailable,false);
});
test('explanation references are bounded strings, not caller profile objects',()=>{
  assert.equal(buildPresentationReason({code:'recent_arrival',subjectRef:{email:'secret'},occurrenceKey:'a'}),null);
  assert.equal(buildPresentationReason({code:'recent_arrival',subjectRef:'x'.repeat(513),occurrenceKey:'a'}),null);
});
