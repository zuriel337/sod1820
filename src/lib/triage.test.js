// Tests for triage.js — run with: node --test src/lib/triage.test.js
// Zero external dependencies (Node's built-in test runner), mirrors middleware.test.js/
// engagement.test.js/roadmapParser.test.js convention. Exercises the REAL module.
//
// RESEARCH_INTAKE_V6_EXTRACTION_INTEGRITY (27.8.2026) — see work_log.
// Golden fixtures A/B derived from live Supabase gematria (fn_ragil): ישר=510, ברית=612, טוב=17
// (verified live before writing this file — never hand-computed). This file also establishes a
// checked-in regression baseline for the pre-existing extractCompoundClaims() shapes (quantity-
// product, two-phrase-product, number-product-equals-phrase, phrase-sum-chain, general-chain,
// vertical-chain, RULE #35, RULE #36), which previously had no committed test coverage.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractCompoundClaims,
  extractAndVerifyCompound,
  extractSourceMediaRefs,
  computeExtractionIntegrity,
  buildResearchCase,
  buildIntakeMeta,
} from "./triage.js";

// ── Golden Specimen A — Cube (ZVI 3060) ──────────────────────────────────────────────────────────
const SPECIMEN_A = [
  "הקובייה מורכבת מ-6 פאות, כל פאה שווה ישר.",
  "ישר=510",
  "6 × ישר = 3060",
  "[Image 3848.jpg]",
].join("\n");

test("Golden A (cube): 6×ישר=3060 is ENGINE_VERIFIED_COMPOSITE", () => {
  const claims = extractCompoundClaims(SPECIMEN_A);
  const qp = claims.find((c) => c.kind === "quantity-product");
  assert.ok(qp, "quantity-product claim extracted");
  assert.equal(qp.quantity, 6);
  assert.equal(qp.operand.value, 510);
  assert.equal(qp.computedTotal, 3060);
  assert.equal(qp.result, 3060);
  assert.equal(qp.status, "ENGINE_VERIFIED_COMPOSITE");
});

test("Golden A (cube): quantity provenance resolves to source_explicit '6 פאות'", () => {
  const claims = extractCompoundClaims(SPECIMEN_A);
  const qp = claims.find((c) => c.kind === "quantity-product");
  assert.ok(qp.quantityProvenance, "quantityProvenance present");
  assert.equal(qp.quantityProvenance.value, 6);
  assert.equal(qp.quantityProvenance.status, "source_explicit");
  assert.match(qp.quantityProvenance.sourceText, /6.*פאות/);
  assert.equal(qp.quantityProvenance.sourceLineIndex, 0);
  assert.equal(qp.quantityProvenance.semanticRole, null, "no domain interpretation in general Intake");
});

test("Golden A (cube): image placeholder preserved, unresolved (not deleted, no URL invented)", () => {
  const refs = extractSourceMediaRefs(SPECIMEN_A, {});
  assert.equal(refs.length, 1);
  assert.equal(refs[0].kind, "image");
  assert.equal(refs[0].filename, "3848.jpg");
  assert.equal(refs[0].resolvedUrl, null);
  assert.equal(refs[0].resolutionStatus, "unresolved");
});

test("Golden A (cube): image ref resolves when caller supplies item.image_url", () => {
  const refs = extractSourceMediaRefs(SPECIMEN_A, { image_url: "https://example.com/3848.jpg" });
  const resolved = refs.find((r) => r.resolvedUrl);
  assert.ok(resolved);
  assert.equal(resolved.resolutionStatus, "resolved");
  assert.equal(resolved.resolvedUrl, "https://example.com/3848.jpg");
});

test("Golden A (cube): extraction fidelity is partial (media unresolved) even though arithmetic verified", () => {
  const claims = extractCompoundClaims(SPECIMEN_A);
  const refs = extractSourceMediaRefs(SPECIMEN_A, {});
  const integrity = computeExtractionIntegrity(claims, refs);
  assert.equal(integrity.arithmeticVerified, true);
  assert.equal(integrity.semanticOperandCoverage, "complete"); // the "6" was resolved via source text
  assert.equal(integrity.mediaReferenceCoverage, "partial"); // image still unresolved
  assert.equal(integrity.fidelityStatus, "partial", "must not claim complete while media is unresolved");
});

test("Golden A (cube): fidelityStatus=partial does not touch engine_verified/status on the claim itself", () => {
  const claims = extractCompoundClaims(SPECIMEN_A);
  const qp = claims.find((c) => c.kind === "quantity-product");
  // truth taxonomy stays separate: the compound claim's own status is untouched by the fidelity gate
  assert.equal(qp.status, "ENGINE_VERIFIED_COMPOSITE");
});

test("Golden A (cube): buildResearchCase exposes v6 fields without breaking existing shape", () => {
  const kase = buildResearchCase({ raw: SPECIMEN_A });
  assert.ok(Array.isArray(kase.artifacts), "pre-existing triageSource shape intact");
  assert.ok(Array.isArray(kase.connections), "pre-existing findConnections shape intact");
  assert.ok(Array.isArray(kase.compoundClaims));
  assert.ok(Array.isArray(kase.sourceMediaRefs));
  assert.ok(kase.extractionIntegrity);
  assert.equal(kase.extractionIntegrity.fidelityStatus, "partial");
});

// ── Golden Specimen B — Pentagon (ZVI 3060, second reconstruction) ─────────────────────────────────
const SPECIMEN_B = [
  "חמישה קודקודים, פנימי וחיצוני.",
  "5 × ברית = 3060",
  "180 × טוב = 3060",
  "[Image 3850.jpg]",
].join("\n");

test("Golden B (pentagon): both quantity-products remain ENGINE_VERIFIED_COMPOSITE", () => {
  const claims = extractCompoundClaims(SPECIMEN_B).filter((c) => c.kind === "quantity-product");
  assert.equal(claims.length, 2);
  for (const c of claims) assert.equal(c.status, "ENGINE_VERIFIED_COMPOSITE");
  assert.deepEqual(claims.map((c) => c.result).sort(), [3060, 3060]);
});

test("Golden B (pentagon): no polygon semantics invented — quantities without explicit context stay unresolved/candidate, never fabricated", () => {
  const claims = extractCompoundClaims(SPECIMEN_B).filter((c) => c.kind === "quantity-product");
  for (const c of claims) {
    assert.ok(c.quantityProvenance, "provenance field present");
    assert.notEqual(c.quantityProvenance.semanticRole, "pentagon_vertices", "must never invent a domain role");
    assert.equal(c.quantityProvenance.semanticRole, null);
  }
});

test("Golden B (pentagon): media reference preserved (unresolved), structural evidence intact", () => {
  const refs = extractSourceMediaRefs(SPECIMEN_B, {});
  assert.equal(refs.length, 1);
  assert.equal(refs[0].filename, "3850.jpg");
  assert.equal(refs[0].resolutionStatus, "unresolved");
});

// ── V6 Law 2 — media reference shapes beyond [Image ...] ───────────────────────────────────────────
test("V6 §7.2: [Video ...] and [Audio ...] markers preserved with correct kind", () => {
  const refs = extractSourceMediaRefs("[Video clip9.mp4]\n[Audio note3.mp3]", {});
  assert.equal(refs.length, 2);
  assert.equal(refs[0].kind, "video");
  assert.equal(refs[0].filename, "clip9.mp4");
  assert.equal(refs[1].kind, "audio");
  assert.equal(refs[1].filename, "note3.mp3");
  assert.ok(refs.every((r) => r.resolutionStatus === "unresolved" && r.resolvedUrl === null));
});

test("V6 §7.2: markdown image reference resolves resolvedUrl/resolutionStatus", () => {
  const refs = extractSourceMediaRefs("see this: ![alt text](https://cdn.example.com/pic.png)", {});
  assert.equal(refs.length, 1);
  assert.equal(refs[0].kind, "image");
  assert.equal(refs[0].resolvedUrl, "https://cdn.example.com/pic.png");
  assert.equal(refs[0].resolutionStatus, "resolved");
});

test("V6 §7.3: not_applicable when there is nothing to check", () => {
  const integrity = computeExtractionIntegrity([], []);
  assert.equal(integrity.arithmeticVerified, false);
  assert.equal(integrity.semanticOperandCoverage, "not_applicable");
  assert.equal(integrity.mediaReferenceCoverage, "not_applicable");
  assert.equal(integrity.fidelityStatus, "partial"); // arithmeticVerified=false ⇒ never "complete"
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// REGRESSION — pre-existing extractCompoundClaims() shapes must remain unchanged by the v6 patch.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

test("regression: quantity-product — «5 פעמים \"ברית\"(612)=3060»", () => {
  const claims = extractCompoundClaims('5 פעמים "ברית"(612)=3060');
  const qp = claims.find((c) => c.kind === "quantity-product");
  assert.ok(qp);
  assert.equal(qp.quantity, 5);
  assert.equal(qp.operand.value, 612);
  assert.equal(qp.computedTotal, 3060);
  assert.equal(qp.status, "ENGINE_VERIFIED_COMPOSITE");
});

test("regression: two-phrase-product — א-הי-ה(21) × א-הי-ה(21)=441", () => {
  const claims = extractCompoundClaims("אהיה(21) × אהיה(21)=441");
  const tp = claims.find((c) => c.kind === "two-phrase-product");
  assert.ok(tp);
  assert.equal(tp.computedTotal, 441);
  assert.equal(tp.status, "ENGINE_VERIFIED_COMPOSITE");
});

test("regression: number-product-equals-phrase — 21×21=אמת", () => {
  const claims = extractCompoundClaims("21×21=אמת");
  const npe = claims.find((c) => c.kind === "number-product-equals-phrase");
  assert.ok(npe);
  assert.equal(npe.computedTotal, 441);
  assert.equal(npe.status, "ENGINE_VERIFIED_COMPOSITE");
  // v6 addition present but purely additive — does not change the pre-existing verdict fields
  assert.ok(Array.isArray(npe.quantityProvenance));
  assert.equal(npe.quantityProvenance.length, 2);
});

test("regression: phrase-sum-chain — ז+זי+זית=7+17+417=441", () => {
  const claims = extractCompoundClaims("ז+זי+זית=7+17+417=441");
  const psc = claims.find((c) => c.kind === "phrase-sum-chain");
  assert.ok(psc);
  assert.equal(psc.sum, 441);
  assert.equal(psc.status, "ENGINE_VERIFIED_COMPOSITE");
});

test("regression: general-chain — pure numeric chain without gematria (911+909=1820)", () => {
  const claims = extractCompoundClaims("911+909=1820");
  const gc = claims.find((c) => c.kind === "general-chain");
  assert.ok(gc);
  assert.equal(gc.result, 1820);
  assert.equal(gc.status, "ENGINE_VERIFIED_COMPOSITE");
});

test("regression: general-chain — reversed order phrase×N still parses (RULE set continuity)", () => {
  const claims = extractCompoundClaims("ברית × 5 = 3060");
  const gc = claims.find((c) => c.kind === "general-chain" || c.kind === "quantity-product");
  assert.ok(gc, "some extractor captured the reversed-order product");
  assert.equal(gc.status, "ENGINE_VERIFIED_COMPOSITE");
});

test("regression: vertical-chain (RULE #35) — multi-line layout without explicit operator", () => {
  const text = ["72", "27", "=", "99"].join("\n");
  const claims = extractCompoundClaims(text);
  const vc = claims.find((c) => c.kind === "vertical-chain");
  assert.ok(vc, "vertical arithmetic detected");
  assert.equal(vc.result, 99);
  assert.equal(vc.status, "ENGINE_VERIFIED_COMPOSITE");
  assert.ok(vc.syntheticPlusCount >= 1);
});

test("regression: RULE #36 — trailing-prose stripped, not treated as operand (\"543 × 4 גילויים.. = 2172\")", () => {
  const claims = extractCompoundClaims("543 × 4 גילויים.. = 2172");
  const gc = claims.find((c) => c.kind === "general-chain");
  assert.ok(gc, "general-chain parsed the numeric claim despite trailing prose word");
  assert.equal(gc.result, 2172);
  assert.equal(gc.status, "ENGINE_VERIFIED_COMPOSITE");
  assert.ok(Array.isArray(gc.strippedAnnotations) && gc.strippedAnnotations.includes("גילויים"),
    "the stray word is preserved as evidence (stripped, not deleted) — RULE #36 provenance");
});

test("regression: extractAndVerifyCompound wraps routing/interest without altering compound status", () => {
  const results = extractAndVerifyCompound({ raw: SPECIMEN_A });
  assert.ok(results.length > 0);
  for (const r of results) {
    assert.ok(r.routing);
    assert.ok(r.interest);
    assert.equal(typeof r.compound.status, "string");
  }
});

// ── Research Intake Build v1 — buildIntakeMeta() persistence mapper (V6 §7.1-§7.3) ───────────────
// The mapper is the bridge that was MISSING: §7.1/§7.2/§7.3 were computed and then discarded at the
// Intake boundary (0 of 579 live rows carried derivation/media provenance). These tests pin the
// contract-shaped output that now reaches research_objects.meta.ext.

test("buildIntakeMeta: Golden A preserves the semantic operand origin of the quantity 6 (§7.1)", () => {
  const kase = buildResearchCase({ raw: SPECIMEN_A });
  const meta = buildIntakeMeta(kase);
  const inputs = meta.ext.derivation.inputs;
  assert.ok(inputs.length >= 1, "at least one derivation input persisted");
  const six = inputs.find((i) => i.value === 6);
  assert.ok(six, "the quantity 6 itself is persisted, not only the arithmetic");
  assert.equal(six.origin_type, "source_declared_quantity");
  assert.equal(six.status, "source_explicit");
  assert.match(six.origin_statement, /פאות/, "WHY the 6 is present survives, not just its value");
  assert.ok(six.origin_ref && Number.isInteger(six.origin_ref.source_line_index));
});

test("buildIntakeMeta: Golden A preserves the unresolved media marker (§7.2)", () => {
  const kase = buildResearchCase({ raw: SPECIMEN_A });
  const meta = buildIntakeMeta(kase);
  const refs = meta.ext.media_refs;
  const img = refs.find((r) => r.raw === "[Image 3848.jpg]");
  assert.ok(img, "the raw marker is preserved verbatim");
  assert.equal(img.resolution_status, "unresolved");
  assert.equal(img.resolved_url, null, "no URL is invented");
  assert.equal(img.filename, "3848.jpg");
});

test("buildIntakeMeta: Golden A carries fidelity_status=partial to the Human Gate (§7.3)", () => {
  const kase = buildResearchCase({ raw: SPECIMEN_A });
  const ei = buildIntakeMeta(kase).ext.extraction_integrity;
  assert.equal(ei.arithmetic_verified, true, "arithmetic did verify");
  assert.equal(ei.media_reference_coverage, "partial");
  assert.equal(ei.fidelity_status, "partial",
    "ENGINE_VERIFIED arithmetic must NOT be reported as extraction-complete while media is unresolved");
  assert.equal(ei.contract, "research_intake_foundation_contract §7.1-§7.3");
});

test("buildIntakeMeta: never invents semantics — role stays null and unresolved stays unresolved (PR1)", () => {
  const kase = buildResearchCase({ raw: SPECIMEN_A });
  for (const i of buildIntakeMeta(kase).ext.derivation.inputs) {
    assert.equal(i.role, null, "no semantic role is fabricated by the projection");
    assert.ok(["source_declared_quantity", "source_context_candidate", "unresolved"].includes(i.origin_type));
  }
});

test("buildIntakeMeta: returns {} for material with nothing to preserve (no meta pollution)", () => {
  // The §7.3 gate targets COMPLEX sources. computeExtractionIntegrity() legitimately reports
  // "partial" when there is no claim at all (arithmeticVerified=false), but stamping that on every
  // trivial observation would be noise AND would wrongly block canonicalization of perfectly sound
  // simple material. So extraction_integrity is persisted only when a compound claim or a media
  // reference actually exists.
  const kase = buildResearchCase({ raw: "שלום וברכה, תודה רבה!" });
  assert.equal(kase.extractionIntegrity.fidelityStatus, "partial", "computed value is unchanged");
  assert.deepEqual(buildIntakeMeta(kase), {}, "but nothing is persisted, so the gate cannot misfire");
});

test("buildIntakeMeta: Golden B pentagon also preserves its media marker unresolved", () => {
  const kase = buildResearchCase({ raw: SPECIMEN_B });
  const meta = buildIntakeMeta(kase);
  assert.ok(meta.ext.media_refs.some((r) => r.raw === "[Image 3850.jpg]" && r.resolution_status === "unresolved"));
  assert.equal(meta.ext.extraction_integrity.fidelity_status, "partial");
});

test("R26 provenance: a whole equation value is not an unexplained external quantity", () => {
  const kase=buildResearchCase({raw:"חזק+חזק+חזק=345"});
  const claim=kase.compoundClaims[0].compound;
  assert.equal(claim.numericLiterals[0].status,"unresolved", "historical evidence is preserved");
  assert.deepEqual(claim.numericOccurrences[0].astPath,[]);
  assert.equal(claim.numericOccurrences[0].syntacticRole,"equation_value");
  assert.equal(claim.numericOccurrences[0].verifiedByLink,0);
  assert.equal(kase.extractionIntegrity.fidelityStatus,"complete");
  const meta=buildIntakeMeta(kase);
  assert.deepEqual(meta.ext.derivation.inputs,[]);
  assert.equal(meta.ext.derivation.outputs[0].value,345);
  assert.equal(meta.ext.derivation.outputs[0].calculation_match,true);
  assert.equal(meta.ext.derivation.outputs[0].origin_statement,"חזק+חזק+חזק=345");
});

test("R26 provenance: repeated numeric inputs retain distinct AST positions and unresolved origins", () => {
  const kase=buildResearchCase({raw:'393+393=תשפ"ו=786'});
  const claim=kase.compoundClaims[0].compound, meta=buildIntakeMeta(kase);
  assert.equal(claim.numericLiterals.length,2, "old value grouping retained for compatibility only");
  assert.equal(claim.numericOccurrences.length,3);
  assert.deepEqual(meta.ext.derivation.inputs.map(p=>p.value),[393,393]);
  assert.deepEqual(meta.ext.derivation.inputs.map(p=>p.expression_ref.ast_path),[["a"],["b"]]);
  assert.ok(meta.ext.derivation.inputs.every(p=>p.role===null && p.status==="unresolved"));
  assert.equal(meta.ext.derivation.outputs[0].calculation_match,true);
  assert.equal(meta.ext.extraction_integrity.arithmetic_verified,true);
  assert.equal(meta.ext.extraction_integrity.fidelity_status,"partial");
});

test("R26 provenance: the same number as input and equation value never shares an origin", () => {
  const kase=buildResearchCase({raw:"0+1=1"});
  const meta=buildIntakeMeta(kase);
  assert.deepEqual(meta.ext.derivation.inputs.map(p=>p.value),[0,1]);
  assert.equal(meta.ext.derivation.outputs[0].value,1);
  assert.equal(meta.ext.extraction_integrity.fidelity_status,"partial");
});

test("R26 provenance: first and intermediate equality-side values keep their exact positions", () => {
  const c=extractCompoundClaims("345=חזק+חזק+חזק=345")[0];
  assert.deepEqual(c.numericOccurrences.map(p=>p.linkIndex),[0,2]);
  assert.deepEqual(c.numericOccurrences.map(p=>p.verifiedByLink),[1,1]);
  assert.equal(computeExtractionIntegrity([c],[]).fidelityStatus,"complete");
});

test("R26 provenance: nested operation paths preserve order, not just a set of values", () => {
  const c=extractCompoundClaims("(1+2)+(1+2)=6")[0];
  const inputs=c.numericOccurrences.filter(p=>p.syntacticRole==="arithmetic_input");
  assert.deepEqual(inputs.map(p=>p.value),[1,2,1,2]);
  assert.deepEqual(inputs.map(p=>p.astPath),[["a","a"],["a","b"],["b","a"],["b","b"]]);
  assert.equal(computeExtractionIntegrity([c],[]).fidelityStatus,"partial");
});

test("R35 provenance: vertical arithmetic preserves line evidence and repeated inputs", () => {
  const kase=buildResearchCase({raw:"72\n72\n=\n144"});
  const c=kase.compoundClaims.map(c=>c.compound).find(c=>c.kind==="vertical-chain");
  assert.equal(c.linesUsed.length,4);
  assert.equal(c.syntheticPlusCount,1);
  const inputs=buildIntakeMeta(kase).ext.derivation.inputs;
  assert.equal(inputs.length,2);
  assert.ok(inputs.every(p=>p.value===72 && p.expression_ref.expression.includes(" | ")));
  assert.equal(kase.extractionIntegrity.fidelityStatus,"partial");
});

test("matching another equality link never overrides a mismatch in this claim", () => {
  const c=extractCompoundClaims("חזק+חזק+חזק=345=346")[0];
  const ei=computeExtractionIntegrity([c],[]);
  assert.equal(c.status,"ENGINE_MISMATCH");
  assert.equal(ei.arithmeticVerified,false);
  assert.equal(ei.fidelityStatus,"partial");
});

test("equation value without an independently evaluated side fails closed", () => {
  const c=extractCompoundClaims("חזק+חזק+חזק=345")[0];
  for (const value of [null,-1,1,20]) {
    const copy=structuredClone(c); copy.numericOccurrences[0].verifiedByLink=value;
    assert.equal(computeExtractionIntegrity([copy],[]).fidelityStatus,"partial");
  }
  const historical=structuredClone(c); delete historical.numericOccurrences;
  assert.equal(computeExtractionIntegrity([historical],[]).fidelityStatus,"partial");
});

test("source-context candidate or missing origin status cannot claim semantic completeness", () => {
  const c=extractCompoundClaims("6 × ישר = 3060")[0];
  for (const status of ["source_context_candidate","unresolved",undefined,"invented"]) {
    const copy=structuredClone(c); copy.quantityProvenance.status=status;
    assert.equal(computeExtractionIntegrity([copy],[]).fidelityStatus,"partial");
  }
});

test("complete equation slice does not make missing source media complete", () => {
  const kase=buildResearchCase({raw:"חזק+חזק+חזק=345\n[Image missing.jpg]"});
  assert.equal(kase.extractionIntegrity.arithmeticVerified,true);
  assert.equal(kase.extractionIntegrity.semanticOperandCoverage,"complete");
  assert.equal(kase.extractionIntegrity.mediaReferenceCoverage,"partial");
  assert.equal(buildIntakeMeta(kase).ext.extraction_integrity.fidelity_status,"partial");
});
