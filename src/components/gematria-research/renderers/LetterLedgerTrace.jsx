import React from "react";
import { G } from "../theme.js";

// LETTER_LEDGER family: letter -> (transform) -> value -> contribution -> running subtotal.
// Every number is read straight from the normalized trace -- nothing is computed here.
export default function LetterLedgerTrace({ trace }) {
  if (!trace?.rows?.length) return <div style={{ color: G.sub, fontSize: 13 }}>אין שלבים להצגה.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {trace.rows.map((r, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            background: G.panel, border: `1px solid ${G.border}`, borderRadius: 10, padding: "8px 10px", minWidth: 52,
          }}>
            <span style={{ fontFamily: G.body, fontSize: 20, fontWeight: 700, color: G.ink }}>{r.token}</span>
            {r.transform === "substituted" ? null : (
              <span style={{ fontFamily: G.mono, fontSize: 12, color: G.sub }}>
                {r.transform === "square" ? `${r.baseValue}²` : r.baseValue}
              </span>
            )}
            <span style={{ fontFamily: G.mono, fontSize: 13, fontWeight: 800, color: G.accent }}>+{r.contribution}</span>
            <span style={{ fontFamily: G.mono, fontSize: 11, color: G.sub }}>= {r.runningSubtotal}</span>
          </div>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["אות", "ערך בסיס", "פעולה", "תרומה", "סכום מצטבר"].map(h => (
                <th key={h} style={{ textAlign: "center", padding: "6px 8px", color: G.sub, fontFamily: G.heading, fontWeight: 700, fontSize: 12, borderBottom: `2px solid ${G.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trace.rows.map((r, i) => (
              <tr key={i}>
                <td style={{ textAlign: "center", padding: "5px 8px", borderBottom: `1px solid ${G.border}`, fontFamily: G.body, fontSize: 16, fontWeight: 700 }}>{r.token}</td>
                <td style={{ textAlign: "center", padding: "5px 8px", borderBottom: `1px solid ${G.border}`, fontFamily: G.mono }}>{r.baseValue}</td>
                <td style={{ textAlign: "center", padding: "5px 8px", borderBottom: `1px solid ${G.border}`, fontFamily: G.body, fontSize: 12, color: G.sub }}>
                  {r.transform === "square" ? "בריבוע" : r.transform === "substituted" ? "החלפה" : "זהה"}
                </td>
                <td style={{ textAlign: "center", padding: "5px 8px", borderBottom: `1px solid ${G.border}`, fontFamily: G.mono, fontWeight: 700, color: G.accent }}>{r.contribution}</td>
                <td style={{ textAlign: "center", padding: "5px 8px", borderBottom: `1px solid ${G.border}`, fontFamily: G.mono, fontWeight: 800 }}>{r.runningSubtotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
