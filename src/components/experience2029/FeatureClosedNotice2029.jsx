import React from "react";
import { Link } from "react-router-dom";
import { use2029Palette } from "../../lib/palette2029.js";
import { TYPEFACE } from "../../lib/designTokens.js";

// 2029-owned presentation of canonical feature state (replaces the shared Legacy FeatureClosedNotice in the 2029 tree).
// Presentation only: availability truth always comes from site_flags via useFeatureState; this component never decides access.
export default function FeatureClosedNotice2029({ state, title = "האזור", to = null, compact = false, style = {} }) {
  const P = use2029Palette();
  if (!state?.blocked) return null;

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
        <span style={{ color: P.accentText, fontFamily: TYPEFACE.ui, fontSize: compact ? 13 : 15, fontWeight: 800 }}>
          🌐 {title}
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", borderRadius: 999,
          padding: "3px 9px", border: `1px solid ${P.borderStrong || P.border}`,
          color: P.accentText, background: P.cardSoft || P.card,
          fontFamily: TYPEFACE.ui, fontSize: 11, fontWeight: 900, whiteSpace: "nowrap",
        }}>
          🚧 סגור · בבנייה
        </span>
      </div>
      {!compact && state.message && (
        <div style={{ color: P.inkSoft, fontFamily: TYPEFACE.body, fontSize: 13.5, lineHeight: 1.75, marginTop: 8 }}>
          {state.message}
        </div>
      )}
      {to && (
        <Link to={to} style={{ display: "inline-block", marginTop: 9, color: P.accentText, fontFamily: TYPEFACE.ui, fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
          לפרטים ←
        </Link>
      )}
    </div>
  );
}
