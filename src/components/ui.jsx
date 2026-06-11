import React, { useState } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";

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

export function GoldButton({ children, onClick, to, variant = "primary", style = {}, disabled = false }) {
  const [hov, setHov] = useState(false);
  const isPrimary = variant === "primary";
  const css = {
    display: "inline-block",
    background: isPrimary
      ? (hov ? `linear-gradient(135deg, #3a2a00, #4a3600)` : `linear-gradient(135deg, #2A1E00, #3a2a00)`)
      : "transparent",
    border: `1px solid ${hov ? C.goldBright : C.gold}`,
    color: hov ? C.goldBright : C.goldLight,
    padding: "13px 36px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: F.heading,
    fontSize: 13,
    letterSpacing: 3,
    borderRadius: 2,
    transition: "all 0.25s",
    fontWeight: 600,
    opacity: disabled ? 0.4 : 1,
    textTransform: "uppercase",
    textDecoration: "none",
    boxShadow: hov && isPrimary ? `0 0 24px ${C.goldDark}` : "none",
    ...style,
  };
  // קישור ל-route (נמנע מ-<button><a> לא תקין)
  if (to && !disabled) {
    return (
      <Link to={to} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={css}>
        {children}
      </Link>
    );
  }
  return (
    <button
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...css, display: undefined }}
    >
      {children}
    </button>
  );
}

export function RoyalInput({ label, value, onChange, type = "text", placeholder = "" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10, color: C.muted, letterSpacing: 4,
        marginBottom: 8, fontFamily: F.heading, textTransform: "uppercase"
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
          background: C.bg,
          border: `1px solid ${focused ? C.gold : C.border}`,
          borderBottom: `1px solid ${focused ? C.goldBright : C.borderGold}`,
          color: C.goldBright,
          padding: "12px 16px",
          fontSize: 15,
          fontFamily: F.body,
          borderRadius: 2,
          outline: "none",
          boxSizing: "border-box",
          direction: (type === "email" || type === "password") ? "ltr" : "rtl",
          transition: "border-color 0.25s",
          boxShadow: focused ? `inset 0 0 20px ${C.goldDeep}` : "none",
        }}
      />
    </div>
  );
}

export function SectionHeader({ eyebrow, title, center = true }) {
  return (
    <div style={{ textAlign: center ? "center" : "right", marginBottom: 56 }}>
      {eyebrow && (
        <div style={{
          fontSize: 12, letterSpacing: 6, color: C.goldDim,
          marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase"
        }}>{eyebrow}</div>
      )}
      <h2 style={{
        color: C.goldLight,
        margin: "0 0 20px",
        fontSize: "clamp(26px, 4.2vw, 40px)",
        fontFamily: F.regal,
        fontWeight: 700,
        letterSpacing: 2,
        textShadow: `0 0 50px rgba(212,175,55,0.4), 0 1px 3px rgba(0,0,0,0.7)`,
      }}>{title}</h2>
      <RoyalDivider />
    </div>
  );
}

export function PageBody({ bodyHtml }) {
  if (!bodyHtml) return null;
  return (
    <div
      style={{
        color: C.goldDim,
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
