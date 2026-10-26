// Runtime seam tests. Readers and content are fully synthetic; no network is used.
// Run with: node --test src/lib/research/bookPublicationReviewReader.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_BOOK_RESEARCH_LIMIT } from "./bookResearchProjection.js";
import { loadBookPublicationReview } from "./bookPublicationReviewReader.js";

const BOOK = {
  identity_key: "book:synthetic-review-reader",
  metadata: { source_ref_prefixes: ["book:synthetic:review-reader"] },
};

function row(id, overrides = {}) {
  return {
    id,
    kind: "observation",
    statement: `טענה סינתטית ${id}`,
    terms: ["בדיקה"],
    source_ref: `book:synthetic:review-reader#p${id}:claim`,
    engine_verified: false,
    engine_detail: { verification_state: "not_applicable" },
    status: "candidate",
    privacy_scope: "public_candidate",
    ...overrides,
  };
}

test("reader composes the existing authorized Book reader into a safe review packet", async () => {
  const calls = [];
  const result = await loadBookPublicationReview(BOOK, {
    focusId: "1",
    verifyAdminAccess: async () => true,
    readBookResearch: async (book, options) => {
      calls.push({ book, options });
      return {
        rows: [row("1")],
        findings: [{ secret: "must-not-leak" }],
        restricted: false,
        truncated: false,
        focusIncluded: true,
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].book, BOOK);
  assert.deepEqual(calls[0].options, { limit: MAX_BOOK_RESEARCH_LIMIT, focusId: "1" });
  assert.deepEqual(result.items.map(item => item.id), ["1"]);
  assert.equal(result.focusedItem.id, "1");
  assert.equal(result.availability, "available");
  assert.equal(result.partial, false);
  assert.equal("rows" in result, false);
  assert.equal("findings" in result, false);
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
});

test("restricted access fails closed without projecting supplied rows", async () => {
  const result = await loadBookPublicationReview(BOOK, {
    verifyAdminAccess: async () => true,
    readBookResearch: async () => ({
      rows: [row("1")],
      restricted: true,
      truncated: false,
      focusIncluded: false,
    }),
  });

  assert.equal(result.availability, "restricted");
  assert.deepEqual(result.items, []);
  assert.equal(result.summary.totalCandidates, 0);
  assert.deepEqual(result.source, {
    adminVerified: true,
    restricted: true,
    truncated: false,
    focusIncluded: false,
  });
});

test("public, private and foreign rows cannot enter the publication-candidate review", async () => {
  const result = await loadBookPublicationReview(BOOK, {
    verifyAdminAccess: async () => true,
    readBookResearch: async () => ({
      rows: [
        row("1"),
        row("2", { privacy_scope: "public" }),
        row("3", { privacy_scope: "private" }),
        row("4", { source_ref: "book:synthetic:foreign#p4:claim" }),
      ],
      restricted: false,
    }),
  });

  assert.deepEqual(result.items.map(item => item.id), ["1"]);
  assert.equal(result.publicationEffect, "none");
});

test("source truncation is explicit and never presented as a complete packet", async () => {
  const result = await loadBookPublicationReview(BOOK, {
    verifyAdminAccess: async () => true,
    readBookResearch: async () => ({ rows: [row("1")], restricted: false, truncated: true }),
  });
  assert.equal(result.partial, true);
  assert.equal(result.source.truncated, true);
});

test("paging is applied after access and candidate filtering", async () => {
  const result = await loadBookPublicationReview(BOOK, {
    offset: 1,
    limit: 1,
    verifyAdminAccess: async () => true,
    readBookResearch: async () => ({ rows: [row("1"), row("2"), row("3")], restricted: false }),
  });
  assert.deepEqual(result.items.map(item => item.id), ["2"]);
  assert.deepEqual(result.page, { offset: 1, limit: 1, total: 3, hasMore: true });
});

test("reader failures propagate instead of degrading into an unsafe fallback", async () => {
  await assert.rejects(
    loadBookPublicationReview(BOOK, {
      verifyAdminAccess: async () => true,
      readBookResearch: async () => { throw new Error("synthetic reader failure"); },
    }),
    /synthetic reader failure/,
  );
});

test("server-derived admin denial stops before the research reader", async () => {
  let readerCalls = 0;
  const result = await loadBookPublicationReview(BOOK, {
    verifyAdminAccess: async () => false,
    readBookResearch: async () => {
      readerCalls++;
      return { rows: [row("1")], restricted: false };
    },
  });

  assert.equal(readerCalls, 0);
  assert.equal(result.availability, "restricted");
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.source, {
    adminVerified: false,
    restricted: true,
    truncated: false,
    focusIncluded: false,
  });
});

test("admin verification failure is fail-closed and stops before the reader", async () => {
  let readerCalls = 0;
  const result = await loadBookPublicationReview(BOOK, {
    verifyAdminAccess: async () => { throw new Error("synthetic auth failure"); },
    readBookResearch: async () => {
      readerCalls++;
      return { rows: [row("1")], restricted: false };
    },
  }).catch(() => null);

  // Injected verifier errors are visible to the caller; the source reader is still untouched.
  assert.equal(result, null);
  assert.equal(readerCalls, 0);
});
