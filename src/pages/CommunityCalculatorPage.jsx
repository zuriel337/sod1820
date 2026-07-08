import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { setForcedMode } from "../lib/themeMode.js";
import { onlyHeb, METHODS, DEPTH_METHODS } from "../lib/gematria.js";
import { resolve } from "../lib/engine.js";
import { getAllValuePhrases, addWallWord, getAiAnalysis } from "../lib/supabase.js";
import { buildMessages } from "../lib/numberMessage.js";
import { applySeo, SITE_URL } from "../lib/seo.js";
import VisitorSearchesBox from "../components/VisitorSearchesBox.jsx";

// ===== 🧮 מחשבון גימטריה קהילתי — דף ויראלי, יום/לילה, עם ניתוח-חכם מהגרף =====
// אחיו המקצועי (19 שיטות מלאות) חי במעבדת-המחקר (/research?tool=gematria + /beit-midrash?tab=calc).
// כאן: רגש · שיתוף · «מה השם שלך מסתיר?» — כל תוצאה מפנה לעץ האחד (/number/:value), לא משכפלת.

const ALL_METHODS = [...METHODS, ...DEPTH_METHODS];                       // 19 שיטות
// 3 השיטות המרכזיות עם ההסבר הנעול (gematria.js soul + הגדרות ה-DB): גוף/נשמה/נסתר.
const CORE3_KEYS = ["רגיל", "מילוי", "מסתתר"];
const CORE3_INFO = {
  "רגיל":  { tag: "הגוף · הגלוי",   desc: "היסוד של הגימטריה — חיבור פשוט של ערכי האותיות. הזהות הבסיסית והגלויה של המילה." },
  "מילוי": { tag: "הנשמה · הפנימי", desc: "כותבים כל אות בשמהּ המלא (א→אָלֶף, ב→בֵּית) וסוכמים. «נשמת האות» — הביטוי הפנימי המלא שמתמלא בתוכה." },
  "מסתתר": { tag: "הנסתר · שביניהן", desc: "סכום ההפרשים בין אותיות סמוכות (בכל מילה בנפרד). הרובד החבוי שמסתתר בֵּין האותיות." },
};

// ✦ מספרי-הגאולה של סוד 1820 — אם השם פוגע באחד מהם (בכל שיטה) → «מחובר לסוד».
const GEULA_NUMS = { 1820: "שם הוי״ה בתורה", 358: "משיח", 26: "הוי״ה", 86: "אלהים", 541: "ישראל", 613: "תרי״ג מצוות", 137: "קבלה", 72: "חסד · שם ע״ב", 1237: "התגלות", 314: "שד־י · מטטרון", 65: "אדנ־י" };
// 📅 מילה של היום — דטרמיניסטי לפי היום בחודש (סיבה לחזור).
const DAILY_WORDS = ["אמת", "אהבה", "גאולה", "משיח", "תורה", "חכמה", "בינה", "אור", "שלום", "חיים", "נשמה", "ברכה", "תשובה", "אמונה", "צדק"];

const gemAll = name => ALL_METHODS.map(m => ({ key: m.key, sub: m.sub || m.soul || "", value: m.fn(name) }));
const regularOf = name => { try { return resolve(name).value; } catch { return METHODS[0].fn(name); } };
// כרטיס-שיתוף דינמי 1200×630 — השם ענק + הערך (api/card קיים).
const cardFor = (name, value) => `${SITE_URL}/api/card?w=${encodeURIComponent(name)}&n=${value}`;
const shareUrl = name => `${SITE_URL}/community/calculator?w=${encodeURIComponent(name)}`;

export default function CommunityCalculatorPage() {
  const P = usePalette();
  const loc = useLocation();
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [compare, setCompare] = useState(false);
  const [babyMode, setBabyMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phrases1, setPhrases1] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [fromShare, setFromShare] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  // 🗓️ מצב תאריך עברי — ממיר תאריך לועזי לתאריך עברי (יום הולדת) ומחשב את הגימטריה שלו.
  const [dateMode, setDateMode] = useState(false);
  const [gDate, setGDate] = useState("");         // תאריך לועזי (yyyy-mm-dd)
  const [afterSunset, setAfterSunset] = useState(false); // אחרי השקיעה = היום העברי הבא
  const [heb, setHeb] = useState(null);           // { pretty, clean, value } או null
  const [hebBusy, setHebBusy] = useState(false);

  // 🤖 ניתוח AI אמיתי — Edge Function ai-analyze (Claude). מקבל עובדות-מנוע בלבד, מפרש.
  async function runAi() {
    if (!r1 || aiBusy) return;
    setAiBusy(true); setAiText("");
    const core = (r1?.all || []).filter(a => CORE3_KEYS.includes(a.key));
    const methodStr = core.map(a => `${a.key} ${a.value}`).join(", ");
    const facts = `השם "${name1.trim()}" בשלוש שיטות הליבה — ${methodStr} (רגיל=המהות הגלויה, מילוי=הפנימיות/נשמת האות, מסתתר=הרובד הנסתר שבין האותיות).` +
      (phrases1.length ? ` בגימטריה רגילה (${r1.value}) שווה גם לביטויים: ${phrases1.slice(0, 8).map(p => p.phrase).join(", ")}.` : "");
    const txt = await getAiAnalysis({ kind: "number", subject: name1.trim(), facts });
    setAiText(txt || "לא התקבל ניתוח כרגע — נסו שוב עוד רגע.");
    setAiBusy(false);
  }

  useEffect(() => {
    applySeo({
      title: "מחשבון גימטריה חינם — גלו את הסוד שבשם שלכם",
      description: "מה השם שלך מסתיר? מחשבון הגימטריה החינמי של SOD1820 — חשבו כל שם או מילה, גלו לאילו ביטויים מהתורה הוא שווה, השוו בין שני שמות ושתפו בוואטסאפ. ✨",
      path: "/community/calculator",
    });
  }, []);

  // ☀️ גולש ראשון (בעיקר מגוגל) — בלי העדפת-תמה שמורה → כופה מצב בהיר למחשבון (light_calculator_dark_temple).
  // מי שכבר בחר תמה (יש sod-theme) מקבל את בחירתו. משוחרר ביציאה מהדף (לא נשמר → לא משנה את שאר האתר).
  useEffect(() => {
    let hasPref = true;
    try { hasPref = localStorage.getItem("sod-theme") != null; } catch { /* ignore */ }
    if (hasPref) return undefined;
    setForcedMode("light");
    return () => setForcedMode(null);
  }, []);

  // הגעה משיתוף (?w=) → ממלא את השם ומראה «בדוק את שלך»
  useEffect(() => {
    const w = new URLSearchParams(loc.search).get("w");
    if (w) { setName1(w); setFromShare(true); }
  }, [loc.search]);

  const r1 = useMemo(() => onlyHeb(name1).length ? { value: regularOf(name1), all: gemAll(name1) } : null, [name1]);
  const r2 = useMemo(() => (compare && onlyHeb(name2).length) ? { value: regularOf(name2), all: gemAll(name2) } : null, [compare, name2]);
  const matches = useMemo(() => (r1 && r2) ? r1.all.filter((a, i) => a.value === r2.all[i].value) : [], [r1, r2]);

  // ✦ חיבור לסוד 1820 — האם השם פוגע במספר-גאולה באחת מ-19 השיטות
  const geula = useMemo(() => {
    if (!r1) return null;
    for (const m of r1.all) if (GEULA_NUMS[m.value]) return { num: m.value, method: m.key, meaning: GEULA_NUMS[m.value] };
    return null;
  }, [r1]);
  // 📅 מילה של היום (דטרמיניסטי — בלי Math.random, יציב ליום)
  const daily = useMemo(() => { const w = DAILY_WORDS[new Date().getDate() % DAILY_WORDS.length]; return { word: w, value: regularOf(w) }; }, []);

  // 🗓️ המרת תאריך לועזי → תאריך עברי + גימטריה. @hebcal/core נטען דינמית (לא בבאנדל הראשי).
  useEffect(() => {
    if (!dateMode || !gDate) { setHeb(null); return; }
    let alive = true;
    setHebBusy(true);
    (async () => {
      try {
        const [y, m, d] = gDate.split("-").map(Number);
        if (!y || !m || !d) { if (alive) { setHeb(null); setHebBusy(false); } return; }
        const { HDate } = await import("@hebcal/core");
        let hd = new HDate(new Date(y, m - 1, d));
        if (afterSunset) hd = hd.next();            // אחרי השקיעה = היום העברי הבא
        const rendered = hd.renderGematriya();       // «כ״ב סִיוָן תש״נ»
        const pretty = rendered.replace(/[֑-ׇ]/g, ""); // בלי ניקוד/טעמים
        const clean = rendered.replace(/[^א-ת]/g, ""); // רק אותיות — לגימטריה
        if (alive) setHeb({ pretty, clean, value: regularOf(clean) });
      } catch { if (alive) setHeb(null); }
      if (alive) setHebBusy(false);
    })();
    return () => { alive = false; };
  }, [dateMode, gDate, afterSunset]);

  // ✨ הקסם: לאילו ביטויים מהתורה/הגרף השם שווה
  useEffect(() => {
    if (!r1) { setPhrases1([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try { const p = await getAllValuePhrases(r1.value, 24); if (alive) setPhrases1((p || []).filter(x => x?.phrase && x.phrase !== name1.trim())); }
      catch { if (alive) setPhrases1([]); }
      addWallWord(name1.trim(), r1.value);          // לקיר החי
    }, 650);
    return () => { alive = false; clearTimeout(t); };
  }, [name1, r1?.value]); // eslint-disable-line
  useEffect(() => { if (r2) { const t = setTimeout(() => addWallWord(name2.trim(), r2.value), 650); return () => clearTimeout(t); } }, [name2, r2?.value]); // eslint-disable-line

  // 🔮 ניתוח-חכם מהגרף (מנוע buildMessages — עובדה מול רמז)
  const analysis = useMemo(
    () => (r1 ? buildMessages({ term: name1.trim(), value: r1.value, isNumber: false, phrases: phrases1 }) : []),
    [r1?.value, phrases1, name1]
  );

  // אחוז-תאימות משחקי לשני שמות
  const compat = useMemo(() => {
    if (!r1 || !r2) return null;
    if (r1.value === r2.value) return { pct: 100, note: "נשמות תאומות — אותה גימטריה רגילה!" };
    const pct = Math.min(98, 22 + matches.length * 13);
    return { pct, note: matches.length ? `${matches.length} שיטות משותפות` : "אין התאמה ישירה — אבל הסכום מספר סיפור" };
  }, [r1, r2, matches]);

  const shareText = !r1 ? "" : (
    r2
      ? `גימטריה ✨ "${name1.trim()}" = ${r1.value} · "${name2.trim()}" = ${r2.value}${compat?.pct != null ? ` — תאימות ${compat.pct}%` : ""}\nבדקו את שלכם:\n${shareUrl(name1.trim())}`
      : `הגימטריה של "${name1.trim()}" = ${r1.value} ✨${phrases1[0] ? ` (שווה ל«${phrases1[0].phrase}»!)` : ""}\nגלו מה השם שלכם מסתיר:\n${shareUrl(name1.trim())}`
  );

  // ── סגנונות theme-aware ──
  const lightMode = P.mode === "light";
  const inp = { width: "100%", boxSizing: "border-box", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 12, color: P.ink, fontFamily: F.heading, fontSize: 19, fontWeight: 700, padding: "15px 16px", textAlign: "center", outline: "none" };
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 999, fontFamily: F.body, fontSize: 14, fontWeight: 700, textDecoration: "none" };
  const pillBtn = (bg, fg) => ({ cursor: "pointer", background: bg, color: fg, border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "13px 26px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 });

  function Reveal({ name, r, phrases }) {
    const shown = r.all;                                          // כל 19 — לתצוגת ההרחבה
    const core3 = CORE3_KEYS.map(k => r.all.find(a => a.key === k)).filter(Boolean); // 3 הליבה, בסדר קבוע
    return (
      <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, padding: "22px 18px", boxShadow: P.mode === "light" ? "0 6px 24px rgba(120,90,20,0.08)" : "0 6px 24px rgba(0,0,0,0.35)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, marginBottom: 2 }}>{name.trim()}</div>
          <Link to={`/number/${r.value}`} style={{ textDecoration: "none" }}>
            <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: 62, fontWeight: 800, lineHeight: 1.05 }}>{r.value}</div>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5 }}>גימטריה רגילה · לחצו לחקירה מלאה →</div>
          </Link>
        </div>

        {/* ✨ הקסם — לאילו ביטויים השם שווה */}
        {phrases?.length > 0 && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>✨ השם שלך שווה גם ל:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
              {phrases.slice(0, 6).map(p => (
                <Link key={p.phrase} to={`/number/${r.value}`} style={{ ...chip, background: P.glow, color: P.accentText, border: `1px solid ${P.border}` }}>{p.phrase}</Link>
              ))}
              {phrases.length > 6 && <Link to={`/number/${r.value}`} style={{ ...chip, background: "none", color: P.accentDim, border: `1px dashed ${P.border}` }}>+{phrases.length - 6} עוד</Link>}
            </div>
          </div>
        )}

        {/* 3 שיטות הליבה — עם ההסבר (גוף · נשמה · נסתר). הרחבה = כל 19. */}
        {!showAll ? (
          <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
            {core3.map(a => {
              const info = CORE3_INFO[a.key] || {};
              return (
                <Link key={a.key} to={`/number/${a.value}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12, background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ textAlign: "center", flexShrink: 0, minWidth: 62 }}>
                    <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{a.value}</div>
                    <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800, marginTop: 2 }}>{a.key}</div>
                  </div>
                  <div style={{ minWidth: 0, textAlign: "start" }}>
                    <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, fontWeight: 800, marginBottom: 2 }}>{info.tag}</div>
                    <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6 }}>{info.desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px,1fr))", gap: 8 }}>
            {shown.map(a => (
              <Link key={a.key} to={`/number/${a.value}`} title={a.sub} style={{ textDecoration: "none", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "9px 6px", textAlign: "center" }}>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 10.5 }}>{a.key}</div>
                <div style={{ color: P.accentText, fontFamily: F.mono, fontSize: 18, fontWeight: 700 }}>{a.value}</div>
              </Link>
            ))}
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: 10, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => setShowAll(s => !s)} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700, textDecoration: "underline" }}>
            {showAll ? "− חזרה ל-3 שיטות הליבה" : "+ כל 19 השיטות"}
          </button>
          <Link to="/research?tool=gematria" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>🔬 למחשבון המקצועי →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: lightMode ? "#f6f1e6" : P.pageBg, minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* 🏙️ רקע-עיר בשני המצבים (city_background_dual_theme_law) — בבהיר תמונת-העיר בעיבוד בהיר; בכהה הרקע הכהה הגלובלי נשאר */}
      {lightMode && (
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/city-bg.jpg)", backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(0.45) brightness(1.55) contrast(0.85)", opacity: 0.14 }} />
          <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", background: "linear-gradient(180deg, rgba(184,134,11,0.07), rgba(123,76,176,0.06))" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 0%, rgba(246,241,230,0.55) 12%, #f6f1e6 30%, #f6f1e6 70%, rgba(246,241,230,0.55) 88%, transparent 100%)" }} />
        </div>
      )}
    <div style={{ direction: "rtl", maxWidth: 720, margin: "0 auto", padding: "48px 16px 100px", position: "relative", zIndex: 1 }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>כלי חינמי · שתפו לחברים</div>
        <h1 style={{ color: P.ink, fontFamily: F.regal, fontSize: 34, fontWeight: 800, margin: "6px 0 4px" }}>🧮 מה השם שלך מסתיר?</h1>
        <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.85, maxWidth: 520, margin: "0 auto" }}>
          הקלידו שם או מילה בעברית — וגלו את ערכם, לאילו ביטויים מהתורה הם שווים, ומה מסתתר ביניהם. ✨
        </p>
      </div>

      {fromShare && (
        <div style={{ background: P.glow, border: `1px solid ${P.borderStrong}`, borderRadius: 14, padding: "12px 16px", marginBottom: 18, textAlign: "center", color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>
          👋 חבר שיתף אותך — עכשiו <b>בדוק את השם שלך</b> למטה 👇
        </div>
      )}

      {/* 📅 מילה של היום — סיבה לחזור */}
      <button onClick={() => { setName1(daily.word); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        style={{ cursor: "pointer", width: "100%", boxSizing: "border-box", background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 12, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, justifyContent: "center", color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700 }}>
        📅 מילה של היום: <b style={{ color: P.heroNum }}>{daily.word}</b> = <b style={{ fontFamily: F.mono }}>{daily.value}</b> · הקליקו לחקור →
      </button>

      {/* קלט */}
      <div style={{ display: "grid", gap: 12, marginBottom: 8 }}>
        <input style={inp} value={name1} onChange={e => setName1(e.target.value)} placeholder="הקלידו שם / מילה בעברית…" autoFocus dir="rtl" />
        {compare && <input style={inp} value={name2} onChange={e => setName2(e.target.value)} placeholder="שם שני להשוואה…" dir="rtl" />}
      </div>
      <div style={{ textAlign: "center", marginBottom: babyMode ? 12 : 24, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={() => setCompare(c => !c)} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, textDecoration: "underline" }}>
          {compare ? "− הסר השוואה" : "💞 השוואת שני שמות (תאימות)"}
        </button>
        <button onClick={() => setBabyMode(b => !b)} style={{ cursor: "pointer", background: "none", border: "none", color: babyMode ? P.heroNum : P.accentDim, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, textDecoration: "underline" }}>
          👶 בחירת שם לתינוק
        </button>
        <button onClick={() => setDateMode(d => !d)} style={{ cursor: "pointer", background: "none", border: "none", color: dateMode ? P.heroNum : P.accentDim, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, textDecoration: "underline" }}>
          🗓️ תאריך עברי (יום הולדת)
        </button>
      </div>

      {/* 🗓️ מצב תאריך עברי — לועזי → עברי → גימטריה */}
      {dateMode && (
        <div style={{ background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 14, padding: "16px 16px", marginBottom: 20 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>🗓️ הגימטריה של יום ההולדת העברי שלך</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, textAlign: "center", lineHeight: 1.7, marginBottom: 12 }}>
            בחרו את תאריך הלידה הלועזי — נמיר לתאריך העברי ונחשב את ערכו. ✨
          </div>
          <input type="date" value={gDate} onChange={e => setGDate(e.target.value)} dir="ltr"
            style={{ ...inp, fontSize: 17, fontFamily: F.heading, colorScheme: P.mode === "light" ? "light" : "dark" }} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 10, color: P.inkSoft, fontFamily: F.body, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={afterSunset} onChange={e => setAfterSunset(e.target.checked)} />
            נולדתי אחרי השקיעה (היום העברי הבא)
          </label>

          {hebBusy && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 14, textAlign: "center", padding: "12px 0" }}>🗓️ ממיר…</div>}
          {heb && !hebBusy && (
            <div style={{ marginTop: 14, textAlign: "center" }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, marginBottom: 3 }}>התאריך העברי שלך</div>
              <div style={{ color: P.heroNum, fontFamily: F.regal, fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>{heb.pretty}</div>
              <Link to={`/number/${heb.value}`} style={{ textDecoration: "none", display: "inline-block", marginTop: 8 }}>
                <div style={{ color: P.accentText, fontFamily: F.mono, fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{heb.value}</div>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5 }}>גימטריה של התאריך · לחצו לחקירה →</div>
              </Link>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
                <button onClick={() => { setName1(heb.clean); setDateMode(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={pillBtn(P.accentBtn, P.onAccent)}>
                  🔢 כל 19 השיטות לתאריך שלי
                </button>
                <a href={`https://wa.me/?text=${encodeURIComponent(`התאריך העברי שלי: ${heb.pretty} = ${heb.value} בגימטריה ✨\nגלו את שלכם:\n${SITE_URL}/community/calculator`)}`} target="_blank" rel="noopener noreferrer" style={pillBtn("#25D366", "#06310f")}>🟢 שתפו</a>
              </div>
            </div>
          )}
        </div>
      )}
      {babyMode && (
        <div style={{ background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 12, padding: "11px 15px", marginBottom: 20, textAlign: "center", color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.7 }}>
          👶 <b style={{ color: P.accentText }}>מצב בחירת שם:</b> הקלידו שם מועמד וראו למה הוא מתחבר — בחרו שם עם גימטריה וחיבור טובים. ✦ חיבור לסוד = סימן מיוחד.
        </div>
      )}

      {r1 && (
        <div style={{ display: "grid", gap: 16 }}>
          <Reveal name={name1} r={r1} phrases={phrases1} />

          {/* ✦ חיבור לסוד 1820 — הרגע המיוחד */}
          {!r2 && geula && (
            <Link to={`/number/${geula.num}`} style={{ textDecoration: "none", display: "block", background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))", border: `1.5px solid ${P.accent}`, borderRadius: 16, padding: "16px 18px", textAlign: "center" }}>
              <div style={{ color: P.heroNum, fontFamily: F.regal, fontSize: 17, fontWeight: 800, marginBottom: 3 }}>✦ השם שלך מחובר לסוד!</div>
              <div style={{ color: P.accentText, fontFamily: F.body, fontSize: 14, lineHeight: 1.7 }}>
                בשיטת <b>{geula.method}</b> הוא שווה <b style={{ fontFamily: F.mono }}>{geula.num}</b> — <b>{geula.meaning}</b>. לחצו לחקירת הצומת →
              </div>
            </Link>
          )}

          {r2 && <Reveal name={name2} r={r2} phrases={[]} />}

          {/* 💞 תאימות */}
          {compat && (
            <div style={{ background: compat.pct >= 60 ? P.glow : P.cardSoft, border: `1px solid ${compat.pct >= 60 ? P.borderStrong : P.border}`, borderRadius: 16, padding: "18px", textAlign: "center" }}>
              <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: 40, fontWeight: 800 }}>{compat.pct}%</div>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>תאימות גימטרית</div>
              <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5 }}>{compat.note}</div>
              {matches.length > 0 && <div style={{ color: P.accentText, fontFamily: F.body, fontSize: 13, marginTop: 6 }}>{matches.map(m => `${m.key} (${m.value})`).join(" · ")}</div>}
              <Link to={`/number/${r1.value + r2.value}`} style={{ display: "inline-block", marginTop: 8, color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>סכום שני השמות: {r1.value + r2.value} →</Link>
            </div>
          )}

          {/* 🔮 ניתוח-חכם מהגרף */}
          {!r2 && analysis.length > 0 && (
            <div style={{ background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 16, padding: "16px 18px" }}>
              {!showAnalysis ? (
                <button onClick={() => setShowAnalysis(true)} style={{ ...pillBtn(P.accentBtn, P.onAccent), width: "100%", justifyContent: "center", boxSizing: "border-box" }}>
                  🔮 גלו מה מסתתר בשם «{name1.trim()}»
                </button>
              ) : (
                <>
                  <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800, marginBottom: 10 }}>🔮 מה מסתתר בשם שלך</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {analysis.map((m, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", color: m.fact ? P.ink : P.inkSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.7 }}>
                        <span style={{ color: m.fact ? P.accent : P.accentDim, flexShrink: 0 }}>{m.fact ? "✓" : "✧"}</span>
                        <span>{m.text}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 10, lineHeight: 1.6 }}>✓ עובדה מאומתת במנוע · ✧ רמז משלים (פרשנות)</div>

                  {/* 🤖 ניתוח AI אמיתי (Claude via ai-analyze) */}
                  <div style={{ marginTop: 14, borderTop: `1px solid ${P.border}`, paddingTop: 14 }}>
                    {!aiText && !aiBusy && (
                      <button onClick={runAi} style={{ cursor: "pointer", background: "linear-gradient(135deg,#3ea6ff,#7c3aed)", color: "#fff", border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "11px 22px", width: "100%", boxSizing: "border-box" }}>
                        🤖 קבלו ניתוח AI אישי לשם «{name1.trim()}»
                      </button>
                    )}
                    {aiBusy && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 14, textAlign: "center", padding: "6px 0" }}>🤖 ה-AI חושב…</div>}
                    {aiText && (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                          <span style={{ color: "#3ea6ff", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>🔵 ניתוח AI · מאומת מהמנוע</span>
                        </div>
                        <div style={{ color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85, whiteSpace: "pre-line" }}>{aiText}</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* שיתוף */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" style={pillBtn("#25D366", "#06310f")}>🟢 שתפו בוואטסאפ</a>
            <button onClick={() => { navigator.clipboard?.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={pillBtn(P.card, P.accentText)}>
              {copied ? "✓ הועתק" : "🔗 העתק קישור"}
            </button>
            {!r2 && (
              <a href={cardFor(name1.trim(), r1.value)} target="_blank" rel="noopener noreferrer" style={pillBtn(P.card, P.accentText)}>📥 שמור תמונה</a>
            )}
            {!r2 && (
              <a href={`${cardFor(name1.trim(), r1.value)}&format=story`} target="_blank" rel="noopener noreferrer" style={pillBtn(P.card, P.accentText)}>📸 לסטורי</a>
            )}
          </div>

          {/* 📸 תצוגת כרטיס-השיתוף */}
          {!r2 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, marginBottom: 7 }}>📸 כך זה ייראה בשיתוף</div>
              <img src={cardFor(name1.trim(), r1.value)} alt={`${name1.trim()} = ${r1.value}`} loading="lazy"
                style={{ width: "100%", maxWidth: 420, borderRadius: 14, border: `1px solid ${P.border}`, boxShadow: P.mode === "light" ? "0 4px 18px rgba(120,90,20,0.12)" : "0 4px 18px rgba(0,0,0,0.5)" }} />
            </div>
          )}
        </div>
      )}

      {/* 🔎 הקיר החי — מה גולשים מחשבים עכשiו */}
      <div style={{ marginTop: 30 }}>
        <VisitorSearchesBox light={P.mode === "light"} onPick={p => { setName1(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      </div>

      {/* גשר למקצועי */}
      <div style={{ marginTop: 26, textAlign: "center" }}>
        <Link to="/research?tool=gematria" style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>
          רוצים לעומק? המחשבון המקצועי — 19 שיטות, הצלבות ומנוע מלא →
        </Link>
      </div>
    </div>
    </div>
  );
}
