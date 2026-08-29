import { useCallback, useMemo } from "react";
import { useResearch } from "./ResearchProvider.jsx";
import { universalFindingToResearchEntity, isUniversalFinding } from "./universalFinding.js";
import { fetchCanonicalGematriaFindings } from "./canonicalGematria.js";

// Thin adapter over the EXISTING canonical ResearchProvider.
// No second store/context. Universal Findings live in the same cart/pin/history/cloud path
// as every other research entity and retain their full envelope as metadata.
// Ported verbatim from gpt/research-workspace-v1 (d267e1ac), Pass 1 research_bus_reconciliation.
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

  // Canonical Gematria source route. This calls the live gematria_api RPC, converts only
  // engine-returned method values to Universal Findings, then reuses the SAME Workspace path.
  // No local calculation and no research_object/canonical/public promotion occurs here.
  // Reconciled from PR #226 (head 502c4b88) per Human-Gate HG-4; see canonicalGematria.js for the
  // two semantic fabrications that were removed before adoption.
  const researchCanonicalGematria = useCallback(async (text) => {
    const items = await fetchCanonicalGematriaFindings(text);
    const added = upsertFindings(items);
    return { findings: items, added };
  }, [upsertFindings]);

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
    researchCanonicalGematria,
    dismissFinding,
    pinFinding,
    isFindingPinned,
  };
}

export default useUniversalWorkspace;
