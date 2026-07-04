import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { heatColor } from "../lib/heatmap.js";

// ===== מפת חום של מספרים (treemap-ריבועים) =====
// כל אריח = מספר; צבע = "חום" (ציון מציאות + צפיות). לחיצה → דף המספר הקנוני /number/:n.
// מקבל rows מ-computeNumberHeat(...). עדשה על הגרף — לא משכפל, רק מפנה.

export default function NumberHeatGrid({ rows = [], limit = 60, title = "🔥 מפת חום — המספרים החמים" }) {
  const top = rows.slice(0, limit);
  if (!top.length) return null;

  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>{title}</span>
        <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>{rows.length} מספרים</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8 }}>
        {top.map(r => {
          const bg = heatColor(r.heat);
          const dark = r.heat > 0.42; // טקסט בהיר על רקע חם
          return (
            <Link key={r.value} to={`/number/${r.value}`} title={`מספר ${r.value} · ציון מציאות ${r.score} · ${r.views} צפיות`}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                textDecoration: "none", borderRadius: 10, padding: "12px 5px", minWidth: 0, overflow: "hidden",
                background: bg, border: "1px solid rgba(0,0,0,0.25)",
                boxShadow: r.heat > 0.6 ? "0 0 14px rgba(212,140,40,0.35)" : "none",
                minHeight: 62, transition: "transform .12s",
              }}>
              <span style={{ fontFamily: F.mono, fontSize: "clamp(13px, 3.6vw, 19px)", fontWeight: 800, color: dark ? "#1a0e02" : C.goldBright, lineHeight: 1, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{r.value}</span>
              <span style={{ fontFamily: F.heading, fontSize: 10, marginTop: 4, color: dark ? "rgba(26,14,2,0.7)" : C.goldDim, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.views ? `👁 ${r.views}` : `${r.all || 0} רמזים`}
              </span>
            </Link>
          );
        })}
      </div>

      {/* מקרא */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, color: C.goldDim, fontFamily: F.heading }}>קר</span>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <div key={t} style={{ width: 16, height: 11, borderRadius: 3, background: heatColor(t) }} />
        ))}
        <span style={{ fontSize: 10, color: C.goldDim, fontFamily: F.heading }}>חם 🔥</span>
      </div>
    </div>
  );
}
