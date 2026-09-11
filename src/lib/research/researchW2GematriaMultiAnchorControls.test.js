import assert from 'node:assert/strict';
import test from 'node:test';

import { createGematriaW2Executor } from './gematriaW2Executor.js';
import { createCanonicalW2Executors } from './researchW2Executors.js';
import { ACCESS_CLASS } from './researchResultBundle.js';
import { expandResearchTextRepresentations, hebrewUnitSuffixControlSet } from './researchRepresentations.js';

const methodsFor = text => {
  const fixture = {
    'תשפו': { ragil: 786, misratar: 394, miluy: 879, kadmi: 3016, gadol: 786, siduri: 66, atbash: 89, albam: 116, kadmi_gadol: 3016 },
    'תשפז': { ragil: 787, misratar: 393, miluy: 924, kadmi: 3023, gadol: 787, siduri: 67, atbash: 79, albam: 126, kadmi_gadol: 3023 },
    'יוסף': { ragil: 156, misratar: 100 },
    'חיים': { ragil: 68, misratar: 72 },
    'וינר': { ragil: 266, misratar: 120 },
    'יוסף חיים וינר': { ragil: 490, misratar: 292 },
    'יוסף וינר': { ragil: 422, misratar: 220 },
  };
  return fixture[text] || { ragil: 1, misratar: 2 };
};

function fakeSupabase() {
  return {
    async rpc(name, args) {
      if (name === 'gematria_api') {
        const text = args?.p_text;
        const methods = methodsFor(text);
        return { data: { input: text, value: methods.ragil ?? 0, methods } };
      }
      if (name === 'fn_gematria_pair_invariance_control') {
        assert.deepEqual(args.p_anchor_texts, ['תשפו', 'תשפז']);
        assert.equal(args.p_control_texts.length, 9);
        return {
          data: {
            status: 'ok',
            model: 'gematria_pair_invariance_control_v1',
            evaluations: [{
              methods: ['misratar', 'ragil'],
              value: 1180,
              anchor_count: 2,
              control_tested: 9,
              control_matched: 9,
              base_rate: 1,
              expectedness: 'certain_under_bounded_control_set',
              evidence_relation: 'derivation',
              reason: 'structurally expected',
            }],
          },
        };
      }
      return { data: null };
    },
  };
}

test('name representation expansion preserves full name, exact parts and declared roles', () => {
  const resolved = {
    text_calculation_allowed: true,
    identities: [{
      type: 'name',
      key: 'name:person-1',
      label: 'יוסף חיים וינר',
      metadata: {
        name_parts: [
          { text: 'יוסף', role: 'given_name' },
          { text: 'חיים', role: 'middle_name' },
          { text: 'וינר', role: 'family_name' },
        ],
      },
      access: { tier: 'personal' },
    }],
  };

  const reps = expandResearchTextRepresentations(resolved);
  assert.equal(reps[0].kind, 'full_name');
  assert.equal(reps[0].text, 'יוסף חיים וינר');
  assert.equal(reps[0].access_tier, 'personal');
  assert.ok(reps.some(x => x.text === 'יוסף' && x.role === 'given_name' && x.role_source === 'source_declared'));
  assert.ok(reps.some(x => x.text === 'חיים' && x.role === 'middle_name'));
  assert.ok(reps.some(x => x.text === 'וינר' && x.role === 'family_name'));
  assert.ok(reps.some(x => x.text === 'יוסף וינר' && x.role === 'given_family'));
});

test('whitespace tokenization never fabricates surname/given-name roles', () => {
  const resolved = {
    text_calculation_allowed: true,
    identities: [{ type: 'name', key: 'name:2', label: 'משה כהן' }],
  };
  const reps = expandResearchTextRepresentations(resolved);
  assert.ok(reps.some(x => x.text === 'משה' && x.role === 'word_1' && x.role_source === 'whitespace_position_only'));
  assert.ok(reps.some(x => x.text === 'כהן' && x.role === 'word_2' && x.role_source === 'whitespace_position_only'));
  assert.equal(reps.some(x => x.role === 'family_name'), false);
});

test('Hebrew unit suffix controls stay representation-level and bounded', () => {
  const reps = expandResearchTextRepresentations({
    identities: [
      { type: 'phrase', key: 'year-label:1', label: 'תשפו' },
      { type: 'phrase', key: 'year-label:2', label: 'תשפז' },
    ],
    text_calculation_allowed: true,
  });
  const controls = hebrewUnitSuffixControlSet(reps);
  assert.equal(controls.kind, 'hebrew_unit_suffix_structural_control');
  assert.equal(controls.prefix, 'תשפ');
  assert.deepEqual(controls.controls, ['תשפא','תשפב','תשפג','תשפד','תשפה','תשפו','תשפז','תשפח','תשפט']);
  assert.equal(controls.semantic_identity_claimed, false);
});

test('canonical Gematria executor runs every bounded representation and surfaces structural controls', async () => {
  const executor = createGematriaW2Executor({ supabase: fakeSupabase() });
  const result = await executor({
    identityResolution: {
      identities: [
        { type: 'phrase', key: 'label:786', label: 'תשפו' },
        { type: 'phrase', key: 'label:787', label: 'תשפז' },
      ],
      text_calculation_allowed: true,
    },
  });

  assert.equal(result.status, 'executed');
  assert.equal(result.trace.representation_count, 2);
  assert.equal(result.findings.length, 18);
  assert.equal(result.accessClass, ACCESS_CLASS.PUBLIC_SOURCE);
  const control = result.trace.controls.evaluations.find(x => x.value === 1180);
  assert.equal(control.base_rate, 1);
  assert.equal(control.evidence_relation, 'derivation');
  assert.equal(control.expectedness, 'certain_under_bounded_control_set');
  assert.equal(result.trace.root_gate.includes('ephemeral computation only'), true);
});

test('personal name representations remain access-controlled in Gematria findings', async () => {
  const executor = createGematriaW2Executor({ supabase: fakeSupabase(), controls: false });
  const result = await executor({
    identityResolution: {
      text_calculation_allowed: true,
      identities: [{
        type: 'name', key: 'person-name:1', label: 'יוסף חיים וינר',
        access: { tier: 'personal' },
        metadata: { name_parts: [
          { text: 'יוסף', role: 'given_name' },
          { text: 'חיים', role: 'middle_name' },
          { text: 'וינר', role: 'family_name' },
        ] },
      }],
    },
  });
  assert.equal(result.accessClass, ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED);
  assert.ok(result.findings.length > 0);
  assert.ok(result.findings.every(f => f.access?.tier === 'personal'));
  assert.equal(result.trace.representations.some(x => Object.hasOwn(x, 'text')), false);
});

test('canonical executor factory exposes Gematria without replacing prior executor tree', () => {
  const executors = createCanonicalW2Executors({ supabase: fakeSupabase() });
  assert.equal(typeof executors.gematria, 'function');
  assert.equal(typeof executors.numeric, 'function');
  assert.equal(typeof executors.els, 'function');
});

test('numeric executor runs bounded lookup independently for multiple number anchors', async () => {
  const calls = [];
  const supabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === 'fn_number_lookup') {
        const value = Number(args.p_value);
        return { data: [{
          method: 'ragil',
          phrase: `phrase-${value}`,
          value,
          bid_id: `bid-${value}`,
          word_id: null,
          method_version: 1,
          row_provenance_state: 'governed',
          method_governed: true,
          atomic_or_composite: 'atomic',
          engine_run_id: `run-${value}`,
          total_count: 1,
        }] };
      }
      return { data: null };
    },
  };

  const executors = createCanonicalW2Executors({ supabase, numericLenses: ['number_lookup'] });
  const result = await executors.numeric({
    identityResolution: {
      identities: [
        { type: 'number', key: 'number:358', value: 358 },
        { type: 'number', key: 'number:377', value: 377 },
      ],
    },
  });

  assert.equal(result.status, 'executed');
  assert.equal(result.trace.multi_anchor, true);
  assert.equal(result.trace.anchor_count, 2);
  assert.equal(result.findings.length, 2);
  const lookupCalls = calls.filter(x => x.name === 'fn_number_lookup');
  assert.equal(lookupCalls.length, 2);
  assert.ok(lookupCalls.every(x => x.args.p_limit === 50));
  assert.ok(lookupCalls.every(x => x.args.p_after_bid_id == null));
  assert.deepEqual(result.sourceRefs.sort(), ['number:358', 'number:377']);
});
