import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { cleanName } from "../lib/galleryName.js";
import { domNum, shortDate, streamLabel } from "../lib/reality.js";
import { isNewSince } from "../lib/crossesNew.js";

// 💎 «יהלום» — פתיח הזרם המפואר (בחירת צוריאל, פורמט A):
// התמונה שהתווספה אחרונה = ענקית (Hero), וה-2/3/4/5 «משתלשלות פנימה» במפל תלת-מימדי
// (perspective + rotateY + translateZ) שהולך וקטן ודוהה. לחיצה על כל תמונה → לייטבוקס.
// mobile: המפל יורד מתחת ל-Hero ומתכווץ. עץ אחד: אותם hints — רק עדשת-תצוגה.
export default function DiamondCascade({ hints = [], cutoff, palette: P, onOpen, onEdit }) {
  if (!hints.length) return null;
  const hero = hints[0];
  const cascade = hints.slice(1, 5);
  const v = domNum(hero);
  const title = cleanName(hero.name);
  const date = shortDate(hero);
  const added = streamLabel(hero);
  const fresh = cutoff ? isNewSince(hero, cutoff) : false;

  // מדרגות המפל — גובה/הסטה/סיבוב/שקיפות הולכים ופוחתים («משתלשל פנימה»)
  const steps = [
    { h: 128, ms: 0,  rot: -14, z: 26,  op: 1,   border: "rgba(212,175,55,0.55)", shadow: "0 16px 40px -14px rgba(0,0,0,.75)" },
    { h: 100, ms: 20, rot: -20, z: 0,   op: .9,  border: "rgba(212,175,55,0.35)", shadow: "0 12px 30px -12px rgba(0,0,0,.6)" },
    { h: 76,  ms: 40, rot: -25, z: -26, op: .68, border: "rgba(212,175,55,0.2)",  shadow: "none" },
    { h: 56,  ms: 58, rot: -28, z: -52, op: .45, border: "transparent",           shadow: "none" },
  ];

  return (
    <div className="dc-wrap" style={{ direction: "rtl", marginBottom: 18 }}>
      <style>{`
        .dc-grid { display:flex; gap:16px; align-items:stretch; }
        .dc-cascade { flex:1; min-width:0; perspective:900px; display:flex; flex-direction:column; gap:10px; justify-content:center; }
        .dc-hero { position:relative; flex:1.55; min-width:0; border-radius:20px; overflow:hidden; cursor:zoom-in;
          border:1.5px solid rgba(212,175,55,0.5);
          box-shadow:0 22px 60px -18px rgba(0,0,0,.8), 0 0 44px rgba(212,175,55,0.14); }
        .dc-hero img { transition: transform .6s cubic-bezier(.2,.7,.3,1); }
        .dc-hero:hover img { transform: scale(1.03); }
        .dc-item { position:relative; border-radius:13px; overflow:hidden; cursor:zoom-in; transform-style:preserve-3d;
          transition: transform .3s, opacity .3s; }
        .dc-item:hover { transform: none !important; opacity:1 !important; z-index:4; }
        @media (max-width: 700px) {
          .dc-grid { flex-direction:column; }
          .dc-cascade { flex-direction:row; perspective:700px; gap:8px; }
          .dc-item { flex:1; height:74px !important; margin-inline-start:0 !important; }
        }
      `}</style>

      <div className="dc-grid">
        {/* 💎 ה-Hero — התמונה שנוספה אחרונה, הכי גדולה */}
        <div className="dc-hero" onClick={() => onOpen?.(0)}>
          {hero.image_url
            ? <img src={hero.image_url} alt={title || ""} style={{ width: "100%", height: "100%", minHeight: 250, maxHeight: "min(56vh,520px)", objectFit: "cover", display: "block" }} />
            : <div style={{ height: 280, background: "linear-gradient(135deg,#1a1200,#0a0a0a)" }} />}
          {/* צל תחתון לכיתוב */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.3) 0%, transparent 30%, transparent 55%, rgba(0,0,0,.75) 100%)", pointerEvents: "none" }} />
          {/* «נוסף לזרם» */}
          {added && (
            <span style={{ position: "absolute", top: 12, insetInlineEnd: 12, zIndex: 2, display: "inline-flex", alignItems: "center", gap: 6,
              background: fresh ? "rgba(224,85,106,.95)" : "rgba(0,0,0,.55)", color: "#fff",
              fontFamily: F.heading, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "3px 11px",
              animation: fresh ? "hn-pulse 1.8s ease-in-out infinite" : "none" }}>
              🆕 נוסף לזרם · {added}
            </span>
          )}
          {/* המספר הדומיננטי */}
          {v != null && (
            <Link to={`/number/${v}`} onClick={e => e.stopPropagation()}
              style={{ position: "absolute", top: 12, insetInlineStart: 12, zIndex: 2, background: "rgba(212,175,55,0.96)", color: "#1a0e00",
                fontFamily: F.mono, fontWeight: 900, fontSize: "clamp(26px,4vw,44px)", borderRadius: 12, padding: "2px 16px", textDecoration: "none", lineHeight: 1.15,
                boxShadow: "0 4px 18px rgba(0,0,0,.5)" }}>{v}</Link>
          )}
          {/* עריכה (אדמין) */}
          {onEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(hero); }} title="ערוך"
              style={{ position: "absolute", bottom: 12, insetInlineEnd: 12, zIndex: 3, background: "rgba(0,0,0,.55)", color: "#fff",
                border: "1px solid rgba(255,255,255,.3)", borderRadius: 999, width: 28, height: 28, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
          )}
          {/* כיתוב */}
          <div style={{ position: "absolute", bottom: 0, right: 0, left: 0, padding: "16px 16px 12px", zIndex: 2 }}>
            {title && <div style={{ color: "#fff", fontFamily: F.regal, fontSize: "clamp(15px,2.4vw,21px)", fontWeight: 800, textShadow: "0 2px 12px rgba(0,0,0,.9)", lineHeight: 1.35 }}>{title}</div>}
            {date && <div style={{ color: "rgba(255,255,255,.65)", fontFamily: F.heading, fontSize: 12, marginTop: 3 }}>🗓 {date}</div>}
          </div>
        </div>

        {/* 🌀 המפל — 2/3/4/5 משתלשלות פנימה בתלת-מימד */}
        {cascade.length > 0 && (
          <div className="dc-cascade">
            {cascade.map((h, i) => {
              const s = steps[i] || steps[steps.length - 1];
              const hv = domNum(h);
              return (
                <div key={h.id} className="dc-item" onClick={() => onOpen?.(i + 1)}
                  style={{ height: s.h, marginInlineStart: s.ms, opacity: s.op,
                    transform: `rotateY(${s.rot}deg) translateZ(${s.z}px)`,
                    border: `1px solid ${s.border}`, boxShadow: s.shadow }}>
                  {h.image_url
                    ? <img src={h.image_url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a1200,#0a0a0a)" }} />}
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,.55) 100%)", pointerEvents: "none" }} />
                  {hv != null && i < 2 && (
                    <Link to={`/number/${hv}`} onClick={e => e.stopPropagation()}
                      style={{ position: "absolute", top: 6, insetInlineStart: 6, background: "rgba(212,175,55,0.94)", color: "#1a0e00",
                        fontFamily: F.mono, fontWeight: 800, fontSize: 12, borderRadius: 7, padding: "1px 8px", textDecoration: "none", zIndex: 2 }}>{hv}</Link>
                  )}
                  {/* «נוסף» קטן על השתיים הראשונות */}
                  {i < 2 && streamLabel(h) && (
                    <span style={{ position: "absolute", bottom: 5, insetInlineStart: 7, zIndex: 2, color: "rgba(255,255,255,.85)", fontFamily: F.heading, fontSize: 9.5, fontWeight: 700, textShadow: "0 1px 5px rgba(0,0,0,.9)" }}>
                      נוסף {streamLabel(h)}
                    </span>
                  )}
                  {/* ✏️ עריכה (אדמין) — גם על תמונות-המפל, לא רק ה-Hero */}
                  {onEdit && (
                    <button onClick={e => { e.stopPropagation(); onEdit(h); }} title="ערוך תמונה"
                      style={{ position: "absolute", top: 5, insetInlineEnd: 5, zIndex: 3, background: "rgba(0,0,0,.55)", color: "#fff",
                        border: "none", borderRadius: 999, width: 22, height: 22, fontSize: 11, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center" }}>✏️</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
