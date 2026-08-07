import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import ChristinaDecoder from "./ChristinaDecoder.jsx";
import { getResearcherConvergences } from "../lib/contributions.js";

// ✦ מנוע-המרכז של דף-הכתב — נבחר לפי contributors.specialty (writers_page_law).
// כל כתב והמנוע שלו; זו הזהות של הדף, לא פיד גנרי. מנוע שלא מומש עדיין → null,
// והמדורים הרגילים של הדף נושאים את התוכן בינתיים. עץ אחד: כל מנוע = עדשה על הגרף.
export default function SpecialtyCenter({ c }) {
  const P = usePalette();
  if (!c || !c.specialty) return null;
  const acc = c.accent || P.accent;
  switch (c.specialty) {
    case "letter-decoder":
      return <ChristinaDecoder embedded />;
    case "crosses":
      return <CrossesWall name={c.display_name} acc={acc} P={P} />;
    default:
      return null;
  }
}

// ✦ קיר ההצלבות — ההתכנסויות שהכתב יצר (topic_cards created_by). כל הצלבה = כרטיס בולט
// שמפנה ל-/topic הקנוני, והמספרים ל-/number. לא משכפל — מצביע (unified_graph_law).
function CrossesWall({ name, acc, P }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    getResearcherConvergences(name).then(r => { if (alive) setRows(Array.isArray(r) ? r : []); });
    return () => { alive = false; };
  }, [name]);

  if (rows === null) return null;
  if (rows.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800 }}>✦ קיר ההצלבות של {name}</div>
        <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginTop: 3 }}>
          {rows.length} הצלבות — ביטויים ששווים לאותו ערך · לחיצה פותחת את ההתכנסות
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
        {rows.map(t => {
          const nums = [...new Set([...(t.highlight_numbers || []), ...(t.numbers || [])])].filter(n => n != null).slice(0, 4);
          return (
            <a key={t.slug} href={`/topic/${t.slug}`}
              style={{ display: "flex", flexDirection: "column", gap: 8, textDecoration: "none",
                background: `linear-gradient(180deg, ${acc}1c, ${P.card} 70%)`,
                border: `1px solid ${P.border}`, borderTop: `3px solid ${acc}`, borderRadius: 14, padding: "13px 15px" }}>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800, lineHeight: 1.4 }}>{t.title}</div>
              {t.subtitle && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12, lineHeight: 1.5 }}>{t.subtitle}</div>}
              {nums.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                  {nums.map(n => (
                    <span key={n} onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/number/${n}`; }}
                      style={{ fontFamily: F.mono, fontSize: 12.5, fontWeight: 800, color: acc,
                        border: `1px solid ${acc}55`, borderRadius: 999, padding: "2px 10px", cursor: "pointer" }}>{n}</span>
                  ))}
                </div>
              )}
            </a>
          );
        })}
      </div>
      <div style={{ borderBottom: `1px dashed ${P.border}`, margin: "18px 0 2px" }} />
    </div>
  );
}
