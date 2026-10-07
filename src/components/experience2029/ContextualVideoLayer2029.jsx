import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import {
  contextualVideosFromResearchRows,
  describeVideoMatch,
  videoUrlForAnchor,
} from "../../lib/research/videoSemanticMap.js";

const inFlightResearchReads = new Map();

async function readRows(queryKey, queryNode) {
  let pending = inFlightResearchReads.get(queryKey);
  if (!pending) {
    pending = import("../../lib/research/entityHubProjection.js")
      .then(({ fetchVideoSemanticMapsForEntity }) => fetchVideoSemanticMapsForEntity(queryNode, { limit: 24 }))
      .finally(() => inFlightResearchReads.delete(queryKey));
    inFlightResearchReads.set(queryKey, pending);
  }
  return pending;
}

// Shared contextual-video projection for every 2029 SurfaceContextRail.
// It is deliberately ADMIN/authorized-research only while VIDEO_REPRESENTATION_MAP rows are private.
// The component reads through the existing RLS research reader, never writes Research Context,
// never rescans media and never promotes a source mention into Fact/Canonical/Published.

function queryNodeFrom({ subject, context }) {
  const candidate = subject || context?.dimensions?.surfaceFocus || context?.selection || context?.subject || null;
  if (!candidate) return null;

  const rawNumber = candidate.number ?? candidate.resultValue
    ?? (candidate.type === "number" ? candidate.id : null);
  const number = Number(rawNumber);
  if (Number.isSafeInteger(number) && number > 0) {
    return { id: `number:${number}`, type: "number", label: String(number) };
  }

  const label = String(
    candidate.expression
      || candidate.primary
      || candidate.label
      || candidate.reference
      || ""
  ).trim();
  if (!label) return null;

  return {
    id: String(candidate.entityId || candidate.id || `${candidate.type || "entity"}:${label}`),
    type: String(candidate.entityType || candidate.type || "entity"),
    label,
    identity_key: candidate.identity_key || candidate.identityKey || null,
  };
}

function ContextVideo({ item }) {
  const src = videoUrlForAnchor(item);
  if (!src) return null;
  const match = describeVideoMatch(item);
  return <article className="sod29-context-video" data-video-public-id={item.videoPublicId || undefined}>
    <div className="sod29-context-video-head">
      <b>וידאו בהקשר</b>
      <span>{match}</span>
    </div>
    <video
      controls
      playsInline
      preload="none"
      src={src}
      poster={item.posterUrl || undefined}
      aria-label={`וידאו רלוונטי: ${match}`}
    />
    <small>{item.anchor?.note || "מפת מקור פנימית — עצם המיפוי אינו אימות של דברי הסרטון."}</small>
  </article>;
}

export default function ContextualVideoLayer2029({ subject, context, limit = 2 }) {
  const { isAdmin, loading, user } = useAuth();
  const queryNode = useMemo(() => queryNodeFrom({ subject, context }), [subject, context]);
  const queryKey = queryNode
    ? [user?.id || "anon", queryNode.type, queryNode.id, queryNode.label, queryNode.identity_key || ""].join("|")
    : "";
  const [state, setState] = useState({ key: "", status: "idle", rows: [] });

  useEffect(() => {
    if (loading || !isAdmin || !queryNode || !queryKey) {
      setState({ key: queryKey, status: "idle", rows: [] });
      return undefined;
    }

    let alive = true;
    setState({ key: queryKey, status: "loading", rows: [] });
    readRows(queryKey, queryNode)
      .then((result) => {
        if (!alive) return;
        const rows = Array.isArray(result?.rows) ? result.rows : [];
        setState({ key: queryKey, status: rows.length ? "ready" : "empty", rows });
      })
      .catch(() => {
        if (alive) setState({ key: queryKey, status: "error", rows: [] });
      });

    return () => { alive = false; };
  }, [loading, isAdmin, queryKey]);

  const videos = useMemo(
    () => state.key === queryKey
      ? contextualVideosFromResearchRows(state.rows, context, { limit })
      : [],
    [state.key, state.rows, queryKey, context, limit]
  );

  if (loading || !isAdmin || state.key !== queryKey || !videos.length) return null;

  return <section
    className="sod29-context-videos"
    aria-label="סרטונים רלוונטיים להקשר"
    data-experience-capability="contextual-video-projector"
  >
    <div className="sod29-context-inspector-kicker">וידאו ממופה · בלי סריקה מחדש</div>
    {videos.map((item) => <ContextVideo key={item.id} item={item} />)}
  </section>;
}
