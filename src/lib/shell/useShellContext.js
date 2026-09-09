import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useResearch } from "../research/ResearchProvider.jsx";
import { deriveShellContext, resolveReturnPatch, resolveRootPatch } from "./shellContext.js";

// 🧭 The one binding of the Adaptive Shell spine to live app state.
// It reads the two EXISTING owners (router location + ResearchProvider) and returns
// the derived orientation projection. It holds no state of its own — there is still
// exactly one Research Context store on main, and this is not it.
export function useShellContext() {
  const { pathname, search } = useLocation();
  const research = useResearch();
  const context = research?.context || null;
  return useMemo(
    () => deriveShellContext({ pathname, search, context }),
    [pathname, search, context]
  );
}

// ↩ Exact return/root navigation, shared by every shell projection so the Dock and
// the Orientation Header can never drift into two different "back" behaviors.
// The caller supplies navigate() — routing stays owned by the component.
export function useShellNavigation() {
  const research = useResearch();
  const apply = (resolved, navigate) => {
    if (!resolved || typeof navigate !== "function") return false;
    research?.updateResearchContext?.(resolved.patch);
    navigate(resolved.href);
    return true;
  };
  return {
    goRoot: (root, navigate) => apply(resolveRootPatch(root), navigate),
    goReturn: (returnTo, activeLens, navigate) => apply(resolveReturnPatch(returnTo, activeLens), navigate),
  };
}
