import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import { Player } from "./VideoAssetPage.jsx";
import { fetchPublicVideo2029 } from "../lib/research/publicVideo2029Reading.js";
import { applySeo, clearUnifiedVideoJsonLd, setUnifiedVideoJsonLd } from "../lib/seo.js";
import { bilingualDateLabel } from "../lib/relativeTime2029.js";

export default function Video2029Page() {
  const { assetId } = useParams();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, loading: true, asset: null, error: false });
  useEffect(() => {
    const controller = new AbortController();
    setState({ key: assetId, loading: true, asset: null, error: false });
    fetchPublicVideo2029(assetId, { signal: controller.signal })
      .then(asset => { if (!controller.signal.aborted) setState({ key: assetId, loading: false, asset, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setState({ key: assetId, loading: false, asset: null, error: true }); });
    return () => controller.abort();
  }, [assetId, attempt]);
  const current = state.key === assetId, asset = current ? state.asset : null, loading = !current || state.loading;
  useEffect(() => {
    if (loading) return;
    applySeo({ title: asset?.title || (state.error ? "לא ניתן לטעון את הסרטון" : "הסרטון לא נמצא"),
      path: asset?.redirectHref || `/video/${assetId}`, image: asset?.thumb_url,
      noindex: !asset || asset.google_indexable !== true });
    if (asset && !asset.redirectHref) setUnifiedVideoJsonLd(asset, `/video/${assetId}`);
    return () => clearUnifiedVideoJsonLd();
  }, [asset, assetId, loading, state.error]);
  if (asset?.redirectHref) return <Navigate replace to={asset.redirectHref} />;
  return <Sod2029Shell
    surface="world"
    symbol={<NavigationIcon2029 name="video" />}
    eyebrow="VIDEO · SOURCE · CONTEXT"
    title="וידאו · SOD1820"
    description="נכס וידאו אחד, הקשרים רבים — מקור, סדרה, צופן ופוסטים על אותה זהות מדיה."
  >
    <main data-experience-capability="public-video-source" style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 100px", minHeight: "70vh", direction: "rtl" }}>
      {loading ? <FrameState kind="loading" title="פותח את הסרטון">בודק את המקור הציבורי.</FrameState>
        : state.error ? <FrameState kind="error" title="לא ניתן לטעון את הסרטון"><p>המקור לא נטען. אפשר לנסות שוב.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>ניסיון טעינה נוסף</button></FrameState>
        : !asset ? <FrameState kind="empty" title="הסרטון לא נמצא">המדיה אינה זמינה לציבור בכתובת הזאת.</FrameState>
        : <article><h1>{asset.title}</h1>
          <p>{asset.credit ? `מקור: ${asset.credit}` : "מקור ציבורי"}{asset.author ? ` · דובר: ${asset.author}` : ""} · {bilingualDateLabel(asset.first_seen_at, "תאריך לא צוין")}</p>
          <Player key={assetId} asset={asset} poster={asset.thumb_url || "/logo.png"} />
        </article>}
      <Link to="/world">לעולם</Link>
    </main>
  </Sod2029Shell>;
}
