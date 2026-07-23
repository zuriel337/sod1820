import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getContributorsFeed } from "../lib/contributions.js";
import { genAvatar } from "../lib/avatar.js";

// 👥 רשימת הכתבים והחוקרים — עדשה חיה על contributors_feed (החוקרים הפעילים).
// רכיב קנוני יחיד (canonical_ui_components_law): מוצג *באותה צורה* בתפריט-הנאב (דסקטופ+מובייל)
// וגם בעמוד «קהילה». כל צ'יפ → דף-החוקר הקנוני (/community/researcher/:slug); «כל החוקרים» → האינדקס.
//
// variant:
//  "chrome" → צבעי-זהב כהים לתוך שלד-הנאב (הנאב תמיד כהה, לא תלוי בתמת-הדף) — זהה למגירת-המובייל.
//  "page"   → תמה-מודע (usePalette) לעמוד בהיר/כהה.
// wrap: false = רצועה נגללת-אופקית (בתפריט) · true = צ'יפים שנשברים לשורות (בעמוד).
export default function WritersRail({ variant = "page", limit = 14, max = 12, onNavigate, wrap = false, heading = true, frame = false, style }) {
  const P = usePalette();
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let a = true;
    getContributorsFeed(limit)
      .then(r => { if (a) setRows((r || []).filter(x => x.slug && x.display_name).slice(0, max)); })
      .catch(() => {});
    return () => { a = false; };
  }, [limit, max]);
  // ⛔ אין חוקרים (או שהנתונים עוד לא נטענו) → לא מרנדרים כלום (בלי קופסה-ריקה).
  if (!rows.length) return null;

  const chrome = variant === "chrome";
  // צבעים: chrome = זהב-כהה קבוע (לא תלוי בתמת-הדף); page = טוקני-פלטה (בהיר/כהה).
  const c = chrome ? {
    label: "rgba(212,175,55,0.72)", link: "#e6cf86",
    chipBg: "rgba(212,175,55,0.06)", chipBorder: "rgba(212,175,55,0.22)",
    avaBorder: "rgba(212,175,55,0.5)", name: "#f6e27a",
  } : {
    label: P.accentDim, link: P.accentText,
    chipBg: P.cardSoft, chipBorder: P.border,
    avaBorder: P.borderStrong, name: P.accentText,
  };

  // frame=true (עמוד) → הרכיב עוטף את עצמו בכרטיס-פלטה, כך שהקופסה מופיעה *רק* כשיש חוקרים.
  const frameStyle = frame ? {
    background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: "16px 16px 14px",
  } : null;

  return (
    <div style={{ margin: "10px 8px 2px", ...frameStyle, ...style }}>
      {heading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px 8px" }}>
          <span style={{ color: c.label, fontFamily: F.heading, fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>👥 הכתבים והחוקרים</span>
          <Link to="/community/researchers" onClick={onNavigate}
            style={{ color: c.link, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>
            כל החוקרים →
          </Link>
        </div>
      )}
      {/* צ'יפים קומפקטיים — אווטאר קטן + שם בלבד. נגללים אופקית (תפריט) או נשברים לשורות (עמוד). */}
      <div style={{
        display: "flex", gap: 6,
        flexWrap: wrap ? "wrap" : "nowrap",
        overflowX: wrap ? "visible" : "auto",
        paddingBottom: wrap ? 0 : 4, WebkitOverflowScrolling: "touch",
      }}>
        {rows.map(r => (
          <Link key={r.slug} to={`/community/researcher/${r.slug}`} onClick={onNavigate}
            style={{
              flex: "none", display: "flex", alignItems: "center", gap: 6, textDecoration: "none",
              background: c.chipBg, border: `1px solid ${c.chipBorder}`, borderRadius: 999, padding: "4px 10px 4px 5px",
            }}>
            <img src={genAvatar(r.display_name)} alt="" loading="lazy"
              style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${c.avaBorder}`, flex: "none" }} />
            <span style={{ color: c.name, fontFamily: F.royal, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{r.display_name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
