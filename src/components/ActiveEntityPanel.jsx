import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { on, EVENTS } from "../lib/research/eventBus.js";
import { METHODS, DEPTH_METHODS } from "../lib/gematria.js";

// 🎯 הישות הפעילה — הפאנל ההקשרי בצד ימין של ההיכל (research_workspace_law: «הפאנלים מאזינים ל-Bus»).
// כל כלי משדר ENTITY_FOCUS {title, word?, value} על מה שבמוקד → כאן מוצג הפירוק המלא, חי, בלי
// שהפאנל «שואל» את הכלי. כלי עתידי שישדר את אותו אירוע יתחבר אוטומטית, בלי לגעת כאן.
const ALL = [...METHODS, ...DEPTH_METHODS];

export default function ActiveEntityPanel() {
  const [ent, setEnt] = useState(null); // { title, word?, value }
  useEffect(() => {
    const offF = on(EVENTS.ENTITY_FOCUS, e => e && setEnt(e));
    const offB = on(EVENTS.ENTITY_BLUR, () => setEnt(null));
    return () => { offF(); offB(); };
  }, []);

  if (!ent) return null;
  const word = ent.word && /[א-ת]/.test(ent.word) ? ent.word : null;
  const rows = word ? ALL.map(m => ({ label: m.he || m.label || m.key, value: m.fn(word) })).filter(r => Number.isFinite(r.value)) : [];

  return (
    <div className="rw-panel" style={{ order: -1 }}>
      <div className="rw-ph" style={{ display: "flex", alignItems: "center", gap: 6 }}><span>🎯 הישות הפעילה</span></div>
      <div className="rw-pb">
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ink,#1b1d22)", lineHeight: 1.3 }} dir="rtl">{ent.title}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--acc,#2f6df6)", marginTop: 2 }}>ערך רגיל: {ent.value}</div>
        </div>
        {rows.length > 0 && (
          <div style={{ maxHeight: 300, overflowY: "auto", display: "grid", gap: 4, marginBottom: 10 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, padding: "5px 8px", borderRadius: 8, background: "var(--chip,#f2f4f8)" }}>
                <span style={{ color: "var(--ink2,#5b6472)", fontWeight: 700 }}>{r.label}</span>
                <b style={{ color: "var(--ink,#1b1d22)", fontFamily: "ui-monospace,monospace" }}>{r.value}</b>
              </div>
            ))}
          </div>
        )}
        <Link to={`/number/${encodeURIComponent(ent.value)}`} className="rw-tchip on" style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "9px" }}>
          🔢 דף המספר {ent.value} ←
        </Link>
      </div>
    </div>
  );
}
