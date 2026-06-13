import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
import { METHODS as M8, LETTER_COLS, onlyHeb, mistater, GEM } from "../lib/gematria.js";

// ===== מחשבון גימטריה מלא — 8 שיטות, מאומת מול bidim =====
// כל הנוסחאות אומתו מול הערכים השמורים (למשל "התגלות": רגיל 844 · מילוי 1026 · מסתתר 1237
// · קדמי 3137 · סידורי 70 · אתבש 392 · אלבם 241).

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
