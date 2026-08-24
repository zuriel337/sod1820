import { useCallback, useMemo } from "react";
import { useResearch } from "./ResearchProvider.jsx";
import { universalFindingToResearchEntity, isUniversalFinding } from "./universalFinding.js";

// Thin adapter over the EXISTING canonical ResearchProvider.
// No second store/context. Universal Findings live in the same cart/pin/history/cloud path
// as every other research entity and retain their full envelope as metadata.
export function useUniversalWorkspace() {
  const research = useResearch();
  const cart = Array.isArray(research.cart) ? research.cart : [];
  const pinned = Array.isArray(research.pinned) ? research.pinned : [];

  const findings = useMemo(
    () => cart.map((e) => e?.finding).filter(isUniversalFinding),
    [cart]
  );
  const pinnedFindings = useMemo(
    () => pinned.map((e) => e?.finding).filter(isUniversalFinding),
    [pinned]
  );

  const upsertFinding = useCallback((finding) => {
    const entity = universalFindingToResearchEntity(finding);
    if (!entity) return false;
    // Existing provider dedupes by stable entity.id and logs provenance/history/event telemetry.
    research.addToResearch?.(entity);
    return true;
  }, [research.addToResearch]);

  const upsertFindings = useCallback((items) => {
    let added = 0;
    for (const finding of Array.isArray(items) ? items : []) {
      const entity = universalFindingToResearchEntity(finding);
      if (!entity) continue;
      research.addToResearch?.(entity);
      added += 1;
    }
    return added;
  }, [research.addToResearch]);

  const dismissFinding = useCallback((id) => {
    // "Dismiss" means remove from active cart only. ResearchProvider history/cloud provenance
    // is not deleted, satisfying Rank-Don't-Hide/no provenance loss.
    research.removeFromResearch?.(id);
  }, [research.removeFromResearch]);

  const pinFinding = useCallback((finding) => {
    const entity = universalFindingToResearchEntity(finding);
    if (!entity) return false;
    research.togglePin?.(entity);
    return true;
  }, [research.togglePin]);

  const isFindingPinned = useCallback((findingOrId) => {
    const id = typeof findingOrId === "string" ? findingOrId : findingOrId?.id;
    return Boolean(id && research.isPinned?.(id));
  }, [research.isPinned]);

  return {
    ...research,
    findings,
    pinnedFindings,
    upsertFinding,
    upsertFindings,
    dismissFinding,
    pinFinding,
    isFindingPinned,
  };
}

export default useUniversalWorkspace;
