import React from "react";
import { F } from "../theme.js";

// נוסחת "דופק" אחידה מהספירות (חוק האות) — מקור אמת אחד לכל מקום באתר.
export function pulseFromCounts({ posts = 0, galleries = 0, words = 0, events = 0, ai = 0, comm = 0 } = {}) {
  return Math.max(6, Math.min(100, Math.round(posts * 3 + galleries * 2 + events * 6 + ai * 8 + comm * 2 + words * 0.6)));
}

// ❤️ דופק המספר — טבעת זוהרת מדורגת. עוצמת המספר במבט אחד.
// רמות: ❤️ חלש · 💛 מתפתח · 💙 פעיל · 💜 חזק · 👑 מספר יסוד.
function tierOf(p, core) {
  if (core) return { emoji: "👑", name: "מספר יסוד", color: "#f6e27a" };
  if (p >= 80) return { emoji: "💜", name: "חזק", color: "#a78bfa" };
  if (p >= 55) return { emoji: "💙", name: "פעיל", color: "#3ea6ff" };
  if (p >= 28) return { emoji: "💛", name: "מתפתח", color: "#e8c840" };
  return { emoji: "❤️", name: "חלש", color: "#e0556a" };
}

export default function PulseRing({ value = 0, size = 92, core = false, label = true }) {
  const p = Math.max(0, Math.min(100, Math.round(value)));
  const t = tierOf(p, core);
  const stroke = Math.max(6, Math.round(size * 0.09));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - p / 100);
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)", filter: `drop-shadow(0 0 8px ${t.color}77)` }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: Math.round(size * 0.26), lineHeight: 1 }}>{t.emoji}</span>
          <span style={{ color: t.color, fontFamily: F.mono, fontSize: Math.round(size * 0.2), fontWeight: 800, lineHeight: 1.1 }}>{p}</span>
        </div>
      </div>
      {label && <span style={{ color: t.color, fontFamily: F.heading, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>דופק · {t.name}</span>}
    </div>
  );
}
