import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { timeAgoHe } from "../lib/format.js";
import { getRecentNumbers } from "../lib/supabase.js";

// 🔢 «מספרים שנפתחו עכשיו» — מציג אילו *דפי-מספר* נפתחו באתר (לא חיפושים אישיים).
// מספר הוא נתון ציבורי (לא שם פרטי) → מותר להציג לכולם. לחיצה → דף המספר.
// מקור: recent_number_opens (מסונן למספרים משמעותיים; זבל-בוטים מעל 4 ספרות כבר לא נרשם).
export default function RecentNumbers({ max = 8, light, title = "🔢 מספרים שנפתחו עכשיו" }) {
  const globalP = usePalette();
  const pal = light == null ? globalP : PALETTES[light ? "light" : "dark"];
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let live = true;
    const load = () => getRecentNumbers(max).then(r => { if (live) setRows(r || []); }).catch(() => {});
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 45000);
    return () => { live = false; clearInterval(id); };
  }, [max]);

  if (!rows.length) return null;
  const L = { panel: pal.card, ink: pal.ink, sub: pal.inkSoft, gold: pal.accentText, line: pal.border, chip: pal.cardSoft, badge: pal.glow };
  const clip = s => (s && s.length > 16 ? s.slice(0, 15) + "…" : s);

  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16, padding: "13px 16px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#57c98a", boxShadow: "0 0 7px #57c98a", animation: "acc-blink 1.4s ease-in-out infinite" }} />
        <span style={{ color: L.gold, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800 }}>{title}</span>
        <Link to="/numbers" style={{ marginInlineStart: "auto", textDecoration: "none", color: L.gold, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>עץ המספרים →</Link>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {rows.map((r, i) => (
          <Link key={i} to={`/number/${r.n}`} title={`דף המספר ${r.n}${r.lead ? ` · ${r.lead}` : ""}${r.opens ? ` · ${r.opens} פתיחות` : ""}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", background: L.chip, border: `1px solid ${L.line}`, borderRadius: 999, padding: "5px 7px 5px 12px" }}>
            <span style={{ background: L.badge, color: L.gold, fontFamily: F.mono, fontSize: 13.5, fontWeight: 800, borderRadius: 999, padding: "2px 11px" }}>{r.n}</span>
            {r.lead && <span style={{ color: L.ink, fontFamily: F.body, fontSize: 13, fontWeight: 600 }}>{clip(r.lead)}</span>}
            {r.last_at && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>· {timeAgoHe(r.last_at)}</span>}
          </Link>
        ))}
      </div>
      <div style={{ marginTop: 9, color: L.sub, fontFamily: F.body, fontSize: 11 }}>
        דפי-מספר שגולשים פתחו לאחרונה · לחצו לצפייה
      </div>
    </div>
  );
}
