import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { applySeo, clearUnifiedVideoJsonLd, setUnifiedVideoJsonLd } from "../lib/seo.js";
import { usePalette } from "../lib/palette.js";
import { F } from "../theme.js";

const SERIES_LABELS = {
  "or-geula": "אור הגאולה",
  "torat-haremez": "תורת הרמז",
  "mah-kore-habora": "מה קורה הבורא",
  "dimension-five": "מימד חמש",
  cipher: "צפנים",
};

function decodeHtml(value) {
  if (typeof document === "undefined") return String(value || "");
  const el = document.createElement("textarea");
  el.innerHTML = String(value || "");
  return el.value;
}

function internalPath(url) {
  try {
    const u = new URL(url);
    if (u.origin === window.location.origin || u.hostname === "sod1820.co.il" || u.hostname === "www.sod1820.co.il") {
      return u.pathname + u.search + u.hash;
    }
  } catch { /* noop */ }
  return null;
}

function Player({ asset, poster }) {
  const [play, setPlay] = useState(false);
  const yt = asset.youtube_id || (asset.video_kind === "youtube"
    ? String(asset.media_url || "").match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1]
    : null);
  const vimeo = asset.video_kind === "vimeo"
    ? String(asset.media_url || "").match(/vimeo\.com\/(\d+)/)?.[1]
    : null;

  if (!play) {
    return <button type="button" onClick={() => setPlay(true)} aria-label="נגן סרטון"
      style={{ position: "relative", width: "100%", aspectRatio: "16/9", padding: 0, border: 0, borderRadius: 18,
        overflow: "hidden", cursor: "pointer", background: "#090713" }}>
      <img src={poster} alt={asset.title || "סרטון"} loading="eager"
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
      <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.2)" }}>
        <span style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,.94)",
          display: "grid", placeItems: "center", fontSize: 28, color: "#111", paddingInlineStart: 4 }}>▶</span>
      </span>
    </button>;
  }

  if (asset.video_kind === "selfhost") {
    return <video src={asset.media_url} controls autoPlay playsInline preload="none" poster={poster}
      style={{ width: "100%", maxHeight: "72vh", borderRadius: 18, background: "#000" }} />;
  }
  if (yt) {
    return <iframe title={asset.title || "YouTube"} src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1`}
      allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
      style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 18 }} />;
  }
  if (vimeo) {
    return <iframe title={asset.title || "Vimeo"} src={`https://player.vimeo.com/video/${vimeo}?autoplay=1`}
      allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
      style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 18 }} />;
  }
  return <a href={asset.media_url} target="_blank" rel="noopener noreferrer">פתחו את המדיה</a>;
}

export default function VideoAssetPage() {
  const { assetId } = useParams();
  const P = usePalette();
  const [state, setState] = useState({ loading: true, asset: null, error: null });

  useEffect(() => {
    let alive = true;
    if (!supabase || !/^[0-9a-f]{32}$/i.test(assetId || "")) {
      setState({ loading: false, asset: null, error: null });
      return () => { alive = false; };
    }
    supabase.from("video_media_assets_v1")
      .select("public_id,video_kind,media_url,youtube_id,title,poster_url,thumb_url,primary_page_url,uses_generic_page,google_indexable,placement_count,source_types,series_keys,cipher_slugs,topics,placements,first_seen_at,last_seen_at")
      .eq("public_id", assetId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        setState({ loading: false, asset: data || null, error: error || null });
      });
    return () => { alive = false; };
  }, [assetId]);

  const asset = state.asset;
  const title = decodeHtml(asset?.title || "סרטון");
  const poster = asset?.thumb_url || asset?.poster_url || "/logo.png";
  const target = asset && !asset.uses_generic_page ? internalPath(asset.primary_page_url) : null;

  useEffect(() => {
    if (state.loading || asset) return;
    applySeo({
      title: "הסרטון לא נמצא",
      description: "נכס הווידאו המבוקש אינו זמין ב-SOD1820 2029.",
      path: `/video/${assetId || ""}`,
      noindex: true,
    });
    clearUnifiedVideoJsonLd();
  }, [state.loading, asset, assetId]);

  useEffect(() => {
    if (!asset || !asset.uses_generic_page) return;
    const path = `/video/${asset.public_id}`;
    const topics = Array.isArray(asset.topics) ? asset.topics.filter(Boolean) : [];
    applySeo({
      title,
      description: topics.length ? `${title} — ${topics.slice(0, 5).join(" · ")}` : `${title} — וידאו ב-SOD1820`,
      path,
      image: poster,
    });
    setUnifiedVideoJsonLd({ ...asset, title }, path);
    return () => clearUnifiedVideoJsonLd();
  }, [asset, poster, title]);

  const placements = useMemo(() => Array.isArray(asset?.placements) ? asset.placements : [], [asset]);
  const linkedPlacements = useMemo(() => {
    const seen = new Set();
    return placements.filter(p => {
      if (!p?.page_url || seen.has(p.page_url)) return false;
      seen.add(p.page_url);
      return true;
    });
  }, [placements]);

  if (target) return <Navigate replace to={target} />;

  if (state.loading) return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", color: P.inkSoft }}>טוען סרטון…</div>;
  if (state.error || !asset) return <div style={{ direction: "rtl", maxWidth: 780, margin: "60px auto", padding: 24, color: P.ink }}>
    <h1>הסרטון לא נמצא</h1><p style={{ color: P.inkSoft }}>הקישור אינו קיים או שהמדיה אינה ציבורית.</p>
    <Link to="/post">חזרה לתוכן</Link>
  </div>;

  const series = Array.isArray(asset.series_keys) ? asset.series_keys : [];
  const topics = Array.isArray(asset.topics) ? asset.topics : [];
  const ciphers = Array.isArray(asset.cipher_slugs) ? asset.cipher_slugs : [];

  return <main style={{ direction: "rtl", minHeight: "100vh", background: P.pageBg, color: P.ink }}>
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "42px 16px 90px" }}>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 800, letterSpacing: ".08em" }}>VIDEO · SOD1820</div>
      <h1 style={{ fontFamily: F.regal, fontSize: "clamp(28px,5vw,46px)", margin: "8px 0 20px", lineHeight: 1.18 }}>{title}</h1>

      <Player asset={{ ...asset, title }} poster={poster} />

      {(series.length || topics.length || ciphers.length) ? <section style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {series.map(s => <span key={"s"+s} style={{ border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 11px", fontSize: 12 }}>{SERIES_LABELS[s] || s}</span>)}
        {topics.map(t => <span key={"t"+t} style={{ border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 11px", fontSize: 12 }}>{t}</span>)}
        {ciphers.map(c => <Link key={"c"+c} to={`/codes/${encodeURIComponent(c)}`} style={{ border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 11px", fontSize: 12 }}>צופן: {c}</Link>)}
      </section> : null}

      {linkedPlacements.length ? <section style={{ marginTop: 30, borderTop: `1px solid ${P.border}`, paddingTop: 20 }}>
        <h2 style={{ fontFamily: F.heading, fontSize: 18 }}>מופיע גם בתוך</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {linkedPlacements.map((p, i) => {
            const path = internalPath(p.page_url);
            const label = decodeHtml(p.title || p.source_type || "מקור");
            return path
              ? <Link key={p.page_url+i} to={path} style={{ color: P.accentText }}>{label}</Link>
              : <a key={p.page_url+i} href={p.page_url} rel="noopener noreferrer">{label}</a>;
          })}
        </div>
      </section> : null}

      <p style={{ marginTop: 28, color: P.inkSoft, fontSize: 12 }}>
        asset {asset.public_id} · {asset.placement_count || 1} placement{Number(asset.placement_count) === 1 ? "" : "s"}
      </p>
    </div>
  </main>;
}
