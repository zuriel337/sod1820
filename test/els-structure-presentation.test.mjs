import test from 'node:test';
import assert from 'node:assert/strict';
import { presentElsStructureFamilies } from '../src/lib/research/elsStructurePresentation.js';
const member = (term, hitId, kind='els') => ({term,hitId,kind});
const card = (id, members, distance=5, types=['intersection']) => ({id,members,distance,types});
test('families preserve every original card exactly once and require a shared non-axis occurrence', () => {
  const axis=member('ציר','1_1_0','axis'), a=member('חלל','10_1_20');
  const cards=[card('a',[axis,a,member('נהל','3_1_30')]),card('b',[axis,a,member('להבה','4_1_40')]),card('c',[axis,member('חלל','10_1_50')])];
  const families=presentElsStructureFamilies(cards);
  assert.equal(families.length,2); assert.equal(families[0].cards.length,2);
  assert.deepEqual(families.flatMap(f=>f.cards),cards);
  assert.equal(families[0].cards[0],cards[0]);
});
test('a frequent word cannot consume the first page before other available words', () => {
  const cards=Array.from({length:30},(_,i)=>card(String(i),[member('חלל',`10_1_${i}`)]));
  cards.push(card('other',[member('להבה','8_1_500')]));
  const families=presentElsStructureFamilies(cards);
  assert.equal(families[1].member.term,'להבה');
  assert.equal(families.flatMap(f=>f.cards).length,31);
});
test('sorting uses non-axis length or supplied distance without mutating cards or inventing a score', () => {
  const cards=[card('short',[member('צירארוךמאוד','1_1_0','axis'),member('אב','2_1_2')],undefined),card('long',[member('להבה','4_1_8')],2)];
  delete cards[0].distance;
  const before=JSON.stringify(cards);
  for(const sort of ['length','distance']) assert.equal(presentElsStructureFamilies(cards,sort)[0].cards[0].id,'long');
  assert.equal(JSON.stringify(cards),before);
});
test('overlapping chains do not become one invented structure and filters retain only supplied cards', () => {
  const a=member('אב','2_1_2'),b=member('גד','2_1_3'),c=member('הו','2_1_4'),d=member('זח','2_1_5');
  const cards=[card('ab',[a,b]),card('bc',[b,c]),card('cd',[c,d])];
  const result=presentElsStructureFamilies(cards);
  assert.equal(result.length,2);assert.equal(result[0].cards.length,2);
  assert.deepEqual(presentElsStructureFamilies([cards[2]])[0].cards,[cards[2]]);
});
