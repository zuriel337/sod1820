import React from "react";
import { G } from "../theme.js";

const Stack = ({ rows }) => (
  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
    {rows.map((r, i) => (
      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: G.bg, borderRadius: 8, padding: "6px 9px", minWidth: 46 }}>
        <span style={{ fontFamily: G.body, fontSize: 16, fontWeight: 700 }}>{r.token}</span>
        <span style={{ fontFamily: G.mono, fontSize: 11, color: G.sub }}>+{r.baseValue}</span>
        <span style={{ fontFamily: G.mono, fontSize: 13, fontWeight: 800, color: G.accent }}>{r.prefixSubtotal}</span>
      </div>
    ))}
  </div>
);

// CUMULATIVE_PREFIX family: running prefix stacks; result = sum of every snapshot (not just the
// last row) -- shown explicitly so the "why is the total bigger than the last stack" is clear.
export default function CumulativePrefixTrace({ trace }) {
  if (trace?.scope === "word_reset") {
    if (!trace.words?.length) return <div style={{ color: G.sub, fontSize: 13 }}>אין שלבים להצגה.</div>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {trace.words.map((w, wi) => (
          <div key={wi} style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: G.body, fontSize: 16, fontWeight: 800 }}>{w.word}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontFamily: G.mono, fontSize: 13, fontWeight: 800, color: G.accent }}>סכום קידומות המילה: {w.wordSubtotal}</span>
            </div>
            <Stack rows={w.rows} />
          </div>
        ))}
        <div style={{ textAlign: "center", fontFamily: G.mono, fontSize: 15, fontWeight: 800 }}>סה״כ = {trace.result}</div>
      </div>
    );
  }
  if (!trace?.rows?.length) return <div style={{ color: G.sub, fontSize: 13 }}>אין שלבים להצגה.</div>;
  return (
    <div>
      <div style={{ color: G.sub, fontFamily: G.body, fontSize: 12, marginBottom: 8 }}>
        הביטוי כולו נספר ברצף אחד (בלי איפוס בין מילים).
      </div>
      <Stack rows={trace.rows} />
      <div style={{ textAlign: "center", fontFamily: G.mono, fontSize: 15, fontWeight: 800, marginTop: 10 }}>
        סה״כ (סכום כל הקידומות) = {trace.result}
      </div>
    </div>
  );
}
