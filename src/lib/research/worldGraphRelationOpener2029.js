// Adapter between the World map shell and the canonical exact-relation reader.
//
// It performs no query of its own: exact relations open only through
// fetchCanonicalGraphEntityFindings(nodeId). A result that fills the read
// window is reported "partial" so the UI never infers absence from it.

import { fetchCanonicalGraphEntityFindings } from "./entityGraphFinding.js";

const RELATION_LIMIT = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (value) => typeof value === "string" ? value.trim() : "";

export function normalizeOpenedRelations(findings, { relationLimit = RELATION_LIMIT, anchorNodeId = null } = {}) {
  if (!Array.isArray(findings)) return { status: "unavailable", relations: [] };
  const edgeFindings = findings.filter((finding) => finding?.kind === "graph-relation");
  const rows = new Map();
  const conflicts = new Set();
  let incomplete = false;
  for (const finding of edgeFindings) {
    const edgeRef = clean(finding.identity?.relationRef);
    const edgeId = edgeRef.startsWith("edge:") ? edgeRef.slice(5) : "";
    const relations = finding.projection?.relations;
    if (!UUID.test(edgeId) || finding.source?.sourceRef !== edgeRef || !Array.isArray(relations) || !relations.length) {
      incomplete = true;
      continue;
    }
    for (const relation of relations) {
      const fromNodeId = clean(relation?.fromNodeId), toNodeId = clean(relation?.toNodeId);
      if (relation?.id !== edgeId || !UUID.test(fromNodeId) || !UUID.test(toNodeId)
        || (anchorNodeId && fromNodeId !== anchorNodeId && toNodeId !== anchorNodeId)
        || (relation.from?.id != null && relation.from.id !== fromNodeId)
        || (relation.to?.id != null && relation.to.id !== toNodeId)) {
        incomplete = true;
        continue;
      }
      const row = { edgeRef, relationType: clean(relation.relationType) || "קשר",
        fromNodeId, toNodeId, fromLabel: clean(relation.from?.label) || null, toLabel: clean(relation.to?.label) || null };
      const previous = rows.get(edgeRef);
      if (previous && (previous.fromNodeId !== fromNodeId || previous.toNodeId !== toNodeId || previous.relationType !== row.relationType)) {
        conflicts.add(edgeRef);
        incomplete = true;
      } else if (!previous) rows.set(edgeRef, row);
    }
  }
  return { status: incomplete || edgeFindings.length >= relationLimit ? "partial" : "ok",
    relations: [...rows.values()].filter((row) => !conflicts.has(row.edgeRef)) };
}

/** @returns {(target:{nodeId:string}) => Promise<{status:string, anchorNodeId:string, relations:object[]}>} */
export function createCanonicalRelationOpener({ fetcher = fetchCanonicalGraphEntityFindings, relationLimit = RELATION_LIMIT } = {}) {
  return async function openRelations(target) {
    const anchorNodeId = clean(target?.nodeId);
    if (!UUID.test(anchorNodeId)) return { status: "unavailable", anchorNodeId, relations: [] };
    const findings = await fetcher(anchorNodeId, { relationLimit });
    const anchor = Array.isArray(findings) && findings.some((finding) => finding?.kind === "graph-entity"
      && finding.identity?.entityRef === `node:${anchorNodeId}` && finding.source?.sourceRef === `node:${anchorNodeId}`
      && finding.identity?.sourceIdentity?.nodeId === anchorNodeId);
    if (!anchor) return { status: "unavailable", anchorNodeId, relations: [] };
    return { ...normalizeOpenedRelations(findings, { relationLimit, anchorNodeId }), anchorNodeId };
  };
}
