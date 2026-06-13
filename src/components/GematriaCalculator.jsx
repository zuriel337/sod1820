import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { C, F, GEM } from "../theme.js";
import { supabase } from "../lib/supabase.js";

// ===== מחשבון גימטריה מלא — 8 שיטות, מאומת מול bidim =====
// כל הנוסחאות אומתו מול הערכים השמורים (למשל "התגלות": רגיל 844 · מילוי 1026 · מסתתר 1237
// · קדמי 3137 · סידורי 70 · אתבש 392 · אלבם 241).

const onlyHeb = s => [...(s || "")].filter(c => GEM[c] != null);

// טבלאות ערכים לכל שיטה
const FINAL = { "ך": 500, "ם": 600, "ן": 700, "ף": 800, "ץ": 900 };
const ORD = { "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10, "כ": 11, "ך": 11, "ל": 12, "מ": 13, "ם": 13, "נ": 14, "ן": 14, "ס": 15, "ע": 16, "פ": 17, "ף": 17, "צ": 18, "ץ": 18, "ק": 19, "ר": 20, "ש": 21, "ת": 22 };
const KID = { "א": 1, "ב": 3, "ג": 6, "ד": 10, "ה": 15, "ו": 21, "ז": 28, "ח": 36, "ט": 45, "י": 55, "כ": 75, "ך": 75, "ל": 105, "מ": 145, "ם": 145, "נ": 195, "ן": 195, "ס": 255, "ע": 325, "פ": 405, "ף": 405, "צ": 495, "ץ": 495, "ק": 595, "ר": 795, "ש": 1095, "ת": 1495 };
const ATB = { "א": 400, "ב": 300, "ג": 200, "ד": 100, "ה": 90, "ו": 80, "ז": 70, "ח": 60, "ט": 50, "י": 40, "כ": 30, "ך": 30, "ל": 20, "מ": 10, "ם": 10, "נ": 9, "ן": 9, "ס": 8, "ע": 7, "פ": 6, "ף": 6, "צ": 5, "ץ": 5, "ק": 4, "ר": 3, "ש": 2, "ת": 1 };
const ALB = { "א": 30, "ב": 40, "ג": 50, "ד": 60, "ה": 70, "ו": 80, "ז": 90, "ח": 100, "ט": 200, "י": 300, "כ": 400, "ך": 400, "ל": 1, "מ": 2, "ם": 2, "נ": 3, "ן": 3, "ס": 4, "ע": 5, "פ": 6, "ף": 6, "צ": 7, "ץ": 7, "ק": 8, "ר": 9, "ש": 10, "ת": 20 };
const MILUI = { "א": 111, "ב": 412, "ג": 83, "ד": 434, "ה": 15, "ו": 22, "ז": 67, "ח": 418, "ט": 419, "י": 20, "כ": 100, "ך": 100, "ל": 74, "מ": 80, "ם": 80, "נ": 106, "ן": 106, "ס": 120, "ע": 130, "פ": 81, "ף": 81, "צ": 104, "ץ": 104, "ק": 186, "ר": 510, "ש": 360, "ת": 416 };

const sumBy = (w, map) => onlyHeb(w).reduce((s, c) => s + (map[c] || 0), 0);
const gadol = w => onlyHeb(w).reduce((s, c) => s + (FINAL[c] || GEM[c] || 0), 0);
const mistater = w => { const L = onlyHeb(w); let s = 0; for (let i = 0; i < L.length - 1; i++) s += Math.abs(GEM[L[i]] - GEM[L[i + 1]]); return s; };

const M8 = [
  { key: "רגיל", sub: "חיבור ערכי האותיות", fn: w => sumBy(w, GEM), map: GEM },
  { key: "מילוי", sub: "ערך שֵם האות המלא", fn: w => sumBy(w, MILUI), map: MILUI },
  { key: "מסתתר", sub: "הפרשים בין אותיות סמוכות", fn: mistater, map: null },
  { key: "קדמי", sub: "סכום מצטבר עד האות", fn: w => sumBy(w, KID), map: KID },
  { key: "גדול", sub: "אותיות סופיות 500–900", fn: gadol, map: null },
  { key: "סידורי", sub: "מיקום האות (1–22)", fn: w => sumBy(w, ORD), map: ORD },
  { key: "אתבש", sub: "היפוך הא״ב (א↔ת)", fn: w => sumBy(w, ATB), map: ATB },
  { key: "אלבם", sub: "חצי א״ב מול חצי (א↔ל)", fn: w => sumBy(w, ALB), map: ALB },
];
// עמודות פירוט אות-אות (שיטות פר-אות בלבד; מסתתר מוצג בנפרד)
const LETTER_COLS = M8.filter(m => m.map);

export default function GematriaCalculator() {
  const [q, setQ] = useState("גאולה");
  const word = q.trim();
  const res = useMemo(() => M8.map(m => ({ key: m.key, sub: m.sub, value: m.fn(word) })), [word]);
  const [active, setActive] = useState("רגיל");
  const [equal, setEqual] = useState(null);
  const [showLetters, setShowLetters] = useState(false);
  const activeVal = res.find(r => r.key === active)?.value || 0;
  const letters = onlyHeb(word);

  useEffect(() => {
    let live = true; setEqual(null);
    if (!letters.length || !activeVal) return;
    supabase.from("bidim").select("phrase").eq("method", active).eq("value", activeVal).neq("phrase", word).limit(40)
      .then(({ data }) => { if (live) setEqual([...new Set((data || []).map(r => r.phrase).filter(Boolean))]); });
    return () => { live = false; };
  }, [active, activeVal, word, letters.length]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "right" }}>
      {/* קלט */}
      <div style={{ background: "linear-gradient(160deg, rgba(20,15,12,0.6), rgba(8,5,2,0.45))", border: `1px solid ${C.borderGold}`, borderRadius: 16, padding: "18px 18px 20px", boxShadow: "0 14px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="הקלידו מילה או ביטוי…" dir="rtl" style={{
            flex: 1, background: C.surface, border: `1px solid ${C.borderGold}`, borderRadius: 10, color: C.goldBright,
            fontFamily: F.regal, fontSize: 22, fontWeight: 700, padding: "12px 16px", outline: "none", textAlign: "center",
          }} />
        </div>

        {/* 8 השיטות */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 9, marginTop: 14 }}>
          {res.map(r => {
            const on = r.key === active;
            return (
              <button key={r.key} onClick={() => setActive(r.key)} style={{
                cursor: "pointer", textAlign: "center", borderRadius: 12, padding: "11px 8px",
                border: `1px solid ${on ? C.gold : C.border}`, background: on ? "rgba(212,175,55,0.16)" : C.surface2,
                transition: "all .2s",
              }}>
                <div style={{ color: on ? C.goldBright : C.goldDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{r.key}</div>
                <div style={{ color: on ? C.goldBright : C.goldLight, fontFamily: F.mono, fontSize: 26, fontWeight: 800, lineHeight: 1.1, margin: "2px 0" }}>{r.value}</div>
                <div style={{ color: C.muted, fontFamily: F.body, fontSize: 10.5, lineHeight: 1.4 }}>{r.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* מילים שוות לשיטה הנבחרת */}
      <div style={{ marginTop: 16, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 1 }}>מילים שוות ל־</span>
          <span style={{ color: C.goldBright, fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>{activeVal}</span>
          <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>בשיטת {active}</span>
          <Link to={`/number/${activeVal}`} style={{ marginInlineStart: "auto", color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>דף המספר →</Link>
        </div>
        {equal === null ? (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, padding: 6 }}>מחשב…</div>
        ) : equal.length === 0 ? (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 13, padding: 6 }}>לא נמצאו ביטויים נוספים בערך זה במאגר המאומת.</div>
        ) : (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {equal.map((p, i) => (
              <Link key={i} to={`/number/${encodeURIComponent(p)}`} title={p} style={{
                textDecoration: "none", color: C.goldLight, fontFamily: F.body, fontSize: 13.5, background: C.surface,
                border: `1px solid ${C.border}`, borderRadius: 999, padding: "5px 12px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{p}</Link>
            ))}
          </div>
        )}
      </div>

      {/* פירוט אות-אות */}
      {letters.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowLetters(s => !s)} style={{
            cursor: "pointer", background: "none", border: "none", color: C.goldBright, fontFamily: F.heading, fontSize: 13, fontWeight: 700,
          }}>{showLetters ? "▴ הסתר" : "▾ פירוט החישוב אות-אות"}</button>
          {showLetters && (
            <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 12, marginTop: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
                <thead>
                  <tr>
                    <th style={thS}>אות</th>
                    {LETTER_COLS.map(m => <th key={m.key} style={{ ...thS, textAlign: "center" }}>{m.key}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {letters.map((ch, i) => (
                    <tr key={i}>
                      <td style={{ ...tdS, fontFamily: F.regal, fontWeight: 700, color: C.goldBright, fontSize: 17, textAlign: "center" }}>{ch}</td>
                      {LETTER_COLS.map(m => <td key={m.key} style={numCell}>{m.map[ch] ?? "—"}</td>)}
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...tdS, color: C.goldDim, fontFamily: F.heading, fontSize: 12, textAlign: "center" }}>סה״כ</td>
                    {LETTER_COLS.map(m => <td key={m.key} style={{ ...numCell, color: C.goldBright, borderTop: `1px solid ${C.borderGold}` }}>{m.fn(word)}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {/* מסתתר — הפרשים */}
          {letters.length > 1 && (
            <div style={{ marginTop: 10, color: C.goldLight, fontFamily: F.mono, fontSize: 13.5, lineHeight: 1.9, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "9px 14px" }}>
              <b style={{ color: C.goldDim, fontFamily: F.heading }}>מסתתר: </b>
              {letters.slice(0, -1).map((ch, i) => `|${ch}−${letters[i + 1]}|=${Math.abs(GEM[ch] - GEM[letters[i + 1]])}`).join("  ·  ")}
              {"  =  "}<b style={{ color: C.goldBright }}>{mistater(word)}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const thS = { background: C.goldDark, color: C.goldBright, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap", borderBottom: `1px solid ${C.borderGold}` };
const tdS = { color: C.goldLight, fontFamily: F.body, fontSize: 13.5, padding: "7px 10px", borderBottom: `1px solid ${C.border}` };
const numCell = { ...tdS, fontFamily: F.mono, fontWeight: 700, textAlign: "center", color: C.goldLight };
