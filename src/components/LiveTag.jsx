import React from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";

// 🔴 LiveTag — תגית «חי / חדש / סטורי» קנונית אחת לכל דף-הבית (unify tag language).
// אותה נקודה-אדומה מהבהבת + אותו צ'יפ (זהב על רקע אדום-רך). מחליף את הסימונים המעורבים
// (● LIVE inline · 🆕 חדש · צ'יפ סטורי) בשפה ויזואלית אחת. גודל: mini לתגית קטנה על תמונה.
export default function LiveTag({ label = "חי", mini = false }) {
  const P = usePalette();
  const dot = mini ? 6 : 7;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: mini ? 5 : 6, verticalAlign: "middle",
      background: "rgba(224,85,106,.12)", border: "1px solid rgba(224,85,106,.38)", borderRadius: 999,
      padding: mini ? "2px 9px" : "3px 11px",
    }}>
      <style>{`@keyframes lt-ping{0%{transform:scale(.9);opacity:.85}70%{transform:scale(1.7);opacity:0}100%{opacity:0}}`}</style>
      <span style={{ position: "relative", width: dot, height: dot, flex: "0 0 auto" }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#e0556a" }} />
        <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#e0556a", animation: "lt-ping 1.9s ease-out infinite" }} />
      </span>
      <span style={{ color: mini ? "#fff" : P.accentText, fontFamily: F.heading, fontWeight: 800, fontSize: mini ? 10.5 : 12, letterSpacing: .2 }}>{label}</span>
    </span>
  );
}
