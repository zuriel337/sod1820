import React, { useState } from "react";
import { G } from "../theme.js";

// COMPOSITE family: component methods, component values, operator, result -- reusing
// fn_composite_calc's own shape. Each component may itself have a sub-trace (recursively
// rendered via `renderComponent`, passed down instead of importing the dispatcher directly, to
// avoid a circular module dependency); a component without one is shown honestly as such.
export default function CompositeTrace({ trace, renderComponent }) {
  const [openIdx, setOpenIdx] = useState(null);
  if (!trace?.components?.length) return <div style={{ color: G.sub, fontSize: 13 }}>אין רכיבים להצגה.</div>;
  const opLabel = trace.operator === "diff" ? "הפרש" : "סכום";
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        {trace.components.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: G.gold, fontFamily: G.mono, fontSize: 18, fontWeight: 800 }}>{trace.operator === "diff" ? "−" : "+"}</span>}
            <button
              onClick={() => setOpenIdx(o => (o === i ? null : i))}
              style={{
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                background: openIdx === i ? G.accentSoft : G.panel, border: `1px solid ${openIdx === i ? G.accent : G.border}`,
                borderRadius: 10, padding: "8px 14px", minWidth: 90,
              }}>
              <span style={{ fontFamily: G.heading, fontSize: 12.5, fontWeight: 700, color: G.ink }}>{c.methodKey}</span>
              <span style={{ fontFamily: G.mono, fontSize: 16, fontWeight: 800, color: G.accent }}>{c.value}</span>
              <span style={{ fontFamily: G.body, fontSize: 10.5, color: G.sub }}>{openIdx === i ? "▲ סגור" : "▾ פתח"}</span>
            </button>
          </React.Fragment>
        ))}
        <span style={{ color: G.sub, fontFamily: G.mono, fontSize: 18 }}>=</span>
        <span style={{ fontFamily: G.mono, fontSize: 20, fontWeight: 800, color: G.ink }}>{trace.result}</span>
      </div>
      <div style={{ textAlign: "center", color: G.sub, fontFamily: G.body, fontSize: 12, marginBottom: 8 }}>פעולה: {opLabel}</div>
      {openIdx != null && trace.components[openIdx] && (
        <div style={{ background: G.bg, border: `1px solid ${G.border}`, borderRadius: 10, padding: "10px 12px" }}>
          {trace.components[openIdx].trace ? renderComponent(trace.components[openIdx].trace) : (
            <div style={{ color: G.sub, fontSize: 13 }}>אין פירוק זמין לשיטה זו — הערך המוצג מאומת דרך המנוע הקנוני.</div>
          )}
        </div>
      )}
    </div>
  );
}
