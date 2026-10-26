// Private evidence-packet projection tests. Fixtures are entirely synthetic.
// Run with: node --test src/lib/research/bookPrivateEvidencePacketProjection.test.js

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOOK_PRIVATE_EVIDENCE_PACKET_VERSION,
  projectBookPrivateEvidencePackets,
} from "./bookPrivateEvidencePacketProjection.js";

const BOOK = {
  identity_key: "book:synthetic-private-evidence",
  metadata: { source_ref_prefixes: ["book:synthetic:private-evidence"] },
};

function row(id, overrides = {}) {
  return {
    id,
    created_at: "2026-10-23T08:00:00Z",
    kind: "observation",
    statement: `טענה סינתטית פרטית ${id}`,
    terms: ["בדיקה"],
    value: null,
    source_ref: `book:synthetic:private-evidence#p${id}:claim`,
    engine_verified: false,
    engine_detail: { verification_state: "not_applicable", hidden: "must-not-leak" },
    status: "candidate",
    privacy_scope: "public_candidate",
    contributor: "must-not-leak",
    meta: { hidden: "must-not-leak" },
    ...overrides,
  };
}

function completeComplexMeta() {
  return {
    hidden: "must-not-leak",
    ext: {
      derivation: {
        inputs: [{
          value: 12,
          role: "duration",
          origin_type: "source_declared_quantity",
          origin_statement: "עד מקור סינתטי מורשה",
          origin_ref: { source_line_index: 4, hidden: "must-not-leak" },
          status: "verified",
          hidden: "must-not-leak",
        }],
      },
      extraction_integrity: {
        arithmetic_verified: true,
        semantic_operand_coverage: "complete",
        media_reference_coverage: "complete",
        fidelity_status: "complete",
        contract: "synthetic-contract",
        hidden: "must-not-leak",
      },
    },
  };
}

test("projection admits only requested Book publication candidates", () => {
  const result = projectBookPrivateEvidencePackets([
    row("1"),
    row("2", { privacy_scope: "public" }),
    row("3", { privacy_scope: "private" }),
    row("4", { source_ref: "book:synthetic:foreign#p4:claim" }),
  ], { book: BOOK });

  assert.deepEqual(result.packets.map(packet => packet.id), ["1"]);
  assert.equal(result.accessMode, "authorized_private_review");
  assert.equal(result.publicationEffect, "none");
  assert.equal(result.packets[0].exposure, "authorized_private");
});

test("complex evidence remains blocked until locator and context evidence exist", () => {
  const result = projectBookPrivateEvidencePackets([row("1", {
    engine_detail: { verification_state: "source_witness_verified" },
    meta: completeComplexMeta(),
  })], { book: BOOK });
  const packet = result.packets[0];
  const states = Object.fromEntries(packet.requirements.map(entry => [entry.key, entry.state]));

  assert.equal(packet.packetVersion, BOOK_PRIVATE_EVIDENCE_PACKET_VERSION);
  assert.equal(packet.reviewLane, "complex");
  assert.deepEqual(states, {
    witness_window: "ready",
    locator_reconciliation: "missing",
    surrounding_context: "missing",
    claim_scope: "partial",
    structured_trace: "ready",
  });
  assert.deepEqual(packet.readiness, {
    completeCount: 2,
    requiredCount: 5,
    readyForFidelityVerdict: false,
    fidelityDecision: null,
    humanGateRequired: true,
  });
});

test("simple evidence requires an explicit applicability rationale", () => {
  const packet = projectBookPrivateEvidencePackets([row("1")], { book: BOOK }).packets[0];
  const last = packet.requirements.at(-1);

  assert.equal(packet.reviewLane, "applicability");
  assert.equal(packet.requirements[0].state, "missing", "engine not_applicable is not witness evidence");
  assert.equal(packet.requirements[3].state, "partial", "a claim statement alone does not prove its scope");
  assert.deepEqual(last, {
    key: "applicability_rationale",
    state: "missing",
    evidence: { extractionFidelityState: "not_recorded", rationale: null },
  });
  assert.equal(packet.readiness.readyForFidelityVerdict, false);
});

test("partial structural evidence never becomes a complete fidelity verdict", () => {
  const packet = projectBookPrivateEvidencePackets([row("1", {
    meta: {
      ext: {
        media_refs: [{ raw: "[Image synthetic.jpg]", resolution_status: "unresolved" }],
        extraction_integrity: { fidelity_status: "partial" },
      },
    },
  })], { book: BOOK }).packets[0];
  const structure = packet.requirements.find(entry => entry.key === "structured_trace");

  assert.equal(packet.reviewLane, "complex");
  assert.equal(structure.state, "partial");
  assert.equal(structure.evidence.mediaReferences[0].resolutionState, "unresolved");
  assert.equal(packet.readiness.fidelityDecision, null);
});

test("packet output is fixed-field and drops arbitrary raw metadata", () => {
  const packet = projectBookPrivateEvidencePackets([row("1", {
    meta: completeComplexMeta(),
  })], { book: BOOK }).packets[0];
  const serialized = JSON.stringify(packet);

  assert.deepEqual(Object.keys(packet), [
    "id", "packetVersion", "exposure", "publicationEffect", "claim", "source",
    "truthAxes", "reviewLane", "requirements", "readiness",
  ]);
  assert.equal(serialized.includes("must-not-leak"), false);
  assert.equal("meta" in packet, false);
  assert.equal("contributor" in packet, false);
  assert.equal("engine_detail" in packet, false);
});

test("focus and paging cannot bypass Book or access filters", () => {
  const rows = [row("1"), row("2"), row("3", { privacy_scope: "private" })];
  const result = projectBookPrivateEvidencePackets(rows, {
    book: BOOK,
    limit: 1,
    offset: 1,
    focusId: "1",
  });

  assert.deepEqual(result.packets.map(packet => packet.id), ["2"]);
  assert.equal(result.focusedPacket.id, "1");
  assert.equal(result.summary.totalPackets, 2, "summary is computed before page slicing");
  assert.equal(projectBookPrivateEvidencePackets(rows, { book: BOOK, focusId: "3" }).focusedPacket, null);
});

test("missing Book scope fails closed", () => {
  const result = projectBookPrivateEvidencePackets([row("1")]);
  assert.deepEqual(result.packets, []);
  assert.equal(result.focusedPacket, null);
  assert.equal(result.publicationEffect, "none");
});
