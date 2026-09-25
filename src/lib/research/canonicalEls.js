import { makeUniversalFinding } from './universalFinding.js';

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function direction(hit) {
  if (hit?.direction === 'back' || Number(hit?.dir) === -1) return 'back';
  return 'fwd';
}

function occurrenceId(result, hit) {
  return clean(hit?.occurrence_id)
    || `els:${clean(result?.corpus_id) || 'unknown'}:${clean(result?.input?.normalized) || ''}:${Number(hit?.skip) || 0}:${Number(hit?.dir) || 1}:${Number(hit?.start) || 0}`;
}

/**
 * Project the canonical callable ELS result into existing Universal Finding v1 envelopes.
 * This adapter never searches, ranks, canonicalizes or publishes. The DB ELS core owns execution;
 * Truth/Human-Gate owners own later semantic/governance transitions.
 */
export function elsSearchResultToFindings(result, {
  inputRef = null,
  accessTier = 'public',
} = {}) {
  if (!result || result.contract !== 'els_search_result_v1' || result.status !== 'OK') return [];
  const term = clean(result?.input?.normalized);
  const corpusId = clean(result?.corpus_id);
  if (!term || !corpusId) return [];

  const engineVersion = result?.engine?.version ?? 1;
  const dependencyGroup = clean(result?.dependency_group);
  return (Array.isArray(result.hits) ? result.hits : []).map(hit => {
    const id = occurrenceId(result, hit);
    const dir = direction(hit);
    const positions = Array.isArray(hit?.positions) ? hit.positions.map(Number).filter(Number.isFinite) : [];
    const skip = Number(hit?.skip);
    const start = Number(hit?.start);
    const end = Number(hit?.end);

    return makeUniversalFinding({
      id,
      kind: 'els',
      // An ELS engine occurrence is a calculation/search result. It is deliberately not assigned
      // an epistemic stage by this projection adapter (Universal Finding PR1/PR3).
      subject: { type: 'phrase', key: term, label: term, lang: 'he' },
      source: {
        engine: 'els-sql-core',
        adapter: 'els-callable-v1',
        sourceRef: `corpus:${corpusId}`,
        method: 'equidistant-letter-sequence',
        corpus: result.scope || 'torah',
        lang: 'he',
      },
      identity: {
        sourceIdentity: id,
        occurrence: {
          skip,
          direction: dir,
          dir: dir === 'back' ? -1 : 1,
          start,
          end,
          positions,
          coordinate_convention: result?.coordinate?.position_base === 0
            ? 'zero_based_character_index'
            : clean(hit?.coordinate_convention),
        },
      },
      verification: {
        claimed_expression: null,
        claimed_method: null,
        claimed_value: null,
        engine_method_tested: 'els_search_core_v1',
        engine_result: {
          occurrence_id: id,
          corpus_id: corpusId,
          scope: result.scope || 'torah',
          skip,
          direction: dir,
          start,
          end,
          engine_version: engineVersion,
        },
        // The engine found an occurrence. There was no source claim to MATCH/MISMATCH.
        verification_state: 'not_tested',
      },
      evidence: {
        refs: [id],
        facts: [{
          type: 'els-occurrence',
          corpus_id: corpusId,
          scope: result.scope || 'torah',
          skip,
          direction: dir,
          start,
          end,
          dependency_group: clean(hit?.dependency_group) || dependencyGroup,
        }],
      },
      access: {
        tier: clean(accessTier) || 'public',
        reason: accessTier && accessTier !== 'public'
          ? 'inherited from the source research representation'
          : 'bounded callable ELS execution over the public canonical Torah corpus',
      },
      provenance: {
        createdBy: 'ENGINE:els-sql-core',
        inputRef: clean(inputRef),
        parentFindingIds: [],
      },
      projection: {
        anchors: positions.map(i => ({ space: 'canonical_corpus_character_index', i })),
        dimensions: {
          els: {
            corpus_id: corpusId,
            scope: result.scope || 'torah',
            engine_version: engineVersion,
            selection_protocol: result.selection_protocol ?? null,
            dependency_group: clean(hit?.dependency_group) || dependencyGroup,
            search: result.search || null,
          },
        },
      },
    });
  });
}

export function elsSearchOutcome(result) {
  const status = clean(result?.status);
  if (status === 'OK') return 'executed';
  if (status === 'EXECUTED_EMPTY') return 'negative_result';
  if (status === 'MISSING_ADAPTER') return 'missing_adapter';
  if (status === 'CONTEXT_REQUIRED' || status === 'CORPUS_UNKNOWN') return 'context_required';
  return 'failed';
}

export default elsSearchResultToFindings;
