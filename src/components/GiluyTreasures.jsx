import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getGiluyTreasures } from "../lib/supabase.js";

// 🔷 אוצרות הגילוי — הצלבה חוצת-שיטות (לא התכנסות!): אותו ערך-עוגן שמתגלה שוב ושוב
// בשיטות חישוב שונות (רגיל · גדול · מילוי · קדמי · דילוג). יושבת על עמוד המספר הקנוני
// ומצביעה להתכנסויות התמטיות (שמופיעות מעליה) — לא משכפלת אותן.
// היררכיה נעולה בגרף (otzarot_giluy_hierarchy): שכבה 1 «האוצרות» · שכבה 2 «השלמה לאוצרות».
export default function GiluyTreasures({ value }) {
  const P = usePalette();
  const [t, setT] = useState(null);

  useEffect(() => {
    let live = true;
    if (!value) { setT(null); return; }
    getGiluyTreasures(value).then(r => { if (live) setT(r); }).catch(() => { if (live) setT(null); });
    return () => { live = false; };
  }, [value]);

  if (!t || (!t.core.length && !t.supplement.length)) return null;

  const Item = ({ it, big }) => (
    <Link to={`/number/${encodeURIComponent(it.phrase)}`}
      onMouseEnter={e => (e.currentTarget.style.borderColor = P.accent)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = big ? P.accent + "77" : P.border)}
      style={{
        textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8,
        background: big ? P.cardGrad : P.card, border: `1px solid ${big ? P.accent + "77" : P.border}`,
        borderRadius: 12, padding: big ? "9px 14px" : "6px 11px", transition: "border-color .18s",
      }}>
      <span style={{ color: P.ink, fontFamily: F.regal, fontSize: big ? 15.5 : 13.5, fontWeight: 700 }}>{it.phrase}</span>
      {it.method && (
        <span style={{ color: P.onAccent, background: P.accentBtn, fontFamily: F.heading, fontWeight: 800,
          fontSize: big ? 10.5 : 9.5, borderRadius: 999, padding: "1px 8px", whiteSpace: "nowrap" }}>{it.method}</span>
      )}
    </Link>
  );

  return (
    <section style={{ margin: "10px 0 22px", background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: "16px 16px 18px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, flexWrap: "wrap", marginBottom: 5 }}>
        <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>🔷 אוצרות הגילוי</span>
        <span style={{ color: P.ink, fontFamily: F.mono, fontSize: 14.5, fontWeight: 800 }}>{value} בכל שיטה</span>
      </div>
      <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.65, marginBottom: 13 }}>
        הצלבה — אותו ערך שמתגלה שוב ושוב בשיטות חישוב שונות (רגיל · גדול · מילוי · קדמי · דילוג). לא התכנסות אחת אלא נפילה של הכול על אותה נקודה.
      </div>

      {t.core.length > 0 && (
        <div style={{ marginBottom: t.supplement.length ? 15 : 0 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, marginBottom: 8 }}>✦ האוצרות</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {t.core.map((it, i) => <Item key={`c${i}`} it={it} big />)}
          </div>
        </div>
      )}

      {t.supplement.length > 0 && (
        <div>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, letterSpacing: 1.5, marginBottom: 7, opacity: 0.8 }}>השלמה לאוצרות</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {t.supplement.map((it, i) => <Item key={`s${i}`} it={it} />)}
          </div>
        </div>
      )}
    </section>
  );
}
