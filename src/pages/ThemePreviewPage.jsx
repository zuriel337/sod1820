import React, { useState } from "react";
import { F } from "../theme.js";

// ===== עמוד תצוגת צבעים =====
// מציג שתי פלטות מועמדות לעיצוב החדש ("מלכותי · עתידני · רוחני · חללי · מיסטי")
// עם מתג שמחליף ביניהן חי על אותם רכיבים. זמני — לבחירת כיוון, לא חלק מהאתר הסופי.

const PALETTES = {
  stellar: {
    key: "stellar",
    name: "היכל הכוכבים",
    tagline: "זהב מלכותי · סגול קוסמי · טורקיז ניאון",
    bg: "#070512",
    bgGlow: "#140d2e",
    text: "#EDE7FF",
    textDim: "#b6abd6",
    accent: "#F2D27A",   // זהב מלכותי
    accent2: "#9D6BFF",  // סגול אמתיסט
    accent3: "#37E5D4",  // טורקיז ניאון
    accent4: "#E0529E",  // מג'נטה ערפילית
    glass: "rgba(30,20,58,0.42)",
    glassBorder: "rgba(157,107,255,0.32)",
    swatches: [
      ["רקע חלל", "#070512"], ["זוהר ערפילית", "#140d2e"], ["זהב מלכותי", "#F2D27A"],
      ["סגול אמתיסט", "#9D6BFF"], ["טורקיז ניאון", "#37E5D4"], ["מג'נטה", "#E0529E"],
    ],
  },
  sapphire: {
    key: "sapphire",
    name: "ספיר וקרח",
    tagline: "כחול חשמלי · פלטינה · סגול מיסטי",
    bg: "#04060F",
    bgGlow: "#0a1330",
    text: "#E6EEFF",
    textDim: "#9fb3d0",
    accent: "#CBD5E1",   // פלטינה
    accent2: "#3B82F6",  // כחול אזור
    accent3: "#22D3EE",  // טורקיז
    accent4: "#8B5CF6",  // סגול מיסטי
    glass: "rgba(14,26,52,0.5)",
    glassBorder: "rgba(59,130,246,0.32)",
    swatches: [
      ["רקע לילה", "#04060F"], ["זוהר עמוק", "#0a1330"], ["פלטינה", "#CBD5E1"],
      ["כחול אזור", "#3B82F6"], ["טורקיז", "#22D3EE"], ["סגול מיסטי", "#8B5CF6"],
    ],
  },
};

const CSS = `
  @keyframes tp-drift {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(2%, -2%) scale(1.05); }
  }
  @keyframes tp-pulse {
    0%,100% { opacity: 0.85; }
    50%     { opacity: 1; }
  }
  @keyframes tp-spin { to { transform: rotate(360deg); } }
  .tp-card { transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease; }
  .tp-card:hover { transform: translateY(-6px); }
  .tp-btn { transition: all .25s ease; cursor: pointer; }
`;

function Nebula({ p }) {
  // ערפילית קוסמית — שכבות רדיאליות זוהרות מעל הרקע העמוק
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      <div style={{
        position: "absolute", inset: "-20%",
        background: `radial-gradient(40% 35% at 22% 18%, ${p.accent2}22, transparent 60%),
                     radial-gradient(45% 40% at 82% 26%, ${p.accent3}1f, transparent 62%),
                     radial-gradient(50% 45% at 60% 88%, ${p.accent4}1c, transparent 60%),
                     radial-gradient(60% 60% at 50% 50%, ${p.bgGlow}, transparent 70%)`,
        animation: "tp-drift 18s ease-in-out infinite",
      }} />
      {/* שדה כוכבים עדין */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.5,
        backgroundImage: `radial-gradient(1px 1px at 20% 30%, #fff8, transparent),
                          radial-gradient(1px 1px at 70% 60%, #fff6, transparent),
                          radial-gradient(1px 1px at 40% 80%, #fff5, transparent),
                          radial-gradient(1px 1px at 88% 18%, #fff7, transparent),
                          radial-gradient(1px 1px at 55% 12%, #fff5, transparent)`,
      }} />
    </div>
  );
}

function Glass({ p, children, style = {}, glow }) {
  return (
    <div className="tp-card" style={{
      background: p.glass,
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      border: `1px solid ${p.glassBorder}`,
      borderRadius: 18,
      boxShadow: glow ? `0 0 0 1px ${p.glassBorder}, 0 12px 40px ${p.bg}, 0 0 36px ${glow}33` : `0 12px 40px ${p.bg}cc`,
      ...style,
    }}>{children}</div>
  );
}

function NeonButton({ p, children, primary }) {
  const [h, setH] = useState(false);
  return (
    <span className="tp-btn" onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      display: "inline-block", padding: "13px 34px", borderRadius: 12,
      fontFamily: F.heading, fontWeight: 700, fontSize: 14, letterSpacing: 2,
      color: primary ? p.bg : p.accent3,
      background: primary ? `linear-gradient(135deg, ${p.accent3}, ${p.accent2})` : "transparent",
      border: `1px solid ${primary ? "transparent" : p.accent3}`,
      boxShadow: h
        ? `0 0 28px ${primary ? p.accent3 : p.accent3}88, 0 0 8px ${p.accent2}`
        : `0 0 14px ${primary ? p.accent3 : "transparent"}55`,
      transform: h ? "translateY(-2px)" : "none",
    }}>{children}</span>
  );
}

function NumberNode({ p, n, color, size = 78 }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      width: size, height: size, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: F.heading, fontWeight: 800, fontSize: size * 0.32, color: p.text,
      background: `radial-gradient(circle at 35% 30%, ${color}55, ${p.bgGlow} 70%)`,
      border: `1.5px solid ${color}`,
      boxShadow: `0 0 ${h ? 38 : 22}px ${color}${h ? "cc" : "88"}, inset 0 0 18px ${color}55`,
      transition: "all .3s ease", cursor: "pointer",
      transform: h ? "scale(1.08)" : "scale(1)",
      animation: "tp-pulse 3.5s ease-in-out infinite",
    }}>{n}</div>
  );
}

// ===== שער מלכותי — כתר, עמודים מעוטרים משני הצדדים, קשת וזוהר זהב =====

function Crown({ size = 150 }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 200 164" style={{ display: "block", margin: "0 auto" }}>
      <defs>
        <linearGradient id="rgCrown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBEFB0" />
          <stop offset="38%" stopColor="#F2D27A" />
          <stop offset="68%" stopColor="#D4A92E" />
          <stop offset="100%" stopColor="#9A7818" />
        </linearGradient>
        <filter id="rgGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter="url(#rgGlow)">
        <path d="M28,104 L42,44 L70,82 L100,30 L130,82 L158,44 L172,104 Z" fill="url(#rgCrown)" stroke="#6e4e10" strokeWidth="2" strokeLinejoin="round" />
        <rect x="28" y="100" width="144" height="34" rx="6" fill="url(#rgCrown)" stroke="#6e4e10" strokeWidth="2" />
        <circle cx="42" cy="42" r="7.5" fill="#FBEFB0" stroke="#6e4e10" strokeWidth="1.5" />
        <circle cx="158" cy="42" r="7.5" fill="#FBEFB0" stroke="#6e4e10" strokeWidth="1.5" />
        <circle cx="100" cy="24" r="8.5" fill="#FBEFB0" stroke="#6e4e10" strokeWidth="1.5" />
        <circle cx="100" cy="11" r="4.5" fill="#F6E27A" stroke="#6e4e10" strokeWidth="1" />
        <circle cx="62" cy="117" r="7.5" fill="#b02a2a" stroke="#7a1320" strokeWidth="1.5" />
        <circle cx="100" cy="117" r="8.5" fill="#2a5bb0" stroke="#16356e" strokeWidth="1.5" />
        <circle cx="138" cy="117" r="7.5" fill="#b02a2a" stroke="#7a1320" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function Pillar({ side }) {
  // עמוד זהב מעוטר עם פינים (כיפה) למעלה — מסגרת השער משני הצדדים
  return (
    <div style={{ position: "absolute", top: 0, bottom: 0, [side]: 0, width: 58, zIndex: 1, pointerEvents: "none" }}>
      {/* פינים עליון */}
      <div style={{ position: "absolute", top: -22, [side]: 6,
        width: 46, height: 46, borderRadius: "50% 50% 46% 46%",
        background: "linear-gradient(90deg,#6e4e10,#F6E27A 30%,#C9971E 55%,#F6E27A 78%,#6e4e10)",
        boxShadow: "0 0 18px #C9971E88", border: "1px solid #6e4e10" }} />
      {/* גוף העמוד */}
      <div style={{ position: "absolute", top: 14, bottom: 0, [side]: 0, width: 58,
        background: "linear-gradient(90deg,#5a3f0c 0%,#F6E27A 22%,#E8C84A 40%,#C9971E 50%,#E8C84A 60%,#F6E27A 78%,#5a3f0c 100%)",
        boxShadow: "0 0 30px #C9971E55, inset 0 0 12px #6e4e1066",
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0 26px, rgba(110,78,16,0.45) 26px 28px),
                          linear-gradient(90deg,#5a3f0c 0%,#F6E27A 22%,#E8C84A 40%,#C9971E 50%,#E8C84A 60%,#F6E27A 78%,#5a3f0c 100%)` }} />
    </div>
  );
}

function CountdownBox({ p, n, label }) {
  return (
    <div style={{ minWidth: 72, padding: "12px 8px 9px", borderRadius: 12, textAlign: "center",
      background: "rgba(20,12,2,0.5)", backdropFilter: "blur(6px)",
      border: "1px solid #C9971E66", boxShadow: "inset 0 0 16px #6e4e1055, 0 0 18px #C9971E22" }}>
      <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: 30, color: "#F6E27A", textShadow: `0 0 16px ${p.accent}88`, lineHeight: 1 }}>{n}</div>
      <div style={{ fontFamily: F.heading, fontSize: 11, letterSpacing: 2, color: "#C9971E", marginTop: 6 }}>{label}</div>
    </div>
  );
}

function RoyalGate({ p }) {
  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", marginBottom: 28,
      minHeight: 540, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "44px 72px",
      background: `radial-gradient(120% 80% at 50% 0%, #1a1206 0%, ${p.bg} 60%),
                   radial-gradient(60% 40% at 50% 8%, ${p.accent}33, transparent 70%)`,
      border: `1px solid #C9971E55`, boxShadow: `inset 0 0 80px ${p.bg}, 0 0 50px ${p.accent2}22` }}>
      <Pillar side="left" />
      <Pillar side="right" />

      {/* קשת עליונה */}
      <svg viewBox="0 0 600 120" preserveAspectRatio="none" style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: "78%", height: 120, zIndex: 0, opacity: 0.9 }}>
        <path d="M20,118 Q300,-40 580,118" fill="none" stroke="#C9971E" strokeWidth="5" style={{ filter: "drop-shadow(0 0 8px #C9971E99)" }} />
        <path d="M20,118 Q300,-28 580,118" fill="none" stroke="#F6E27A" strokeWidth="1.5" opacity="0.8" />
      </svg>

      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <Crown size={156} />
        <h1 style={{ fontFamily: F.regal, fontWeight: 800, fontSize: "clamp(34px,6vw,58px)", margin: "10px 0 14px",
          color: "#F6E27A", textShadow: `0 0 26px #C9971E, 0 0 60px ${p.accent}77, 0 2px 4px #000` }}>
          כי לה' המלוכה
        </h1>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "4px auto 18px", color: "#C9971E" }}>
          <span style={{ height: 1, width: 60, background: "linear-gradient(to left,#C9971E,transparent)" }} />
          <span style={{ fontSize: 12 }}>❖</span>
          <span style={{ height: 1, width: 60, background: "linear-gradient(to right,#C9971E,transparent)" }} />
        </div>
        <div style={{ fontFamily: F.heading, fontSize: 15, letterSpacing: 3, color: p.textDim, marginBottom: 18 }}>
          ספירה לאחור · נפתח בקרוב
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 26 }}>
          <CountdownBox p={p} n={7} label="ימים" />
          <CountdownBox p={p} n="00" label="שעות" />
          <CountdownBox p={p} n="00" label="דקות" />
          <CountdownBox p={p} n="00" label="שניות" />
        </div>
        <NeonButton p={p} primary>היכנס אל ההיכל →</NeonButton>
      </div>
    </div>
  );
}

export default function ThemePreviewPage() {
  const [key, setKey] = useState("stellar");
  const p = PALETTES[key];

  return (
    <div dir="rtl" style={{ position: "relative", minHeight: "100vh", background: p.bg, color: p.text, overflow: "hidden", transition: "background .5s ease" }}>
      <style>{CSS}</style>
      <Nebula p={p} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "32px 20px 90px" }}>

        {/* מתג פלטה */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 14 }}>
          {Object.values(PALETTES).map(pal => {
            const active = pal.key === key;
            return (
              <button key={pal.key} className="tp-btn" onClick={() => setKey(pal.key)} style={{
                padding: "10px 22px", borderRadius: 999, fontFamily: F.heading, fontWeight: 700,
                fontSize: 14, letterSpacing: 1, color: active ? pal.bg : pal.accent,
                background: active ? `linear-gradient(135deg, ${pal.accent3}, ${pal.accent2})` : "transparent",
                border: `1px solid ${active ? "transparent" : pal.glassBorder}`,
                boxShadow: active ? `0 0 24px ${pal.accent3}77` : "none",
              }}>{pal.name}</button>
            );
          })}
        </div>
        <div style={{ textAlign: "center", color: p.textDim, fontFamily: F.heading, fontSize: 13, letterSpacing: 3, marginBottom: 40 }}>
          {p.tagline}
        </div>

        {/* HERO — שער מלכותי */}
        <RoyalGate p={p} />

        {/* SWATCHES */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
          {p.swatches.map(([label, hex]) => (
            <Glass key={hex} p={p} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: hex, border: `1px solid ${p.glassBorder}`, boxShadow: `0 0 16px ${hex}66`, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: F.heading, fontSize: 13, fontWeight: 600 }}>{label}</div>
                <div style={{ fontFamily: F.mono, fontSize: 12, color: p.textDim, direction: "ltr", textAlign: "right" }}>{hex}</div>
              </div>
            </Glass>
          ))}
        </div>

        {/* מסר יומי */}
        <Glass p={p} glow={p.accent} style={{ padding: "26px 28px", marginBottom: 28, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <NumberNode p={p} n={26} color={p.accent} size={86} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontFamily: F.heading, fontSize: 11, letterSpacing: 5, color: p.accent3, marginBottom: 6 }}>✦ מסר יומי</div>
            <div style={{ fontFamily: F.regal, fontWeight: 700, fontSize: 24, color: p.accent, marginBottom: 6 }}>יהוה — 26</div>
            <div style={{ color: p.textDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.8 }}>
              שם ההוויה, שורש כל הנגלה והנסתר. היום — לשים לב לרמזים שחוזרים.
            </div>
          </div>
        </Glass>

        {/* כרטיסי צפנים */}
        <div style={{ fontFamily: F.heading, fontSize: 12, letterSpacing: 5, color: p.accent3, marginBottom: 16, textAlign: "center" }}>צפנים אחרונים</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 36 }}>
          {[["הצופן 1237", "לילה כיום יאיר"], ["משיח = נחש", "358 — שני קצוות"], ["סוד 1820", "השם × עמים"]].map(([t, s], i) => (
            <Glass key={i} p={p} glow={[p.accent2, p.accent3, p.accent4][i]} style={{ padding: 22 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center",
                background: `linear-gradient(135deg, ${[p.accent2, p.accent3, p.accent4][i]}33, transparent)`,
                border: `1px solid ${[p.accent2, p.accent3, p.accent4][i]}66`, fontSize: 20 }}>🔍</div>
              <div style={{ fontFamily: F.regal, fontWeight: 700, fontSize: 19, color: p.accent, marginBottom: 6 }}>{t}</div>
              <div style={{ color: p.textDim, fontFamily: F.body, fontSize: 14 }}>{s}</div>
            </Glass>
          ))}
        </div>

        {/* תצוגת צמתי עץ */}
        <Glass p={p} style={{ padding: "34px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: F.heading, fontSize: 12, letterSpacing: 5, color: p.accent3, marginBottom: 24 }}>צמתי עץ המספרים</div>
          <div style={{ display: "flex", gap: 28, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <NumberNode p={p} n={1} color={p.accent} />
            <NumberNode p={p} n={26} color={p.accent3} size={92} />
            <NumberNode p={p} n={358} color={p.accent4} />
            <NumberNode p={p} n={1820} color={p.accent2} size={96} />
          </div>
        </Glass>

        <div style={{ textAlign: "center", marginTop: 40, color: p.textDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 2 }}>
          לחץ על המתג למעלה כדי להחליף בין הפלטות · עמוד תצוגה זמני
        </div>
      </div>
    </div>
  );
}
