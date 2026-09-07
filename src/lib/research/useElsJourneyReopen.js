import { useMemo } from "react";
import { useUniversalWorkspace } from "./useUniversalWorkspace.js";
import { resolveElsJourneyReopen } from "./elsJourneyReopen.js";

export { resolveElsJourneyReopen };

// Reads from the EXISTING cart/saved/pinned Workspace state (useUniversalWorkspace) — the same
// findings/savedFindings/pinnedFindings lists the rest of the Research OS already uses.
// See elsJourneyReopen.js for the pure resolution logic (unit-tested there, no React needed).
export function useElsJourneyReopen(findingId) {
  const workspace = useUniversalWorkspace();
  const all = useMemo(
    () => [...workspace.findings, ...workspace.savedFindings, ...workspace.pinnedFindings],
    [workspace.findings, workspace.savedFindings, workspace.pinnedFindings]
  );
  return useMemo(() => resolveElsJourneyReopen(findingId, all), [findingId, all]);
}

export default useElsJourneyReopen;
