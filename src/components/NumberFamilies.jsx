import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getValueFamilies } from "../lib/supabase.js";

// 🧬 משפחות המילים — לכל ערך, הביטויים השווים לו בכל שיטה (חוץ מרגיל שמוצג למעלה).
// מוסיף לדף המספר, לא מוריד. props: value · highlight (שיטה להדגשה, מהמחשבון).
export default function NumberFamilies({ value, highlight }) {
  const P = usePalette();
  const [fams, setFams] = useState(null);

  useEffect(() => {
    if (!value || value < 1) { setFams([]); return; }
    let live = true; setFams(null);
    getValueFamilies(value).then(f => { if (live) setFams((f || []).filter(g => g.method !== "רגיל")); }).catch(() => { if (live) setFams([]); });
    return () => { live = false; };
  }, [value]);

  if (!fams || !fams.length) return null;

  return (
    <div style={{ marginTop: 12, padding: "13px 15px", borderRadius: 14, border: `1px solid ${P.border}`, background: P.card }}>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
        🧬 משפחות המילים · שווים ל-{value} בשיטות נוספות
      </div>
      <div style={{ display: "grid", gap: 9 }}>
        {fams.map(g => {
          const on = highlight && g.method === highlight;
          return (
            <div key={g.method} style={{ borderInlineStart: `3px solid ${on ? P.accent : P.border}`, paddingInlineStart: 9, background: on ? P.cardSoft : "transparent", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ color: on ? P.accentText : P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>{on ? "✨ " : ""}{g.method}</span>
                <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>({g.count})</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {g.phrases.map((p, i) => (
                  <Link key={i} to={`/number/${encodeURIComponent(p)}`} style={{
                    textDecoration: "none", color: P.accentText, background: P.cardSoft, border: `1px solid ${P.border}`,
                    borderRadius: 999, padding: "3px 11px", fontFamily: F.body, fontSize: 13, fontWeight: 600,
                  }}>{p}</Link>
                ))}
                {g.count > g.phrases.length && <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, alignSelf: "center" }}>+{g.count - g.phrases.length}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
