import React from "react";
import { G } from "../theme.js";

// ADJACENT_DIFFERENCE family: word groups, left/right letter values, |difference|, word subtotal,
// overall total. Word reset is explicit -- each word is its own block.
export default function AdjacentDifferenceTrace({ trace }) {
  if (!trace?.words?.length) return <div style={{ color: G.sub, fontSize: 13 }}>אין שלבים להצגה.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {trace.words.map((w, wi) => (
        <div key={wi} style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: G.body, fontSize: 16, fontWeight: 800 }}>{w.word}</span>
            <span style={{ color: G.sub, fontFamily: G.body, fontSize: 11 }}>(מתאפס בכל מילה)</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: G.mono, fontSize: 13, fontWeight: 800, color: G.accent }}>סכום מילה: {w.wordSubtotal}</span>
          </div>
          {w.pairs.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {w.pairs.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: G.bg, borderRadius: 8, padding: "5px 9px", fontFamily: G.mono, fontSize: 13 }}>
                  <span>{p.left}</span><span style={{ color: G.sub }}>−</span><span>{p.right}</span>
                  <span style={{ color: G.sub }}>=</span><span style={{ fontWeight: 800, color: G.ink }}>{p.diff}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: G.sub, fontSize: 12 }}>מילה של אות אחת — אין הפרשים.</div>
          )}
        </div>
      ))}
      <div style={{ textAlign: "center", fontFamily: G.mono, fontSize: 15, fontWeight: 800, color: G.ink }}>
        סה״כ = {trace.result}
      </div>
    </div>
  );
}
