import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useThemeMode, toggleTheme } from "../lib/themeMode.js";

// ===== "הגוגל של המספרים" — דף נחיתה /number =====
// שורה אחת ממורכזת (רגע הגוגל) → הקלדת מספר/שם → /number/:value (3 העומקים).
const EXAMPLES = ["1820", "358", "26", "1237", "אהבה", "משיח"];

export default function NumberSearchPage() {
  const nav = useNavigate();
  const P = usePalette();
  const mode = useThemeMode();
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { document.title = "מנוע המספרים · הגוגל של המספרים · סוד 1820"; }, []);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 200); return () => clearTimeout(t); }, []);

  const go = e => { e.preventDefault(); const v = q.trim(); if (v) nav(`/number/${encodeURIComponent(v)}`); };

  return (
    <div style={{ background: P.pageBg, minHeight: "92vh", position: "relative", zIndex: 1, direction: "rtl",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px 80px" }}>
      {/* מתג תמה בפינה */}
      <button onClick={toggleTheme} title="החלפת תמה" aria-label="החלפת תמה" style={{
        position: "absolute", top: 16, insetInlineStart: 16, cursor: "pointer", width: 38, height: 38, borderRadius: 999,
        border: `1px solid ${P.borderStrong}`, background: P.cardSoft, color: P.accentText, fontSize: 17 }}>
        {mode === "light" ? "🌙" : "☀️"}
      </button>

      {/* לוגו/מותג בסגנון גוגל */}
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={{ fontSize: "clamp(40px,9vw,72px)", fontWeight: 900, fontFamily: F.regal, color: P.heroNum,
          letterSpacing: 1, textShadow: `0 0 36px ${P.glow}`, lineHeight: 1 }}>
          🔢 מנוע המספרים
        </div>
        <div style={{ marginTop: 10, color: P.accentText, fontFamily: F.heading, fontSize: "clamp(14px,2.6vw,18px)", fontWeight: 700 }}>
          הגוגל של המספרים
        </div>
        <div style={{ marginTop: 4, color: P.accentDim, fontFamily: F.body, fontSize: 13.5 }}>
          הקלידו מספר או שם — שורה אחת, עומק אינסופי
        </div>
      </div>

      {/* תיבת חיפוש ממורכזת */}
      <form onSubmit={go} style={{ width: "min(620px, 94vw)", display: "flex", gap: 8 }}>
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} dir="rtl"
          placeholder="הקלידו מספר (1820) או שם (דוד)…" inputMode="text"
          style={{ flex: 1, background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999,
            color: P.ink, fontFamily: F.body, fontSize: 17, padding: "15px 24px", outline: "none", textAlign: "center",
            boxShadow: `0 4px 22px ${P.glow}` }} />
        <button type="submit" style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none",
          borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 16, padding: "0 26px" }}>גלו ✦</button>
      </form>

      {/* דוגמאות מהירות */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 22, maxWidth: 560 }}>
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, alignSelf: "center" }}>נסו:</span>
        {EXAMPLES.map(ex => (
          <button key={ex} onClick={() => nav(`/number/${encodeURIComponent(ex)}`)} style={{
            cursor: "pointer", background: P.card, border: `1px solid ${P.border}`, borderRadius: 999,
            color: P.accentText, fontFamily: F.body, fontSize: 14, fontWeight: 600, padding: "6px 14px" }}>{ex}</button>
        ))}
      </div>
    </div>
  );
}
