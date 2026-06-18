import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { supabase, addWallWord, logSearch } from "../lib/supabase.js";
import { METHODS, DEPTH_METHODS, LETTER_COLS, onlyHeb, mistater, GEM, methodLetters } from "../lib/gematria.js";

// ===== מחשבון גימטריה מלא — בהיר/תלמודי, כל 17 השיטות, מאומת מול המנוע =====
// לחיצה על שיטה → דף המספר שלה (עם חזרה למחשבון). מובייל: מלבנים קומפקטיים.
const ALL = [...METHODS, ...DEPTH_METHODS];

const L = {
  panel: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a",
  gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc", active: "#fbf3da",
};

export default function GematriaCalculator({ seed, onResult }) {
  const [q, setQ] = useState(seed != null && seed !== "" ? String(seed) : "גאולה");
  useEffect(() => { if (seed != null && seed !== "") setQ(String(seed)); }, [seed]);
  const word = q.trim();
  const res = useMemo(() => ALL.map(m => ({ key: m.key, sub: m.sub || m.soul, value: m.fn(word) })), [word]);
  const ragilVal = res.find(r => r.key === "רגיל")?.value || 0;
  const [counts, setCounts] = useState({});
  const [showLetters, setShowLetters] = useState(false);
  const letters = onlyHeb(word);

  // חיפוש מורכב — שתי שורות, שיטה לכל שורה, אחד/פצל (עץ אחד → דף המספר)
  const [m1, setM1] = useState("רגיל");
  const [row2Open, setRow2Open] = useState(false);
  const [q2, setQ2] = useState("");
  const [m2, setM2] = useState("אלבם");
  const [action, setAction] = useState("none");
  const valOf = (key, w) => { const m = ALL.find(x => x.key === key); return m ? m.fn(String(w || "").trim()) : 0; };
  const v1 = valOf(m1, q);
  const v2 = valOf(m2, q2);
  const isCross = v1 > 0 && v1 === v2;

  // כמה ביטויים יש במערכת לכל שיטה (לפי הערך שלה) — מהמאגר המאומת
  useEffect(() => {
    let live = true; setCounts({});
    if (!letters.length) return;
    Promise.all(res.map(r =>
      supabase.from("bidim").select("*", { count: "exact", head: true }).eq("method", r.key).eq("value", r.value)
        .then(({ count }) => [r.key, count || 0]).catch(() => [r.key, 0])
    )).then(pairs => { if (live) setCounts(Object.fromEntries(pairs)); });
    return () => { live = false; };
  }, [word]); // eslint-disable-line

  // שמירה לקיר + רישום חיפושים (עץ אחד)
  useEffect(() => {
    if (!word || onlyHeb(word).length < 2 || !ragilVal) return;
    const t = setTimeout(async () => {
      await addWallWord(word, ragilVal);
      logSearch(word, ragilVal);
      if (onResult) onResult({ word, ragil: ragilVal });
    }, 900);
    return () => clearTimeout(t);
  }, [word, ragilVal, onResult]);

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
    x: { cursor: "pointer", background: "none", border: "none", color: L.sub, fontSize: 16, fontWeight: 700, lineHeight: 1 },
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

  return (
    <div style={{ textAlign: "right" }}>
      {/* קלט */}
      <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16, padding: "16px 16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="הקלידו מילה או ביטוי…" dir="rtl" style={{
          width: "100%", boxSizing: "border-box", background: L.soft, border: `1px solid ${L.gold}`, borderRadius: 10, color: L.ink,
          fontFamily: F.regal, fontSize: 23, fontWeight: 700, padding: "11px 16px", outline: "none", textAlign: "center",
        }} />

        {/* 🔍 חיפוש מורכב — שתי שורות, שיטה לכל שורה (אחד/פצל → דף המספר) */}
        {!row2Open ? (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button onClick={() => { setRow2Open(true); if (!q2) setQ2(word); }} style={cs.open}>➕ חיפוש מורכב — שתי שיטות</button>
          </div>
        ) : (
          <div style={{ marginTop: 12, background: L.soft, border: `1px solid ${L.line}`, borderRadius: 12, padding: "12px 13px" }}>
            {/* שורה 1 — מה שחיפשת */}
            <div style={cs.row}>
              <span style={cs.lbl}>שורה 1</span>
              <span style={cs.term}>{word || "—"}</span>
              <select value={m1} onChange={e => setM1(e.target.value)} style={cs.sel}>{ALL.map(m => <option key={m.key} value={m.key}>{m.key}</option>)}</select>
              <span style={cs.eq}>= {v1}</span>
            </div>
            <LetterStrip mkey={m1} w={word} />
            {/* שורה 2 — נפתחת/נסגרת */}
            <div style={{ ...cs.row, marginTop: 8 }}>
              <span style={cs.lbl}>שורה 2</span>
              <input value={q2} onChange={e => setQ2(e.target.value)} placeholder="ביטוי…" dir="rtl" style={cs.inp} />
              <select value={m2} onChange={e => setM2(e.target.value)} style={cs.sel}>{ALL.map(m => <option key={m.key} value={m.key}>{m.key}</option>)}</select>
              <span style={cs.eq}>= {v2}</span>
              <button onClick={() => setRow2Open(false)} style={cs.x} title="סגור שורה">✕</button>
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
                  <div style={cs.cross}>✦ הצלבה! «{word}» ({m1}) = «{q2.trim()}» ({m2}) = {v1}</div>
                  <Link to={`/number/${v1}?from=calc&focus=dna`} style={cs.go}>פתח את ההצלבה {v1} ←</Link>
                </div>
              ) : (
                <div>
                  <div style={cs.sum}>{v1} + {v2} = <b style={{ color: L.goldDeep }}>{v1 + v2}</b></div>
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
          </div>
        )}

        {/* כל 17 השיטות — מלבנים קומפקטיים, לחיצה → דף המספר */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(94px, 1fr))", gap: 7, marginTop: 13 }}>
          {res.map(r => (
            <Link key={r.key} to={`/number/${r.value}?from=calc&focus=dna`} title={`${r.key} = ${r.value} · פתח את ${r.value} (צירי ההתכנסות)`} style={{
              textDecoration: "none", textAlign: "center", borderRadius: 10, padding: "8px 6px",
              border: `1px solid ${L.line}`, background: L.soft, transition: "border-color .15s, background .15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = L.gold; e.currentTarget.style.background = L.active; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = L.line; e.currentTarget.style.background = L.soft; }}>
              <div style={{ color: L.sub, fontFamily: F.heading, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.key}</div>
              <div style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 19, fontWeight: 800, lineHeight: 1.15 }}>{r.value}</div>
              <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 9.5, fontWeight: 700, marginTop: 2 }}>נמצאו {counts[r.key] ?? "…"}</div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 15 }}>
          <Link to={`/number/${ragilVal}?from=calc`} style={{
            display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
            background: "linear-gradient(135deg, #e9c84a, #9a7818)", color: "#1a0e00",
            fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "11px 26px", borderRadius: 999,
            boxShadow: "0 2px 10px rgba(154,120,24,0.35)",
          }}>✨ גלה הכל על {ragilVal} ←</Link>
        </div>
        <div style={{ textAlign: "center", marginTop: 7, color: L.sub, fontFamily: F.body, fontSize: 12 }}>לחצו על שיטה כדי לפתוח את דף המספר שלה</div>
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
                    {LETTER_COLS.map(m => <th key={m.key} style={thS}>{m.key}</th>)}
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
