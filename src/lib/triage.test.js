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
