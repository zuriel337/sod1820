import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase.js";

// 🔤 מפענח-האותיות של כריסטינה — המחשבון שהיא בנתה.
// כל אות עברית נושאת משמעות ב«שיטה שלה» (christina_decomposition_rules, 27 כללים כולל סופיות).
// מקלידים מילה → כל אות נפתחת למשמעותה → נבנית קריאה פרשנית מורכבת.
// ⚠️ חותם אפיסטמי (gematria_engine_law): זו שיטה *פרשנית* של כריסטינה — לא עובדת-מנוע.
// עץ אחד: מקור-אמת יחיד = הטבלה של כריסטינה; אותו רכיב מוטמע גם בהיכל וגם בדף-הכתב שלה.
const C = {
  card: "var(--card,#ffffff)", line: "var(--line,#e4e7ec)", ink: "var(--ink,#1b1d22)",
  ink2: "var(--ink2,#5b6472)", soft: "#f7f8fa", gold: "#9a7818", goldDeep: "#7a5e12",
  goldSoft: "#fbf3da", violet: "#6b4ea6", violetSoft: "#f2edfa", violetLine: "#ddd0f0",
};
const clean = (s) => (s || "").replace(/[^א-ת]/g, "");

export default function ChristinaDecoder({ seed = "", embedded = false, hideInput = false }) {
  const [rules, setRules] = useState(null);   // { אות: {meaning, represents} }
  const [word, setWord] = useState(seed);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => { setWord(seed); }, [seed]);
  useEffect(() => {
    let live = true;
    supabase.from("christina_decomposition_rules")
      .select("hebrew_letter,meaning_in_her_system,represents,decomposition_layer")
      .then(({ data }) => {
        if (!live) return;
        const m = {};
        (data || []).forEach(r => { if (r.hebrew_letter) m[r.hebrew_letter] = r; });
        setRules(m);
      });
    return () => { live = false; };
  }, []);

  const letters = useMemo(() => clean(word).split(""), [word]);
  const reading = useMemo(() => {
    if (!rules) return "";
    return letters.map(l => rules[l]?.meaning_in_her_system).filter(Boolean).join(" · ");
  }, [letters, rules]);

  const wrap = { direction: "rtl", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: embedded ? 16 : 20 };
  const input = {
    width: "100%", boxSizing: "border-box", fontSize: 18, textAlign: "right", direction: "rtl",
    padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.violetLine}`, background: "#fff",
    color: C.ink, fontWeight: 700, outline: "none",
  };

  return (
    <div style={wrap}>
      {!embedded && (
        <div style={{ color: C.ink, fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
          🔤 מפענח-האותיות של כריסטינה
        </div>
      )}
      <div style={{ color: C.ink2, fontSize: 12.5, lineHeight: 1.6, marginBottom: 12 }}>
        כל אות נושאת משמעות בשיטה של כריסטינה. הקלידו מילה — וכל אות תיפתח למשמעותה.
        <span style={{ color: C.violet, fontWeight: 700 }}> שיטה פרשנית — לא עובדת-מנוע.</span>
      </div>

      {!hideInput && (
        <input value={word} onChange={e => setWord(e.target.value)} style={input}
          aria-label="מילה לפענוח" placeholder="הקלידו מילה בעברית…" />
      )}

      {rules === null && <div style={{ color: C.ink2, fontSize: 13, padding: "18px 2px" }}>טוען את שיטת האותיות…</div>}

      {rules && letters.length > 0 && (
        <>
          {/* פירוק אות-אות */}
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {letters.map((l, i) => {
              const r = rules[l];
              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: C.violetSoft, border: `1px solid ${C.violetLine}`, borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: C.violet, lineHeight: 1, minWidth: 34, textAlign: "center" }}>{l}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.ink, fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>
                      {r?.meaning_in_her_system || <span style={{ color: C.ink2, fontWeight: 500 }}>— אין כלל לאות זו —</span>}
                    </div>
                    {r?.represents && <div style={{ color: C.ink2, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{r.represents}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* קריאה מורכבת */}
          {reading && (
            <div style={{ marginTop: 14, background: C.goldSoft, border: `1px solid #e7d9a8`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ color: C.goldDeep, fontSize: 11.5, fontWeight: 800, marginBottom: 4 }}>✦ הקריאה המורכבת</div>
              <div style={{ color: C.ink, fontSize: 14, lineHeight: 1.7 }}>{reading}</div>
            </div>
          )}
        </>
      )}

      {/* מפתח האותיות המלא (מתקפל) */}
      {rules && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowKey(v => !v)}
            style={{ cursor: "pointer", background: "transparent", border: "none", color: C.violet, fontWeight: 700, fontSize: 12.5, padding: 0 }}>
            {showKey ? "▾ הסתר את מפתח האותיות המלא" : "▸ מפתח האותיות המלא (27 אותיות)"}
          </button>
          {showKey && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 6, marginTop: 8 }}>
              {Object.values(rules)
                .sort((a, b) => a.hebrew_letter.localeCompare(b.hebrew_letter, "he"))
                .map(r => (
                  <div key={r.hebrew_letter} style={{ background: C.soft, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 9px" }}>
                    <b style={{ color: C.violet, fontSize: 15 }}>{r.hebrew_letter}</b>
                    <span style={{ color: C.ink2, fontSize: 11.5, marginInlineStart: 6 }}>{r.meaning_in_her_system}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
