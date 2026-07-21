import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getSiteCounts, fmtCount } from "../lib/siteStats.js";

// 📊 <SiteCountsStrip> — רצועת מוני-אתר חיים (עובדות מהמאגר). כל גלולה מקשרת לעדשה הרלוונטית.
const PILLS = [
  { key: "posts",        emoji: "📖", label: "פוסטים",        to: "/post" },
  { key: "words",        emoji: "🔢", label: "ביטויים במאגר", to: "/numbers" },
  { key: "insights",     emoji: "💡", label: "חידושים",       to: "/research?tool=midrash" },
  { key: "convergences", emoji: "🌐", label: "התכנסויות",     to: "/numbers" },
  { key: "ciphers",      emoji: "🔠", label: "צפנים",         to: "/code" },
];

export default function SiteCountsStrip({ maxWidth = 740 } = {}) {
  const P = usePalette();
  const [c, setC] = useState(null);
  useEffect(() => { let a = true; getSiteCounts().then(x => { if (a) setC(x); }); return () => { a = false; }; }, []);

  const pills = PILLS.filter(p => c && typeof c[p.key] === "number");
  if (!pills.length) return null;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", margin: "0 auto 28px", maxWidth }}>
      {pills.map(p => (
        <Link key={p.key} to={p.to} style={{
          display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2, textDecoration: "none",
          background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "10px 16px", minWidth: 92,
          transition: "border-color .15s, transform .15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = P.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.transform = "none"; }}
        >
          <span style={{ color: P.accentText, fontFamily: F.mono, fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{fmtCount(c[p.key])}</span>
          <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{p.emoji} {p.label}</span>
        </Link>
      ))}
    </div>
  );
}
