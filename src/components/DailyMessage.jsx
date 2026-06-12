import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import { C, F, KEY_NUMBERS } from "../theme.js";

// מספר ימים מאז עוגן קבוע — לבחירה דטרמיניסטית "מסר היום"
function dayIndex() {
  const ms = Date.now() - Date.parse("2024-01-01");
  return Math.floor(ms / 86400000);
}

// ✨ המסר היומי — מתחלף כל יום, מעודד חזרה יומית.
export default function DailyMessage() {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let pool = [];
      try {
        const { data } = await supabase
          .from("number_readings")
          .select("number,reading,meaning")
          .eq("is_active", true);
        if (data?.length) {
          pool = data.map(r => ({ number: r.number, title: r.reading, body: r.meaning }));
        }
      } catch { /* fallback בהמשך */ }

      if (!pool.length) {
        try {
          const { data } = await supabase
            .from("insights")
            .select("title,body,related_numbers")
            .eq("is_active", true)
            .limit(60);
          if (data?.length) {
            pool = data.map(r => ({ number: (r.related_numbers || [])[0] ?? null, title: r.title, body: r.body }));
          }
        } catch { /* fallback בהמשך */ }
      }

      if (!pool.length) {
        pool = Object.entries(KEY_NUMBERS).map(([n, label]) => ({ number: Number(n), title: label, body: "" }));
      }

      if (alive && pool.length) setMsg(pool[dayIndex() % pool.length]);
    })();
    return () => { alive = false; };
  }, []);

  if (!msg) return null;

  return (
    <div style={{
      direction: "rtl", maxWidth: 1040, margin: "0 auto 8px", padding: "0 18px",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
        background: `linear-gradient(135deg, ${C.surface2}, rgba(26,10,46,0.5))`,
        border: `1px solid ${C.borderGold}`, borderRadius: 12, padding: "16px 22px",
        boxShadow: `0 0 30px rgba(212,175,55,0.08)`,
      }}>
        <div style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase", whiteSpace: "nowrap" }}>
          💎 פנינים
        </div>
        {msg.number != null && (
          <Link to={"/number/" + encodeURIComponent(msg.number)} style={{
            color: C.goldBright, fontFamily: F.regal, fontSize: 34, fontWeight: 900,
            textDecoration: "none", textShadow: `0 0 24px ${C.goldDeep}`,
          }}>{msg.number}</Link>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          {msg.title && <div style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 16, fontWeight: 700 }}>{msg.title}</div>}
          {msg.body && <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7, marginTop: 2 }}>{msg.body}</div>}
        </div>
        <Link to="/numbers" style={{
          color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 12,
          fontWeight: 700, letterSpacing: 1, border: `1px solid ${C.borderGold}`,
          borderRadius: 6, padding: "8px 14px", whiteSpace: "nowrap",
        }}>לעץ המספרים →</Link>
      </div>
    </div>
  );
}
