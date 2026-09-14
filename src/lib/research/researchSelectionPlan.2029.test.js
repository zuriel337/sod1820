import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResearchPlanV2 } from './researchPlanV2.js';
import { composeResearchW2 } from './researchComposerW2.js';
import { createGematriaW2Executor } from './gematriaW2Executor.js';
import { SELECTION_PROTOCOL } from './researchEvaluation.js';

const emptyResolution = { identities: [], text_calculation_allowed: true };

test('Research Plan always exposes an honest selection protocol class', () => {
  const unknown = buildResearchPlanV2({ identityResolution: emptyResolution });
  assert.equal(unknown.selection_protocol, SELECTION_PROTOCOL.UNKNOWN);

  const preregistered = buildResearchPlanV2({
    identityResolution: emptyResolution,
    selectionProtocol: SELECTION_PROTOCOL.PRE_REGISTERED_TARGET,
  });
  assert.equal(preregistered.selection_protocol, SELECTION_PROTOCOL.PRE_REGISTERED_TARGET);
  assert.equal(preregistered.guards.selection_provenance_protocol_declared, true);
});

test('Research Plan refuses invented selection protocol vocabulary', () => {
  assert.throws(() => buildResearchPlanV2({
    identityResolution: emptyResolution,
    selectionProtocol: 'picked_after_it_looked_good',
  }), /invalid selection protocol/);
});

test('Composer passes the safe selection protocol to capability executors without exposing private refs', async () => {
  let received = null;
  const bundle = await composeResearchW2({
    question: 'fixture',
    requestedCapabilities: ['future:selection'],
    selectionProtocol: SELECTION_PROTOCOL.SOURCE_CLAIM_REPLAY,
    executors: {
      'future:selection': async ({ plan, selectionProtocol }) => {
        received = { plan: plan.selection_protocol, direct: selectionProtocol };
        return { owner: 'future_owner', status: 'executed', findings: [] };
      },
    },
  });

  assert.deepEqual(received, {
    plan: SELECTION_PROTOCOL.SOURCE_CLAIM_REPLAY,
    direct: SELECTION_PROTOCOL.SOURCE_CLAIM_REPLAY,
  });
  assert.equal(bundle.plan.selection_protocol, SELECTION_PROTOCOL.SOURCE_CLAIM_REPLAY);
  assert.equal(bundle.resolved_run_snapshot.selection_protocol, SELECTION_PROTOCOL.SOURCE_CLAIM_REPLAY);
});

test('Gematria evaluation consumes Research Plan selection protocol instead of defaulting to unknown', async () => {
  const supabase = {
    async rpc(name, args) {
      if (name === 'gematria_api') {
        return { data: { input: args.p_text, value: 358, methods: { ragil: 358 } } };
      }
      return { data: null };
    },
  };
  const executor = createGematriaW2Executor({ supabase, controls: false });
  const result = await executor({
    identityResolution: {
      identities: [{ type: 'phrase', key: 'phrase:fixture', label: 'משיח', access: { tier: 'public' } }],
      text_calculation_allowed: true,
    },
    plan: { selection_protocol: SELECTION_PROTOCOL.POST_HOC_EXPLORATORY },
  });

  assert.equal(result.researchEvaluation.selection.protocol, SELECTION_PROTOCOL.POST_HOC_EXPLORATORY);
  assert.equal(result.researchEvaluation.selection.fixed_before_inspection, false);
});
