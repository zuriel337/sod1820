import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// A new page starts at its beginning. Browser Back/Forward and explicit anchors
// keep their existing restoration owners; changing filters is not a new page.
// Mount outside the account-keyed ResearchProvider so login cannot reset reading.
export default function RouteScrollReset2029() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef(pathname);

  useLayoutEffect(() => {
    const changedPage = previousPath.current !== pathname;
    previousPath.current = pathname;
    if (!changedPage || navigationType === "POP" || hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
}
