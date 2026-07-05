import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { timeAgoHe } from "../lib/format.js";
import { getSearchFeed, getRecentCrosses, getRecentCommunityWords } from "../lib/supabase.js";
import { countNewCrosses, crossDate } from "../lib/crossesNew.js";
import { maskTerm, safeSearchHref } from "../lib/nameMask.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useSubscribed } from "./SubscribeGate.jsx";
import ActivityPulse from "./ActivityPulse.jsx";

// ✦ רובריקה אחת לבית המדרש — מה נחקר + הצלבות המנוע, ללא תמונות (שורות בלבד).
// דסקטופ: 11 חיפושים + 2 הצלבות. מובייל: רק 2 חיפושים בשורה אחת (בלי הצלבות).
const L = { panel: "#ffffff", ink: "#23201a", sub: "#6f685a", gold: "#7a5e12", goldHi: "#9a7818", line: "#e7dfcc", chip: "#faf8f2", badge: "#fff3d6", blue: "#3ea6ff", blueBg: "#eef6ff", blueLine: "#cfe4ff" };

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 680px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 680px)");
    const h = e => setM(e.matches);
    mq.addEventListener ? mq.addEventListener("change", h) : mq.addListener(h);
    setM(mq.matches);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", h) : mq.removeListener(h); };
  }, []);
  return m;
}

export default function BeitMidrashOverview() {
  const { user, profile } = useAuth();
  const subscribed = useSubscribed();
  const isAdmin = profile?.role === "admin";
  const tier = isAdmin ? "admin" : subscribed ? "sub" : user ? "user" : "anon";
  const isMobile = useIsMobile();
  const [searches, setSearches] = useState([]);
  const [crosses, setCrosses] = useState([]);
  const [newWords, setNewWords] = useState([]);   // ✦ מילים חדשות שעלו (2 שורות)

  useEffect(() => {
    let live = true;
    getRecentCommunityWords(6).then(w => { if (live) setNewWords(w || []); }).catch(() => {});
    // 🔒 פרטיות: תוכן-חיפושים נמשך לאדמין בלבד; הציבור מקבל «פעילות חיה» (ActivityPulse)
    if (isAdmin) {
      getSearchFeed(tier).then(r => { if (live) setSearches(r || []); }).catch(() => {});
      const id = setInterval(() => getSearchFeed(tier).then(r => live && setSearches(r || [])).catch(() => {}), 45000);
      getRecentCrosses(12).then(d => { if (live) setCrosses(d || []); }).catch(() => {});
      return () => { live = false; clearInterval(id); };
    }
    getRecentCrosses(12).then(d => { if (live) setCrosses(d || []); }).catch(() => {});
    return () => { live = false; };
  }, [tier, isAdmin]);

  const newCount = countNewCrosses(crosses);
  const sh = searches.slice(0, isMobile ? 2 : 11);   // מובייל: 2 · דסקטופ: 11
  const cr = crosses.slice(0, 2);                     // דסקטופ: 2 הצלבות

  const secTitle = { color: L.gold, fontFamily: F.heading, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" };
  const seeAll = { marginInlineStart: "auto", textDecoration: "none", color: L.gold, fontFamily: F.heading, fontSize: 12, fontWeight: 700 };

  return (
    <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 18, padding: isMobile ? "12px 14px" : "16px 18px", direction: "rtl", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 9 : 14, flexWrap: "wrap" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#e0533a", boxShadow: "0 0 7px #e0533a" }} />
        <span style={{ color: L.ink, fontFamily: F.regal, fontSize: isMobile ? 15.5 : 18, fontWeight: 800 }}>מה מתרחש בבית המדרש</span>
        <span style={{ background: L.blueBg, color: L.blue, border: `1px solid ${L.blueLine}`, borderRadius: 999, padding: "1px 9px", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700 }}>חי</span>
      </div>

      <div className="bmo-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        {/* מה נחקר — אדמין: רשימה מלאה · ציבור: 🫧 «פעילות חיה» (סוגי פעילות בלבד, פרטיות) */}
        <div style={{ minWidth: 0 }}>
          {isAdmin ? (
            <>
              <div style={secTitle}>
                🔎 נחקר לאחרונה
                <Link to="/beit-midrash?tab=searches" style={seeAll}>כל החיפושים →</Link>
              </div>
              {sh.length === 0 ? (
                <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, marginTop: 8 }}>טוען…</div>
              ) : (
                <div style={{ display: "flex", flexWrap: isMobile ? "nowrap" : "wrap", overflow: isMobile ? "hidden" : "visible", gap: 7, marginTop: 9 }}>
                  {sh.map((r, i) => (
                    <Link key={i} to={safeSearchHref(r.term, r.value, isAdmin)} title={r.term}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: L.chip, border: `1px solid ${L.line}`, borderRadius: 999, padding: "4px 6px 4px 11px", whiteSpace: "nowrap", flex: "0 0 auto" }}>
                      <span style={{ color: L.ink, fontFamily: F.body, fontSize: 13.5, fontWeight: 600 }}>{maskTerm(r.term, isAdmin)}</span>
                      {r.value != null && <span style={{ background: L.badge, color: L.gold, fontFamily: "'Courier New',monospace", fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: "1px 8px" }}>{r.value}</span>}
                      {r.at && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 10.5, whiteSpace: "nowrap" }}>· {timeAgoHe(r.at)}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <ActivityPulse light title="🟢 מי חוקר עכשיו" />
          )}
        </div>

        {/* ✦ מילים חדשות שעלו — דסקטופ (הצלבות המנוע הוסרו זמנית לבקשת צוריאל) */}
        {!isMobile && (
          <div style={{ minWidth: 0 }}>
            <div style={secTitle}>
              ✦ מילים חדשות שעלו
              <Link to="/beit-midrash?tab=calc" style={seeAll}>עוד →</Link>
            </div>
            {newWords.length === 0 ? (
              <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12.5, marginTop: 8 }}>טוען…</div>
            ) : (
              <div style={{ display: "grid", gap: 7, marginTop: 9 }}>
                {newWords.slice(0, 6).map((w, i) => (
                  <Link key={i} to={`/number/${encodeURIComponent(w.phrase)}`} title={`${w.phrase} = ${w.ragil}`}
                    style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, background: L.chip, border: `1px solid ${L.line}`, borderRadius: 11, padding: "8px 11px" }}>
                    <span style={{ flex: 1, minWidth: 0, color: L.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.phrase}</span>
                    <span style={{ background: L.badge, color: L.gold, fontFamily: "'Courier New',monospace", fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: "1px 9px", flex: "0 0 auto" }}>{w.ragil}</span>
                    {w.created_at && <span style={{ color: L.sub, fontFamily: F.body, fontSize: 10.5, whiteSpace: "nowrap", flex: "0 0 auto" }}>{timeAgoHe(w.created_at)}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
