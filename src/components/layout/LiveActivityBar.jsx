import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { getPostsFromSupabase } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";
import WhatsNewBadge from "../WhatsNewBadge.jsx";

// 📡 טיקר עדכוני-האתר. כל פריט = פוסט (עדכון/חדשות שהאתר פרסם), לחיץ, מוביל לפוסט.
// 🔒 בקשת צוריאל (22.7.2026): הטיקר העליון מציג *רק את עדכוני-האתר* — פוסטים בלבד.
//    לא פורום, לא זרם-מציאות, לא מדדי-חיפוש. מקור יחיד: getPostsFromSupabase (העדכונים האחרונים).
function useLiveTicker() {
  const [msgs, setMsgs] = useState([]);
  useEffect(() => {
    let live = true;
    async function load() {
      const items = [];
      // 📝 עדכוני-האתר האחרונים → לפוסט (getPostsFromSupabase מחזיר {posts,total} — לפרק!)
      //    ממוין modified↓ במקור, כך שהעדכונים החדשים למעלה. בלי סף-זמן קשיח כדי שהטיקר
      //    לא יתרוקן בימים בלי פרסום — «העדכונים האחרונים של האתר», לא «רק היום».
      try {
        const { posts } = await getPostsFromSupabase({ limit: 14 });
        for (const p of (posts || [])) {
          const title = stripHtml(p.title || "").trim();
          if (!title) continue;
          items.push({ kind: "post", text: title.slice(0, 80), to: p.slug ? `/${encodeURIComponent(p.slug)}` : "/post" });
        }
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

// אייקון לפי סוג הפריט — הטיקר כולו פוסטים (עדכוני-אתר)
const KIND_ICON = { post: "📝" };

// 📡 רצועה עליונה — טיקר עדכונים חי, לא-לחיץ, מתחלף הודעה-הודעה (חסין מובייל: בלי גלילה
// אופקית / max-content / mask — רק החלפה עם דהייה, כך שום דבר לא "נעלם" בפלאפון).
// קבוע בכל האתר דרך ה-Layout. תמה-מודע: כהה תמיד כדי להתאים ל-chrome החום-כהה.
export default function LiveActivityBar() {
  const isLight = useThemeMode() === "light";
  // 📡 השורה העליונה מוצגת בכל האתר. תמה-מודע (city_background_dual_theme_law §3):
  //    בבהיר — רצועת קרם/זהב-עדין + טקסט כהה קריא; בכהה — הגרסה החום-כהה הקיימת.
  const barBg = isLight
    ? "linear-gradient(90deg, #f0e6cd, #e9dcbb, #f0e6cd)"
    : "linear-gradient(90deg, rgba(60,40,5,0.55), rgba(80,55,8,0.7), rgba(60,40,5,0.55))";
  // 🔒 city_background_dual_theme_law §3: במצב בהיר האותיות על הרצועה חייבות להיות
  //    *כהות וקריאות* (ניגודיות ≥7:1) — לא זהב-בהיר שנבלע ברקע-העיר. חום-כהה כמעט-שחור.
  const barInk = isLight ? "#33260a" : "#ffe6ad";       // טקסט ההודעה — כהה מאוד בבהיר
  const barAccent = isLight ? "#6d4e0b" : "#ffd86b";    // חץ/אקסנט — זהב-כהה בבהיר
  const barBorder = isLight ? "rgba(90,66,12,0.45)" : "rgba(212,175,55,0.28)";

  const msgs = useLiveTicker();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);   // ⏸ עצירה בריחוף-עכבר (דסקטופ) — כדי לקרוא פריט בלי שיתחלף
  // אינדקס בטוח גם לערכים שליליים (דפדוף אחורה) — modulo מתמטי חיובי.
  const idx = msgs.length ? ((i % msgs.length) + msgs.length) % msgs.length : 0;
  const cur = (msgs[idx] && typeof msgs[idx] === "object") ? msgs[idx] : null;
  const go = d => setI(x => x + d);   // ‹ › דפדוף ידני
  // קצב רגוע — כל פריט מוצג ~7 שניות ואז מתחלף. עוצר בריחוף (paused) ובטאב מוסתר.
  useEffect(() => {
    if (msgs.length < 2 || paused) return;
    const id = setTimeout(() => { if (!document.hidden) setI(x => x + 1); }, 7000);
    return () => clearTimeout(id);
  }, [i, msgs.length, paused]);

  // 🚫 CLS: לא מחזירים null לפני שהנתונים נטענים — זה גורם לרצועה «לקפוץ» פנימה בראש הדף
  //    ולדחוף את כל התוכן מטה (Cumulative Layout Shift). במקום — הרצועה נוכחת תמיד בגובה
  //    קבוע, וההודעה מופיעה בתוכה כשנטענת. הרצועה כמעט תמיד מתמלאת (מדד חיפושים יומי).

  return (
    <div style={{ direction: "rtl", position: "relative", overflowX: "hidden", maxWidth: "100%" }}>
      <style>{`
        @keyframes lt-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.45; transform:scale(.7); } }
        @keyframes lt-fade { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }

        /* הפס: התג «עכשיו באתר» מרחף בצד הימני (position:absolute). גוטר סימטרי בשני
           הצדדים (= רוחב התג) שומר על ההודעה ממורכזת באמת — קצרה «פשוט זזה» למרכז,
           ארוכה ממלאת את הרצועה שבין הגוטרים, ולעולם לא יושבת על הריבוע הימני. */
        /* הרצועה = פס-רקע ברוחב מלא; אבל התוכן מיושר בתוך מיכל 1800 זהה לתפריט —
           כך «עכשיו באתר» מקביל לפינת-הכתר ו«מה חדש» מקביל לסוף-התפריט (מרחק שווה משני הצדדים). */
        .lt-bar { position:relative; display:flex; align-items:center; justify-content:center; pointer-events:none;
          overflow:hidden; max-width:100%; box-sizing:border-box; min-height:30px;
          background:${barBg}; border-bottom:1px solid ${barBorder}; padding:7px 18px; }
        .lt-inner { position:relative; width:100%; max-width:1800px; margin:0 auto; box-sizing:border-box;
          padding:0 120px; display:flex; align-items:center; justify-content:center; min-height:30px; }
        .lt-badge { position:absolute; inset-inline-start:6px; top:50%; transform:translateY(-50%);
          display:inline-flex; align-items:center; gap:6px;
          color:#241500; background:linear-gradient(135deg,#dcc079,#b8912f);
          font-family:${F.heading}; font-weight:900; font-size:11.5px; letter-spacing:.3px;
          padding:3px 10px; border-radius:999px; white-space:nowrap; }
        .lt-badge i { width:6px; height:6px; border-radius:50%; background:#9c1322;
          box-shadow:0 0 6px #e0533a; animation: lt-dot 1.3s ease-in-out infinite; }
        /* מרכז הטיקר — ‹ הודעה › בשורה, ניתן-ללחיצה (pointer-events:auto בתוך פס שהוא none) */
        .lt-center { display:flex; align-items:center; justify-content:center; gap:6px;
          max-width:100%; min-width:0; pointer-events:auto; }
        .lt-msg { min-width:0; text-align:center; color:${barInk};
          font-family:${F.heading}; font-size:12.5px; font-weight:700;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          animation: lt-fade .5s ease; }
        /* חצי-דפדוף ‹ › — עדינים, לא גונבים תשומת-לב; מתבהרים בריחוף */
        .lt-nav { flex:none; background:none; border:none; cursor:pointer; line-height:1;
          font-size:17px; font-weight:900; padding:2px 4px; border-radius:6px; opacity:0.55;
          transition:opacity .15s, background .15s; }
        .lt-nav:hover { opacity:1; background:rgba(212,175,55,0.15); }
        /* 📱 טלפון: «עכשיו באתר» (הריבוע הימני) מוסתר לגמרי — ההודעה ממורכזת בכל הרוחב, בלי גניבת-שורה. */
        /* 🌳 «מה חדש» — מיושר לקצה-השמאלי של המיכל (= סוף התפריט), מרוחק מציר-ההתגלות שיושב במרווח שמשמאל */
        .lt-wn { position:absolute; inset-inline-end:6px; top:50%; transform:translateY(-50%); pointer-events:auto; z-index:6; }
        @media (max-width: 640px) {
          .lt-inner { padding:0 16px 0 78px; }
          .lt-badge { display:none; }
          .lt-msg { font-size:11px; }
          .lt-wn { inset-inline-end:8px; }
        }
        @media (prefers-reduced-motion: reduce) { .lt-msg { animation:none; } .lt-badge i { animation:none; } }
      `}</style>

      <div className="lt-bar" aria-label="חדשות טריות באתר">
        <div className="lt-inner">
          <span className="lt-badge"><i aria-hidden />עכשיו באתר</span>
          <span className="lt-wn"><WhatsNewBadge /></span>
          {/* המרכז: ‹ פריט › — דפדוף ידני + עצירה בריחוף. פריט טרי אחד, לחיץ → מוביל למקומו.
              עד שנטען — משאירים את הגובה שמור (בלי טקסט) כדי שלא תהיה קפיצת-פריסה (CLS). */}
          <div className="lt-center" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            {msgs.length > 1 && (
              <button className="lt-nav" onClick={() => go(-1)} aria-label="העדכון הקודם" style={{ color: barAccent }}>‹</button>
            )}
            {cur && (
              <div className="lt-msg" key={idx}>
                <Link to={cur.to || "/"} style={{ textDecoration: "none", color: "inherit" }}>
                  <span aria-hidden style={{ marginInlineEnd: 6 }}>{KIND_ICON[cur.kind] || "✦"}</span>
                  {cur.text}
                  <b style={{ color: barAccent, marginInlineStart: 6 }}>←</b>
                </Link>
              </div>
            )}
            {msgs.length > 1 && (
              <button className="lt-nav" onClick={() => go(1)} aria-label="העדכון הבא" style={{ color: barAccent }}>›</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
