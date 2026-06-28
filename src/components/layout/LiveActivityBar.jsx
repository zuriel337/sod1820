import React, { useState, useEffect } from "react";
import { F, KEY_NUMBERS } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { getTopicCards, getPostsFromSupabase, getSearchStatsToday, getVerifiedCrossTitles, getVisitorsToday, getAxisEvents, getGalleryUpdates } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";

// 🧩 עובדות גימטריה — כל זוג אומת במנוע הרשמי (fn_ragil). ל"ידעת?".
const GEM_FACTS = [
  "נחש = משיח = 358", "אהבה = אחד = 13", "הטבע = אלהים = 86",
  "אריה = גבורה = 216", "יין = סוד = 70", "אדם = מה = 45",
];

// 🕯️ ברכת מועד (ערב/מוצאי שבת · ראש חודש) — null אם אין מועד מיוחד
function moedGreeting() {
  const d = new Date(), day = d.getDay(), h = d.getHours();
  if (day === 5 && h >= 12) return "🕯️ שבת שלום ומבורך";          // ערב שבת
  if (day === 6) return h < 20 ? "🕯️ שבת שלום" : "✨ שבוע טוב ומבורך"; // שבת / מוצ"ש
  try {
    const hd = new Intl.DateTimeFormat("he-u-ca-hebrew-nu-latn", { day: "numeric" }).format(d);
    if (hd === "1" || hd === "30") return "🌑 חודש טוב";          // ראש חודש
  } catch { /* ignore */ }
  return null;
}

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
      // 🌊 הרמז האחרון בזרם המציאות — מילה במילה, מופיע פעמיים (בקשת צוריאל)
      let hintMsg = null;
      try {
        const hints = await getGalleryUpdates(1);
        const hint = (hints || [])[0];
        if (hint?.name) {
          const hv = hint.primary_value != null ? ` · ${hint.primary_value}` : "";
          hintMsg = `🌊 רמז אחרון בזרם המציאות — ${hint.name}${hv}`;
        }
      } catch { /* ignore */ }
      if (hintMsg) out.push(hintMsg);
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
        const { words, total: t, topNumber } = await getSearchStatsToday();
        total = t;
        if (words > 0) out.push(`📖 ${words === 1 ? "מילה אחת נחקרה" : `${words} מילים נחקרו`} היום בבית המדרש`);
        if (topNumber != null) out.push(`🔥 המספר הכי מבוקש היום: ${topNumber}`);
      } catch { /* ignore */ }
      // — עֵרים (תמיד) —
      const nod = numberOfDay();
      if (nod) out.push(`🔢 המספר של היום: ${nod.n} · ${nod.meaning}`);
      try {
        const crosses = await getVerifiedCrossTitles(1);
        if (crosses[0]) out.push(`💎 הצלבה מאומתת: ${crosses[0]}`);
      } catch { /* ignore */ }
      // 🧩 ידעת? — שתי עובדות גימטריה (מסתובבות יומית כך שלא חוזרות תמיד)
      const dayIdx = Math.floor(Date.now() / 864e5);
      out.push(`🧩 ידעת? ${GEM_FACTS[dayIdx % GEM_FACTS.length]}`);
      out.push(`🧩 ידעת? ${GEM_FACTS[(dayIdx + 3) % GEM_FACTS.length]}`);
      // 🗓️ היום בהיסטוריה — אירוע מציר ההתגלות "לפני N שנים"
      try {
        const events = await getAxisEvents(40);
        const yrs = (events || []).filter(e => +(e.metadata?.year) > 1900);
        if (yrs.length) {
          const e = yrs[dayIdx % yrs.length];
          const n = new Date().getFullYear() - +e.metadata.year;
          const label = stripHtml(e.label || "").slice(0, 60);
          if (label) out.push(`🗓️ ${n <= 0 ? "השנה" : n === 1 ? "לפני שנה" : `לפני ${n} שנים`}: ${label}`);
        }
      } catch { /* ignore */ }
      if (total > 0 || convCount > 0) {
        const parts = [];
        if (total > 0) parts.push(`${total.toLocaleString("he-IL")} חיפושים`);
        if (convCount > 0) parts.push(`${convCount} התכנסויות`);
        out.push(`📊 במאגר: ${parts.join(" · ")}`);
      }
      const moed = moedGreeting();
      if (moed) out.push(moed);
      // 🌊 הרמז שוב — כך הוא מופיע פעמיים לאורך הסבב
      if (hintMsg) out.push(hintMsg);
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
        /* טלפון: «עכשיו באתר» מוסתר — ההודעה ממורכזת בכל הרוחב. בדסקטופ התג נשאר. */
        @media (max-width: 640px) {
          .lt-bar { padding:7px 16px; }
          .lt-badge { display:none; }
          .lt-msg { font-size:11px; }
        }
        @media (prefers-reduced-motion: reduce) { .lt-msg { animation:none; } .lt-badge i { animation:none; } }
      `}</style>

      <div className="lt-bar" aria-label="עדכונים אחרונים באתר">
        <span className="lt-badge"><i aria-hidden />עכשיו באתר</span>
        <div className="lt-msg" key={idx}>{msgs[idx]}</div>
      </div>
    </div>
  );
}
