import React, { useState, useEffect } from "react";
import { F, KEY_NUMBERS } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { getTopicCards, getPostsFromSupabase, getSearchStatsToday, getLatestInsightTitle, getVisitorsToday } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";

// האם תאריך הוא "היום" (לפי שעון מקומי)
function isToday(d) {
  if (!d) return false;
  const x = new Date(d), n = new Date();
  return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate();
}

// 🗓 המספר של היום — אותה לוגיקה דטרמיניסטית כמו רכיב NumberOfDay (חוק העץ האחד).
function numberOfDay() {
  const keys = Object.keys(KEY_NUMBERS).map(Number).sort((a, b) => a - b);
  if (!keys.length) return null;
  const n = keys[Math.floor(Date.now() / 864e5) % keys.length];
  return { n, meaning: KEY_NUMBERS[n] };
}

// 🕯️ ברכה לפי שעת היום (טהור, בלי נתונים)
function timeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "🌅 בוקר טוב — יום חדש בדרך לגאולה";
  if (h >= 12 && h < 17) return "☀️ צהריים טובים — האור מאיר את המספרים";
  if (h >= 17 && h < 21) return "🌇 ערב טוב — שעה טובה לחקור רמז";
  return "🌙 לילה טוב — האור עולה מתוך החושך";
}

// 📡 בונה הודעות טיקר חי. קודם ה"טריים" (התכנסות/פוסט/מילים היום), ואז העֵרים שתמיד
// מלאים (המספר של היום · רמז אחרון · גודל המאגר · ברכה) — כך הפס לעולם לא דליל.
// "מבקרים היום" מתווסף רק אם ≥ 2500. מתרענן כל דקה (רק כשהטאב גלוי).
function useLiveTicker() {
  const [msgs, setMsgs] = useState([]);
  useEffect(() => {
    let live = true;
    async function load() {
      const out = [];
      const cards = await getTopicCards({ approvedOnly: true }).catch(() => []);
      const convCount = (cards || []).length;
      // — טריים —
      const latest = (cards || []).slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];
      if (latest) out.push(`✨ ${isToday(latest.created_at) ? "התכנסות חדשה עלתה היום" : "התכנסות אחרונה"} — «${latest.title}»`);
      try {
        const { posts } = await getPostsFromSupabase({ limit: 3, orderBy: "modified" });
        const p = (posts || [])[0];
        if (p) {
          const t = stripHtml(p.title || "").slice(0, 70);
          out.push(`📰 ${(isToday(p.date) || isToday(p.modified)) ? "פוסט חדש עלה היום" : "פוסט אחרון"} — «${t}»`);
        }
      } catch { /* ignore */ }
      let total = 0;
      try {
        const { words, total: t } = await getSearchStatsToday();
        total = t;
        if (words > 0) out.push(`📖 ${words === 1 ? "מילה אחת נחקרה" : `${words} מילים נחקרו`} היום בבית המדרש`);
      } catch { /* ignore */ }
      // — עֵרים (תמיד) —
      const nod = numberOfDay();
      if (nod) out.push(`🔢 המספר של היום: ${nod.n} · ${nod.meaning}`);
      try {
        const ins = await getLatestInsightTitle();
        if (ins) out.push(`💎 רמז אחרון: ${ins}`);
      } catch { /* ignore */ }
      if (total > 0 || convCount > 0) {
        const parts = [];
        if (total > 0) parts.push(`${total.toLocaleString("he-IL")} חיפושים`);
        if (convCount > 0) parts.push(`${convCount} התכנסויות`);
        out.push(`📊 במאגר: ${parts.join(" · ")}`);
      }
      out.push(timeGreeting());
      // — מבקרים היום: רק אם ≥ 2500 —
      try {
        const v = await getVisitorsToday();
        if (v >= 2500) out.push(`👣 ${v.toLocaleString("he-IL")} כניסות היום`);
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

        .lt-bar { display:flex; align-items:center; justify-content:center; gap:9px; pointer-events:none;
          overflow:hidden; max-width:100%; box-sizing:border-box;
          background:${barBg}; border-bottom:1px solid rgba(212,175,55,0.28); padding:7px 12px; }
        .lt-badge { flex:none; display:inline-flex; align-items:center; gap:6px;
          color:#1a0e00; background:linear-gradient(135deg,#ffd86b,#d4a017);
          font-family:${F.heading}; font-weight:900; font-size:10.5px; letter-spacing:.3px;
          padding:3px 10px; border-radius:999px; white-space:nowrap; }
        .lt-badge i { width:6px; height:6px; border-radius:50%; background:#9c1322;
          box-shadow:0 0 6px #e0533a; animation: lt-dot 1.3s ease-in-out infinite; }
        .lt-msg { flex:0 1 auto; min-width:0; text-align:center; color:#ffe6ad;
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
