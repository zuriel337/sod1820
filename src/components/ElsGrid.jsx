import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { elsNormalize, elsSearch, buildSkipSet, TANAKH_BOOKS } from "../features/els/Els.jsx";
import { computeEntity } from "../lib/research/coreEngine.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabase.js";
import { getTorahNiqqud } from "../lib/research/torah.js";
import { emit, on, EVENTS } from "../lib/research/eventBus.js";
import { LOGO_URL } from "../theme.js";
import { tokenLabel } from "../lib/els/tokens.js";

// המרת צבע hex לשקיפות — ל«צבע שמתחלש ככל שמתרחקים» (חיפוש משני)
const hexA = (hex, a) => {
  const n = hex.replace("#", ""); const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// ℹ️ הסבר-מנוע מתקפל — מוצב במקומות מתאימים כדי שכל אחד יבין מה קורה
const Help = ({ children, label = "ℹ️ מה זה? / איך זה עובד" }) => (
  <details className="els-help"><summary>{label}</summary><div className="els-help-b">{children}</div></details>
);

// רקעי-מטריצה לבחירה (החלפת צבע לרקע האותיות). הצבע המודגש נשאר תמיד.
const CELL_BGS = [
  { bg: "var(--bg)", fg: "var(--ink2)", label: "רגיל" },
  { bg: "#fffdf6", fg: "#3a2f12", label: "קרם" },
  { bg: "#ffffff", fg: "#1b1d22", label: "לבן" },
  { bg: "#10131a", fg: "#e8dcc0", label: "כהה" },
  { bg: "#0a0700", fg: "#E8C84A", label: "מגילה" },
  { bg: "#eef4ff", fg: "#243b6b", label: "תכלת" },
];

// 🔡 מסך הדילוגים — בהיר, מתאים לסביבה. רוכב על מנוע ה-ELS הקיים (לא מחשב מחדש).
// מונח אחד → עמודה אנכית · כמה מונחים → קרבה במטריצה אחת · «כולל קרובים» → סבילות-שגיאה.
// רשימת-תוצאות עם מיקום (ספר+אות) + לחיצה ממקדת · מסך-מלא. יושר: מציאה=עובדה, משמעות=חקירה.
const TERM_COLORS = ["#b07d12", "#a01f2e", "#6b3fa0", "#1f7a4d", "#c5631a"];
// 🔎 חיפוש-דילוג מנותח-למקטעים — נותן (א) אחוזי-התקדמות (ב) עצירה אמצע (cancelRef) ע״י yield בין מקטעים.
// אותה לוגיקה כמו elsSearch, אבל לא-חוסם: סורק ~14K מיקומים, נושם, מדווח %, בודק ביטול.
async function elsSearchChunked(letters, targetRaw, skipMin, skipMax, dir, mm, opts, onProgress, cancelRef) {
  const target = elsNormalize(targetRaw);
  const N = letters.length, L = target.length;
  const hits = [];
  if (L < 2 || N === 0) return { hits, N, target, capped: false };
  const dirs = dir === "fwd" ? [1] : dir === "back" ? [-1] : [1, -1];
  const winFrom = Math.max(0, opts.winFrom ?? 0), winTo = Math.min(N, opts.winTo ?? N);
  const skips = opts.skips || null;
  // 🛟 גודל-מקטע מסתגל — מבטיח שאף מקטע לא חוסם את ה-thread יותר מדי (אחרת הדפדפן «נתקע»).
  // ככל שטווח-הדילוג/האורך גדול → מקטע קטן יותר → נשימה תכופה יותר. mm>0 (מטושטש) = כבד יותר.
  const span = skips ? skips.length : Math.max(1, skipMax - skipMin + 1);
  const factor = mm > 0 ? 1 : 0.06;
  const CHUNK = Math.max(700, Math.min(14000, Math.round(5_000_000 / (factor * span * dirs.length * L))));
  let capped = false; const CAP = 5000;
  for (let start = winFrom; start < winTo && !capped;) {
    if (cancelRef.current) return { hits, N: winTo - winFrom, target, capped, canceled: true };
    const stop = Math.min(start + CHUNK, winTo);
    for (; start < stop && !capped; start++) {
      if (mm === 0 && letters[start] !== target[0]) continue;
      for (const d of dirs) {
        const run = skip => {
          const step = skip * d, end = start + step * (L - 1);
          if (end < winFrom || end >= winTo) return;
          let m = 0;
          for (let k = 0; k < L; k++) { if (letters[start + step * k] !== target[k]) { if (++m > mm) return; } }
          const positions = []; for (let k = 0; k < L; k++) positions.push(start + step * k);
          hits.push({ skip, dir: d, start, positions, mismatches: m });
          if (hits.length >= CAP) capped = true;
        };
        if (skips) { for (let i = 0; i < skips.length && !capped; i++) run(skips[i]); }
        else { for (let skip = skipMin; skip <= skipMax && !capped; skip++) run(skip); }
        if (capped) break;
      }
    }
    onProgress(Math.min(99, Math.round((start - winFrom) / Math.max(1, winTo - winFrom) * 100)));
    await new Promise(r => setTimeout(r, 0));
  }
  hits.sort((a, b) => (a.mismatches - b.mismatches) || (Math.abs(a.skip) - Math.abs(b.skip)));
  return { hits, N: winTo - winFrom, target, capped };
}

// 🔗 אשכול-קרבה **לא-חוסם** — מחפש כל מונח דרך elsSearchChunked (מקטעים+נשימה+ביטול) ואז מרכיב
// את האשכולות (הרכבה קלה). כך גם החיפוש המוצלב לא מקפיא את הדפדפן — תמיד יש לוּדר שניתן לעצור.
async function elsClustersChunked(letters, termsRaw, skipMin, skipMax, dir, mm, opts, onProgress, cancelRef) {
  const norm = termsRaw.map(elsNormalize).filter(t => t.length >= 2);
  const perTerm = [];
  for (let i = 0; i < norm.length; i++) {
    const r = await elsSearchChunked(letters, norm[i], skipMin, skipMax, dir, mm, opts,
      p => onProgress(Math.round((i * 100 + p) / Math.max(1, norm.length))), cancelRef);
    if (cancelRef.current) return { clusters: [], terms: norm, canceled: true };
    perTerm.push({ term: r.target, hits: r.hits });
  }
  const missing = perTerm.filter(p => p.hits.length === 0).map(p => p.term);
  const allTerms = perTerm.map(p => p.term);
  if (missing.length) return { clusters: [], missing, terms: allTerms };
  const sorted = [...perTerm].sort((a, b) => a.hits.length - b.hits.length);
  const anchor = sorted[0], others = sorted.slice(1);
  const center = h => (Math.min(...h.positions) + Math.max(...h.positions)) / 2;
  const clusters = [];
  for (const aHit of anchor.hits.slice(0, 200)) {
    const aC = center(aHit); const picks = [{ term: anchor.term, hit: aHit }]; let ok = true;
    for (const o of others) {
      let best = null, bestD = Infinity;
      for (const h of o.hits) { const d = Math.abs(center(h) - aC); if (d < bestD) { bestD = d; best = h; } }
      if (!best) { ok = false; break; } picks.push({ term: o.term, hit: best });
    }
    if (!ok) continue;
    const allPos = picks.flatMap(p => p.hit.positions);
    clusters.push({ picks, span: Math.max(...allPos) - Math.min(...allPos), anchorHit: aHit });
  }
  clusters.sort((a, b) => a.span - b.span);
  return { clusters: clusters.slice(0, 20), terms: allTerms, anchorTerm: anchor.term };
}

// ✦ משפטים מתחלפים בזמן החיפוש — מתחת ללוגו המהבהב
const ELS_PHRASES = [
  "מצרף את אותיות התורה…", "סורק את הצופן הנסתר…", "כל אות במקומה — רגע…",
  "מודד מרחקים בין המילים…", "1820 — הכל מחובר…", "התורה מדברת במספרים…",
  "מחפש את הרמז שמסתתר…", "פותח את שערי הצופן…",
];
// 🎨 לוח-צבעים לבחירת המשתמש — צובעים כל מונח/דילוג בצבע משלו על המטריצה.
const PAINT = ["#e02424", "#E8C84A", "#2f6df6", "#2f9e44", "#7048e8", "#e8590c", "#d6336c", "#0c8599", "#f08c00", "#343a40"];
const PATTERNS = [["range", "טווח רציף"], ["fib", "פיבונאצ׳י"], ["prime", "ראשוניים"], ["pow2", "חזקות 2"]];
const DIRS = [["both", "↔ שני הכיוונים"], ["fwd", "→ קדימה"], ["back", "← אחורה"]];

// 🔭 מילון-סריקה — מונחים משמעותיים שהמנוע מחפש לבד בתוך המטריצה ומסמן היכן הם **נחתכים**
// עם התוצאה (חולקים תא, בכל כיוון/דילוג). יושר: רשימה קבועה, מסומן רק חיתוך ממשי — לא ניחוש,
// לא יצירת-מונחים. מונח רב-מילים מנורמל לרצף-אותיות (כמו כל חיפוש דילוג). אפשר להרחיב בעתיד מ-DB.
const ELS_DICT = [
  // שמות וכינויים
  "יהוה", "אלהים", "אדני", "אהיה", "אל שדי", "שדי", "צבאות", "אל", "יה", "אלוה", "רחום", "חנון", "הקדוש ברוך הוא",
  // גאולה ומשיח
  "משיח", "משיח בן דוד", "משיח בן יוסף", "בן דוד", "גאולה", "גואל", "גאל ישראל", "קץ", "קץ הימים", "ביאת המשיח",
  "ימות המשיח", "מלך המשיח", "תחית המתים", "יום הדין", "אחרית הימים", "עולם הבא", "הגאולה השלמה",
  // מקדש וירושלים
  "בית המקדש", "המקדש", "מקדש", "ירושלים", "ציון", "הר הבית", "שכינה", "ארון הברית", "כהן גדול",
  // ספירות
  "כתר", "חכמה", "בינה", "דעת", "חסד", "גבורה", "תפארת", "נצח", "הוד", "יסוד", "מלכות",
  // תורה וקדושה
  "תורה", "תורת אמת", "תורה קדשה", "התורה אמיתית", "אמת", "אמת ויציב", "קדוש", "קדושה", "אור", "אור הגנוז",
  "נשמה", "נשמה יתירה", "אמונה", "תשובה", "אהבה", "יראה", "רחמים", "צדק", "משפט", "שלום", "חיים", "ברכה", "אחד", "יחוד", "אין סוף",
  // דמויות
  "אברהם", "יצחק", "יעקב", "משה", "אהרן", "דוד", "שלמה", "אליהו", "אליהו הנביא", "נח", "יוסף", "אדם", "חוה",
  "שרה", "רבקה", "רחל", "לאה", "מרים", "פנחס", "יהושע", "כלב", "שמואל", "ישעיהו", "ירמיהו", "יחזקאל", "דניאל",
  // יריבים
  "בלעם", "בלק", "עמלק", "פרעה", "המן", "נמרוד", "עשו", "קרח", "סנחריב", "נבוכדנצר",
  // עם ישראל ומועדים
  "ישראל", "עם ישראל", "יהודי", "שבת", "ראש השנה", "יום כפור", "פסח", "שבועות", "סוכות", "חנוכה", "פורים",
  "כהן", "לוי", "מלך", "נביא", "חכם", "צדיק", "גלות", "ארץ ישראל",
];
// מחזיר את כל מופעי `target` שעוברים דרך התא p (בכל דילוג/כיוון נתון) → חיתוך ממשי עם העוגן.
function termPassesThrough(letters, target, p, skips, dirs, N) {
  const L = target.length, out = [];
  if (L < 2) return out;
  for (const s of skips) for (const d of dirs) {
    const step = s * d;
    for (let j = 0; j < L; j++) { // p הוא האות ה-j של המונח → start = p - j·step
      const start = p - j * step, end = start + step * (L - 1);
      if (start < 0 || end < 0 || start >= N || end >= N) continue;
      let ok = true; const pos = [];
      for (let k = 0; k < L; k++) { const idx = start + step * k; if (letters[idx] !== target[k]) { ok = false; break; } pos.push(idx); }
      if (ok) out.push({ skip: s, dir: d, start, positions: pos });
    }
  }
  return out;
}

// ✦ ממצאים נבחרים — «פלאות» שצוריאל ביקש שכל מי שנכנס לתוכנה יראה. נשמרים כאן (אפשר בעתיד מ-DB),
// ולחיצה פותחת אותם במנוע (חיפוש מוצלב), כך שכל אחד יראה את הצופן המקביל במו עיניו.
const FEATURED_FINDINGS = [
  {
    mode: "single",
    title: "תורה קדשה — דילוג נדיר בתורה",
    terms: ["תורה קדשה"],
    skipMin: 10065, skipMax: 10065, autoEnter: true, // ההגדרות שמורות → נפתח מיידית למטריצה
    wonder: "«תורה קדשה» מופיע בכל התורה כדילוג שוות-מרחק פעם אחת בלבד (דילוג 10,065) — נדירות אמיתית. לחיצה פותחת ישר את המטריצה; ואז «🔭 סרוק מילון» מראה מי נחתך איתו.",
    facts: "«תורה קדשה» = 1020 (רגיל) = השגחה פרטית = נשמה יתירה = גילוי השכינה לישראל. אין אותיות סופיות — לכן הגדול שווה לרגיל.",
    by: "נדיר: מופע יחיד בתורה · אומת במנוע",
  },
];

export default function ElsGrid({ seed }) {
  const { isAdmin } = useAuth();
  // ⚡ ביצועים: התורה (304,805 · 600KB) נטענת תמיד ומהר. התנ״ך המלא (1.2M · 2.4MB)
  // נטען בעצלתיים — *רק* כשבוחרים היקף שמעבר לתורה (נביאים/כתובים/כל-התנ״ך).
  const [torahLetters, setTorahLetters] = useState("");
  const [tanakhLetters, setTanakhLetters] = useState("");
  const [tanakhBusy, setTanakhBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [zoom, setZoom] = useState(1);       // זום למטריצה
  const [gridSize, setGridSize] = useState(1); // גודל-הרשת ×1/×2/×3 — קטן כברירת-מחדל; מרחיבים בלחיצה
  const matrixDrag = useRef(null);           // גרירת-עכבר לתזוזה אופקית במטריצה
  const dragMoved = useRef(false);           // האם זזנו (כדי להבדיל גרירה מקליק)
  const [selectMode, setSelectMode] = useState(false); // מצב בחירה-ידנית של אותיות
  const [selCells, setSelCells] = useState([]);        // אינדקסי-אותיות שנבחרו (לפי סדר לחיצה)
  const [cellBgIdx, setCellBgIdx] = useState(0); // רקע האותיות
  const [aiStruct, setAiStruct] = useState(null); // ניתוח-מבנה AI (אדמין)
  const [niqqud, setNiqqud] = useState(false);   // ניקוד אופציונלי
  const [nqData, setNqData] = useState(null);    // שכבת-הניקוד (נטענת בעצלתיים)
  const [nqBusy, setNqBusy] = useState(false);
  const toggleNiqqud = async () => {
    if (!niqqud && !nqData) { setNqBusy(true); const d = await getTorahNiqqud(); setNqData(d); setNqBusy(false); if (!d) return; }
    setNiqqud(v => !v);
  };
  const [raw, setRaw] = useState(seed || "ישראל");
  const [crossExtra, setCrossExtra] = useState([""]); // מונחים נוספים בחיפוש מוצלב (שני · שלישי · רביעי)
  const [mode, setMode] = useState("torah");   // torah · tanakh · cross — שער-הכניסה
  const [entered, setEntered] = useState(false); // false=מסך-תוצאות פשוט · true=סביבת-המטריצה
  const [showAll, setShowAll] = useState(false); // הצג את כל התוצאות (לא רק ה-7 הראשונות)
  const [advOpen, setAdvOpen] = useState(false); // הגדרות מתקדמות (דילוג/כיוון/ספר) — מקופל
  const [book, setBook] = useState("torah"); // ברירת-מחדל: תורה (מהיר). תנ״ך = בחירה מפורשת.
  const [skipMin, setSkipMin] = useState(1);
  const [skipMax, setSkipMax] = useState(2000);
  const [pattern, setPattern] = useState("range");
  const [dir, setDir] = useState("both");
  const [fuzzy, setFuzzy] = useState(false);
  const [hitIdx, setHitIdx] = useState(0);
  const [clusterIdx, setClusterIdx] = useState(0);
  const [full, setFull] = useState(false);
  const [subRaw, setSubRaw] = useState("");   // קלט להוספת שכבה
  const [overlays, setOverlays] = useState([]); // 🔢 שכבות-חיפוש: מערך מונחים (מנורמלים) על אותה מטריצה
  const [layersOpen, setLayersOpen] = useState(false); // פאנל-השכבות מכווץ כברירת-מחדל; נפתח לחיפוש-משולב
  // 📌 הממצאים שלי — טבלה אישית: מוסיפים/מוחקים ידנית ממצאים (אותיות/ביטויים), נשמר ב-localStorage
  const [findings, setFindings] = useState(() => { try { return JSON.parse(localStorage.getItem("els_findings") || "[]"); } catch { return []; } });
  const [findRaw, setFindRaw] = useState("");
  const persistFindings = arr => { setFindings(arr); try { localStorage.setItem("els_findings", JSON.stringify(arr)); } catch { /**/ } };
  const addFinding = (txt) => { const t = (txt ?? findRaw).trim(); if (t && !findings.includes(t)) { persistFindings([t, ...findings].slice(0, 60)); setFindRaw(""); } };
  const removeFinding = t => persistFindings(findings.filter(x => x !== t));
  const [paint, setPaint] = useState({});     // 🎨 צבע-לפי-מונח (term → hex); ריק = ברירת-מחדל
  const [paintOpen, setPaintOpen] = useState(null); // איזה מונח פתוח-לבחירת-צבע
  const [savedSearches, setSavedSearches] = useState(() => { try { return JSON.parse(localStorage.getItem("els_saved") || "[]"); } catch { return []; } });
  const persistSaved = arr => { setSavedSearches(arr); try { localStorage.setItem("els_saved", JSON.stringify(arr)); } catch { /**/ } };
  const [q, setQ] = useState({ raw: seed || "ישראל", book: "torah", skipMin: 1, skipMax: 2000, pattern: "range", dir: "both", fuzzy: false });

  // האם ההיקף הנבחר חורג מהתורה (304,805) → צריך את קובץ-התנ״ך המלא
  const needTanakh = (TANAKH_BOOKS.find(b => b.key === q.book)?.to ?? 0) > 304805;
  const letters = needTanakh ? tanakhLetters : torahLetters;

  // זריעה ממסע-החיפוש: מונח חדש ב-URL → טוען ומריץ אוטומטית
  useEffect(() => { if (seed) { setRaw(seed); setHitIdx(0); setClusterIdx(0); setQ(p => ({ ...p, raw: seed })); } }, [seed]);

  // טעינת התורה — תמיד, בכניסה (קטן ומהיר)
  useEffect(() => {
    let ok = true;
    fetch("/torah-letters.txt", { headers: { Accept: "text/plain" } })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(t => { if (!ok) return; const c = elsNormalize(t); c.length > 1000 ? setTorahLetters(c) : setErr(true); })
      .catch(() => ok && setErr(true));
    return () => { ok = false; };
  }, []);

  // טעינת התנ״ך המלא — בעצלתיים, רק כשנדרש (פעם אחת)
  useEffect(() => {
    if (!needTanakh || tanakhLetters || tanakhBusy) return;
    let ok = true; setTanakhBusy(true);
    fetch("/tanakh-letters.txt", { headers: { Accept: "text/plain" } })
      .then(r => r.ok ? r.text() : Promise.reject(r.status))
      .then(t => { if (!ok) return; const c = elsNormalize(t); if (c.length > 1000) setTanakhLetters(c); else setErr(true); setTanakhBusy(false); })
      .catch(() => { if (ok) { setErr(true); setTanakhBusy(false); } });
    return () => { ok = false; };
  }, [needTanakh, tanakhLetters, tanakhBusy]);

  // ESC סוגר מסך-מלא
  useEffect(() => {
    if (!full) return;
    const h = e => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [full]);

  const terms = useMemo(() => q.raw.split(/[,\n]/).map(s => s.trim()).filter(s => elsNormalize(s).length >= 2), [q.raw]);
  const isCluster = terms.length >= 2;

  // 🔎 חיפוש דחוי (א-סינכרוני) — מציגים לוּדר עם הלוגו המהבהב לפני החישוב הכבד, ומחשבים בטיק הבא.
  const [res, setRes] = useState(null);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const stopSearch = () => { cancelRef.current = true; setSearching(false); };
  useEffect(() => {
    if (!letters || !terms.length) { setRes(null); setSearching(false); return; }
    cancelRef.current = false;
    setSearching(true); setProgress(0);
    setPhraseIdx(i => (i + 1) % ELS_PHRASES.length);
    let alive = true;
    const bk = TANAKH_BOOKS.find(b => b.key === q.book) || TANAKH_BOOKS[0];
    const mm = q.fuzzy ? 1 : 0;
    const sMin = Math.max(1, q.skipMin ?? 1), sMax = Math.max(sMin, Math.max(3, q.skipMax));
    const opts = { winFrom: bk.from, winTo: Math.min(letters.length, bk.to), skips: buildSkipSet(q.pattern, sMin, sMax) };
    if (isCluster) {
      // מוצלב: אשכול-קרבה **לא-חוסם** (מקטעים+נשימה+ביטול) → הדפדפן לא נתקע, ויש לוּדר עם אחוזים ועצירה.
      elsClustersChunked(letters, terms, sMin, sMax, q.dir, mm, opts, p => { if (alive) setProgress(p); }, cancelRef)
        .then(r => { if (!alive || cancelRef.current) return; setRes({ mode: "cluster", ...r }); setSearching(false); });
      return () => { alive = false; cancelRef.current = true; };
    }
    // יחיד: חיפוש מנותח-למקטעים → אחוזים + עצירה
    elsSearchChunked(letters, terms[0], sMin, sMax, q.dir, mm, opts, p => { if (alive) setProgress(p); }, cancelRef)
      .then(r => { if (!alive || cancelRef.current) return; setRes({ mode: "single", ...r }); setSearching(false); });
    return () => { alive = false; cancelRef.current = true; };
  }, [letters, q, terms, isCluster]);

  // החיפוש מתחשב במצב: רגיל = מונח אחד · מוצלב = שני מונחים יחד (אשכול-קרבה)
  const search = () => {
    const qraw = mode === "cross" ? [raw, ...crossExtra].map(s => s.trim()).filter(Boolean).join(", ") : raw;
    const bk = mode === "tanakh" ? (book === "torah" ? "all" : book) : (mode === "torah" && book !== "torah" && (TANAKH_BOOKS.find(b => b.key === book)?.to ?? 0) > 304805 ? "torah" : book);
    setHitIdx(0); setClusterIdx(0); setOverlays([]); setLayersOpen(false); setSubRaw(""); setAiStruct(null);
    setEntered(false); setShowAll(false);
    const sMin = Math.max(1, parseInt(skipMin) || 1);
    const sMax = Math.max(sMin, parseInt(skipMax) || 100);
    setQ({ raw: qraw, book: bk, skipMin: sMin, skipMax: sMax, pattern, dir, fuzzy });
  };
  // החלפת-מצב משער-הכניסה: קובעת היקף-ברירת-מחדל (תורה/תנ״ך) ומאפסת תוצאה
  const switchMode = m => { setMode(m); setEntered(false); if (m === "tanakh") setBook("all"); else setBook("torah"); };
  // ✦ פתיחת ממצא-נבחר במנוע — טוען את המונחים כחיפוש מוצלב בתורה ומריץ מיד (q מפעיל את אפקט-החיפוש)
  const openFinding = (f) => {
    const single = f.mode === "single" || f.terms.length < 2;
    setMode(single ? "torah" : "cross"); setBook(f.book || "torah");
    setRaw(f.terms[0]); setCrossExtra(single ? [""] : f.terms.slice(1));
    setHitIdx(0); setClusterIdx(0); setOverlays([]); setLayersOpen(false); setSubRaw(""); setAiStruct(null); setShowAll(false);
    // 🎯 ההגדרות שמורות בתוך הממצא — טווח-דילוג מדויק (מ-…עד-…) → החיפוש מיידי, בלי לכוונן שוב.
    const sMin = Math.max(1, f.skipMin || 1), sMax = Math.max(sMin, f.skipMax || 2000);
    setSkipMin(String(sMin)); setSkipMax(String(sMax));
    setEntered(!!f.autoEnter); // אם שמור — נכנסים ישר למטריצה, לא למסך-תוצאות
    setQ({ raw: single ? f.terms[0] : f.terms.join(", "), book: f.book || "torah", skipMin: sMin, skipMax: sMax, pattern, dir, fuzzy });
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /**/ }
  };
  // הוספת שכבה חדשה (מונח) למטריצה; הסרה; ניקוי
  const addOverlay = (raw) => { const t = elsNormalize(typeof raw === "string" ? raw : subRaw); if (t.length >= 2 && !overlays.includes(t)) { setOverlays(o => [...o, t]); if (typeof raw !== "string") setSubRaw(""); setLayersOpen(true); } };
  const removeOverlay = t => setOverlays(o => o.filter(x => x !== t));

  // 💾 שמירת חיפושים — כמה חיפושים שמורים (localStorage), נראים גם בקיר הימני
  const saveCurrent = () => {
    // 💾 שומר את כל המטריצה — החיפוש + שכבות-החיפוש שהוספת (overlays)
    const id = [q.raw, q.skipMin, q.skipMax, q.book, q.dir, q.pattern, q.fuzzy ? 1 : 0, overlays.join("+")].join("|");
    if (savedSearches.some(s => s.id === id)) return;
    const label = q.raw + (overlays.length ? ` +${overlays.length}` : "");
    // 💾 שומר את **כל** ההגדרות (כולל טווח-דילוג) + השכבות → טעינה פותחת ישר את הממצא, בלי לכוונן שוב
    persistSaved([{ id, label, q: { ...q }, overlays: [...overlays] }, ...savedSearches].slice(0, 24));
  };
  const removeSaved = id => persistSaved(savedSearches.filter(s => s.id !== id));
  const loadSaved = useCallback(sv => {
    const c = sv?.q; if (!c) return;
    setRaw(c.raw); setBook(c.book); setSkipMin(c.skipMin ?? 1); setSkipMax(c.skipMax); setPattern(c.pattern); setDir(c.dir); setFuzzy(!!c.fuzzy);
    const ov = Array.isArray(sv.overlays) ? sv.overlays : [];
    setHitIdx(0); setClusterIdx(0); setOverlays(ov); setLayersOpen(ov.length > 0); setSubRaw(""); setAiStruct(null);
    setEntered(true); // טעינת ממצא שמור → ישר למטריצה (ההגדרות כבר בפנים)
    setQ({ raw: c.raw, book: c.book, skipMin: c.skipMin ?? 1, skipMax: c.skipMax, pattern: c.pattern, dir: c.dir, fuzzy: !!c.fuzzy });
  }, []);
  // הקיר הימני מבקש לטעון חיפוש שמור → מיישמים כאן
  useEffect(() => on(EVENTS.ELS_LOAD, loadSaved), [loadSaved]);

  const locOf = useCallback(idx => {
    const b = TANAKH_BOOKS.filter(x => x.section).find(b => idx >= b.from && idx < b.to);
    if (!b) return { label: "—", off: idx, pct: 0 };
    return { label: b.label, off: idx - b.from, pct: Math.round(((idx - b.from) / (b.to - b.from)) * 100) };
  }, []);

  // העוגן הפעיל לפי המצב (single→hitIdx · cluster→clusterIdx)
  const anchorHit = useMemo(() => {
    if (!res) return null;
    if (res.mode === "single") return (res.hits || [])[Math.min(hitIdx, (res.hits?.length || 1) - 1)] || null;
    const cl = (res.clusters || [])[Math.min(clusterIdx, (res.clusters?.length || 1) - 1)];
    return cl ? cl.picks[0].hit : null;
  }, [res, hitIdx, clusterIdx]);

  const centerOf = h => (Math.min(...h.positions) + Math.max(...h.positions)) / 2;

  // 🪟 חלון-המטריצה (טווח-אותיות הנראה) — לפי העוגן בלבד. חיפוש-שכבה מוגבל אליו + שוליים →
  // לא סורק את כל הטקסט אלא רק את סביבת המטריצה → מהיר, וגם «קרוב» באמת = ליד מה שרואים.
  const matrixWindow = useMemo(() => {
    if (!anchorHit) return null;
    const s = Math.abs(anchorHit.skip), TARGET = 28;
    const W2 = s <= TARGET ? s * Math.max(1, Math.round(TARGET / s)) : s;
    const minP = Math.min(...anchorHit.positions), maxP = Math.max(...anchorHit.positions);
    const firstRow = Math.floor(minP / W2), lastRow = Math.floor(maxP / W2);
    const rowStart = firstRow - 4, rowEnd = Math.min(lastRow + 4, firstRow + 170);
    const margin = W2 * 12; // טיפה יותר בצדדים
    return { from: Math.max(0, rowStart * W2 - margin), to: (rowEnd + 1) * W2 + margin };
  }, [anchorHit]);

  // ---- שכבות-חיפוש — לכל מונח-שכבה מוצאים את המופע הקרוב-ביותר לעוגן, וצובעים על המטריצה ----
  // ⭐ מתחיל מ-skip 1 (כולל טקסט-רצוף) → מונח «צמוד» בכתב המקור (כמו «חג שבעת» ליד «יום משיח בא») נמצא.
  // 🪟 מוגבל לחלון-המטריצה (+שוליים) → לא לוקח זמן, ומחזיר רק את מה שבאמת ליד.
  const overlayData = useMemo(() => {
    if (!letters || !anchorHit || res?.mode !== "single" || !overlays.length) return [];
    const bk = TANAKH_BOOKS.find(b => b.key === q.book) || TANAKH_BOOKS[0];
    // 🛟 חיפוש-השכבות סינכרוני → חוסמים אותו בקשיחות כדי שלעולם לא יתקע: חלון ≤280K סביב העוגן,
    // ותקרת-דילוג 2000 (שכבות = מונחים «קרובים» על המטריצה; דילוג ענק = תפקיד החיפוש המוצלב).
    const aMid = Math.round(centerOf(anchorHit));
    const winFrom = Math.max(bk.from, matrixWindow ? matrixWindow.from : bk.from, aMid - 140000);
    const winTo = Math.min(letters.length, bk.to, matrixWindow ? matrixWindow.to : letters.length, aMid + 140000);
    const oMax = Math.min(Math.max(3, q.skipMax), 2000);
    const opts = { winFrom, winTo, skips: buildSkipSet(q.pattern, 1, oMax) };
    const aC = centerOf(anchorHit);
    return overlays.map((term, j) => {
      const r = elsSearch(letters, term, 1, oMax, q.dir, q.fuzzy ? 1 : 0, opts);
      const list = r.hits.map(h => ({ hit: h, dist: Math.round(Math.abs(centerOf(h) - aC)) })).sort((a, b) => a.dist - b.dist);
      return { term, ci: j + 1, list, nearest: list[0] || null, count: r.hits.length, capped: r.capped,
        within: d => list.filter(x => x.dist <= d).length };
    });
  }, [letters, overlays, q, anchorHit, res, matrixWindow]);

  // ---- מטריצה ----
  const grid = useMemo(() => {
    if (!res || !anchorHit) return null;
    const s = Math.abs(anchorHit.skip), TARGET = 28;
    const W2 = s <= TARGET ? s * Math.max(1, Math.round(TARGET / s)) : s;
    const cl0 = res.mode === "cluster" ? res.clusters[Math.min(clusterIdx, res.clusters.length - 1)] : null;
    // framePos = כל אותיות-התוצאה (יחיד: העוגן · מוצלב: **כל** המונחים) → המסגור מכסה את כולם.
    const framePos = res.mode === "single" ? anchorHit.positions : cl0.picks.flatMap(p => p.hit.positions);
    const minP = Math.min(...framePos), maxP = Math.max(...framePos);
    const firstRow = Math.floor(minP / W2), lastRow = Math.floor(maxP / W2);
    // 📏 מרחב אנכי — תמיד שורות-ריפוד מעל ומתחת לתוצאה (בקשת «מרחב למעלה ולמטה»). התקרה נדיבה
    // כדי שגם בהצלבה שני הקצוות ייכנסו, אך לא בלי-גבול עבור מונח-ענק יחיד.
    const padRows = Math.max(5, 6 * gridSize);
    const rowStart = firstRow - padRows;
    const rowEnd = lastRow + padRows;
    // 📐 חלון-עמודות ממורכז על התוצאה — מרחב מימין ומשמאל (בקשת «מרחב מימין ומשמאל»), ומכסה את
    // **כל** אותיות-התוצאה כך שגם המונח השני/השלישי בהצלבה נכנס, ולא רק העוגן. היסט-קשיח: colStart
    // יכול להיות שלילי (גולש לשורה שכנה) → התבנית נשמרת, רק זזה — והתוצאה ממורכזת ולא בקצה.
    const colsOf = framePos.map(p => ((p % W2) + W2) % W2);
    let cLo = Math.min(...colsOf), cHi = Math.max(...colsOf);
    if ((cHi - cLo) > W2 / 2) { cLo = 0; cHi = W2 - 1; } // טווח שנשבר סביב קצה-הרשת → כל הרוחב
    const colMargin = Math.max(6, 5 * gridSize);
    const colCenter = (cLo + cHi) / 2;
    let colWin = Math.min(W2, (cHi - cLo) + colMargin * 2);
    let colStart = Math.round(colCenter - colWin / 2);
    // אוסף האינדקסים שבאמת נראים על המטריצה (לשימוש בסינון רשימת-ההצלבות לפי «מה גלוי»)
    const visible = new Set();
    for (let r = rowStart; r <= rowEnd; r++) for (let c = 0; c < colWin; c++) { const i = r * W2 + (colStart + c); if (r >= 0 && i >= 0 && i < letters.length) visible.add(i); }
    // צביעה: עוגן=0; וכל מופע-שכבה ש**כולו גלוי** במטריצה → בצבע השכבה (ci). כך רואים את כל ההצלבות שעל המסך.
    const colorMap = new Map();
    if (res.mode === "single") {
      anchorHit.positions.forEach(p => colorMap.set(p, 0));
      overlayData.forEach(o => o.list.forEach(x => { if (x.hit.positions.every(p => visible.has(p))) x.hit.positions.forEach(p => colorMap.set(p, o.ci)); }));
    } else {
      const cl = (res.clusters || [])[Math.min(clusterIdx, res.clusters.length - 1)];
      cl.picks.forEach((pk, i) => pk.hit.positions.forEach(p => colorMap.set(p, i)));
    }
    const rows = [];
    for (let r = rowStart; r <= rowEnd; r++) {
      const cells = [];
      for (let c = 0; c < colWin; c++) {
        const i = r * W2 + (colStart + c);
        cells.push(r >= 0 && i >= 0 && i < letters.length ? { ch: letters[i], ci: colorMap.has(i) ? colorMap.get(i) : -1, op: 1, idx: i } : { ch: "", ci: -1, op: 1, idx: -1 });
      }
      rows.push(cells);
    }
    return { rows, W: W2, skip: s, visible };
  }, [res, anchorHit, clusterIdx, letters, overlayData, gridSize]);

  // קבוצת-אותיות העוגן (לזיהוי «חיתוך אמיתי» — מופע שחולק תא עם התוצאה, כמו «בלעם» שנגע ב-ב)
  const anchorSet = useMemo(() => new Set(anchorHit?.positions || []), [anchorHit]);
  // מופעי-השכבות שגלויים על המטריצה (לרשימת-ההצלבות — «רק מה שרואים»), עם דגל-חיתוך אוטומטי:
  // ⚡ crosses = המופע חולק לפחות תא אחד עם התוצאה (חיתוך גאומטרי ממשי על המטריצה).
  const overlayVisible = useMemo(() => {
    if (!grid || res?.mode !== "single") return [];
    return overlayData.map(o => ({
      ...o,
      vis: o.list.filter(x => x.hit.positions.every(p => grid.visible.has(p)))
        .map(x => ({ ...x, crosses: x.hit.positions.some(p => anchorSet.has(p)) }))
        .sort((a, b) => (b.crosses - a.crosses) || (a.dist - b.dist)),
    }));
  }, [grid, overlayData, res, anchorSet]);
  // ⚡ אוטו-הצלבה: מוסיף את **מילות-התוצאה** (כשכבות) → המנוע מחפש אותן לבד בתוך המטריצה
  // (כולל טקסט-רגיל, skip 1) ומסמן היכן שהן נחתכות עם התוצאה. כך מתגלה אוטומטית מה שצוריאל
  // ראה בעין — «בלעם הרשע» בדילוג שנוגע ב«בלעם» הרגיל. יושר: מסומן רק חיתוך ממשי, לא ניחוש.
  const autoCross = () => {
    const words = (q.raw || "").split(/[\s,]+/).map(w => elsNormalize(w)).filter(w => w.length >= 2);
    const add = words.filter(w => !overlays.includes(w));
    if (add.length) { setOverlays(o => [...o, ...add]); setLayersOpen(true); }
  };
  // 🔭 סריקת-מילון — המנוע עובר על מילון-המונחים ובודק לבד מי מהם **נחתך** עם התוצאה (עובר דרך
  // אחת מאותיותיה, בכל כיוון/דילוג). מחזיר רשימה מדורגת לפי קרבה. זהו ה«אוטו-הצלבה» המלא:
  // לא רק מילות-החיפוש, אלא מילון שלם → המנוע מגלה לבד צפנים-נחתכים כמו «בלעם».
  const [dictScan, setDictScan] = useState(null); // null | {running:true} | {results:[...]}
  const scanDict = () => {
    if (!letters || !anchorHit || res?.mode !== "single") return;
    setDictScan({ running: true });
    setTimeout(() => {
      const N = letters.length;
      const bk = TANAKH_BOOKS.find(b => b.key === q.book) || TANAKH_BOOKS[0];
      const aSkip = Math.abs(anchorHit.skip);
      const skips = [...new Set([1, 2, 3, 4, 5, 7, aSkip].filter(s => s >= 1))];
      const dirs = [1, -1];
      const aC = centerOf(anchorHit);
      const aSet = new Set(anchorHit.positions); // לסינון הכלה-טריוויאלית (תת-מחרוזת של העוגן עצמו)
      const skip0 = new Set(overlays); skip0.add(elsNormalize(terms[0] || ""));
      const found = [];
      for (const rawT of ELS_DICT) {
        const t = elsNormalize(rawT);
        if (t.length < 2 || skip0.has(t)) continue;
        let best = null;
        for (const p of anchorHit.positions) {
          const occ = termPassesThrough(letters, t, p, skips, dirs, N);
          for (const o of occ) {
            if (o.start < bk.from || o.start >= bk.to) continue;
            if (o.positions.every(pos => aSet.has(pos))) continue; // קולינארי לעוגן (חופף לגמרי) — לא חיתוך אמיתי
            const d = Math.abs(centerOf(o) - aC);
            if (!best || d < best.dist) best = { occ: o, dist: d };
          }
        }
        if (best) found.push({ term: t, raw: rawT, skip: Math.abs(best.occ.skip), dir: best.occ.dir, start: best.occ.start, dist: best.dist });
      }
      found.sort((a, b) => a.dist - b.dist || a.term.localeCompare(b.term));
      setDictScan({ results: found });
    }, 30);
  };
  // 🎨 צובע את כל המונחים-הנחתכים על המטריצה (מוסיף כשכבות — נכנסים לרשימת-ההצלבות עם דגל ⚡)
  const colorAllCrossings = () => {
    const add = (dictScan?.results || []).slice(0, 8).map(r => r.term).filter(t => !overlays.includes(t));
    if (add.length) { setOverlays(o => [...o, ...add].slice(0, 14)); setLayersOpen(true); }
  };
  useEffect(() => { setDictScan(null); }, [hitIdx, q]); // איפוס סריקה כשעוברים תוצאה/חיפוש (לא בעת הוספת שכבה)

  // גרירת-עכבר לתזוזה אופקית (pan) — מושבתת במצב-בחירה (אז קליק = בחירת אות)
  const onMatrixDown = e => { if (selectMode) return; const el = e.currentTarget; matrixDrag.current = { x: e.pageX, left: el.scrollLeft }; dragMoved.current = false; el.style.cursor = "grabbing"; };
  const onMatrixMove = e => { if (!matrixDrag.current) return; if (Math.abs(e.pageX - matrixDrag.current.x) > 3) dragMoved.current = true; e.preventDefault(); e.currentTarget.scrollLeft = matrixDrag.current.left - (e.pageX - matrixDrag.current.x); };
  const onMatrixUp = e => { matrixDrag.current = null; e.currentTarget.style.cursor = selectMode ? "crosshair" : "grab"; };
  // קליק על אות במצב-בחירה → הוספה/הסרה מהבחירה (לפי סדר לחיצה)
  const toggleCell = idx => { if (idx < 0) return; setSelCells(c => c.includes(idx) ? c.filter(x => x !== idx) : [...c, idx]); };
  const selLetters = () => selCells.map(i => letters[i] || "").join("");

  // 🎨 צבע לכל שכבה לפי האינדקס (ci) שבמטריצה: single → 0=מונח ראשי · 1=מונח-משני;
  // cluster → i=מונח ה-i. צבע-בחירה של המשתמש (paint[term]) גובר על ברירת-המחדל.
  const cluster0c = res?.mode === "cluster" ? (res.clusters || [])[Math.min(clusterIdx, (res.clusters?.length || 1) - 1)] : null;
  const layerColors = useMemo(() => {
    if (res?.mode === "cluster" && cluster0c) {
      return cluster0c.picks.map((pk, i) => paint[pk.term] || TERM_COLORS[i % TERM_COLORS.length]);
    }
    return [paint[terms[0]] || TERM_COLORS[0], ...overlays.map((t, j) => paint[t] || PAINT[j % PAINT.length])];
  }, [res, cluster0c, terms, overlays, paint]);
  const colorAt = ci => layerColors[ci] || TERM_COLORS[ci % TERM_COLORS.length];

  // נקודת-צבע לחיצה → לוח-צבעים קטן לבחירת צבע למונח (term)
  const paintDot = (term, color) => (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button onClick={() => setPaintOpen(o => o === term ? null : term)} title="בחר צבע למונח" aria-label="בחר צבע"
        style={{ width: 15, height: 15, borderRadius: "50%", background: color, border: "2px solid #fff", boxShadow: `0 0 0 1.5px ${color}`, cursor: "pointer", padding: 0 }} />
      {paintOpen === term && (
        <>
          <span onClick={() => setPaintOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 39 }} />
          <span style={{ position: "absolute", top: "150%", insetInlineStart: 0, zIndex: 40, display: "flex", flexWrap: "wrap", gap: 5, width: 142, padding: 7, background: "var(--card,#fff)", border: "1px solid var(--line,#e6dcc6)", borderRadius: 11, boxShadow: "0 10px 26px rgba(40,30,8,.28)" }}>
            {PAINT.map(c => (
              <button key={c} onClick={() => { setPaint(p => ({ ...p, [term]: c })); setPaintOpen(null); }} title={c}
                style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: c === color ? "2.5px solid #111" : "2px solid #fff", boxShadow: `0 0 0 1px ${c}` }} />
            ))}
          </span>
        </>
      )}
    </span>
  );

  const C = { acc: "var(--acc)", ink: "var(--ink)", ink2: "var(--ink2)", line: "var(--line)", bg: "var(--bg)", accS: "var(--accS)" };
  const ctl = { fontSize: 15, fontWeight: 700, padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, outline: "none", fontFamily: "inherit" };
  const chip = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, padding: "5px 11px", borderRadius: 999, border: `1px solid ${C.line}`, background: C.bg, color: C.ink2 };

  // ---- רשימת התוצאות (עובדה: כמה · איפה) ----
  const ResultsList = () => {
    if (!res) return null;
    if (res.mode === "single") {
      const hits = res.hits || []; if (!hits.length) return null;
      return (
        <div className="els-list">
          <div className="els-list-h">📋 {hits.length}{res.capped ? "+" : ""} מופעים{q.fuzzy ? " (כולל קרובים)" : ""} — לחצו למיקוד</div>
          <div className="els-list-body">
            {hits.slice(0, 80).map((h, i) => {
              const l = locOf(h.start);
              return (
                <button key={i} className={"els-row" + (i === Math.min(hitIdx, hits.length - 1) ? " on" : "")} onClick={() => setHitIdx(i)}>
                  <span className="els-rk">{i + 1}</span>
                  <span className="els-rc">דילוג <b>{Math.abs(h.skip).toLocaleString("he")}</b></span>
                  <span className="els-rc">{h.dir > 0 ? "→" : "←"}</span>
                  <span className="els-rc">{l.label}</span>
                  <span className="els-rc muted">אות {l.off.toLocaleString("he")} · {l.pct}%</span>
                  {h.mismatches > 0 && <span className="els-rc warn">~קרוב</span>}
                </button>
              );
            })}
            {hits.length > 80 && <div className="els-more">…ועוד {hits.length - 80} מופעים. צמצמו דילוג למיקוד.</div>}
          </div>
        </div>
      );
    }
    const cls = res.clusters || []; if (!cls.length) return null;
    return (
      <div className="els-list">
        <div className="els-list-h">📋 {cls.length} אשכולות קרובים — לחצו למיקוד</div>
        <div className="els-list-body">
          {cls.map((cl, i) => {
            const l = locOf(cl.picks[0].hit.start);
            return (
              <button key={i} className={"els-row" + (i === Math.min(clusterIdx, cls.length - 1) ? " on" : "")} onClick={() => setClusterIdx(i)}>
                <span className="els-rk">{i + 1}</span>
                <span className="els-rc">טווח <b>{cl.span.toLocaleString("he")}</b></span>
                <span className="els-rc">{l.label}</span>
                <span className="els-rc muted">{cl.picks.map(p => p.term).join(" · ")}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const theme = CELL_BGS[cellBgIdx];
  // סרגל-תצוגה: זום + בורר-רקע (משותף לרגיל ולמסך-מלא)
  const MatrixTools = () => (
    <div className="els-mtools">
      <span className="els-mt-lb">זום</span>
      <button className="els-mt-b" onClick={() => setZoom(z => Math.max(0.25, +(z - 0.15).toFixed(2)))} title="הרחק (זום אאוט)">−</button>
      <span className="els-mt-z">{Math.round(zoom * 100)}%</span>
      <button className="els-mt-b" onClick={() => setZoom(z => Math.min(3.5, +(z + 0.15).toFixed(2)))} title="התקרב (זום אין)">+</button>
      {zoom !== 1 && <button className="els-mt-b" onClick={() => setZoom(1)} title="איפוס">⟳</button>}
      <span className="els-mt-sep" />
      <span className="els-mt-lb">גודל-רשת</span>
      {[1, 2, 3].map(n => <button key={n} className={"els-mt-nq" + (gridSize === n ? " on" : "")} onClick={() => setGridSize(n)} title={`רשת ×${n} — יותר שורות/עמודות`}>×{n}</button>)}
      <span className="els-mt-sep" />
      <button className={"els-mt-nq" + (selectMode ? " on" : "")} onClick={() => setSelectMode(m => !m)} title="בחירה ידנית: לוחצים על אותיות לסימון, ואז «שמור בחירה»">✋ בחירה</button>
      {selectMode && selCells.length > 0 && <>
        <span className="els-mt-z" dir="rtl" style={{ minWidth: 0, color: "#2f6df6", fontWeight: 800 }}>«{selLetters()}»</span>
        <button className="els-mt-nq" onClick={() => { addFinding(selLetters()); setSelCells([]); }} title="שמור את הבחירה לטבלת-הממצאים">➕ שמור בחירה</button>
        <button className="els-mt-b" onClick={() => setSelCells([])} title="נקה בחירה">✕</button>
      </>}
      <span className="els-mt-sep" />
      <span className="els-mt-lb">רקע</span>
      {CELL_BGS.map((c, i) => <button key={i} className={"els-swatch" + (i === cellBgIdx ? " on" : "")} style={{ background: c.bg === "var(--bg)" ? "var(--bg)" : c.bg }} onClick={() => setCellBgIdx(i)} title={c.label} aria-label={c.label} />)}
      <span className="els-mt-sep" />
      <button className={"els-mt-nq" + (niqqud ? " on" : "")} onClick={toggleNiqqud} disabled={nqBusy} title="ניקוד אופציונלי">{nqBusy ? "טוען ניקוד…" : niqqud ? "ניקוד ✓" : "נַקֵּד"}</button>
    </div>
  );
  // ---- ציור המטריצה (משותף: רגיל + מסך-מלא) ----
  const Matrix = ({ big }) => {
    if (!grid) return null;
    const sz = Math.round((big ? 38 : 30) * zoom), h = Math.round((big ? 42 : 34) * zoom), fs = Math.round((big ? 25 : 20) * zoom);
    return (
      <div className="els-matrix" style={{ overflow: "auto", display: "flex", justifyContent: "safe center", cursor: selectMode ? "crosshair" : "grab" }}
        onMouseDown={onMatrixDown} onMouseMove={onMatrixMove} onMouseUp={onMatrixUp} onMouseLeave={onMatrixUp}>
        <div style={{ display: "inline-grid", gap: 3, background: theme.bg, padding: 8, borderRadius: 10 }}>
          {grid.rows.map((row, r) => (
            <div key={r} dir="rtl" style={{ display: "flex", gap: 3 }}>
              {row.map((cell, c) => {
                const col = cell.ci >= 0 ? colorAt(cell.ci) : null;
                const sel = selectMode && cell.idx >= 0 && selCells.includes(cell.idx);
                const bg = sel ? "#2f6df6" : col ? (cell.op < 1 ? hexA(col, cell.op) : col) : theme.bg;
                const glyph = niqqud && nqData && cell.idx >= 0 ? cell.ch + (nqData[cell.idx] || "") : cell.ch;
                return <div key={c}
                  onClick={selectMode ? (() => { if (!dragMoved.current) toggleCell(cell.idx); }) : undefined}
                  style={{ width: sz, height: h, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Frank Ruhl Libre', serif", fontSize: fs, fontWeight: (col || sel) ? 800 : 500, borderRadius: 6, overflow: "visible",
                  cursor: selectMode && cell.idx >= 0 ? "pointer" : "inherit",
                  color: sel ? "#fff" : col ? (cell.op < 0.55 ? "#3a1418" : "#fff") : theme.fg,
                  background: bg, border: sel ? "2px solid #1b4fd1" : `1px solid ${col ? hexA(col, cell.op) : (theme.bg === "var(--bg)" ? C.line : "transparent")}` }}>{glyph}</div>;
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const cluster0 = res?.mode === "cluster" ? (res.clusters || [])[Math.min(clusterIdx, (res.clusters?.length || 1) - 1)] : null;

  // 📡 מפרסמים את מצב התוצאות לקיר הימני (Event Bus) — שם רואים תוצאות-דילוג + חיפושים שמורים
  const savedMeta = useMemo(() => savedSearches.map(s => ({ id: s.id, label: s.label })), [savedSearches]);
  const elsSummary = useMemo(() => {
    const base = { saved: savedMeta };
    if (!res) return { ...base, has: false };
    if (res.mode === "single") {
      const h = anchorHit;
      return {
        ...base, has: true, mode: "single", term: elsNormalize(terms[0] || ""),
        skip: h ? Math.abs(h.skip) : 0, dir: h ? h.dir : 1, count: res.hits.length, capped: res.capped,
        loc: h ? locOf(h.start) : null,
        hits: (res.hits || []).slice(0, 24).map(x => ({ skip: Math.abs(x.skip), dir: x.dir, ...locOf(x.start), mm: x.mismatches })),
        sub: overlayData[0] ? { term: overlayData[0].term, count: overlayData[0].count, nearest: overlayData[0].nearest?.dist ?? null, w1000: overlayData[0].within(1000), w5000: overlayData[0].within(5000),
          list: overlayData[0].list.slice(0, 16).map(x => ({ dist: x.dist, skip: Math.abs(x.hit.skip), ...locOf(x.hit.start) })) } : null,
        overlays: overlayData.map(o => ({ term: o.term, nearest: o.nearest?.dist ?? null, count: o.count })),
      };
    }
    return { ...base, has: true, mode: "cluster", terms,
      clusters: (res.clusters || []).slice(0, 10).map(cl => ({ span: cl.span, ...locOf(cl.picks[0].hit.start), picks: cl.picks.map(p => ({ term: p.term, skip: Math.abs(p.hit.skip) })) })) };
  }, [res, anchorHit, overlayData, terms, savedMeta, locOf]);
  useEffect(() => { emit(EVENTS.ELS_STATE, elsSummary); }, [elsSummary]);
  useEffect(() => () => emit(EVENTS.ELS_STATE, null), []); // ניקוי בעת עזיבה

  // 🤖 ניתוח-מבנה האשכול ב-AI (אדמין בלבד) — בוחרים כמה מונחים, ה-AI מפרש את המבנה.
  // שולח עובדות שכבר חושבו (מונחים · דילוגים · טווח · מיקום) → פרשנות. לא מחשב, לא מכריע.
  const runStructAi = async () => {
    if (!cluster0) return;
    setAiStruct({ loading: true });
    try {
      const picks = cluster0.picks.map(p => ({ term: p.term, skip: Math.abs(p.hit.skip), dir: p.hit.dir > 0 ? "קדימה" : "אחורה", book: locOf(p.hit.start).label, letter: locOf(p.hit.start).off }));
      const input = { type: "els_cluster", terms, span: cluster0.span, book: locOf(cluster0.picks[0].hit.start).label, picks };
      const { data, error } = await supabase.functions.invoke("field-router", { body: { input, core_values: computeEntity(terms.join(" ")).values, lenses: ["journey"] } });
      if (error) throw error;
      if (data?.gated) setAiStruct({ msg: data.reason === "rate" ? "מכסת ההרצות היומית מוצתה." : "אין הרשאה (התחבר כאדמין)." });
      else { const o = (data?.outputs || []).find(x => x.out)?.out; o ? setAiStruct({ out: o }) : setAiStruct({ msg: "המודל לא החזיר פלט תקין." }); }
    } catch (e) { setAiStruct({ msg: "שגיאה: " + (e?.message || String(e)).slice(0, 80) }); }
  };

  return (
    <div>
      <style>{ELS_CSS}</style>
      <div className="rw-h1">🔡 הצופן התנ״כי — דילוגי אותיות</div>

      {/* ✦ ממצא נבחר — כל מי שנכנס רואה את הפלא, ובלחיצה פותח אותו במנוע */}
      {FEATURED_FINDINGS.length > 0 && (
        <div className="els-featured">
          {FEATURED_FINDINGS.map((f, i) => (
            <div key={i} className="els-feat-card">
              <div className="els-feat-badge">✦ פלא נבחר</div>
              <div className="els-feat-title">{f.title}</div>
              <div className="els-feat-wonder">{f.wonder}</div>
              <div className="els-feat-facts">🔢 {f.facts}</div>
              <div className="els-feat-row">
                <button className="els-feat-go" onClick={() => openFinding(f)}>✦ פתח את הממצא במנוע ←</button>
                {f.by && <span className="els-feat-by">{f.by}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🚪 שער-כניסה — 3 אפשרויות ברורות (תורה חינם · תנ״ך/מוצלב = טוקנים) */}
      <div className="els-modes">
        {[
          { k: "torah", e: "📖", t: "חיפוש בתורה", s: "אמיתי וידוע" },
          { k: "tanakh", e: "📜", t: "חיפוש בכל התנ״ך", s: "רחב יותר" },
          { k: "cross", e: "✦", t: "חיפוש מוצלב", s: "שניים יחד" },
        ].map(m => (
          <button key={m.k} className={"els-mode" + (mode === m.k ? " on" : "")} onClick={() => switchMode(m.k)}>
            <span className="els-mode-e">{m.e}</span>
            <span className="els-mode-t">{m.t}</span>
            <span className="els-mode-s">{m.s}</span>
            <span className="els-mode-tok">{tokenLabel(m.k, isAdmin)}</span>
          </button>
        ))}
      </div>
      <div className="rw-sub" style={{ marginBottom: 10 }}>
        {mode === "torah" ? "חיפוש דילוגים בכל התורה (304,805 אותיות) — הטקסט הקבוע והמאומת."
          : mode === "tanakh" ? "חיפוש בכל 24 ספרי התנ״ך — רחב יותר, אך פחות ודאי (לא תמיד יודעים את המילים)."
          : "שני מונחים יחד (שם+משפחה · שני שמות) — המנוע מוצא את הקרבה המקסימלית ביניהם בטקסט."}
      </div>

      <div className="rw-card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...ctl, flex: "1 1 200px", textAlign: "center", fontSize: 17 }} dir="rtl" value={raw}
            onChange={e => setRaw(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
            placeholder={mode === "cross" ? "מונח ראשון (שם)…" : "מילה · שם · ביטוי…"} aria-label="מונח לחיפוש" />
          {mode === "cross" && crossExtra.map((val, i) => (
            <React.Fragment key={i}>
              <span style={{ color: C.acc, fontWeight: 800 }}>✦</span>
              <input style={{ ...ctl, flex: "1 1 150px", textAlign: "center", fontSize: 17 }} dir="rtl" value={val}
                onChange={e => setCrossExtra(a => a.map((x, j) => j === i ? e.target.value : x))}
                onKeyDown={e => e.key === "Enter" && search()}
                placeholder={["מונח שני…", "מונח שלישי…", "מונח רביעי…"][i] || "מונח נוסף…"} aria-label={`מונח ${i + 2}`} />
              {crossExtra.length > 1 && <button onClick={() => setCrossExtra(a => a.filter((_, j) => j !== i))} title="הסר מונח"
                style={{ cursor: "pointer", border: `1px solid ${C.line}`, background: C.bg, color: C.ink2, borderRadius: 999, width: 34, height: 34, fontWeight: 800, fontFamily: "inherit" }}>✕</button>}
            </React.Fragment>
          ))}
          {mode === "cross" && crossExtra.length < 3 && (
            <button onClick={() => setCrossExtra(a => [...a, ""])} title="הוסף מונח שלישי/רביעי לחיפוש המוצלב"
              style={{ cursor: "pointer", border: `1.5px dashed ${C.acc}`, background: C.bg, color: C.acc, borderRadius: 999, padding: "9px 15px", fontWeight: 800, fontSize: 14, fontFamily: "inherit" }}>➕ מונח</button>
          )}
          <button onClick={search} style={{ cursor: "pointer", border: "none", background: C.acc, color: "#fff", fontWeight: 800, fontSize: 15, borderRadius: 999, padding: "10px 26px", fontFamily: "inherit" }}>🔍 חפש</button>
          <button onClick={saveCurrent} title="שמור את החיפוש הזה" style={{ cursor: "pointer", border: `1px solid ${C.line}`, background: C.bg, color: C.ink2, fontWeight: 800, fontSize: 14, borderRadius: 999, padding: "10px 16px", fontFamily: "inherit" }}>💾 שמור</button>
        </div>
        {savedSearches.length > 0 && (
          <div className="els-saved">
            <span className="els-saved-lb">שמורים:</span>
            {savedSearches.map(s => (
              <span key={s.id} className="els-saved-chip">
                <button className="els-saved-load" onClick={() => loadSaved(s)} title="טען חיפוש">{s.label}</button>
                <button className="els-saved-x" onClick={() => removeSaved(s.id)} title="הסר">✕</button>
              </span>
            ))}
          </div>
        )}
        <button className="els-adv-toggle" onClick={() => setAdvOpen(o => !o)}>{advOpen ? "▾" : "▸"} הגדרות מתקדמות <span className="rw-muted" style={{ fontWeight: 600 }}>· דילוג · כיוון · ספר · תבנית</span></button>
        {advOpen && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
            <select style={{ ...ctl, cursor: "pointer" }} value={book} onChange={e => setBook(e.target.value)}>
              {TANAKH_BOOKS.filter(b => !b.section).map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
              {["תורה", "נביאים", "כתובים"].map(sec => (
                <optgroup key={sec} label={sec}>
                  {TANAKH_BOOKS.filter(b => b.section === sec).map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
                </optgroup>
              ))}
            </select>
            <select style={{ ...ctl, cursor: "pointer" }} value={pattern} onChange={e => setPattern(e.target.value)}>{PATTERNS.map(([k, l]) => <option key={k} value={k}>דילוג: {l}</option>)}</select>
            <select style={{ ...ctl, cursor: "pointer" }} value={dir} onChange={e => setDir(e.target.value)}>{DIRS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, display: "flex", alignItems: "center", gap: 4 }} title="טווח-דילוג: מ-X עד Y. לקיבוע מרחק מדויק — הזינו אותו מספר בשני השדות (למשל 10065–10065).">דילוג מ-
              <input style={{ ...ctl, width: 78 }} type="number" min="1" value={skipMin} onChange={e => setSkipMin(e.target.value)} />
              עד
              <input style={{ ...ctl, width: 90 }} type="number" min="1" value={skipMax} onChange={e => setSkipMax(e.target.value)} /></label>
            <label className="els-chk" style={{ color: C.ink2 }}>
              <input type="checkbox" checked={fuzzy} onChange={e => setFuzzy(e.target.checked)} /> כולל קרובים (±אות)
            </label>
          </div>
        )}
      </div>

      {!letters && !err && <div className="rw-card rw-muted" style={{ marginTop: 12 }}>{needTanakh ? "טוען את התנ״ך המלא (פעם אחת)…" : "טוען את אותיות התורה…"}</div>}
      {err && <div className="rw-card" style={{ marginTop: 12, color: "#b4453a" }}>שגיאה בטעינת הטקסט.</div>}

      {/* ⏳ לוּדר חיפוש — לוגו מהבהב + אחוזים + עצירה */}
      {searching && (
        <div className="rw-card els-loading">
          <div className="els-loading-ring"><img src={LOGO_URL} alt="" className="els-loading-logo" /></div>
          <div className="els-loading-msg">{ELS_PHRASES[phraseIdx]}</div>
          <div className="els-loading-sub">סורק את אותיות {needTanakh ? "התנ״ך המלא" : "התורה"}… {progress}%</div>
          <div className="els-loading-bar"><span style={{ width: `${progress}%` }} /></div>
          <button className="els-back" style={{ marginTop: 4 }} onClick={stopSearch}>✕ עצור חיפוש</button>
        </div>
      )}

      {/* ===== מסך-תוצאות פשוט — לפני כניסה למטריצה (לחיצה על תוצאה = כניסה) ===== */}
      {res && !entered && !searching && (
        <div className="rw-card" style={{ marginTop: 12 }}>
          {res.mode === "single" ? (
            !res.hits?.length
              ? <div className="rw-muted">«{elsNormalize(terms[0] || "")}» לא נמצא כדילוג עד {q.skipMax}. נסו דילוג גדול יותר{!q.fuzzy ? ", או «כולל קרובים»" : ""}.</div>
              : <>
                  <div className="els-res-h">✦ נמצאו <b>{res.hits.length}{res.capped ? "+" : ""}</b> מופעים של «{elsNormalize(terms[0])}» — לחצו לפתיחת המטריצה</div>
                  <div className="els-res-list">
                    {res.hits.slice(0, showAll ? 60 : 7).map((h, i) => { const l = locOf(h.start); return (
                      <button key={i} className="els-res-row" onClick={() => { setHitIdx(i); setEntered(true); }}>
                        <span className="els-rk">{i + 1}</span>
                        <span>דילוג <b>{Math.abs(h.skip).toLocaleString("he")}</b></span>
                        <span>{h.dir > 0 ? "→" : "←"}</span>
                        <span>{l.label}</span>
                        <span className="rw-muted" style={{ marginInlineStart: "auto" }}>אות {l.off.toLocaleString("he")} · {l.pct}%{h.mismatches > 0 ? " · ~" : ""}</span>
                        <span className="els-res-go">פתח ←</span>
                      </button>
                    ); })}
                  </div>
                  {res.hits.length > 7 && !showAll && <button className="els-combine-btn" onClick={() => setShowAll(true)}>פתח את כל ה-{res.hits.length} מופעים →</button>}
                </>
          ) : (
            res.missing?.length
              ? <div className="rw-muted">לא נמצאו כדילוג: {res.missing.join(" · ")}. הגדילו דילוג או «כולל קרובים».</div>
              : !res.clusters?.length
                ? <div className="rw-muted">המונחים נמצאו, אך לא בקרבה. הגדילו דילוג.</div>
                : <>
                    <div className="els-res-h">✦ {terms.join(" × ")} — <b>{res.clusters.length}</b> הצלבות, ממוין לפי קרבה · לחצו לפתיחה</div>
                    <div className="els-res-list">
                      {res.clusters.slice(0, showAll ? 60 : 10).map((cl, i) => {
                        const l = locOf(cl.picks[0].hit.start);
                        const pct = Math.round(100 * Math.exp(-cl.span / 5000)); // קרבה: צמוד=גבוה
                        const tag = pct >= 70 ? { t: "🟢 צמוד", c: "#1f7a4d" } : pct >= 30 ? { t: "🟡 קרוב", c: "#b07d12" } : { t: "⚪ רחוק", c: "#8a8a8a" };
                        return (
                          <button key={i} className="els-res-row" onClick={() => { setClusterIdx(i); setEntered(true); }}>
                            <span className="els-rk">{i + 1}</span>
                            <span style={{ color: tag.c, fontWeight: 800 }}>{tag.t} · <b>{pct}%</b></span>
                            <span className="rw-muted">טווח {cl.span.toLocaleString("he")} · {l.label}</span>
                            <span className="rw-muted" style={{ marginInlineStart: "auto" }}>{cl.picks.map(p => p.term).join(" · ")}</span>
                            <span className="els-res-go">פתח ←</span>
                          </button>
                        );
                      })}
                    </div>
                    {res.clusters.length > 10 && !showAll && <button className="els-combine-btn" onClick={() => setShowAll(true)}>פתח את כל ה-{res.clusters.length} →</button>}
                  </>
          )}
        </div>
      )}

      {/* כפתור-חזרה לתוצאות (בתוך סביבת-המטריצה) */}
      {res && entered && <button className="els-back" onClick={() => setEntered(false)}>← חזרה לרשימת התוצאות</button>}

      {/* ===== עובדות ===== */}
      {entered && res?.mode === "single" && (res.hits?.length ? (() => {
        const hit = anchorHit; const l = locOf(hit.start); const gem = computeEntity(terms[0]).primary;
        return <div className="rw-card" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ ...chip, gap: 7, borderColor: colorAt(0), color: colorAt(0) }}>{paintDot(terms[0], colorAt(0))} «{elsNormalize(terms[0])}»</span>
          {/* דילוג · כיוון · מיקום · מופעים — מוצגים בקיר-הימני «תוצאות דילוג» (דסקטופ); כאן רק במובייל (אין קיר) */}
          <span className="els-dup">
            <span style={chip}>דילוג <b style={{ color: C.acc }}>{Math.abs(hit.skip).toLocaleString("he")}</b></span>
            <span style={chip}>{hit.dir > 0 ? "→ קדימה" : "← אחורה"}</span>
            <span style={chip}>📍 {l.label} · אות {l.off.toLocaleString("he")}</span>
            <span style={chip}>מופעים <b style={{ color: C.acc }}>{res.hits.length}{res.capped ? "+" : ""}</b></span>
          </span>
          {hit.mismatches > 0 && <span style={{ ...chip, color: "#b4453a", borderColor: "#e0b4b0" }}>~ התאמה קרובה</span>}
          <span style={chip}>גימטריה <Link to={`/number/${gem}?from=els`} style={{ color: C.acc, textDecoration: "none", fontWeight: 800 }}>{gem.toLocaleString("he")}</Link></span>
          <button onClick={() => setFull(true)} style={{ ...chip, marginInlineStart: "auto", cursor: "pointer" }}>⛶ מסך מלא</button>
        </div>;
      })() : <div className="rw-card rw-muted" style={{ marginTop: 12 }}>«{elsNormalize(terms[0] || "")}» לא נמצא כדילוג עד {q.skipMax}. נסו דילוג גדול יותר{!q.fuzzy ? ", או סמנו «כולל קרובים»" : ""}.</div>)}

      {entered && res?.mode === "cluster" && (res.missing?.length
        ? <div className="rw-card" style={{ marginTop: 12, color: "#b4453a" }}>לא נמצאו כדילוג: {res.missing.join(" · ")}. הגדילו את הדילוג{!q.fuzzy ? " או סמנו «כולל קרובים»" : ""}.</div>
        : cluster0
          ? <div className="rw-card" style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span>✦ התוצאה הכי טובה — {terms.length} מונחים בטווח <b style={{ color: C.acc }}>{cluster0.span.toLocaleString("he")}</b> אותיות · 📍 {locOf(cluster0.picks[0].hit.start).label}{res.clusters.length > 1 ? ` · מתוך ${res.clusters.length} אשכולות` : ""}</span>
                <button onClick={() => setFull(true)} style={{ ...chip, marginInlineStart: "auto", cursor: "pointer" }}>⛶ מסך מלא</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {cluster0.picks.map((pk, i) => <span key={i} style={{ ...chip, gap: 7, borderColor: colorAt(i), color: colorAt(i) }}>{paintDot(pk.term, colorAt(i))} {pk.term} · דילוג {Math.abs(pk.hit.skip).toLocaleString("he")}</span>)}
              </div>
              <div className="rw-sub" style={{ marginTop: 6 }}>🎨 לחצו על נקודת-הצבע שליד כל מונח כדי לצבוע אותו במטריצה. «קרבה» = מרחק קטן בין המונחים בטקסט. עובדה מדידה — לא הוכחה (אפשר למצוא קרבות בכל טקסט גדול).</div>
              {isAdmin && (
                <div className="els-ai">
                  {!aiStruct && <button className="els-ai-btn" onClick={runStructAi}>🤖 נתח מבנה ב-AI</button>}
                  {aiStruct?.loading && <div className="rw-muted">ה-AI מנתח את מבנה האשכול…</div>}
                  {aiStruct?.msg && <div className="els-ai-msg">{aiStruct.msg} <button className="els-ai-retry" onClick={runStructAi}>נסה שוב</button></div>}
                  {aiStruct?.out && (
                    <div className="els-ai-out">
                      <div className="els-ai-h">🔵 ניתוח מבנה (AI){aiStruct.out.confidence ? ` · ביטחון ${({ low: "נמוך", medium: "בינוני", high: "גבוה" })[aiStruct.out.confidence] || aiStruct.out.confidence}` : ""}</div>
                      {aiStruct.out.summary && <p className="els-ai-sum">{aiStruct.out.summary}</p>}
                      {Array.isArray(aiStruct.out.connections) && aiStruct.out.connections.length > 0 && <ul className="els-ai-list">{aiStruct.out.connections.map((c, i) => <li key={i}>{c}</li>)}</ul>}
                      {Array.isArray(aiStruct.out.questions) && aiStruct.out.questions.length > 0 && <><div className="els-ai-t">שאלות להמשך</div><ul className="els-ai-list">{aiStruct.out.questions.map((c, i) => <li key={i}>{c}</li>)}</ul></>}
                      <div className="rw-sub" style={{ marginTop: 6 }}>פרשנות — לא הוכחה. העובדות (מונחים · דילוגים · מרחקים) למעלה.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          : <div className="rw-card rw-muted" style={{ marginTop: 12 }}>המונחים נמצאו, אך לא באשכול קרוב. הגדילו את הדילוג.</div>)}

      {/* ===== חיפוש-בתוך-התוצאה (שורות דקות) + שכבות · הצלבות · ממצאים ===== */}
      {entered && res?.mode === "single" && res.hits?.length > 0 && (
        <div className="rw-card els-sub" style={{ marginTop: 12 }}>
          <div className="els-sub-bar">
            <span className="els-sub-t">🔍 חיפוש בתוך התוצאה</span>
            <input className="els-sub-in" dir="rtl" value={subRaw} onChange={e => setSubRaw(e.target.value)} onKeyDown={e => e.key === "Enter" && addOverlay()}
              placeholder={`מונח נוסף שמופיע ליד «${elsNormalize(terms[0] || "")}» על המטריצה…`} />
            <button className="els-sub-btn" onClick={() => addOverlay()} disabled={elsNormalize(subRaw).length < 2}>➕ הוסף</button>
            <button className="els-sub-btn" onClick={autoCross} title="המנוע מחפש לבד את מילות-התוצאה בתוך המטריצה (כולל טקסט-רגיל) ומסמן חיתוכים אמיתיים" style={{ background: "#fff7e6", color: "var(--acc)", border: "1px solid var(--acc)" }}>⚡ אוטו-הצלבה</button>
            <button className="els-sub-btn" onClick={scanDict} disabled={dictScan?.running} title="המנוע עובר על מילון מונחים שלם ומגלה לבד מי מהם נחתך עם התוצאה" style={{ background: "#eef5ff", color: "#1f6feb", border: "1px solid #1f6feb" }}>{dictScan?.running ? "🔭 סורק…" : "🔭 סרוק מילון"}</button>
            <button className="els-sub-btn" onClick={saveCurrent} title="שמור את כל המטריצה (החיפוש + השכבות)" style={{ background: "var(--accS)", color: "var(--acc)", border: "1px solid var(--acc)" }}>💾 שמור מטריצה</button>
            {overlays.length > 0 && <button className="els-sub-clear" onClick={() => setOverlays([])}>נקה הכל</button>}
          </div>
          <div className="rw-sub" style={{ marginBottom: 4 }}>מחפש <b>רק בתוך המטריצה</b> (ליד התוצאה) — מהיר, בלי להפעיל מנוע על כל הטקסט. כל מונח = שכבה צבעונית. 🎨 לחיצה על נקודת-צבע = שינוי צבע. <b>🔭 סרוק מילון</b> = המנוע מגלה לבד צפנים-נחתכים.</div>

          {/* 🔭 תוצאות סריקת-המילון — מונחים שהמנוע מצא לבד שנחתכים עם התוצאה */}
          {dictScan?.results && (
            <div className="els-dict">
              {dictScan.results.length === 0
                ? <div className="rw-sub">🔭 לא נמצא מונח מהמילון שנחתך עם «{elsNormalize(terms[0])}» כאן. נסו מופע אחר מהרשימה למטה, או הגדילו «גודל-רשת».</div>
                : <>
                    <div className="els-dict-h">🔭 המנוע מצא לבד <b>{dictScan.results.length}</b> מונחים מהמילון שנחתכים עם «{elsNormalize(terms[0])}» — ממוין לפי קרבה
                      <button className="els-dict-all" onClick={colorAllCrossings}>🎨 צבע את ה-{Math.min(8, dictScan.results.length)} הקרובים</button>
                    </div>
                    <div className="els-dict-body">
                      {dictScan.results.slice(0, 24).map((r, i) => {
                        const l = locOf(r.start);
                        return (
                          <button key={r.term} className="els-dict-row" onClick={() => addOverlay(r.term)} title="הוסף כשכבה צבועה על המטריצה">
                            <span className="els-rk" style={{ background: "#eef5ff", color: "#1f6feb" }}>{i + 1}</span>
                            <span className="els-dict-term">{r.raw}</span>
                            <span className="els-rc">דילוג <b>{r.skip.toLocaleString("he")}</b></span>
                            <span className="els-rc">{r.dir > 0 ? "→" : "←"}</span>
                            <span className="els-rc">{l.label}</span>
                            <span className="els-rc muted">מרחק {r.dist.toLocaleString("he")}</span>
                            <span className="els-dict-add">➕ צבע</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="rw-sub" style={{ marginTop: 6 }}>חיתוך = המונח עובר דרך אות מהתוצאה (עובדה גאומטרית). קרבה גדולה אינה הוכחה — בטקסט גדול נוצרים חיתוכים גם במקרה. לחיצה צובעת על המטריצה.</div>
                  </>}
            </div>
          )}
          {/* טבלת השכבות — ריבוע לכל מונח */}
          <div className="els-layers">
            <span className="els-layer anchor" style={{ borderColor: colorAt(0) }}>
              {paintDot(elsNormalize(terms[0]), colorAt(0))} <b style={{ color: colorAt(0) }}>{elsNormalize(terms[0])}</b>
              <span className="els-layer-meta">עוגן · דילוג {Math.abs(anchorHit.skip).toLocaleString("he")}</span>
            </span>
            {overlayData.map(o => (
              <span key={o.term} className="els-layer" style={{ borderColor: colorAt(o.ci) }}>
                {paintDot(o.term, colorAt(o.ci))} <b style={{ color: colorAt(o.ci) }}>{o.term}</b>
                <span className="els-layer-meta">
                  {o.nearest ? <>קרוב <b>{o.nearest.dist.toLocaleString("he")}</b> · דילוג {Math.abs(o.nearest.hit.skip).toLocaleString("he")} · {locOf(o.nearest.hit.start).label}</> : "לא נמצא בטווח"}
                </span>
                <button className="els-layer-x" onClick={() => addFinding(o.term)} title="שמור לטבלת הממצאים שלי" style={{ color: "var(--acc)" }}>💾</button>
                <button className="els-layer-x" onClick={() => removeOverlay(o.term)} title="הסר שכבה">✕</button>
              </span>
            ))}
          </div>

          {/* 🔗 רשימת הצלבות — רק המופעים ש**גלויים על המטריצה** (לא כל רשימת-המרחקים) */}
          {overlayVisible.map(o => (
            <div key={o.term} className="els-list" style={{ marginTop: 12 }}>
              {o.vis.length === 0
                ? <div className="rw-sub" style={{ color: colorAt(o.ci) }}>🔗 «{o.term}» — אין מופע גלוי על המטריצה. הגדילו «גודל-רשת» (×2/×3) או גררו, והוא יופיע.</div>
                : <>
                    <div className="els-list-h" style={{ color: colorAt(o.ci) }}>🔗 «{o.term}» × «{elsNormalize(terms[0])}» — {o.vis.length} {o.vis.length === 1 ? "הצלבה גלויה" : "הצלבות גלויות"}{o.vis.some(x => x.crosses) ? ` · ⚡ ${o.vis.filter(x => x.crosses).length} נחתכות ממש` : ""}</div>
                    <div className="els-list-body">
                      {o.vis.map((x, i) => {
                        const l = locOf(x.hit.start);
                        return (
                          <div key={i} className={"els-row" + (x.crosses ? " cross" : "")}>
                            <span className="els-rk" style={{ background: hexA(colorAt(o.ci), 0.18), color: colorAt(o.ci) }}>{i + 1}</span>
                            {x.crosses && <span className="els-rc" style={{ color: "#c2410c", fontWeight: 800 }} title="המופע נוגע באות מהתוצאה — חיתוך ממשי על המטריצה">⚡ נחתך</span>}
                            <span className="els-rc">מרחק <b>{x.dist.toLocaleString("he")}</b></span>
                            <span className="els-rc">דילוג {Math.abs(x.hit.skip).toLocaleString("he")}</span>
                            <span className="els-rc">{l.label}</span>
                            <span className="els-rc muted">אות {l.off.toLocaleString("he")}{x.hit.mismatches > 0 ? " · ~" : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>}
            </div>
          ))}
          {overlays.length === 0 && <div className="rw-sub" style={{ marginTop: 8 }}>הוסיפו מונח שני למעלה («➕ הצלב») — הוא ייצבע על המטריצה, ותקבלו רשימה רק של ההצלבות ש<b>נראות</b> ברשת.</div>}

          {/* 📌 הממצאים שלי — טבלה אישית: הוספה/מחיקה ידנית, נשמר אצלך */}
          <div className="els-findings">
            <div className="els-find-bar">
              <span className="els-sub-t" style={{ fontSize: 13.5 }}>📌 הממצאים שלי</span>
              <input className="els-sub-in" dir="rtl" value={findRaw} onChange={e => setFindRaw(e.target.value)} onKeyDown={e => e.key === "Enter" && addFinding()}
                placeholder="הוסף ממצא ידני (אותיות/ביטוי שמצאת)…" />
              <button className="els-sub-btn" onClick={() => addFinding()} disabled={!findRaw.trim()}>➕ שמור ממצא</button>
            </div>
            {findings.length > 0 && (
              <div className="els-find-list">
                {findings.map(f => (
                  <span key={f} className="els-find-chip">
                    <button className="els-find-go" onClick={() => addOverlay(f)} title="חפש כשכבה על המטריצה">{f}</button>
                    <button className="els-find-x" onClick={() => removeFinding(f)} title="מחק מהטבלה">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== המטריצה + רשימה ===== */}
      {entered && grid && <div className="rw-card" style={{ marginTop: 12 }}><MatrixTools /><Matrix big={false} /></div>}
      {entered && grid && <div className="rw-sub" style={{ marginTop: 8, textAlign: "center" }}>הרשת ברוחב {grid.W.toLocaleString("he")} (דילוג {grid.skip.toLocaleString("he")}) — {isCluster ? "כל מונח בצבע משלו" : "המונח מודגש לאורך הדילוג"}.</div>}
      {entered && grid && <Help label="ℹ️ איך קוראים את המטריצה?">
        אותיות התנ״ך נכתבות בשורות ברוחב קבוע (כאן {grid.W.toLocaleString("he")}). המילה שחיפשת מודגשת — כל אות שלה רחוקה מהקודמת בדיוק כמספר-הדילוג. הרוחב נבחר כך שהמטריצה תתמלא את הדף. ⚙️ בסרגל-התצוגה: <b>זום</b>, <b>רקע</b> לאותיות, ו<b>ניקוד</b> אופציונלי.
      </Help>}

      {entered && res && <div className="rw-card" style={{ marginTop: 12 }}><ResultsList /></div>}

      {/* ===== מסך מלא ===== */}
      {full && grid && (
        <div className="els-full" onClick={e => e.target === e.currentTarget && setFull(false)}>
          <div className="els-full-bar">
            <span style={{ fontWeight: 800 }}>🔡 {terms.join(" · ")}</span>
            <span className="rw-sub">רוחב {grid.W} · {res.mode === "single" ? `${res.hits.length} מופעים` : `${res.clusters.length} אשכולות`}</span>
            <button className="els-x" onClick={() => setFull(false)}>✕ סגור (Esc)</button>
          </div>
          <div className="els-full-body">
            <div className="els-full-grid"><div style={{ width: "100%" }}><MatrixTools /><Matrix big /></div></div>
            <div className="els-full-side"><ResultsList /></div>
          </div>
        </div>
      )}
    </div>
  );
}

const ELS_CSS = `
.els-chk{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;cursor:pointer}
.els-sub-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.els-sub-t{font-weight:800;font-size:14px;color:var(--ink)}
.els-sub-in{flex:1 1 200px;text-align:center;font-size:15px;font-weight:700;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-family:inherit;outline:none}
.els-sub-btn{border:none;background:var(--acc);color:#fff;font-weight:800;font-size:14px;border-radius:999px;padding:9px 18px;cursor:pointer;font-family:inherit}
.els-sub-btn:disabled{opacity:.5;cursor:default}
.els-sub-clear{border:1px solid var(--line);background:var(--bg);color:var(--ink2);border-radius:999px;padding:9px 14px;cursor:pointer;font-family:inherit;font-weight:700}
/* ⏳ לוּדר חיפוש — לוגו מהבהב בעיגול */
.els-loading{display:flex;flex-direction:column;align-items:center;gap:11px;margin-top:12px;padding:30px 20px;text-align:center}
.els-loading-ring{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:radial-gradient(circle,var(--accS),transparent 72%);animation:els-pulse 1.25s ease-in-out infinite}
.els-loading-logo{width:60px;height:60px;object-fit:contain;border-radius:50%;animation:els-blink 1.25s ease-in-out infinite}
@keyframes els-pulse{0%,100%{box-shadow:0 0 0 0 var(--acc);transform:scale(1)}50%{box-shadow:0 0 0 16px transparent;transform:scale(1.07)}}
@keyframes els-blink{0%,100%{opacity:1;filter:drop-shadow(0 0 5px var(--acc))}50%{opacity:.5;filter:drop-shadow(0 0 16px var(--acc))}}
.els-loading-msg{font-size:16.5px;font-weight:800;color:var(--ink);animation:els-fade 1.25s ease-in-out infinite}
@keyframes els-fade{0%,100%{opacity:1}50%{opacity:.6}}
.els-loading-sub{font-size:12.5px;color:var(--ink2)}
.els-loading-bar{width:min(280px,80%);height:7px;border-radius:999px;background:var(--line);overflow:hidden;margin-top:2px}
.els-loading-bar span{display:block;height:100%;background:var(--acc);border-radius:999px;transition:width .2s}
@media(prefers-reduced-motion:reduce){.els-loading-ring,.els-loading-logo,.els-loading-msg{animation:none}}
/* כפילות עם «תוצאות דילוג» בקיר-הימני: מוצג רק במובייל (≤760, אז אין קיר), מוסתר בדסקטופ */
.els-dup{display:contents}
@media(min-width:761px){.els-dup{display:none}}
/* כפתור פתיחת חיפוש-משולב (פאנל-השכבות מכווץ) */
.els-combine-btn{display:block;width:100%;margin-top:12px;padding:12px 16px;border:1.5px dashed var(--acc);background:var(--accS);
  color:var(--acc);border-radius:12px;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;transition:.12s}
.els-combine-btn:hover{background:var(--acc);color:#fff;border-style:solid}
/* ✦ ממצא נבחר — כרטיס-פלא שכולם רואים */
.els-featured{margin:4px 0 14px}
.els-feat-card{background:linear-gradient(135deg,#fff8e6,#fdf1cf);border:1.5px solid var(--acc);border-radius:16px;padding:14px 16px;box-shadow:0 8px 22px -14px rgba(60,46,16,.5)}
.els-feat-badge{display:inline-block;background:var(--acc);color:#fff;font-weight:800;font-size:11.5px;border-radius:999px;padding:3px 12px;margin-bottom:7px}
.els-feat-title{font-weight:800;font-size:18px;color:#5a4410}
.els-feat-wonder{font-size:13.5px;color:#3a2f12;line-height:1.6;margin-top:5px}
.els-feat-facts{font-size:12.5px;color:#7a5e12;margin-top:7px;background:rgba(255,255,255,.6);border-radius:9px;padding:6px 10px;font-weight:700}
.els-feat-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:11px}
.els-feat-go{border:none;background:linear-gradient(135deg,#e9c84a,#9a7818);color:#1a0e00;font-weight:800;font-size:13.5px;border-radius:999px;padding:9px 18px;cursor:pointer;font-family:inherit}
.els-feat-by{font-size:11.5px;color:#8a7330;font-weight:700}
/* 🚪 שער-מצבים */
.els-modes{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
.els-mode{display:flex;flex-direction:column;align-items:center;gap:3px;padding:13px 10px;border:1.5px solid var(--line);background:var(--card);border-radius:14px;cursor:pointer;font-family:inherit;transition:.12s}
.els-mode.on{border-color:var(--acc);background:var(--accS);box-shadow:0 6px 16px -10px rgba(60,46,16,.4)}
.els-mode-e{font-size:22px;line-height:1}
.els-mode-t{font-weight:800;font-size:14px;color:var(--ink)}
.els-mode-s{font-size:11.5px;color:var(--ink3)}
.els-mode-tok{font-size:11px;font-weight:800;color:var(--acc);margin-top:2px}
@media(max-width:560px){.els-mode-s{display:none}.els-mode{padding:10px 6px}.els-mode-t{font-size:12.5px}}
.els-adv-toggle{margin-top:9px;border:none;background:none;color:var(--ink2);font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;padding:2px 0}
.els-adv-toggle:hover{color:var(--acc)}
/* מסך-תוצאות פשוט */
.els-res-h{font-weight:800;font-size:14px;color:var(--ink);margin-bottom:10px}
.els-res-list{display:flex;flex-direction:column;gap:6px}
.els-res-row{display:flex;align-items:center;gap:9px;width:100%;text-align:start;cursor:pointer;font-family:inherit;
  background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:10px 13px;font-size:13.5px;color:var(--ink2);transition:.12s}
.els-res-row:hover{border-color:var(--acc);background:var(--accS)}
.els-res-row b{color:var(--acc)}
.els-res-go{font-weight:800;color:var(--acc);white-space:nowrap}
.els-back{margin-top:12px;border:1px solid var(--line);background:var(--card);color:var(--ink2);border-radius:999px;padding:8px 16px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit}
.els-back:hover{border-color:var(--acc);color:var(--acc)}
.els-layers{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.els-layer{display:inline-flex;align-items:center;gap:7px;background:var(--bg);border:1.5px solid var(--line);border-radius:12px;padding:7px 12px;font-size:13.5px;font-weight:700}
.els-layer.anchor{background:var(--accS)}
.els-layer-meta{font-size:11.5px;font-weight:600;color:var(--ink2)}
.els-layer-x{border:none;background:none;cursor:pointer;color:var(--ink3);font-size:13px;padding:0 0 0 2px;line-height:1}
.els-layer-x:hover{color:#b4453a}
/* 📌 הממצאים שלי */
.els-findings{margin-top:14px;border-top:1px dashed var(--line);padding-top:12px}
.els-find-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.els-find-list{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
.els-find-chip{display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--line);border-radius:999px;overflow:hidden}
.els-find-go{border:none;background:none;color:var(--ink);font-weight:700;font-size:13px;padding:6px 12px;cursor:pointer;font-family:inherit}
.els-find-go:hover{color:var(--acc);background:var(--accS)}
.els-find-x{border:none;background:none;color:var(--ink3);cursor:pointer;font-size:11px;padding:6px 9px 6px 5px}
.els-find-x:hover{color:#b4453a}
.els-sub-stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.els-sub-note{font-size:12.5px;color:var(--ink2);margin-top:7px}
.els-help{margin:8px 0 4px;background:var(--accS);border:1px solid var(--line);border-radius:10px;padding:2px 12px}
.els-help summary{cursor:pointer;font-size:12.5px;font-weight:800;color:var(--acc);padding:7px 0;list-style:none}
.els-help summary::-webkit-details-marker{display:none}
.els-help-b{font-size:13px;color:var(--ink2);line-height:1.65;padding:0 0 10px}
.els-saved{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px}
.els-saved-lb{font-size:12px;font-weight:800;color:var(--ink3)}
.els-saved-chip{display:inline-flex;align-items:center;background:var(--bg);border:1px solid var(--line);border-radius:999px;overflow:hidden}
.els-saved-load{border:none;background:none;color:var(--ink2);font-weight:700;font-size:12.5px;padding:6px 11px;cursor:pointer;font-family:inherit}
.els-saved-load:hover{color:var(--acc)}
.els-saved-x{border:none;background:none;color:var(--ink3);cursor:pointer;font-size:11px;padding:6px 8px 6px 4px}
.els-saved-x:hover{color:#b4453a}
.els-mtools{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--line)}
.els-mt-lb{font-size:12px;font-weight:800;color:var(--ink3)}
.els-mt-b{width:30px;height:30px;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:8px;cursor:pointer;font-family:inherit;font-size:16px;font-weight:800;line-height:1}
.els-mt-b:hover{border-color:var(--acc);color:var(--acc)}
.els-mt-z{font-size:13px;font-weight:800;color:var(--ink2);min-width:42px;text-align:center}
.els-mt-sep{width:1px;height:20px;background:var(--line);margin:0 4px}
.els-swatch{width:24px;height:24px;border-radius:7px;border:2px solid var(--line);cursor:pointer;padding:0}
.els-swatch.on{border-color:var(--acc);box-shadow:0 0 0 2px var(--accS)}
.els-mt-nq{border:1px solid var(--line);background:var(--bg);color:var(--ink2);border-radius:8px;padding:5px 12px;cursor:pointer;font-family:'Frank Ruhl Libre',serif;font-size:14px;font-weight:700}
.els-mt-nq:hover{border-color:var(--acc);color:var(--acc)}
.els-mt-nq.on{background:var(--acc);color:#fff;border-color:var(--acc)}
.els-mt-nq:disabled{opacity:.6;cursor:default}
.els-ai{margin-top:10px}
.els-ai-btn{border:none;background:#1f6feb;color:#fff;font-weight:800;font-size:13.5px;border-radius:999px;padding:8px 18px;cursor:pointer;font-family:inherit}
.els-ai-msg{font-size:13px;color:#b4453a}
.els-ai-retry{margin-inline-start:8px;border:1px solid var(--line);background:var(--bg);border-radius:7px;padding:3px 10px;cursor:pointer;font-family:inherit;color:var(--ink2)}
.els-ai-out{background:#eef5ff;border:1px solid #d6e4ff;border-radius:11px;padding:12px 15px;margin-top:6px}
.els-ai-h{font-weight:800;color:#1f6feb;font-size:13.5px}
.els-ai-sum{margin:7px 0;color:var(--ink);font-size:14px;line-height:1.55}
.els-ai-t{font-weight:800;font-size:12.5px;color:var(--ink2);margin-top:6px}
.els-ai-list{margin:4px 0;padding-inline-start:18px}
.els-ai-list li{margin:3px 0;color:var(--ink);font-size:13.5px}
.els-list-h{font-weight:800;font-size:13px;color:var(--ink2);margin-bottom:8px}
.els-list-body{display:flex;flex-direction:column;gap:4px;max-height:340px;overflow:auto}
.els-row{display:flex;align-items:center;gap:9px;width:100%;text-align:start;background:var(--bg);border:1px solid var(--line);
  border-radius:9px;padding:7px 11px;cursor:pointer;font-family:inherit;font-size:13px;color:var(--ink2);transition:.1s}
.els-row:hover{border-color:var(--acc);background:var(--accS)}
.els-row.on{border-color:var(--acc);background:var(--accS);box-shadow:inset 3px 0 0 var(--acc)}
.els-row.cross{border-color:#fb923c;background:#fff7ed;box-shadow:inset 3px 0 0 #ea580c}
/* 🔭 סריקת-מילון */
.els-dict{margin:10px 0 4px;background:#f5f9ff;border:1px solid #d6e4ff;border-radius:13px;padding:11px 13px}
.els-dict-h{font-weight:800;font-size:13px;color:#1b4fb0;margin-bottom:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.els-dict-all{border:1px solid #1f6feb;background:#fff;color:#1f6feb;border-radius:999px;padding:4px 12px;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit}
.els-dict-all:hover{background:#1f6feb;color:#fff}
.els-dict-body{display:flex;flex-direction:column;gap:5px;max-height:360px;overflow:auto}
.els-dict-row{display:flex;align-items:center;gap:9px;width:100%;text-align:start;background:#fff;border:1px solid #dbe7fb;border-radius:10px;padding:8px 11px;cursor:pointer;font-family:inherit;font-size:13px;color:var(--ink2);transition:.1s}
.els-dict-row:hover{border-color:#1f6feb;background:#eef5ff}
.els-dict-term{font-weight:800;color:#1b4fb0;font-size:14px;font-family:'Frank Ruhl Libre',serif}
.els-dict-add{margin-inline-start:auto;font-weight:800;color:#1f6feb;white-space:nowrap}
.els-rk{min-width:22px;height:22px;border-radius:6px;background:var(--accS);color:var(--acc);font-weight:800;display:flex;align-items:center;justify-content:center;font-size:12px}
.els-rc b{color:var(--acc)}
.els-rc.muted{color:var(--ink3);margin-inline-start:auto}
.els-rc.warn{color:#b4453a;font-weight:800}
.els-more{font-size:12px;color:var(--ink3);padding:6px 2px}
.els-full{position:fixed;inset:0;z-index:120;background:rgba(20,16,8,.55);backdrop-filter:blur(3px);display:flex;flex-direction:column;padding:14px}
.els-full-bar{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:11px 16px;color:var(--ink)}
.els-x{margin-inline-start:auto;border:1px solid var(--line);background:var(--bg);color:var(--ink2);border-radius:9px;padding:7px 14px;font-weight:800;cursor:pointer;font-family:inherit}
.els-x:hover{border-color:var(--acc);color:var(--acc)}
.els-full-body{flex:1;min-height:0;display:flex;gap:12px;margin-top:12px}
.els-full-grid{flex:1;min-width:0;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;overflow:auto;display:flex;align-items:flex-start;justify-content:center}
.els-full-side{flex:0 0 320px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;overflow:auto}
@media (max-width:820px){.els-full-body{flex-direction:column}.els-full-side{flex:0 0 auto;max-height:38vh}}
`;
