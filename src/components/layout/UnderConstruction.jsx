import React from "react";
import { Link } from "react-router-dom";
import { C, F } from "../../theme.js";
import { SectionHeader } from "../ui.jsx";

// תבנית עמוד "בבנייה" — מאפשרת שכל פריט בתפריט יעבוד מהרגע הראשון.
export default function UnderConstruction({ emoji = "🚧", title, description, links = [] }) {
  return (
    <div style={{ direction: "rtl", maxWidth: 820, margin: "0 auto", padding: "72px 24px 96px", textAlign: "center", position: "relative", zIndex: 1 }}>
      <div style={{ fontSize: 52, marginBottom: 18 }}>{emoji}</div>
      <SectionHeader eyebrow="בקרוב" title={title} />
      {description && (
        <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 16, lineHeight: 2, maxWidth: 620, margin: "-24px auto 36px" }}>
          {description}
        </p>
      )}
      <div style={{
        display: "inline-block", background: C.surface2, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "16px 26px", color: C.muted, fontFamily: F.royal, fontSize: 14,
      }}>
        🛠 אזור זה נמצא בבנייה. בקרוב יתווסף כאן תוכן מלא.
      </div>
      {links.length > 0 && (
        <div style={{ marginTop: 36, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} style={{
              color: C.goldBright, textDecoration: "none", fontFamily: F.heading,
              fontSize: 13, fontWeight: 700, letterSpacing: 1, padding: "10px 18px",
              border: `1px solid ${C.borderGold}`, borderRadius: 6,
            }}>{l.label} →</Link>
          ))}
        </div>
      )}
    </div>
  );
}
