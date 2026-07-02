import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { cleanName } from "../lib/galleryName.js";
import { domNum, shortDate, streamLabel } from "../lib/reality.js";
import { isNewSince } from "../lib/crossesNew.js";

// ✨ «שער המוזיאון» — פתיח-הזרם לפי תוכנית צוריאל (חלון ראווה, לא רשימת קבצים):
// הראשונה ענקית במרכז · ה-2 וה-3 מציצות מאחוריה משני הצדדים (צל + scale + הטיה עדינה,
// בלי סיבוב-קרוסלה) · 6 נוספות ברשת שקטה · מונה-עושר («50 בזרם מתוך 4,286») במקום אינסוף.
export default function MuseumGate({ hints = [], cutoff, palette: P, onOpen, onEdit, total = null, openGalleryTo = "/archive?tab=pool" }) {
  if (!hints.length) return null;
  const hero = hints[0];
  const peeks = hints.slice(1, 3);       // ה-2 וה-3 — מציצות מאחורי הענקית
  const grid = hints.slice(3, 9);        // 6 ברשת — סה"כ 9 בשער
  const v = domNum(hero);
  const title = cleanName(hero.name);
  const date = shortDate(hero);
  const added = streamLabel(hero);
  const fresh = cutoff ? isNewSince(hero, cutoff) : false;

  return (
    <div style={{ direction: "rtl", marginBottom: 22 }}>
      <style>{`
        .mg-stage { position:relative; max-width:680px; margin:0 auto 26px; padding-top:16px; }
        .mg-peek { position:absolute; top:0; width:60%; height:88%; border-radius:16px; overflow:hidden;
          border:1px solid rgba(212,175,55,0.22); box-shadow:0 18px 44px -16px rgba(0,0,0,.85);
          opacity:.8; cursor:zoom-in; transition:opacity .2s, transform .2s; }
        .mg-peek:hover { opacity:1; }
        .mg-peek img { width:100%; height:100%; object-fit:cover; display:block; filter:brightness(.72); }
        .mg-peek.r { inset-inline-start:-26px; transform:scale(.96) rotate(-1.2deg); }
        .mg-peek.l { inset-inline-end:-26px; transform:scale(.96) rotate(1.2deg); }
        .mg-hero { position:relative; margin:0 auto; width:86%; border-radius:20px; overflow:hidden; cursor:zoom-in;
          border:1.5px solid rgba(212,175,55,0.55);
          box-shadow:0 30px 70px -20px rgba(0,0,0,.9), 0 0 50px rgba(212,175,55,0.12); }
        .mg-hero img { display:block; width:100%; height:clamp(240px,44vw,380px); object-fit:cover;
          transition:transform .6s cubic-bezier(.2,.7,.3,1); }
        .mg-hero:hover img { transform:scale(1.03); }
        .mg-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; max-width:760px; margin:0 auto 22px; }
        @media (max-width:560px){ .mg-grid { grid-template-columns:repeat(2,1fr); } .mg-grid .mg-g:nth-child(n+5){ display:none; } .mg-peek { display:none; } .mg-hero { width:100%; } }
        .mg-g { position:relative; border-radius:12px; overflow:hidden; cursor:zoom-in;
          box-shadow:0 10px 26px -14px rgba(0,0,0,.75); transition:transform .18s; }
        .mg-g:hover { transform:translateY(-3px); }
        .mg-g img { display:block; width:100%; height:118px; object-fit:cover; }
      `}</style>

      {/* הבמה: ענקית + 2 מציצות (שתי תמונות נראות יחד איתה — צל, scale, הטיה בלבד) */}
      <div className="mg-stage">
        {peeks.map((h, i) => (
          <div key={h.id} className={`mg-peek ${i === 0 ? "r" : "l"}`} onClick={() => onOpen?.(i + 1)}
            style={{ borderColor: "rgba(212,175,55,0.22)" }}>
            {h.image_url && <img src={h.image_url} alt="" loading="lazy" />}
            <span style={{ position: "absolute", bottom: 8, [i === 0 ? "insetInlineStart" : "insetInlineEnd"]: 10, zIndex: 2,
              background: "rgba(0,0,0,.55)", color: "#e9ddbe", fontFamily: F.heading, fontSize: 10, fontWeight: 700,
              borderRadius: 999, padding: "2px 9px" }}>
              {domNum(h) != null ? `${domNum(h)} · ` : ""}{streamLabel(h) || shortDate(h) || ""}
            </span>
          </div>
        ))}
        <div className="mg-hero" onClick={() => onOpen?.(0)}>
          {hero.image_url
            ? <img src={hero.image_url} alt={title || ""} />
            : <div style={{ height: 300, background: "linear-gradient(135deg,#1a1200,#0a0a0a)" }} />}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(0,0,0,.28),transparent 30%,transparent 55%,rgba(0,0,0,.78))", pointerEvents: "none" }} />
          {v != null && (
            <Link to={`/number/${v}`} onClick={e => e.stopPropagation()}
              style={{ position: "absolute", top: 14, insetInlineStart: 14, zIndex: 2, background: "rgba(212,175,55,0.96)", color: "#1a0e00",
                fontFamily: F.mono, fontWeight: 900, fontSize: "clamp(24px,3.6vw,38px)", borderRadius: 12, padding: "2px 16px",
                textDecoration: "none", lineHeight: 1.15, boxShadow: "0 4px 18px rgba(0,0,0,.5)" }}>{v}</Link>
          )}
          {added && (
            <span style={{ position: "absolute", top: 16, insetInlineEnd: 14, zIndex: 2, background: fresh ? "rgba(224,85,106,.95)" : "rgba(0,0,0,.55)",
              color: "#fff", fontFamily: F.heading, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "3px 12px" }}>
              🆕 נוסף לזרם · {added}
            </span>
          )}
          {onEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(hero); }} title="ערוך"
              style={{ position: "absolute", bottom: 12, insetInlineEnd: 12, zIndex: 3, background: "rgba(0,0,0,.55)", color: "#fff",
                border: "1px solid rgba(255,255,255,.3)", borderRadius: 999, width: 28, height: 28, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
          )}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 18px 14px", zIndex: 2 }}>
            {title && <div style={{ color: "#fff", fontFamily: F.regal, fontSize: "clamp(15px,2.6vw,20px)", fontWeight: 800, textShadow: "0 2px 12px rgba(0,0,0,.9)", lineHeight: 1.35 }}>{title}</div>}
            {date && <div style={{ color: "rgba(255,255,255,.6)", fontFamily: F.heading, fontSize: 12, marginTop: 3 }}>🗓 {date}</div>}
          </div>
        </div>
      </div>

      {/* 6 ברשת שקטה */}
      {grid.length > 0 && (
        <div className="mg-grid">
          {grid.map((h, i) => (
            <div key={h.id} className="mg-g" onClick={() => onOpen?.(i + 3)} style={{ border: `1px solid ${P?.border || "rgba(212,175,55,0.18)"}` }}>
              {h.image_url && <img src={h.image_url} alt="" loading="lazy" />}
              {domNum(h) != null && (
                <span style={{ position: "absolute", top: 6, insetInlineStart: 6, background: "rgba(212,175,55,0.94)", color: "#1a0e00",
                  fontFamily: F.mono, fontWeight: 800, fontSize: 11, borderRadius: 7, padding: "1px 7px" }}>{domNum(h)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* חתימת עושר — במקום אינסוף */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 11 }}>
        <div style={{ color: P?.inkSoft || "#a99a7c", fontFamily: F.heading, fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
          📷 <b style={{ color: P?.accentText || "#e8c84a", fontFamily: F.mono, fontSize: 18, letterSpacing: 1 }}>{hints.length}</b> בזרם
          {total != null && <>· מתוך <b style={{ color: P?.accentText || "#e8c84a", fontFamily: F.mono, fontSize: 18, letterSpacing: 1 }}>{Number(total).toLocaleString("he")}</b> תמונות במאגר</>}
        </div>
        <Link to={openGalleryTo} style={{ display: "inline-block", background: "linear-gradient(135deg,#e9c84a,#9a7818)", color: "#231603",
          textDecoration: "none", fontFamily: F.heading, fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "11px 30px",
          boxShadow: "0 10px 28px -10px rgba(184,144,31,.6)" }}>🔎 פתח את הגלריה המלאה ←</Link>
      </div>
    </div>
  );
}
