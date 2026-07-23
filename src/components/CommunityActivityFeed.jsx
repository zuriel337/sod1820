import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getForumFeed, forumItemMeta } from "../lib/contributions.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";

// 🔴 «פעילות אחרונה בקהילה» — עדשה קומפקטית על getForumFeed (מקור-אמת יחיד עם הפורום
// ורצועת-הפוטר «מהפורום»). הפיד ממזג פוסטים · חידושי-פורום · צפני-גולשים · עדכוני-ערוץ.
// ⭐ עמיד-לעתיד: כל kind חדש מוצג אוטומטית דרך forumItemMeta הקנוני, בלי שינוי כאן.
// תמה-מודע (usePalette) → קריא ביום ובלילה. אין נתונים → לא מרנדר כלום (בלי קופסה-ריקה).
export default function CommunityActivityFeed({ limit = 8, frame = true, style }) {
  const P = usePalette();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let a = true;
    getForumFeed({ limit }).then(f => a && setRows(Array.isArray(f) ? f : [])).catch(() => a && setRows([]));
    return () => { a = false; };
  }, [limit]);
  if (rows === null || !rows.length) return null;

  const frameStyle = frame ? { background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: "6px 8px 4px" } : null;
  return (
    <div style={{ ...frameStyle, ...style }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 10px 8px" }}>
        <span style={{ color: P.accentText, fontFamily: F.regal, fontSize: 17, fontWeight: 800 }}>🔴 פעילות אחרונה</span>
        <Link to="/forum" style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800, textDecoration: "none" }}>לפורום המחקר →</Link>
      </div>
      <div style={{ display: "grid" }}>
        {rows.map((it, i) => {
          const m = forumItemMeta(it);
          const text = stripHtml(m.text).slice(0, 90) || m.label;
          const when = timeAgoHe(m.when);
          return (
            <Link key={i} to={m.href}
              style={{
                display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
                padding: "10px", borderTop: i ? `1px solid ${P.border}` : "none",
              }}>
              <span style={{ fontSize: 17, flex: "none" }} aria-hidden>{m.em}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", color: P.ink, fontFamily: F.body, fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
                <span style={{ display: "block", color: P.accentDim, fontFamily: F.heading, fontSize: 11, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.label} · ✍️ {m.who}{when ? ` · ${when}` : ""}
                </span>
              </span>
              <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, flex: "none" }} aria-hidden>←</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
