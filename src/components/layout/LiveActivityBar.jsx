import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../../theme.js";
import { getLiveFeed, getLiveStats, getCrossTickerItems, dayOfYear, displayJoinedToday } from "../../lib/supabase.js";
import { subscribeJoins } from "../../lib/joinEvents.js";

// 🔴 פס פעילות חי — רצועה רצה (marquee) עם עדכונים אמיתיים בלבד:
// 🔍 חיפושים · 👥 משתמשים חדשים · 📚 פוסטים · 🌳 התכנסויות · 🧠 גילויי AI · 📊 סטטיסטיקה.
// כל המקורות נקראים מהגרף; אם אין נתונים — ברכות מתחלפות (fallback).
const FALLBACK = [
  { icon: "✦", text: "ברוכים הבאים לעולם החדש — בכל יום מתווספים עולמות, כלים ותגליות", to: "/start" },
  { icon: "🧮", text: "המחשבון ובית המדרש פתוחים לכולם, חינם", to: "/beit-midrash?tab=calc" },
  { icon: "🌳", text: "כל האתר הוא גרף ידע אחד — כל חיפוש חושף קשר חדש", to: "/map" },
];

// בונה פריטי סטטיסטיקה אמיתיים מתוך live_stats()
function statItems(s) {
  if (!s) return [];
  const out = [];
  if (s.searches_today > 0) out.push({ icon: "🔥", text: `${s.searches_today.toLocaleString()} חיפושי גימטריה היום`, to: "/beit-midrash?tab=calc" });
  out.push({ icon: "👥", text: `${displayJoinedToday(s.members_today)} חוקרים הצטרפו היום · סה״כ ${(s.members_total || 0).toLocaleString()}`, to: "/start" });
  if (s.convergences_week > 0) out.push({ icon: "🌳", text: `${s.convergences_week} התכנסויות נוספו השבוע`, to: "/map" });
  if (s.posts_total > 0) out.push({ icon: "📚", text: `${s.posts_total.toLocaleString()} פוסטים במאגר — אלפי קשרים ממתינים לחשיפה`, to: "/post" });
  if (s.insights_total > 0) out.push({ icon: "🧠", text: `${s.insights_total} גילויי AI בבית המדרש`, to: "/beit-midrash" });
  return out;
}

// פירוט גימטריה לפנינה → "ביטוי = ערך · ..." (תומך במבנה חדש וישן)
function pairsText(gp) {
  if (!gp) return "";
  const out = [];
  const add = p => { if (!p) return; const ph = p.phrase || p.word; const v = p.value ?? p.ragil ?? p.mistater ?? p.miluy; if (ph && v != null) out.push(`${ph} = ${v}`); };
  if (Array.isArray(gp)) gp.forEach(add);
  else { (gp.revealed || []).forEach(add); (gp.hidden || []).forEach(add); (gp.members || []).forEach(add); (gp.pairs || []).forEach(add); }
  return out.join(" · ");
}
const cleanT = s => String(s || "").replace(/<[^>]*>/g, "").trim();

// משלב את פריטי הסטטיסטיקה בתוך זרם העדכונים (אחד לכל ~5 פריטים)
function interleave(feed, stats) {
  if (!stats.length) return feed;
  const out = []; let si = 0;
  feed.forEach((item, i) => {
    out.push(item);
    if (i > 0 && (i + 1) % 5 === 0 && si < stats.length) out.push({ ...stats[si++], _stat: true });
  });
  while (si < stats.length) out.push({ ...stats[si++], _stat: true });
  return out;
}

export default function LiveActivityBar() {
  const [feed, setFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [crosses, setCrosses] = useState([]);

  // טעינה + רענון אוטומטי כל 45 שנ' → עדכונים חדשים נכנסים מעצמם
  useEffect(() => {
    let live = true;
    const load = () => {
      getLiveFeed().then(f => { if (live) setFeed(f); }).catch(() => {});
      getLiveStats().then(s => { if (live) setStats(s); }).catch(() => {});
      getCrossTickerItems().then(c => { if (live) setCrosses(c); }).catch(() => {});
    };
    load();
    const t = setInterval(load, 45000);
    return () => { live = false; clearInterval(t); };
  }, []);

  // הצטרפות חיה (realtime) → מקפיץ פריט לראש הרצועה מיד
  useEffect(() => subscribeJoins(() => {
    setFeed(prev => [{ k: "join", ts: new Date().toISOString(), icon: "👋", text: "חוקר חדש הצטרף לבית המדרש", to: "/start" }, ...prev].slice(0, 60));
  }), []);

  const dedupe = arr => {
    const seen = new Set();
    return arr.filter(it => { const t = it && it.text; if (!t || seen.has(t)) return false; seen.add(t); return true; });
  };
  const items = useMemo(() => {
    const merged = interleave(feed, statItems(stats));
    const base = merged.length ? merged : FALLBACK;
    if (!crosses.length) return dedupe(base);
    const di = dayOfYear() % crosses.length;
    const cx = crosses.map((c, i) => {
      const detail = pairsText(c.gematria_pairs);
      const isGate = i === di;
      const gp = c.gematria_pairs;
      const num = (gp && !Array.isArray(gp)) ? gp.number : null;
      return {
        k: `cx${c.id}`, _gate: true, icon: "💎",
        text: `${isGate ? "פנינת היום · " : ""}${cleanT(c.title)}${detail ? " — " + detail : ""}`,
        to: num ? `/number/${num}` : "/beit-midrash?tab=crosses",
      };
    });
    return dedupe([...cx, ...base]);
  }, [feed, stats, crosses]);

  // משך האנימציה פרופורציונלי למספר הפריטים → מהירות גלילה אחידה
  const duration = Math.max(28, items.length * 5);
  // משכפלים את הרשימה לגלילה אינסופית חלקה
  const loop = [...items, ...items];

  return (
    <div className="lab-wrap" style={{ direction: "rtl", background: "rgba(10,7,2,0.92)", borderBottom: `1px solid ${C.border}`, overflow: "hidden", position: "relative" }}>
      <style>{`
        @keyframes lab-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes lab-dot { 0%,100% { opacity:.4; transform:scale(.8); } 50% { opacity:1; transform:scale(1.25); } }
        .lab-track { display: inline-flex; align-items: center; white-space: nowrap; will-change: transform; animation: lab-scroll linear infinite; }
        .lab-wrap:hover .lab-track { animation-play-state: paused; }
        .lab-item { display: inline-flex; align-items: center; gap: 7px; text-decoration: none; padding: 0 4px; }
        .lab-item:hover .lab-text { color: ${C.goldBright}; }
        .lab-sep { color: ${C.borderGold}; opacity: .5; padding: 0 14px; font-size: 11px; }
        @media (max-width: 640px) { .lab-badge-text { display:none; } }
      `}</style>

      {/* תווית "חי" קבועה (לא נגללת) */}
      <div className="lab-badge" style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, zIndex: 2, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", background: "linear-gradient(90deg, rgba(10,7,2,0) 0%, rgba(10,7,2,0.95) 28%)" }}>
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5a5a", boxShadow: "0 0 8px #ff5a5a", animation: "lab-dot 1.4s ease-in-out infinite" }} />
        <span className="lab-badge-text" style={{ color: "#ff7a7a", fontFamily: F.heading, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>חי</span>
      </div>

      <div style={{ padding: "7px 0" }}>
        <div className="lab-track" style={{ animationDuration: `${duration}s` }}>
          {loop.map((it, i) => (
            <React.Fragment key={i}>
              <Link to={it.to || "/"} className="lab-item">
                <span style={{ fontSize: 14 }}>{it.icon}</span>
                <span className="lab-text" style={{ color: (it._stat || it._gate) ? "#ffcf4d" : C.goldLight, fontFamily: F.royal, fontSize: 14.5, fontWeight: (it._stat || it._gate) ? 700 : 500, transition: "color .2s" }}>{it.text}</span>
              </Link>
              <span className="lab-sep" aria-hidden>✦</span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
