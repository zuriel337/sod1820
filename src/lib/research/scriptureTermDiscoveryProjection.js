import {
  fetchTanachPhraseOccurrences,
  fetchTanachTermOccurrences,
  fetchTanachTermsTogether,
  fetchTanachTermProximity,
  fetchTanachNotarikon,
  normalizeTanachLexicalQuery,
} from "./tanachLexicalSources.js";

export const SCRIPTURE_TERM_DEFAULT_MAX_GROUPS = 2;
export const SCRIPTURE_TERM_MAX_GROUPS = 4;
export const SCRIPTURE_TERM_DEFAULT_MAX_TERMS = 2;
export const SCRIPTURE_TERM_MAX_TERMS = 3;
export const SCRIPTURE_TERM_DEFAULT_RESULT_LIMIT = 6;

const HEBREW_TOKEN = /^[א-תךםןףץ]+$/;

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function boundedInt(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(Math.trunc(n), max));
}

function findingRef(finding) {
  return clean(finding?.id)
    || clean(finding?.subject?.key)
    || clean(finding?.identity?.sourceIdentity?.researchObjectId)
    || null;
}

function validSourceTerm(value) {
  if (typeof value !== "string") return null;
  const sourceTerm = value.trim().replace(/\s+/g, " ");
  if (sourceTerm.length < 2 || sourceTerm.length > 80) return null;
  if (/https?:\/\//i.test(sourceTerm) || /[<>]/.test(sourceTerm) || /\d/.test(sourceTerm)) return null;
  const queryTerm = normalizeTanachLexicalQuery(sourceTerm);
  if (!queryTerm || queryTerm.length < 2 || queryTerm.length > 80) return null;
  return {
    sourceTerm,
    queryTerm,
    tokenEligible: HEBREW_TOKEN.test(queryTerm),
  };
}

/**
 * Select bounded lexical term groups only from already-structured Research Finding evidence facts.
 * No statement/title parsing, no synonym expansion and no cross-Finding term mixing.
 */
export function scriptureTermGroupsFromFindings(findings = [], {
  maxGroups = SCRIPTURE_TERM_DEFAULT_MAX_GROUPS,
  maxTerms = SCRIPTURE_TERM_DEFAULT_MAX_TERMS,
} = {}) {
  const groupCap = boundedInt(maxGroups, SCRIPTURE_TERM_DEFAULT_MAX_GROUPS, SCRIPTURE_TERM_MAX_GROUPS);
  const termCap = boundedInt(maxTerms, SCRIPTURE_TERM_DEFAULT_MAX_TERMS, SCRIPTURE_TERM_MAX_TERMS);
  const groups = [];

  for (const finding of Array.isArray(findings) ? findings : []) {
    const facts = Array.isArray(finding?.evidence?.facts) ? finding.evidence.facts : [];
    const terms = [];
    for (const fact of facts) {
      if (fact?.type !== "term") continue;
      const term = validSourceTerm(fact?.value);
      if (!term || terms.some((item) => item.queryTerm === term.queryTerm)) continue;
      terms.push(term);
      if (terms.length >= termCap) break;
    }
    if (!terms.length) continue;

    groups.push({
      sourceFindingRef: findingRef(finding),
      sourceRef: clean(finding?.source?.sourceRef),
      terms,
      basis: "structured_finding_terms",
    });
    if (groups.length >= groupCap) break;
  }

  return groups;
}

export async function fetchScriptureTermDiscoveryForFindings(findings = [], {
  maxGroups = SCRIPTURE_TERM_DEFAULT_MAX_GROUPS,
  maxTerms = SCRIPTURE_TERM_DEFAULT_MAX_TERMS,
  resultLimit = SCRIPTURE_TERM_DEFAULT_RESULT_LIMIT,
  proximityGap = 6,
  fetchToken = fetchTanachTermOccurrences,
  fetchPhrase = fetchTanachPhraseOccurrences,
  fetchTogether = fetchTanachTermsTogether,
  fetchProximity = fetchTanachTermProximity,
  fetchNotarikon = fetchTanachNotarikon,
} = {}) {
  const groups = scriptureTermGroupsFromFindings(findings, { maxGroups, maxTerms });
  const limit = boundedInt(resultLimit, SCRIPTURE_TERM_DEFAULT_RESULT_LIMIT, 12);

  const results = await Promise.all(groups.map(async (group) => {
    const occurrenceResults = await Promise.all(group.terms.map(async (term) => {
      let occurrence;
      try {
        const found = term.tokenEligible
          ? await fetchToken(term.queryTerm, { limit })
          : await fetchPhrase(term.queryTerm, { limit });
        occurrence = {
          sourceTerm: term.sourceTerm,
          queryTerm: term.queryTerm,
          tokenEligible: term.tokenEligible,
          status: "ready",
          count: Number.isFinite(Number(found?.count)) ? Number(found.count) : 0,
          items: Array.isArray(found?.items) ? found.items : [],
        };
      } catch {
        occurrence = {
          sourceTerm: term.sourceTerm,
          queryTerm: term.queryTerm,
          tokenEligible: term.tokenEligible,
          status: "unavailable",
          count: null,
          items: [],
        };
      }

      let notarikon = null;
      if (term.tokenEligible && term.queryTerm.length >= 2 && term.queryTerm.length <= 6) {
        try {
          notarikon = await fetchNotarikon(term.queryTerm, { limit });
        } catch {
          notarikon = {
            term: term.queryTerm,
            count: null,
            rasheiCount: null,
            sofeiCount: null,
            rasheiTevot: [],
            sofeiTevot: [],
            status: "unavailable",
          };
        }
      }

      return { ...occurrence, notarikon };
    }));

    const tokenTerms = group.terms.filter((term) => term.tokenEligible).map((term) => term.queryTerm);
    let together = null;
    let proximity = null;
    if (tokenTerms.length >= 2) {
      try {
        together = await fetchTogether(tokenTerms, { limit });
      } catch {
        together = { terms: tokenTerms, status: "unavailable", sameVerse: [], sameChapter: [] };
      }
      try {
        proximity = await fetchProximity(tokenTerms[0], tokenTerms[1], { gap: proximityGap, limit });
      } catch {
        proximity = { terms: tokenTerms.slice(0, 2), status: "unavailable", items: [] };
      }
    }

    return {
      ...group,
      occurrenceResults,
      together,
      proximity,
    };
  }));

  const candidates = [];
  for (const result of results) {
    for (const occurrence of result.occurrenceResults) {
      for (const item of occurrence.items) {
        candidates.push({
          ...item,
          sourceFindingRef: result.sourceFindingRef,
          sourceRef: result.sourceRef,
          sourceTerm: occurrence.sourceTerm,
          queryTerm: occurrence.queryTerm,
          discoveryBasis: occurrence.tokenEligible ? "lexical_exact_token" : "lexical_phrase_sequence",
          entityIdentityClaim: false,
          truthPromotion: false,
        });
      }
    }
    for (const occurrence of result.occurrenceResults) {
      for (const item of Array.isArray(occurrence.notarikon?.rasheiTevot) ? occurrence.notarikon.rasheiTevot : []) {
        candidates.push({
          ...item,
          sourceFindingRef: result.sourceFindingRef,
          sourceRef: result.sourceRef,
          sourceTerm: occurrence.sourceTerm,
          queryTerm: occurrence.queryTerm,
          discoveryBasis: "notarikon_rashei_tevot",
          notarikonKind: "ראשי",
          entityIdentityClaim: false,
          truthPromotion: false,
          semanticProof: false,
        });
      }
      for (const item of Array.isArray(occurrence.notarikon?.sofeiTevot) ? occurrence.notarikon.sofeiTevot : []) {
        candidates.push({
          ...item,
          sourceFindingRef: result.sourceFindingRef,
          sourceRef: result.sourceRef,
          sourceTerm: occurrence.sourceTerm,
          queryTerm: occurrence.queryTerm,
          discoveryBasis: "notarikon_sofei_tevot",
          notarikonKind: "סופי",
          entityIdentityClaim: false,
          truthPromotion: false,
          semanticProof: false,
        });
      }
    }
    for (const item of Array.isArray(result.together?.sameVerse) ? result.together.sameVerse : []) {
      candidates.push({
        ...item,
        sourceFindingRef: result.sourceFindingRef,
        sourceRef: result.sourceRef,
        queryTerms: result.together.terms,
        discoveryBasis: "same_finding_terms_same_verse",
        entityIdentityClaim: false,
        truthPromotion: false,
      });
    }
    for (const item of Array.isArray(result.proximity?.items) ? result.proximity.items : []) {
      candidates.push({
        ...item,
        sourceFindingRef: result.sourceFindingRef,
        sourceRef: result.sourceRef,
        queryTerms: result.proximity.terms,
        discoveryBasis: "same_finding_terms_proximity",
        entityIdentityClaim: false,
        truthPromotion: false,
      });
    }
  }

  return {
    kind: "scripture-term-discovery-projection",
    version: 2,
    groups,
    results,
    candidates,
    coverage: {
      inputFindings: Array.isArray(findings) ? findings.length : 0,
      eligibleGroups: groups.length,
      queriedTerms: results.reduce((sum, row) => sum + row.occurrenceResults.length, 0),
      candidateCount: candidates.length,
    },
    governance: {
      readOnly: true,
      statementParsing: false,
      synonymExpansion: false,
      crossFindingMixing: false,
      notarikonInterpretation: false,
      entityIdentityClaim: false,
      automaticCanonicalPromotion: false,
      automaticPublication: false,
      semanticProof: false,
      humanGateRequiredForClaim: true,
      note: "Lexical occurrence/co-occurrence is a discovery lead only. A matching token is not automatic entity identity.",
    },
  };
}

export default fetchScriptureTermDiscoveryForFindings;
