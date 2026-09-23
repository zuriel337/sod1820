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

function extractInternalLinks(body) {
  const text = String(body || '');
  return Array.from(new Set(text.match(INTERNAL_LINK_RE) || []));
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

// contribution: { id, body, parent_id }
export function classifyContribution(contribution) {
  const body = contribution?.body || '';
  const isReply = Boolean(contribution?.parent_id);
  const labels = isReply ? [REPLY_LABEL] : multiLabel(body);
  const numbers = extractNumbers(body);
  const sources = extractSources(body);
  const internalLinks = extractInternalLinks(body);
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
    },
    ai_model: aiModel,
    ai_score: 1 - classification.uncertainty,
    ai_reasoning: `heuristic multi-label + regex extraction; uncertainty=${classification.uncertainty}`,
    status: 'pending',
    human_decision: null,
  };
}
