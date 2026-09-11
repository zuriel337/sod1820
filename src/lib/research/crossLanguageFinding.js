import { makeUniversalFinding } from "./universalFinding.js";
import { EVIDENCE_RELATION } from "./researchResultBundle.js";

// CROSS_LANGUAGE_GOLDEN_FINDING_V1
// Pure projection adapter only: no DB reads, no translation, no arithmetic, no graph traversal.
// Callers must supply already-resolved linguistic relation + canonical calculation facts.
// Language never forks semantic identity; convergence reuses the existing W2 evidence vocabulary.

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function validCalculation(calc) {
  return Boolean(
    calc
    && calc.engineVerified === true
    && Number.isSafeInteger(calc.value)
    && clean(calc.methodKey)
    && Number.isInteger(calc.methodVersion)
    && calc.methodVersion > 0
    && clean(calc.lang)
  );
}

function validLinguisticRelation(relation) {
  return Boolean(
    relation
    && relation.verified === true
    && clean(relation.sourceRef)
    && clean(relation.relationType)
    && relation.from
    && clean(relation.from.key)
    && clean(relation.from.lang)
    && relation.to
    && clean(relation.to.key)
    && clean(relation.to.lang)
  );
}

function calcRef(calc) {
  return clean(calc.sourceRef) || `method:${clean(calc.methodKey)}@${calc.methodVersion}`;
}

export function makeCrossLanguageConvergence({
  numberIdentity,
  linguisticRelation,
  englishCalculation,
  hebrewCalculation,
  parentFindingIds = [],
  createdAt = null,
} = {}) {
  // Fail closed: no convergence is emitted from incomplete or merely claimed inputs.
  if (!validLinguisticRelation(linguisticRelation)) return null;
  if (!validCalculation(englishCalculation) || !validCalculation(hebrewCalculation)) return null;
  if (englishCalculation.lang !== "en" || hebrewCalculation.lang !== "he") return null;

  const value = englishCalculation.value;
  if (hebrewCalculation.value !== value) return null;
  if (!numberIdentity || !Number.isSafeInteger(numberIdentity.value) || numberIdentity.value !== value) return null;

  const numberKey = clean(numberIdentity.key) || `number:${value}`;
  const relationRef = clean(linguisticRelation.sourceRef);
  const enMethod = clean(englishCalculation.methodKey);
  const heMethod = clean(hebrewCalculation.methodKey);
  const enRef = calcRef(englishCalculation);
  const heRef = calcRef(hebrewCalculation);
  const sourceIdentity = [
    "xlang",
    relationRef,
    `${enMethod}@${englishCalculation.methodVersion}`,
    `${heMethod}@${hebrewCalculation.methodVersion}`,
    `number:${value}`,
  ].join("|");

  const parents = [...new Set((Array.isArray(parentFindingIds) ? parentFindingIds : []).map(clean).filter(Boolean))];
  const finding = makeUniversalFinding({
    kind: "cross_language_convergence",
    // Number identity is language-neutral. Display locale belongs to downstream projection/context.
    subject: { type: "number", key: numberKey, label: String(value), lang: null, value },
    source: {
      adapter: "cross-language-convergence-v1",
      sourceRef: relationRef,
      method: null,
      lang: null,
    },
    identity: {
      sourceIdentity,
      entityRef: clean(numberIdentity.ref) || clean(numberIdentity.id),
      relationRef,
    },
    // This adapter compares already-verified facts; it is not itself a claim-vs-engine test.
    // Leave verification_state honestly absent rather than inventing "match".
    verification: {
      verification_state: null,
      statement_lang: null,
    },
    evidence: {
      refs: [relationRef, enRef, heRef],
      facts: [
        {
          type: "linguistic_relation",
          relation_type: clean(linguisticRelation.relationType),
          source_ref: relationRef,
          verified: true,
          from: { key: clean(linguisticRelation.from.key), label: clean(linguisticRelation.from.label), lang: "en" },
          to: { key: clean(linguisticRelation.to.key), label: clean(linguisticRelation.to.label), lang: "he" },
        },
        {
          type: "calculation",
          lang: "en",
          method_key: enMethod,
          method_version: englishCalculation.methodVersion,
          value,
          engine_verified: true,
          source_ref: enRef,
        },
        {
          type: "calculation",
          lang: "he",
          method_key: heMethod,
          method_version: hebrewCalculation.methodVersion,
          value,
          engine_verified: true,
          source_ref: heRef,
        },
      ],
    },
    provenance: {
      createdBy: "ADAPTER:cross-language-convergence-v1",
      createdAt: createdAt || new Date().toISOString(),
      inputRef: relationRef,
      parentFindingIds: parents,
    },
    projection: {
      relations: [
        { type: "linguistic_relation", ref: relationRef },
        { type: "calculation", ref: enRef, lang: "en" },
        { type: "calculation", ref: heRef, lang: "he" },
      ],
      dimensions: { languages: ["en", "he"], convergence_value: value },
    },
  });

  return {
    finding,
    findingOutcome: {
      findingId: finding.id,
      evidenceRelation: EVIDENCE_RELATION.CONVERGENCE,
      dependsOn: parents,
      convergenceKey: `number:${value}:en-he`,
      reason: "verified linguistic relation plus independently reconstructable English and Hebrew calculations converge on the same Number identity",
    },
  };
}

export default makeCrossLanguageConvergence;
