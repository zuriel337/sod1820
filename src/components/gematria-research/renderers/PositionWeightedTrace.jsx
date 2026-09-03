import React from "react";
import { G } from "../theme.js";

// POSITION_WEIGHTED family: letter / position / value / weight(=position) / contribution.
export default function PositionWeightedTrace({ trace }) {
  if (!trace?.words?.length) return <div style={{ color: G.sub, fontSize: 13 }}>אין שלבים להצגה.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {trace.words.map((w, wi) => (
        <div key={wi} style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: G.body, fontSize: 16, fontWeight: 800 }}>{w.word}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: G.mono, fontSize: 13, fontWeight: 800, color: G.accent }}>סכום מילה: {w.wordSubtotal}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["אות", "מיקום", "ערך", "מקדם", "תרומה"].map(h => (
                    <th key={h} style={{ textAlign: "center", padding: "5px 8px", color: G.sub, fontFamily: G.heading, fontWeight: 700, fontSize: 12, borderBottom: `2px solid ${G.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {w.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: "center", padding: "5px 8px", borderBottom: `1px solid ${G.border}`, fontFamily: G.body, fontSize: 16, fontWeight: 700 }}>{r.token}</td>
                    <td style={{ textAlign: "center", padding: "5px 8px", borderBottom: `1px solid ${G.border}`, fontFamily: G.mono }}>{r.position}</td>
                    <td style={{ textAlign: "center", padding: "5px 8px", borderBottom: `1px solid ${G.border}`, fontFamily: G.mono }}>{r.baseValue}</td>
                    <td style={{ textAlign: "center", padding: "5px 8px", borderBottom: `1px solid ${G.border}`, fontFamily: G.mono, color: G.sub }}>×{r.position}</td>
                    <td style={{ textAlign: "center", padding: "5px 8px", borderBottom: `1px solid ${G.border}`, fontFamily: G.mono, fontWeight: 800, color: G.accent }}>{r.contribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <div style={{ textAlign: "center", fontFamily: G.mono, fontSize: 15, fontWeight: 800 }}>סה״כ = {trace.result}</div>
    </div>
  );
}
