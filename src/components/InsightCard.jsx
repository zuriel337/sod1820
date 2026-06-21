import React, { useState } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { timeAgoHe } from "../lib/format.js";
import VerifiedBadge from "./VerifiedBadge.jsx";

/**
 * חוק מערכת: insight_card_law
 * מבנה חידוש = קצר ונפתח. כברירת מחדל מציג כותרת + סמל בלבד; לחיצה פותחת את הגוף.
 * אם החידוש מקושר לפוסט (source_ref) — לחיצה על הכרטיס עוברת לפוסט במקום להיפתח.
 */

// מזהה אם source_ref מצביע על פוסט, ומחזיר את היעד לניווט
function postHref(insight) {
  const ref = insight?.source_ref;
  if (!ref || typeof ref !== "string") return null;
  const v = ref.trim();
  if (insight.source_type && insight.source_type !== "post" && /^\d+$/.test(v)) return null;
  if (/^https?:\/\//.test(v)) return v;
  if (v.startsWith("/")) return v;
  // סלאג פוסט (עברית/אנגלית) — מנותב כ-/:slug
  if (!/\s/.test(v) && v.length <= 200) return `/${v.replace(/^\/+/, "")}`;
  return null;
}

// פריט "חדש" = נוצר ב-7 הימים האחרונים (אז התג פועם; ישן → סטטי/בלי הבהוב)
const NEW_MS = 7 * 864e5;

export default function InsightCard({ insight, badgeVariant = "ai" }) {
  const [open, setOpen] = useState(false);
  const href = postHref(insight);
  const numbers = insight.related_numbers || [];
  const phrases = insight.related_phrases || [];
  const isNew = insight.created_at && (Date.now() - new Date(insight.created_at).getTime()) < NEW_MS;

  const head = (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <style>{`@keyframes ic-newpulse{0%,100%{opacity:1;box-shadow:0 0 0 rgba(224,85,106,.0)}50%{opacity:.85;box-shadow:0 0 12px rgba(224,85,106,.7)}}`}</style>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          {isNew && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#e0556a", color: "#fff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 9px", letterSpacing: 0.5, animation: "ic-newpulse 1.8s ease-in-out infinite" }}>🆕 חדש</span>
          )}
          <VerifiedBadge variant={badgeVariant} size={15} />
          {badgeVariant === "ai" && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#3ea6ff", fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>
              🤖 נוצר ע״י AI
            </span>
          )}
          {insight.created_at && (
            <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 11 }}>
              · {timeAgoHe(insight.created_at)}
            </span>
          )}
          {!!numbers.length && (
            <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
              {numbers.slice(0, 3).join(" · ")}
            </span>
          )}
        </div>
        <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 17, fontWeight: 700, lineHeight: 1.5 }}>
          {insight.title}
        </div>
      </div>
      <span style={{ color: C.gold, fontSize: 18, flex: "0 0 auto", marginTop: 2 }}>
        {href ? "↩" : (open ? "▴" : "▾")}
      </span>
    </div>
  );

  const cardStyle = {
    display: "block", textAlign: "right", width: "100%", cursor: "pointer",
    background: C.surface2, border: `1px solid ${C.border}`,
    borderInlineStart: `3px solid ${badgeVariant === "ai" ? "#3ea6ff" : C.gold}`,
    borderRadius: 12, padding: "16px 18px", textDecoration: "none",
  };

  // מקושר לפוסט → ניווט
  if (href) {
    const internal = href.startsWith("/");
    return internal
      ? <Link to={href} style={cardStyle}>{head}</Link>
      : <a href={href} target="_blank" rel="noreferrer" style={cardStyle}>{head}</a>;
  }

  // לא מקושר → נפתח במקום
  return (
    <button onClick={() => setOpen(o => !o)} style={{ ...cardStyle, font: "inherit" }}>
      {head}
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          {insight.body && (
            <p style={{ color: C.goldDim, fontFamily: F.body, fontSize: 15, lineHeight: 1.9, margin: "0 0 10px" }}>
              {insight.body}
            </p>
          )}
          {insight.proof && (
            <p style={{ color: C.muted, fontFamily: F.body, fontSize: 13, lineHeight: 1.8, margin: "0 0 10px" }}>
              <strong style={{ color: C.gold }}>הוכחה: </strong>{insight.proof}
            </p>
          )}
          {!!phrases.length && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {phrases.map((p, i) => (
                <span key={i} style={{
                  fontFamily: F.body, fontSize: 12, color: C.goldLight,
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 999, padding: "3px 10px",
                }}>{p}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
