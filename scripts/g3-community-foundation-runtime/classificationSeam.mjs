// G3 Community Core 2029 Phase 2 — AI classification/extraction seam, pure logic (no DB
// connection, no writes). Owner: research_contribution_law v9 (content) + truth_axes_
// foundation_law v3. Extends Phase 1's single-label `classifyIntent` stub into a multi-label
// seam with entity/number/source extraction and an explicit uncertainty score, shaped as a
// `decision_ledger` candidate row (existing table/owner — no new metadata store).
//
// Hard boundary (truth_axes_foundation_law v3 / Human Gate): this module only proposes.
// It never sets `research_contributions.status`, never writes `decision_ledger.human_decision`,
// and never ranks by popularity. `toDecisionLedgerCandidate` always emits status:'pending'.

const NUMBER_RE = /\d{2,6}/g;
const SOURCE_RE = /https?:\/\/\S+/g;
const INTERNAL_LINK_RE = /\/(?:number|topic|entity|world|person)\/[\w-]+/gi;
const REPLY_LABEL = 'תגובה';

// Search Index Gate (task_key=G3_COMMUNITY_CORE_PR636_SEARCH_INDEX_GATE_V1, calibrated under
// task_key=G3_COMMUNITY_CORE_PR636_SEARCH_INDEX_CORPUS_CALIBRATION_V1 against the real
// 41,080-row OpenWeb corpus). These signals are deliberately separate from `multiLabel`'s
// tagging regexes above. A bare number or a bare URL is enough to *label* a message
// ('גימטריה'/'מקור') for ordinary display, but is never by itself enough to make it index/
// search/Raziel-retrieval eligible.
//
// Two tiers, never conflated:
//   scan_candidate  — cheap regex prefilter. Any single keyword hit tags a `candidate_reasons`
//                      entry. This is a prefilter signal only; raw text can never by itself set
//                      index_eligible, no matter how many keywords co-occur.
//   index_eligible  — final decision. Requires an actual structured evidence unit supplied via
//                      `contribution.evidence.units[]` (typed `numeric_relation` /
//                      `method_application` / `source_interpretation` / `structured_claim`, each
//                      with the reconstructable fields its kind needs — see
//                      `evaluateStructuredEvidence`/`STRUCTURED_UNIT_VALIDATORS` below). A second
//                      corpus rehearsal, after the keyword+corroboration calibration below, still
//                      found 234 of 2,324 scan candidates resolving `index_eligible=true` off
//                      regex alone, several still discussion/rejection of gematria rather than an
//                      actual claim — regex over raw text cannot bind an operand, pair a method
//                      with its input, or tell an assertion from a question, so it was demoted to
//                      scan_candidate-only and structured evidence became the sole final-eligibility
//                      input.
//
// Internal links (/number/, /entity/, /person/, /world/, /topic/) count as an entity reference
// only when validated as actually internal (a bare relative path, or a full URL whose host is
// sod1820.co.il) — an external URL that merely happens to contain the same path segment (e.g.
// a news site's own /world/... section) never counts.
const GEMATRIA_RELATION_RE = /גימטריה|גימטרי|גימ[׳']/;
const CIPHER_OR_METHOD_RE = /אתב["׳]?ש|צופן|קפיצ(?:ת|ות)\s*אותיות|ראשי\s*תיבות|סופי\s*תיבות|נוטריקון|\bELS\b/i;
// Hebrew has no \w-based word boundary (JS's \b never fires between two Hebrew letters), so a
// bare substring match of a book/entity name bleeds into unrelated words that merely contain it
// (e.g. plain "השמות" — "the names" — false-matching the book שמות/Exodus). Each keyword below
// is wrapped in a manual Hebrew-letter lookaround boundary instead.
const HEBREW_LETTERS = 'א-ת';
function hebrewBounded(word) {
  return `(?<![${HEBREW_LETTERS}])${word}(?![${HEBREW_LETTERS}])`;
}
const VERSE_OR_ENTITY_KEYWORD_RE = new RegExp(
  ['פרק', 'פסוק', 'בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים', 'תהלים', 'משלי', 'ישעיהו', 'ירמיהו', 'יחזקאל']
    .map(hebrewBounded)
    .join('|')
);
const INTERPRETIVE_CONNECTION_RE = /מרמז|רמז\s*ל|מסמל|מקביל\s*ל|מבטא\s*את|מכוון\s*ל|קשור\s*ל/;

// Final structured-gate calibration (task_key=
// G3_COMMUNITY_CORE_PR636_SEARCH_INDEX_FINAL_STRUCTURED_GATE_V1): the corpus rehearsal after
// the previous (keyword+corroboration) calibration still left 234 of 2,324 scan candidates
// resolving `index_eligible=true` off raw-text regex alone, and several of those 234 still
// turned out to be discussion/rejection of gematria or an unrelated number sitting next to a
// keyword — regex over text can flag a *candidate*, but it can never itself reconstruct a real
// research unit (it has no operand binding, no method/input pairing, no way to tell an assertion
// from a question or a rejection). So regex output is now hard-capped at `scan_candidate` +
// `candidate_reasons`; it is never read as eligibility again, by this function or any caller.
//
// Tier 1 — cheap heuristic prefilter. Any single keyword hit tags a candidate_reasons entry.
// This is a prefilter signal only; it must never by itself set index_eligible.
function evaluateScanCandidate(body, internalLinks) {
  const text = String(body || '');
  const hasGematriaKeyword = GEMATRIA_RELATION_RE.test(text);
  const hasCipherOrMethodKeyword = CIPHER_OR_METHOD_RE.test(text);
  const hasVerseOrEntityKeyword = VERSE_OR_ENTITY_KEYWORD_RE.test(text);
  const hasInternalEntityLink = internalLinks.length > 0;
  const hasInterpretiveConnection = INTERPRETIVE_CONNECTION_RE.test(text);

  const candidateReasons = [];
  if (hasGematriaKeyword) candidateReasons.push('gematria_relation');
  if (hasCipherOrMethodKeyword) candidateReasons.push('cipher_or_method_operation');
  if (hasVerseOrEntityKeyword) candidateReasons.push('verse_or_entity_reference');
  if (hasInternalEntityLink) candidateReasons.push('internal_entity_reference');
  if (hasInterpretiveConnection) candidateReasons.push('interpretive_connection');

  return {
    scan_candidate: candidateReasons.length > 0,
    candidate_reasons: candidateReasons,
  };
}

// Tier 2 — final eligibility. A structured evidence input contract, sitting on top of the
// existing derived/classification metadata (decision_ledger candidate / Research Intake), not a
// new store: `evidence.units[]`, each `{ kind, ...fields }`. A unit is reconstructable only when
// it carries the fields its kind needs to rebuild the actual claim, never a bare keyword hit:
//   numeric_relation      — operands (non-empty) + relation or method (a gematria/numeric claim
//                            with nothing to compute over is not reconstructable).
//   method_application    — method + input (the method name alone, with nothing it operates on,
//                            is vocabulary/bibliographic chatter, not an application).
//   source_interpretation — reference (source/verse/entity) + interpretation (an authored
//                            connection, not just a citation).
//   structured_claim      — subject + predicate + evidence + reference, all explicit.
// Raw regex/heuristic output (scan_candidate/candidate_reasons) is never itself a unit and is
// never accepted here — only an actual evidence.units[] entry can satisfy a kind.
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isNonEmptyArray(v) {
  return Array.isArray(v) && v.length > 0;
}

const STRUCTURED_UNIT_VALIDATORS = {
  numeric_relation: (unit) =>
    isNonEmptyArray(unit.operands) && (isNonEmptyString(unit.relation) || isNonEmptyString(unit.method)),
  method_application: (unit) => isNonEmptyString(unit.method) && isNonEmptyString(unit.input),
  source_interpretation: (unit) => isNonEmptyString(unit.reference) && isNonEmptyString(unit.interpretation),
  structured_claim: (unit) =>
    isNonEmptyString(unit.subject) &&
    isNonEmptyString(unit.predicate) &&
    isNonEmptyString(unit.evidence) &&
    isNonEmptyString(unit.reference),
};

function evaluateStructuredEvidence(units) {
  const list = Array.isArray(units) ? units : [];
  const reasons = [];
  for (const unit of list) {
    const kind = unit && unit.kind;
    const validator = STRUCTURED_UNIT_VALIDATORS[kind];
    if (validator && validator(unit) && !reasons.includes(kind)) reasons.push(kind);
  }
  return {
    eligible: reasons.length > 0,
    reasons,
  };
}

// One message can carry more than one role at once (a question that also cites a number and
// a source) — real community text usually does, and the old single-label stub silently forced
// a false choice; that's the actual gap this seam closes over Phase 1.
function multiLabel(body) {
  const text = String(body || '');
  const labels = new Set();
  if (/\?\s*$/.test(text.trim())) labels.add('שאלה');
  if (SOURCE_RE.test(text)) labels.add('מקור');
  SOURCE_RE.lastIndex = 0;
  if (NUMBER_RE.test(text)) labels.add('גימטריה');
  NUMBER_RE.lastIndex = 0;
  if (labels.size === 0) labels.add('שיתוף');
  return Array.from(labels);
}

function extractNumbers(body) {
  const text = String(body || '');
  const found = text.match(NUMBER_RE) || [];
  return Array.from(new Set(found.map((n) => Number(n))));
}

function extractSources(body) {
  const text = String(body || '');
  return Array.from(new Set(text.match(SOURCE_RE) || []));
}

// Only a bare relative path, or a full URL whose host is sod1820.co.il, is an internal
// reference. A path segment that merely happens to match (an external news site's own
// /world/... section, a /person/... profile page on another domain) never counts — full URLs
// on any other host are stripped down to nothing before matching, so their path text can never
// bleed into this signal.
function extractInternalLinks(body) {
  const text = String(body || '');
  const withoutExternalHosts = text.replace(SOURCE_RE, (url) => {
    try {
      const { hostname, pathname } = new URL(url);
      return hostname.replace(/^www\./i, '').toLowerCase() === 'sod1820.co.il' ? pathname : '';
    } catch {
      return '';
    }
  });
  SOURCE_RE.lastIndex = 0;
  return Array.from(new Set(withoutExternalHosts.match(INTERNAL_LINK_RE) || []));
}

// Uncertainty is a plain heuristic (short text / no extractable signal → higher uncertainty),
// not a calculation — any calculable claim (a gematria value) is a handoff pointer for the
// canonical engine, never computed or verified by this seam itself.
function uncertaintyOf(body, numbers) {
  const text = String(body || '').trim();
  if (text.length < 8) return 0.9;
  if (numbers.length === 0 && !SOURCE_RE.test(text)) return 0.6;
  SOURCE_RE.lastIndex = 0;
  return 0.25;
}

// contribution: { id, body, parent_id, evidence?: { units: [{ kind, ...fields }] } }
// `evidence.units` is optional structured input from the existing Research Intake/
// classification seam (e.g. a later bounded classification/extraction pass, never this
// function's own regex output) — its absence simply means no structured unit exists yet, so
// index_eligible defaults false, same as any not-yet-classified contribution.
export function classifyContribution(contribution) {
  const body = contribution?.body || '';
  const isReply = Boolean(contribution?.parent_id);
  const labels = isReply ? [REPLY_LABEL] : multiLabel(body);
  const numbers = extractNumbers(body);
  const sources = extractSources(body);
  const internalLinks = extractInternalLinks(body);
  const scanCandidate = evaluateScanCandidate(body, internalLinks);
  const evidenceUnits = Array.isArray(contribution?.evidence?.units) ? contribution.evidence.units : [];
  const structuredEvidence = evaluateStructuredEvidence(evidenceUnits);
  return {
    contribution_id: contribution?.id ?? null,
    labels,
    extraction: {
      numbers,
      sources,
      internal_links: internalLinks,
      // A calculable claim never gets a value here — that is a handoff, not a computation.
      canonical_engine_handoff: numbers.length > 0 ? { engine: 'number_dossier', numbers } : null,
    },
    uncertainty: uncertaintyOf(body, numbers),
    // eligible/reasons come exclusively from structured evidence units — raw-text regex can
    // only ever populate scan_candidate/candidate_reasons, never eligibility itself.
    index_eligibility: {
      eligible: structuredEvidence.eligible,
      reasons: structuredEvidence.reasons,
      scan_candidate: scanCandidate.scan_candidate,
      candidate_reasons: scanCandidate.candidate_reasons,
      // Carried through so the decision_ledger candidate stays reconstructable: which exact
      // structured unit(s) backed the eligibility decision, not just the resulting boolean.
      evidence_units: evidenceUnits,
    },
  };
}

// Maps a classification to the shape decision_ledger already carries (candidate/ai_model/
// ai_score/ai_reasoning/status) — reuses the existing owner table, adds no column, no new
// store. Never returns a row with human_decision or status other than 'pending': publication/
// canonicalization stays exclusively a later, explicit Human Gate action.
export function toDecisionLedgerCandidate(classification, { aiModel = 'community-classification-seam-v1' } = {}) {
  return {
    decision_type: 'community_contribution_classification',
    subject_type: 'research_contribution',
    subject_ref: classification.contribution_id,
    domain: 'community_core_2029',
    candidate: {
      labels: classification.labels,
      extraction: classification.extraction,
      // Search Index Gate: candidate-only eligibility decision. Never alters publication/
      // canonical/fact status — only whether community_search_facts/Raziel research retrieval
      // may surface this contribution's text. Ordinary chronological reading is unaffected.
      // community_search_facts/Raziel gate exclusively on index_eligible; scan_candidate is
      // carried for downstream calibration/audit visibility only, never as a retrieval gate.
      index_eligible: classification.index_eligibility.eligible,
      index_eligibility_reasons: classification.index_eligibility.reasons,
      scan_candidate: classification.index_eligibility.scan_candidate,
      scan_candidate_reasons: classification.index_eligibility.candidate_reasons,
      // Structured evidence units backing index_eligible (empty when not yet supplied) — kept
      // inside this existing decision_ledger candidate payload, no new table/store.
      index_eligibility_evidence_units: classification.index_eligibility.evidence_units,
    },
    ai_model: aiModel,
    ai_score: 1 - classification.uncertainty,
    ai_reasoning: `heuristic multi-label + regex extraction; uncertainty=${classification.uncertainty}`,
    status: 'pending',
    human_decision: null,
  };
}
