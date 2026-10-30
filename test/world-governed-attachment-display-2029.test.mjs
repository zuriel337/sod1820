import test from "node:test";
import assert from "node:assert/strict";
import { buildWorldAllResearchProjection, worldPublicResearchDto } from "../src/lib/research/worldAllResearchProjection.js";

function row(id, overrides = {}) {
  return {
    id,
    created_at: "2026-10-28T00:00:00Z",
    kind: "observation",
    statement: id,
    terms: [],
    value: 374,
    relates: [],
    source_ref: `channel_updates:${id}`,
    status: "canonical",
    privacy_scope: "public",
    engine_verified: true,
    engine_detail: { verification_state: "match" },
    meta: {},
    ...overrides,
  };
}

test("an exact governed number attachment appears as a documented World tree connection", () => {
  const targetId = "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c";
  const projection = buildWorldAllResearchProjection({
    researchObjects: [row("attached", {
      promoted_node_id: targetId,
      meta: { governance: { tree_attachment: {
        mode: "existing_graph_identity_pointer",
        target_node_id: targetId,
        target_node_type: "number",
      } } },
    })],
  });
  const finding = projection.rows.find((item) => item.sourceId === "attached");
  assert.deepEqual(finding.treeMatches, [{
    type: "number", key: targetId, label: "צומת מספר מתועד", match: "governed_attachment",
  }]);
  assert.equal(finding.value, 374, "the finding's claimed value remains separate from the node label");
  assert.equal(finding.href, "/2029/number/374", "the existing value navigation is retained");
  assert.equal(finding.researchStrength.label, "מאומת · הצמדה לצומת נרשמה");
  assert.equal(finding.documentedTreeConnected, true);
});

test("a raw match cannot spoof governed provenance or borrow an unrelated promoted pointer", () => {
  const targetId = "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c";
  const topic = { id: "topic", slug: "topic", title: "נושא", node_id: targetId, status: "approved" };
  const findings = buildWorldAllResearchProjection({
    researchObjects: [
      row("spoof", {
        promoted_node_id: targetId,
        meta: { ext: { wa_channel_intake: { tree_matches: [
          { type: "number", key: targetId, match: "governed_attachment" },
        ] } } },
      }),
      row("foreign", {
        promoted_node_id: "1afaa6db-c996-4ea1-889a-b3a6057c475a",
        meta: { governance: { tree_attachment: {
          mode: "existing_graph_identity_pointer", target_node_id: targetId, target_node_type: "number",
        } }, ext: { wa_channel_intake: { tree_matches: [
          { type: "topic", key: "topic", match: "term" },
        ] } } },
      }),
      row("approved-not-promoted", {
        status: "approved",
        promoted_node_id: targetId,
        meta: { governance: { tree_attachment: {
          mode: "existing_graph_identity_pointer", target_node_id: targetId, target_node_type: "number",
        } }, ext: { wa_channel_intake: { tree_matches: [
          { type: "topic", key: "topic", match: "number" },
        ] } } },
      }),
    ],
    topics: [topic],
  }).rows.filter((item) => item.family === "research_object");
  for (const finding of findings) {
    assert.equal(finding.documentedTreeConnected, false);
    assert.equal(finding.researchStrength.label, "מאומת · קשר לעץ לא אומת");
    assert.equal(finding.linkedTopicRating.connectionState, "candidate");
    assert.equal(finding.linkedTopicRating.href, "/topic/topic");
  }
  assert.equal(findings.find((item) => item.sourceId === "spoof").treeMatches[0].match, "candidate");
});

test("valid provenance survives a duplicate raw hint but scoped mismatch remains partial", () => {
  const targetId = "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c";
  const [finding] = buildWorldAllResearchProjection({
    researchObjects: [row("partial", {
      promoted_node_id: targetId,
      meta: {
        governance: { tree_attachment: { mode: "existing_graph_identity_pointer", target_node_id: targetId, target_node_type: "number" } },
        ext: { verification_detail: { verse_verification_state: "mismatch" }, wa_channel_intake: { tree_matches: [
          { type: "number", key: targetId, label: "374", match: "number" },
        ] } },
      },
    })],
    topics: [{ id: "topic", slug: "topic", title: "נושא", node_id: targetId, status: "approved" }],
  }).rows.filter((item) => item.family === "research_object");
  assert.equal(finding.treeMatches[0].match, "governed_attachment");
  assert.equal(finding.treeMatches[0].label, "צומת מספר מתועד", "a raw numeric hint cannot masquerade as the node label");
  assert.equal(finding.documentedTreeConnected, true);
  assert.equal(finding.verification, "partial_needs_review");
  assert.equal(finding.linkedTopicRating.connectionState, "documented_attachment");
  assert.equal(finding.researchStrength.label, "הצמדה לצומת נרשמה · דורש אימות");
});

test("duplicate occurrences do not borrow a connection or inflate documented occurrence totals", () => {
  const targetId = "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c";
  const attached = row("z-attached", {
    statement: "אותו ממצא", promoted_node_id: targetId,
    meta: { governance: { tree_attachment: {
      mode: "existing_graph_identity_pointer", target_node_id: targetId, target_node_type: "number",
    } } },
  });
  const plain = row("a-plain", { statement: "אותו ממצא" });
  const projection = buildWorldAllResearchProjection({ researchObjects: [plain, attached] });
  const [finding] = projection.rows.filter((item) => item.family === "research_object");
  assert.equal(finding.occurrenceCount, 2);
  assert.equal(finding.sourceId, "a-plain");
  assert.equal(finding.documentedTreeConnected, false, "the representative must not borrow the other source's attachment");
  assert.equal(projection.treeMatchedResearchOccurrences, 1);
  assert.equal(worldPublicResearchDto(projection).treeMatchedResearchOccurrences, 1);
});

test("missing and blank numbers cannot prove a number attachment; explicit zero remains zero", () => {
  const targetId = "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c";
  const attachment = { governance: { tree_attachment: {
    mode: "existing_graph_identity_pointer", target_node_id: targetId, target_node_type: "number",
  } } };
  const findings = buildWorldAllResearchProjection({ researchObjects: [
    row("missing", { value: null, promoted_node_id: targetId, meta: attachment }),
    row("blank", { value: "  ", promoted_node_id: targetId, meta: attachment }),
    row("zero", { value: 0, promoted_node_id: targetId, meta: attachment }),
  ] }).rows.filter((item) => item.family === "research_object");
  for (const id of ["missing", "blank"]) {
    const item = findings.find((finding) => finding.sourceId === id);
    assert.equal(item.value, null);
    assert.equal(item.documentedTreeConnected, false);
    assert.deepEqual(item.treeMatches, []);
  }
  const zero = findings.find((finding) => finding.sourceId === "zero");
  assert.equal(zero.value, 0);
  assert.equal(zero.documentedTreeConnected, true);
  assert.equal(zero.treeMatches[0].label, "צומת מספר מתועד");
  assert.equal(zero.href, "/2029/number/0", "explicit zero remains navigable as the finding's value");
});

test("governed target identity does not turn the finding's value into a proven node label", () => {
  const targetId = "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c";
  const [finding] = buildWorldAllResearchProjection({ researchObjects: [row("different-node-label", {
    value: 374, promoted_node_id: targetId,
    meta: { governance: { tree_attachment: {
      mode: "existing_graph_identity_pointer", target_node_id: targetId, target_node_type: "number",
    } }, ext: { wa_channel_intake: { tree_matches: [
      { type: "number", key: targetId, label: "374", match: "number" },
    ] } } },
  })] }).rows.filter((item) => item.family === "research_object");
  assert.equal(finding.value, 374);
  assert.equal(finding.href, "/2029/number/374");
  assert.deepEqual(finding.treeMatches, [{ type: "number", key: targetId, label: "צומת מספר מתועד", match: "governed_attachment" }]);
});

test("an ordinary value or mismatched provenance never manufactures a tree connection", () => {
  const projection = buildWorldAllResearchProjection({
    researchObjects: [
      row("plain-value"),
      row("mismatched-attachment", {
        promoted_node_id: "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c",
        meta: { governance: { tree_attachment: {
          mode: "existing_graph_identity_pointer",
          target_node_id: "1afaa6db-c996-4ea1-889a-b3a6057c475a",
          target_node_type: "number",
        } } },
      }),
      row("book-attachment", {
        promoted_node_id: "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c",
        meta: { governance: { tree_attachment: {
          mode: "existing_graph_identity_pointer",
          target_node_id: "b84f4fbe-86aa-4c32-adbd-5a7dcf17450c",
          target_node_type: "book",
        } } },
      }),
    ],
  });
  for (const finding of projection.rows.filter((item) => item.family === "research_object")) {
    assert.deepEqual(finding.treeMatches, []);
    assert.equal(finding.researchStrength.label, "מאומת · קשר לעץ לא אומת");
  }
});
