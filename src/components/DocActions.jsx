import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { saveUserItem } from "../lib/supabase.js";
import { printDoc } from "../lib/printDoc.js";

// 🖨️ + 💾 רצועת פעולות-מסמך — הדפסה ושמירה פרטית ל«דף העבודה שלי».
// props: kind ('cross'|'convergence') · refId · title · link · contentRef (מכל-התוכן להדפסה).
// מסומנת no-print כדי שלא תופיע בהדפסה עצמה.
export default function DocActions({ kind, refId, title, link, contentRef }) {
  const P = usePalette();
  const nav = useNavigate();
  const { user } = useAuth();
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState(false);
  const flash = (m, ms = 3200) => { setToast(m); setTimeout(() => setToast(""), ms); };

  const onPrint = () => printDoc(title, contentRef?.current?.innerHTML || "");

  const onSave = async () => {
    if (!user) {
      flash("התחברו (חינם) כדי לשמור לדף העבודה שלכם");
      setTimeout(() => nav("/login"), 900);
      return;
    }
    const { error } = await saveUserItem({ kind, ref: refId, title, link });
    if (error) flash(error === "auth" ? "התחברו כדי לשמור" : "השמירה נכשלה — נסו שוב");
    else { setSaved(true); flash("✓ נשמר לדף העבודה שלך"); }
  };

  const b = {
    cursor: "pointer", border: `1px solid ${P.accent}`, borderRadius: 999,
    background: "transparent", color: P.accentText, fontFamily: F.heading,
    fontWeight: 800, fontSize: 13, padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: 7,
  };

  return (
    <div className="no-print" style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button onClick={onPrint} style={b} title="הדפסה / שמירה כ-PDF">🖨️ הדפס</button>
      <button onClick={onSave} style={{ ...b, ...(saved ? { background: P.glow } : null) }} title="שמירה פרטית לדף העבודה שלך">
        {saved ? "✓ נשמר" : "💾 שמור אצלי"}
      </button>
      {toast && (
        <span style={{ color: P.accentText, fontFamily: F.body, fontSize: 12.5, background: P.glow,
          border: `1px solid ${P.border}`, borderRadius: 999, padding: "4px 12px" }}>{toast}</span>
      )}
    </div>
  );
}
