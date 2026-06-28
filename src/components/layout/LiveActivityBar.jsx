import React, { useState, useEffect } from "react";
import { F, KEY_NUMBERS } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { getTopicCards, getSearchStatsToday, getVisitorsToday, getAxisEvents, getGalleryUpdates } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";

// 🧩 עובדות גימטריה — כל זוג אומת במנוע הרשמי (fn_ragil). ל"ידעת?".
const GEM_FACTS = [
  "נחש = משיח = 358", "אהבה = אחד = 13", "הטבע = אלהים = 86",
  "אריה = גבורה = 216", "יין = סוד = 70", "אדם = מה = 45",
];

// 📜 פסוקי גאולה ונחמה — רוטציה שצוריאל שולט בה (לא אוטומטי). 3 מתחלפים ביום
// לפי dayIdx. לעריכה: הוסף/הסר שורות כאן. מוצגים עם גלישה (2 שורות) ולא נחתכים.
const VERSES = [
  "וְעַתָּה כֹּה אָמַר ה' בֹּרַאֲךָ יַעֲקֹב וְיֹצֶרְךָ יִשְׂרָאֵל — אַל תִּירָא כִּי גְאַלְתִּיךָ, קָרָאתִי בְשִׁמְךָ לִי אָתָּה (ישעיהו מ״ג, א׳)",
  "אַל תִּירָא כִּי עִמְּךָ אָנִי, אַל תִּשְׁתָּע כִּי אֲנִי אֱלֹהֶיךָ (ישעיהו מ״א, י׳)",
  "כִּי תַעֲבֹר בַּמַּיִם אִתְּךָ אָנִי וּבַנְּהָרוֹת לֹא יִשְׁטְפוּךָ (ישעיהו מ״ג, ב׳)",
  "כִּי הֶהָרִים יָמוּשׁוּ וְהַגְּבָעוֹת תְּמוּטֶנָה — וְחַסְדִּי מֵאִתֵּךְ לֹא יָמוּשׁ (ישעיהו נ״ד, י׳)",
  "קוּמִי אוֹרִי כִּי בָא אוֹרֵךְ וּכְבוֹד ה' עָלַיִךְ זָרָח (ישעיהו ס׳, א׳)",
  "נַחֲמוּ נַחֲמוּ עַמִּי יֹאמַר אֱלֹהֵיכֶם (ישעיהו מ׳, א׳)",
  "הֲתִשְׁכַּח אִשָּׁה עוּלָהּ... גַּם אֵלֶּה תִשְׁכַּחְנָה וְאָנֹכִי לֹא אֶשְׁכָּחֵךְ (ישעיהו מ״ט, ט״ו)",
  "מַחְשְׁבוֹת שָׁלוֹם וְלֹא לְרָעָה, לָתֵת לָכֶם אַחֲרִית וְתִקְוָה (ירמיהו כ״ט, י״א)",
  "וְשָׁבוּ בָנִים לִגְבוּלָם (ירמיהו ל״א, ט״ז)",
  "ה' אֱלֹהַיִךְ בְּקִרְבֵּךְ גִּבּוֹר יוֹשִׁיעַ, יָשִׂישׂ עָלַיִךְ בְּשִׂמְחָה (צפניה ג׳, י״ז)",
  "הִנֵּה לֹא יָנוּם וְלֹא יִישָׁן שׁוֹמֵר יִשְׂרָאֵל (תהילים קכ״א, ד׳)",
  "וְשָׁב ה' אֱלֹהֶיךָ אֶת שְׁבוּתְךָ וְרִחֲמֶךָ, וְשָׁב וְקִבֶּצְךָ מִכָּל הָעַמִּים (דברים ל׳, ג׳)",
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
      const dayIdx = Math.floor(Date.now() / 864e5);
      const verse = k => "📜 " + VERSES[(dayIdx + k) % VERSES.length];
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
      // 📜 4 פסוקי גאולה ברצף — בלי עצירה ביניהם (בקשת צוריאל). מתחלפים יומית.
      for (let k = 0; k < 4; k++) out.push(verse(k));
      // ⛔ התכנסויות + פוסטים — הוסרו מההזרקה האוטומטית (בקשת צוריאל: יעלו לטיקר רק
      // כשהוא מחליט, לא אוטומטית). עדיין מושכים ספירת התכנסויות לשורת «📊 במאגר».
      const cards = await getTopicCards({ approvedOnly: true }).catch(() => []);
      const convCount = (cards || []).length;
      try {
        const { words, topNumber } = await getSearchStatsToday();
        if (words > 0) out.push(`📖 ${words === 1 ? "מילה אחת נחקרה" : `${words} מילים נחקרו`} היום בבית המדרש`);
        if (topNumber != null) out.push(`🔥 המספר הכי מבוקש היום: ${topNumber}`);
      } catch { /* ignore */ }
      // — עֵרים (תמיד) —
      const nod = numberOfDay();
      if (nod) out.push(`🔢 המספר של היום: ${nod.n} · ${nod.meaning}`);
      // ⛔ הצלבות (כולל של חברים) הוסרו מהטיקר לגמרי (בקשת צוריאל).
      // 🧩 ידעת? — שתי עובדות גימטריה (מסתובבות יומית כך שלא חוזרות תמיד)
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
      // ⛔ «כמה חיפושים יש באתר» (total כל-הזמן) הוסר (בקשת צוריאל — רק כמה חיפשו היום,
      // שמוצג ב«📖 … נחקרו היום»). נשארת רק ספירת ההתכנסויות במאגר.
      if (convCount > 0) out.push(`📊 ${convCount} התכנסויות במאגר`);
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
  const idx = msgs.length ? i % msgs.length : 0;
  const cur = msgs[idx] || "";
  const isVerse = cur.startsWith("📜");
  // קצב רגוע (בקשת צוריאל). פסוק = שורה ארוכה → זמן קריאה ארוך יותר לפני המעבר הבא.
  useEffect(() => {
    if (msgs.length < 2) return;
    const id = setTimeout(() => { if (!document.hidden) setI(x => x + 1); }, isVerse ? 12000 : 7500);
    return () => clearTimeout(id);
  }, [i, msgs.length, isVerse]);

  if (!msgs.length) return null;

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
        /* 📜 פסוק — ארוך, לכן נגלל ל-2 שורות (לא נחתך), טון פרגמנט עדין. */
        .lt-msg.verse { white-space:normal; text-overflow:clip; line-height:1.35; font-size:12px;
          max-width:94%; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; }
        /* טלפון: «עכשיו באתר» מוסתר — ההודעה ממורכזת בכל הרוחב. בדסקטופ התג נשאר. */
        @media (max-width: 640px) {
          .lt-bar { padding:7px 16px; }
          .lt-badge { display:none; }
          .lt-msg { font-size:11px; }
          .lt-msg.verse { font-size:10.5px; -webkit-line-clamp:3; }
        }
        @media (prefers-reduced-motion: reduce) { .lt-msg { animation:none; } .lt-badge i { animation:none; } }
      `}</style>

      <div className="lt-bar" aria-label="עדכונים אחרונים באתר">
        <span className="lt-badge"><i aria-hidden />עכשיו באתר</span>
        <div className={"lt-msg" + (isVerse ? " verse" : "")} key={idx}>{cur}</div>
      </div>
    </div>
  );
}
