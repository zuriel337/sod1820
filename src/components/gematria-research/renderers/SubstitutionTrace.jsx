import React from "react";
import { G } from "../theme.js";

// SUBSTITUTION_LEDGER family: source letter -> transformed letter -> value -> running subtotal.
export default function SubstitutionTrace({ trace }) {
  if (!trace?.rows?.length) return <div style={{ color: G.sub, fontSize: 13 }}>אין שלבים להצגה.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {trace.rows.map((r, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10, background: G.panel,
          border: `1px solid ${G.border}`, borderRadius: 10, padding: "8px 12px",
        }}>
          <span style={{ fontFamily: G.body, fontSize: 18, fontWeight: 700 }}>{r.token}</span>
          <span style={{ color: G.gold, fontSize: 16 }}>→</span>
          <span style={{ fontFamily: G.body, fontSize: 18, fontWeight: 700, color: G.accent }}>{r.transformedToken}</span>
          <span style={{ color: G.sub, fontSize: 12 }}>=</span>
          <span style={{ fontFamily: G.mono, fontSize: 13, fontWeight: 700 }}>{r.baseValue}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: G.mono, fontSize: 11, color: G.sub }}>סכום מצטבר</span>
          <span style={{ fontFamily: G.mono, fontSize: 14, fontWeight: 800, color: G.ink }}>{r.runningSubtotal}</span>
        </div>
      ))}
    </div>
  );
}
