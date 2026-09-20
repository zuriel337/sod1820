// Focused fixtures for G3_WORLD_CONVERGENCE_PR591_SERIAL_REPAIR_A2 — run with:
//   node --test src/lib/research/worldConvergencePr591SerialRepairA2.test.js
// Node's built-in runner (node:test + assert/strict), same convention as sibling research tests.
//
// Scope: worldContextualProminence.js, worldAllResearchProjection.js, worldConvergenceLensProjection.js
// only. Every fixture below is SYNTHETIC — no real research_objects/candidate row is copied.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildWorldContextualProminence,
  classifyWorldVerificationStrength,
} from "./worldContextualProminence.js";
import { normalizeWorldAllResearchRow } from "./worldAllResearchProjection.js";
import {
  buildWorldConvergenceLensProjection,
  orderWorldConvergenceRows,
  compareCatalogAttention,
} from "./worldConvergenceLensProjection.js";

// ── (1) strength(match, negative) vs attention inverse ─────────────────────────────────────────
test("research_strength orders an explicit match before a mismatch; attention inverts it", () => {
  const projection = {
    rows: [
      {
        id: "match-1", sourceId: "match-1", family: "research_object", kind: "relation",
        createdAt: "2026-01-01", statement: "Match row", verification: "match", status: "candidate",
      },
      {
        id: "mismatch-1", sourceId: "mismatch-1", family: "research_object", kind: "relation",
        createdAt: "2026-01-02", statement: "Mismatch row", verification: "mismatch", status: "candidate",
      },
    ],
    convergenceCandidates: [],
  };
  const built = buildWorldConvergenceLensProjection(projection);
  const [first, second] = built.rows;
  assert.equal(first.verification, "match", "research_strength (default) must rank the match first");
  assert.equal(second.verification, "mismatch");

  const attentionOrdered = orderWorldConvergenceRows(built.rows, "attention");
  assert.equal(attentionOrdered[0].verification, "mismatch", "attention ordering may put the mismatch first");
  assert.equal(compareCatalogAttention(attentionOrdered[0], attentionOrdered[1]) <= 0, true);

  assert.equal(classifyWorldVerificationStrength("match"), 0);
  assert.equal(classifyWorldVerificationStrength("mismatch") > classifyWorldVerificationStrength("match"), true);
});

// ── (2) needs_check without mismatch stays not_tested/review, not proof of mismatch ────────────
test("a generic needs_check candidate is review-required, never a certified mismatch", () => {
  const projection = {
    rows: [],
    convergenceCandidates: [
      {
        id: "cand-needs-check", created_at: "2026-01-01", recommendation: "needs_check",
        subject_ref: "180", why: { reason: "לא נבדק עדיין", topic_title: "180" },
      },
    ],
  };
  const built = buildWorldConvergenceLensProjection(projection);
  const row = built.rows.find((r) => r.id === "candidate:cand-needs-check");
  assert.equal(row.verification, "review_required");
  assert.equal(row.decisionChanging, false, "needs_check alone must not be treated as a proven mismatch");
  assert.equal(row.classification, "ממתין לבדיקה");
});

test("an explicit mismatch/contradiction outcome does yield a decision-changing mismatch", () => {
  const projection = {
    rows: [],
    convergenceCandidates: [
      {
        id: "cand-mismatch", created_at: "2026-01-01", recommendation: "needs_check",
        subject_ref: "180", why: { reason: "mismatch מול המקור", mismatches: ["engine_state"] },
      },
    ],
  };
  const built = buildWorldConvergenceLensProjection(projection);
  const row = built.rows.find((r) => r.id === "candidate:cand-mismatch");
  assert.equal(row.verification, "mismatch");
  assert.equal(row.decisionChanging, true);
  assert.equal(row.classification, "דורש החלטה");
});

// ── (3) one source with 2 raw refs is never independent proof ──────────────────────────────────
test("a single source referenced twice is never labeled independent multi-source proof", () => {
  const projection = {
    rows: [
      {
        id: "one-source-twice", sourceId: "one-source-twice", family: "research_object", kind: "relation",
        createdAt: "2026-01-01", statement: "Same source twice", verification: "match", status: "candidate",
        sourceRef: "source:A", sourceRefs: ["source:A", "source:A#duplicate-listing"],
      },
    ],
    convergenceCandidates: [],
  };
  const built = buildWorldConvergenceLensProjection(projection);
  const row = built.rows[0];
  assert.equal(row.classification, "מאומת", 'classification must never read "רב־מקור" merely from raw ref count');
  assert.equal(row.classification.includes("רב־מקור"), false);
  assert.equal(row.explainWhy.some((line) => line.includes("הפניות מקור")), true);
});

// ── (4) numeric match + known later corpus mismatch -> partial + review, top raw state kept ────
test("a top-level match coexisting with a per-scope mismatch exposes partial/needs-review", () => {
  const row = {
    id: "de48e12f", created_at: "2026-01-01", statement: "מספר עם אימות מספרי", value: 46,
    engine_detail: { verification_state: "match" },
    meta: {
      ext: {
        batch_001b: { notarikon_verification_state: "mismatch" },
        source_claim_46_exact_phrase: "mismatch",
      },
    },
  };
  const normalized = normalizeWorldAllResearchRow(row, "research_object");
  assert.equal(normalized.verification, "partial_needs_review");
  assert.equal(normalized.engineVerificationStateRaw, "match", "the raw top numeric match state stays inspectable");
  assert.equal(normalized.scopeVerificationStates.some((s) => s.state === "mismatch"), true);
  assert.equal(normalized.scopeVerificationStates.length >= 2, true, "no raw scoped field is silently dropped");
});

// ── (5) 100 duplicate occurrences do not increase research strength ────────────────────────────
test("repeating the same occurrence 100 times never increases its research strength class", () => {
  const single = { verification: "not_tested" };
  const duplicated = { verification: "not_tested" };
  assert.equal(classifyWorldVerificationStrength(single.verification), classifyWorldVerificationStrength(duplicated.verification));
  const rows = Array.from({ length: 100 }, (_, i) => ({
    id: "dup-" + i, sourceId: "dup-" + i, family: "research_object", kind: "relation",
    createdAt: "2026-01-01", statement: "Duplicate occurrence", verification: "not_tested", status: "candidate",
  }));
  const strong = { id: "strong-1", sourceId: "strong-1", family: "research_object", kind: "relation", createdAt: "2026-01-01", statement: "Strong match", verification: "match", status: "candidate" };
  const built = buildWorldConvergenceLensProjection({ rows: [...rows, strong], convergenceCandidates: [] });
  assert.equal(built.rows[0].id, "strong-1", "a single explicit match still outranks 100 not_tested duplicates");
});

// ── (6) explicit parent+children preserve ALL ids and mixed states ─────────────────────────────
test("dependency grouping preserves every member id/state instead of discarding children", () => {
  const rows = [
    { id: "parent-1", statement: "root claim", engine_detail: { verification_state: "match" } },
    { id: "child-1", parent_id: "parent-1", statement: "child A", engine_detail: { verification_state: "not_tested" } },
    { id: "child-2", parent_id: "parent-1", statement: "child B", engine_detail: { verification_state: "mismatch" } },
  ];
  const inputs = { researchSupplements: [] };
  const built = buildWorldContextualProminence({ identity: { nodeId: "anchor-1" }, research: { rows, findings: [] } }, inputs, { limit: 7 });
  const researchItems = built.items.filter((item) => item.id.startsWith("research:"));
  // Same-dependency-family members must never collapse into one merged item — each
  // parent/child id, and its own verification state, stays a separately inspectable row.
  const ids = researchItems.map((item) => item.id).sort();
  assert.deepEqual(ids, ["research:child-1", "research:child-2", "research:parent-1"].sort());
  for (const item of researchItems) {
    assert.equal(item.explainWhy.dependency.memberCount, 3, "every member reports the true group size, none discarded");
  }
  const mismatchedChild = researchItems.find((item) => item.id === "research:child-2");
  assert.equal(mismatchedChild.explainWhy.uncertainty?.state, "mismatch", "the mismatched child's own state stays inspectable, not silently certified away by the matched parent");
});

// ── (do not certify group from one matched row) ─────────────────────────────────────────────────
test("an exact-identity duplicate group is never certified as a full match from just one matched copy", () => {
  const data = {
    identity: { nodeId: "anchor-2" },
    graph: {
      relations: [
        {
          id: "rel-1", relations: undefined,
          projection: { relations: [{ id: "rel-1", relationType: "supports", fromNodeId: "anchor-2", toNodeId: "grp-x", to: { id: "grp-x", label: "Group X", type: "entity" } }] },
          verification: { verification_state: "match" },
        },
        {
          id: "rel-2",
          projection: { relations: [{ id: "rel-2", relationType: "supports", fromNodeId: "anchor-2", toNodeId: "grp-x", to: { id: "grp-x", label: "Group X", type: "entity" } }] },
          verification: { verification_state: "not_tested" },
        },
      ],
    },
  };
  const built = buildWorldContextualProminence(data, {}, { limit: 7 });
  const graphItem = built.items.find((item) => item.id.startsWith("graph:"));
  assert.ok(graphItem, "the duplicate graph-relation candidates are exact-identity deduped into one inspectable item");
  // With the fix, one matched copy no longer silently certifies the merged item as a
  // full engine match — "engine_match" only appears when every member agrees.
  assert.equal(graphItem.explainWhy.researchStrengthSignals.includes("engine_match"), false);
});

// ── (7) independent candidates (e.g. "1080 star" / "1080 cube") stay two distinct items ────────
test("two independently-derived candidates for the same number stay two separate rows", () => {
  const projection = {
    rows: [],
    convergenceCandidates: [
      { id: "star-1080", created_at: "2026-01-01", subject_ref: "1080", recommendation: "strong", why: { anchor: "כוכב 1080", topic_title: "כוכב 1080" } },
      { id: "cube-1080", created_at: "2026-01-01", subject_ref: "1080", recommendation: "strong", why: { anchor: "קובייה 1080", topic_title: "קובייה 1080" } },
    ],
  };
  const built = buildWorldConvergenceLensProjection(projection);
  const rows1080 = built.rows.filter((r) => r.value === 1080);
  assert.equal(rows1080.length, 2, "same-number grouping must never merge independently-derived candidates");
});

// ── contributor derivation: never the generating agent ──────────────────────────────────────────
test("candidate contributor never falls back to the generating agent", () => {
  const projection = {
    rows: [],
    convergenceCandidates: [
      {
        id: "cand-agent", created_at: "2026-01-01", recommendation: "strong", subject_ref: "70",
        why: {
          generated_by: "GPT", source: "engine",
          paths: [{ contributor: "תורם-אנושי" }],
          shared_sources: ["source:X"], warnings: ["בדוק שוב"],
        },
      },
    ],
  };
  const built = buildWorldConvergenceLensProjection(projection);
  const row = built.rows.find((r) => r.id === "candidate:cand-agent");
  assert.equal(row.contributor, "תורם-אנושי");
  assert.equal(row.generatedBy, "GPT");
  assert.notEqual(row.contributor, "GPT");
  assert.deepEqual(row.sharedSources, ["source:X"]);
  assert.deepEqual(row.warnings, ["בדוק שוב"]);
});

test("candidate contributor is unknown (null), never the raw research_candidates placeholder, when no source-owned path exists", () => {
  const projection = {
    rows: [],
    convergenceCandidates: [
      { id: "cand-no-author", created_at: "2026-01-01", recommendation: "strong", subject_ref: "70", why: { generated_by: "GPT" } },
    ],
  };
  const built = buildWorldConvergenceLensProjection(projection);
  const row = built.rows.find((r) => r.id === "candidate:cand-no-author");
  assert.equal(row.contributor, null);
});
