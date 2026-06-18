import React from "react";
import { Link } from "react-router-dom";

// 🔢 לוגו "מנוע המספרים" בסגנון גוגל — אותיות עבריות צבעוניות + אנימציית כניסה ונשימה.
// צבעים מותאמים למותג (זהב מלכותי) עם רמיזה לגוגל (רב-צבע משחקי). קליק → מנוע החיפוש.
const COLORS = ["#c9a227", "#7a1320", "#3b6fb0", "#2f8f5b", "#9a7818", "#6b3fa0"];

export default function NumberEngineLogo({ text = "מנוע המספרים", size = 52, prefix = "🔢", to = "/number" }) {
  const chars = [...text];
  let ci = 0;
  const body = (
    <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.18, direction: "rtl", whiteSpace: "nowrap" }} aria-label={text}>
      <style>{`
        @keyframes nel-rise{0%{opacity:0;transform:translateY(18px) scale(.6)}100%{opacity:1;transform:none}}
        @keyframes nel-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        .nel-ch{display:inline-block;will-change:transform;animation:nel-rise .5s cubic-bezier(.2,.8,.2,1) both, nel-bob 3.6s ease-in-out infinite;}
        .nel-ch:hover{animation:none;transform:translateY(-7px) scale(1.15);transition:transform .18s;}
      `}</style>
      {prefix && <span style={{ fontSize: `clamp(30px,7.2vw,${size * 0.92}px)`, animation: "nel-bob 3.6s ease-in-out infinite" }}>{prefix}</span>}
      <h1 style={{ margin: 0, fontFamily: "'Heebo', sans-serif", fontWeight: 900, fontSize: `clamp(32px,8vw,${size}px)`, lineHeight: 1.05, display: "inline-flex" }}>
        {chars.map((c, i) => {
          if (c === " ") return <span key={i} style={{ width: size * 0.26, display: "inline-block" }} />;
          const color = COLORS[ci++ % COLORS.length];
          return (
            <span key={i} className="nel-ch"
              style={{ color, animationDelay: `${i * 0.05}s, ${0.55 + i * 0.05}s`, textShadow: `0 2px 12px ${color}40` }}>{c}</span>
          );
        })}
      </h1>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: "none" }}>{body}</Link> : body;
}
