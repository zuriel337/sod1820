import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F, KEY_NUMBERS } from "../../theme.js";
import { BRANDS } from "../BrandTicker.jsx";
import { useThemeMode } from "../../lib/themeMode.js";
import { getRecentCrosses, getSearchStatsToday, getVisitorsToday, getAxisEvents, getGalleryUpdates, getTickerMessages, getChannelUpdates } from "../../lib/supabase.js";
import { stripHtml } from "../../lib/format.js";

// 🧩 עובדות גימטריה — כל זוג אומת במנוע הרשמי (fn_ragil). ל"ידעת?".
// כל זוג אומת במנוע (fn_ragil) — סוד=יין=70 · לב=כבוד=32 · אני=אין=61 · אהבה=אחד=13 …
const GEM_FACTS = [
  "נחש = משיח = 358", "אהבה = אחד = 13", "הטבע = אלהים = 86",
  "אריה = גבורה = 216", "סוד = יין = 70", "אדם = מה = 45",
  "לב = כבוד = 32", "אני = אין = 61",
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
  "כִּי מָלְאָה הָאָרֶץ דֵּעָה אֶת ה' כַּמַּיִם לַיָּם מְכַסִּים (ישעיהו י״א, ט׳)",
  "וְגָר זְאֵב עִם כֶּבֶשׂ וְנָמֵר עִם גְּדִי יִרְבָּץ (ישעיהו י״א, ו׳)",
  "וְכִתְּתוּ חַרְבוֹתָם לְאִתִּים וַחֲנִיתוֹתֵיהֶם לְמַזְמֵרוֹת (ישעיהו ב׳, ד׳)",
  "וּפְדוּיֵי ה' יְשֻׁבוּן וּבָאוּ צִיּוֹן בְּרִנָּה וְשִׂמְחַת עוֹלָם עַל רֹאשָׁם (ישעיהו ל״ה, י׳)",
  "וְהָיָה ה' לְמֶלֶךְ עַל כָּל הָאָרֶץ, בַּיּוֹם הַהוּא יִהְיֶה ה' אֶחָד וּשְׁמוֹ אֶחָד (זכריה י״ד, ט׳)",
  "וְנָתַתִּי לָכֶם לֵב חָדָשׁ וְרוּחַ חֲדָשָׁה אֶתֵּן בְּקִרְבְּכֶם (יחזקאל ל״ו, כ״ו)",
  "וְלָקַחְתִּי אֶתְכֶם מִן הַגּוֹיִם וְקִבַּצְתִּי אֶתְכֶם מִכָּל הָאֲרָצוֹת (יחזקאל ל״ו, כ״ד)",
  "עוֹד יֵשְׁבוּ זְקֵנִים וּזְקֵנוֹת בִּרְחֹבוֹת יְרוּשָׁלָ͏ִם (זכריה ח׳, ד׳)",
  "וּרְחֹבוֹת הָעִיר יִמָּלְאוּ יְלָדִים וִילָדוֹת מְשַׂחֲקִים בִּרְחֹבֹתֶיהָ (זכריה ח׳, ה׳)",
  "הַזֹּרְעִים בְּדִמְעָה בְּרִנָּה יִקְצֹרוּ (תהילים קכ״ו, ה׳)",
  "בְּשׁוּב ה' אֶת שִׁיבַת צִיּוֹן הָיִינוּ כְּחֹלְמִים (תהילים קכ״ו, א׳)",
  "כִּי לֹא יִטֹּשׁ ה' עַמּוֹ וְנַחֲלָתוֹ לֹא יַעֲזֹב (תהילים צ״ד, י״ד)",
  "טוֹב ה' לַכֹּל וְרַחֲמָיו עַל כָּל מַעֲשָׂיו (תהילים קמ״ה, ט׳)",
  "קָרוֹב ה' לְכָל קֹרְאָיו לְכֹל אֲשֶׁר יִקְרָאֻהוּ בֶאֱמֶת (תהילים קמ״ה, י״ח)",
  "כִּי מִצִּיּוֹן תֵּצֵא תוֹרָה וּדְבַר ה' מִירוּשָׁלָ͏ִם (ישעיהו ב׳, ג׳)",
  "וְהָיָה בְּאַחֲרִית הַיָּמִים נָכוֹן יִהְיֶה הַר בֵּית ה' בְּרֹאשׁ הֶהָרִים (ישעיהו ב׳, ב׳)",
  "מִי אֵל כָּמוֹךָ נֹשֵׂא עָוֺן וְעֹבֵר עַל פֶּשַׁע (מיכה ז׳, י״ח)",
  "וְלֹא יִלְמְדוּ עוֹד מִלְחָמָה (ישעיהו ב׳, ד׳)",
  "וְרָאוּ כָל בְּשָׂר יַחְדָּו כִּי פִּי ה' דִּבֵּר (ישעיהו מ׳, ה׳)",
  "וּמָחָה ה' אֱלֹהִים דִּמְעָה מֵעַל כָּל פָּנִים (ישעיהו כ״ה, ח׳)",
];

// 📜 מכסת-פסוקים יומית לכל מבקר — כדי שהנבואה לא תחזור «מיליון פעם»: כל אדם רואה עד
// VERSE_DAILY_CAP פסוקים ביום (אם יסתכל למעלה). נשמר ב-localStorage לפי תאריך מקומי;
// אחרי המכסה — לא מזריקים פסוקים למבקר הזה עד למחר. הפסוק עצמו מתחלף יומית מתוך מאגר גדול.
const VERSE_DAILY_CAP = 2;
function verseDayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function versesSeenToday() {
  try { const o = JSON.parse(localStorage.getItem("sod_verse_day") || "{}"); return o.d === verseDayKey() ? (o.n || 0) : 0; }
  catch { return 0; }
}
function bumpVersesSeen() {
  try {
    const d = verseDayKey();
    const o = JSON.parse(localStorage.getItem("sod_verse_day") || "{}");
    const n = (o.d === d ? (o.n || 0) : 0) + 1;
    localStorage.setItem("sod_verse_day", JSON.stringify({ d, n }));
  } catch { /* noop */ }
}

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
      // 📌 הודעות-טיקר ידניות (צוריאל שולט) — ראשונות, ומופיעות שוב באמצע הסבב
      let featured = [];
      try { featured = await getTickerMessages(); } catch { /* ignore */ }
      for (const f of featured) out.push(f);
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
      // 📜 פסוק גאולה — מוצג *במידה*, לא אינסוף. מכסה אישית: עד VERSE_DAILY_CAP ליום לכל מבקר.
      // הפסוק מתחלף יומית (dayIdx) ומוסט לפי כמה כבר ראה היום → 2 פסוקים שונים ביום, לא חזרה.
      const seen = versesSeenToday();
      if (seen < VERSE_DAILY_CAP) out.push(verse(seen));
      // 💡 החידושים האחרונים שנכנסו למערכת (insights · origin=ai) — תוכן טרי במקום חזרות.
      // עד 2 חדשים, כותרת מקוצרת. הדה-דופ בסוף מונע כפילות אם אותו חידוש חוזר.
      try {
        const crosses = await getRecentCrosses(4);
        for (const c of (crosses || []).slice(0, 2)) {
          const title = stripHtml(c.title || "").trim().slice(0, 64);
          if (title) out.push(`💡 חידוש אחרון: ${title}`);
        }
      } catch { /* ignore */ }
      // ⛔ התכנסויות + פוסטים — לא בהזרקה האוטומטית. ⛔ ספירת «כמה התכנסויות במאגר» הוסרה (בקשת צוריאל).
      // ⛔ «X מילים נחקרו היום בבית המדרש» הוסר מהטיקר (בקשת צוריאל 2.7.2026)
      try {
        const { topNumber } = await getSearchStatsToday();
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
      // ⛔ «כמה חיפושים יש באתר» (total כל-הזמן) הוסר. ⛔ ספירת ההתכנסויות במאגר הוסרה (בקשת צוריאל).
      const moed = moedGreeting();
      if (moed) out.push(moed);
      out.push(timeGreeting());
      // — מבקרים היום: רק אם ≥ 2500 —
      try {
        const v = await getVisitorsToday();
        if (v >= 2500) out.push(`👣 ${v.toLocaleString("he-IL")} כניסות היום`);
      } catch { /* ignore */ }

      // 🚫 בלי כפילויות (בקשת צוריאל) — כל הודעה מופיעה פעם אחת בלבד בסבב.
      const uniq = [...new Set(out.filter(Boolean))];
      // 📡 «עדכון חי» — מצביע קומפקטי בלבד (הפרדת תפקידים, החלטת צוריאל 2.7.2026):
      // התוכן המלא חי בטיקרים הממותגים (בית/צ'אט/מרכז השידורים) — כאן רק כותרת + «← לצפייה».
      // כך אין כפילות, וכל מי שנוחת בפוסט ישן רואה שיש חדשות חיות ונכנס פנימה.
      try {
        const lives = await getChannelUpdates(6);
        for (const u of (lives || []).reverse())
          uniq.unshift({ live: true, id: u.id, text: u.text, channel: u.channel || "main",
            urgent: !!u.is_urgent, credit: u.credit || null });
      } catch { /* ignore */ }
      if (live) setMsgs(uniq);
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
  const isLive = typeof cur === "object" && cur.live;
  const isVerse = typeof cur === "string" && cur.startsWith("📜");
  // 📜 סופר צפייה בפסוק — כשפסוק מוצג בפועל, מקדם את המכסה היומית של המבקר (עד 2 ליום).
  // אחרי המכסה הבנייה-הבאה (≤60ש') תפסיק להזריק פסוקים למבקר הזה. כך «רואים פעמיים ביום».
  useEffect(() => { if (isVerse) bumpVersesSeen(); }, [idx, isVerse]);
  // קצב רגוע (בקשת צוריאל). פסוק = שורה ארוכה → זמן קריאה ארוך יותר לפני המעבר הבא.
  useEffect(() => {
    if (msgs.length < 2) return;
    const id = setTimeout(() => { if (!document.hidden) setI(x => x + 1); }, isVerse ? 11000 : isLive ? 9500 : 7000);
    return () => clearTimeout(id);
  }, [i, msgs.length, isVerse, isLive]);

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
        {isLive ? (
          /* 📡 עדכון חי — מצביע: כותרת קצרה + «← לצפייה» אל הדף שבו הערוץ חי (בלי כפילות תוכן) */
          <div className="lt-msg" key={idx} style={{ pointerEvents: "auto" }}>
            <Link to={cur.channel === "or-geula" ? "/community/chat" : cur.channel === "reality-code" ? "/" : "/broadcasts"}
              style={{ textDecoration: "none", color: "inherit" }}>
              <span style={{ background: cur.urgent ? "#9c1322" : "#7a1320", color: "#ffd9de", fontSize: 9.5, fontWeight: 900,
                borderRadius: 999, padding: "1px 8px", marginInlineEnd: 7, letterSpacing: 0.5, verticalAlign: "middle" }}>
                {cur.urgent ? "🚨" : "●"} עדכון חי{BRANDS[cur.channel] ? ` · ${BRANDS[cur.channel].emoji} ${BRANDS[cur.channel].title}` : ""}
              </span>
              {cur.text.length > 58 ? cur.text.slice(0, 58) + "…" : cur.text}
              <b style={{ color: "#ffd86b", marginInlineStart: 6 }}>← לצפייה</b>
            </Link>
          </div>
        ) : (
          <div className={"lt-msg" + (isVerse ? " verse" : "")} key={idx}>{cur}</div>
        )}
      </div>
    </div>
  );
}
