import React, { useState } from "react";
import { F, LOGO_URL } from "../theme.js";

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

        {/* HERO */}
        <Glass p={p} glow={p.accent2} style={{ padding: "48px 28px", textAlign: "center", marginBottom: 28, position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: "-60%", left: "50%", width: 520, height: 520, marginLeft: -260,
            background: `conic-gradient(from 0deg, transparent, ${p.accent2}22, transparent, ${p.accent3}22, transparent)`,
            animation: "tp-spin 24s linear infinite", pointerEvents: "none",
          }} />
          <img src={LOGO_URL} alt="SOD1820" style={{ width: 92, height: 92, objectFit: "contain", filter: `drop-shadow(0 0 22px ${p.accent}aa)`, position: "relative" }} />
          <div style={{ fontFamily: F.heading, fontSize: 12, letterSpacing: 7, color: p.accent3, marginTop: 20, position: "relative" }}>SOD · 1820</div>
          <h1 style={{
            fontFamily: F.regal, fontWeight: 800, fontSize: "clamp(34px,6vw,62px)", margin: "12px 0 14px",
            position: "relative",
            background: `linear-gradient(120deg, ${p.accent}, ${p.accent3}, ${p.accent2})`,
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            textShadow: `0 0 60px ${p.accent2}55`,
          }}>כי לה' המלוכה</h1>
          <p style={{ color: p.textDim, fontFamily: F.body, fontSize: 17, maxWidth: 540, margin: "0 auto 28px", lineHeight: 1.9, position: "relative" }}>
            מפה חיה של שפת המספרים — גימטריה, ציר התדר, עץ המספרים והצופן התנ"כי, במרחב אחד מואר.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
            <NeonButton p={p} primary>התחל את המסע →</NeonButton>
            <NeonButton p={p}>מרכז הניווט</NeonButton>
          </div>
        </Glass>

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
