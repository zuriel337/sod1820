import { makeUniversalFinding } from "./universalFinding.js";

// Legacy number_anchors → Universal Finding projection.
// number_anchors is curated historical context, NOT a truth/verification/publication owner.
// The adapter therefore preserves the source payload and stable numeric identity while leaving
// epistemic stage, governance status, verification state, and access honestly unset.
export function numberAnchorToUniversalFinding(anchor, { createdAt = null } = {}) {
  const value = Number(anchor?.value);
  if (!Number.isInteger(value)) return null;

  const fact = String(anchor?.fact || "").trim();
  const hint = anchor?.hint == null ? null : String(anchor.hint).trim() || null;
  const category = anchor?.category == null ? null : String(anchor.category).trim() || null;
  const sourceUpdatedAt = anchor?.updated_at || null;
  const sourceCreatedAt = anchor?.created_at || null;

  return makeUniversalFinding({
    kind: "number-anchor",
    subject: { type: "number", key: String(value), label: String(value), value },
    source: {
      engine: null,
      adapter: "number-anchors-legacy-v1",
      sourceRef: `number_anchors:${value}`,
      method: null,
      corpus: null,
      lang: "he",
    },
    identity: {
      sourceIdentity: { table: "number_anchors", value },
      entityRef: `number:${value}`,
    },
    // Deliberately no stage/status/verification/access assertions.
    evidence: {
      refs: [],
      facts: [],
      score: null,
      confidence: null,
    },
    provenance: {
      createdBy: null,
      createdAt: createdAt || sourceUpdatedAt || sourceCreatedAt || new Date().toISOString(),
      inputRef: `number_anchors:${value}`,
    },
    projection: {
      anchors: [{ space: "number", value }],
      relations: [],
      dimensions: {
        legacyNumberAnchor: {
          value,
          category,
          fact: fact || null,
          hint,
          sourceCreatedAt,
          sourceUpdatedAt,
          semanticBoundary: "curated-context-not-verified-fact",
        },
      },
    },
    view: { rendererHints: { role: "legacy-number-anchor-context" } },
  });
}
