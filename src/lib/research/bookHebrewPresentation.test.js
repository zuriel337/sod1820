import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOK_HEBREW_PRESENTATION_DOMAINS,
  presentBookAccessStatus,
  presentBookCoverageKey,
  presentBookCoverageValue,
  presentBookEditionStatus,
  presentBookLocatorKind,
  presentBookResearchKind,
  presentBookResearchStatus,
  presentBookScreenState,
  presentBookSourceWorkStatus,
  presentBookTechnicalTerm,
  presentBookTextualVersionStatus,
  presentBookValue,
  presentBookVerificationState,
} from "./bookHebrewPresentation.js";

const HEBREW_RE = /[\u0590-\u05ff]/;

const assertPresentation = (presentation, rawValue, { known = true } = {}) => {
  assert.deepEqual(Object.keys(presentation), ["labelHe", "detailHe", "semanticRole", "rawValue", "isKnown"]);
  assert.equal(presentation.rawValue, rawValue);
  assert.equal(presentation.isKnown, known);
  assert.match(presentation.labelHe, HEBREW_RE);
  assert.equal(typeof presentation.semanticRole, "string");
};

const assertEveryKnown = (presenter, values) => {
  for (const value of values) assertPresentation(presenter(value), value);
};

test("all live locator, edition, source-work and textual-version values have Hebrew presentations", () => {
  assertEveryKnown(presentBookLocatorKind, [
    "pdf_page_block", "pdf_page_region", "pdf_page_work_block", "pdf_page_zone_work",
    "external_pdf_page", "section_locus", "verse",
  ]);
  assertEveryKnown(presentBookEditionStatus, [
    "bibliographic_metadata_partial",
    "bibliographic_metadata_verified_from_front_matter",
    "edition_identity_not_promoted_here",
    "first_print_identity_verified_source_plus_bibliographic",
    "site_research_edition_historical_edition_not_adjudicated",
  ]);
  assertEveryKnown(presentBookSourceWorkStatus, [
    "SEMANTIC_TIER_NOT_PROMOTED_TO_SEPARATE_NODE",
    "COMPOSITE_WORK_FAMILY_SEMANTIC_TIER_NOT_PROMOTED_TO_SEPARATE_NODE",
  ]);
  assertEveryKnown(presentBookTextualVersionStatus, ["NOT_YET_DISTINGUISHED_FROM_CURRENT_WITNESS"]);
});

test("all live coverage keys have Hebrew presentations", () => {
  assertEveryKnown(presentBookCoverageKey, [
    "structural", "structural_digital_object", "structural_sections", "research_map",
    "content_scan", "close_read", "exact_witness", "exact_witness_close_read",
    "source_exhaustion", "corpus_exhaustion", "deep_research", "dossier_version", "active_blocks",
    "exact_lexical_census", "historical_witness_collation", "unresolved_total",
    "whole_book_high_value_map",
  ]);
});

test("all live composite coverage values have Hebrew presentations", () => {
  assertEveryKnown(presentBookCoverageValue, [
    "COMPLETE", "CLOSED", "PARTIAL", "NOT ESTABLISHED", "NOT EXHAUSTIVE", "SUFFICIENT",
    "SUFFICIENT_FOR_PROJECTION", "TABLE OF CONTENTS MAPPED", "327 PDF PAGES PRESENT",
    "48/48 COMPLETE", "90/90 COMPLETE", "99/99 COMPLETE", "220/220 COMPLETE",
    "195/195 COMPLETE", "V2 CLOSED", "BOUNDED CLOSURE WITH EXPLICIT RESIDUALS",
    "CURRENT CLAIM-BEARING LOCI VERIFIED AGAINST EXTERNAL 2ND-EDITION WITNESS",
    "NOT ESTABLISHED AS COMPLETE",
    "ALL 5 PARTS MAPPED AT DECISION-CHANGING LOCI · PARTS 1+3 DEEP",
    "BOUNDED / PROCEDURE-AND-REPRESENTATION FAMILIES",
    "MAJOR THEMATIC BLOCKS + TERMINAL SECTIONS CLOSED",
    "PARTIAL / HIGH-VALUE LOCI + RECONSTRUCTED BATCHES",
    "GOLDEN V3 · WHOLE-BOOK HIGH-VALUE MAP", "WHOLE-BOOK STRESS TEST",
    "COMPLETE FOR CURRENT GOLDEN",
  ]);
});

test("numeric coverage values remain exact while ratios become readable Hebrew", () => {
  assert.deepEqual(presentBookCoverageValue("89/90"), {
    labelHe: "89 מתוך 90", detailHe: null, semanticRole: "metric", rawValue: "89/90", isKnown: true,
  });
  assert.equal(presentBookCoverageValue("212").labelHe, "212");
  assert.equal(presentBookCoverageValue(4).labelHe, "4");
  assert.equal(presentBookCoverageValue("115").isKnown, true);
  assert.equal(presentBookCoverageValue("v9").labelHe, "גרסה 9");
});

test("all research kinds, governance states and access states stay distinct", () => {
  assertEveryKnown(presentBookResearchKind, ["observation", "hypothesis", "fact", "relation", "question"]);
  assertEveryKnown(presentBookResearchStatus, ["candidate", "approved", "canonical", "published"]);
  assertEveryKnown(presentBookAccessStatus, ["private", "person_only", "group", "public_candidate", "public", "published"]);

  assert.equal(new Set(["candidate", "approved", "canonical", "published"].map((value) => presentBookResearchStatus(value).labelHe)).size, 4);
  assert.equal(new Set(["private", "public_candidate", "public"].map((value) => presentBookAccessStatus(value).labelHe)).size, 3);
  assert.notEqual(presentBookResearchStatus("approved").semanticRole, presentBookResearchStatus("published").semanticRole);
  assert.notEqual(presentBookAccessStatus("public_candidate").semanticRole, presentBookAccessStatus("public").semanticRole);
});

test("every live verification value has a Hebrew presentation", () => {
  assertEveryKnown(presentBookVerificationState, [
    "match", "not_applicable", "not_tested", "mismatch", "source_witness_verified",
    "multi_locus_source_witness_verified", "source_witness_verified_multi_locus",
    "source_procedure_reconstructed_with_engine_verified_numeric_components",
    "aggregate_verified_label_semantics_unresolved", "arithmetic_source_claim_not_gematria_engine",
    "component_engine_verified_composite_source_derived", "component_match_composite_unregistered",
    "component_values_tested", "component_verified_operation_unmapped",
    "component_verified_representation_mismatch", "component_verified_source_procedure_pdf_pending",
    "digital_internal_consistency_match_pdf_pending",
    "source_family_reconstructed_canonical_semantics_distinguished",
    "source_family_reconstructed_execution_not_applicable",
    "source_family_reconstructed_execution_unmapped",
    "source_text_reconstructed_count_match_execution_partial",
    "source_witness_re_rendered_and_dense_line_visually_adjudicated_with_digital_reconstruction_aid",
    "source_witness_verified_components_numeric_checked", "source_witness_verified_no_execution_mapping",
    "source_witness_verified_numeric_not_reproduced", "source_witness_verified_reconstructed",
    "source_witness_verified_structural_reconstruction", "textual_restoration_candidate_pdf_unadjudicated",
    "worked_multi_locus_engine_components_verified_pdf_pending",
  ]);
});

test("core verification states do not collapse into one visual meaning", () => {
  const states = ["not_tested", "not_applicable", "match", "mismatch"].map(presentBookVerificationState);
  assert.equal(new Set(states.map((state) => state.labelHe)).size, 4);
  assert.equal(new Set(states.map((state) => state.semanticRole)).size, 4);
});

test("technical terms and screen states use the contract copy", () => {
  assertEveryKnown(presentBookTechnicalTerm, [
    "BOOKS · SOURCES · WITNESSES", "BOOKS · ONE RESEARCH REALITY", "CORPUS PROJECTION",
    "Library Group", "PERSONAL SOURCE INTAKE", "Private Source", "Light Intake",
    "Book Research Lab", "runtime pending", "Research Object", "dataset", "snapshot",
    "coverage", "residuals", "Projection", "Foundation", "Human Gate", "Golden",
    "engine", "trace", "raw",
  ]);
  assertEveryKnown(presentBookScreenState, [
    "library_loading", "book_loading", "no_authorized_books", "book_unavailable", "restricted",
    "truncated", "no_approved_material", "network_error", "action_unavailable", "save_success",
    "save_failure",
  ]);
  assert.equal(presentBookTechnicalTerm("CORPUS PROJECTION").labelHe, "קורפוס מקורות");
  assert.equal(presentBookTechnicalTerm("dataset").labelHe, "מערך נתונים");
  assert.equal(presentBookTechnicalTerm("runtime pending").labelHe, "התשתית עדיין אינה זמינה");
  assert.equal(presentBookScreenState("restricted").labelHe, "חלק מחומר המחקר אינו זמין בהרשאה הנוכחית.");
  assert.equal(presentBookScreenState("network_error").semanticRole, "failure");
});

test("unknown values fail closed in Hebrew without exposing snake_case", () => {
  const unknowns = [
    presentBookCoverageKey("future_internal_key"),
    presentBookCoverageValue("FUTURE COMPLEX INTERNAL STATE"),
    presentBookLocatorKind("future_locator_kind"),
    presentBookEditionStatus("future_edition_state"),
    presentBookResearchKind("future_research_kind"),
    presentBookResearchStatus("future_governance_state"),
    presentBookAccessStatus("future_access_state"),
    presentBookVerificationState("future_verification_state"),
    presentBookTechnicalTerm("FUTURE TECHNICAL TERM"),
  ];

  for (const presentation of unknowns) {
    assert.equal(presentation.isKnown, false);
    assert.match(presentation.labelHe, HEBREW_RE);
    assert.doesNotMatch(presentation.labelHe, /future|_/i);
    assert.ok(presentation.detailHe);
  }
  assert.equal(unknowns[0].rawValue, "future_internal_key");
});

test("missing values use explicit conservative Hebrew fallbacks", () => {
  assert.equal(presentBookEditionStatus(null).labelHe, "פרטי המהדורה עדיין חלקיים");
  assert.equal(presentBookResearchStatus(undefined).labelHe, "מצב המחקר טרם הוגדר");
  assert.equal(presentBookAccessStatus("  ").labelHe, "מצב הגישה טרם הוגדר");
  assert.equal(presentBookVerificationState(null).labelHe, "מצב הבדיקה טרם הוגדר");
  assert.equal(presentBookVerificationState(null).rawValue, null);
});

test("generic dispatcher uses the same domain adapters and fails closed for an unknown domain", () => {
  assert.deepEqual(
    presentBookValue(BOOK_HEBREW_PRESENTATION_DOMAINS.RESEARCH_STATUS, "approved"),
    presentBookResearchStatus("approved"),
  );
  const unknownDomain = presentBookValue("future_domain", "private_internal_value");
  assertPresentation(unknownDomain, "private_internal_value", { known: false });
  assert.doesNotMatch(unknownDomain.labelHe, /private|_/i);
  assertPresentation(presentBookValue("constructor", "raw_value"), "raw_value", { known: false });
});

test("adapter results and domain identifiers are immutable", () => {
  assert.equal(Object.isFrozen(BOOK_HEBREW_PRESENTATION_DOMAINS), true);
  assert.equal(Object.isFrozen(presentBookVerificationState("match")), true);
});
