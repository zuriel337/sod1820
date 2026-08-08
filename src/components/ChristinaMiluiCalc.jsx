import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase.js";

// 🔢 מחשבון מילוי-כריסטינה — שיטת-המילוי הקבועה שלה (מקור-אמת: christina_milui_letters).
// עוגן מתועד שלה: כל האותיות במילוי-שמות קלאסי, אבל ו = וו = 12. אומת: 11/11 מהערכים שהצהירה.
// יושב ליד «מפענח-האותיות» (מנוע הפירוקים) — שתי עדשות של אותו מנוע-כריסטינה.
// ⚠️ חותם אפיסטמי (gematria_engine_law): זו קונבנציית-מילוי *שלה*, לא המנוע הדיפולטי של האתר.
// עץ אחד: הערך → דף-המספר הקנוני /number/:value (מצביע, לא משכפל).
const C = {
  card: "var(--card,#ffffff)", line: "var(--line,#e4e7ec)", ink: "var(--ink,#1b1d22)",
  ink2: "var(--ink2,#5b6472)", soft: "#f7f8fa", gold: "#9a7818", goldDeep: "#7a5e12",
  goldSoft: "#fbf3da", goldLine: "#e7d9a8",
};
const clean = (s) => (s || "").replace(/[^א-ת]/g, "");

export default function ChristinaMiluiCalc({ seed = "", embedded = false, hideInput = false }) {
  const [letters, setLetters] = useState(null);   // { אות: {milui_value, milui_spelling} }
  const [word, setWord] = useState(seed);

  useEffect(() => { setWord(seed); }, [seed]);
  useEffect(() => {
    let live = true;
    supabase.from("christina_milui_letters")
      .select("hebrew_letter,milui_value,milui_spelling")
      .then(({ data }) => {
        if (!live) return;
        const m = {};
        (data || []).forEach(r => { if (r.hebrew_letter) m[r.hebrew_letter] = r; });
        setLetters(m);
      });
    return () => { live = false; };
  }, []);

  const chars = useMemo(() => clean(word).split(""), [word]);
  const total = useMemo(() => {
    if (!letters) return 0;
    return chars.reduce((s, l) => s + (letters[l]?.milui_value || 0), 0);
  }, [chars, letters]);

  const wrap = { direction: "rtl", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: embedded ? 16 : 20 };
  const input = {
    width: "100%", boxSizing: "border-box", fontSize: 18, textAlign: "right", direction: "rtl",
    padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.goldLine}`, background: "#fff",
    color: C.ink, fontWeight: 700, outline: "none",
  };

  return (
    <div style={wrap}>
      {!embedded && (
        <div style={{ color: C.ink, fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
          🔢 מחשבון המילוי של כריסטינה
        </div>
      )}
      <div style={{ color: C.ink2, fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>
        מילוי-שמות בשיטתה הקבועה (עוגן: <b style={{ color: C.goldDeep }}>ו = וו = 12</b>).
        <span style={{ color: C.goldDeep, fontWeight: 700 }}> קונבנציית-מילוי שלה — לא המנוע הדיפולטי.</span>
      </div>

      {!hideInput && (
        <input value={word} onChange={e => setWord(e.target.value)} style={input}
          aria-label="מילה למילוי" placeholder="הקלידו מילה בעברית…" />
      )}

      {letters === null && <div style={{ color: C.ink2, fontSize: 13, padding: "18px 2px" }}>טוען את טבלת המילוי…</div>}

      {letters && chars.length > 0 && (
        <>
          {/* הערך הכולל — לחיצה פותחת את דף-המספר הקנוני */}
          <a href={`/number/${total}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, textDecoration: "none",
              marginTop: 14, background: C.goldSoft, border: `1px solid ${C.goldLine}`, borderRadius: 12, padding: "12px 14px" }}>
            <span style={{ color: C.goldDeep, fontSize: 12.5, fontWeight: 800 }}>מילוי-כריסטינה</span>
            <span style={{ color: C.gold, fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{total}</span>
            <span style={{ color: C.ink2, fontSize: 11.5 }}>← לדף-המספר</span>
          </a>

          {/* פירוק אות-אות: אות → שם-האות → ערך */}
          <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
            {chars.map((l, i) => {
              const r = letters[l];
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: C.soft, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 12px" }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: C.gold, lineHeight: 1, minWidth: 30, textAlign: "center" }}>{l}</div>
                  <div style={{ flex: 1, color: C.ink2, fontSize: 13 }}>{r?.milui_spelling || "—"}</div>
                  <div style={{ color: C.ink, fontSize: 15, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{r?.milui_value ?? "—"}</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
