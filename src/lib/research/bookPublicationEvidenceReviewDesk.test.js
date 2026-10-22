// Protected review-desk loader tests. All data and readers are synthetic.
// Run with: node --test src/lib/research/bookPublicationEvidenceReviewDesk.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_BOOK_RESEARCH_LIMIT } from "./bookResearchProjection.js";
import { loadBookPublicationEvidenceReviewDesk } from "./bookPublicationEvidenceReviewDesk.js";

const BOOK = {
  id: "synthetic-book-id",
  label: "ספר בדיקה סינתטי",
  identity_key: "book:synthetic-evidence-desk",
  metadata: { source_ref_prefixes: ["book:synthetic:evidence-desk"] },
};

function row(id, overrides = {}) {
  return {
    id,
    created_at: "2026-10-23T09:00:00Z",
    kind: "observation",
    statement: `טענה סינתטית ${id}`,
    terms: ["בדיקה"],
    value: null,
    source_ref: `book:synthetic:evidence-desk#p${id}:claim`,
    engine_verified: false,
    engine_detail: { verification_state: "not_applicable" },
    status: "candidate",
    privacy_scope: "public_candidate",
    ...overrides,
  };
}

test("admin verification runs before Book resolution and denial fails closed", async () => {
  const calls = [];
  const result = await loadBookPublicationEvidenceReviewDesk("synthetic", {
    verifyAdminAccess: async () => { calls.push("admin"); return false; },
    readBookEntity: async () => { calls.push("book"); return BOOK; },
    readBookResearch: async () => { calls.push("research"); return { rows: [row("1")] }; },
  });

  assert.deepEqual(calls, ["admin"]);
  assert.equal(result.phase, "restricted");
  assert.equal(result.restriction, "admin");
  assert.equal(result.reviewPacket, null);
  assert.equal(result.evidencePacket, null);
  assert.equal(result.publicationEffect, "none");
});

test("missing Book identity stops before protected research", async () => {
  let researchCalls = 0;
  const result = await loadBookPublicationEvidenceReviewDesk("missing", {
    verifyAdminAccess: async () => true,
    readBookEntity: async slug => {
      assert.equal(slug, "missing");
      return null;
    },
    readBookResearch: async () => {
      researchCalls++;
      return { rows: [row("1")] };
    },
  });

  assert.equal(researchCalls, 0);
  assert.equal(result.phase, "unavailable");
  assert.equal(result.book, null);
});

test("one bounded authorized snapshot feeds aligned review and evidence packets", async () => {
  const calls = [];
  const result = await loadBookPublicationEvidenceReviewDesk(" synthetic ", {
    limit: 2,
    offset: 0,
    focusId: "2",
    verifyAdminAccess: async () => { calls.push("admin"); return true; },
    readBookEntity: async slug => { calls.push(`book:${slug}`); return BOOK; },
    readBookResearch: async (book, options) => {
      calls.push("research");
      assert.equal(book, BOOK);
      assert.deepEqual(options, { limit: MAX_BOOK_RESEARCH_LIMIT, focusId: "2" });
      return {
        rows: [row("1"), row("2"), row("3", { privacy_scope: "public" })],
        findings: [{ secret: "must-not-leak" }],
        restricted: false,
        truncated: false,
        focusIncluded: true,
      };
    },
  });

  assert.deepEqual(calls, ["admin", "book:synthetic", "research"]);
  assert.equal(result.phase, "ready");
  assert.equal(result.book, BOOK);
  assert.deepEqual(result.reviewPacket.items.map(item => item.id), ["1", "2"]);
  assert.deepEqual(result.evidencePacket.packets.map(packet => packet.id), ["1", "2"]);
  assert.equal(result.reviewPacket.focusedItem.id, "2");
  assert.equal(result.evidencePacket.focusedPacket.id, "2");
  assert.equal(result.source.focusIncluded, true);
  assert.equal(result.publicationEffect, "none");
  assert.equal("rows" in result, false);
  assert.equal("findings" in result, false);
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
});

test("RLS restriction returns no Book identity or candidate material", async () => {
  const result = await loadBookPublicationEvidenceReviewDesk("synthetic", {
    verifyAdminAccess: async () => true,
    readBookEntity: async () => BOOK,
    readBookResearch: async () => ({
      rows: [row("1")],
      restricted: true,
      truncated: false,
      focusIncluded: false,
    }),
  });

  assert.equal(result.phase, "restricted");
  assert.equal(result.restriction, "reader");
  assert.equal(result.book, null);
  assert.equal(result.reviewPacket, null);
  assert.equal(result.evidencePacket, null);
});

test("truncation remains explicit on the desk and both packets stay non-publishing", async () => {
  const result = await loadBookPublicationEvidenceReviewDesk("synthetic", {
    verifyAdminAccess: async () => true,
    readBookEntity: async () => BOOK,
    readBookResearch: async () => ({ rows: [row("1")], restricted: false, truncated: true }),
  });

  assert.equal(result.phase, "ready");
  assert.equal(result.partial, true);
  assert.equal(result.source.truncated, true);
  assert.equal(result.reviewPacket.publicationEffect, "none");
  assert.equal(result.evidencePacket.publicationEffect, "none");
});

test("paging is shared without widening the bounded source read", async () => {
  const result = await loadBookPublicationEvidenceReviewDesk("synthetic", {
    limit: 1,
    offset: 1,
    verifyAdminAccess: async () => true,
    readBookEntity: async () => BOOK,
    readBookResearch: async () => ({ rows: [row("1"), row("2"), row("3")], restricted: false }),
  });

  assert.deepEqual(result.reviewPacket.items.map(item => item.id), ["2"]);
  assert.deepEqual(result.evidencePacket.packets.map(packet => packet.id), ["2"]);
  assert.deepEqual(result.reviewPacket.page, result.evidencePacket.page);
});

test("shared default paging keeps more than fifty authorized candidates aligned", async () => {
  const rows = Array.from({ length: 60 }, (_, index) => row(String(index + 1)));
  const result = await loadBookPublicationEvidenceReviewDesk("synthetic", {
    verifyAdminAccess: async () => true,
    readBookEntity: async () => BOOK,
    readBookResearch: async () => ({ rows, restricted: false }),
  });

  assert.equal(result.reviewPacket.items.length, 50);
  assert.equal(result.evidencePacket.packets.length, 50);
  assert.deepEqual(
    result.reviewPacket.items.map(item => item.id),
    result.evidencePacket.packets.map(packet => packet.id),
  );
  assert.equal(result.reviewPacket.page.total, 60);
  assert.equal(result.evidencePacket.page.total, 60);
});

test("reader and verifier failures propagate for the screen error boundary", async () => {
  await assert.rejects(
    loadBookPublicationEvidenceReviewDesk("synthetic", {
      verifyAdminAccess: async () => { throw new Error("synthetic admin failure"); },
    }),
    /synthetic admin failure/,
  );
  await assert.rejects(
    loadBookPublicationEvidenceReviewDesk("synthetic", {
      verifyAdminAccess: async () => true,
      readBookEntity: async () => BOOK,
      readBookResearch: async () => { throw new Error("synthetic reader failure"); },
    }),
    /synthetic reader failure/,
  );
});
