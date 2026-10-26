// Public Book material projection tests. Every fixture is synthetic.
// Run with: node --test src/lib/research/bookPublicMaterialProjection.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PUBLIC_BOOK_MATERIAL_LIMIT,
  MAX_PUBLIC_BOOK_MATERIAL_LIMIT,
  describeBookMaterialStatus,
  projectBookPublicMaterial,
  sourceRefBelongsToBook,
} from "./bookPublicMaterialProjection.js";

const BOOK = {
  identity_key: "book:synthetic-a",
  metadata: { source_ref_prefixes: ["book:synthetic:a"] },
};

function row(id, overrides = {}) {
  return {
    id,
    created_at: `2026-10-${String(10 + Number(id.replace(/\D/g, "") || 0)).padStart(2, "0")}T10:00:00Z`,
    kind: "observation",
    statement: `תוכן סינתטי ${id}`,
    terms: ["בדיקה"],
    value: 1820,
    source_ref: `book:synthetic:a#p${id}:block`,
    confidence: 0.8,
    engine_verified: false,
    engine_detail: { verification_state: "not_tested", engine_result: "must-not-leak" },
    status: "candidate",
    privacy_scope: "private",
    contributor: "must-not-leak",
    meta: { secret: "must-not-leak" },
    ...overrides,
  };
}

test("status map keeps ingestion, verification, governance candidacy and publication access separate", () => {
  const status = describeBookMaterialStatus(row("1", {
    engine_verified: true,
    engine_detail: { verification_state: "match" },
    status: "candidate",
    privacy_scope: "public_candidate",
  }));

  assert.equal(status.ingested, true);
  assert.equal(status.verification.isEngineMatch, true);
  assert.equal(status.verification.compatibilityVerified, true);
  assert.equal(status.candidacy.governance, true);
  assert.equal(status.candidacy.publication, true);
  assert.equal(status.publicationAccess.isPublic, false);
});

test("missing semantic values stay null and never become verified or public", () => {
  const status = describeBookMaterialStatus({ id: "x", source_ref: "book:synthetic:a#p1:x" });
  assert.equal(status.verification.state, null);
  assert.equal(status.verification.compatibilityVerified, null);
  assert.equal(status.governance.state, null);
  assert.equal(status.publicationAccess.state, null);
  assert.equal(status.publicationAccess.isPublic, false);
});

test("book source matching is boundary-aware", () => {
  assert.equal(sourceRefBelongsToBook("book:synthetic:a#p1:x", ["book:synthetic:a"]), true);
  assert.equal(sourceRefBelongsToBook("book:synthetic:a:chapter", ["book:synthetic:a"]), true);
  assert.equal(sourceRefBelongsToBook("book:synthetic:ab#p1:x", ["book:synthetic:a"]), false);
  assert.equal(sourceRefBelongsToBook("", ["book:synthetic:a"]), false);
});

test("only explicitly public rows from the requested Book enter the projection", () => {
  const rows = [
    row("1", { privacy_scope: "public", status: "candidate" }),
    row("2", { privacy_scope: "public_candidate", engine_verified: true, engine_detail: { verification_state: "match" } }),
    row("3", { privacy_scope: "private", status: "canonical" }),
    row("4", { privacy_scope: "public", source_ref: "book:synthetic:b#p4:block" }),
    row("5", { privacy_scope: "public", source_ref: null }),
  ];

  const result = projectBookPublicMaterial(rows, { book: BOOK });
  assert.deepEqual(result.items.map(item => item.id), ["1"]);
  assert.equal(result.items[0].status.governance.state, "candidate");
  assert.equal(result.items[0].status.publicationAccess.isPublic, true);
});

test("anonymous, authenticated and admin callers cannot widen the public projection", () => {
  const rows = [
    row("1", { privacy_scope: "public" }),
    row("2", { privacy_scope: "private" }),
    row("3", { privacy_scope: "public_candidate" }),
  ];
  const projections = ["anonymous", "authenticated", "admin"].map(audience => (
    projectBookPublicMaterial(rows, { book: BOOK, audience })
  ));
  assert.deepEqual(projections[0], projections[1]);
  assert.deepEqual(projections[1], projections[2]);
  assert.deepEqual(projections[0].items.map(item => item.id), ["1"]);
});

test("public items expose a fixed safe field set and never return raw metadata", () => {
  const result = projectBookPublicMaterial([row("1", { privacy_scope: "public" })], { book: BOOK });
  const item = result.items[0];
  assert.deepEqual(Object.keys(item), [
    "id", "createdAt", "kind", "statement", "terms", "value", "sourceRef",
    "sourceLocator", "confidence", "status",
  ]);
  assert.equal("meta" in item, false);
  assert.equal("contributor" in item, false);
  assert.equal("engine_detail" in item, false);
  assert.equal(JSON.stringify(item).includes("must-not-leak"), false);
});

test("deep-link focus cannot bypass Book or public access filters", () => {
  const publicRow = row("1", { privacy_scope: "public" });
  const privateRow = row("2", { privacy_scope: "private" });
  const foreignRow = row("3", { privacy_scope: "public", source_ref: "book:synthetic:b#p3:block" });

  assert.equal(projectBookPublicMaterial([publicRow, privateRow], { book: BOOK, focusId: "2" }).focusedItem, null);
  assert.equal(projectBookPublicMaterial([publicRow, foreignRow], { book: BOOK, focusId: "3" }).focusedItem, null);
  assert.equal(projectBookPublicMaterial([publicRow], { book: BOOK, focusId: "1" }).focusedItem.id, "1");
});

test("paging is deterministic and bounded while focus may resolve outside the page", () => {
  const rows = [1, 2, 3].map(id => row(String(id), { privacy_scope: "public" }));
  const result = projectBookPublicMaterial(rows, { book: BOOK, offset: 1, limit: 1, focusId: "1" });
  assert.deepEqual(result.items.map(item => item.id), ["2"]);
  assert.equal(result.focusedItem.id, "1");
  assert.deepEqual(result.page, { offset: 1, limit: 1, total: 3, hasMore: true });

  assert.equal(projectBookPublicMaterial(rows, { book: BOOK, limit: 1000 }).page.limit, MAX_PUBLIC_BOOK_MATERIAL_LIMIT);
  assert.equal(projectBookPublicMaterial(rows, { book: BOOK, limit: "invalid" }).page.limit, DEFAULT_PUBLIC_BOOK_MATERIAL_LIMIT);
});

test("missing Book scope fails closed instead of producing an all-books dump", () => {
  const result = projectBookPublicMaterial([row("1", { privacy_scope: "public" })]);
  assert.deepEqual(result.items, []);
  assert.equal(result.focusedItem, null);
  assert.equal(result.page.total, 0);
});
