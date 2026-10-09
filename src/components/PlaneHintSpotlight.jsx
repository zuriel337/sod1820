import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";

export const PLANE_HINT_POST_HREF = "/flydubai-fz1073-363-14000-remzei-geula";

const PLANE_VIDEOS = Object.freeze([
  Object.freeze({
    id: "83c3afd23566b3ded4b85427c4327e95",
    title: "החיבור בין שביעי לעשירי למטוס — שלוש שנים לשביעי באוקטובר",
    mediaUrl: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/video/2026/10/d808d3ce-9312-4c15-b5ed-4fbf45a3c8a9/original.mp4",
    posterUrl: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/channel-thumbs/b9be2ae0-1d08-40a2-bdcf-346ea7ffbbbb.jpg",
    treeHref: "/2029/number/718",
    isNew: true,
    tags: [
      "1073", "73", "חכמה", "Free Zion", "שחררו את ציון", "14000",
      "363", "המשיח", "604", "תדר", "משיח בן דוד", "1718", "718",
      "חדשות", "שביעי באוקטובר", "התשובה", "631", "תאריך",
      "מלך ישראל", "נפתלי בנט", "עופר וינטר", "1820", "1202",
      "התגלות משיח", "בראשית ברא אלהים", "חרבות ברזל",
    ],
  }),
  Object.freeze({
    id: "988b0457cc44074a29a98f7abe4029fb",
    title: "טיסה 1073 — 14,000 רגל, 363 והנחיתה בסעודיה",
    mediaUrl: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/video/2026/10/plane-14000-14-75/final-20261001-v4.mp4",
    posterUrl: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/10/plane-14000-14-75/poster-final-20261001-v3.jpg",
    treeHref: "/2029/number/1073",
    isNew: false,
    tags: [
      "1073", "FZ1073", "Free Zion", "שחררו את ציון", "14000",
      "14", "75", "750", "7500", "776", "787", "363", "המשיח",
      "683", "סנכרון", "386", "דוד בן ישי", "73",
    ],
  }),
]);

function tightRoute(pathname) {
  return pathname === "/2029"
    || pathname === "/world"
    || pathname === "/els"
    || pathname === "/heichal"
    || pathname === "/היכל"
    || pathname === "/research"
    || /^\/2029\//.test(pathname)
    || /^\/code(\/|$)/.test(pathname)
    || /^\/galaxy(\/|$)/.test(pathname)
    || /^\/sulamot/.test(pathname)
    || pathname === "/experience"
    || pathname === "/ניסיון"
    || /^\/entity-hub-preview(\/|$)/.test(pathname);
}

function tagHref(tag) {
  const value = String(tag || "").trim();
  if (/^\d+$/.test(value)) return `/2029/number/${encodeURIComponent(value)}`;
  return `/2029/gematria?q=${encodeURIComponent(value)}`;
}

function VideoCard({ video, P }) {
  return (
    <article className="plane-video-card" data-video-public-id={video.id}>
      <div className="plane-video-frame">
        <video
          className="plane-video-player"
          src={video.mediaUrl}
          poster={video.posterUrl}
          controls
          playsInline
          preload="metadata"
          aria-label={video.title}
        />
        {video.isNew ? <span className="plane-video-new" aria-label="חדש">חדש</span> : null}
      </div>

      <div className="plane-video-title" style={{ color: P.ink, fontFamily: F.ui }}>{video.title}</div>

      <div className="plane-video-links">
        <a className="plane-video-tree-link" href={video.treeHref} style={{ color: P.accentText, borderColor: P.borderStrong }}>
          פתח בעץ החדש ←
        </a>
        <Link to={PLANE_HINT_POST_HREF} style={{ color: P.inkSoft }}>
          לפוסט המטוס
        </Link>
      </div>

      <details className="plane-video-tags" style={{ borderColor: P.border }}>
        <summary style={{ color: P.accentText, fontFamily: F.ui }}>
          תיוגי העץ · {video.tags.length} · פתח במערכת החדשה
        </summary>
        <div className="plane-video-tags-help" style={{ color: P.inkSoft, fontFamily: F.body }}>
          התיוג נשאר סגור כברירת מחדל. כל תג פותח את ההקשר שלו במערכת החדשה.
        </div>
        <div className="plane-video-tag-list">
          {video.tags.map((tag) => (
            <a
              key={tag}
              href={tagHref(tag)}
              className="plane-video-tag"
              style={{ color: P.ink, borderColor: P.borderStrong, background: P.cardSoft }}
            >
              {tag}
            </a>
          ))}
        </div>
      </details>
    </article>
  );
}

export default function PlaneHintSpotlight() {
  const { pathname } = useLocation();
  const P = usePalette();
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 980px)").matches && !tightRoute(pathname);
  });

  useEffect(() => {
    if (tightRoute(pathname)) setOpen(false);
  }, [pathname]);

  return (
    <>
      <style>{SPOTLIGHT_CSS}</style>
      <div
        className={`plane-spotlight ${open ? "is-open" : "is-closed"}`}
        dir="rtl"
        data-experience-surface="global-plane-hint"
        data-experience-capability="reality-video"
      >
        {open ? (
          <aside className="plane-spotlight-card" style={{ background: P.card, borderColor: P.borderStrong }}>
            <div className="plane-spotlight-head">
              <div>
                <div style={{ color: P.accentText, fontFamily: F.ui, fontSize: 14, fontWeight: 900 }}>✈️ סרטוני המטוס</div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, marginTop: 2 }}>שני הסרטונים · מחוברים לתיוגי העץ החדש</div>
              </div>
              <button className="plane-spotlight-collapse" onClick={() => setOpen(false)} aria-label="מזער את סרטוני המטוס" title="מזער">×</button>
            </div>

            <div className="plane-video-stack">
              {PLANE_VIDEOS.map((video) => <VideoCard key={video.id} video={video} P={P} />)}
            </div>

            <div className="plane-spotlight-footer">
              <Link to={PLANE_HINT_POST_HREF} style={{ color: P.accentText, borderColor: P.borderStrong }}>✈️ כל החיבורים בפוסט</Link>
              <a href="/world" style={{ color: P.accentText, borderColor: P.borderStrong }}>🌐 לעולם החדש</a>
            </div>
          </aside>
        ) : (
          <button
            className="plane-spotlight-mini"
            onClick={() => setOpen(true)}
            aria-label="פתח את שני סרטוני המטוס"
            title="פתח את שני סרטוני המטוס"
            style={{ background: P.card, borderColor: P.borderStrong, color: P.ink }}
          >
            <span className="plane-mini-posters" aria-hidden="true">
              {PLANE_VIDEOS.map((video) => <img key={video.id} src={video.posterUrl} alt="" />)}
            </span>
            <span>
              <b style={{ color: P.accentText, fontFamily: F.ui }}>✈️ סרטוני המטוס</b>
              <small style={{ color: P.inkSoft, fontFamily: F.body }}>2 סרטונים · תיוגי העץ</small>
            </span>
            <strong className="plane-mini-new" style={{ color: P.accentText, fontFamily: F.ui }}>חדש</strong>
          </button>
        )}
      </div>
    </>
  );
}

const SPOTLIGHT_CSS = `
  .plane-spotlight {
    position: fixed;
    left: max(12px, env(safe-area-inset-left));
    bottom: max(18px, env(safe-area-inset-bottom));
    z-index: 1800;
    width: min(330px, calc(100vw - 24px));
    pointer-events: none;
  }
  .plane-spotlight-card,
  .plane-spotlight-mini {
    pointer-events: auto;
    box-shadow: 0 18px 48px rgba(0,0,0,.34);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  .plane-spotlight-card {
    border: 1px solid;
    border-radius: 20px;
    padding: 10px;
    max-height: min(82vh, 760px);
    overflow: auto;
  }
  .plane-spotlight-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 2px 2px 9px;
  }
  .plane-spotlight-collapse {
    width: 32px;
    height: 32px;
    border-radius: 999px;
    border: 1px solid rgba(127,127,127,.28);
    background: rgba(0,0,0,.14);
    color: inherit;
    cursor: pointer;
    font-size: 21px;
    line-height: 1;
  }
  .plane-video-stack {
    display: grid;
    gap: 12px;
  }
  .plane-video-card {
    border-top: 1px solid rgba(127,127,127,.18);
    padding-top: 10px;
  }
  .plane-video-card:first-child {
    border-top: 0;
    padding-top: 0;
  }
  .plane-video-frame {
    position: relative;
    border-radius: 14px;
    overflow: hidden;
    background: #050505;
  }
  .plane-video-player {
    display: block;
    width: 100%;
    height: 178px;
    object-fit: contain;
    background: #050505;
  }
  .plane-video-new {
    position: absolute;
    inset-inline-start: 9px;
    bottom: 9px;
    z-index: 2;
    border-radius: 999px;
    padding: 4px 10px;
    background: rgba(232,194,90,.96);
    color: #1b1202;
    font-family: ${F.ui};
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .04em;
    box-shadow: 0 0 0 1px rgba(255,255,255,.3), 0 0 18px rgba(232,194,90,.48);
    animation: plane-video-new-pulse 1.35s ease-in-out infinite;
  }
  @keyframes plane-video-new-pulse {
    0%,100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 1px rgba(255,255,255,.3), 0 0 14px rgba(232,194,90,.36); }
    50% { opacity: .62; transform: scale(1.06); box-shadow: 0 0 0 1px rgba(255,255,255,.5), 0 0 24px rgba(232,194,90,.68); }
  }
  .plane-video-title {
    margin-top: 7px;
    font-size: 12.5px;
    font-weight: 850;
    line-height: 1.45;
  }
  .plane-video-links {
    display: flex;
    align-items: center;
    gap: 9px;
    flex-wrap: wrap;
    margin-top: 7px;
    font-family: ${F.ui};
    font-size: 10.8px;
  }
  .plane-video-links a {
    text-decoration: none;
  }
  .plane-video-tree-link {
    border: 1px solid;
    border-radius: 999px;
    padding: 4px 9px;
    font-weight: 850;
  }
  .plane-video-tags {
    margin-top: 8px;
    border: 1px solid;
    border-radius: 12px;
    padding: 0 9px;
  }
  .plane-video-tags summary {
    cursor: pointer;
    list-style-position: inside;
    padding: 7px 0;
    font-size: 10.8px;
    font-weight: 850;
  }
  .plane-video-tags-help {
    font-size: 10.5px;
    line-height: 1.5;
    padding: 0 0 6px;
  }
  .plane-video-tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding-bottom: 9px;
  }
  .plane-video-tag {
    border: 1px solid;
    border-radius: 999px;
    padding: 3px 7px;
    text-decoration: none;
    font-family: ${F.ui};
    font-size: 9.8px;
    line-height: 1.3;
  }
  .plane-spotlight-footer {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 11px;
    padding-top: 9px;
    border-top: 1px solid rgba(127,127,127,.18);
  }
  .plane-spotlight-footer a {
    border: 1px solid;
    border-radius: 999px;
    padding: 5px 9px;
    text-decoration: none;
    font-family: ${F.ui};
    font-size: 11px;
    font-weight: 850;
  }
  .plane-spotlight-mini {
    width: 100%;
    min-height: 78px;
    border: 1px solid;
    border-radius: 17px;
    padding: 7px;
    display: grid;
    grid-template-columns: 66px 1fr auto;
    align-items: center;
    gap: 8px;
    text-align: start;
    cursor: pointer;
  }
  .plane-mini-posters {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px;
    width: 66px;
    height: 58px;
  }
  .plane-mini-posters img {
    width: 100%;
    height: 58px;
    object-fit: cover;
    border-radius: 8px;
    background: #080808;
  }
  .plane-spotlight-mini > span:not(.plane-mini-posters) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .plane-spotlight-mini small { font-size: 10.5px; }
  .plane-mini-new {
    white-space: nowrap;
    font-size: 10.5px;
    animation: plane-video-new-pulse 1.35s ease-in-out infinite;
  }
  @media (max-width: 979px) {
    .plane-spotlight {
      width: min(280px, calc(100vw - 24px));
      bottom: max(76px, calc(12px + env(safe-area-inset-bottom)));
    }
    .plane-spotlight.is-open {
      width: min(340px, calc(100vw - 24px));
    }
    .plane-spotlight-card {
      max-height: min(76vh, 650px);
    }
    .plane-video-player { height: 168px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .plane-video-new,
    .plane-mini-new { animation: none !important; }
  }
`;
