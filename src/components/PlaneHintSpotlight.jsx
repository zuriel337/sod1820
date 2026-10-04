import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";

export const PLANE_HINT_VIDEO_URL = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/video/2026/10/plane-14000-14-75/original.mp4";
export const PLANE_HINT_POSTER_URL = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/2029/image/2026/10/plane-14000-14-75/poster.jpg";
export const PLANE_HINT_363_IMAGE_URL = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/posts/fz1073/plane-363-hamashiach-card-20261001.png";
export const PLANE_HINT_POST_HREF = "/flydubai-fz1073-363-14000-remzei-geula";

export const PLANE_HINT_GEMATRIA = Object.freeze({
  year: "שנת תשפ״ז = 787",
  messiah: "המשיח = 363",
  lines: [
    "״מי שגמלך כל טוב הוא יגמלך כל טוב סלה״ = 787",
    "״ושמחת בחגך״ = 787",
  ],
});

function tightRoute(pathname) {
  return pathname === "/2029"
    || pathname === "/world"
    || pathname === "/els"
    || pathname === "/heichal"
    || pathname === "/היכל"
    || pathname === "/research"
    || /^\/code(\/|$)/.test(pathname)
    || /^\/galaxy(\/|$)/.test(pathname)
    || /^\/sulamot/.test(pathname)
    || pathname === "/experience"
    || pathname === "/ניסיון"
    || /^\/entity-hub-preview(\/|$)/.test(pathname);
}

export function PlaneHintNotice({ embedded = false }) {
  const P = usePalette();
  return (
    <div
      role="note"
      aria-label="רמזי תשפ״ז והמטוס"
      data-experience-capability="plane-hint-gematria"
      style={{
        marginBottom: embedded ? 0 : 18,
        background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(122,19,32,0.10))",
        border: `1px solid ${P.borderStrong}`,
        borderRadius: 16,
        padding: embedded ? "12px 13px" : "16px 17px",
        textAlign: "center",
      }}
    >
      <div style={{ color: P.accentText, fontFamily: F.ui, fontSize: embedded ? 15 : "clamp(17px,2.5vw,21px)", fontWeight: 900, lineHeight: 1.45 }}>
        ✈️ רמזים מדהימים סביב המטוס שכמעט התרסק
      </div>
      {!embedded && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, marginTop: 3 }}>
          הפוסט המלא עם כל החיבורים — בהכנה.
        </div>
      )}
      <div style={{ color: P.ink, fontFamily: F.body, fontSize: embedded ? 13 : 14.5, lineHeight: 1.85, marginTop: 9 }}>
        <b style={{ color: P.accentText }}>{PLANE_HINT_GEMATRIA.year}</b><br />
        {PLANE_HINT_GEMATRIA.lines[0]}<br />
        {PLANE_HINT_GEMATRIA.lines[1]}
      </div>
      <div style={{ marginTop: 8 }}>
        <Link
          to="/number/363"
          style={{ color: P.accentText, fontFamily: F.numeric, fontSize: embedded ? 16 : 18, fontWeight: 900, textDecoration: "none" }}
        >
          {PLANE_HINT_GEMATRIA.messiah}
        </Link>
      </div>
      {!embedded && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>
          רמזים מופלאים של הצלה, הודיה ושמחה בפתחה של שנת תשפ״ז.
        </div>
      )}
      <div style={{ marginTop: 9, display: "flex", justifyContent: "center", gap: 7, flexWrap: "wrap" }}>
        <Link to="/number/14" style={chipStyle(P)}>14</Link>
        <Link to="/number/75" style={chipStyle(P)}>75</Link>
        <Link to="/number/363" style={chipStyle(P)}>{PLANE_HINT_GEMATRIA.messiah}</Link>
        {!embedded && <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, alignSelf: "center" }}>הסרטון החדש בזרם המציאות</span>}
      </div>
    </div>
  );
}

function chipStyle(P) {
  return {
    textDecoration: "none",
    color: P.accentText,
    background: P.card,
    border: `1px solid ${P.borderStrong}`,
    borderRadius: 999,
    padding: "3px 10px",
    fontFamily: F.numeric,
    fontSize: 13,
    fontWeight: 900,
  };
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
                <div style={{ color: P.accentText, fontFamily: F.ui, fontSize: 14, fontWeight: 900 }}>✈️ הרמז החי עכשיו</div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, marginTop: 2 }}>המטוס · {PLANE_HINT_GEMATRIA.messiah}</div>
              </div>
              <button className="plane-spotlight-collapse" onClick={() => setOpen(false)} aria-label="מזער את סרטון המטוס" title="מזער">×</button>
            </div>

            <video
              className="plane-spotlight-video"
              src={PLANE_HINT_VIDEO_URL}
              poster={PLANE_HINT_POSTER_URL}
              controls
              playsInline
              preload="metadata"
              aria-label="סרטון הרמז על המטוס"
            />

            <Link
              to={PLANE_HINT_POST_HREF}
              className="plane-spotlight-363-pop"
              style={{ color: P.ink, borderColor: P.borderStrong, background: P.cardSoft }}
              aria-label="פתח את אירוע המטוס — המשיח = 363"
            >
              <img src={PLANE_HINT_363_IMAGE_URL} alt="רמזים במציאות — המשיח = 363" />
              <span>
                <b style={{ color: P.accentText, fontFamily: F.numeric }}>{PLANE_HINT_GEMATRIA.messiah}</b>
                <small style={{ color: P.inkSoft, fontFamily: F.body }}>לתמונה ולאירוע המטוס</small>
              </span>
            </Link>

            <PlaneHintNotice embedded />

            <div className="plane-spotlight-actions">
              <Link to="/archive" style={{ color: P.accentText, borderColor: P.borderStrong }}>🌊 לזרם המציאות</Link>
              <Link to={PLANE_HINT_POST_HREF} style={{ color: P.accentText, borderColor: P.borderStrong }}>✈️ לאירוע המלא</Link>
              <Link to="/number/14" style={{ color: P.ink, borderColor: P.borderStrong }}>14</Link>
              <Link to="/number/75" style={{ color: P.ink, borderColor: P.borderStrong }}>75</Link>
              <Link to="/number/363" style={{ color: P.ink, borderColor: P.borderStrong }}>{PLANE_HINT_GEMATRIA.messiah}</Link>
            </div>
          </aside>
        ) : (
          <button
            className="plane-spotlight-mini"
            onClick={() => setOpen(true)}
            aria-label="פתח את סרטון המטוס והרמזים"
            title="פתח את סרטון המטוס והרמזים"
            style={{ background: P.card, borderColor: P.borderStrong, color: P.ink }}
          >
            <img src={PLANE_HINT_363_IMAGE_URL} alt="" aria-hidden="true" />
            <span>
              <b style={{ color: P.accentText, fontFamily: F.ui }}>✈️ המטוס</b>
              <small style={{ color: P.inkSoft, fontFamily: F.body }}>{PLANE_HINT_GEMATRIA.messiah}</small>
            </span>
            <strong style={{ color: P.accentText, fontFamily: F.numeric }}>{PLANE_HINT_GEMATRIA.messiah}</strong>
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
    width: min(300px, calc(100vw - 24px));
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
    border-radius: 18px;
    padding: 10px;
    max-height: min(78vh, 720px);
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
  .plane-spotlight-video {
    display: block;
    width: 100%;
    height: 250px;
    object-fit: contain;
    background: #050505;
    border-radius: 13px;
    margin-bottom: 9px;
  }
  .plane-spotlight-363-pop {
    width: min(205px, 100%);
    min-height: 86px;
    margin: -2px auto 9px 0;
    border: 1px solid;
    border-radius: 14px;
    padding: 6px;
    display: flex;
    align-items: center;
    gap: 9px;
    text-decoration: none;
    direction: rtl;
    box-shadow: 0 10px 28px rgba(0,0,0,.22);
    animation: plane-spotlight-363-pop .46s cubic-bezier(.2,.8,.2,1) both;
  }
  .plane-spotlight-363-pop img {
    width: 54px;
    height: 76px;
    object-fit: cover;
    object-position: center;
    border-radius: 10px;
    flex: 0 0 auto;
    background: #050505;
  }
  .plane-spotlight-363-pop span {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
    line-height: 1.25;
  }
  .plane-spotlight-363-pop b { font-size: 15px; }
  .plane-spotlight-363-pop small { font-size: 10.5px; }
  @keyframes plane-spotlight-363-pop {
    from { opacity: 0; transform: translate(-12px, 8px) scale(.94); }
    to { opacity: 1; transform: none; }
  }
  .plane-spotlight-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 9px;
  }
  .plane-spotlight-actions a {
    border: 1px solid;
    border-radius: 999px;
    padding: 5px 9px;
    text-decoration: none;
    font-family: ${F.ui};
    font-size: 11.5px;
    font-weight: 800;
  }
  .plane-spotlight-mini {
    width: 100%;
    min-height: 76px;
    border: 1px solid;
    border-radius: 16px;
    padding: 6px;
    display: grid;
    grid-template-columns: 48px 1fr auto;
    align-items: center;
    gap: 8px;
    text-align: start;
    cursor: pointer;
  }
  .plane-spotlight-mini img {
    width: 48px;
    height: 64px;
    object-fit: cover;
    border-radius: 10px;
    background: #080808;
  }
  .plane-spotlight-mini span {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .plane-spotlight-mini small { font-size: 11px; }
  .plane-spotlight-mini strong { white-space: nowrap; font-size: 13px; }
  @media (max-width: 979px) {
    .plane-spotlight {
      width: min(260px, calc(100vw - 24px));
      bottom: max(76px, calc(12px + env(safe-area-inset-bottom)));
    }
    .plane-spotlight.is-open {
      width: min(330px, calc(100vw - 24px));
    }
    .plane-spotlight-card {
      max-height: min(72vh, 620px);
    }
    .plane-spotlight-video { height: 220px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .plane-spotlight * { scroll-behavior: auto !important; }
    .plane-spotlight-363-pop { animation: none !important; }
  }
`;
