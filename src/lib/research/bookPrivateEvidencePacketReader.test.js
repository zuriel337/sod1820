// Private evidence-packet reader tests. No network or live content is used.
// Run with: node --test src/lib/research/bookPrivateEvidencePacketReader.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_BOOK_RESEARCH_LIMIT } from "./bookResearchProjection.js";
import { loadBookPrivateEvidencePackets } from "./bookPrivateEvidencePacketReader.js";

const BOOK = {
  identity_key: "book:synthetic-private-evidence-reader",
  metadata: { source_ref_prefixes: ["book:synthetic:private-evidence-reader"] },
};

function row(id, overrides = {}) {
  return {
    id,
    kind: "observation",
    statement: `טענה סינתטית ${id}`,
    terms: ["בדיקה"],
    source_ref: `book:synthetic:private-evidence-reader#p${id}:claim`,
    engine_verified: false,
    engine_detail: { verification_state: "not_applicable" },
    status: "candidate",
    privacy_scope: "public_candidate",
    ...overrides,
  };
}

test("reader composes the existing bounded authorized Book reader", async () => {
  const calls = [];
  const result = await loadBookPrivateEvidencePackets(BOOK, {
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
  assert.deepEqual(result.packets.map(packet => packet.id), ["1"]);
  assert.equal(result.focusedPacket.id, "1");
  assert.equal(result.availability, "available");
  assert.equal(result.partial, false);
  assert.equal("rows" in result, false);
  assert.equal("findings" in result, false);
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
});

test("admin denial fails closed before the source reader", async () => {
  let readerCalls = 0;
  const result = await loadBookPrivateEvidencePackets(BOOK, {
    verifyAdminAccess: async () => false,
    readBookResearch: async () => {
      readerCalls++;
      return { rows: [row("1")], restricted: false };
    },
  });

  assert.equal(readerCalls, 0);
  assert.equal(result.availability, "restricted");
  assert.deepEqual(result.packets, []);
  assert.deepEqual(result.source, {
    adminVerified: false,
    restricted: true,
    truncated: false,
    focusIncluded: false,
  });
});

test("RLS restriction discards supplied rows instead of projecting them", async () => {
  const result = await loadBookPrivateEvidencePackets(BOOK, {
    verifyAdminAccess: async () => true,
    readBookResearch: async () => ({
      rows: [row("1")],
      restricted: true,
      truncated: false,
      focusIncluded: false,
    }),
  });

  assert.equal(result.availability, "restricted");
  assert.deepEqual(result.packets, []);
  assert.equal(result.summary.totalPackets, 0);
});

test("source truncation stays explicit", async () => {
  const result = await loadBookPrivateEvidencePackets(BOOK, {
    verifyAdminAccess: async () => true,
    readBookResearch: async () => ({ rows: [row("1")], restricted: false, truncated: true }),
  });

  assert.equal(result.partial, true);
  assert.equal(result.source.truncated, true);
});

test("reader failures propagate without an unsafe fallback", async () => {
  await assert.rejects(
    loadBookPrivateEvidencePackets(BOOK, {
      verifyAdminAccess: async () => true,
      readBookResearch: async () => { throw new Error("synthetic private reader failure"); },
    }),
    /synthetic private reader failure/,
  );
});

test("admin verifier failures propagate and still stop before the reader", async () => {
  let readerCalls = 0;
  await assert.rejects(
    loadBookPrivateEvidencePackets(BOOK, {
      verifyAdminAccess: async () => { throw new Error("synthetic admin failure"); },
      readBookResearch: async () => {
        readerCalls++;
        return { rows: [row("1")], restricted: false };
      },
    }),
    /synthetic admin failure/,
  );
  assert.equal(readerCalls, 0);
});
