import test from 'node:test';
import assert from 'node:assert/strict';
import {
  projectPublicCalculatorActivity, projectOwnCalculatorActivity, createFirstNameJourneyHandoff,
} from '../src/lib/research/calculatorConnectedSurface2029.js';

test('public activity never projects raw search terms / personal fields', () => {
  const raw = { publicPhraseCount: 24296, hotNumbers: [
    { n: 13, count: 45, term: 'פרטי סודי', birthdate: '2000-01-01' },
    { n: 776, count: 90, user_id: 'secret' },
    { n: 776, count: 1 }, { n: 0, count: 100 },
    { n: 12, count: -4 }, { n: 'hello', count: 4 },
  ] };
  const result = projectPublicCalculatorActivity(raw);
  assert.equal(result.publicPhraseCount, 24296);
  assert.deepEqual(result.trendingNumbers.map(x=>[x.value,x.searches]), [[776,90],[13,45]]);
  assert.equal(result.scope, 'public_aggregate');
  assert.doesNotMatch(JSON.stringify(result), /secret|2000|סודי|birthdate|user_id|term/);
  assert.equal(projectPublicCalculatorActivity({ publicPhraseCount: 'broken' }).publicPhraseCount, null);
  assert.equal(projectPublicCalculatorActivity().publicPhraseCount, null);
});

test('private research history is not confused with all searches or public activity', () => {
  const input = [
    { id: 'abc', type: 'phrase', title: 'שאלה פרטית' },
    { id: '13', type: 'number', title: 'אהבה', t: 10 },
    { id: '13', type: 'number', title: 'duplicate', t: 8 },
    { id: 'f', type: 'gematria_expression', expression: 'אהבה', value: 13 },
    { id: 'x', type: 'post', title: 'post' },
  ];
  const result = projectOwnCalculatorActivity(input);
  assert.equal(result.scope, 'viewer_private');
  assert.equal(result.historyMeaning, 'research_activity_not_every_search');
  assert.deepEqual(result.items.map(x=>x.type), ['number', 'gematria_expression']);
  assert.equal(result.items[0].timestamp, 10);
  assert.equal(result.items[0].number, 13);
  assert.doesNotMatch(JSON.stringify(result), /שאלה פרטית/);
  assert.deepEqual(projectOwnCalculatorActivity([]).items, []);
  assert.deepEqual(projectOwnCalculatorActivity(input, {limit: 0}).items, []);
});

test('first-name journey handoff is intentional, ephemeral and contains no sensitive fields', () => {
  assert.equal(createFirstNameJourneyHandoff('דוד'), null);
  const result = createFirstNameJourneyHandoff('  בן   ציון ', { explicitlyConfirmed: true });
  assert.deepEqual(result, { pathname: '/journey', state: { kind: 'calculator_first_name_suggestion', firstName: 'בן ציון', from: 'calculator' } });
  assert.doesNotMatch(JSON.stringify(result), /birthdate|personId|user_id|http|q=/);
  for(const raw of ['<script>', 'name@example.com', 'משה123', ' ', 'א'.repeat(81)]) {
    assert.equal(createFirstNameJourneyHandoff(raw, { explicitlyConfirmed: true }), null);
  }
});
