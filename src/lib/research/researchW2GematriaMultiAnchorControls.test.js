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

// ── W2.2d CLOSURE REGRESSIONS (Claude, PR439) ────────────────────────────────────────────
// Each test below locks a defect that was found by running this branch against the CURRENT live
// database and against a private Person identity, not by reading the diff.

import { createCanonicalW2Executors as closureExecutors } from './researchW2Executors.js';
import { composeResearchW2 as closureCompose } from './researchComposerW2.js';
import { expandResearchTextRepresentations as closureExpand } from './researchRepresentations.js';
import { CAPABILITY_STATUS as CLOSURE_STATUS } from './researchResultBundle.js';

// The canonical DB exposes only fn_number_lookup(p_value bigint) until the W2.2d migration is
// applied; PostgREST answers the paged call with PGRST202. Before the fix this took the entire
// numeric capability to FAILED with zero findings, so merge order alone could break public research.
function preMigrationSupabase() {
  return {
    rpc: async (name, args) => {
      if (name === 'fn_number_lookup') {
        if ('p_limit' in (args || {}) || 'p_after_bid_id' in (args || {})) {
          return { error: { code: 'PGRST202', message: 'Could not find the function public.fn_number_lookup(p_after_bid_id, p_limit, p_value) in the schema cache' } };
        }
        return { data: [{ bid_id: 'b1', method: 'רגיל', phrase: 'משיח', value: args.p_value, method_governed: true, atomic_or_composite: 'atomic', row_provenance_state: 'governed', engine_run_id: 'e1', word_id: 'w1' }] };
      }
      if (name === 'fn_number_dossier') return { data: { value: args.p_value, facts: { convergences: [] } } };
      if (name === 'fn_number_journey') return { data: { value: args.p_value } };
      if (name === 'number_neighbors') return { data: [] };
      return { data: null };
    },
  };
}

test('W2.2d closure: server paging falls back to the legacy contract instead of failing before the migration is applied', async () => {
  const out = await closureExecutors({ supabase: preMigrationSupabase() })
    .numeric({ identityResolution: { identities: [{ type: 'number', value: 358, ref: '358' }] } });
  assert.equal(out.status, CLOSURE_STATUS.EXECUTED);
  assert.equal(out.findings.length, 1);
  // The downgrade is reported, never disguised as real server paging.
  assert.equal(out.bounded.window.transport, 'client_window_legacy_fallback');
});

test('W2.2d closure: a private name never reaches source_refs or the capability trace', async () => {
  const NAME = 'פלוני אלמוני';
  const executors = closureExecutors({
    supabase: { rpc: async (n, a) => (n === 'gematria_api' ? { data: { input: a.p_text, value: 1, methods: { ragil: 100 } } } : { data: null }) },
  });
  const bundle = await closureCompose({
    question: 'כמה שווה', rawInput: 'כמה שווה', explicitTextComputation: true,
    identityCandidates: [{ type: 'name', label: NAME, key: NAME, ref: NAME, source: 'personal_context', confidence: 'exact', access: { tier: 'personal' } }],
    requestedCapabilities: ['gematria'], contextType: 'public_user', executors,
  });
  const cap = bundle.capability_trace.find(x => x.key === 'gematria');
  // The Findings are correctly withheld by the boundary...
  assert.equal(bundle.findings.length, 0);
  assert.equal(cap.access_filtered.count, 3);
  // ...and the capability record, which the boundary does NOT filter, must not name the person.
  assert.equal(JSON.stringify(cap.source_refs).includes(NAME), false);
  assert.equal(JSON.stringify(cap.trace).includes(NAME), false);
});

test('W2.2d closure: representation refs stay stable and non-disclosing for restricted identities', () => {
  const NAME = 'פלוני אלמוני';
  const identity = { type: 'name', label: NAME, key: NAME, access: { tier: 'personal' } };
  const first = closureExpand({ identities: [identity], text_calculation_allowed: true });
  const second = closureExpand({ identities: [identity], text_calculation_allowed: true });
  assert.equal(first.some(r => r.ref.includes(NAME)), false);
  // Deterministic: replay and continuation depend on the ref being stable for the same identity.
  assert.deepEqual(first.map(r => r.ref), second.map(r => r.ref));
  // A public identity keeps its readable key so public research traces stay debuggable.
  const open = closureExpand({ identities: [{ type: 'phrase', label: 'אור הגאולה', key: 'phrase:or', access: { tier: 'public' } }] });
  assert.equal(open[0].ref.includes('phrase:or'), true);
});

test('W2.2d closure: one access-controlled anchor keeps the whole multi-anchor aggregate restricted', async () => {
  const executors = closureExecutors({
    supabase: { rpc: async (n) => (n === 'fn_number_lookup' ? { data: [] } : { data: null }) },
    // Only 358 carries a private row; 377 returns nothing at all.
    fetchResearchObjects: async num => (num === 358
      ? [{ id: 'ro-1', kind: 'fact', statement: 'PRIVATE', privacy_scope: 'private', value: 358 }]
      : []),
  });
  const out = await executors.research_objects({
    identityResolution: { identities: [{ type: 'number', value: 377, ref: '377' }, { type: 'number', value: 358, ref: '358' }] },
  });
  assert.equal(out.accessClass, 'source_access_controlled');
  assert.equal(out.trace.multi_anchor, true);
  assert.equal(out.trace.anchor_count, 2);
});

test('W2.2d closure: gematria bounded reports real overflow, never truncated-with-no-continuation', async () => {
  const executors = closureExecutors({
    supabase: { rpc: async (n, a) => (n === 'gematria_api' ? { data: { input: a.p_text, value: 1, methods: { ragil: 1 } } } : { data: null }) },
    gematriaMaxRepresentations: 2,
  });
  const out = await executors.gematria({
    identityResolution: { identities: [{ type: 'phrase', label: 'אחד שנים שלשה ארבעה', key: 'p1', access: { tier: 'public' } }], text_calculation_allowed: true },
  });
  // 1 full + 4 word parts = 5 available, budget 2 -> genuinely truncated.
  assert.equal(out.bounded.returned_count, 2);
  assert.equal(out.bounded.total_count, 5);
  assert.equal(out.bounded.truncated, true);

  const exact = closureExecutors({
    supabase: { rpc: async (n, a) => (n === 'gematria_api' ? { data: { input: a.p_text, value: 1, methods: { ragil: 1 } } } : { data: null }) },
    gematriaMaxRepresentations: 3,
  });
  const full = await exact.gematria({
    identityResolution: { identities: [{ type: 'phrase', label: 'אחד שנים', key: 'p2', access: { tier: 'public' } }], text_calculation_allowed: true },
  });
  // 1 full + 2 parts = exactly the budget, and nothing was cut -> must NOT claim truncation.
  assert.equal(full.bounded.returned_count, 3);
  assert.equal(full.bounded.truncated, false);
});

test('W2.2d closure: keyset paging is reachable through the canonical executor and covers the population exactly once', async () => {
  // Server-shaped mock mirroring the migration: honours p_limit/p_after_bid_id and returns total_count.
  const ALL = Array.from({ length: 12 }, (_, i) => ({
    bid_id: `b${String(i).padStart(2, '0')}`, method: 'רגיל', phrase: `p${i}`, value: 358,
    method_governed: true, atomic_or_composite: 'atomic', row_provenance_state: 'governed',
    engine_run_id: 'e', word_id: `w${i}`,
  }));
  const supabase = {
    rpc: async (name, args) => {
      if (name !== 'fn_number_lookup') return { data: null };
      let rows = ALL;
      if (args.p_after_bid_id) rows = rows.filter(r => r.bid_id > args.p_after_bid_id);
      rows = rows.slice(0, args.p_limit ?? rows.length).map(r => ({ ...r, total_count: ALL.length }));
      return { data: rows };
    },
  };
  const identityResolution = { identities: [{ type: 'number', value: 358, ref: '358' }] };
  const page = async afterBidId => closureExecutors({ supabase, lookupWindow: { limit: 5, afterBidId } })
    .numeric({ identityResolution });

  const p1 = await page(null);
  assert.equal(p1.bounded.window.transport, 'server_keyset');
  assert.equal(p1.bounded.total_count, 12);
  assert.equal(p1.bounded.returned_count, 5);
  assert.equal(p1.bounded.truncated, true);

  const p2 = await page(p1.bounded.continuation.after_bid_id);
  const p3 = await page(p2.bounded.continuation.after_bid_id);
  assert.equal(p3.bounded.returned_count, 2);
  assert.equal(p3.bounded.truncated, false);
  assert.equal(p3.bounded.source_exhaustive, true);

  // The whole population is covered exactly once — no skipped and no repeated row.
  const ids = [...p1.findings, ...p2.findings, ...p3.findings].map(f => f.identity.sourceIdentity.bidId);
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids).size, 12);
});
