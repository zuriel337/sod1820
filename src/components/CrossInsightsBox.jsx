import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { getRecentCrosses } from "../lib/supabase.js";
import { countNewCrosses, crossDate } from "../lib/crossesNew.js";

// 🔮 הצלבות המנוע (AI) — קופסת בית: כמה נוספו (מהבהב), תאריך, וה-3 האחרונות.
// לחיצה מובילה לטאב "חידושי הצלבות" בבית המדרש (שם מתאפס המהבהב). props: light · max.
export default function CrossInsightsBox({ light = true, max = 3 }) {
  const [items, setItems] = useState([]);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    let live = true;
    getRecentCrosses(12).then(d => {
      if (!live) return;
      setItems(d || []);
      setNewCount(countNewCrosses(d || []));
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  if (!items.length) return null;
  const shown = items.slice(0, max);
  const latest = items[0]?.created_at;

  const L = light
    ? { panel: "#ffffff", ink: "#23201a", sub: "#6f685a", gold: "#7a5e12", line: "#e7dfcc", chip: "#faf8f2", badge: "#fff3d6" }
    : { panel: "rgba(20,15,12,0.5)", ink: "#e8c840", sub: "#cfc9d6", gold: "#f6e27a", line: "rgba(212,175,55,0.18)", chip: "rgba(8,5,2,0.5)", badge: "rgba(232,162,0,0.18)" };

  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16, padding: "14px 16px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: 17 }}>🔮</span>
        <span style={{ color: L.gold, fontFamily: F.regal, fontSize: 16.5, fontWeight: 800 }}>הצלבות המנוע</span>
        <span style={{ background: light ? "#eef4ff" : "rgba(62,166,255,0.14)", color: "#3ea6ff", border: `1px solid ${light ? "#cfe0ff" : "rgba(62,166,255,0.3)"}`, borderRadius: 999, padding: "1px 8px", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700 }}>AI · מאומת מנוע</span>
        {newCount > 0 && (
          <span style={{ background: "#e8a200", color: "#1a0e00", borderRadius: 999, padding: "2px 10px", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, boxShadow: "0 0 7px #e8a200", animation: "acc-blink 1.3s ease-in-out infinite" }}>🆕 {newCount} נוספו</span>
        )}
        <Link to="/beit-midrash?tab=crosses" style={{ marginInlineStart: "auto", textDecoration: "none", color: L.gold, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>כל ההצלבות →</Link>
      </div>
      {latest && <div style={{ color: L.sub, fontFamily: F.body, fontSize: 11.5, marginBottom: 10 }}>עודכן לאחרונה · {crossDate(latest)}</div>}

      <div style={{ display: "grid", gap: 8 }}>
        {shown.map(c => (
          <Link key={c.id} to="/beit-midrash?tab=crosses" style={{ textDecoration: "none", display: "block", background: L.chip, border: `1px solid ${L.line}`, borderRadius: 12, padding: "9px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ flex: 1, minWidth: 0, color: L.ink, fontFamily: F.regal, fontSize: 14.5, fontWeight: 700, lineHeight: 1.4 }}>{c.title}</span>
              {countNewCrosses([c]) > 0 && <span style={{ background: L.badge, border: `1px solid ${L.gold}`, color: L.gold, borderRadius: 999, padding: "1px 7px", fontFamily: F.heading, fontSize: 9.5, fontWeight: 800 }}>🆕</span>}
              {c.created_at && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 10.5, whiteSpace: "nowrap" }}>{crossDate(c.created_at)}</span>}
            </div>
            {(c.related_numbers || []).length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                {(c.related_numbers || []).slice(0, 5).map(n => (
                  <span key={n} style={{ fontFamily: F.mono, fontSize: 11.5, fontWeight: 800, color: L.gold, background: L.badge, border: `1px solid ${L.line}`, borderRadius: 999, padding: "1px 8px" }}>{n}</span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
