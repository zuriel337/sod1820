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
//                      entry. This is a prefilter signal only; it must never by itself set
//                      index_eligible.
//   index_eligible  — final decision. Requires an actual reconstructable structured research
//                      unit, not just a keyword hit: an explicit numeric/gematria relation with
//                      an operand, a cipher/method/ELS mention with an identifiable input, or a
//                      source/verse/entity reference paired with an authored interpretive
//                      connection. The corpus rehearsal found the keyword-alone heuristic
//                      over-indexed heavily on this last case (2196 of 2317 verse/entity-reason
//                      rows had no other corroborating signal) — sole entity mention is no
//                      longer sufficient on its own.
//
// Internal links (/number/, /entity/, /person/, /world/, /topic/) count as an entity reference
// only when validated as actually internal (a bare relative path, or a full URL whose host is
// sod1820.co.il) — an external URL that merely happens to contain the same path segment (e.g.
// a news site's own /world/... section) never counts.
const GEMATRIA_RELATION_RE = /גימטריה|גימטרי|גימ[׳']/;
const CIPHER_OR_METHOD_RE = /אתב["׳]?ש|צופן|קפיצ(?:ת|ות)\s*אותיות|ראשי\s*תיבות|סופי\s*תיבות|נוטריקון|\bELS\b/i;
// A calculable operand for a gematria/numeric relation. Deliberately evaluated only against
// text with URLs stripped out first — query params, article IDs, and video timecodes are not
// research evidence (see stripSources below).
const NUMERIC_OPERAND_RE = /\d{1,6}/;
// An identifiable input the cipher/method/ELS operation is applied to (a word, verse, name, or
// phrase named in the same sentence) — the mere name of a method with nothing it operates on is
// bibliographic/vocabulary chatter, not a reconstructable application.
const METHOD_INPUT_INDICATOR_RE = /במיל(?:ה|ים)|בפסוק|בפרק|באות(?:יות)?|בשם|בביטוי|בטקסט|בשורה|במשפט/;
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

// URL query params, article IDs, and video timecodes read as digits but are never a numeric-
// relation operand. Only used for the eligibility numeric-operand check — the general
// `extraction.numbers` field intentionally keeps matching the existing chat_search_facts
// number-extraction convention (see the extractNumbers test coverage).
function stripSources(text) {
  const stripped = text.replace(SOURCE_RE, ' ');
  SOURCE_RE.lastIndex = 0;
  return stripped;
}

// Candidate-only index eligibility decision (never publication/canonical). Mere number, mere
// URL, video-only/link-only content, and social chat/reaction/small talk never qualify on
// their own; a reconstructable structured research unit does:
//   (a) an explicit numeric/gematria relation — the gematria keyword plus an actual operand;
//   (b) a canonical method/cipher/ELS application with an identifiable input;
//   (c) a source-text/verse/name/entity relation plus an authored interpretive connection.
// Default is always false; anything short of one of these stays candidate-only/chronology-only.
function evaluateIndexEligibility(body, internalLinks) {
  const text = String(body || '');
  const hasGematriaKeyword = GEMATRIA_RELATION_RE.test(text);
  const hasCipherOrMethodKeyword = CIPHER_OR_METHOD_RE.test(text);
  const hasVerseOrEntityKeyword = VERSE_OR_ENTITY_KEYWORD_RE.test(text);
  const hasInternalEntityLink = internalLinks.length > 0;
  const hasInterpretiveConnection = INTERPRETIVE_CONNECTION_RE.test(text);

  // Tier 1 — cheap heuristic prefilter. Any single keyword hit is a candidate signal only; it
  // must never directly set index_eligible.
  const candidateReasons = [];
  if (hasGematriaKeyword) candidateReasons.push('gematria_relation');
  if (hasCipherOrMethodKeyword) candidateReasons.push('cipher_or_method_operation');
  if (hasVerseOrEntityKeyword) candidateReasons.push('verse_or_entity_reference');
  if (hasInternalEntityLink) candidateReasons.push('internal_entity_reference');
  if (hasInterpretiveConnection) candidateReasons.push('interpretive_connection');

  // Tier 2 — final eligibility. Requires a reconstructable structured unit, not a bare keyword.
  const reasons = [];

  const hasNumericOperand = NUMERIC_OPERAND_RE.test(stripSources(text));
  if (hasGematriaKeyword && hasNumericOperand) reasons.push('gematria_relation');

  const hasIdentifiableInput = METHOD_INPUT_INDICATOR_RE.test(text);
  if (hasCipherOrMethodKeyword && hasIdentifiableInput) reasons.push('cipher_or_method_operation');

  if ((hasVerseOrEntityKeyword || hasInternalEntityLink) && hasInterpretiveConnection) {
    if (hasVerseOrEntityKeyword) reasons.push('verse_or_entity_reference');
    if (hasInternalEntityLink) reasons.push('internal_entity_reference');
    reasons.push('interpretive_connection');
  }

  return {
    eligible: reasons.length > 0,
    reasons,
    scan_candidate: candidateReasons.length > 0,
    candidate_reasons: candidateReasons,
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
    index_eligibility: evaluateIndexEligibility(body, internalLinks),
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
    },
    ai_model: aiModel,
    ai_score: 1 - classification.uncertainty,
    ai_reasoning: `heuristic multi-label + regex extraction; uncertainty=${classification.uncertainty}`,
    status: 'pending',
    human_decision: null,
  };
}
