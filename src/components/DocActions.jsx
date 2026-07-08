import React, { useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { printDoc } from "../lib/printDoc.js";

// 🖨️ + 💾 רצועת פעולות-מסמך — הדפסה ושמירה ל«שמורים» של עולם-המשתמש (עץ אחד = research_items).
// props: kind ('cross'|'convergence') · refId · title · link · contentRef (מכל-התוכן להדפסה).
// מסומנת no-print כדי שלא תופיע בהדפסה עצמה. שמירה local-first — עובדת גם בלי התחברות, ומסונכרנת לענן למחוברים.
export default function DocActions({ kind, refId, title, link, contentRef }) {
  const P = usePalette();
  const { saveItem } = useResearch();
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState(false);
  const flash = (m, ms = 3200) => { setToast(m); setTimeout(() => setToast(""), ms); };

  const onPrint = () => printDoc(title, contentRef?.current?.innerHTML || "");

  const onSave = () => {
    saveItem?.({ id: `${kind}:${refId}`, type: kind, title, link });
    setSaved(true);
    flash("✓ נשמר לשמורים · עולם המשתמש");
  };

  const b = {
    cursor: "pointer", border: `1px solid ${P.accent}`, borderRadius: 999,
    background: "transparent", color: P.accentText, fontFamily: F.heading,
    fontWeight: 800, fontSize: 13, padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: 7,
  };

  return (
    <div className="no-print" style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button onClick={onPrint} style={b} title="הדפסה / שמירה כ-PDF">🖨️ הדפס</button>
      <button onClick={onSave} style={{ ...b, ...(saved ? { background: P.glow } : null) }} title="שמור לשמורים · עולם המשתמש">
        {saved ? "✓ נשמר" : "💾 שמור אצלי"}
      </button>
      {toast && (
        <span style={{ color: P.accentText, fontFamily: F.body, fontSize: 12.5, background: P.glow,
          border: `1px solid ${P.border}`, borderRadius: 999, padding: "4px 12px" }}>{toast}</span>
      )}
    </div>
  );
}
