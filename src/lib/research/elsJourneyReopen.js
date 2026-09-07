import { buildJourneyRestore } from "../elsJourney.js";

// Exact-reopen bridge (ELS continuity gap-close): a saved ELS Universal Finding already
// carries a journeySnapshot (TzofenEmbed.jsx addAxisFinding -> elsJourney.js makeJourneySnapshot).
// buildJourneyRestore() is the existing read-side function for that snapshot, but nothing in the
// codebase ever called it. This is the single place that turns "?finding=<id>" (the link every
// Universal Finding already carries, universalFinding.js universalFindingToResearchEntity) back
// into the engine-owned loadItem — no new store, no recomputation, no second identity.
// Pure/dependency-free (no React) so it can be unit-tested directly with node:test.
export function resolveElsJourneyReopen(findingId, findings) {
  if (!findingId) return { finding: null, journeyLoad: null, status: "none" };
  const finding = (Array.isArray(findings) ? findings : []).find((f) => f?.id === findingId) || null;
  if (!finding) return { finding: null, journeyLoad: null, status: "not-found" };
  if (finding.kind !== "els") return { finding, journeyLoad: null, status: "not-els" };
  const snapshot = finding.projection?.journeySnapshot;
  if (!snapshot) return { finding, journeyLoad: null, status: "no-snapshot" };
  const restore = buildJourneyRestore(snapshot);
  if (!restore.ok) return { finding, journeyLoad: null, status: "invalid-snapshot", reason: restore.reason };
  return { finding, journeyLoad: restore.loadItem, status: "ok" };
}

export default resolveElsJourneyReopen;
