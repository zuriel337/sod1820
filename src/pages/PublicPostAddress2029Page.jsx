import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import Post2029Page from "./Post2029Page.jsx";
import { supabase } from "../lib/supabase.js";
import { publicPostOnlyFilter } from "../lib/research/publicPostBoundary.js";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import NotFoundPage from "./NotFoundPage.jsx";

// The original WordPress address is a document identity, not a redirect to /post.
export default function PublicPostAddress2029Page({ home = null }) {
  const { slug } = useParams();
  const location = useLocation();
  const wp = !slug ? new URLSearchParams(location.search).get("p") : null;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, loading: true });
  useEffect(() => {
    if (slug || !wp || !/^\d+$/.test(wp)) return undefined;
    let live = true;
    setState({ key: wp, loading: true });
    supabase.from("posts").select("slug").eq("wp_id", wp).or(publicPostOnlyFilter()).limit(1)
      .then(({ data, error }) => { if (live) setState({ key: wp, loading: false, slug: data?.[0]?.slug, error: Boolean(error) }); })
      .catch(() => { if (live) setState({ key: wp, loading: false, error: true }); });
    return () => { live = false; };
  }, [wp, slug, attempt]);
  if (slug) return <Post2029Page resolvedSlug={slug} />;
  if (!wp) return home;
  if (!/^\d+$/.test(wp)) return <Sod2029Shell surface="post" introVariant="none"><NotFoundPage /></Sod2029Shell>;
  if (state.key === wp && state.slug && !state.error) return <Post2029Page resolvedSlug={state.slug} />;
  if (state.key === wp && !state.loading && !state.error) return <Sod2029Shell surface="post" introVariant="none"><NotFoundPage /></Sod2029Shell>;
  return <Sod2029Shell surface="post" introVariant="none">
    <FrameState kind={state.error ? "error" : "loading"} title={state.error ? "הפוסט לא נטען" : "טוען את הפוסט…"}>
      {state.error ? <button type="button" className="sod29-action" onClick={() => setAttempt(n => n + 1)}>לנסות שוב</button> : "פותח את כתובת המקור."}
    </FrameState>
  </Sod2029Shell>;
}
