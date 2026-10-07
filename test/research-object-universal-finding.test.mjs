import assert from "node:assert/strict";
import { researchObjectToUniversalFinding, researchObjectFacetDimensions, isGeneralResearchProjectionEligible, researchObjectPersonalScope } from "../src/lib/research/researchObjectFinding.js";

const base = {
  id: "11111111-1111-1111-1111-111111111111",
  created_at: "2026-09-01T00:00:00.000Z",
  kind: "fact",
  statement: "אהרן = 256",
  terms: ["אהרן"],
  value: 256,
  source: "post-extraction",
  source_ref: "posts:136",
  confidence: 91,
  engine_verified: true,
  engine_detail: {
    claimed_expression: "אהרן",
    claimed_method: "ragil",
    claimed_value: 256,
    engine_method_tested: "ragil",
    engine_result: 256,
    verification_state: "match",
  },
  status: "approved",
  privacy_scope: "shared",
  promoted_node_id: "22222222-2222-2222-2222-222222222222",
};

assert.equal(researchObjectPersonalScope(base), null);
assert.equal(isGeneralResearchProjectionEligible(base), true, "ordinary private/shared research remains eligible for general admin projection");
const personOnly = {
  ...base,
  id: "66666666-6666-4666-8666-666666666666",
  privacy_scope: "private",
  meta: { ext: { personal_scope: { scope: "person_only", owner_slug: "ariel-ben-moshe" } } },
};
assert.equal(researchObjectPersonalScope(personOnly), "person_only");
assert.equal(isGeneralResearchProjectionEligible(personOnly), false, "only explicit Human-Gate person_only scope is excluded from the general tree");

const finding = researchObjectToUniversalFinding(base);
assert.ok(finding);
assert.equal(finding.kind, "research-object");
assert.equal(finding.stage, null, "research_objects.kind must never be globally mapped to UF stage");
assert.equal(finding.status, "approved");
assert.equal(finding.verification.verification_state, "match");
assert.equal(finding.access.tier, "shared");
assert.equal(finding.identity.entityRef, "node:22222222-2222-2222-2222-222222222222");
assert.equal(finding.projection.dimensions.researchObjectKind, "fact");
assert.deepEqual(finding.evidence.refs, ["posts:136"]);
assert.equal(finding.subject.label, "אהרן = 256");
assert.equal(finding.subject.lang, "he", "Hebrew-only legacy statement may be safely inferred as Hebrew");
assert.equal(finding.projection.dimensions.presentation.fallbackMode, "raw_statement");
assert.deepEqual(finding.projection.dimensions.presentation.rawStatementRef, { researchObjectId: base.id, field: "statement" });

const multilingual = {
  ...base,
  statement: "DOSSIER RAW — exact historical research statement stays untouched",
  source: "Da'at Tevunot — fixed source witness",
  source_ref: "book:daat-tevunot#section-28",
  privacy_scope: "public_candidate",
  status: "candidate",
  meta: {
    ext: {
      presentation: {
        v: 1,
        statement_lang: "en",
        statement_role: "research_statement",
        source_witness_lang: "he",
        source_witness_lang_basis: "declared_by_intake",
        variants: {
          he: {
            title: "דעת תבונות — מידה, זמן וייצוג",
            summary: "מפת מחקר אנושית בעברית שמסבירה את הממצא בלי להחליף את המקור.",
            source_label: "דעת תבונות · סעיף כח",
          },
          en: {
            title: "Da'at Tevunot — Measure, Time, and Representation",
            summary: "A normalized English presentation of the same research object, not the source witness.",
            source_label: "Da'at Tevunot · section 28",
          },
        },
        compiled: { mode: "backfill", generated_by: "test" },
      },
    },
  },
};

const he = researchObjectToUniversalFinding(multilingual, { locale: "he-IL" });
assert.equal(he.subject.label, "דעת תבונות — מידה, זמן וייצוג");
assert.equal(he.subject.lang, "he");
assert.equal(he.source.lang, "he", "source witness language remains source-owned, not display locale");
assert.equal(he.view.rendererHints.presentation.summary, "מפת מחקר אנושית בעברית שמסבירה את הממצא בלי להחליף את המקור.");
assert.equal(he.view.rendererHints.presentation.sourceLabel, "דעת תבונות · סעיף כח");
assert.equal(he.projection.dimensions.presentation.fallbackMode, null);
assert.equal(he.projection.dimensions.presentation.statementLang, "en");
assert.equal(he.projection.dimensions.presentation.sourceWitnessLangBasis, "declared_by_intake");
assert.equal(he.status, "candidate");
assert.equal(he.access.tier, "public_candidate");
assert.equal(he.verification.verification_state, "match", "presentation must not alter verification");

const en = researchObjectToUniversalFinding(multilingual, { locale: "en-US" });
assert.equal(en.subject.label, "Da'at Tevunot — Measure, Time, and Representation");
assert.equal(en.subject.lang, "en");
assert.equal(en.source.lang, "he", "English display must never relabel the Hebrew witness as English");
assert.equal(en.view.rendererHints.presentation.sourceLabel, "Da'at Tevunot · section 28");
assert.equal(en.identity.sourceIdentity.researchObjectId, base.id, "locale never forks semantic identity");

const missingEnglish = researchObjectToUniversalFinding({
  ...base,
  statement: "TECHNICAL_RAW_STATEMENT",
  meta: { ext: { presentation: { statement_lang: null, variants: { he: { title: "כותרת אנושית" } } } } },
}, { locale: "en" });
assert.equal(missingEnglish.subject.label, "TECHNICAL_RAW_STATEMENT");
assert.equal(missingEnglish.subject.lang, null, "Latin script alone must not be silently labeled English");
assert.equal(missingEnglish.projection.dimensions.presentation.fallbackMode, "raw_statement");
assert.equal(missingEnglish.projection.dimensions.presentation.resolvedLocale, null,
  "missing English presentation stays explicitly missing so a future compiler/backfill can handle it");

const labelOnly = researchObjectToUniversalFinding({
  ...base,
  statement: "TECHNICAL_RAW_STATEMENT",
  meta: { ext: { presentation: { variants: { en: { source_label: "Human source label only" } } } } },
}, { locale: "en" });
assert.equal(labelOnly.subject.label, "TECHNICAL_RAW_STATEMENT");
assert.equal(labelOnly.subject.lang, null);
assert.equal(labelOnly.projection.dimensions.presentation.hasHumanPresentation, false,
  "source label alone must not launder raw statement into a normalized locale presentation");
assert.equal(labelOnly.projection.dimensions.presentation.resolvedLocale, null);


const hebrewSafeFallback = researchObjectToUniversalFinding({
  ...base,
  id: "33333333-3333-3333-3333-333333333333",
  kind: "hypothesis",
  statement: 'Speaker of the phrase "אקים סכת דוד" is hypothesized to be GOD',
  source: "ai:messianic_model_v1",
  source_ref: "book:amos-9-11",
  value: 645,
  meta: {},
}, { locale: "he" });
assert.ok(!/[A-Za-z]{3}/.test(hebrewSafeFallback.subject.label),
  "Hebrew surface primary title must not leak English technical prose");
assert.match(hebrewSafeFallback.subject.label, /ייחוס הדובר|השערה/);
assert.equal(hebrewSafeFallback.view.rendererHints.presentation.sourceLabel, "מודל מחקר משיחי");
assert.match(hebrewSafeFallback.view.rendererHints.presentation.contextLine, /השערה/);
assert.equal(hebrewSafeFallback.projection.dimensions.presentation.fallbackMode, "raw_statement",
  "safe runtime fallback does not pretend durable Hebrew backfill already exists");


const trustedIntakeAttribution = researchObjectToUniversalFinding({
  ...base,
  id: "44444444-4444-4444-8444-444444444444",
  contributor: "צבי (OPOC)",
  source: "channel_updates",
  source_ref: "channel_updates:958c36c9-adaa-4e7c-a623-585565fc1d35",
  meta: {
    ext: {
      wa_channel_intake: {
        contributor_id: "c66f0464-0928-490e-be9b-66d8a87e7fc8",
        trusted_author: true,
      },
    },
  },
}, { locale: "he" });
assert.equal(trustedIntakeAttribution.view.rendererHints.presentation.attributionState, "resolved");
assert.match(trustedIntakeAttribution.view.rendererHints.presentation.attributionLabel, /ייחוס מקור מאומת: צבי/);

const nameOnlyAttribution = researchObjectToUniversalFinding({
  ...base,
  id: "55555555-5555-4555-8555-555555555555",
  contributor: "אור הגאולה",
  source: "channel_updates",
  source_ref: "channel_updates:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  meta: { ext: { wa_channel_intake: { trusted_author: false } } },
}, { locale: "he" });
assert.equal(nameOnlyAttribution.view.rendererHints.presentation.attributionState, "unresolved");
assert.match(nameOnlyAttribution.view.rendererHints.presentation.attributionLabel, /זהות המחבר לא הוכרעה/);

const noDetail = researchObjectToUniversalFinding({ ...base, engine_detail: {}, engine_verified: true });
assert.equal(noDetail.verification.verification_state, null,
  "derived engine_verified=true must not manufacture verification_state=match");

const unknownKind = researchObjectToUniversalFinding({ ...base, kind: "hypothesis" });
assert.equal(unknownKind.stage, null);
assert.equal(unknownKind.projection.dimensions.researchObjectKind, "hypothesis");

const noNode = researchObjectToUniversalFinding({ ...base, promoted_node_id: null });
assert.equal(noNode.identity.entityRef, null);
assert.deepEqual(noNode.projection.anchors, []);


const structuredFacetRow = {
  ...base,
  id: "77777777-7777-4777-8777-777777777777",
  source_ref: "channel_updates:structured-facet-source",
  engine_detail: {
    method: "ragil",
    verification_state: "match",
    compound: {
      kind: "quantity-product",
      quantity: 4,
      result: 408,
      computedTotal: 408,
      status: "ENGINE_VERIFIED_COMPOSITE",
      operand: { phrase: "טוב", value: 102, method: "רגיל", ok: true },
    },
  },
  meta: {
    ext: {
      spatial_research: {
        role: "STRUCTURAL_3D",
        cluster: "408 זאת · קוביית חיים",
        research_focus_key: "zvi:spatial:408:zot",
        classification: "DERIVED_RESEARCH_CLASSIFICATION",
      },
      source_media_profile: {
        class: "SPATIAL_3D",
        load_bearing_visual_candidate: true,
      },
      exact_duplicate_lineage: {
        occurrence_count: 3,
      },
    },
  },
};

const facets = researchObjectFacetDimensions(structuredFacetRow);
assert.deepEqual(facets.methods.map((row) => row.token), ["ragil", "רגיל"]);
assert.equal(facets.methods[0].registryResolutionRequired, true);
assert.equal(facets.operation.kind, "quantity-product");
assert.equal(facets.operation.multiplier, 4);
assert.deepEqual(facets.operation.factors, [4]);
assert.deepEqual(facets.operation.operators, []);
assert.equal(facets.operation.result, 408);
assert.equal(facets.family.key, "zvi:spatial:408:zot");
assert.equal(facets.family.cluster, "408 זאת · קוביית חיים");
assert.equal(facets.spatial.role, "STRUCTURAL_3D");
assert.equal(facets.spatial.mediaClass, "SPATIAL_3D");
assert.equal(facets.spatial.loadBearingVisualCandidate, true);
assert.equal(facets.sourceOccurrence.ref, "channel_updates:structured-facet-source");
assert.equal(facets.sourceOccurrence.duplicateOccurrenceCount, 3);

const facetedFinding = researchObjectToUniversalFinding(structuredFacetRow);
assert.equal(facetedFinding.projection.dimensions.researchFacets.operation.multiplier, 4);
assert.equal(facetedFinding.projection.dimensions.researchFacets.family.key, "zvi:spatial:408:zot");
assert.equal(facetedFinding.projection.dimensions.researchFacets.spatial.role, "STRUCTURAL_3D");

const noTextGuess = researchObjectFacetDimensions({
  ...base,
  source_ref: null,
  statement: "זה טקסט שכותב ×4 ותלת מימד אבל אין metadata מובנה",
  engine_detail: {},
  meta: {},
});
assert.equal(noTextGuess, null, "facets must never be guessed from free statement text");

const verifiedGeneralChain = researchObjectFacetDimensions({
  ...base,
  source_ref: null,
  engine_detail: {
    compound: {
      raw: "(טוב×36)×5=3060",
      kind: "general-chain",
      result: 3060,
      computedTotal: 3060,
      status: "ENGINE_VERIFIED_COMPOSITE",
    },
  },
  meta: {},
});
assert.deepEqual(verifiedGeneralChain.operation.factors, [36, 5]);
assert.deepEqual(verifiedGeneralChain.operation.operators, ["multiply"]);
assert.equal(verifiedGeneralChain.operation.basis, "verified_engine_compound");

const verifiedHebrewTimes = researchObjectFacetDimensions({
  ...base,
  source_ref: null,
  engine_detail: {
    compound: {
      raw: "רחל=14 פעמים טוב",
      kind: "general-chain",
      result: 238,
      computedTotal: 238,
      status: "ENGINE_VERIFIED_COMPOSITE",
    },
  },
  meta: {},
});
assert.deepEqual(verifiedHebrewTimes.operation.factors, [14]);

const unverifiedCompoundText = researchObjectFacetDimensions({
  ...base,
  source_ref: null,
  engine_detail: {
    compound: {
      raw: "טוב×4=68",
      kind: "general-chain",
      status: "UNVERIFIED",
    },
  },
  meta: {},
});
assert.deepEqual(unverifiedCompoundText.operation.factors, [],
  "unverified compound raw text must not mint filter factors");

assert.equal(researchObjectToUniversalFinding(null), null);
console.log("research-object-universal-finding: ok");
