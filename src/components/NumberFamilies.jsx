import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getValueFamilies } from "../lib/supabase.js";
import { useGold } from "../lib/goldTier.js";
import { worldColor, WORLD_FAMILIES } from "../lib/worlds.js";
import { METHODS, DEPTH_METHODS } from "../lib/gematria.js";

// מה כל שיטה עושה (לתצוגה ב"כל השיטות")
const M_DESC = {};
[...METHODS, ...DEPTH_METHODS].forEach(m => { M_DESC[m.key] = m.sub || m.soul || ""; });

// 🧬 מילים שוות — רגיל ראשון (מה שכולם מבינים); "כל השיטות" נפתח בנפרד, מסודר עם הסבר.
export default function NumberFamilies({ value, highlight }) {
  const P = usePalette();
  const gold = useGold();
  const [fams, setFams] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [legend, setLegend] = useState(false);

  useEffect(() => {
    if (!value || value < 1) { setFams([]); return; }
    let live = true; setFams(null);
    getValueFamilies(value).then(f => { if (live) setFams(f || []); }).catch(() => { if (live) setFams([]); });
    return () => { live = false; };
  }, [value]);

  // הגעה ממחשבון לשיטה לא-רגילה → לפתוח אוטומטית את "כל השיטות"
  useEffect(() => { if (highlight && highlight !== "רגיל") setShowAll(true); }, [highlight]);

  if (!fams) return <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, padding: "4px 0" }}>טוען…</div>;
  if (!fams.length) return <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14 }}>עדיין אין מילים שוות לערך זה במאגר.</p>;

  const regular = fams.find(g => g.method === "רגיל");
  const others = fams.filter(g => g.method !== "רגיל");

  const Word = ({ phrase, world, ragil, method }) => {
    const isG = gold.labels.has(phrase);
    return (
      <Link to={`/number/${encodeURIComponent(phrase)}`} style={{
        textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5,
        color: isG ? P.onAccent : P.accentText, background: isG ? P.accentBtn : P.card,
        border: `1px solid ${isG ? "transparent" : P.border}`, borderRadius: 999, padding: "4px 12px",
        fontFamily: F.body, fontSize: 13.5, fontWeight: isG ? 800 : 500,
      }}>
        {isG ? "✦ " : ""}{phrase}
        {method !== "רגיל" && ragil != null && <span style={{ color: isG ? P.onAccent : P.accentDim, fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, opacity: isG ? 0.85 : 1 }}>· רגיל {ragil}</span>}
        {world && <span style={{ color: isG ? P.onAccent : worldColor(world), fontWeight: 700, fontSize: 11.5, opacity: isG ? 0.85 : 1 }}>· {world}</span>}
      </Link>
    );
  };

  const Group = ({ g, desc }) => {
    const on = highlight && g.method === highlight;
    return (
      <div style={{ borderInlineStart: `3px solid ${on ? P.accent : P.border}`, paddingInlineStart: 9, background: on ? P.cardSoft : "transparent", borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", marginBottom: desc ? 2 : 5 }}>
          <span style={{ color: on ? P.accentText : P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>{on ? "✨ " : ""}{g.method}</span>
          <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11 }}>({g.count} מילים)</span>
        </div>
        {desc && M_DESC[g.method] && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 11.5, marginBottom: 6, lineHeight: 1.5 }}>{M_DESC[g.method]}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {g.phrases.map((p, i) => <Word key={i} {...p} method={g.method} />)}
          {g.count > g.phrases.length && <span style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, alignSelf: "center" }}>+{g.count - g.phrases.length}</span>}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 11 }}>
      {/* רגיל — ראשון, מה שכולם מבינים */}
      {regular ? <Group g={regular} /> : <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5 }}>אין מילים שוות לערך זה ברגיל — ראו «כל השיטות» למטה.</p>}

      {/* כל השיטות — נפתח בנפרד (לא ראשון), מסודר עם הסבר */}
      {others.length > 0 && (
        <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 10 }}>
          <button onClick={() => setShowAll(s => !s)} style={{ cursor: "pointer", width: "100%", textAlign: "right", background: showAll ? P.cardSoft : P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 12, color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, padding: "10px 14px" }}>
            {showAll ? "▴ הסתר את כל השיטות" : `▾ כל השיטות — עוד ${others.length} שיטות (מסתתר · קדמי · משולש…)`}
          </button>
          {showAll && (
            <div style={{ display: "grid", gap: 11, marginTop: 11 }}>
              <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.7 }}>
                כל קבוצה = מילים ששוות <b style={{ color: P.accentText }}>{value}</b> <b>באותה שיטה</b> (לא ברגיל). ליד כל מילה — הערך שלה ברגיל, לשם השוואה.
              </div>
              {others.map(g => <Group key={g.method} g={g} desc />)}
              {/* מקרא צבעי העולמות */}
              <div>
                <button onClick={() => setLegend(v => !v)} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentDim, fontFamily: F.heading, fontSize: 10.5, fontWeight: 700, padding: "2px 0", letterSpacing: 1 }}>
                  🎨 מקרא צבעי העולמות {legend ? "▴" : "▾"}
                </button>
                {legend && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 11px", marginTop: 3 }}>
                    {Object.values(WORLD_FAMILIES).map(fam => (
                      <span key={fam.label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: F.body, fontSize: 10.5, color: P.inkSoft }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: fam.color, flexShrink: 0 }} />{fam.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* הזמנה לחקור בבית המדרש */}
      <div style={{ background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ color: P.ink, fontFamily: F.body, fontSize: 13, lineHeight: 1.75, marginBottom: 9 }}>
          💡 כל שיטה היא דרך אחרת לקרוא את אותו ערך. רוצים להבין לעומק ולחקור בעצמכם?
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to="/beit-midrash?tab=methods" style={{ textDecoration: "none", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, padding: "7px 14px" }}>📐 כל השיטות מוסברות</Link>
          <Link to="/beit-midrash?tab=calc" style={{ textDecoration: "none", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "8px 16px" }}>🧮 חקרו במחשבון הגימטריה →</Link>
        </div>
      </div>
    </div>
  );
}
