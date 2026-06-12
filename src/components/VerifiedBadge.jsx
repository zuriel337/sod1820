import React from "react";
import { C, F, LOGO_URL } from "../theme.js";

/**
 * חוק מערכת: verified_badge_law
 * הסמל המאומת של סוד 1820 — לוגו + סימן האימות הבינלאומי (✓ בעיגול מסולסל).
 * מופיע ליד: חידושי AI (variant="ai"), פוסט שעבר אימות (variant="post"),
 * וגימטריה מאומתת (variant="gematria"). סמל אחיד בכל האתר.
 */

// סימן האימות הבינלאומי — עיגול מסולסל עם וי (כמו תג "מאומת" ברשתות)
function VerifiedSeal({ size = 16, color = C.gold }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      style={{ flex: "0 0 auto", filter: `drop-shadow(0 0 3px ${color}66)` }}>
      <path fill={color} d="M12 1.5l2.3 1.9 3-.3 1.2 2.8 2.8 1.2-.3 3 1.9 2.3-1.9 2.3.3 3-2.8 1.2-1.2 2.8-3-.3L12 22.5l-2.3-1.9-3 .3-1.2-2.8-2.8-1.2.3-3L1.5 12l1.9-2.3-.3-3 2.8-1.2 1.2-2.8 3 .3L12 1.5z" />
      <path fill="#0d0a0e" d="M10.6 15.3l-2.9-2.9 1.3-1.3 1.6 1.6 4-4 1.3 1.3-5.3 5.3z" />
    </svg>
  );
}

export default function VerifiedBadge({ variant = "ai", label, size = 16, style = {} }) {
  const cfg = {
    ai:       { color: "#3ea6ff", text: label ?? "AI · מאומת",  logo: true  },
    post:     { color: C.gold,    text: label ?? "מאומת ע״י סוד 1820", logo: true },
    gematria: { color: C.goldBright, text: label ?? "",          logo: false },
  }[variant] || { color: C.gold, text: label ?? "", logo: false };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: cfg.text ? "2px 8px 2px 6px" : 2,
      borderRadius: 999, lineHeight: 1,
      background: `${cfg.color}14`, border: `1px solid ${cfg.color}55`,
      ...style,
    }}>
      {cfg.logo && (
        <img src={LOGO_URL} alt="סוד 1820" width={size} height={size}
          style={{ borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }} />
      )}
      <VerifiedSeal size={size} color={cfg.color} />
      {cfg.text && (
        <span style={{
          fontFamily: F.heading, fontSize: Math.max(10, size - 5),
          fontWeight: 700, color: cfg.color, letterSpacing: 0.3, whiteSpace: "nowrap",
        }}>{cfg.text}</span>
      )}
    </span>
  );
}
