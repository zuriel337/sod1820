import React, { useState, useEffect, useMemo } from "react";
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
  .tp-gatebg {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background: url('/gate-bg.jpg') center top / cover no-repeat;
  }
  @media (max-width: 768px) { .tp-gatebg { display: none; } }
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

function NeonButton({ p, children, primary, onClick }) {
  const [h, setH] = useState(false);
  return (
    <span className="tp-btn" onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
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

// אנימציות השער: כתר מרחף+זוהר, חלקיקים עולים, פתיחת דלתות תלת-ממד
const GATE_CSS = `
  @keyframes rg-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
  @keyframes rg-glow {
    0%,100% { filter: drop-shadow(0 0 16px #C9971E) drop-shadow(0 0 36px rgba(255,205,90,.35)); }
    50%     { filter: drop-shadow(0 0 30px #F6E27A) drop-shadow(0 0 66px rgba(255,215,110,.6)); }
  }
  @keyframes rg-rise {
    0%   { transform: translate(0,0) scale(1); opacity: 0; }
    12%  { opacity: .9; }
    85%  { opacity: .55; }
    100% { transform: translate(var(--drift,0px), -520px) scale(.25); opacity: 0; }
  }
  @keyframes rg-light { 0%,100% { opacity: .5; } 50% { opacity: .9; } }
  .rg-gate  { transition: transform 2.6s cubic-bezier(.55,.03,.18,1); will-change: transform; backface-visibility: hidden; }
  .rg-front { transition: opacity 1.1s ease, transform 1.1s ease; }
  .rg-hallmsg { transition: opacity 1.6s ease .9s, transform 1.6s ease .9s; }
  .rg-scene.is-open .rg-gate-l { transform: rotateY(-115deg); }
  .rg-scene.is-open .rg-gate-r { transform: rotateY(115deg); }
  .rg-scene.is-open .rg-front  { opacity: 0; transform: scale(.92); pointer-events: none; }
  .rg-scene.is-open .rg-hallmsg{ opacity: 1; transform: translate(-50%,-50%) scale(1); }
`;

function getRemaining(target) {
  const ms = target - Date.now();
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, done: false };
}
const pad = n => String(n).padStart(2, "0");

function CountdownBox({ p, n, label }) {
  return (
    <div style={{
      width: "clamp(66px,17vw,108px)", height: "clamp(66px,17vw,108px)", borderRadius: 15,
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      background: "linear-gradient(180deg,#241400,#0f0900)", border: "1px solid #e2b536",
      boxShadow: `inset 0 0 18px #6e4e1055, 0 0 20px rgba(255,196,0,.18)`,
    }}>
      <span style={{ fontFamily: F.heading, fontWeight: 800, fontSize: "clamp(28px,7vw,46px)", color: "#ffe17c", textShadow: `0 0 12px ${p.accent}` }}>{n}</span>
      <small style={{ fontFamily: F.heading, fontSize: "clamp(9px,2.4vw,12px)", letterSpacing: 1, color: "#b89a45", marginTop: 6 }}>{label}</small>
    </div>
  );
}

// שער ברזל-זהב יחיד (חצי), נפתח בסיבוב תלת-ממד
function IronGate({ side, p }) {
  const inner = side === "left" ? "right" : "left";
  return (
    <div className={`rg-gate rg-gate-${side[0]}`} style={{
      position: "absolute", top: 0, [side]: 0, width: "50%", height: "100%",
      transformOrigin: `${side} center`, zIndex: 4,
      background: "linear-gradient(180deg, rgba(8,6,2,.82), rgba(2,1,0,.9))",
      boxShadow: "inset 0 0 70px rgba(0,0,0,.85)",
      borderTop: "3px solid #C9971E",
    }}>
      {/* סורגים אנכיים */}
      <div style={{ position: "absolute", inset: 0, opacity: .92, backgroundImage:
        `repeating-linear-gradient(90deg, transparent 0 15px, rgba(110,71,0,.5) 15px 16px, #C9971E 16px 18px, #F7D75B 18px 19px, #C9971E 19px 21px, transparent 21px 36px)` }} />
      {/* מסילות אופקיות */}
      {["24%", "70%"].map(top => (
        <div key={top} style={{ position: "absolute", left: 0, right: 0, top, height: 6,
          background: "linear-gradient(90deg,#6f4700,#F7D75B,#C58F12,#F7D75B,#6f4700)", boxShadow: "0 0 8px #C9971E88" }} />
      ))}
      {/* חודי חנית למעלה */}
      <div style={{ position: "absolute", left: 0, right: 0, top: -10, height: 14, backgroundImage:
        `repeating-linear-gradient(90deg, transparent 0 7px, #C9971E 7px 9px, #F7D75B 9px 10px, transparent 10px 13px)` }} />
      {/* מדליון מרכזי (מנעול) בקצה הפנימי */}
      <div style={{ position: "absolute", top: "50%", [inner]: -24, transform: "translateY(-50%)",
        width: 48, height: 48, borderRadius: "50%",
        background: "radial-gradient(circle at 38% 32%, #F7D75B, #C58F12 58%, #6f4700)",
        border: "2px solid #6f4700", boxShadow: "0 0 18px #C9971E", zIndex: 2 }} />
    </div>
  );
}

function Particles() {
  const dots = React.useMemo(() => Array.from({ length: 30 }, () => ({
    left: Math.random() * 100, size: 2 + Math.random() * 4,
    dur: 6 + Math.random() * 7, delay: Math.random() * 8, drift: (Math.random() * 2 - 1) * 38,
  })), []);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 5 }}>
      {dots.map((d, i) => (
        <span key={i} style={{
          position: "absolute", bottom: -8, left: `${d.left}%`, width: d.size, height: d.size, borderRadius: "50%",
          background: "radial-gradient(circle,#FFE9A8,#C9971E)", boxShadow: "0 0 8px #FFD45A",
          animation: `rg-rise ${d.dur}s linear ${d.delay}s infinite`, "--drift": `${d.drift}px`,
        }} />
      ))}
    </div>
  );
}

// היכל עמוק בפרספקטיבה — נחשף מאחורי השערים
function DeepHall({ p, open }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {/* אור בקצה ההיכל */}
      <div style={{ position: "absolute", left: "50%", top: "40%", transform: "translate(-50%,-50%)",
        width: "44%", height: "62%", borderRadius: "50%",
        background: "radial-gradient(circle,#FBE8A6 0%,rgba(201,151,30,.28) 36%,transparent 72%)",
        filter: "blur(4px)", animation: "rg-light 5s ease-in-out infinite" }} />
      {/* קשתות נסוגות */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ position: "absolute", left: "50%", bottom: "30%", transform: "translateX(-50%)",
          width: `${80 - i * 16}%`, height: `${74 - i * 15}%`,
          borderTopLeftRadius: "50% 90%", borderTopRightRadius: "50% 90%",
          border: `2px solid rgba(201,151,30,${0.5 - i * 0.1})`, borderBottom: "none",
          boxShadow: `0 0 20px rgba(201,151,30,${0.22 - i * 0.05})` }} />
      ))}
      {/* רצפה בפרספקטיבה */}
      <div style={{ position: "absolute", left: "-25%", right: "-25%", bottom: 0, height: "34%",
        background: "linear-gradient(180deg, transparent, #1a1206 45%, #060401)",
        backgroundImage: "repeating-linear-gradient(90deg, rgba(201,151,30,.16) 0 1px, transparent 1px 44px)",
        transform: "perspective(320px) rotateX(62deg)", transformOrigin: "bottom" }} />
      {/* ברכה בעומק — נחשפת בפתיחה */}
      <div className="rg-hallmsg" style={{ position: "absolute", left: "50%", top: "36%",
        transform: "translate(-50%,-50%) scale(.86)", textAlign: "center", opacity: 0, zIndex: 1 }}>
        <div style={{ fontFamily: F.regal, fontWeight: 700, fontSize: "clamp(22px,4vw,34px)", color: "#FBE8A6", textShadow: "0 0 26px #C9971E" }}>
          ברוכים הבאים אל ההיכל
        </div>
        <div style={{ marginTop: 10 }}>
          <NeonButton p={p}>המשך אל האתר →</NeonButton>
        </div>
      </div>
    </div>
  );
}

function RoyalGate({ p }) {
  const target = React.useMemo(() => Date.now() + 7 * 86400000 + 1000, []);
  const [t, setT] = useState(() => getRemaining(target));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const r = getRemaining(target);
      setT(r);
      if (r.done) setOpen(true);
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <div className={`rg-scene${open ? " is-open" : ""}`} style={{
      position: "relative", borderRadius: 22, overflow: "hidden", marginBottom: 28, minHeight: "clamp(440px,72vh,600px)",
      perspective: 1700, perspectiveOrigin: "50% 44%",
      background: `radial-gradient(circle at 50% 0%, #3d2500 0%, #120c02 32%, ${p.bg} 80%)`,
      border: "1px solid #C9971E55", boxShadow: `0 0 80px ${p.accent}33, inset 0 0 70px #000` }}>
      <style>{GATE_CSS}</style>

      <DeepHall p={p} open={open} />
      <Particles />
      <IronGate side="left" p={p} />
      <IronGate side="right" p={p} />

      {/* תוכן קדמי — כתר מרחף, כותרת, ספירה; מתפוגג בפתיחה */}
      <div className="rg-front" style={{ position: "relative", zIndex: 6, textAlign: "center",
        padding: "clamp(34px,6vw,58px) clamp(18px,5vw,64px)", minHeight: "inherit",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ animation: "rg-float 5s ease-in-out infinite" }}>
          <div style={{ display: "inline-block", animation: "rg-glow 4s ease-in-out infinite" }}>
            <Crown size={148} />
          </div>
        </div>
        <h1 style={{ fontFamily: F.regal, fontWeight: 800, fontSize: "clamp(34px,6vw,60px)", margin: "14px 0 12px",
          color: "#f6d264", textShadow: `0 0 22px gold, 0 0 60px rgba(255,215,0,.45), 0 2px 4px #000` }}>
          כי לה' המלוכה
        </h1>
        <div style={{ width: 200, height: 2, background: "linear-gradient(90deg,transparent,gold,transparent)", margin: "0 auto 22px" }} />
        <div style={{ fontFamily: F.heading, fontSize: "clamp(14px,2.4vw,20px)", letterSpacing: 2, color: "#b8a97f", marginBottom: 22 }}>
          ספירה לאחור לפתיחת השער
        </div>
        <div style={{ display: "flex", gap: "clamp(8px,2vw,18px)", justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
          <CountdownBox p={p} n={t.d} label="ימים" />
          <CountdownBox p={p} n={pad(t.h)} label="שעות" />
          <CountdownBox p={p} n={pad(t.m)} label="דקות" />
          <CountdownBox p={p} n={pad(t.s)} label="שניות" />
        </div>
        <NeonButton p={p} primary onClick={() => setOpen(true)}>✨ פתח את השער</NeonButton>
      </div>

      {/* כפתור איפוס להדגמה (מופיע כשהשער פתוח) */}
      {open && (
        <button onClick={() => setOpen(false)} style={{
          position: "absolute", bottom: 14, left: 14, zIndex: 8, cursor: "pointer",
          padding: "8px 16px", borderRadius: 999, fontFamily: F.heading, fontSize: 12, letterSpacing: 1,
          background: "rgba(8,6,2,.6)", color: "#C9971E", border: "1px solid #C9971E66" }}>
          ↺ סגור שוב
        </button>
      )}
    </div>
  );
}

// ===== דמו "רקע שער מלא" (דסקטופ) — תמונת gate-bg.jpg כרקע מלא =====
// התמונה כוללת כבר שער זהב פתוח, כתר וקשת — לכן התוכן ממוקם בנתיב המואר
// שבמרכז, עם scrim עדין מלמטה כדי לשמור על קריאות בלי להסתיר את השער.
function FullGateDemo({ p }) {
  return (
    <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", marginBottom: 28,
      minHeight: "clamp(460px,80vh,680px)", background: p.bg, display: "flex", flexDirection: "column",
      border: "1px solid #C9971E55", boxShadow: `0 0 70px ${p.accent2}22, inset 0 0 60px #000` }}>

      {/* תמונת השער — רקע מלא */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1,
        backgroundImage: "url('/gate-bg.jpg')", backgroundSize: "cover",
        backgroundPosition: "center top", backgroundRepeat: "no-repeat" }} />

      {/* גוון סגול-קוסמי עדין שמחבר את התמונה לפלטה */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2, mixBlendMode: "soft-light",
        background: `radial-gradient(70% 60% at 50% 40%, ${p.accent2}55, transparent 75%)` }} />

      {/* scrim תחתון לקריאות — השער נשאר גלוי, הטקסט יושב על הנתיב */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2,
        background: `linear-gradient(180deg, transparent 30%, ${p.bg}55 58%, ${p.bg}d9 88%)` }} />

      {/* תוכן חי — ממוקם בנתיב המואר, מתחת לקשת והכתר שבתמונה */}
      <div style={{ position: "relative", zIndex: 3, textAlign: "center", marginTop: "auto",
        padding: "0 clamp(18px,16vw,180px) clamp(30px,5vh,52px)" }}>
        <h1 style={{ fontFamily: F.regal, fontWeight: 800, fontSize: "clamp(30px,5.5vw,52px)", margin: "0 0 10px",
          color: "#f6d264", textShadow: `0 0 22px gold, 0 0 60px ${p.accent2}88, 0 2px 5px #000` }}>
          כי לה' המלוכה
        </h1>
        <p style={{ color: p.text, fontFamily: F.body, fontSize: "clamp(14px,2.4vw,17px)", maxWidth: 520,
          margin: "0 auto 22px", lineHeight: 1.85, textShadow: `0 1px 4px ${p.bg}, 0 0 12px ${p.bg}` }}>
          השער פתוח. הנתיב מואר. כל מה שנותר — להיכנס.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, maxWidth: 560, margin: "0 auto 24px" }}>
          {["מסע התדר", "עץ המספרים", "הצופן התנ\"כי"].map((t, i) => (
            <div key={i} style={{ padding: "15px 12px", borderRadius: 14,
              background: `${p.bg}b3`, backdropFilter: "blur(12px)", border: `1px solid ${p.glassBorder}`,
              boxShadow: `0 0 22px ${[p.accent2, p.accent3, p.accent][i]}44`,
              fontFamily: F.heading, fontSize: 15, fontWeight: 600, color: p.text }}>{t}</div>
          ))}
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

      {/* רקע שער מלא — נעול (fixed): התוכן גולל מעליו, השער נשאר יציב. דסקטופ בלבד */}
      <div className="tp-gatebg" />
      {/* scrim עדין כדי שכרטיסי הזכוכית והטקסט יישארו קריאים מעל התמונה */}
      <div className="tp-gatebg" style={{ backgroundImage: "none",
        background: `linear-gradient(180deg, ${p.bg}b8 0%, ${p.bg}8c 38%, ${p.bg}c9 100%)` }} />

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

        {/* HERO — שער מלכותי (אינטרו אימרסיבי) */}
        <RoyalGate p={p} />

        {/* דמו — רקע שער מלא (דסקטופ), מוכן לחיבור gate-bg.png */}
        <div style={{ fontFamily: F.heading, fontSize: 12, letterSpacing: 5, color: p.accent3, margin: "0 0 14px", textAlign: "center" }}>
          ▸ קונספט: רקע שער מלא · תוכן קריא מעליו
        </div>
        <FullGateDemo p={p} />

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
