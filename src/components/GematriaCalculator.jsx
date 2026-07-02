import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { supabase, addWallWord, logSearch, saveWallWordPrivate, getWallPrivate } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { isAnon } from "../lib/privacy.js";
import AnonToggle, { useAnon } from "./AnonToggle.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { entityFromNumber } from "../lib/research/entity.js";
import { METHODS, DEPTH_METHODS, LETTER_COLS, methodLabel, onlyHeb, mistater, GEM, methodLetters, hebrewNumeral, methodResultText, miluiValueV, miluiTextV, miluiDemiluyValueV, miluiDemiluyTextV, miluiLettersV, MILUI_VAR_OPTS, MILUI_VAR_DEFAULT, hasSofiot, GADOL_BASE } from "../lib/gematria.js";

// ===== מחשבון גימטריה מלא — בהיר/תלמודי, כל 17 השיטות, מאומת מול המנוע =====
// לחיצה על שיטה → דף המספר שלה (עם חזרה למחשבון). מובייל: מלבנים קומפקטיים.
const ALL = [...METHODS, ...DEPTH_METHODS];

const L = {
  panel: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a",
  gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc", active: "#fbf3da",
};

export default function GematriaCalculator({ seed, onResult, research = false }) {
  const { isAdmin } = useAuth();
  const [q, setQ] = useState(seed != null && seed !== "" ? String(seed) : ""); // ריק כברירת מחדל — לא מחשב "גאולה" אוטומטית
  useEffect(() => { if (seed != null && seed !== "") setQ(String(seed)); }, [seed]);
  const word = q.trim();
  const anon = useAnon();   // 🕶️ מצב אנונימי — לרענון האפקט כשמשתנה
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

  // חיפוש מורכב — רמות: 0=סגור · 1=שורה אחת · 2=שתי שורות. השורה העליונה (q) עצמאית = "צופה 17 השיטות".
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
          if (!isAnon()) await addWallWord(word, ragilVal);
          logSearch(word, ragilVal);                     // ציבורי (logSearch מגן עצמית במצב אנונימי)
        }
      } catch { /* שמירה נכשלה — התוצאה כבר הוצגה */ }
    }, 900);
    return () => clearTimeout(t);
  }, [word, ragilVal, onResult, anon, research]);

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
    open: { cursor: "pointer", background: "none", border: `1px dashed ${L.gold}`, color: L.goldDeep, borderRadius: 999, fontFamily: F.heading, fontSize: 13, fontWeight: 700, padding: "7px 16px" },
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
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={advOpen ? "התוצאה תופיע כאן — או הקלידו (17 שיטות)…" : "הקלידו מילה או ביטוי…"} dir="rtl" style={{
          width: "100%", boxSizing: "border-box", background: L.soft, border: `1px solid ${L.gold}`, borderRadius: 10, color: L.ink,
          fontFamily: F.regal, fontSize: 23, fontWeight: 700, padding: "11px 16px", outline: "none", textAlign: "center",
        }} />
        {advOpen && <div style={{ textAlign: "center", marginTop: 5, color: L.sub, fontFamily: F.body, fontSize: 11.5 }}>↑ השורה העליונה עצמאית — מלאו אותה מ-⤴ באחת השורות, או הקלידו ידנית</div>}

        {/* 🕶️ חיפוש אנונימי — לא נשמר בהיסטוריה/בקיר (מצב ציבורי בלבד) */}
        {!research && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <AnonToggle size="sm" />
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

        {/* 🔍 חיפוש מורכב — רמות: שורה אחת / שתיים, עצמאיות מהעליונה */}
        {!advOpen ? (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button onClick={openAdvanced} style={cs.open}>➕ חיפוש מורכב — חישוב לפי שיטות</button>
          </div>
        ) : (
          <div style={{ marginTop: 12, background: L.soft, border: `1px solid ${L.line}`, borderRadius: 12, padding: "12px 13px" }}>
            <style>{`@keyframes gc-glow{0%,100%{box-shadow:0 0 0 0 rgba(154,120,24,0)}50%{box-shadow:0 0 0 4px rgba(154,120,24,0.42)}}`}</style>
            {/* כותרת + הסבר + סגירה */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ color: L.goldDeep, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>🔍 חיפוש מורכב</span>
              <button onClick={() => { setAdvHelp(h => !h); setAdvBlink(false); }} title="הסבר על המצב המורחב" style={{ cursor: "pointer", background: advBlink ? L.active : "none", border: `1px solid ${advBlink ? L.gold : L.line}`, borderRadius: 999, color: L.goldDeep, fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, padding: "3px 11px" }}>{advHelp ? "▴ הסבר" : "❔ איך זה עובד?"}</button>
              <button onClick={closeAdvanced} title="סגור מצב מתקדם" style={{ marginInlineStart: "auto", cursor: "pointer", background: "none", border: `1px solid ${L.line}`, borderRadius: 999, color: L.sub, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "4px 13px" }}>▲ סגור</button>
            </div>
            {advHelp && (
              <div style={{ background: L.panel, border: `1px solid ${advBlink ? L.gold : L.line}`, borderRadius: 10, padding: "11px 13px", marginBottom: 11, color: L.ink, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.9 }}>
                <b style={{ color: L.goldDeep }}>איך המצב המורחב עובד:</b><br />
                • כל שורה = ביטוי + <b>שיטה משלה</b> (רגיל / אלב״ם / מילוי / אתב״ש…). מתחתיה רואים את <b>האותיות</b> של השיטה ואת הערך גם <b>באותיות עבריות</b> (231 = רל״א).<br />
                • <b>⤴ למעלה</b> — לוקח את <b>תוצאת השיטה</b> ושם בשורה העליונה (מילוי=השם המלא · אתב״ש/אלב״ם=האותיות המוצפנות), וכל 17 השיטות מחושבות עליה. השורה העליונה עצמאית — שינוי בה לא נוגע בשורות.<br />
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
              <button onClick={() => { const t = fill1Text(); if (t) setQ(t); }} title="מלא את השורה העליונה בתוצאת השיטה (חישוב 17 השיטות)" style={{ ...cs.send, marginInlineStart: "auto" }}>⤴ למעלה</button>
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
                <button onClick={() => { const t = methodResultText(m2, q2); if (t) setQ(t); }} title="מלא את השורה העליונה בתוצאת השיטה (חישוב 17 השיטות)" style={{ ...cs.send, marginInlineStart: "auto" }}>⤴ למעלה</button>
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
                    {v1 > 0 && <Link to={`/number/${v1}?from=calc&focus=dna`} style={cs.res}>→ {v1} ({m1})</Link>}
                    {v2 > 0 && <Link to={`/number/${v2}?from=calc&focus=dna`} style={cs.res}>→ {v2} ({m2})</Link>}
                  </div>
                )}
                {action === "one" && (isCross ? (
                  <div>
                    <div style={cs.cross}>✦ הצלבה! «{q1.trim()}» ({m1}) = «{q2.trim()}» ({m2}) = {v1}{heb(v1) && ` · ${heb(v1)}`}</div>
                    <Link to={`/number/${v1}?from=calc&focus=dna`} style={cs.go}>פתח את ההצלבה {v1} ←</Link>
                  </div>
                ) : (
                  <div>
                    <div style={cs.sum}>{v1} + {v2} = <b style={{ color: L.goldDeep }}>{v1 + v2}</b>{heb(v1 + v2) && <span style={{ ...cs.heb, marginInlineStart: 6 }}>{heb(v1 + v2)}</span>}</div>
                    <Link to={`/number/${v1 + v2}?from=calc`} style={cs.go}>פתח את {v1 + v2} בדף המספר ←</Link>
                  </div>
                ))}
                {action === "split" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {v1 > 0 && <Link to={`/number/${v1}?from=calc&focus=dna`} style={cs.go}>→ {v1} ({m1})</Link>}
                    {v2 > 0 && <Link to={`/number/${v2}?from=calc&focus=dna`} style={cs.go}>→ {v2} ({m2})</Link>}
                  </div>
                )}
              </div>
            </>)}
          </div>
        )}

        {/* כל 17 השיטות — תמיד מוצגות (גם בלי קלט, מציגות 0), כדי שברור מיד שזה מחשבון חי */}
        <>
        {/* אופציה מתקדמת — הצגת ערך כל שיטה באותיות (מ״ה) */}
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 12, color: L.sub, fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>
          <input type="checkbox" checked={showHebNum} onChange={e => setShowHebNum(e.target.checked)} style={{ accentColor: L.gold, width: 15, height: 15, cursor: "pointer" }} />
          הצג את הערך באותיות (מ״ה) · מתקדם
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(94px, 1fr))", gap: 7, marginTop: 9 }}>
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
              <Link key={r.key} to={`/number/${r.value}?from=calc&focus=dna&method=${encodeURIComponent(r.key)}`} title={`${r.key} = ${r.value} · פתח את ${r.value} (צירי ההתכנסות)`} style={{
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

        {word ? (
          <>
            <div style={{ textAlign: "center", marginTop: 15 }}>
              <Link to={`/number/${ragilVal}?from=calc`} style={{
                display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
                background: "linear-gradient(135deg, #e9c84a, #9a7818)", color: "#1a0e00",
                fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "11px 26px", borderRadius: 999,
                boxShadow: "0 2px 10px rgba(154,120,24,0.35)",
              }}>✨ גלה הכל על {ragilVal} ←</Link>
            </div>
            <div style={{ textAlign: "center", marginTop: 7, color: L.sub, fontFamily: F.body, fontSize: 12 }}>לחצו על שיטה כדי לפתוח את דף המספר שלה · ⭐ בפינת האריח שומר רק את המספר</div>
          </>
        ) : (
          <div style={{ textAlign: "center", marginTop: 13, color: L.sub, fontFamily: F.body, fontSize: 13 }}>☝️ הקלידו מילה או ביטוי למעלה — כל 17 השיטות יחושבו מיד, וכל תיבה תהפוך ללחיצה אל דף-המספר.</div>
        )}
        </>
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
