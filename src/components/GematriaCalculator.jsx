import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { supabase, addWallWord, logSearch, saveWallWordPrivate, getWallPrivate } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { setAnon } from "../lib/privacy.js";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { entityFromNumber } from "../lib/research/entity.js";
import { METHODS, DEPTH_METHODS, LETTER_COLS, methodLabel, onlyHeb, mistater, GEM, methodLetters, hebrewNumeral, methodResultText, miluiValueV, miluiTextV, miluiDemiluyValueV, miluiDemiluyTextV, miluiLettersV, MILUI_VAR_OPTS, MILUI_VAR_DEFAULT, hasSofiot, GADOL_BASE } from "../lib/gematria.js";
import { classifyInput, transliterate, buildLexicon, normEn } from "../lib/translit.js";
import { englishSimple, hasLatin, EN_METHODS, englishAll, EN_TAGS } from "../lib/englishGematria.js";
import { getAliasLexicon, logTranslitQuery } from "../lib/feedback.js";
import FoundItFeedback from "./FoundItFeedback.jsx";
import { useNumHref } from "../lib/numHrefCtx.js";

// ===== מחשבון גימטריה מלא — בהיר/תלמודי, כל 19 השיטות, מאומת מול המנוע =====
// לחיצה על שיטה → דף המספר שלה (עם חזרה למחשבון). מובייל: מלבנים קומפקטיים.
const ALL = [...METHODS, ...DEPTH_METHODS];

const L = {
  panel: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a",
  gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc", active: "#fbf3da",
};

export default function GematriaCalculator({ seed, onResult, research = false }) {
  const { isAdmin } = useAuth();
  // 🔗 כתובת-מספר מודעת-הקשר: בתוך ההיכל נשאר בפנים (/research?tool=number&n=…), עצמאי → /number/:n.
  // כל קישור-מספר במחשבון עובר דרך זה → מי שהגיע דרך ההיכל לא נזרק החוצה בלחיצה על ערך.
  const numHref = useNumHref();
  const nlink = (v, extra) => { const b = numHref(v); return extra ? b + (b.includes("?") ? "&" : "?") + extra : b; };
  const [q, setQ] = useState(seed != null && seed !== "" ? String(seed) : ""); // ריק כברירת מחדל — לא מחשב "גאולה" אוטומטית
  useEffect(() => { if (seed != null && seed !== "") setQ(String(seed)); }, [seed]);
  const word = q.trim();
  // «חיפוש אנונימי» בוטל (בקשת צוריאל) — מנקים כל מצב-אנונימי שנשאר מהעבר,
  // כך שמעכשיו כל חיפוש נשמר לקיר הציבורי ולרשימת החיפושים.
  useEffect(() => { setAnon(false); }, []);

  // 🌍 קלט אנגלית → מנוע התעתוק (Language Router lane). המילון-הנלמד (verified) גובר על האלגוריתם.
  const [lexicon, setLexicon] = useState(() => new Map());
  useEffect(() => { getAliasLexicon().then(rows => setLexicon(buildLexicon(rows))).catch(() => {}); }, []);
  const inputType = classifyInput(word);
  const translit = useMemo(() => (inputType === "english" && word ? transliterate(word, { lexicon }) : null), [word, inputType, lexicon]);
  const translitBest = translit && translit.candidates[0] ? translit.candidates[0] : null;
  // 🇺🇸 גימטריה אנגלית ילידית (Simple) — כדי שקלט אנגלי לעולם לא יראה 0. LCE-seed.
  const enSimple = useMemo(() => (inputType === "english" && hasLatin(word) ? englishSimple(word) : null), [word, inputType]);
  const enMethods = useMemo(() => (inputType === "english" && hasLatin(word) ? englishAll(word) : []), [word, inputType]);
  const [enMethodsOpen, setEnMethodsOpen] = useState(false);
  const [enExplain, setEnExplain] = useState(null); // איזו שיטה פתוחה להסבר-סגור
  // רישום החיפוש-האנגלי (למונה ה-hits ולמידת-הקהילה) — פעם לכל מילה.
  useEffect(() => {
    if (inputType === "english" && word && translitBest) {
      logTranslitQuery(word, "en", "english", translitBest.hebrew, translitBest.confidence,
        translit.source === "lexicon" ? "Learned Dictionary" : "AI Transliteration");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);
  const res = useMemo(() => ALL.map(m => ({ key: m.key, sub: m.sub || m.soul, value: m.fn(word) })), [word]);
  const ragilVal = res.find(r => r.key === "רגיל")?.value || 0;
  const [counts, setCounts] = useState({});
  // ⭐ QuickActions — כוכב-מיקרו על כל אריח-שיטה: שומר בדיוק את המספר שנמצא (בלי לצאת מהמחשבון).
  // המספר נשמר כ-Entity → מופיע ב«שמורים»/עולם המשתמש/פרופיל (עץ אחד). savedFlash = משוב «✓» רגעי.
  const { saveItem } = useResearch();
  const [savedFlash, setSavedFlash] = useState(null);
  const saveNum = (r) => {
    if (!r || !r.value) return;
    saveItem?.(entityFromNumber(r.value, word ? `${word} · ${methodLabel(r.key)}` : null));
    setSavedFlash(r.key);
    setTimeout(() => setSavedFlash(f => (f === r.key ? null : f)), 1300);
  };
  const [showLetters, setShowLetters] = useState(false);
  const [showHebNum, setShowHebNum] = useState(false);   // אותיות הערך (מ״ה) — אופציה מתקדמת
  const letters = onlyHeb(word);

  // 🔑 שיטת המפתח (lab) — עדשת פירוק-אותיות פרשנית מהמנוע (fn_maftech_decompose).
  // מפריד עובדה (רגיל/מסתתר/קדמי — מאומת) מהשערה (משמעות-אות/מראה/חיתוך). נטען לפי בקשה, לא בכל הקשה.
  const [maftechOpen, setMaftechOpen] = useState(false);
  const [maftechData, setMaftechData] = useState(null);
  const [maftechLoading, setMaftechLoading] = useState(false);
  const [maftechErr, setMaftechErr] = useState(false);
  useEffect(() => {
    if (!maftechOpen || !letters.length) { setMaftechData(null); return; }
    let live = true; setMaftechLoading(true); setMaftechErr(false);
    const t = setTimeout(() => {
      supabase.rpc("fn_maftech_decompose", { word }).then(({ data, error }) => {
        if (!live) return;
        if (error) { setMaftechErr(true); setMaftechData(null); } else setMaftechData(data);
        setMaftechLoading(false);
      }).catch(() => { if (live) { setMaftechErr(true); setMaftechLoading(false); } });
    }, 350);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maftechOpen, word]);

  // חיפוש מורכב — רמות: 0=סגור · 1=שורה אחת · 2=שתי שורות. השורה העליונה (q) עצמאית = "צופה 19 השיטות".
  const [m1, setM1] = useState("רגיל");
  const [advLevel, setAdvLevel] = useState(0);
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [m2, setM2] = useState("אלבם");
  const [miluiVar, setMiluiVar] = useState(() => ({ ...MILUI_VAR_DEFAULT }));   // וריאנט מילוי לשורה 1 בלבד
  const [advBlink, setAdvBlink] = useState(false);
  const advOpen = advLevel > 0;
  const twoRows = advLevel >= 2;
  const openAdvanced = () => {
    const cur = q.trim(); setQ1(cur); setQ(""); setAdvLevel(1);
    let seen = false; try { seen = !!localStorage.getItem("gc-adv-seen"); } catch { /* ignore */ }
    if (!seen) { setAdvHelp(true); setAdvBlink(true); try { localStorage.setItem("gc-adv-seen", "1"); } catch { /* ignore */ } setTimeout(() => setAdvBlink(false), 7000); }
  };
  const addRow2 = () => { if (!q2.trim()) setQ2(q1.trim() || ""); setAdvLevel(2); };
  const closeAdvanced = () => { setAdvLevel(0); setAdvBlink(false); if (!q.trim()) setQ(q1.trim() || ""); };
  const [action, setAction] = useState("none");
  const [advHelp, setAdvHelp] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 560px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 560px)");
    const h = e => setIsMobile(e.matches);
    mq.addEventListener ? mq.addEventListener("change", h) : mq.addListener(h);
    setIsMobile(mq.matches);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", h) : mq.removeListener(h); };
  }, []);
  const heb = v => hebrewNumeral(v);
  const valOf = (key, w) => { const m = ALL.find(x => x.key === key); return m ? m.fn(String(w || "").trim()) : 0; };
  const isMiluiM1 = m1 === "מילוי" || m1 === "מילוי דמילוי";
  const v1 = m1 === "מילוי" ? miluiValueV(q1, miluiVar)
    : m1 === "מילוי דמילוי" ? miluiDemiluyValueV(q1, miluiVar)
    : valOf(m1, q1);
  const fill1Text = () => m1 === "מילוי" ? miluiTextV(q1, miluiVar)
    : m1 === "מילוי דמילוי" ? miluiDemiluyTextV(q1, miluiVar)
    : methodResultText(m1, q1);
  const v2 = valOf(m2, q2);
  const isCross = v1 > 0 && v1 === v2;

  // כמה ביטויים יש במערכת לכל שיטה (לפי הערך שלה) — מהמאגר המאומת.
  // ⏳ debounced: לא יורים 17 שאילתות בכל הקשה — רק אחרי שהמשתמש מפסיק להקליד.
  useEffect(() => {
    let live = true; setCounts({});
    if (!letters.length) return;
    const t = setTimeout(() => {
      Promise.all(res.map(r =>
        supabase.from("bidim").select("*", { count: "exact", head: true }).eq("method", r.key).eq("value", r.value)
          .then(({ count }) => [r.key, count || 0]).catch(() => [r.key, 0])
      )).then(pairs => { if (live) setCounts(Object.fromEntries(pairs)); });
    }, 450);
    return () => { live = false; clearTimeout(t); };
  }, [word]); // eslint-disable-line

  // שמירה + רישום חיפושים (עץ אחד).
  // ציבורי (כולל אדמין): נשמר לקיר הציבורי ונרשם לרשימת החיפושים (אלא אם מצב אנונימי).
  // מצב מחקר (research): נשמר רק לקיר הפרטי שלי — לא לקיר הציבורי ולא לרשימת החיפושים.
  useEffect(() => {
    if (!word || onlyHeb(word).length < 2 || !ragilVal) return;
    const t = setTimeout(async () => {
      // onResult = חישוב טהור בצד הלקוח → פולטים מיד, לפני כל I/O (QuickActions תלוי בו;
      // אסור שיהיה תלוי בשמירה ל-DB שעלולה להיכשל/להיתקע ברשת/הרשאות).
      if (onResult) onResult({ word, ragil: ragilVal });
      try {
        if (research) {
          await saveWallWordPrivate(word, ragilVal);     // 🔬 מחקר אישי — פרטי בלבד
        } else {
          await addWallWord(word, ragilVal);             // תמיד נשמר לקיר הציבורי (מצב אנונימי בוטל)
          logSearch(word, ragilVal);                     // ציבורי — נרשם לרשימת החיפושים
        }
      } catch { /* שמירה נכשלה — התוצאה כבר הוצגה */ }
    }, 900);
    return () => clearTimeout(t);
  }, [word, ragilVal, onResult, research]);

  // קיר פרטי לאדמין: שמירה ידנית + רשימה שרק האדמין רואה
  const [privSaved, setPrivSaved] = useState("");
  const [privList, setPrivList] = useState([]);
  const [privOpen, setPrivOpen] = useState(false);
  const loadPriv = () => { if (research || isAdmin) getWallPrivate(6).then(setPrivList).catch(() => {}); };   // 6 חיפושים אחרונים בלבד
  useEffect(() => { loadPriv(); }, [research, isAdmin]); // eslint-disable-line
  const savePrivate = async () => {
    if (!word || onlyHeb(word).length < 2 || !ragilVal) return;
    await saveWallWordPrivate(word, ragilVal);
    setPrivSaved("נשמר לרשימה הפרטית ✓");
    setTimeout(() => setPrivSaved(""), 2600);
    loadPriv();
  };

  const thS = { background: L.soft, color: L.goldDeep, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap", borderBottom: `2px solid ${L.line}` };
  const tdS = { color: L.ink, fontFamily: F.body, fontSize: 13.5, padding: "7px 10px", borderBottom: `1px solid ${L.line}` };
  const numCell = { ...tdS, fontFamily: F.mono, fontWeight: 700, textAlign: "center", color: L.goldDeep };

  const cs = {
    open: { cursor: "pointer", background: "none", border: "none", color: L.sub, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "5px 10px", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px" },
    row: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
    lbl: { color: L.sub, fontFamily: F.heading, fontSize: 11, fontWeight: 800, minWidth: 44 },
    term: { flex: "1 1 110px", background: L.panel, border: `1px solid ${L.line}`, borderRadius: 8, padding: "7px 12px", color: L.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, textAlign: "center" },
    inp: { flex: "1 1 110px", boxSizing: "border-box", background: L.panel, border: `1px solid ${L.gold}`, borderRadius: 8, padding: "7px 12px", color: L.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, textAlign: "center", outline: "none" },
    sel: { background: L.panel, border: `1px solid ${L.line}`, borderRadius: 8, padding: "7px 8px", color: L.ink, fontFamily: F.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" },
    eq: { color: L.goldDeep, fontFamily: F.mono, fontSize: 17, fontWeight: 800, minWidth: 52, textAlign: "center" },
    heb: { color: L.gold, fontFamily: F.regal, fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap" },
    x: { cursor: "pointer", background: "none", border: "none", color: L.sub, fontSize: 16, fontWeight: 700, lineHeight: 1 },
    send: { cursor: "pointer", background: L.active, border: `1px solid ${L.gold}`, borderRadius: 999, color: L.goldDeep, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, padding: "4px 10px", whiteSpace: "nowrap" },
    res: { textDecoration: "none", background: L.panel, border: `1px solid ${L.line}`, borderRadius: 999, color: L.goldDeep, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "7px 14px" },
    go: { display: "inline-block", textDecoration: "none", background: "linear-gradient(135deg,#e9c84a,#9a7818)", color: "#1a0e00", borderRadius: 999, fontFamily: F.heading, fontSize: 14, fontWeight: 800, padding: "9px 20px", marginTop: 8 },
    cross: { color: L.goldDeep, fontFamily: F.heading, fontSize: 14, fontWeight: 800, background: "#fff3d6", border: `1px solid ${L.gold}`, borderRadius: 10, padding: "8px 12px" },
    sum: { color: L.ink, fontFamily: F.mono, fontSize: 15, fontWeight: 700 },
  };
  const actBtn = on => ({ cursor: "pointer", borderRadius: 999, fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "6px 16px", border: `1px solid ${L.line}`, ...(on ? { borderColor: L.gold, background: L.active, color: L.goldDeep } : { background: L.panel, color: L.sub }) });

  // שורת אותיות לשיטה שנבחרה (אתבש=אות→אות · מסתתר=הפרשים · אחר=אות=ערך)
  const LetterStrip = ({ mkey, w }) => {
    const bd = methodLetters(mkey, w);
    if (!bd) return null;
    const seg = { fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: L.goldDeep, background: L.panel, border: `1px solid ${L.line}`, borderRadius: 7, padding: "2px 8px" };
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6, alignItems: "center" }}>
        <span style={{ color: L.sub, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800 }}>{mkey}:</span>
        {bd.type === "cipher" && bd.word && <span style={{ ...seg, color: L.ink, background: L.active }}>{bd.word}</span>}
        {bd.segs.map((s, i) => (
          <span key={i} style={seg}>
            {bd.type === "cipher" ? <>{s.from}<span style={{ color: L.gold }}>→</span>{s.to}</> : bd.type === "diff" ? `${s.label}=${s.val}` : <>{s.ch}<span style={{ color: L.sub }}>=</span>{s.val}</>}
          </span>
        ))}
      </div>
    );
  };

  // שורת מילוי עם וריאנט (אות → שם = ערך)
  const MiluiStrip = ({ word, variants, demiluy }) => {
    const bd = miluiLettersV(word, variants, demiluy);
    if (!bd) return null;
    const seg = { fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: L.goldDeep, background: L.panel, border: `1px solid ${L.line}`, borderRadius: 7, padding: "2px 8px" };
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6, alignItems: "center" }}>
        <span style={{ color: L.sub, fontFamily: F.heading, fontSize: 10.5, fontWeight: 800 }}>{demiluy ? "מילוי דמילוי" : "מילוי"}:</span>
        {bd.segs.map((s, i) => (
          <span key={i} style={seg}>{s.from}<span style={{ color: L.gold }}>→</span>{s.name}<span style={{ color: L.sub }}>=</span>{s.val}</span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ textAlign: "right" }}>
      {/* קלט */}
      <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16, padding: "16px 16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={advOpen ? "התוצאה תופיע כאן — או הקלידו (19 שיטות)…" : "הקלידו מילה או ביטוי…"} dir="rtl" style={{
          width: "100%", boxSizing: "border-box", background: L.soft, border: `1px solid ${L.gold}`, borderRadius: 10, color: L.ink,
          fontFamily: F.regal, fontSize: 23, fontWeight: 700, padding: "11px 16px", outline: "none", textAlign: "center",
        }} />

        {/* 🌍 עזר-אנגלית: קלט אנגלי לעולם לא רואה 0. תעתוק עברי (אם קיים) + English Simple (תמיד). */}
        {inputType === "english" && word && enSimple != null && (
          <div style={{ marginTop: 11, background: "#f3f7ff", border: "1px solid #c9d9f5", borderRadius: 12, padding: "10px 12px", textAlign: "right" }}>
            {/* 🔁 תעתוק עברי — רק אם נמצא */}
            {translitBest ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontFamily: F.heading, fontSize: 12, fontWeight: 800, color: "#2c5fb3" }}>🔁 תעתוק עברי</span>
                <span style={{ color: "#23201a", fontFamily: F.body, fontSize: 14 }}>
                  «{word}» → <b>{translitBest.hebrew}</b>{" "}
                  <span style={{ color: "#5a6b85", fontSize: 12 }}>({translitBest.method === "translation" ? "תרגום" : "תעתוק"}{translit.source === "lexicon" ? " · מאומת" : ""})</span>
                  {" = "}<b style={{ fontFamily: F.mono, color: "#2c5fb3" }}>{valOf("רגיל", translitBest.hebrew)}</b>
                </span>
                <button onClick={() => setQ(translitBest.hebrew)} style={{ marginInlineStart: "auto", cursor: "pointer", background: "#2c5fb3", border: "none", borderRadius: 999, color: "#fff", fontFamily: F.heading, fontSize: 12, fontWeight: 800, padding: "5px 14px", minHeight: 32 }}>חשב את «{translitBest.hebrew}» ←</button>
              </div>
            ) : (
              <div style={{ color: "#5a6b85", fontFamily: F.body, fontSize: 12, marginBottom: 8 }}>לא נמצא תעתוק עברי מאומת — אפשר לחפש ידנית.</div>
            )}
            {/* 🇺🇸 שיטות אנגלית — כל שיטה עם תג-מקור והסבר-סגור (יושר מחקרי) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setEnMethodsOpen(o => !o)}
                style={{ cursor: "pointer", background: "#eaf0fb", border: "1px solid #cfe0fb", borderRadius: 999, color: "#2c5fb3", fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, padding: "3px 11px" }}>
                🇺🇸 {enMethods.length} שיטות אנגלית {enMethodsOpen ? "▲" : "▾"}
              </button>
              <span style={{ color: "#23201a", fontFamily: F.body, fontSize: 14 }}>«{word}» · Ordinal = <b style={{ fontFamily: F.mono, color: "#2c5fb3", fontSize: 16 }}>{enSimple}</b></span>
            </div>
            {enMethodsOpen && (
              <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                {enMethods.map(m => {
                  const tag = EN_TAGS[m.tag] || EN_TAGS.modern, open = enExplain === m.key;
                  return (
                    <div key={m.key} style={{ background: "#fff", border: "1px solid #e2e8f4", borderRadius: 10, padding: "8px 11px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span title={tag.label} style={{ fontSize: 13 }}>{tag.icon}</span>
                        <span style={{ color: "#23201a", fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>{m.he}</span>
                        <span style={{ color: "#8a94a6", fontFamily: F.body, fontSize: 11 }}>{m.label}</span>
                        <span style={{ flex: 1 }} />
                        <b style={{ fontFamily: F.mono, color: "#2c5fb3", fontSize: 16 }}>{m.value}</b>
                        <button onClick={() => setEnExplain(open ? null : m.key)} title="הסבר" style={{ cursor: "pointer", background: "transparent", border: "1px solid #cfd8e6", borderRadius: 999, color: "#5a6b85", fontSize: 12, fontWeight: 700, width: 22, height: 22, lineHeight: 1, padding: 0 }}>{open ? "×" : "?"}</button>
                      </div>
                      {open && (
                        <div style={{ marginTop: 7, paddingTop: 7, borderTop: "1px dashed #e2e8f4", color: "#3a4553", fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7 }}>
                          <span style={{ color: "#2c5fb3", fontWeight: 700 }}>{tag.icon} {tag.label}</span> · {m.note}<br />{m.explain}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ color: "#8a94a6", fontFamily: F.body, fontSize: 11, marginTop: 2 }}>לחיצה על «?» = הסבר מלא ומקור השיטה. Sumerian ו-«Jewish» מוגדרות אך כבויות (מסומנות 🧪 ניסיוני).</div>
              </div>
            )}
            {translitBest && (
              <FoundItFeedback context="search" query={word} inputNorm={normEn(word)} meta={{ kind: "translit" }}
                options={translit.candidates.slice(1, 3).map(c => ({ label: c.hebrew, hebrew: c.hebrew }))} tone="light" />
            )}
          </div>
        )}

        {/* 🔬 מצב מחקר אישי — נשמר אוטומטית לרשימה הפרטית (לא לקיר הציבורי ולא לרשימת החיפושים) */}
        {research && (
          <div style={{ marginTop: 11, background: "#f3f7ff", border: "1px solid #c9d9f5", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: "#2c5fb3", fontFamily: F.heading, fontSize: 12, fontWeight: 800 }}>🔬 מצב מחקר</span>
              <span style={{ color: "#5a6b85", fontFamily: F.body, fontSize: 12 }}>נשמר אוטומטית לרשימה הפרטית שלך — לא מופיע לאף אחד</span>
              <button onClick={savePrivate} style={{ marginInlineStart: "auto", cursor: "pointer", background: "#2c5fb3", border: "none", borderRadius: 999, color: "#fff", fontFamily: F.heading, fontSize: 12, fontWeight: 800, padding: "5px 14px" }}>💾 שמור פרטי</button>
            </div>
            {privSaved && <div style={{ color: "#2c7a3f", fontFamily: F.body, fontSize: 12, marginTop: 6 }}>{privSaved}</div>}
            {privList.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setPrivOpen(o => !o)} style={{ cursor: "pointer", background: "none", border: "1px solid #c9d9f5", borderRadius: 999, color: "#2c5fb3", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, padding: "3px 11px" }}>{privOpen ? "▴" : "▾"} הרשימה הפרטית שלי ({privList.length})</button>
                {privOpen && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {privList.map((r, i) => (
                      <button key={i} onClick={() => setQ(r.phrase)} title="טען למחשבון" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #c9d9f5", borderRadius: 999, padding: "4px 6px 4px 11px", fontFamily: F.body, fontSize: 13, color: "#23201a" }}>
                        {r.phrase}
                        <span style={{ background: "#eaf0fb", color: "#2c5fb3", fontFamily: F.mono, fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: "1px 8px" }}>{r.ragil}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* כל 19 השיטות — תמיד מוצגות (גם בלי קלט, מציגות 0), כדי שברור מיד שזה מחשבון חי */}
        <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(94px, 1fr))", gap: 7, marginTop: 12 }}>
          {res.map(r => {
            // 🔒 חוק gadol_equals_ragil_when_no_sofiot: כשאין סופיות, שיטה-גדולה = הבסיס שלה.
            // לא מציגים אותה כ«ממצא נפרד» — מסמנים «≡ זהה ל…» כדי שלא ייקרא כהפרש.
            const sameAsBase = word && GADOL_BASE[r.key] && !hasSofiot(word);
            const inner = (
              <>
                <div style={{ color: L.sub, fontFamily: F.heading, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{methodLabel(r.key)}</div>
                <div style={{ color: word ? (sameAsBase ? L.sub : L.goldDeep) : "#cabfa3", fontFamily: F.mono, fontSize: 19, fontWeight: 800, lineHeight: 1.15 }}>{r.value}</div>
                {showHebNum && word && <div style={{ color: L.gold, fontFamily: F.regal, fontSize: 11, fontWeight: 700, lineHeight: 1.2, marginTop: 1 }}>{hebrewNumeral(r.value)}</div>}
                {sameAsBase
                  ? <div title="אין אותיות סופיות בביטוי — הערך הגדול זהה לרגיל (חוק נעול)" style={{ color: "#9a8a5e", fontFamily: F.heading, fontSize: 9.5, fontWeight: 800, marginTop: 2 }}>≡ זהה ל{GADOL_BASE[r.key]}</div>
                  : (word && <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 9.5, fontWeight: 700, marginTop: 2 }}>נמצאו {counts[r.key] ?? "…"}</div>)}
              </>
            );
            const boxStyle = { textAlign: "center", borderRadius: 10, padding: "8px 6px", border: `1px solid ${L.line}`, background: L.soft, ...(sameAsBase ? { opacity: 0.72 } : {}) };
            // ריק → תיבה לא-לחיצה (לא מקשרים ל-/number/0); מלא → לחיצה לדף-המספר
            return word ? (
              <Link key={r.key} to={nlink(r.value, `from=calc&focus=dna&method=${encodeURIComponent(r.key)}`)} title={`${r.key} = ${r.value} · פתח את ${r.value} (צירי ההתכנסות)`} style={{
                position: "relative", textDecoration: "none", transition: "border-color .15s, background .15s", ...boxStyle,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = L.gold; e.currentTarget.style.background = L.active; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = L.line; e.currentTarget.style.background = L.soft; }}>
                {/* ⭐ שמור רק את המספר הזה — לא מנווט (עוצר את הלינק). משוב «✓» רגעי. */}
                {!sameAsBase && (
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); saveNum(r); }}
                    title={`שמור את ${r.value} (${methodLabel(r.key)}) ל⭐ שמורים`}
                    aria-label={`שמור את ${r.value}`}
                    style={{ position: "absolute", top: 2, insetInlineStart: 2, zIndex: 2, cursor: "pointer",
                      background: "none", border: "none", padding: 2, lineHeight: 1, fontSize: 12.5,
                      color: savedFlash === r.key ? "#1f9d57" : "#c9b678", opacity: savedFlash === r.key ? 1 : 0.7 }}>
                    {savedFlash === r.key ? "✓" : "⭐"}
                  </button>
                )}
                {inner}
              </Link>
            ) : (
              <div key={r.key} style={{ ...boxStyle, opacity: 0.92 }}>{inner}</div>
            );
          })}
        </div>

        {/* אופציה מתקדמת — הצגת ערך כל שיטה באותיות (מ״ה) */}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 11, color: L.sub, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>
          <input type="checkbox" checked={showHebNum} onChange={e => setShowHebNum(e.target.checked)} style={{ accentColor: L.gold, width: 15, height: 15, cursor: "pointer" }} />
          הצג את הערך באותיות (מ״ה) · מתקדם
        </label>

        {word ? (
          <>
            <div style={{ textAlign: "center", marginTop: 15 }}>
              <Link to={nlink(ragilVal, 'from=calc')} style={{
                display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
                background: "linear-gradient(135deg, #e9c84a, #9a7818)", color: "#1a0e00",
                fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "11px 26px", borderRadius: 999,
                boxShadow: "0 2px 10px rgba(154,120,24,0.35)",
              }}>✨ גלה הכל על {ragilVal} ←</Link>
            </div>
            <div style={{ textAlign: "center", marginTop: 7, color: L.sub, fontFamily: F.body, fontSize: 12 }}>לחצו על שיטה כדי לפתוח את דף המספר שלה · ⭐ בפינת האריח שומר רק את המספר</div>
          </>
        ) : (
          <div style={{ textAlign: "center", marginTop: 13, color: L.sub, fontFamily: F.body, fontSize: 13 }}>☝️ הקלידו מילה או ביטוי למעלה — כל 19 השיטות יחושבו מיד, וכל תיבה תהפוך ללחיצה אל דף-המספר.</div>
        )}
        </>

        {/* 🔑 שיטת המפתח — עדשת פירוק-אותיות פרשנית (lab). עובדה (מנוע) מופרדת מהשערה. */}
        {letters.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {!maftechOpen ? (
              <div style={{ textAlign: "center" }}>
                <button onClick={() => setMaftechOpen(true)} style={cs.open}>🔑 פרק את «{word}» בשיטת המפתח</button>
              </div>
            ) : (
              <div style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 12, padding: "13px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ color: L.goldDeep, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>🔑 שיטת המפתח — «{word}»</span>
                  <span title="שיטה פרשנית — השערה, לא אמת מוחלטת" style={{ background: "#eef3fb", border: "1px solid #cfe0fb", color: "#2c5fb3", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 9px" }}>השערה · lab</span>
                  <button onClick={() => setMaftechOpen(false)} title="סגור" style={{ marginInlineStart: "auto", cursor: "pointer", background: "none", border: `1px solid ${L.line}`, borderRadius: 999, color: L.sub, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "4px 12px" }}>▲ סגור</button>
                </div>

                {maftechLoading && <div style={{ textAlign: "center", color: L.sub, fontFamily: F.body, fontSize: 13, padding: "6px 0" }}>מפרק…</div>}
                {maftechErr && <div style={{ textAlign: "center", color: "#a3402f", fontFamily: F.body, fontSize: 13, padding: "6px 0" }}>לא ניתן לפרק כרגע — נסו שוב.</div>}

                {maftechData && !maftechLoading && (() => {
                  const FT = maftechData.FACT || {}, IN = maftechData.INTERPRETATION || {}, segs = maftechData.segments_real_words || [];
                  return (
                    <>
                      {/* ✅ עובדה — מאומת במנוע */}
                      <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ color: "#1f9d57", fontFamily: F.heading, fontSize: 11, fontWeight: 800, marginBottom: 5 }}>✅ עובדה — מאומת במנוע</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {[["רגיל", FT.ragil], ["מסתתר", FT.misratar], ["קדמי", FT.kadmi]].map(([k, v]) => (
                            <span key={k} style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 800, color: L.goldDeep, background: L.soft, border: `1px solid ${L.line}`, borderRadius: 7, padding: "2px 9px" }}>{k} <span style={{ color: L.ink }}>{v ?? "—"}</span></span>
                          ))}
                        </div>
                        {FT.hidden_vs_revealed && <div style={{ color: L.sub, fontFamily: F.body, fontSize: 12, marginTop: 6 }}>מוסתר↔גלוי: {FT.hidden_vs_revealed}</div>}
                      </div>

                      {/* 🔑 השערה — מפתח האותיות */}
                      <div style={{ marginTop: 9, background: L.panel, border: `1px solid ${L.line}`, borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ color: "#2c5fb3", fontFamily: F.heading, fontSize: 11, fontWeight: 800, marginBottom: 6 }}>🔑 מפתח האותיות — השערה</div>
                        <div style={{ display: "grid", gap: 5 }}>
                          {(IN.letters || []).map((l, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                              <span style={{ fontFamily: F.regal, fontSize: 18, fontWeight: 800, color: L.goldDeep, minWidth: 22, textAlign: "center" }}>{l.letter}</span>
                              <span style={{ color: L.ink, fontFamily: F.body, fontSize: 13, lineHeight: 1.5 }}>{l.meaning}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {(IN.mirror || []).map((m, i) => (
                            <span key={i} style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: "#7a4fb3", background: "#f4eefb", border: "1px solid #e2d3f5", borderRadius: 999, padding: "2px 10px" }}>מראה {m}</span>
                          ))}
                          {IN.sparks_yod > 0 && <span style={{ fontFamily: F.heading, fontSize: 12, fontWeight: 700, color: L.gold, background: L.active, border: `1px solid ${L.line}`, borderRadius: 999, padding: "2px 10px" }}>✦ ניצוצות-יוד: {IN.sparks_yod}</span>}
                        </div>
                      </div>

                      {/* חיתוך תת-מילים מאומתות */}
                      {segs.length > 0 && (
                        <div style={{ marginTop: 9 }}>
                          <div style={{ color: L.sub, fontFamily: F.heading, fontSize: 11, fontWeight: 800, marginBottom: 5 }}>✂️ תת-מילים במאגר</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {segs.map((s, i) => (
                              <Link key={i} to={nlink(s.ragil, "from=maftech")} style={{ textDecoration: "none", fontFamily: F.regal, fontSize: 14, fontWeight: 700, color: L.ink, background: L.panel, border: `1px solid ${L.line}`, borderRadius: 999, padding: "3px 11px" }}>
                                {s.sub} <span style={{ fontFamily: F.mono, color: L.goldDeep, fontWeight: 800 }}>{s.ragil}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ color: L.sub, fontFamily: F.body, fontSize: 11, marginTop: 9, lineHeight: 1.6 }}>המספרים = עובדות מנוע. משמעות-האותיות, המראה והחיתוך = שיטה פרשנית («המפתח») במצב lab — השערה, לא אמת מוחלטת.</div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 🔍 חיפוש מורכב — רמות: שורה אחת / שתיים, עצמאיות מהעליונה */}
        {!advOpen ? (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button onClick={openAdvanced} style={cs.open}>▾ מצב מתקדם — השוואת שיטות ושורות</button>
          </div>
        ) : (
          <div style={{ marginTop: 12, background: L.soft, border: `1px solid ${L.line}`, borderRadius: 12, padding: "12px 13px" }}>
            <style>{`@keyframes gc-glow{0%,100%{box-shadow:0 0 0 0 rgba(154,120,24,0)}50%{box-shadow:0 0 0 4px rgba(154,120,24,0.42)}}`}</style>
            {/* כותרת + הסבר + סגירה */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ color: L.goldDeep, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>🧮 מצב מתקדם — השוואת שיטות</span>
              <button onClick={() => { setAdvHelp(h => !h); setAdvBlink(false); }} title="הסבר על המצב המורחב" style={{ cursor: "pointer", background: advBlink ? L.active : "none", border: `1px solid ${advBlink ? L.gold : L.line}`, borderRadius: 999, color: L.goldDeep, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, padding: "3px 11px" }}>{advHelp ? "▴ הסבר" : "❔ איך זה עובד?"}</button>
              <button onClick={closeAdvanced} title="סגור מצב מתקדם" style={{ marginInlineStart: "auto", cursor: "pointer", background: "none", border: `1px solid ${L.line}`, borderRadius: 999, color: L.sub, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "4px 13px" }}>▲ סגור</button>
            </div>
            {advHelp && (
              <div style={{ background: L.panel, border: `1px solid ${advBlink ? L.gold : L.line}`, borderRadius: 10, padding: "11px 13px", marginBottom: 11, color: L.ink, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.9 }}>
                <b style={{ color: L.goldDeep }}>איך המצב המורחב עובד:</b><br />
                • כל שורה = ביטוי + <b>שיטה משלה</b> (רגיל / אלב״ם / מילוי / אתב״ש…). מתחתיה רואים את <b>האותיות</b> של השיטה ואת הערך גם <b>באותיות עבריות</b> (231 = רל״א).<br />
                • <b>⤴ למעלה</b> — לוקח את <b>תוצאת השיטה</b> ושם בשורה העליונה (מילוי=השם המלא · אתב״ש/אלב״ם=האותיות המוצפנות), וכל 19 השיטות מחושבות עליה. השורה העליונה עצמאית — שינוי בה לא נוגע בשורות.<br />
                • <b>➕ שורה שנייה</b> — מוסיף שורה להשוואה: <b>🔗 אחד</b> מחבר את שני הערכים (שווים → ✦ הצלבה) · <b>✂️ פצל</b> פותח כל ערך בנפרד.<br />
                • <b>▲ סגור</b> — סוגר הכל וחוזר למחשבון, אחרי שהבאת למעלה את מה שרצית.
              </div>
            )}
            {/* שורה 1 — עצמאית */}
            <div style={cs.row}>
              <span style={cs.lbl}>שורה 1</span>
              <input value={q1} onChange={e => setQ1(e.target.value)} placeholder="ביטוי…" dir="rtl" style={{ ...cs.inp, ...(isMobile ? { flexBasis: "100%" } : {}) }} />
              <select value={m1} onChange={e => setM1(e.target.value)} style={cs.sel}>{ALL.map(m => <option key={m.key} value={m.key}>{methodLabel(m.key)}</option>)}</select>
              <span style={cs.eq}>= {v1}</span>
              {heb(v1) && <span style={cs.heb}>{heb(v1)}</span>}
              <button onClick={() => { const t = fill1Text(); if (t) setQ(t); }} title="מלא את השורה העליונה בתוצאת השיטה (חישוב 19 השיטות)" style={{ ...cs.send, marginInlineStart: "auto" }}>⤴ למעלה</button>
            </div>
            {/* וריאנט מילוי — שורה 1 בלבד */}
            {isMiluiM1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8, background: L.panel, border: `1px solid ${L.line}`, borderRadius: 8, padding: "7px 11px" }}>
                <span style={{ color: L.sub, fontFamily: F.heading, fontSize: 11, fontWeight: 800 }}>וריאנט מילוי:</span>
                {["ה", "ו", "ת"].map(c => (
                  <label key={c} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: L.goldDeep, fontFamily: F.regal, fontSize: 15, fontWeight: 700 }}>{c}</span>
                    <select value={miluiVar[c]} onChange={e => setMiluiVar(v => ({ ...v, [c]: e.target.value }))} style={cs.sel}>
                      {MILUI_VAR_OPTS[c].map(o => <option key={o} value={o}>{o}{o === MILUI_VAR_DEFAULT[c] ? " ★" : ""}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
            {isMiluiM1 ? <MiluiStrip word={q1} variants={miluiVar} demiluy={m1 === "מילוי דמילוי"} /> : <LetterStrip mkey={m1} w={q1} />}

            {advLevel === 1 && (
              <div style={{ textAlign: "center", marginTop: 11 }}>
                <button onClick={addRow2} style={cs.open}>➕ הוסף שורה שנייה (השוואה / הצלבה)</button>
              </div>
            )}

            {twoRows && (<>
              {/* שורה 2 */}
              <div style={{ ...cs.row, marginTop: 10 }}>
                <span style={cs.lbl}>שורה 2</span>
                <input value={q2} onChange={e => setQ2(e.target.value)} placeholder="ביטוי…" dir="rtl" style={{ ...cs.inp, ...(isMobile ? { flexBasis: "100%" } : {}) }} />
                <select value={m2} onChange={e => setM2(e.target.value)} style={cs.sel}>{ALL.map(m => <option key={m.key} value={m.key}>{methodLabel(m.key)}</option>)}</select>
                <span style={cs.eq}>= {v2}</span>
                {heb(v2) && <span style={cs.heb}>{heb(v2)}</span>}
                <button onClick={() => { const t = methodResultText(m2, q2); if (t) setQ(t); }} title="מלא את השורה העליונה בתוצאת השיטה (חישוב 19 השיטות)" style={{ ...cs.send, marginInlineStart: "auto" }}>⤴ למעלה</button>
              </div>
              <LetterStrip mkey={m2} w={q2} />
              {/* בורר פעולה */}
              <div style={{ display: "flex", gap: 6, marginTop: 11, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: L.sub, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, marginInlineEnd: 2 }}>פעולה:</span>
                {[["none", "— הצג"], ["one", "🔗 אחד"], ["split", "✂️ פצל"]].map(([k, lbl]) => (
                  <button key={k} onClick={() => setAction(k)} style={actBtn(action === k)}>{lbl}</button>
                ))}
              </div>
              {/* תוצאה → דף המספר */}
              <div style={{ marginTop: 11 }}>
                {action === "none" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {v1 > 0 && <Link to={nlink(v1, 'from=calc&focus=dna')} style={cs.res}>→ {v1} ({m1})</Link>}
                    {v2 > 0 && <Link to={nlink(v2, 'from=calc&focus=dna')} style={cs.res}>→ {v2} ({m2})</Link>}
                  </div>
                )}
                {action === "one" && (isCross ? (
                  <div>
                    <div style={cs.cross}>✦ הצלבה! «{q1.trim()}» ({m1}) = «{q2.trim()}» ({m2}) = {v1}{heb(v1) && ` · ${heb(v1)}`}</div>
                    <Link to={nlink(v1, 'from=calc&focus=dna')} style={cs.go}>פתח את ההצלבה {v1} ←</Link>
                  </div>
                ) : (
                  <div>
                    <div style={cs.sum}>{v1} + {v2} = <b style={{ color: L.goldDeep }}>{v1 + v2}</b>{heb(v1 + v2) && <span style={{ ...cs.heb, marginInlineStart: 6 }}>{heb(v1 + v2)}</span>}</div>
                    <Link to={nlink(v1 + v2, 'from=calc')} style={cs.go}>פתח את {v1 + v2} בדף המספר ←</Link>
                  </div>
                ))}
                {action === "split" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {v1 > 0 && <Link to={nlink(v1, 'from=calc&focus=dna')} style={cs.go}>→ {v1} ({m1})</Link>}
                    {v2 > 0 && <Link to={nlink(v2, 'from=calc&focus=dna')} style={cs.go}>→ {v2} ({m2})</Link>}
                  </div>
                )}
              </div>
            </>)}
          </div>
        )}
      </div>

      {/* פירוט אות-אות */}
      {letters.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowLetters(s => !s)} style={{
            cursor: "pointer", background: "none", border: "none", color: L.goldDeep, fontFamily: F.heading, fontSize: 13, fontWeight: 700,
          }}>{showLetters ? "▴ הסתר" : "▾ פירוט החישוב אות-אות"}</button>
          {showLetters && (
            <div style={{ overflowX: "auto", border: `1px solid ${L.line}`, borderRadius: 12, marginTop: 8, background: L.panel }}>
              <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
                <thead>
                  <tr>
                    <th style={thS}>אות</th>
                    {LETTER_COLS.map(m => <th key={m.key} style={thS}>{methodLabel(m.key)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {letters.map((ch, i) => (
                    <tr key={i}>
                      <td style={{ ...tdS, fontFamily: F.regal, fontWeight: 700, color: L.goldDeep, fontSize: 17, textAlign: "center" }}>{ch}</td>
                      {LETTER_COLS.map(m => <td key={m.key} style={numCell}>{m.map[ch] ?? "—"}</td>)}
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...tdS, color: L.sub, fontFamily: F.heading, fontSize: 12, textAlign: "center" }}>סה״כ</td>
                    {LETTER_COLS.map(m => <td key={m.key} style={{ ...numCell, borderTop: `2px solid ${L.line}` }}>{m.fn(word)}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {letters.length > 1 && (
            <div style={{ marginTop: 10, color: L.ink, fontFamily: F.mono, fontSize: 13.5, lineHeight: 1.9, background: L.soft, border: `1px solid ${L.line}`, borderRadius: 12, padding: "9px 14px" }}>
              <b style={{ color: L.sub, fontFamily: F.heading }}>מסתתר: </b>
              {letters.slice(0, -1).map((ch, i) => `|${ch}−${letters[i + 1]}|=${Math.abs(GEM[ch] - GEM[letters[i + 1]])}`).join("  ·  ")}
              {"  =  "}<b style={{ color: L.goldDeep }}>{mistater(word)}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
