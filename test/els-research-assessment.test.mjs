import test from 'node:test';
import assert from 'node:assert/strict';
import { assessElsResearch, compareElsResearchRows } from '../src/lib/research/elsResearchAssessment.js';
const row = (key, verified, distance, source = 'engine') => ({key, occurrenceId:key, term:'התורה', verified, distance, kind:'els', source});
test('assessment retains unknown coverage and excludes old-window runs; score is not invented', () => {
  const result=assessElsResearch({contextKey:'B',runs:[{key:'A',data:{ok:true,coverage:{complete:true}}}]});
  assert.equal(result.scanned,false); assert.equal(result.score,null); assert.equal(result.comparable,false);
  const unknown=assessElsResearch({contextKey:'B',runs:[{key:'B',data:{ok:true}}]});
  assert.equal(unknown.coverage[0].remaining,null); assert.equal(unknown.partial,true);
});
test('counts are before display filters, deduplicate exact occurrences, and preserve sampled coverage', () => {
  const input={contextKey:'A',runs:[{key:'A',data:{ok:true,plan:{mode:'language'},coverage:{complete:true,completedRays:24,totalRays:24,remainingRays:0}}}], rows:[row('1',true,0),row('1',true,0),row('2',false,1)]};
  const original=structuredClone(input), result=assessElsResearch(input);
  assert.deepEqual(result.counts,{collected:2,verified:1,awaitingVerification:1,axisIntersections:1});
  assert.equal(result.partial,true);assert.equal(result.comparable,false);assert.deepEqual(input,original);
});
test('recommended order favors verified crossings, never AI source or unverified rarity', () => {
  const rows=[row('candidate',false,0,'fable'),row('far',true,8),row('crossing',true,0)];
  assert.deepEqual([...rows].sort(compareElsResearchRows).map(r=>r.key),['crossing','far','candidate']);
  assert.equal(compareElsResearchRows(row('same',true,1,'engine'),row('same',true,1,'fable')),0);
});
