// Published units store either an election claim ID or a structured gematria reference.
// Both use the shared trace display and canonical engine readers.
import React, { Suspense, lazy, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { YAMIN_SMOL_TRACE_CLAIMS } from "../../lib/research/postPreviewUnits2029.js";
import { cleanGematriaItem } from "../../lib/research/postUnitBody2029.js";

const ClaimTrace = lazy(() => import("./PreviewUnitExtras2029.jsx").then((module) => ({ default: module.ClaimTrace })));
const UnitGematria = lazy(() => import("./UnitGematria2029.jsx"));

export default function PublishedUnitTraces2029({ rootRef, htmlKey }) {
  const [hosts, setHosts] = useState([]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const found = [];
    for (const node of root.querySelectorAll("[data-pu-published]")) {
      if (node.hasAttribute("data-gx-item")) {
        try {
          const item = cleanGematriaItem(JSON.parse(node.getAttribute("data-gx-item")));
          if (item) found.push({ node, item });
        } catch { /* A malformed saved reference cannot render a calculation. */ }
      } else {
        const claim = YAMIN_SMOL_TRACE_CLAIMS.find(c => c.id === node.getAttribute("data-pu-trace"));
        if (claim) found.push({ node, claim });
      }
    }
    setHosts(found);
    return () => setHosts([]);
  }, [rootRef, htmlKey]);
  if (!hosts.length) return null;
  return <>{hosts.map(({ node, item, claim }) => createPortal(
    <Suspense fallback={null}>{item ? <UnitGematria item={item} /> : <ClaimTrace claim={claim} auto />}</Suspense>, node
  ))}</>;
}
