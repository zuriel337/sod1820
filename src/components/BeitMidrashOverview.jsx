import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { timeAgoHe } from "../lib/format.js";
import { getSearchFeed, getRecentCrosses } from "../lib/supabase.js";
import { countNewCrosses, crossDate } from "../lib/crossesNew.js";
import { maskTerm, safeSearchHref } from "../lib/nameMask.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useSubscribed } from "./SubscribeGate.jsx";

// ✦ רובריקה אחת לבית המדרש — כל מה שמתרחש בריבוע אחד:
// מה נחקר (צ'יפים, שמות מוסתרים) + הצלבות המנוע (שורות, החדשות למעלה + מונה מהבהב).
// ללא תמונות — רק שורות, נקי ויפה במובייל.
const L = { panel: "#ffffff", ink: "#23201a", sub: "#6f685a", gold: "#7a5e12", goldHi: "#9a7818", line: "#e7dfcc", chip: "#faf8f2", badge: "#fff3d6", blue: "#3ea6ff", blueBg: "#eef6ff", blueLine: "#cfe4ff" };

export default function BeitMidrashOverview() {
  const { user, profile } = useAuth();
  const subscribed = useSubscribed();
  const isAdmin = profile?.role === "admin";
  const tier = isAdmin ? "admin" : subscribed ? "sub" : user ? "user" : "anon";
  const [searches, setSearches] = useState([]);
  const [crosses, setCrosses] = useState([]);

  useEffect(() => {
    let live = true;
    getSearchFeed(tier).then(r => { if (live) setSearches(r || []); }).catch(() => {});
    getRecentCrosses(12).then(d => { if (live) setCrosses(d || []); }).catch(() => {});
    const id = setInterval(() => getSearchFeed(tier).then(r => live && setSearches(r || [])).catch(() => {}), 45000);
    return () => { live = false; clearInterval(id); };
  }, [tier]);

  const newCount = countNewCrosses(crosses);
  const sh = searches.slice(0, 6);
  const cr = crosses.slice(0, 3);

  const secTitle = { color: L.gold, fontFamily: F.heading, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" };
  const seeAll = { marginInlineStart: "auto", textDecoration: "none", color: L.gold, fontFamily: F.heading, fontSize: 12, fontWeight: 700 };

  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 18, padding: "16px 18px", direction: "rtl", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e0533a", boxShadow: "0 0 7px #e0533a", animation: "bm-blink 1.4s ease-in-out infinite" }} />
        <span style={{ color: L.ink, fontFamily: F.regal, fontSize: 18, fontWeight: 800 }}>מה מתרחש בבית המדרש</span>
        <span style={{ background: L.blueBg, color: L.blue, border: `1px solid ${L.blueLine}`, borderRadius: 999, padding: "1px 9px", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700 }}>חי</span>
      </div>

      <div className="bmo-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* מה נחקר */}
        <div>
          <div style={secTitle}>
            🔎 נחקר לאחרונה
            <Link to="/beit-midrash?tab=searches" style={seeAll}>כל החיפושים →</Link>
          </div>
          {sh.length === 0 ? (
            <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, marginTop: 8 }}>טוען…</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 9 }}>
              {sh.map((r, i) => (
                <Link key={i} to={safeSearchHref(r.term, r.value, isAdmin)} title={isAdmin ? r.term : "חיפוש"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: L.chip, border: `1px solid ${L.line}`, borderRadius: 999, padding: "4px 6px 4px 11px" }}>
                  <span style={{ color: L.ink, fontFamily: F.body, fontSize: 13.5, fontWeight: 600 }}>{maskTerm(r.term, isAdmin)}</span>
                  {r.value != null && <span style={{ background: L.badge, color: L.gold, fontFamily: "'Courier New',monospace", fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: "1px 8px" }}>{r.value}</span>}
                </Link>
              ))}
            </div>
          )}
          {tier === "anon" && (
            <div style={{ marginTop: 9, color: L.sub, fontFamily: F.body, fontSize: 11.5 }}>
              🔓 <Link to="/login" style={{ color: L.gold, textDecoration: "none", fontWeight: 700 }}>הירשמו (חינם)</Link> כדי לראות עוד.
            </div>
          )}
        </div>

        {/* הצלבות המנוע */}
        <div>
          <div style={secTitle}>
            🔮 הצלבות המנוע
            {newCount > 0 && <span style={{ background: "#e8a200", color: "#1a0e00", borderRadius: 999, padding: "1px 9px", fontSize: 10.5, fontWeight: 800, boxShadow: "0 0 7px #e8a200", animation: "bm-blink 1.3s ease-in-out infinite" }}>🆕 {newCount}</span>}
            <Link to="/beit-midrash?tab=crosses" style={seeAll}>כל ההצלבות →</Link>
          </div>
          {cr.length === 0 ? (
            <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, marginTop: 8 }}>טוען…</div>
          ) : (
            <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
              {cr.map(c => (
                <Link key={c.id} to="/beit-midrash?tab=crosses" style={{ textDecoration: "none", display: "block", background: L.chip, border: `1px solid ${L.line}`, borderRadius: 11, padding: "8px 11px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ flex: 1, minWidth: 0, color: L.ink, fontFamily: F.regal, fontSize: 14, fontWeight: 700, lineHeight: 1.35 }}>{c.title}</span>
                    {countNewCrosses([c]) > 0 && <span style={{ color: L.goldHi, fontSize: 11, fontWeight: 800 }}>🆕</span>}
                    {c.created_at && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 10.5, whiteSpace: "nowrap" }}>{crossDate(c.created_at)}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@media (max-width:680px){ .bmo-grid{ grid-template-columns:1fr !important; gap:14px !important; } }`}</style>
    </div>
  );
}
