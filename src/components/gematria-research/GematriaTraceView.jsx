import React, { useState } from "react";
import { G } from "./theme.js";
import { normalizeTrace, traceProvenance } from "../../lib/research/gematriaTraceRender.js";
import LetterLedgerTrace from "./renderers/LetterLedgerTrace.jsx";
import SubstitutionTrace from "./renderers/SubstitutionTrace.jsx";
import AdjacentDifferenceTrace from "./renderers/AdjacentDifferenceTrace.jsx";
import CumulativePrefixTrace from "./renderers/CumulativePrefixTrace.jsx";
import PositionWeightedTrace from "./renderers/PositionWeightedTrace.jsx";
import CompositeTrace from "./renderers/CompositeTrace.jsx";
import ContextRequiredTrace from "./renderers/ContextRequiredTrace.jsx";

// trace_kind -> family renderer. One small dispatcher, not one component per method.
function TraceFamilyRenderer({ trace }) {
  if (!trace) return null;
  switch (trace.kind) {
    case "LETTER_LEDGER": return <LetterLedgerTrace trace={trace} />;
    case "SUBSTITUTION_LEDGER": return <SubstitutionTrace trace={trace} />;
    case "ADJACENT_DIFFERENCE": return <AdjacentDifferenceTrace trace={trace} />;
    case "CUMULATIVE_PREFIX": return <CumulativePrefixTrace trace={trace} />;
    case "POSITION_WEIGHTED": return <PositionWeightedTrace trace={trace} />;
    case "COMPOSITE":
      return <CompositeTrace trace={trace} renderComponent={t => <TraceFamilyRenderer trace={t} />} />;
    case "context_required": return <ContextRequiredTrace trace={trace} />;
    case "error":
      return (
        <div style={{ color: G.bad, fontFamily: G.body, fontSize: 13.5, background: "#fdecea", border: "1px solid #f3c6c1", borderRadius: 10, padding: "10px 12px" }}>
          שגיאה בפתיחת השיטה: {trace.error}
        </div>
      );
    default:
      return <div style={{ color: G.sub, fontSize: 13 }}>אין פירוק זמין לשיטה זו כרגע — התוצאה עדיין מגיעה מהמנוע הקנוני.</div>;
  }
}

// Drawer/panel that opens one method's canonical Trace. Result -> explanation -> visual step
// flow -> provenance/version collapsed under "פרטי מנוע ואימות".
export default function GematriaTraceView({ methodLabel, rawTrace, onClose }) {
  const [techOpen, setTechOpen] = useState(false);
  const trace = normalizeTrace(rawTrace);
  const prov = traceProvenance(rawTrace);

  return (
    <div role="dialog" aria-modal="true" style={{
      position: "fixed", inset: 0, zIndex: 4200, background: "rgba(20,20,25,0.45)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: G.bg, width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto",
        borderRadius: "18px 18px 0 0", padding: "18px 18px 26px", direction: "rtl",
        boxShadow: "0 -6px 30px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontFamily: G.heading, fontSize: 18, fontWeight: 800, color: G.ink }}>{methodLabel}</h3>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} aria-label="סגור" style={{
            cursor: "pointer", background: G.panel, border: `1px solid ${G.border}`, borderRadius: 999,
            width: 30, height: 30, fontSize: 15, color: G.sub,
          }}>×</button>
        </div>

        {trace?.result != null && (
          <div style={{ textAlign: "center", margin: "8px 0 14px" }}>
            <span style={{ fontFamily: G.mono, fontSize: 30, fontWeight: 800, color: G.accent }}>{trace.result}</span>
          </div>
        )}

        <div style={{ background: G.panel, border: `1px solid ${G.border}`, borderRadius: 14, padding: "14px 14px" }}>
          <TraceFamilyRenderer trace={trace} />
        </div>

        {prov && (
          <div style={{ marginTop: 14 }}>
            <button onClick={() => setTechOpen(o => !o)} style={{
              cursor: "pointer", background: "none", border: "none", color: G.sub, fontFamily: G.heading,
              fontSize: 12.5, fontWeight: 700, padding: 0,
            }}>{techOpen ? "▴" : "▾"} פרטי מנוע ואימות</button>
            {techOpen && (
              <div style={{ marginTop: 8, background: G.panel, border: `1px solid ${G.border}`, borderRadius: 10, padding: "10px 12px", fontFamily: G.mono, fontSize: 12, color: G.sub, lineHeight: 1.9 }}>
                <div>שיטה: {prov.methodKey} · גרסה: {prov.methodVersion}</div>
                <div>משפחה מתמטית: {prov.mathematicalFamily ?? "—"}</div>
                <div>אופן ביצוע: {prov.executionKind}</div>
                <div>פונקציית מנוע: {prov.function ?? "—"}</div>
                <div>
                  אימות התאמה (Trace parity):{" "}
                  <span style={{ color: prov.parity === true ? G.good : prov.parity === false ? G.bad : G.sub, fontWeight: 800 }}>
                    {prov.parity === true ? "✓ תואם למנוע" : prov.parity === false ? "✗ אי-התאמה" : "לא נבדק"}
                  </span>
                </div>
                {prov.dependencies && <div>תלויות: {Array.isArray(prov.dependencies) ? prov.dependencies.join(" · ") : String(prov.dependencies)}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
