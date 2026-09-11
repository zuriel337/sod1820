import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { controlTone, statusTone, usePalette } from "../lib/palette.js";

// Presentation-only projection of canonical feature state.
// Availability truth always comes from site_flags via useFeatureState; this component never decides access.
// canonical_colors_law v2: status appearance comes from one semantic palette role, never from parent/link inheritance.
export default function FeatureClosedNotice({ state, title = "האזור", to = null, compact = false, style = {} }) {
  const P = usePalette();
  if (!state?.blocked) return null;

  const building = statusTone(P, "building");
  const linkTone = controlTone(P, "ghost");

  return (
    <div dir="rtl" role="status" aria-live="polite" style={{
      margin: compact ? "12px 0" : "18px auto",
      maxWidth: compact ? "100%" : 620,
      boxSizing: "border-box",
      border: `1px solid ${P.borderStrong || P.border}`,
      background: P.cardGrad || P.card,
      borderRadius: 14,
      padding: compact ? "13px 15px" : "20px 22px",
      textAlign: "right",
      ...style,
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: P.ink, fontFamily: F.ui, fontSize: compact ? 13 : 15, fontWeight: 800 }}>
          🌐 {title}
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", borderRadius: 999,
          padding: "3px 9px", border: `1px solid ${building.border}`,
          color: building.color, background: building.background,
          fontFamily: F.ui, fontSize: 11, fontWeight: 900, whiteSpace: "nowrap",
        }}>
          🚧 סגור · בבנייה
        </span>
      </div>
      {!compact && state.message && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.75, marginTop: 8 }}>
          {state.message}
        </div>
      )}
      {to && (
        <Link to={to} style={{
          display: "inline-block", marginTop: 9,
          color: linkTone.color, fontFamily: F.ui, fontSize: 12, fontWeight: 800, textDecoration: "none",
        }}>
          לפרטים ←
        </Link>
      )}
    </div>
  );
}
