// G2 2029 — bounded typed subject representations for shared Research OS capabilities.
//
// This is not a Name/Person/News/ELS engine. It preserves exact input strings and lineage so the
// canonical Gematria/ELS/Source capabilities can consume the SAME subjects without silent splitting,
// concatenation, spelling correction or duplicated personal engines.

import { stableIdentityDigest } from './researchRepresentations.js';
import { SELECTION_PROTOCOL } from './researchEvaluation.js';

export const REPRESENTATION_ROLE = Object.freeze({
  FULL_NAME: 'full_name',
  GIVEN_NAME_FIELD: 'given_name_field',
  FAMILY_NAME: 'family_name',
  NAME_PART: 'name_part',
  EXACT_EXPRESSION: 'exact_expression',
  SOURCE_EXPRESSION: 'source_expression',
  EVENT_EXPRESSION: 'event_expression',
});

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim().replace(/\s+/g, ' ');
  return text || null;
}

function detectLanguage(text) {
  if (!text) return null;
  if (/[א-ת]/.test(text)) return 'he';
  if (/[A-Za-z]/.test(text)) return 'en';
  return 'unknown';
}

function refFor(rootRef, role, index, text) {
  const root = clean(rootRef) || `input:${stableIdentityDigest(text || 'empty')}`;
  return `repr:${stableIdentityDigest(`${root}|${role}|${index}|${text || ''}`)}`;
}

function makeRepresentation({ rootRef, role, index = 0, text, parentRefs = [], sourceLineageRefs = [], personRef = null, locator = null, access = null, metadata = null } = {}) {
  const exact = clean(text);
  if (!exact) return null;
  const representationRef = refFor(rootRef, role, index, exact);
  return {
    v: 1,
    representation_ref: representationRef,
    root_input_ref: clean(rootRef),
    role,
    exact_text: exact,
    language: detectLanguage(exact),
    person_ref: clean(personRef),
    locator: locator ?? null,
    access: access ?? null,
    metadata: metadata ?? null,
    evidence_lineage: {
      relation: 'derivation',
      root_input_ref: clean(rootRef),
      representation_ref: representationRef,
      source_lineage_refs: [...new Set(sourceLineageRefs.map(clean).filter(Boolean))],
      parent_refs: [...new Set(parentRefs.map(clean).filter(Boolean))],
    },
  };
}

export function buildNameResearchRepresentations({ name, surname = null, rootInputRef = null, personRef = null, access = null } = {}) {
  const rawName = clean(name);
  const rawSurname = clean(surname);
  if (!rawName && !rawSurname) return [];
  const rootRef = clean(rootInputRef) || `name-input:${stableIdentityDigest([rawName, rawSurname].filter(Boolean).join('|'))}`;
  const out = [];

  const full = [rawName, rawSurname].filter(Boolean).join(' ');
  const fullRep = makeRepresentation({ rootRef, role: REPRESENTATION_ROLE.FULL_NAME, text: full, personRef, access });
  if (fullRep) out.push(fullRep);

  if (rawName) {
    const givenField = makeRepresentation({ rootRef, role: REPRESENTATION_ROLE.GIVEN_NAME_FIELD, text: rawName, personRef, access, parentRefs: fullRep ? [fullRep.representation_ref] : [] });
    if (givenField && givenField.exact_text !== fullRep?.exact_text) out.push(givenField);
    const parts = rawName.split(/\s+/).filter(Boolean);
    parts.forEach((part, index) => {
      const rep = makeRepresentation({
        rootRef,
        role: REPRESENTATION_ROLE.NAME_PART,
        index,
        text: part,
        personRef,
        access,
        parentRefs: givenField ? [givenField.representation_ref] : fullRep ? [fullRep.representation_ref] : [],
        metadata: { ordinal: index + 1, declared_role: null },
      });
      if (rep) out.push(rep);
    });
  }

  if (rawSurname) {
    const family = makeRepresentation({
      rootRef,
      role: REPRESENTATION_ROLE.FAMILY_NAME,
      text: rawSurname,
      personRef,
      access,
      parentRefs: fullRep ? [fullRep.representation_ref] : [],
      metadata: { declared_role: 'family_name' },
    });
    if (family && !out.some(x => x.representation_ref === family.representation_ref)) out.push(family);
  }

  // Do not invent surname/given-name roles from whitespace. Only the explicit surname field is typed
  // as family_name; unnamed parts remain ordered NAME_PART representations.
  return out.filter((item, index, list) => list.findIndex(x => x.role === item.role && x.exact_text === item.exact_text) === index);
}

export function buildSourceExpressionRepresentations({ sourceRef, expressions = [], rootInputRef = null, access = null, maxExpressions = 32 } = {}) {
  const source = clean(sourceRef);
  const rootRef = clean(rootInputRef) || (source ? `source-input:${stableIdentityDigest(source)}` : null);
  const out = [];
  for (const [index, raw] of (Array.isArray(expressions) ? expressions : []).slice(0, Math.max(0, maxExpressions)).entries()) {
    const item = typeof raw === 'string' ? { text: raw } : raw || {};
    const rep = makeRepresentation({
      rootRef,
      role: item.role || REPRESENTATION_ROLE.SOURCE_EXPRESSION,
      index,
      text: item.text ?? item.expression,
      sourceLineageRefs: source ? [source] : [],
      locator: item.locator ?? null,
      access,
      metadata: item.metadata ?? null,
    });
    if (rep) out.push(rep);
  }
  return out.filter((item, index, list) => list.findIndex(x => x.exact_text === item.exact_text && x.locator === item.locator) === index);
}

export function prepareElsSubjectRequests(representations = [], {
  maxSubjects = 8,
  maxSkip = 40,
  maxHits = 16,
  selectionProtocol = SELECTION_PROTOCOL.UNKNOWN,
  reason = null,
} = {}) {
  const requests = [];
  const skipped = [];
  for (const rep of Array.isArray(representations) ? representations : []) {
    if (requests.length >= maxSubjects) {
      skipped.push({ representation_ref: rep?.representation_ref || null, reason: 'subject_budget_exhausted' });
      continue;
    }
    const text = clean(rep?.exact_text);
    const letters = text ? Array.from(text.replace(/[^א-ת]/g, '')).length : 0;
    if (rep?.language !== 'he' || letters < 3) {
      skipped.push({ representation_ref: rep?.representation_ref || null, reason: rep?.language !== 'he' ? 'els_corpus_language_not_supported' : 'too_short_high_base_rate' });
      continue;
    }
    requests.push({
      capability: 'els',
      subject_ref: rep.representation_ref,
      expression: text,
      language: rep.language,
      evidence_lineage: rep.evidence_lineage,
      access: rep.access ?? null,
      selection: {
        protocol: selectionProtocol,
        target_ref: rep.representation_ref,
        provenance_ref: rep.root_input_ref,
        fixed_before_inspection: selectionProtocol === SELECTION_PROTOCOL.PRE_REGISTERED_TARGET ? true : null,
        reason,
      },
      budget: { max_skip: maxSkip, max_hits: maxHits },
      canonical_engine_required: true,
      execution_authorized: false,
    });
  }
  return {
    contract_version: 1,
    canonical_owner: 'els_research_layer_law',
    requests,
    skipped,
    bounded: { requested: (Array.isArray(representations) ? representations.length : 0), admitted: requests.length, max_subjects: maxSubjects },
    invariant: 'request envelope only; canonical callable ELS core must execute it',
  };
}

export default buildNameResearchRepresentations;
