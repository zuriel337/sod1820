import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { getSearchStatsToday, getGalleryUpdates, getPostsFromSupabase } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";

// 📡 בונה חדשות-טיקר טריות. כל פריט = דבר שקרה היום/עכשיו, לחיץ, מוביל למקומו.
// מקורות: עדכוני-פוסטים · תמונות חדשות בזרם המציאות · מדדים יומיים. מתחלף כל יום, בלי חזרות.
function useLiveTicker() {
  const [msgs, setMsgs] = useState([]);
  useEffect(() => {
    let live = true;
    async function load() {
      // 🔒 בקשת צוריאל: הטיקר = *חדשות טריות יומיות* בלבד — דברים שקרו היום/עכשיו ומתחלפים
      //    כל יום, בלי חזרות. כל פריט לחיץ ומוביל למקומו (פוסט/זרם המציאות/דף המספר).
      //    מקורות: עדכוני-פוסטים טריים · תמונות חדשות בזרם המציאות · מדדים יומיים.
      const items = [];
      const cutoff = Date.now() - 24 * 3600 * 1000;   // "טרי" = 24 שעות אחרונות

      // 1) 📝 עדכוני-פוסטים טריים → לפוסט (getPostsFromSupabase מחזיר {posts,total} — לפרק!)
      try {
        const { posts } = await getPostsFromSupabase({ limit: 20 });
        for (const p of (posts || [])) {
          const ts = new Date(p.modified || p.date || 0).getTime();
          if (!ts || ts < cutoff) continue;
          const title = stripHtml(p.title || "").trim();
          if (title) items.push({ kind: "post", text: title.slice(0, 80), to: p.slug ? `/${encodeURIComponent(p.slug)}` : "/post" });
        }
      } catch { /* ignore */ }

      // 2) 🖼️ תמונות חדשות בזרם המציאות (היום) → לזרם המציאות
      try {
        const imgs = await getGalleryUpdates(20);
        for (const g of (imgs || [])) {
          const ts = new Date(g.stream_at || g.created_at || 0).getTime();
          if (!ts || ts < cutoff) continue;
          const nm = (g.name || "").trim();
          const label = nm ? nm.slice(0, 46) : (g.primary_value ? `מספר ${g.primary_value}` : "רמז חדש");
          items.push({ kind: "reality", text: `תמונה חדשה בזרם המציאות — ${label}`, to: "/reality" });
        }
      } catch { /* ignore */ }

      // 3) 📊 מדדים יומיים (מתחלפים מעצמם) → מרכז המחקר / דף המספר החם
      try {
        const s = await getSearchStatsToday();
        if (s?.month >= 50) items.push({ kind: "stat", text: `${Number(s.month).toLocaleString("he")} חיפושים בוצעו החודש באתר`, to: "/beit-midrash" });
        if (s?.searches >= 20) items.push({ kind: "stat", text: `${Number(s.searches).toLocaleString("he")} חיפושים בוצעו היום`, to: "/beit-midrash" });
        if (s?.topNumber) items.push({ kind: "stat", text: `המספר הכי נחקר היום — ${s.topNumber}`, to: `/number/${s.topNumber}` });
      } catch { /* ignore */ }

      // הסרת כפילויות (לא חוזרות על עצמן) + תקרה
      const seen = new Set(); const uniq = [];
      for (const it of items) { if (seen.has(it.text)) continue; seen.add(it.text); uniq.push(it); }
      if (live) setMsgs(uniq.slice(0, 12));
    }
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 120000);
    return () => { live = false; clearInterval(id); };
  }, []);
  return msgs;
}

// אייקון + תווית-מקור קצרה לפי סוג הפריט (בלי «ריבוע» כבד — רק אמוג'י)
const KIND_ICON = { post: "📝", reality: "🖼️", stat: "📊" };

// 📡 רצועה עליונה — טיקר עדכונים חי, לא-לחיץ, מתחלף הודעה-הודעה (חסין מובייל: בלי גלילה
// אופקית / max-content / mask — רק החלפה עם דהייה, כך שום דבר לא "נעלם" בפלאפון).
// קבוע בכל האתר דרך ה-Layout. תמה-מודע: כהה תמיד כדי להתאים ל-chrome החום-כהה.
export default function LiveActivityBar() {
  const isLight = useThemeMode() === "light";
  const { pathname } = useLocation();
  // ⛔ בלי שני טיקרים (בקשת צוריאל): בבית ובצ'אט יש טיקר ממותג — העליון מוסתר שם.
  const hasBrandTicker = pathname === "/" || pathname.startsWith("/community/chat");
  const barBg = isLight
    ? "linear-gradient(90deg, #241b0e, #2f2415, #241b0e)"
    : "linear-gradient(90deg, rgba(60,40,5,0.55), rgba(80,55,8,0.7), rgba(60,40,5,0.55))";

  const msgs = useLiveTicker();
  const [i, setI] = useState(0);
  const idx = msgs.length ? i % msgs.length : 0;
  const cur = (msgs[idx] && typeof msgs[idx] === "object") ? msgs[idx] : null;
  // קצב רגוע — כל פריט מוצג ~7 שניות ואז מתחלף.
  useEffect(() => {
    if (msgs.length < 2) return;
    const id = setTimeout(() => { if (!document.hidden) setI(x => x + 1); }, 7000);
    return () => clearTimeout(id);
  }, [i, msgs.length]);

  if (hasBrandTicker || !msgs.length || !cur) return null;

  return (
    <div style={{ direction: "rtl", position: "relative", overflowX: "hidden", maxWidth: "100%" }}>
      <style>{`
        @keyframes lt-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.45; transform:scale(.7); } }
        @keyframes lt-fade { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }

        /* הפס: התג «עכשיו באתר» מרחף בצד הימני (position:absolute). גוטר סימטרי בשני
           הצדדים (= רוחב התג) שומר על ההודעה ממורכזת באמת — קצרה «פשוט זזה» למרכז,
           ארוכה ממלאת את הרצועה שבין הגוטרים, ולעולם לא יושבת על הריבוע הימני. */
        .lt-bar { position:relative; display:flex; align-items:center; justify-content:center; pointer-events:none;
          overflow:hidden; max-width:100%; box-sizing:border-box; min-height:30px;
          background:${barBg}; border-bottom:1px solid rgba(212,175,55,0.28); padding:7px 104px; }
        .lt-badge { position:absolute; inset-inline-start:12px; top:50%; transform:translateY(-50%);
          display:inline-flex; align-items:center; gap:6px;
          color:#1a0e00; background:linear-gradient(135deg,#ffd86b,#d4a017);
          font-family:${F.heading}; font-weight:900; font-size:10.5px; letter-spacing:.3px;
          padding:3px 10px; border-radius:999px; white-space:nowrap; }
        .lt-badge i { width:6px; height:6px; border-radius:50%; background:#9c1322;
          box-shadow:0 0 6px #e0533a; animation: lt-dot 1.3s ease-in-out infinite; }
        .lt-msg { max-width:100%; margin:0 auto; text-align:center; color:#ffe6ad;
          font-family:${F.heading}; font-size:12.5px; font-weight:700;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          animation: lt-fade .5s ease; }
        /* 📱 טלפון: «עכשיו באתר» (הריבוע הימני) מוסתר לגמרי — ההודעה ממורכזת בכל הרוחב, בלי גניבת-שורה. */
        @media (max-width: 640px) {
          .lt-bar { padding:7px 16px; }
          .lt-badge { display:none; }
          .lt-msg { font-size:11px; }
        }
        @media (prefers-reduced-motion: reduce) { .lt-msg { animation:none; } .lt-badge i { animation:none; } }
      `}</style>

      <div className="lt-bar" aria-label="חדשות טריות באתר">
        <span className="lt-badge"><i aria-hidden />עכשיו באתר</span>
        {/* פריט טרי אחד, לחיץ → מוביל למקומו (פוסט/זרם המציאות/מרכז המחקר/דף המספר) */}
        <div className="lt-msg" key={idx} style={{ pointerEvents: "auto" }}>
          <Link to={cur.to || "/"} style={{ textDecoration: "none", color: "inherit" }}>
            <span aria-hidden style={{ marginInlineEnd: 6 }}>{KIND_ICON[cur.kind] || "✦"}</span>
            {cur.text}
            <b style={{ color: "#ffd86b", marginInlineStart: 6 }}>←</b>
          </Link>
        </div>
      </div>
    </div>
  );
}
