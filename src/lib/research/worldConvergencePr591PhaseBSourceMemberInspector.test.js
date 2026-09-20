// Focused fixtures for G3_WORLD_CONVERGENCE_PR591_PHASE_B_SOURCE_MEMBER_INSPECTOR — run with:
//   node --test src/lib/research/worldConvergencePr591PhaseBSourceMemberInspector.test.js
// Node's built-in runner (node:test + assert/strict), same convention as sibling research tests.
//
// Scope: Source/Member Inspector projection only (worldConvergenceLensProjection.js). Every
// fixture below is SYNTHETIC — no real research_objects/channel_updates/topic_cards row is
// copied. Reuses the already-authorized allResearchProjection shape from
// worldAllResearchProjection.js; no second network/DB read, no store/RPC/schema.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorldAllResearchProjection } from "./worldAllResearchProjection.js";
import {
  buildWorldConvergenceLensProjection,
  buildZviCoverage,
  filterWorldConvergenceRows,
} from "./worldConvergenceLensProjection.js";

const S1 = "aaaaaaaa-0001-4aaa-8aaa-aaaaaaaaaaa1";
const S2 = "aaaaaaaa-0002-4aaa-8aaa-aaaaaaaaaaa2";
const S3 = "aaaaaaaa-0003-4aaa-8aaa-aaaaaaaaaaa3";

// ── (1) exact base source identity: a relation sourceRef fragment resolves to the base
//        source_message occurrence, never by fuzzy text matching ─────────────────────────
test("relation sourceRef fragment resolves to the exact base source occurrence, full wording preserved", () => {
  const material = buildWorldAllResearchProjection({
    researchObjects: [{
      id: "rel-frag", created_at: "2026-09-20T04:00:00Z", kind: "relation",
      statement: "יחס עם מקור מקוטע", value: 811, status: "candidate",
      contributor: "חוקר א", engine_detail: { verification_state: "match" },
      source_ref: "channel_updates:" + S1 + "#semantic/batch",
      meta: { source_refs: ["channel_updates:" + S1 + "#semantic/batch"] },
    }],
    sourceMessages: [
      { id: S1, created_at: "2026-09-20T01:00:00Z", text: "הניסוח המלא של המקור המקורי, בלי קיצור.", status: "live", credit: "צבי (OPOC)", channel: "torat-haremez" },
      { id: S2, created_at: "2026-09-19T01:00:00Z", text: "מקור לא קשור", status: "live", credit: "אחר", channel: "torat-haremez" },
    ],
  }, { researchObjects: 1, sourceMessages: 2 });

  const lens = buildWorldConvergenceLensProjection(material);
  const row = lens.rows.find((r) => r.id === "research:rel-frag");
  assert.equal(row.resolvedSources.length, 1, "the fragment must collapse to exactly one base source occurrence");
  const occurrence = row.resolvedSources[0];
  assert.equal(occurrence.baseRef, "channel_updates:" + S1, "base identity strips the #fragment");
  assert.equal(occurrence.resolved, true);
  assert.equal(occurrence.statement, "הניסוח המלא של המקור המקורי, בלי קיצור.", "full source wording must be preserved, not truncated/summarized");
  assert.equal(occurrence.contributor, "צבי (OPOC)");
  assert.ok(occurrence.createdAt, "source timestamp must be preserved");
});

// ── (2) a sourceRef whose base identity is not in the loaded material stays inspectable
//        as unresolved, rather than being silently dropped or fuzzy-matched ───────────────
test("an unresolved source occurrence is reported, not dropped or fuzzy-matched", () => {
  const material = buildWorldAllResearchProjection({
    researchObjects: [{
      id: "rel-missing-source", created_at: "2026-09-20T04:00:00Z", kind: "relation",
      statement: "יחס עם מקור שלא נטען", value: 900, status: "candidate",
      source_ref: "channel_updates:" + S3,
    }],
    sourceMessages: [],
  }, { researchObjects: 1, sourceMessages: 0 });

  const lens = buildWorldConvergenceLensProjection(material);
  const row = lens.rows.find((r) => r.id === "research:rel-missing-source");
  assert.equal(row.resolvedSources.length, 1);
  assert.equal(row.resolvedSources[0].resolved, false);
  assert.equal(row.resolvedSources[0].baseRef, "channel_updates:" + S3);
});

// ── (3) scope mismatch: a top-level explicit match never overrides a known per-scope
//        mismatch, and the raw engine + scoped states survive on the row for inspection ────
test("makeRelationRow preserves engineVerificationStateRaw and scopeVerificationStates even when composed verification is partial", () => {
  const material = buildWorldAllResearchProjection({
    researchObjects: [{
      id: "rel-scope-mismatch", created_at: "2026-09-20T04:00:00Z", kind: "relation",
      statement: "יחס עם mismatch בטווח מסוים", value: 417, status: "candidate",
      engine_verified: true, engine_detail: { verification_state: "match" },
      source_ref: "channel_updates:" + S1,
      meta: { ext: { batch_001b: { notarikon_verification_state: "mismatch" } } },
    }],
    sourceMessages: [],
  }, { researchObjects: 1 });

  const lens = buildWorldConvergenceLensProjection(material);
  const row = lens.rows.find((r) => r.id === "research:rel-scope-mismatch");
  assert.equal(row.verification, "partial_needs_review", "an explicit top-level match must never flatten a known scoped mismatch");
  assert.equal(row.engineVerificationStateRaw, "match", "the raw engine_detail state must still be inspectable, unflattened");
  assert.equal(row.scopeVerificationStates.length, 1);
  assert.equal(row.scopeVerificationStates[0].key, "notarikon_verification_state");
  assert.equal(row.scopeVerificationStates[0].state, "mismatch");
});

// ── (4) dependency family: parent + child stay separate rows, each member's own
//        verification/status/sourceRefs are individually inspectable ───────────────────────
test("dependency family members are all inspectable with their own state, none borrows a sibling's verification", () => {
  const material = buildWorldAllResearchProjection({
    researchObjects: [{
      id: "dep-parent", created_at: "2026-09-20T04:00:00Z", kind: "relation",
      statement: "הורה מאומת", value: 501, status: "candidate", contributor: "חוקר א",
      engine_verified: true, engine_detail: { verification_state: "match" },
      source_ref: "channel_updates:" + S1,
    }, {
      id: "dep-child", created_at: "2026-09-20T04:05:00Z", kind: "relation", parent_id: "dep-parent",
      statement: "צאצא עם סימון legacy בלבד", value: 501, status: "candidate", contributor: "חוקר ב",
      engine_verified: true, source_ref: "channel_updates:" + S2,
    }],
  }, { researchObjects: 2 });

  const lens = buildWorldConvergenceLensProjection(material);
  const parent = lens.rows.find((r) => r.id === "research:dep-parent");
  const child = lens.rows.find((r) => r.id === "research:dep-child");
  assert.equal(parent.dependency.memberCount, 2);
  assert.equal(child.dependency.memberCount, 2);
  assert.equal(parent.dependency.members.length, 2);
  const memberById = Object.fromEntries(parent.dependency.members.map((m) => [m.id, m]));
  assert.equal(memberById["research:dep-parent"].verification, "match");
  assert.equal(memberById["research:dep-child"].verification, "legacy_signal", "child's own legacy signal must not be promoted by grouping with a matched parent");
  assert.equal(memberById["research:dep-parent"].contributor, "חוקר א");
  assert.equal(memberById["research:dep-child"].contributor, "חוקר ב");
  assert.deepEqual(memberById["research:dep-child"].sourceRefs, ["channel_updates:" + S2]);
});

// ── (5) Research Candidates expose shared_sources and warnings, and generatedBy kept
//        strictly separate from the human/source-owned contributor ─────────────────────────
test("candidate row exposes shared_sources/warnings and keeps generatedBy separate from contributor", () => {
  const material = buildWorldAllResearchProjection({
    convergenceCandidates: [{
      id: "cand-shared", subject_ref: "1820", recommendation: "needs_check", conf: 0.5,
      created_at: "2026-09-20T04:00:00Z",
      why: {
        reason: "possible_duplicate", topic_slug: "t-1820", topic_title: "1820 חטיבה",
        generated_by: "gpt-research-agent", shared_sources: ["channel_updates:" + S1, "channel_updates:" + S2],
        warnings: ["low_independent_group_count"], paths: [{ contributor: "חוקר ג" }],
      },
    }],
  }, {});

  const lens = buildWorldConvergenceLensProjection(material);
  const row = lens.rows.find((r) => r.id === "candidate:cand-shared");
  assert.deepEqual(row.sharedSources, ["channel_updates:" + S1, "channel_updates:" + S2]);
  assert.deepEqual(row.warnings, ["low_independent_group_count"]);
  assert.equal(row.generatedBy, "gpt-research-agent");
  assert.equal(row.contributor, "חוקר ג", "source-owned contributor must never be replaced by the generating agent");
  assert.notEqual(row.generatedBy, row.contributor);
});

// ── (6) verification filter must include every live state — partial_needs_review,
//        legacy_signal and review_required must never be silently omitted ──────────────────
test("filterWorldConvergenceRows keeps every live verification state addressable, none hardcoded away", () => {
  const material = buildWorldAllResearchProjection({
    researchObjects: [{
      id: "rel-partial", created_at: "2026-09-20T04:00:00Z", kind: "relation", value: 1,
      engine_detail: { verification_state: "match" },
      meta: { ext: { scope_a: { notarikon_verification_state: "mismatch" } } },
    }, {
      id: "rel-legacy", created_at: "2026-09-20T04:01:00Z", kind: "relation", value: 2,
      engine_verified: true,
    }],
    convergenceCandidates: [{
      id: "cand-review", subject_ref: "3", recommendation: "needs_check", created_at: "2026-09-20T04:02:00Z",
      why: { reason: "" },
    }],
  }, { researchObjects: 2 });

  const lens = buildWorldConvergenceLensProjection(material);
  assert.equal(lens.byVerification.partial_needs_review, 1);
  assert.equal(lens.byVerification.legacy_signal, 1);
  assert.equal(lens.byVerification.review_required, 1);
  assert.equal(filterWorldConvergenceRows(lens.rows, { verification: "partial_needs_review" }).length, 1);
  assert.equal(filterWorldConvergenceRows(lens.rows, { verification: "legacy_signal" }).length, 1);
  assert.equal(filterWorldConvergenceRows(lens.rows, { verification: "review_required" }).length, 1);
});

// ── (7) compound source identity: same placeholder text with DIFFERENT media must never
//        be deduped, only a true text+media repeat collapses for attention/rank ────────────
test("buildZviCoverage never dedupes compound text+different-media source artifacts", () => {
  const material = buildWorldAllResearchProjection({
    sourceMessages: [
      { id: S1, created_at: "2026-09-20T01:00:00Z", text: "📷 עדכון", image_url: "https://example.com/one.jpg", credit: "צבי (OPOC)", channel: "torat-haremez" },
      { id: S2, created_at: "2026-09-19T01:00:00Z", text: "📷 עדכון", image_url: "https://example.com/two.jpg", credit: "צבי (OPOC)", channel: "torat-haremez" },
      { id: S3, created_at: "2026-09-18T01:00:00Z", text: "📷 עדכון", image_url: "https://example.com/two.jpg", credit: "צבי (OPOC)", channel: "torat-haremez" },
    ],
  }, { sourceMessages: 3 });

  const coverage = buildZviCoverage(material);
  assert.equal(coverage.totalSources, 3);
  assert.equal(coverage.unlinkedSources, 3);
  assert.equal(coverage.uniqueUnlinked, 2, "same text with two distinct media URLs must remain two distinct compound source artifacts");
  assert.equal(coverage.exactDuplicateOccurrences, 1, "only the exact text+media repeat (S2/S3) collapses");
});
