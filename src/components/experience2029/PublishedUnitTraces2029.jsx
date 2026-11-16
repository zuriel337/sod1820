// The canonical gematria breakdowns of a PUBLISHED unit (a section in the post body). The unit's HTML carries empty hosts (`data-pu-trace="<claim id>" data-pu-published`);
// this component fills each from the engine through the same shared display the Preview unit uses (loadUnitTrace → GematriaView2029). Nothing is stored in the post: the
// letters, values and sum are read from the canonical engine every time. It renders only when the post body contains such a host, and loads its code lazily.
import React, { Suspense, lazy, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { YAMIN_SMOL_TRACE_CLAIMS } from "../../lib/research/postPreviewUnits2029.js";

const ClaimTrace = lazy(() => import("./PreviewUnitExtras2029.jsx").then((module) => ({ default: module.ClaimTrace })));

export default function PublishedUnitTraces2029({ rootRef, htmlKey }) {
  const [hosts, setHosts] = useState([]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const found = [...root.querySelectorAll("[data-pu-trace][data-pu-published]")]
      .map((node) => ({ node, claim: YAMIN_SMOL_TRACE_CLAIMS.find((c) => c.id === node.getAttribute("data-pu-trace")) }))
      .filter((entry) => entry.claim);
    setHosts(found);
    return () => setHosts([]);
  }, [rootRef, htmlKey]);
  if (!hosts.length) return null;
  return <>{hosts.map(({ node, claim }) => createPortal(<Suspense fallback={null}><ClaimTrace claim={claim} auto /></Suspense>, node))}</>;
}
