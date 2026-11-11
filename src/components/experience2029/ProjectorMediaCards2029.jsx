import React, { useEffect, useState } from "react";
import CanonicalMediaFigure2029 from "./CanonicalMediaFigure2029.jsx";
import ExternalVideoFacade2029 from "./ExternalVideoFacade2029.jsx";
import { deriveContextNumbers } from "../../lib/research/galleryMediaEnvelope.js";

// Shared gallery media inside the EXISTING Golden Projector / Contextual Sidecar layer.
// Data comes ONLY from the Entity Hub (fetchPostContextMedia): this component never reads
// the gallery table. The hub query is public-safe (published + non-hidden, whitelisted claims), so
// the same cards render in מנהל and ציבור modes and carry no admin/private payload.
// Label/summary come from the shared envelope presentation; only the context reason is local.

const REASON = {
  reality_graph: "מחובר בגרף למספר או לנושא בפוסט",
  source_metadata: "מקושר לפוסט לפי מטא־דאטה שמורה (לא קשר בגרף)",
};

// The post's own external videos (YouTube/Vimeo) in the same projector: the SAME published post (exact slug, the public post
// reader and its public-source guard), the canonical link detector and the shared click-to-load card. No new source record.
function ProjectorPostVideos2029({ postSlug }) {
  const [videos, setVideos] = useState({ title: "", links: [] });
  useEffect(() => {
    if (!postSlug) { setVideos({ title: "", links: [] }); return undefined; }
    let alive = true;
    Promise.all([import("../../lib/supabase.js"), import("../../lib/research/post2029ReadingProjection.js"), import("../../lib/community/messageLinks.js")])
      .then(async ([db, reading, links]) => {
        const post = await db.getPostBySlug(postSlug);
        if (!alive || !post || !reading.isPublicPostReadingSource(post)) return;
        setVideos({ title: String(post.title || "").replace(/<[^>]*>/g, "").trim(), links: links.externalVideoLinksFromHtml(post.content || "", 3) });
      })
      .catch(() => { if (alive) setVideos({ title: "", links: [] }); });
    return () => { alive = false; };
  }, [postSlug]);
  if (!videos.links.length) return null;
  return <section className="sod29-projector-media" aria-label="סרטונים מתוך הפוסט" data-projector-video-count={videos.links.length}>
    {videos.links.map(link => <ExternalVideoFacade2029 key={link.key} link={link} title={videos.title} context="סרטון שמוטמע בפוסט המקורי" />)}
  </section>;
}

export default function ProjectorMediaCards2029({ postSlug, context = null }) {
  return <><ProjectorPostVideos2029 postSlug={postSlug} /><ProjectorGalleryMedia2029 postSlug={postSlug} context={context} /></>;
}

function ProjectorGalleryMedia2029({ postSlug, context = null }) {
  const [state, setState] = useState({ status: "idle", items: [] });
  // Bounded numbers already in the existing context (no domain values hardcoded here).
  const numbersKey = deriveContextNumbers(context).join(",");

  useEffect(() => {
    if (!postSlug && !numbersKey) { setState({ status: "idle", items: [] }); return undefined; }
    let alive = true;
    setState({ status: "loading", items: [] });
    import("../../lib/research/entityHubProjection.js")
      .then((hub) => hub.fetchPostContextMedia({ postSlug: postSlug || null, numbers: numbersKey ? numbersKey.split(",").map(Number) : [], limit: 12 }))
      .then((out) => { if (alive) setState({ status: out?.items?.length ? "ready" : "empty", items: out?.items || [] }); })
      .catch(() => { if (alive) setState({ status: "error", items: [] }); });
    return () => { alive = false; };
  }, [postSlug, numbersKey]);

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
