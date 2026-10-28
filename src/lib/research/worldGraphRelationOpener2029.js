// Adapter between the World map shell and the canonical exact-relation reader.
//
// It performs no query of its own: exact relations open only through
// fetchCanonicalGraphEntityFindings(nodeId). A result that fills the read
// window is reported "partial" so the UI never infers absence from it.

import { fetchCanonicalGraphEntityFindings } from "./entityGraphFinding.js";

const RELATION_LIMIT = 50;

export function normalizeOpenedRelations(findings, { relationLimit = RELATION_LIMIT } = {}) {
  const edgeFindings = (Array.isArray(findings) ? findings : []).filter((finding) => (
    finding?.kind === "graph-relation" && String(finding?.identity?.relationRef || "").startsWith("edge:")));
  const relations = edgeFindings.flatMap((finding) => (finding?.projection?.relations || []).map((relation) => ({
    edgeRef: finding.identity.relationRef,
    relationType: relation.relationType || "קשר",
    fromNodeId: String(relation.fromNodeId ?? ""),
    toNodeId: String(relation.toNodeId ?? ""),
    fromLabel: relation.from?.label || null,
    toLabel: relation.to?.label || null,
  })));
  return { status: edgeFindings.length >= relationLimit ? "partial" : "ok", relations };
}

/** @returns {(target:{nodeId:string}) => Promise<{status:string, anchorNodeId:string, relations:object[]}>} */
export function createCanonicalRelationOpener({ fetcher = fetchCanonicalGraphEntityFindings, relationLimit = RELATION_LIMIT } = {}) {
  return async function openRelations(target) {
    const anchorNodeId = String(target?.nodeId ?? "");
    if (!anchorNodeId) return { status: "unavailable", anchorNodeId, relations: [] };
    const findings = await fetcher(anchorNodeId, { relationLimit });
    return { ...normalizeOpenedRelations(findings, { relationLimit }), anchorNodeId };
  };
}
