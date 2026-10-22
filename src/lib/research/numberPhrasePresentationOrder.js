import { makeUniversalFinding } from "./universalFinding.js";
import { isRegularMethodIdentity } from "./methodIdentity.js";

// One existing Human-Gate authority for equal-Regular phrase prominence.
//
// LeadOrderEditor writes public.gematria_words.lead_rank. Legacy and Number 2029 already read that
// field. This adapter lets the canonical Result Bundle consume the same rows; it never creates a
// second hierarchy, ranks methods, recalculates Gematria or changes the source row.
export const NUMBER_PHRASE_PRESENTATION_AUTHORITY = Object.freeze({
  table: "public.gematria_words",
  field: "lead_rank",
  ref: "public.gematria_words.lead_rank",
  scope: "equal_regular_phrase_prominence",
  method: "רגיל",
  version: 1,
});

export const NUMBER_PHRASE_PRESENTATION_LIMIT = 24;

const clean = (value) => value == null ? "" : String(value).trim();

function safeNumber(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function safeRank(value) {
  const rank = Number(value);
  return Number.isSafeInteger(rank) && rank > 0 ? rank : null;
}

function orderedLeadRows(rows, number) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : [])
    .map((row, sourceIndex) => ({ row, sourceIndex, rank: safeRank(row?.lead_rank) }))
    .filter(({ row, rank }) => (
      clean(row?.id)
      && clean(row?.phrase)
      && safeNumber(row?.ragil) === number
      && rank != null
      && row?.is_verified === true
      && row?.is_published === true
      && row?.is_encrypted !== true
    ))
    .sort((a, b) => a.rank - b.rank || a.sourceIndex - b.sourceIndex)
    .filter(({ row }) => {
      const phrase = clean(row.phrase);
      if (seen.has(phrase)) return false;
      seen.add(phrase);
      return true;
    })
    .slice(0, NUMBER_PHRASE_PRESENTATION_LIMIT);
}

function isSameRegularFinding(finding, phrase, number) {
  if (finding?.kind !== "gematria") return false;
  if (clean(finding?.subject?.label) !== phrase) return false;
  if (safeNumber(finding?.subject?.value) !== number) return false;
  return [
    finding?.source?.method,
    finding?.verification?.engine_method_tested,
    finding?.verification?.claimed_method,
  ].some(isRegularMethodIdentity);
}

export function numberLeadOrderRowToUniversalFinding(row, { number } = {}) {
  const value = safeNumber(number ?? row?.ragil);
  const phrase = clean(row?.phrase);
  const id = clean(row?.id);
  const leadRank = safeRank(row?.lead_rank);
  if (value == null || !phrase || !id || leadRank == null) return null;
  if (row?.is_verified !== true || row?.is_published !== true || row?.is_encrypted === true) return null;

  const sourceRef = `gematria_words:${id}`;
  const nodeId = clean(row?.node_id);
  return makeUniversalFinding({
    kind: "gematria",
    stage: null,
    status: null,
    subject: { type: "phrase", key: phrase, label: phrase, value, lang: "he" },
    source: {
      engine: "gematria-corpus",
      adapter: "number-lead-order-v1",
      name: "מאגר הגימטריה המאומת",
      sourceRef,
      method: NUMBER_PHRASE_PRESENTATION_AUTHORITY.method,
      corpus: "gematria_words",
      lang: "he",
    },
    identity: {
      sourceIdentity: { table: "gematria_words", id },
      entityRef: nodeId ? `node:${nodeId}` : null,
    },
    // The stored row is a published, verified corpus claim. This adapter does not rerun the engine,
    // so it leaves the claim-vs-engine verification state honestly unknown instead of self-matching.
    verification: {
      claimed_expression: phrase,
      claimed_method: NUMBER_PHRASE_PRESENTATION_AUTHORITY.method,
      claimed_value: value,
      engine_method_tested: null,
      engine_result: null,
      statement_lang: "he",
      verification_state: null,
    },
    evidence: {
      refs: [sourceRef],
      facts: [{
        type: "published-gematria-phrase",
        expression: phrase,
        method: NUMBER_PHRASE_PRESENTATION_AUTHORITY.method,
        value,
        status: "verified_published",
        lead_rank: leadRank,
        authority: NUMBER_PHRASE_PRESENTATION_AUTHORITY.ref,
        presentation_scope: NUMBER_PHRASE_PRESENTATION_AUTHORITY.scope,
      }],
    },
    access: {
      tier: "public",
      reason: "caller-scoped public gematria_words row admitted only when verified and published",
    },
    provenance: {
      createdBy: "CORPUS:gematria_words",
      createdAt: row?.created_at || undefined,
      inputRef: `number:${value}`,
    },
    projection: {
      anchors: [{ space: "number", value }],
      dimensions: {
        presentation: {
          authority: NUMBER_PHRASE_PRESENTATION_AUTHORITY.ref,
          scope: NUMBER_PHRASE_PRESENTATION_AUTHORITY.scope,
          leadRank,
        },
      },
    },
    view: { rendererHints: { role: "curated-regular-phrase" } },
  });
}

/**
 * Add only lead-ranked Regular corpus rows that the bounded numeric lookup omitted, then produce
 * Result-Bundle ranking entries. Existing Findings remain byte-for-byte untouched and unranked
 * findings retain their original order after the explicit Human-Gate rows.
 */
export function mergeNumberPhrasePresentationOrder({ findings = [], rows = [], number } = {}) {
  const value = safeNumber(number);
  const sourceFindings = Array.isArray(findings) ? findings : [];
  if (value == null) return Object.freeze({ findings: sourceFindings, ranking: [], added_count: 0, row_count: 0 });

  const merged = [...sourceFindings];
  const ranking = [];
  let added = 0;
  const ordered = orderedLeadRows(rows, value);

  for (const { row, rank } of ordered) {
    const phrase = clean(row.phrase);
    let finding = merged.find((candidate) => isSameRegularFinding(candidate, phrase, value));
    if (!finding) {
      finding = numberLeadOrderRowToUniversalFinding(row, { number: value });
      if (!finding) continue;
      merged.push(finding);
      added++;
    }
    ranking.push({
      finding_id: finding.id,
      rank,
      score: null,
      axes: {
        authority: NUMBER_PHRASE_PRESENTATION_AUTHORITY.ref,
        presentation_scope: NUMBER_PHRASE_PRESENTATION_AUTHORITY.scope,
        method: NUMBER_PHRASE_PRESENTATION_AUTHORITY.method,
        number: value,
        lead_rank: rank,
      },
      reasons: ["סדר ביטויים ידני קיים בדף המספר"],
    });
  }

  return Object.freeze({
    findings: Object.freeze(merged),
    ranking: Object.freeze(ranking),
    added_count: added,
    row_count: ordered.length,
  });
}
