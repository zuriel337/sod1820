import React, { useState, useEffect } from "react";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { getTopicCards, getPostsFromSupabase, getSearchStatsToday } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";

// האם תאריך הוא "היום" (לפי שעון מקומי)
function isToday(d) {
  if (!d) return false;
  const x = new Date(d), n = new Date();
  return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate();
}

// 📡 בונה הודעות טיקר חי מנתונים אמיתיים: התכנסות אחרונה · פוסט אחרון · חיפושי היום + מילים שנחקרו.
// מתרענן כל דקה (רק כשהטאב גלוי).
function useLiveTicker() {
  const [msgs, setMsgs] = useState([]);
  useEffect(() => {
    let live = true;
    async function load() {
      const out = [];
      try {
        const cards = await getTopicCards({ approvedOnly: true }).catch(() => []);
        const sorted = (cards || []).slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
        const latest = sorted[0];
        if (latest) out.push(`✨ ${isToday(latest.created_at) ? "התכנסות חדשה עלתה היום" : "התכנסות אחרונה"} — «${latest.title}»`);
      } catch { /* ignore */ }
      try {
        const { posts } = await getPostsFromSupabase({ limit: 3, orderBy: "modified" });
        const p = (posts || [])[0];
        if (p) {
          const t = stripHtml(p.title || "").slice(0, 70);
          out.push(`📰 ${(isToday(p.date) || isToday(p.modified)) ? "פוסט חדש עלה היום" : "פוסט אחרון"} — «${t}»`);
        }
      } catch { /* ignore */ }
      try {
        const { searches, words } = await getSearchStatsToday();
        if (searches > 0) out.push(`🔎 היום נעשו ${searches === 1 ? "חיפוש אחד" : `${searches} חיפושים`} במנוע`);
        if (words > 0) out.push(`📖 ${words === 1 ? "מילה אחת נחקרה" : `${words} מילים נחקרו`} היום בבית המדרש`);
      } catch { /* ignore */ }
      if (live) setMsgs(out);
    }
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => { live = false; clearInterval(id); };
  }, []);
  return msgs;
}

// 📡 רצועה עליונה — טיקר עדכונים חי, לא-לחיץ, מתחלף הודעה-הודעה (חסין מובייל: בלי גלילה
// אופקית / max-content / mask — רק החלפה עם דהייה, כך שום דבר לא "נעלם" בפלאפון).
// קבוע בכל האתר דרך ה-Layout. תמה-מודע: כהה תמיד כדי להתאים ל-chrome החום-כהה.
export default function LiveActivityBar() {
  const isLight = useThemeMode() === "light";
  const barBg = isLight
    ? "linear-gradient(90deg, #241b0e, #2f2415, #241b0e)"
    : "linear-gradient(90deg, rgba(60,40,5,0.55), rgba(80,55,8,0.7), rgba(60,40,5,0.55))";

  const msgs = useLiveTicker();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (msgs.length < 2) return;
    const id = setInterval(() => { if (!document.hidden) setI(x => x + 1); }, 4200);
    return () => clearInterval(id);
  }, [msgs.length]);

  if (!msgs.length) return null;
  const idx = i % msgs.length;

  return (
    <div style={{ direction: "rtl", position: "relative", overflowX: "hidden", maxWidth: "100%" }}>
      <style>{`
        @keyframes lt-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.45; transform:scale(.7); } }
        @keyframes lt-fade { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }

        .lt-bar { display:flex; align-items:center; gap:9px; pointer-events:none;
          overflow:hidden; max-width:100%; box-sizing:border-box;
          background:${barBg}; border-bottom:1px solid rgba(212,175,55,0.28); padding:7px 12px; }
        .lt-badge { flex:none; display:inline-flex; align-items:center; gap:6px;
          color:#1a0e00; background:linear-gradient(135deg,#ffd86b,#d4a017);
          font-family:${F.heading}; font-weight:900; font-size:10.5px; letter-spacing:.3px;
          padding:3px 10px; border-radius:999px; white-space:nowrap; }
        .lt-badge i { width:6px; height:6px; border-radius:50%; background:#9c1322;
          box-shadow:0 0 6px #e0533a; animation: lt-dot 1.3s ease-in-out infinite; }
        .lt-msg { flex:1 1 0%; min-width:0; color:#ffe6ad;
          font-family:${F.heading}; font-size:12.5px; font-weight:700;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          animation: lt-fade .5s ease; }
        @media (max-width: 640px) { .lt-msg { font-size:11px; } .lt-badge { font-size:10px; } }
        @media (prefers-reduced-motion: reduce) { .lt-msg { animation:none; } .lt-badge i { animation:none; } }
      `}</style>

      <div className="lt-bar" aria-label="עדכונים אחרונים באתר">
        <span className="lt-badge"><i aria-hidden />עכשיו באתר</span>
        <div className="lt-msg" key={idx}>{msgs[idx]}</div>
      </div>
    </div>
  );
}
