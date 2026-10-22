// Publication-review projection tests. Every fixture is synthetic.
// Run with: node --test src/lib/research/bookPublicationReviewProjection.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_BOOK_PUBLICATION_REVIEW_LIMIT,
  projectBookPublicationReview,
} from "./bookPublicationReviewProjection.js";

const BOOK = {
  identity_key: "book:synthetic-review",
  metadata: { source_ref_prefixes: ["book:synthetic:review"] },
};

function row(id, overrides = {}) {
  return {
    id,
    created_at: "2026-10-22T10:00:00Z",
    kind: "observation",
    statement: `טענת ביקורת סינתטית ${id}`,
    terms: ["בדיקה"],
    value: null,
    source_ref: `book:synthetic:review#p${id}:claim`,
    confidence: null,
    engine_verified: false,
    engine_detail: { verification_state: "not_applicable", hidden: "must-not-leak" },
    status: "candidate",
    privacy_scope: "public_candidate",
    contributor: "must-not-leak",
    meta: { hidden: "must-not-leak" },
    ...overrides,
  };
}

test("review projection accepts only public candidates from the requested Book", () => {
  const result = projectBookPublicationReview([
    row("1"),
    row("2", { privacy_scope: "public" }),
    row("3", { privacy_scope: "private" }),
    row("4", { source_ref: "book:synthetic:foreign#p4:claim" }),
  ], { book: BOOK });

  assert.deepEqual(result.items.map(item => item.id), ["1"]);
  assert.equal(result.accessMode, "authorized_review");
  assert.equal(result.publicationEffect, "none");
});

test("a technically complete candidate is ready for human review, never auto-approved", () => {
  const item = projectBookPublicationReview([row("1")], { book: BOOK }).items[0];
  assert.equal(item.review.readiness, "ready_for_human_review");
  assert.deepEqual(item.review.needsRepair, []);
  assert.equal(item.humanGateRequired, true);
  assert.equal(item.decision, null);
  assert.equal(item.status.candidacy.publication, true);
  assert.equal(item.status.publicationAccess.isPublic, false);
});

test("engine match and canonical governance still do not publish a candidate", () => {
  const item = projectBookPublicationReview([row("1", {
    engine_verified: true,
    engine_detail: { verification_state: "match" },
    status: "canonical",
  })], { book: BOOK }).items[0];

  assert.equal(item.status.verification.isEngineMatch, true);
  assert.equal(item.status.governance.state, "canonical");
  assert.equal(item.status.publicationAccess.state, "public_candidate");
  assert.equal(item.status.publicationAccess.isPublic, false);
  assert.equal(item.decision, null);
});

test("missing required evidence is surfaced as repair work", () => {
  const result = projectBookPublicationReview([row("1", {
    statement: "",
    engine_detail: {},
    status: null,
  })], { book: BOOK });
  const item = result.items[0];

  assert.equal(item.review.readiness, "needs_repair_before_human_review");
  assert.deepEqual(item.review.needsRepair, [
    "statementPresent",
    "verificationDeclared",
    "governanceDeclared",
  ]);
  assert.equal(result.summary.needsRepair, 1);
});

test("exact duplicate claims are flagged but never silently removed", () => {
  const first = row("1");
  const second = row("2", { source_ref: first.source_ref, statement: first.statement });
  const result = projectBookPublicationReview([first, second], { book: BOOK });

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].review.checks.exactDuplicateAbsent, false);
  assert.equal(result.items[1].review.checks.exactDuplicateAbsent, false);
  assert.equal(result.summary.needsRepair, 2);
});

test("review output uses a fixed field set and excludes raw metadata", () => {
  const item = projectBookPublicationReview([row("1")], { book: BOOK }).items[0];
  assert.deepEqual(Object.keys(item), [
    "id", "createdAt", "kind", "statement", "terms", "value", "sourceRef",
    "sourceLocator", "confidence", "status", "review", "humanGateRequired", "decision",
  ]);
  assert.equal("meta" in item, false);
  assert.equal("contributor" in item, false);
  assert.equal("engine_detail" in item, false);
  assert.equal(JSON.stringify(item).includes("must-not-leak"), false);
});

test("summary preserves truth-axis distribution and distinct source count", () => {
  const result = projectBookPublicationReview([
    row("1", { kind: "fact", engine_detail: { verification_state: "match" } }),
    row("2", { kind: "observation" }),
    row("3", { kind: "observation", source_ref: "book:synthetic:review#p2:second" }),
  ], { book: BOOK });

  assert.deepEqual(result.summary, {
    totalCandidates: 3,
    readyForHumanReview: 3,
    needsRepair: 0,
    byKind: { fact: 1, observation: 2 },
    byVerificationState: { match: 1, not_applicable: 2 },
    distinctSourceRefs: 3,
  });
});

test("focus and paging cannot bypass candidate or Book filters", () => {
  const rows = [row("1"), row("2"), row("3", { privacy_scope: "private" })];
  const result = projectBookPublicationReview(rows, {
    book: BOOK,
    offset: 1,
    limit: 1,
    focusId: "1",
  });
  assert.deepEqual(result.items.map(item => item.id), ["2"]);
  assert.equal(result.focusedItem.id, "1");
  assert.equal(projectBookPublicationReview(rows, { book: BOOK, focusId: "3" }).focusedItem, null);
  assert.equal(projectBookPublicationReview(rows, { book: BOOK, limit: 1000 }).page.limit, MAX_BOOK_PUBLICATION_REVIEW_LIMIT);
});

test("missing Book scope fails closed", () => {
  const result = projectBookPublicationReview([row("1")]);
  assert.deepEqual(result.items, []);
  assert.equal(result.summary.totalCandidates, 0);
  assert.equal(result.publicationEffect, "none");
});
