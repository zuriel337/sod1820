import React, { useEffect, useState } from "react";
import CanonicalMediaFigure2029 from "./CanonicalMediaFigure2029.jsx";

// Shared gallery media inside the EXISTING Golden Projector / Contextual Sidecar layer.
// Data comes ONLY from the Entity Hub (fetchPostContextMedia): this component never reads
// the gallery table. The hub query is public-safe (published + non-hidden, whitelisted claims), so
// the same cards render in מנהל and ציבור modes and carry no admin/private payload.
// Label/summary come from the shared envelope presentation; only the context reason is local.

const REASON = {
  reality_graph: "מחובר בגרף למספר או לנושא בפוסט",
  source_metadata: "מקושר לפוסט לפי מטא־דאטה שמורה (לא קשר בגרף)",
};

export default function ProjectorMediaCards2029({ postSlug, graphMedia = [] }) {
  const [state, setState] = useState({ status: "idle", items: [] });

  useEffect(() => {
    if (!postSlug) { setState({ status: "idle", items: [] }); return undefined; }
    let alive = true;
    setState({ status: "loading", items: [] });
    import("../../lib/research/entityHubProjection.js")
      .then((hub) => hub.fetchPostContextMedia({ postSlug, graphMedia, limit: 12 }))
      .then((out) => { if (alive) setState({ status: out?.items?.length ? "ready" : "empty", items: out?.items || [] }); })
      .catch(() => { if (alive) setState({ status: "error", items: [] }); });
    return () => { alive = false; };
  }, [postSlug, graphMedia]);

  if (state.status === "idle" || state.status === "empty") return null;
  if (state.status === "loading") return <p className="sod29-golden-mode-note">טוען מדיה מחוברת…</p>;
  if (state.status === "error") return <p className="sod29-golden-mode-note">טעינת המדיה נכשלה. שאר ההקשר לא הושפע.</p>;
  return <section className="sod29-projector-media" aria-label="מדיה מחוברת לפוסט" data-projector-media-count={state.items.length}>
    <ul>
      {state.items.map((item) => {
        const reason = REASON[item.contextRelation?.relationKind] || REASON.reality_graph;
        return <li key={item.mediaId} data-relation-kind={item.contextRelation?.relationKind}>
          <CanonicalMediaFigure2029 item={item} thumbnail alt={item.presentation.label} contextNote={reason} />
          <div>
            <strong>{item.presentation.label}</strong>
            {item.presentation.kindLabel ? <small>{item.presentation.kindLabel}</small> : null}
            {item.presentation.summary ? <p>{item.presentation.summary}</p> : null}
            <small>{reason}</small>
          </div>
        </li>;
      })}
    </ul>
  </section>;
}
