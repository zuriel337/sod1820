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
// 🤖 אופציות ניתוח AI (זמני — לבדיקה איזו זווית משתלבת הכי טוב). כל זווית מכוונת את הפרומפט.
const AI_ANGLES = [
  { key: "meaning", label: "🔍 משמעות ופנימיות", focus: "התמקד במשמעות השם וברבדיו: הגלוי (רגיל), הנשמה (מילוי), הנסתר (מסתתר) — מה הם מלמדים יחד." },
  { key: "links",   label: "🔗 הקשרים במאגר",    focus: "התמקד בביטויים והמספרים ששווים לשם במאגר — ומה הם עשויים לרמז יחד. עובדתי." },
  { key: "hint",    label: "✨ רמז משלים",        focus: "תן רמז משלים אחד קצר וחם, נאמן לעובדות בלבד — בלי נבואה." },
];

// ✦ מספרי-הגאולה של סוד 1820 — אם השם פוגע באחד מהם (בכל שיטה) → «מחובר לסוד».
const GEULA_NUMS = { 1820: "שם הוי״ה בתורה", 358: "משיח", 26: "הוי״ה", 86: "אלהים", 541: "ישראל", 613: "תרי״ג מצוות", 137: "קבלה", 72: "חסד · שם ע״ב", 1237: "התגלות", 314: "שד־י · מטטרון", 65: "אדנ־י" };
// 📅 מילה של היום — דטרמיניסטי לפי היום בחודש (סיבה לחזור).
const DAILY_WORDS = ["אמת", "אהבה", "גאולה", "משיח", "תורה", "חכמה", "בינה", "אור", "שלום", "חיים", "נשמה", "ברכה", "תשובה", "אמונה", "צדק"];

const gemAll = name => ALL_METHODS.map(m => ({ key: m.key, sub: m.sub || m.soul || "", value: m.fn(name) }));
const regularOf = name => { try { return resolve(name).value; } catch { return METHODS[0].fn(name); } };
// כרטיס-שיתוף דינמי 1200×630 — השם ענק + הערך (api/card קיים).
const cardFor = (name, value) => `${SITE_URL}/api/card?w=${encodeURIComponent(name)}&n=${value}`;
const shareUrl = name => `${SITE_URL}/community/calculator?w=${encodeURIComponent(name)}`;

// ✨ דירוג-הפתעה (Parallel Finder #2) — דטרמיניסטי, בלי המצאה.
// הפתעה = ביטוי-מושג שלם (ריבוי-מילים) ורחוק מהשם, לא מילה נפוצה קצרה. אנגרמה של השם מוחרגת (טריוויאלית).
const _sortedLetters = s => onlyHeb(s).slice().sort().join("");
function rankBySurprise(phrases, name) {
  const nameKey = _sortedLetters(name);
  const nameTrim = String(name || "").trim();
  return (phrases || [])
    .filter(p => p?.phrase && p.phrase !== nameTrim && _sortedLetters(p.phrase) !== nameKey) // לא השם ולא אנגרמה שלו
    .map(p => {
      const letters = onlyHeb(p.phrase).length;
      const words = p.phrase.trim().split(/\s+/).length;
      // ריבוי-מילים = ההפתעה הגדולה (ביטוי שלם ששווה לשם); אורך = נדירות; מאומת = מושג שצוריאל אצר.
      const score = words * 12 + letters * 2 + (p.is_verified ? 4 : 0) - (letters <= 2 ? 6 : 0);
      return { ...p, words, score };
    })
    .sort((a, b) => b.score - a.score);
}

// 👶 כלי-מחקר לשם תינוק — לא "ציון" ולא "שם מומלץ" (אין דרך אובייקטיבית), אלא כלי-גילוי:
// מדדים תיאוריים (עושר קשרים/מקורות · התאמות) + ניתוח עובדתי + העמקה. המשתמש מחליט.
// זרימה: שלב 1 = 1-3 שמות · שלב 2 (אופציונלי) = שם משפחה + תאריך לידה → התאמות וקשרים.
function BabyNameTool({ P }) {
  const [names, setNames] = useState([""]);         // 1-3 שמות
  const [family, setFamily] = useState("");
  const [bDate, setBDate] = useState("");
  const [heb, setHeb] = useState(null);             // {pretty, value} — תאריך עברי
  const [phraseMap, setPhraseMap] = useState({});   // value → [{phrase,is_verified}]
  const [ai, setAi] = useState({});                 // idx → {busy,text}
  const [showCtx, setShowCtx] = useState(false);    // שלב 2 פתוח?

  const chip = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, fontFamily: F.body, fontSize: 13, fontWeight: 700, textDecoration: "none" };
  const fld = { width: "100%", boxSizing: "border-box", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 12, color: P.ink, fontFamily: F.heading, fontSize: 18, fontWeight: 700, padding: "13px 15px", textAlign: "center", outline: "none" };

  // ניתוח כל שם: 3 שיטות + חיבור-לסוד + ערך רגיל
  const analyzed = useMemo(() => names.map(n => {
    const nm = (n || "").trim();
    if (!onlyHeb(nm).length) return null;
    const all = gemAll(nm);
    const core = CORE3_KEYS.map(k => all.find(a => a.key === k)).filter(Boolean);
    const geulaHit = all.find(a => GEULA_NUMS[a.value]);
    return { name: nm, all, core, value: regularOf(nm), geula: geulaHit ? { num: geulaHit.value, method: geulaHit.key, meaning: GEULA_NUMS[geulaHit.value] } : null };
  }), [names]);

  // שם משפחה — ערך ושיטות (להתאמות)
  const fam = useMemo(() => {
    const fnm = family.trim();
    if (!onlyHeb(fnm).length) return null;
    return { name: fnm, all: gemAll(fnm), value: regularOf(fnm) };
  }, [family]);

  // ביטויים תואמים לכל ערך (getAllValuePhrases) — «עושר קשרים/מקורות»
  useEffect(() => {
    const vals = [...new Set(analyzed.filter(Boolean).map(a => a.value))];
    let alive = true;
    const t = setTimeout(async () => {
      for (const v of vals) {
        if (phraseMap[v]) continue;
        try { const p = await getAllValuePhrases(v, 60); if (alive) setPhraseMap(m => ({ ...m, [v]: (p || []) })); }
        catch { /* ignore */ }
      }
    }, 500);
    return () => { alive = false; clearTimeout(t); };
  }, [analyzed]); // eslint-disable-line

  // תאריך עברי (אופציונלי) — @hebcal נטען דינמית
  useEffect(() => {
    if (!bDate) { setHeb(null); return; }
    let alive = true;
    (async () => {
      try {
        const [y, m, d] = bDate.split("-").map(Number);
        if (!y || !m || !d) { if (alive) setHeb(null); return; }
        const { HDate } = await import("@hebcal/core");
        const hd = new HDate(new Date(y, m - 1, d));
        const rendered = hd.renderGematriya();
        if (alive) setHeb({ pretty: rendered.replace(/[֑-ׇ]/g, ""), value: regularOf(rendered.replace(/[^א-ת]/g, "")) });
      } catch { if (alive) setHeb(null); }
    })();
    return () => { alive = false; };
  }, [bDate]);

  async function runAi(idx, angle) {
    const a = analyzed[idx]; if (!a || ai[idx]?.busy) return;
    setAi(s => ({ ...s, [idx]: { busy: true, text: "", angle: angle.key } }));
    const methodStr = a.core.map(c => `${c.key} ${c.value}`).join(", ");
    const ph = (phraseMap[a.value] || []).slice(0, 8).map(p => p.phrase).filter(x => x !== a.name);
    const facts = `${angle.focus}\nהשם "${a.name}" בשלוש שיטות — ${methodStr} (רגיל=הגלוי, מילוי=הנשמה, מסתתר=הנסתר).` +
      (ph.length ? ` שווה גם לביטויים: ${ph.join(", ")}.` : "") +
      (a.geula ? ` בשיטת ${a.geula.method} שווה ${a.geula.num} (${a.geula.meaning}).` : "") +
      (fam ? ` שם המשפחה "${fam.name}" = ${fam.value}.` : "") +
      (heb ? ` התאריך העברי של הלידה: ${heb.pretty} = ${heb.value}.` : "");
    // אינטראקטיבי → מודל מהיר (Haiku); אם נכשל פעם אחת, ניסיון שני (מונע «לא התקבל» זמני).
    let txt = await getAiAnalysis({ kind: "number", subject: a.name, facts, fast: true });
    if (!txt) { await new Promise(r => setTimeout(r, 900)); txt = await getAiAnalysis({ kind: "number", subject: a.name, facts, again: true, fast: true }); }
    setAi(s => ({ ...s, [idx]: { busy: false, text: txt || "לא התקבל ניתוח — נסו שוב עוד רגע (ה-AI עמוס).", angle: angle.key } }));
  }

  const setName = (i, v) => setNames(a => a.map((x, k) => (k === i ? v : x)));
  const validCount = analyzed.filter(Boolean).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* שלב 1 — שמות */}
      <div style={{ background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 14, padding: "16px" }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800, textAlign: "center", marginBottom: 3 }}>👶 כלי מחקר לשם תינוק</div>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, textAlign: "center", lineHeight: 1.7, marginBottom: 12 }}>
          כלי-גילוי, לא שיפוט — מציג את הקשרים והמשמעויות, ואתם מחליטים. הזינו שם אחד או עד שלושה להשוואה.
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {names.map((n, i) => (
            <input key={i} style={fld} value={n} onChange={e => setName(i, e.target.value)} placeholder={`שם ${i + 1}…`} dir="rtl" autoFocus={i === 0} />
          ))}
        </div>
        {names.length < 3 && (
          <button onClick={() => setNames(a => [...a, ""])} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 700, textDecoration: "underline", marginTop: 10 }}>+ הוסף שם להשוואה</button>
        )}
      </div>

      {/* שלב 2 — הקשר אופציונלי */}
      <div style={{ background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 14, padding: showCtx ? "16px" : "0" }}>
        {!showCtx ? (
          <button onClick={() => setShowCtx(true)} style={{ cursor: "pointer", width: "100%", background: "none", border: "none", color: P.accentDim, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, padding: "13px" }}>
            ➕ שלב 2 (אופציונלי): שם משפחה + תאריך לידה — להתאמות וקשרים
          </button>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>הקשר (אופציונלי) — לא חובה, מוסיף עומק</div>
            <input style={{ ...fld, fontSize: 16 }} value={family} onChange={e => setFamily(e.target.value)} placeholder="שם משפחה…" dir="rtl" />
            <label style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 800, textAlign: "center", marginTop: 2 }}>📅 תאריך לידה (לועזי) — בחרו מהיומן</label>
            <input type="date" value={bDate} onChange={e => setBDate(e.target.value)} dir="ltr" style={{ ...fld, fontSize: 15, colorScheme: P.mode === "light" ? "light" : "dark" }} />
            {heb && <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, textAlign: "center" }}>🗓️ תאריך עברי: <b>{heb.pretty}</b> = <b style={{ fontFamily: F.mono }}>{heb.value}</b></div>}
          </div>
        )}
      </div>

      {/* כרטיס לכל שם */}
      {analyzed.map((a, i) => {
        if (!a) return null;
        const phrases = phraseMap[a.value] || null;
        const verified = phrases ? phrases.filter(p => p.is_verified).length : 0;
        const famMatch = fam ? a.all.filter(x => { const fx = fam.all.find(y => y.key === x.key); return fx && fx.value === x.value; }) : [];
        const dateEq = heb && heb.value === a.value;
        return (
          <div key={i} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: "18px 16px" }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800 }}>{a.name}</div>
            </div>
            {/* 3 שיטות */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {a.core.map(c => (
                <Link key={c.key} to={`/number/${c.value}`} title={CORE3_INFO[c.key]?.desc} style={{ textDecoration: "none", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 10, padding: "9px 4px", textAlign: "center" }}>
                  <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: 22, fontWeight: 800 }}>{c.value}</div>
                  <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 11, fontWeight: 800 }}>{c.key}</div>
                  <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 9.5 }}>{CORE3_INFO[c.key]?.tag}</div>
                </Link>
              ))}
            </div>
            {/* מדדים תיאוריים — לא ציון */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 12 }}>
              <span style={{ ...chip, background: P.glow, color: P.accentText, border: `1px solid ${P.border}` }}>🔗 עושר קשרים: {phrases ? phrases.length : "…"}</span>
              <span style={{ ...chip, background: P.glow, color: P.accentText, border: `1px solid ${P.border}` }}>✓ מאומתים במנוע: {phrases ? verified : "…"}</span>
              {a.geula && <span style={{ ...chip, background: "rgba(212,175,55,0.16)", color: P.heroNum, border: `1px solid ${P.accent}` }}>✦ חיבור לסוד: {a.geula.num}</span>}
            </div>
            {/* ביטויים תואמים */}
            {phrases && phrases.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, marginBottom: 6, textAlign: "center" }}>✨ שווה בגימטריה גם ל:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {phrases.slice(0, 8).filter(p => p.phrase !== a.name).map(p => (
                    <Link key={p.phrase} to={`/number/${a.value}`} style={{ ...chip, background: P.cardSoft, color: P.accentText, border: `1px solid ${P.border}`, fontSize: 12 }}>{p.is_verified ? "✓ " : ""}{p.phrase}</Link>
                  ))}
                </div>
              </div>
            )}
            {/* התאמות — שם משפחה / תאריך לידה */}
            {(famMatch.length > 0 || dateEq || (fam && fam.value === a.value)) && (
              <div style={{ background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 12, padding: "11px 13px", marginBottom: 12 }}>
                <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 5 }}>🔎 התאמות שנמצאו</div>
                {fam && fam.value === a.value && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>• השם ושם המשפחה «{fam.name}» שווים באותו ערך רגיל ({a.value}).</div>}
                {famMatch.length > 0 && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>• מתחבר לשם המשפחה ב-{famMatch.length} שיטות: {famMatch.map(m => m.key).join(" · ")}.</div>}
                {dateEq && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>• גימטריית השם שווה בדיוק לגימטריית תאריך הלידה העברי ({heb.value}).</div>}
              </div>
            )}
            {/* ניתוח AI עובדתי — 3 זוויות (זמני, לבדיקה איזו משתלבת) */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, textAlign: "center", marginBottom: 7 }}>🤖 ניתוח AI — בחרו זווית:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                {AI_ANGLES.map(ang => {
                  const on = ai[i]?.angle === ang.key;
                  return (
                    <button key={ang.key} onClick={() => runAi(i, ang)} disabled={ai[i]?.busy}
                      style={{ cursor: ai[i]?.busy ? "wait" : "pointer", background: on ? "linear-gradient(135deg,#3ea6ff,#7c3aed)" : P.card, color: on ? "#fff" : P.accentText, border: `1px solid ${on ? "transparent" : P.border}`, borderRadius: 999, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, padding: "9px 14px" }}>
                      {ang.label}
                    </button>
                  );
                })}
              </div>
              {ai[i]?.busy && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 13.5, textAlign: "center", padding: "10px 0" }}>🤖 ה-AI חושב… (כמה שניות)</div>}
              {ai[i]?.text && !ai[i]?.busy && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ color: "#3ea6ff", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginBottom: 5 }}>🔵 ניתוח AI · עובדתי (מהמנוע)</div>
                  <div style={{ color: P.ink, fontFamily: F.body, fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-line" }}>{ai[i].text}</div>
                </div>
              )}
            </div>
            {/* העמקה */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <Link to={`/number/${a.value}`} style={{ ...chip, background: P.accentBtn, color: P.onAccent }}>🔢 דף המספר {a.value}</Link>
              <Link to={`/journey?from=${a.value}`} style={{ ...chip, background: P.card, color: P.accentText, border: `1px solid ${P.border}` }}>🎲 צאו למסע</Link>
              <a href={`https://wa.me/?text=${encodeURIComponent(`בדקתי את השם "${a.name}" בגימטריה ✨ רגיל ${a.value}\n${SITE_URL}/community/calculator`)}`} target="_blank" rel="noopener noreferrer" style={{ ...chip, background: "#25D366", color: "#06310f" }}>🟢 שתפו</a>
            </div>
          </div>
        );
      })}

      {validCount === 0 && (
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, textAlign: "center", padding: "10px 0" }}>הזינו שם בעברית למעלה כדי להתחיל את המחקר ✦</div>
      )}
    </div>
  );
}

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
  const [aiEngine, setAiEngine] = useState("claude"); // claude | gemini — מנוע פרשנות נבחר (A/B)
  // 🗓️ מצב תאריך עברי — ממיר תאריך לועזי לתאריך עברי (יום הולדת) ומחשב את הגימטריה שלו.
  const [dateMode, setDateMode] = useState(false);
  const [gDate, setGDate] = useState("");         // תאריך לועזי (yyyy-mm-dd)
  const [afterSunset, setAfterSunset] = useState(false); // אחרי השקיעה = היום העברי הבא
  const [heb, setHeb] = useState(null);           // { pretty, clean, value } או null
  const [hebBusy, setHebBusy] = useState(false);

  // 🤖 ניתוח AI אמיתי — Edge Function ai-analyze (Claude). מקבל עובדות-מנוע בלבד, מפרש.
  // שם יחיד → kind=number; שני שמות (השוואה) → kind=compare. מודל מהיר (fast) לכלי אינטראקטיבי.
  async function runAi(engine = "claude") {
    if (!r1 || aiBusy) return;
    setAiEngine(engine);
    setAiBusy(true); setAiText("");
    let kind, subject, facts;
    if (r2) {
      const eq = matches.map(m => `${m.key} (${m.value})`).join(", ");
      kind = "compare"; subject = `${name1.trim()} מול ${name2.trim()}`;
      facts = `שני שמות: "${name1.trim()}" = ${r1.value} · "${name2.trim()}" = ${r2.value} (גימטריה רגילה).` +
        (matches.length ? ` הם מתכנסים לאותו ערך בשיטות: ${eq}.` : " אין להם ערך שווה באף שיטה מ-19 השיטות.");
    } else {
      const core = (r1?.all || []).filter(a => CORE3_KEYS.includes(a.key));
      const methodStr = core.map(a => `${a.key} ${a.value}`).join(", ");
      const surp = rankBySurprise(phrases1, name1.trim());
      kind = surp.length ? "discovery" : "number"; subject = name1.trim();
      facts = `השם "${name1.trim()}" בשלוש שיטות הליבה — ${methodStr} (רגיל=המהות הגלויה, מילוי=הפנימיות/נשמת האות, מסתתר=הרובד הנסתר שבין האותיות).` +
        (surp.length ? ` בגימטריה רגילה (${r1.value}) שווה גם לביטויים (מהמפתיע לנפוץ): ${surp.slice(0, 8).map(p => p.phrase).join(", ")}. בחר את המקבילה הכי מפתיעה — זו הרחוקה ביותר מהמשמעות הרגילה של השם — והסבר את החיבור כרמז משלים.` : "");
    }
    const txt = await getAiAnalysis({ kind, subject, facts, fast: true, engine });
    setAiText(txt || "לא התקבל ניתוח כרגע — נסו שוב עוד רגע.");
    setAiBusy(false);
  }
  // איפוס ניתוח כשמשנים שם/מצב — כדי שלא יישאר ניתוח ישן על נתונים חדשים
  useEffect(() => { setAiText(""); }, [name1, name2, compare]);

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

  // ✨ תגליות מפתיעות (#2) — המקבילות מדורגות לפי הפתעה (ביטוי-מושג שלם ורחוק) לראש.
  const discoveries = useMemo(() => rankBySurprise(phrases1, name1.trim()), [phrases1, name1]);

  // 💞 ציון התאמה — מדיד ואמיתי (לא אחוז מומצא): כמה מ-19 השיטות מתכנסות לאותו ערך.
  // הרגיל שווה = מפגש בלב השיטה. עובדה, לא הבטחה (gematria_engine_law).
  const compat = useMemo(() => {
    if (!r1 || !r2) return null;
    const total = r1.all.length;              // 19 שיטות המנוע
    const count = matches.length;
    const sameRagil = r1.value === r2.value;
    const note = sameRagil
      ? "אותה גימטריה רגילה — מפגש בלב השיטה 💫"
      : count ? `נפגשים ב-${count} מתוך ${total} השיטות`
              : "לא נפגשים באף שיטה — אבל הסכום מספר סיפור";
    return { count, total, sameRagil, strong: sameRagil || count >= 2, note };
  }, [r1, r2, matches]);

  const shareText = !r1 ? "" : (
    r2
      ? `✨ "${name1.trim()}" (${r1.value}) ו-"${name2.trim()}" (${r2.value}) נפגשים ב-${matches.length} מתוך ${r1.all.length} שיטות גימטריה${matches.length ? `: ${matches.map(m => m.key).join(", ")}` : ""}\nבדקו את ההתאמה שלכם:\n${shareUrl(name1.trim())}`
      : `הגימטריה של "${name1.trim()}" = ${r1.value} ✨${discoveries[0] ? ` (שווה ל«${discoveries[0].phrase}»!)` : (phrases1[0] ? ` (שווה ל«${phrases1[0].phrase}»!)` : "")}\nגלו מה השם שלכם מסתיר:\n${shareUrl(name1.trim())}`
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

      {/* קלט — מוסתר במצב «בחירת שם לתינוק» (לכלי יש קלט משלו) */}
      {!babyMode && (
        <div style={{ display: "grid", gap: 12, marginBottom: 8 }}>
          <input style={inp} value={name1} onChange={e => setName1(e.target.value)} placeholder="הקלידו שם / מילה בעברית…" autoFocus dir="rtl" />
          {compare && <input style={inp} value={name2} onChange={e => setName2(e.target.value)} placeholder="שם שני להשוואה…" dir="rtl" />}
        </div>
      )}
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
      {!babyMode && dateMode && (
        <div style={{ background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 14, padding: "16px 16px", marginBottom: 20 }}>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>🗓️ הגימטריה של יום ההולדת העברי שלך</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, textAlign: "center", lineHeight: 1.7, marginBottom: 12 }}>
            בחרו את תאריך הלידה הלועזי — נמיר לתאריך העברי ונחשב את ערכו. ✨
          </div>
          <label style={{ display: "block", color: P.accentDim, fontFamily: F.heading, fontSize: 12, fontWeight: 800, textAlign: "center", marginBottom: 6 }}>📅 תאריך לידה (לועזי) — בחרו מהיומן</label>
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
      {babyMode && <div style={{ marginBottom: 20 }}><BabyNameTool P={P} /></div>}

      {!babyMode && r1 && (
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

          {/* ✨ תגלית מפתיעה (#2 Parallel Finder) — המקבילה הכי «רחוקה» מהשם, מדורגת-הפתעה */}
          {!r2 && discoveries.length > 0 && (() => {
            const top = discoveries[0], rest = discoveries.slice(1, 4);
            const blurb = `✨ גיליתי ש"${name1.trim()}" שווה בגימטריה (${r1.value}) ל«${top.phrase}»${rest[0] ? ` וגם ל«${rest[0].phrase}»` : ""}!\nמה השם שלך מסתיר?\n${shareUrl(name1.trim())}`;
            return (
              <div style={{ background: P.glow, border: `1.5px solid ${P.borderStrong}`, borderRadius: 16, padding: "18px", textAlign: "center" }}>
                <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, letterSpacing: 0.3, marginBottom: 6 }}>✨ תגלית</div>
                <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800, lineHeight: 1.4 }}>
                  «{name1.trim()}» <span style={{ color: P.accentDim }}>=</span> <span style={{ fontFamily: F.mono, color: P.heroNum }}>{r1.value}</span> <span style={{ color: P.accentDim }}>=</span> «{top.phrase}»
                </div>
                <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, marginTop: 4 }}>אותו ערך בגימטריה רגילה — עובדה מהמנוע ✦ הפירוש למטה ב-AI</div>
                {rest.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginTop: 10 }}>
                    {rest.map(p => (
                      <Link key={p.phrase} to={`/number/${r1.value}`} style={{ ...chip, background: P.card, color: P.accentText, border: `1px solid ${P.border}` }}>{p.phrase}</Link>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 9, justifyContent: "center", flexWrap: "wrap", marginTop: 13 }}>
                  <a href={`https://wa.me/?text=${encodeURIComponent(blurb)}`} target="_blank" rel="noopener noreferrer" style={pillBtn("#25D366", "#06310f")}>🟢 שתפו את התגלית</a>
                  <button onClick={() => { navigator.clipboard?.writeText(blurb); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={pillBtn(P.card, P.accentText)}>{copied ? "✓ הועתק" : "📋 העתקה"}</button>
                </div>
              </div>
            );
          })()}

          {r2 && <Reveal name={name2} r={r2} phrases={[]} />}

          {/* 💞 התאמה גימטרית — ציון מדיד (כמה מ-19 השיטות נפגשות), לא אחוז מומצא */}
          {compat && (
            <div style={{ background: compat.strong ? P.glow : P.cardSoft, border: `1px solid ${compat.strong ? P.borderStrong : P.border}`, borderRadius: 16, padding: "18px", textAlign: "center" }}>
              <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: 40, fontWeight: 800, lineHeight: 1.05 }}>
                {compat.count}<span style={{ fontSize: 22, color: P.accentDim }}> / {compat.total}</span>
              </div>
              <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>שיטות נפגשות</div>
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
                </>
              )}
            </div>
          )}

          {/* 🤖 ניתוח AI אישי — כרטיס בולט משלו (Claude via ai-analyze). שם יחיד = ניתוח · השוואה = חיבור בין השמות */}
          <div style={{ background: P.card, border: "1.5px solid rgba(62,166,255,0.45)", borderRadius: 16, padding: "16px 18px", boxShadow: P.mode === "light" ? "0 6px 22px rgba(62,120,220,0.10)" : "0 6px 22px rgba(0,0,0,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: aiText ? 10 : 8 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <div>
                  <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>{r2 ? `ניתוח AI — «${name1.trim()}» מול «${name2.trim()}»` : `ניתוח AI אישי לשם «${name1.trim()}»`}</div>
                  <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 12, lineHeight: 1.5 }}>מבוסס על עובדות המנוע — מפרש, לא מנבא ✨</div>
                </div>
              </div>
              {!aiText && !aiBusy && (
                <div style={{ display: "grid", gap: 8 }}>
                  <button onClick={() => runAi("claude")} style={{ cursor: "pointer", background: "linear-gradient(135deg,#3ea6ff,#7c3aed)", color: "#fff", border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "13px 22px", width: "100%", boxSizing: "border-box" }}>
                    {r2 ? "🔵 מה Claude אומר על החיבור?" : "🔵 ניתוח ב-Claude"}
                  </button>
                  <button onClick={() => runAi("gemini")} style={{ cursor: "pointer", background: "linear-gradient(135deg,#8a63f4,#6d3ff0)", color: "#fff", border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "13px 22px", width: "100%", boxSizing: "border-box" }}>
                    {r2 ? "🟣 מה Gemini אומר על החיבור?" : "🟣 ניתוח ב-Gemini"}
                  </button>
                  <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, textAlign: "center", fontStyle: "italic" }}>שני מנועים · אותן עובדות מהמנוע · פרשנות משלימה</div>
                </div>
              )}
              {aiBusy && <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 14, textAlign: "center", padding: "10px 0" }}>{aiEngine === "gemini" ? "🟣 Gemini חושב…" : "🔵 Claude חושב…"}</div>}
              {aiText && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 7, marginBottom: 7, flexWrap: "wrap" }}>
                    <span style={{ color: aiEngine === "gemini" ? "#8a63f4" : "#3ea6ff", fontFamily: F.heading, fontSize: 13.5, fontWeight: 800 }}>
                      {aiEngine === "gemini" ? "🟣 Gemini" : "🔵 Claude"} · פרשנות מאומתת מהמנוע
                    </span>
                    <button onClick={() => runAi(aiEngine === "gemini" ? "claude" : "gemini")} disabled={aiBusy}
                      style={{ cursor: "pointer", background: "none", border: `1px solid ${P.border}`, borderRadius: 999, color: P.accentText, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, padding: "5px 12px" }}>
                      {aiEngine === "gemini" ? "🔵 השווה מול Claude" : "🟣 השווה מול Gemini"}
                    </button>
                  </div>
                  <div style={{ color: P.ink, fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85, whiteSpace: "pre-line" }}>{aiText}</div>
                  <div style={{ marginTop: 9, paddingTop: 8, borderTop: `1px dashed ${P.border}`, color: P.accentDim, fontFamily: F.body, fontSize: 11, lineHeight: 1.6, fontStyle: "italic" }}>
                    כל הפרשנויות מבוססות על אותם נתוני גימטריה — ההבדל הוא רק בדרך שכל מודל מסביר אותם.
                  </div>
                </div>
              )}
          </div>

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
