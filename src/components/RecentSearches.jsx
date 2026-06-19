import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { timeAgoHe } from "../lib/format.js";
import { getSearchFeed } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useSubscribed } from "./SubscribeGate.jsx";
import { maskTerm, safeSearchHref } from "../lib/nameMask.js";

// 🕒 חיפושים אחרונים — מקור אחד (search_log) לכל האתר, דרגות לפי משתמש.
// אנונימי: 3 · רשום: 3 ימים · מנוי: 30 יום · אדמין: הכל.
// props: max · seeAllTo · light (override; ברירת מחדל = פלטה גלובלית, מתחלף עם המתג).
export default function RecentSearches({ max = 0, light, seeAllTo = "/beit-midrash?tab=searches", title = "🕒 נחקר לאחרונה" }) {
  const globalP = usePalette();
  const pal = light == null ? globalP : PALETTES[light ? "light" : "dark"];
  const { user, profile } = useAuth();
  const subscribed = useSubscribed();
  const [rows, setRows] = useState([]);
  const isAdmin = profile?.role === "admin";
  const tier = isAdmin ? "admin" : subscribed ? "sub" : user ? "user" : "anon";

  useEffect(() => {
    let live = true;
    getSearchFeed(tier).then(r => { if (live) setRows(r); }).catch(() => {});
    const id = setInterval(() => getSearchFeed(tier).then(r => live && setRows(r)).catch(() => {}), 45000);
    return () => { live = false; clearInterval(id); };
  }, [tier]);

  if (!rows.length) return null;
  const shown = max > 0 ? rows.slice(0, max) : rows;

  const L = { panel: pal.card, ink: pal.ink, sub: pal.inkSoft, gold: pal.accentText, line: pal.border, chip: pal.cardSoft, badge: pal.glow };

  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16, padding: "13px 16px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e0533a", boxShadow: "0 0 7px #e0533a", animation: "acc-blink 1.4s ease-in-out infinite" }} />
        <span style={{ color: L.gold, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800 }}>{title}</span>
        <Link to={seeAllTo} style={{ marginInlineStart: "auto", textDecoration: "none", color: L.gold, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>כל החיפושים →</Link>
      </div>
      {!isAdmin && <div style={{ color: L.sub, fontFamily: F.body, fontSize: 11, marginBottom: 9 }}>🔒 שמות אישיים מוסתרים</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {shown.map((r, i) => (
          <Link key={i} to={safeSearchHref(r.term, r.value, isAdmin)} title={isAdmin ? `${r.term}${r.value ? ` = ${r.value}` : ""}` : "חיפוש"}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, textDecoration: "none", background: L.chip, border: `1px solid ${L.line}`, borderRadius: 999, padding: "5px 6px 5px 12px" }}>
            <span style={{ color: L.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600 }}>{maskTerm(r.term, isAdmin)}</span>
            {r.value != null && <span style={{ background: L.badge, color: L.gold, fontFamily: F.mono, fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 9px" }}>{r.value}</span>}
            {r.at && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 11, whiteSpace: "nowrap" }}>· {timeAgoHe(r.at)}</span>}
          </Link>
        ))}
      </div>
      {tier === "anon" && (
        <div style={{ marginTop: 9, color: L.sub, fontFamily: F.body, fontSize: 12 }}>
          🔓 <Link to="/login" style={{ color: L.gold, textDecoration: "none", fontWeight: 700 }}>הירשמו (חינם)</Link> כדי לראות עוד חיפושים אחרונים.
        </div>
      )}
    </div>
  );
}
