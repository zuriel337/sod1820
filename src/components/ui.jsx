import React, { useState } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { controlTone, usePalette } from "../lib/palette.js";

// ===== ORNAMENTS =====

export const Ornament = ({ size = 20, color = C.gold }) => (
  <span style={{ color, fontSize: size, fontFamily: "serif", lineHeight: 1, userSelect: "none" }}>✦</span>
);

export const RoyalDivider = ({ width = 300 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, margin: "0 auto", width }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, ${C.gold}, transparent)` }} />
      <span style={{ color: C.goldDim, fontSize: 7, lineHeight: 1, userSelect: "none" }}>✦</span>
      <span style={{ color: C.gold, fontSize: 13, lineHeight: 1, userSelect: "none" }}>❖</span>
      <span style={{ color: C.goldDim, fontSize: 7, lineHeight: 1, userSelect: "none" }}>✦</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
    </div>
    <div style={{ width: "54%", height: 1, background: `linear-gradient(to right, transparent, ${C.borderGold}, transparent)` }} />
  </div>
);

// ===== SHARED COMPONENTS =====

// Backward-compatible name, semantic implementation.
// "primary" / "secondary" select meaning only; dark/light/lab colors come from canonical palette roles.
export function GoldButton({ children, onClick, to, variant = "primary", style = {}, disabled = false }) {
  const P = usePalette();
  const [hov, setHov] = useState(false);
  const [focused, setFocused] = useState(false);
  const role = disabled ? "disabled" : (variant === "primary" ? "primary" : variant === "ghost" ? "ghost" : "secondary");
  const tone = controlTone(P, role);
  const css = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: hov && !disabled ? tone.hoverBackground : tone.background,
    border: `1px solid ${hov && !disabled ? (tone.hoverBorder || tone.border) : tone.border}`,
    color: hov && !disabled ? (tone.hoverColor || tone.color) : tone.color,
    padding: "13px 36px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: F.ui,
    fontSize: 13,
    letterSpacing: 2,
    borderRadius: 10,
    minHeight: 44,
    transition: "background .2s ease, color .2s ease, border-color .2s ease, transform .16s ease, box-shadow .2s ease",
    fontWeight: 800,
    opacity: disabled ? 0.72 : 1,
    textDecoration: "none",
    boxShadow: focused && tone.focusRing !== "transparent" ? `0 0 0 3px ${tone.focusRing}` : "none",
    transform: hov && !disabled ? "translateY(-1px)" : "none",
    outline: "none",
    ...style,
  };
  const events = {
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
  if (to && !disabled) {
    return (
      <Link to={to} onClick={onClick} {...events} style={css}>
        {children}
      </Link>
    );
  }
  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      {...events}
      style={css}
    >
      {children}
    </button>
  );
}

export function RoyalInput({ label, value, onChange, type = "text", placeholder = "" }) {
  const P = usePalette();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12, color: P.inkSoft, letterSpacing: 2,
        marginBottom: 8, fontFamily: F.ui, fontWeight: 700,
      }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          background: P.card,
          border: `1px solid ${focused ? P.accent : P.borderStrong || P.border}`,
          color: P.ink,
          padding: "12px 16px",
          fontSize: 16,
          fontFamily: F.body,
          borderRadius: 10,
          outline: "none",
          boxSizing: "border-box",
          direction: (type === "email" || type === "password") ? "ltr" : "rtl",
          transition: "border-color .2s ease, box-shadow .2s ease",
          boxShadow: focused ? `0 0 0 3px ${P.glow}` : "none",
        }}
      />
    </div>
  );
}

export function SectionHeader({ eyebrow, title, center = true }) {
  const P = usePalette();
  return (
    <div style={{ textAlign: center ? "center" : "start", marginBottom: 56 }}>
      {eyebrow && (
        <div style={{
          fontSize: 12, letterSpacing: 3, color: P.accentDim,
          marginBottom: 16, fontFamily: F.ui, fontWeight: 700,
        }}>{eyebrow}</div>
      )}
      <h2 style={{
        color: P.ink,
        margin: "0 0 20px",
        fontSize: "clamp(26px, 4.2vw, 40px)",
        fontFamily: F.display,
        fontWeight: 700,
        letterSpacing: 1,
        textShadow: P.mode === "dark" ? `0 0 50px ${P.glow}` : "none",
      }}>{title}</h2>
      <RoyalDivider />
    </div>
  );
}

export function PageBody({ bodyHtml }) {
  const P = usePalette();
  if (!bodyHtml) return null;
  return (
    <div
      style={{
        color: P.inkSoft,
        fontFamily: F.body,
        fontSize: 16,
        lineHeight: 2,
        maxWidth: 750,
        margin: "0 auto 40px",
        textAlign: "center",
      }}
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  );
}
