import test from "node:test";
import assert from "node:assert/strict";
import { makeCrossLanguageConvergence } from "./crossLanguageFinding.js";
import { capabilityResult, composeResearchResultBundle } from "./researchResultBundle.js";

function golden({ value, en, he, enMethod, relationRef, numberRef }) {
  return makeCrossLanguageConvergence({
    numberIdentity: { key: `number:${value}`, value, ref: numberRef || `node:number:${value}` },
    linguisticRelation: {
      sourceRef: relationRef,
      relationType: "translation",
      verified: true,
      from: { key: `lexeme:en:${en.toLowerCase()}`, label: en, lang: "en" },
      to: { key: `lexeme:he:${he}`, label: he, lang: "he" },
    },
    englishCalculation: {
      lang: "en", methodKey: enMethod, methodVersion: 1, value,
      engineVerified: true, sourceRef: `method:${enMethod}@1:${en.toLowerCase()}`,
      findingId: `uf:en:${en.toLowerCase()}`,
    },
    hebrewCalculation: {
      lang: "he", methodKey: "רגיל", methodVersion: 1, value,
      engineVerified: true, sourceRef: `method:רגיל@1:${he}`,
      findingId: `uf:he:${he}`,
    },
    parentFindingIds: [`uf:en:${en.toLowerCase()}`, `uf:he:${he}`],
    createdAt: "2026-09-11T00:00:00.000Z",
  });
}

test("Golden English/Hebrew pairs emit one Universal Finding with W2 CONVERGENCE semantics", () => {
  const fixtures = [
    { value: 70, en: "Secret", he: "סוד", enMethod: "en_ordinal", relationRef: "language_link:secret-sod" },
    { value: 32, en: "glory", he: "כבוד", enMethod: "en_full_reduction", relationRef: "language_link:glory-kavod" },
    { value: 75, en: "priest", he: "כהן", enMethod: "en_reverse_ordinal", relationRef: "language_link:priest-kohen" },
  ];

  for (const fixture of fixtures) {
    const out = golden(fixture);
    assert.ok(out?.finding?.id);
    assert.equal(out.finding.kind, "cross_language_convergence");
    assert.equal(out.finding.subject.type, "number");
    assert.equal(out.finding.subject.value, fixture.value);
    assert.equal(out.finding.subject.lang, null);
    assert.equal(out.finding.verification.verification_state, null);
    assert.equal(out.findingOutcome.evidenceRelation, "convergence");
    assert.notEqual(out.findingOutcome.evidenceRelation, "independent_evidence");
    assert.equal(out.finding.evidence.facts.filter(f => f.type === "calculation").length, 2);
  }
});

test("adapter fails closed when any prerequisite is unverified or values do not converge", () => {
  const base = {
    numberIdentity: { key: "number:70", value: 70 },
    linguisticRelation: {
      sourceRef: "language_link:secret-sod", relationType: "translation", verified: true,
      from: { key: "lexeme:en:secret", label: "Secret", lang: "en" },
      to: { key: "lexeme:he:סוד", label: "סוד", lang: "he" },
    },
    englishCalculation: { lang: "en", methodKey: "en_ordinal", methodVersion: 1, value: 70, engineVerified: true },
    hebrewCalculation: { lang: "he", methodKey: "רגיל", methodVersion: 1, value: 70, engineVerified: true },
  };

  assert.equal(makeCrossLanguageConvergence({ ...base, linguisticRelation: { ...base.linguisticRelation, verified: false } }), null);
  assert.equal(makeCrossLanguageConvergence({ ...base, englishCalculation: { ...base.englishCalculation, engineVerified: false } }), null);
  assert.equal(makeCrossLanguageConvergence({ ...base, hebrewCalculation: { ...base.hebrewCalculation, value: 71 } }), null);
  assert.equal(makeCrossLanguageConvergence({ ...base, numberIdentity: { key: "number:71", value: 71 } }), null);
});

test("Reverse Reduction conflict cannot produce convergence while engineVerified=false", () => {
  const out = makeCrossLanguageConvergence({
    numberIdentity: { key: "number:17", value: 17 },
    linguisticRelation: {
      sourceRef: "language_link:good-tov", relationType: "translation", verified: true,
      from: { key: "lexeme:en:good", label: "good", lang: "en" },
      to: { key: "lexeme:he:טוב", label: "טוב", lang: "he" },
    },
    englishCalculation: { lang: "en", methodKey: "en_reverse_reduction", methodVersion: 1, value: 17, engineVerified: false },
    hebrewCalculation: { lang: "he", methodKey: "רגיל", methodVersion: 1, value: 17, engineVerified: true },
  });
  assert.equal(out, null);
});

test("Cross-Language finding drops into the existing Result Bundle without a language-specific bundle", () => {
  const out = golden({ value: 70, en: "Secret", he: "סוד", enMethod: "en_ordinal", relationRef: "language_link:secret-sod" });
  const bundle = composeResearchResultBundle({
    query: { identities: [{ type: "number", key: "number:70", value: 70 }] },
    capabilities: [capabilityResult({
      key: "cross_language",
      owner: "content_translation_law+canonical_methods_registry_law",
      findings: [out.finding],
      findingOutcomes: [out.findingOutcome],
    })],
    synthesis: null,
  });

  assert.equal(bundle.findings.length, 1);
  assert.equal(bundle.finding_outcomes.length, 1);
  assert.equal(bundle.finding_outcomes[0].evidence_relation, "convergence");
  assert.equal(bundle.synthesis, null);
});
