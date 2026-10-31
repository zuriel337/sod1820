import test from 'node:test';
import assert from 'node:assert/strict';
import { razielPublicLabel, razielSubjectLabel, razielContextParts } from '../src/components/experience2029/razielSessionSeam2029.js';

test('public Hebrew labels never expose mixed-language ELS locators or hashes', () => {
  const raw = 'els:torah:יוממשיחבא:regular:583_-1_239480:583';
  assert.equal(razielPublicLabel(raw, 'יום משיח בא'), 'יום משיח בא');
  assert.equal(razielPublicLabel('0b022e8eef6f9c16'), 'ההקשר הנבחר');
  assert.equal(razielPublicLabel('els'), 'צופן');
  assert.equal(razielSubjectLabel({ type: 'phrase', id: raw, label: raw }), 'ביטוי');
});

test('display normalization preserves genuine English names and Hebrew terms, without mutating context', () => {
  for (const value of ['Donald Trump', 'NASA', 'יום משיח בא', 'AI בעברית 2029']) assert.equal(razielPublicLabel(value), value);
  const context = { subject: { type: 'phrase', id: 'private:123', label: 'Donald Trump' }, focus: { els: { term: 'יום משיח בא' } } };
  const before = structuredClone(context);
  assert.equal(razielContextParts(context)[0].label, 'Donald Trump');
  assert.deepEqual(context, before);
});
