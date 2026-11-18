import { buildJourneyRestore } from "../elsJourney.js";
import { parseElsOccurrenceId } from "./elsOccurrenceIdentity.js";

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
  const conflict = occurrenceConflict(finding, restore.loadItem);
  if (conflict) return { finding, journeyLoad: null, status: conflict };
  // A snapshot older than its finding's id still opens through the id, so the engine checks the corpus too.
  const own = finding.identity?.sourceIdentity;
  const journeyLoad = !restore.loadItem.occurrenceId && typeof own === "string" && own.startsWith("els:")
    ? { ...restore.loadItem, occurrenceId: own } : restore.loadItem;
  return { finding, journeyLoad, status: "ok" };
}

// The finding's own occurrence (identity.sourceIdentity = the engine's occurrence_id) and the snapshot it opens must be the
// same occurrence. An older finding without an occurrence_id opens by its snapshot as before (the compatibility path).
// corpus-mismatch: the ids name different corpora; occurrence-mismatch: another position or letters, or an id that is not
// the snapshot's own axis. The engine checks the corpus again on load (CORPUS_ID of the scope).
function occurrenceConflict(finding, loadItem) {
  const own = typeof finding.identity?.sourceIdentity === "string" && finding.identity.sourceIdentity.startsWith("els:")
    ? finding.identity.sourceIdentity : null;
  const opened = loadItem.occurrenceId ?? null;
  if (!own && !opened) return null;
  const a = own && parseElsOccurrenceId(own), b = opened && parseElsOccurrenceId(opened);
  if ((own && !a) || (opened && !b)) return "occurrence-mismatch";
  const recorded = finding.verification?.engine_result?.corpus_id ?? finding.identity?.occurrence?.corpus_id ?? null;
  if ((a && b && a.corpusId !== b.corpusId) || (recorded && [a, b].some(x => x && x.corpusId !== recorded))) return "corpus-mismatch";
  if (a && b && a.occurrenceId !== b.occurrenceId) return "occurrence-mismatch";
  const id = b || a;
  const letters = String(loadItem.term || "").replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, c => "כמנפצ"["ךםןףץ".indexOf(c)]);
  if (id.hitId !== loadItem.hitId || id.term !== letters) return "occurrence-mismatch";
  return null;
}

export default resolveElsJourneyReopen;
