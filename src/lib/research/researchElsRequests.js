import { SELECTION_PROTOCOL } from './researchEvaluation.js';

// Adapter seam only. Canonical text/name representations stay owned by researchRepresentations.js.
// This module turns those EXISTING exact representations into bounded private-path ELS requests.

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}
function uniq(values) { return [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))]; }
function languageOf(text) {
  if (!text) return null;
  if (/[א-ת]/u.test(text)) return 'he';
  if (/[A-Za-z]/.test(text)) return 'en';
  return 'unknown';
}

export function evidenceLineageForRepresentation(rep, {
  rootInputRef = null,
  sourceLineageRefs = [],
  occurrenceRef = null,
  windowRef = null,
  parentRefs = [],
} = {}) {
  const representationRef = clean(rep?.ref ?? rep?.representation_ref);
  if (!representationRef) throw new TypeError('researchElsRequests: representation ref is required');
  return {
    relation: rep?.primary_for_identity === true ? 'unknown' : 'derivation',
    root_input_ref: clean(rootInputRef) || clean(rep?.parent_identity_key),
    representation_ref: representationRef,
    occurrence_ref: clean(occurrenceRef),
    window_ref: clean(windowRef),
    artifact_refs: [],
    source_lineage_refs: uniq(sourceLineageRefs),
    parent_refs: uniq(parentRefs),
  };
}

export function prepareElsSubjectRequests(representations = [], {
  maxSubjects = 8,
  maxSkip = 40,
  maxHits = 16,
  selectionProtocol = SELECTION_PROTOCOL.UNKNOWN,
  reason = null,
  rootInputRef = null,
  sourceLineageRefs = [],
  lineagesByRef = null,
} = {}) {
  const cap = Math.max(1, Math.min(Number(maxSubjects) || 8, 32));
  const skip = Math.max(2, Math.min(Number(maxSkip) || 40, 100000));
  const hits = Math.max(1, Math.min(Number(maxHits) || 16, 100));
  const requests = [], skipped = [];
  const list = Array.isArray(representations) ? representations : [];

  // Same canonical representation tree used by Gematria: every non-primary name/phrase part keeps
  // a parent ref to the exact primary/full representation of the same resolved identity. This makes
  // full-name vs part searches provably dependent without pretending that every search sharing the
  // same subject is dependent on every other source/engine result.
  const primaryByParent = new Map();
  for (const rep of list) {
    if (rep?.primary_for_identity === true && clean(rep?.parent_identity_key) && clean(rep?.ref)) {
      primaryByParent.set(clean(rep.parent_identity_key), clean(rep.ref));
    }
  }

  for (const rep of list) {
    const ref = clean(rep?.ref ?? rep?.representation_ref);
    if (requests.length >= cap) {
      skipped.push({ representation_ref: ref, reason: 'subject_budget_exhausted' });
      continue;
    }
    const expression = clean(rep?.text ?? rep?.exact_text);
    const language = clean(rep?.language) || languageOf(expression);
    const hebrewLetters = expression ? Array.from(expression.replace(/[^א-ת]/gu, '')).length : 0;
    if (language !== 'he' || hebrewLetters < 3) {
      skipped.push({ representation_ref: ref, reason: language !== 'he' ? 'els_corpus_language_not_supported' : 'too_short_high_base_rate' });
      continue;
    }
    const explicitLineage = lineagesByRef && ref ? lineagesByRef[ref] : null;
    const primaryRef = primaryByParent.get(clean(rep?.parent_identity_key));
    const derivedParentRefs = rep?.primary_for_identity === true || !primaryRef || primaryRef === ref ? [] : [primaryRef];
    const evidenceLineage = explicitLineage || evidenceLineageForRepresentation(rep, {
      rootInputRef,
      sourceLineageRefs,
      parentRefs: derivedParentRefs,
    });
    requests.push({
      contract_version: 1,
      capability: 'els',
      subject_ref: ref,
      expression,
      language,
      evidence_lineage: evidenceLineage,
      access: { tier: clean(rep?.access_tier) || clean(rep?.access?.tier) || null },
      selection: {
        protocol: selectionProtocol,
        target_ref: ref,
        provenance_ref: evidenceLineage.root_input_ref,
        fixed_before_inspection: selectionProtocol === SELECTION_PROTOCOL.PRE_REGISTERED_TARGET ? true : null,
        reason: clean(reason),
      },
      budget: { max_skip: skip, max_hits: hits },
      canonical_engine_required: true,
      // Human/access/core resolution happens later on the PRIVATE execution path.
      execution_authorized: false,
    });
  }

  return {
    contract_version: 1,
    canonical_owner: 'els_research_layer_law',
    requests,
    skipped,
    bounded: { requested: list.length, admitted: requests.length, max_subjects: cap },
    invariant: 'request envelope only; one canonical callable ELS core must execute it',
  };
}

export default prepareElsSubjectRequests;
